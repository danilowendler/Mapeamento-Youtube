import { createAdminClient } from "@/lib/supabase/admin";

export type RelatedChannel = {
  channelId: string;
  title: string;
  subscriberCount: number | null;
  coappearances: number;
};

/**
 * Canais relacionados via corpus (doc 3 §3.8): canais que coaparecem
 * nos MESMOS resultados de keyword que os canais analisados. Quanto
 * mais buscas acontecem na plataforma, melhor a malha — retorno
 * crescente do corpus compartilhado. Sem custo de API.
 */
export async function findRelatedChannels(
  channelIds: string[],
  limit = 6,
): Promise<RelatedChannel[]> {
  if (channelIds.length === 0) return [];
  const db = createAdminClient();

  // 1 · Keywords onde os canais analisados aparecem
  const { data: keywordRows } = await db
    .from("keyword_results")
    .select("keyword")
    .in("channel_id", channelIds);
  const keywords = [...new Set((keywordRows ?? []).map((r) => r.keyword))];
  if (keywords.length === 0) return [];

  // 2 · Outros canais nessas keywords, pontuados por coaparição
  const { data: coRows } = await db
    .from("keyword_results")
    .select("channel_id, keyword")
    .in("keyword", keywords);

  const exclude = new Set(channelIds);
  const counts = new Map<string, number>();
  for (const row of coRows ?? []) {
    if (exclude.has(row.channel_id)) continue;
    counts.set(row.channel_id, (counts.get(row.channel_id) ?? 0) + 1);
  }

  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  if (top.length === 0) return [];

  // 3 · Metadados dos canais já conhecidos pelo corpus
  const { data: channels } = await db
    .from("channels")
    .select("youtube_id, title, subscriber_count")
    .in(
      "youtube_id",
      top.map(([id]) => id),
    );
  const byId = new Map((channels ?? []).map((c) => [c.youtube_id, c]));

  return top
    .map(([channelId, coappearances]) => {
      const channel = byId.get(channelId);
      return {
        channelId,
        title: channel?.title ?? "",
        subscriberCount: channel?.subscriber_count ?? null,
        coappearances,
      };
    })
    .filter((c) => c.title !== "");
}
