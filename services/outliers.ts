/**
 * Motor de outliers (doc 3 §3.6) — núcleo puro, sem I/O.
 *
 * score = views / mediana(canal, formato, faixa de idade)
 *
 * Regras inegociáveis:
 * 1. Mediana, não média (a média é inflada pelos próprios virais);
 * 2. Shorts e longos têm baselines separados, nunca se misturam;
 * 3. Vídeos com < 14 dias não entram no baseline nem recebem score
 *    (ainda estão acumulando views — comparação seria injusta).
 */

export const MIN_BASELINE_AGE_DAYS = 14;
/** Amostra mínima para o baseline do bucket ser confiável. */
export const MIN_BUCKET_SAMPLE = 10;
/**
 * Score mínimo para um vídeo contar como oportunidade (doc 3 §3.6).
 * É a régua das métricas materializadas do Dashboard (top_score,
 * contagens) — mudar exige re-backfill; não usar para exibição.
 */
export const MIN_OPPORTUNITY_SCORE = 3;
/**
 * Piso de EXIBIÇÃO nos resultados e no export (Pré-M9 T1): mostra a
 * faixa 1.5–3× como sinal fraco sem rebaixar a régua de oportunidade
 * acima. Read-time apenas — nenhuma métrica materializada usa isto.
 */
export const MIN_DISPLAY_SCORE = 1.5;
/** Limiares das faixas de score do design system (3× · 10× · 30×+). */
export const SCORE_BAND_MID = 10;
export const SCORE_BAND_HIGH = 30;

export type VideoFormat = "short" | "long";
export type AgeBucket = "14d-3m" | "3m-12m" | "12m+";

export type AnalyzableVideo = {
  youtubeId: string;
  isShort: boolean;
  publishedAt: Date | null;
  viewCount: number | null;
};

export type Baseline = {
  format: VideoFormat;
  /** Bucket etário, ou "all" para a mediana geral do formato (fallback). */
  ageBucket: AgeBucket | "all";
  medianViews: number;
  sampleSize: number;
};

export type ScoredVideo = {
  youtubeId: string;
  ageBucket: AgeBucket | null;
  score: number | null;
  baselineViews: number | null;
  /** true quando o baseline usado tem amostra < MIN_BUCKET_SAMPLE. */
  lowConfidence: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function ageBucketOf(
  publishedAt: Date,
  now: Date,
): AgeBucket | null {
  const ageDays = (now.getTime() - publishedAt.getTime()) / DAY_MS;
  if (ageDays < MIN_BASELINE_AGE_DAYS) return null;
  if (ageDays <= 90) return "14d-3m";
  if (ageDays <= 365) return "3m-12m";
  return "12m+";
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Score PARCIAL de vídeo jovem (< 14 dias, aba Trending — Pré-M9 T2b).
 * Views só crescem e a mediana do canal é fixa, então views ÷ mediana
 * é um PISO do score futuro — honesto de exibir. Retorna null abaixo
 * de 1×: aí o número não informa nada (cedo demais para saber se o
 * vídeo é fraco — regra dos 14 dias, doc 3 §3.6).
 */
export function partialScore(
  viewCount: number | null,
  medianViews: number | null,
): number | null {
  if (viewCount === null || medianViews === null) return null;
  if (!Number.isFinite(viewCount) || !Number.isFinite(medianViews)) {
    return null;
  }
  const baseline = Math.max(medianViews, 1); // nunca dividir por zero
  const score = Math.round((viewCount / baseline) * 100) / 100;
  return score >= 1 ? score : null;
}

export type ChannelAnalysis = {
  baselines: Baseline[];
  videos: ScoredVideo[];
};

/**
 * Analisa todos os vídeos de UM canal: calcula baselines por
 * formato × faixa de idade e o score de cada vídeo.
 */
export function analyzeChannel(
  videos: AnalyzableVideo[],
  now: Date = new Date(),
): ChannelAnalysis {
  // 1 · Elegíveis para baseline: idade ≥ 14 dias e views conhecidas
  type Eligible = AnalyzableVideo & { bucket: AgeBucket; views: number };
  const eligible: Eligible[] = [];
  for (const video of videos) {
    if (video.publishedAt === null || video.viewCount === null) continue;
    const bucket = ageBucketOf(video.publishedAt, now);
    if (!bucket) continue;
    eligible.push({ ...video, bucket, views: video.viewCount });
  }

  // 2 · Baselines por formato × bucket + mediana geral do formato
  const baselines: Baseline[] = [];
  const byKey = new Map<string, number>(); // "format|bucket" → mediana
  const sampleByKey = new Map<string, number>();

  for (const format of ["short", "long"] as const) {
    const ofFormat = eligible.filter(
      (v) => (v.isShort ? "short" : "long") === format,
    );
    if (ofFormat.length === 0) continue;

    const formatMedian = median(ofFormat.map((v) => v.views));
    baselines.push({
      format,
      ageBucket: "all",
      medianViews: formatMedian,
      sampleSize: ofFormat.length,
    });
    byKey.set(`${format}|all`, formatMedian);
    sampleByKey.set(`${format}|all`, ofFormat.length);

    for (const bucket of ["14d-3m", "3m-12m", "12m+"] as const) {
      const ofBucket = ofFormat.filter((v) => v.bucket === bucket);
      if (ofBucket.length === 0) continue;
      const bucketMedian = median(ofBucket.map((v) => v.views));
      baselines.push({
        format,
        ageBucket: bucket,
        medianViews: bucketMedian,
        sampleSize: ofBucket.length,
      });
      byKey.set(`${format}|${bucket}`, bucketMedian);
      sampleByKey.set(`${format}|${bucket}`, ofBucket.length);
    }
  }

  // 3 · Score por vídeo (bucket com amostra suficiente, senão formato)
  const scored: ScoredVideo[] = videos.map((video) => {
    if (video.publishedAt === null || video.viewCount === null) {
      return {
        youtubeId: video.youtubeId,
        ageBucket: null,
        score: null,
        baselineViews: null,
        lowConfidence: false,
      };
    }
    const bucket = ageBucketOf(video.publishedAt, now);
    if (!bucket) {
      // < 14 dias: sem score (doc 3 §3.6)
      return {
        youtubeId: video.youtubeId,
        ageBucket: null,
        score: null,
        baselineViews: null,
        lowConfidence: false,
      };
    }

    const format = video.isShort ? "short" : "long";
    const bucketKey = `${format}|${bucket}`;
    const bucketSample = sampleByKey.get(bucketKey) ?? 0;
    const useBucket = bucketSample >= MIN_BUCKET_SAMPLE;
    const key = useBucket ? bucketKey : `${format}|all`;

    const baselineRaw = byKey.get(key);
    if (baselineRaw === undefined) {
      return {
        youtubeId: video.youtubeId,
        ageBucket: bucket,
        score: null,
        baselineViews: null,
        lowConfidence: true,
      };
    }

    const baseline = Math.max(baselineRaw, 1); // nunca dividir por zero
    const sampleUsed = sampleByKey.get(key) ?? 0;
    return {
      youtubeId: video.youtubeId,
      ageBucket: bucket,
      score: Math.round((video.viewCount / baseline) * 100) / 100,
      baselineViews: Math.round(baselineRaw),
      lowConfidence: sampleUsed < MIN_BUCKET_SAMPLE,
    };
  });

  return { baselines, videos: scored };
}
