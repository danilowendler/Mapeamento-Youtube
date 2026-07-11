import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeChannel, type AnalyzableVideo } from "./outliers";

/**
 * Lê os vídeos de um canal do corpus, roda o motor de outliers e
 * persiste baselines (channel_baselines) e scores (videos).
 * Idempotente; roda após cada coleta/recoleta.
 *
 * Retorna o maior score do canal (top_score do search_result).
 */
export async function applyChannelAnalysis(
  channelId: string,
): Promise<{ topScore: number | null; videosScored: number }> {
  const supabase = createAdminClient();

  const { data: rows, error } = await supabase
    .from("videos")
    .select("youtube_id, is_short, published_at, view_count")
    .eq("channel_id", channelId);
  if (error) throw new Error(`analysis.readVideos: ${error.message}`);
  if (!rows || rows.length === 0) {
    return { topScore: null, videosScored: 0 };
  }

  const analyzable: AnalyzableVideo[] = rows.map((row) => ({
    youtubeId: row.youtube_id,
    isShort: row.is_short,
    publishedAt: row.published_at ? new Date(row.published_at) : null,
    viewCount: row.view_count,
  }));

  const { baselines, videos } = analyzeChannel(analyzable);

  // Baselines: substitui o conjunto do canal (buckets podem sumir)
  const { error: delError } = await supabase
    .from("channel_baselines")
    .delete()
    .eq("channel_id", channelId);
  if (delError) throw new Error(`analysis.clearBaselines: ${delError.message}`);

  if (baselines.length > 0) {
    const { error: insError } = await supabase.from("channel_baselines").insert(
      baselines.map((b) => ({
        channel_id: channelId,
        format: b.format,
        age_bucket: b.ageBucket,
        // Mediana de amostra par é fracionária; a coluna é bigint
        median_views: Math.round(b.medianViews),
        sample_size: b.sampleSize,
        computed_at: new Date().toISOString(),
      })),
    );
    if (insError) throw new Error(`analysis.baselines: ${insError.message}`);
  }

  // Scores: upsert só das colunas de análise (channel_id exigido p/ insert)
  const scoredRows = videos.map((v) => ({
    youtube_id: v.youtubeId,
    channel_id: channelId,
    score: v.score,
    baseline_views: v.baselineViews,
    age_bucket: v.ageBucket,
  }));
  const { error: upError } = await supabase
    .from("videos")
    .upsert(scoredRows, { onConflict: "youtube_id" });
  if (upError) throw new Error(`analysis.scores: ${upError.message}`);

  const topScore = videos.reduce<number | null>(
    (max, v) => (v.score !== null && (max === null || v.score > max) ? v.score : max),
    null,
  );

  return {
    topScore,
    videosScored: videos.filter((v) => v.score !== null).length,
  };
}
