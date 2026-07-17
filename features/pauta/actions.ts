"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPlanLimits } from "@/services/planService";

export type PautaActionResult = { error?: string };

const nameSchema = z
  .string()
  .trim()
  .min(1, "Dê um nome à categoria.")
  .max(40, "Nome de até 40 caracteres.");
const idSchema = z.string().uuid();

/** Postgres 23505 = violação do índice único (nome repetido). */
const UNIQUE_VIOLATION = "23505";

async function requirePlanWithFavorites() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." as const };

  // Gate por plano no service layer (ADR-006), como em setFavorite
  const limits = await getPlanLimits(supabase);
  if (!limits.favorites) {
    return {
      error:
        "Categorias da pauta fazem parte dos planos Criador e Pro." as const,
    };
  }
  return { supabase, user };
}

export type FolderKind = "pautas" | "referencias";

export async function createCategory(
  rawName: string,
  kind: FolderKind = "pautas",
): Promise<PautaActionResult> {
  const gate = await requirePlanWithFavorites();
  if ("error" in gate) return { error: gate.error };
  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (kind !== "pautas" && kind !== "referencias") {
    return { error: "Tipo de pasta inválido." };
  }

  // Posição: fim da lista (corrida entre abas é inofensiva aqui)
  const { data: last } = await gate.supabase
    .from("pauta_categories")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await gate.supabase.from("pauta_categories").insert({
    user_id: gate.user.id,
    name: parsed.data,
    kind,
    position: (last?.position ?? -1) + 1,
  });
  if (error) {
    return {
      error:
        error.code === UNIQUE_VIOLATION
          ? "Já existe uma categoria com esse nome."
          : "Erro ao criar a categoria. Tente novamente.",
    };
  }
  revalidatePath("/app/pauta");
  return {};
}

export async function renameCategory(
  id: string,
  rawName: string,
): Promise<PautaActionResult> {
  const gate = await requirePlanWithFavorites();
  if ("error" in gate) return { error: gate.error };
  const parsedId = idSchema.safeParse(id);
  const parsedName = nameSchema.safeParse(rawName);
  if (!parsedId.success) return { error: "Categoria inválida." };
  if (!parsedName.success) return { error: parsedName.error.issues[0].message };

  const { error } = await gate.supabase
    .from("pauta_categories")
    .update({ name: parsedName.data })
    .eq("id", parsedId.data);
  if (error) {
    return {
      error:
        error.code === UNIQUE_VIOLATION
          ? "Já existe uma categoria com esse nome."
          : "Erro ao renomear. Tente novamente.",
    };
  }
  revalidatePath("/app/pauta");
  return {};
}

export async function deleteCategory(id: string): Promise<PautaActionResult> {
  const gate = await requirePlanWithFavorites();
  if ("error" in gate) return { error: gate.error };
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { error: "Categoria inválida." };

  // FK on delete set null: os favoritos voltam ao "Geral", nada se perde
  const { error } = await gate.supabase
    .from("pauta_categories")
    .delete()
    .eq("id", parsedId.data);
  if (error) return { error: "Erro ao excluir. Tente novamente." };

  revalidatePath("/app/pauta");
  return {};
}

export async function moveFavorite(
  videoId: string,
  categoryId: string | null,
): Promise<PautaActionResult> {
  const gate = await requirePlanWithFavorites();
  if ("error" in gate) return { error: gate.error };
  if (categoryId !== null) {
    if (!idSchema.safeParse(categoryId).success) {
      return { error: "Categoria inválida." };
    }
    // FKs ignoram RLS: sem esta checagem daria para apontar o favorito
    // para a pasta de outro usuário (e sumir do próprio workspace).
    // Regra de tipo: vídeo só entra em pasta de Pautas.
    const { data: owned } = await gate.supabase
      .from("pauta_categories")
      .select("id, kind")
      .eq("id", categoryId)
      .maybeSingle();
    if (!owned) return { error: "Pasta inválida." };
    if (owned.kind !== "pautas") {
      return { error: "Vídeos só entram em pastas de Pautas." };
    }
  }

  // RLS (favorites_update_own) limita o update ao dono
  const { error } = await gate.supabase
    .from("favorites")
    .update({ category_id: categoryId })
    .eq("video_id", videoId);
  if (error) return { error: "Erro ao mover. Tente novamente." };

  revalidatePath("/app/pauta");
  return {};
}

