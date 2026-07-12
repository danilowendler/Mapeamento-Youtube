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

  // 2 · Outros canais nessas keywords, pontuados por coaparição.
  // O título vem do próprio resultado da busca — canais relacionados
  // tipicamente ainda NÃO estão no corpus (serão coletados só se o
  // usuário mandar mapeá-los).
  const { data: coRows } = await db
    .from("keyword_results")
    .select("channel_id, channel_title, keyword")
    .in("keyword", keywords);

  const exclude = new Set(channelIds);
  const counts = new Map<string, { count: number; title: string }>();
  for (const row of coRows ?? []) {
    if (exclude.has(row.channel_id)) continue;
    const entry = counts.get(row.channel_id) ?? { count: 0, title: "" };
    entry.count += 1;
    if (row.channel_title) entry.title = row.channel_title;
    counts.set(row.channel_id, entry);
  }

  const top = [...counts.entries()]
    .filter(([, entry]) => entry.title !== "")
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit);
  if (top.length === 0) return [];

  // 3 · Enriquece com inscritos quando o canal já está no corpus
  const { data: channels } = await db
    .from("channels")
    .select("youtube_id, subscriber_count")
    .in(
      "youtube_id",
      top.map(([id]) => id),
    );
  const subsById = new Map(
    (channels ?? []).map((c) => [c.youtube_id, c.subscriber_count]),
  );

  return top.map(([channelId, entry]) => ({
    channelId,
    title: entry.title,
    subscriberCount: subsById.get(channelId) ?? null,
    coappearances: entry.count,
  }));
}
