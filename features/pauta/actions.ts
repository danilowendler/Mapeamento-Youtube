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

export async function createCategory(
  rawName: string,
): Promise<PautaActionResult> {
  const gate = await requirePlanWithFavorites();
  if ("error" in gate) return { error: gate.error };
  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

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
    // para a categoria de outro usuário (e sumir da própria pauta)
    const { data: owned } = await gate.supabase
      .from("pauta_categories")
      .select("id")
      .eq("id", categoryId)
      .maybeSingle();
    if (!owned) return { error: "Categoria inválida." };
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
