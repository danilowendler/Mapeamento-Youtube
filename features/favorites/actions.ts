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
 * Alterna um favorito. Gate por plano no service layer (ADR-006):
 * favoritos são recurso dos planos Criador e Pro (doc 7 §7.2).
 */
export async function toggleFavorite(
  videoId: string,
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

  const { data: existing } = await supabase
    .from("favorites")
    .select("video_id")
    .eq("video_id", videoId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("video_id", videoId);
    if (error) return { error: "Erro ao remover. Tente novamente." };
    revalidatePath("/app/pauta");
    return { favorited: false };
  }

  const { error } = await supabase.from("favorites").insert({
    user_id: user.id,
    video_id: videoId,
    search_id: searchId ?? null,
  });
  if (error) return { error: "Erro ao favoritar. Tente novamente." };

  // Sinal do funil: oportunidade acionada (North Star, doc 1 §1.7)
  await createAdminClient().from("product_events").insert({
    user_id: user.id,
    name: "opportunity_favorited",
    properties: { video_id: videoId, search_id: searchId ?? null },
  });

  revalidatePath("/app/pauta");
  return { favorited: true };
}