/** Salva/remove um canal de referência (botão nos resultados). */
export async function setChannelRef(
  channelId: string,
  saved: boolean,
): Promise<PautaActionResult & { saved?: boolean }> {
  const gate = await requirePlanWithFavorites();
  if ("error" in gate) return { error: gate.error };
  if (!channelId.trim()) return { error: "Canal inválido." };

  if (saved) {
    const { error } = await gate.supabase.from("channel_refs").upsert(
      { user_id: gate.user.id, channel_id: channelId },
      { onConflict: "user_id,channel_id", ignoreDuplicates: true },
    );
    if (error) return { error: "Erro ao salvar o canal. Tente novamente." };
  } else {
    const { error } = await gate.supabase
      .from("channel_refs")
      .delete()
      .eq("channel_id", channelId);
    if (error) return { error: "Erro ao remover. Tente novamente." };
  }

  revalidatePath("/app/pauta");
  return { saved };
}

const folderNotesSchema = z.string().max(2000, "Notas de até 2000 caracteres.");
const itemNoteSchema = z.string().max(500, "Nota de até 500 caracteres.");

/** Bloco de notas da pasta (página dedicada — spec B5.4). */
export async function updateFolderNotes(
  folderId: string,
  rawText: string,
): Promise<PautaActionResult> {
  const gate = await requirePlanWithFavorites();
  if ("error" in gate) return { error: gate.error };
  if (!idSchema.safeParse(folderId).success) {
    return { error: "Pasta inválida." };
  }
  const parsed = folderNotesSchema.safeParse(rawText);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await gate.supabase
    .from("pauta_categories")
    .update({ notes: parsed.data.trim() === "" ? null : parsed.data })
    .eq("id", folderId);
  if (error) return { error: "Erro ao salvar as notas. Tente novamente." };

  revalidatePath(`/app/pauta/${folderId}`);
  return {};
}

/** Nota individual de um vídeo (favorites.note) ou canal (channel_refs.note). */
export async function updateItemNote(
  type: "video" | "channel",
  id: string,
  rawText: string,
): Promise<PautaActionResult> {
  const gate = await requirePlanWithFavorites();
  if ("error" in gate) return { error: gate.error };
  if (!id.trim()) return { error: "Item inválido." };
  const parsed = itemNoteSchema.safeParse(rawText);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const note = parsed.data.trim() === "" ? null : parsed.data;
  const { error } =
    type === "video"
      ? await gate.supabase
          .from("favorites")
          .update({ note })
          .eq("video_id", id)
      : await gate.supabase
          .from("channel_refs")
          .update({ note })
          .eq("channel_id", id);
  if (error) return { error: "Erro ao salvar a nota. Tente novamente." };

  revalidatePath("/app/pauta");
  return {};
}

export async function moveChannelRef(
  channelId: string,
  folderId: string | null,
): Promise<PautaActionResult> {
  const gate = await requirePlanWithFavorites();
  if ("error" in gate) return { error: gate.error };

  if (folderId !== null) {
    if (!idSchema.safeParse(folderId).success) {
      return { error: "Pasta inválida." };
    }
    // Mesmo raciocínio do moveFavorite; canal só entra em Referências
    const { data: owned } = await gate.supabase
      .from("pauta_categories")
      .select("id, kind")
      .eq("id", folderId)
      .maybeSingle();
    if (!owned) return { error: "Pasta inválida." };
    if (owned.kind !== "referencias") {
      return { error: "Canais só entram em pastas de Referências." };
    }
  }

  const { error } = await gate.supabase
    .from("channel_refs")
    .update({ folder_id: folderId })
    .eq("channel_id", channelId);
  if (error) return { error: "Erro ao mover. Tente novamente." };

  revalidatePath("/app/pauta");
  return {};
}
