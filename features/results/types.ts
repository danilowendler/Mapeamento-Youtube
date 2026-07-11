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
};

export type SearchSummary = {
  id: string;
  status: "queued" | "running" | "completed" | "partial" | "failed";
  channelsTotal: number;
  channelsDone: number;
};
