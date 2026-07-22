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
  /**
   * Posição do vídeo entre os últimos uploads do MESMO formato do canal
   * publicados antes dele (F1): bateu `beaten` de `of`. null = base
   * recente insuficiente para comparar.
   */
  recentRank: { beaten: number; of: number } | null;
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

/**
 * Resumo de um canal analisado, para a aba "Canais" (visão geral).
 * Mesma informação que ficava nos chips do topo, agora organizada.
 * matchedVideoTitle = vídeo que trouxe o canal para a busca (T5).
 */
export type ChannelSummary = {
  channelId: string;
  title: string;
  state: "collecting" | "ready" | "no_eligible" | "failed";
  opportunities: number;
  saved: boolean;
  matchedVideoTitle?: string;
};

export type SearchSummary = {
  id: string;
  status: "queued" | "running" | "completed" | "partial" | "failed";
  channelsTotal: number;
  channelsDone: number;
};
