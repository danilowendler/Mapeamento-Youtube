/** Card de oportunidade montado no servidor (página de resultados). */
export type OpportunityCard = {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  isShort: boolean;
  durationSeconds: number | null;
  publishedAt: string | null;
  viewCount: number | null;
  score: number;
  baselineViews: number | null;
  lowConfidence: boolean;
  channelId: string;
  channelTitle: string;
  channelSubscribers: number | null;
  /** ISO 3166-1 autodeclarado no YouTube — frequentemente null. */
  channelCountry: string | null;
};

/**
 * Card da aba Trending (Pré-M9 T2): vídeos dos últimos 7 dias dos
 * canais da pesquisa, direto do corpus. Sem score de propósito —
 * a régua da mediana exige 14 dias de vida (doc 3 §3.6).
 */
export type TrendingCard = {
  /**
   * Piso do score futuro (views atuais ÷ mediana do formato) — só
   * preenchido quando ≥ 1×; null = jovem demais para qualquer número.
   */
  partialScore: number | null;
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  isShort: boolean;
  durationSeconds: number | null;
  publishedAt: string | null;
  viewCount: number | null;
  channelId: string;
  channelTitle: string;
  channelSubscribers: number | null;
  /** ISO 3166-1 autodeclarado no YouTube — frequentemente null. */
  channelCountry: string | null;
};

export type SearchSummary = {
  id: string;
  status: "queued" | "running" | "completed" | "partial" | "failed";
  channelsTotal: number;
  channelsDone: number;
};
