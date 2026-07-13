"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getPlanLimits } from "@/services/planService";

export type FavoriteActionResult = {
  favorited?: boolean;
  error?: string;
  planGate?: boolean;
};

/**
 * Define o estado do favorito (a UI é otimista e já sabe o alvo —
 * evita a ida extra ao banco para "descobrir" o estado atual).
 * Gate por plano no service layer (ADR-006).
 */
export async function setFavorite(
  videoId: string,
  favorited: boolean,
  searchId?: string,
): Promise<FavoriteActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const limits = await getPlanLimits(supabase);
  if (!limits.favorites) {
    return {
      planGate: true,
      error:
        "Favoritos fazem parte dos planos Criador e Pro — monte sua pauta sem perder nenhuma oportunidade.",
    };
  }

  if (favorited) {
    // Operação + evento do funil em paralelo (não sequencial)
    const [op] = await Promise.all([
      supabase.from("favorites").upsert(
        { user_id: user.id, video_id: videoId, search_id: searchId ?? null },
        { onConflict: "user_id,video_id", ignoreDuplicates: true },
      ),
      createAdminClient().from("product_events").insert({
        user_id: user.id,
        name: "opportunity_favorited",
        properties: { video_id: videoId, search_id: searchId ?? null },
      }),
    ]);
    if (op.error) return { error: "Erro ao favoritar. Tente novamente." };
  } else {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("video_id", videoId);
    if (error) return { error: "Erro ao remover. Tente novamente." };
  }

  revalidatePath("/app/pauta");
  return { favorited };
}
