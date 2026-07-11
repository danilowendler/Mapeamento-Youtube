import { createAdminClient } from "@/lib/supabase/admin";
import type { YouTubeVideo } from "@/lib/youtube/types";
import { isShortDuration } from "@/utils/youtube";

const admin = () => createAdminClient();

/** IDs de vídeos já conhecidos de um canal (para coleta incremental). */
export async function getKnownIds(channelId: string): Promise<Set<string>> {
  const { data, error } = await admin()
    .from("videos")
    .select("youtube_id")
    .eq("channel_id", channelId);
  if (error) throw new Error(`videos.getKnownIds: ${error.message}`);
  return new Set((data ?? []).map((row) => row.youtube_id));
}

/** IDs mais recentes de um canal, para refresh de métricas (cap 200). */
export async function getRecentIds(
  channelId: string,
  limit: number,
): Promise<string[]> {
  const { data, error } = await admin()
    .from("videos")
    .select("youtube_id")
    .eq("channel_id", channelId)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(`videos.getRecentIds: ${error.message}`);
  return (data ?? []).map((row) => row.youtube_id);
}

/** Upsert idempotente em lote (reprocessar nunca duplica — doc 3 §3.5). */
export async function upsertFromApi(videos: YouTubeVideo[]): Promise<number> {
  if (videos.length === 0) return 0;
  const rows = videos.map((video) => ({
    youtube_id: video.youtubeId,
    channel_id: video.channelId,
    title: video.title,
    thumbnail_url: video.thumbnailUrl,
    published_at: video.publishedAt,
    duration_seconds: video.durationSeconds,
    is_short: isShortDuration(video.durationSeconds),
    view_count: video.viewCount,
    like_count: video.likeCount,
    comment_count: video.commentCount,
    refreshed_at: new Date().toISOString(),
  }));

  const { error } = await admin()
    .from("videos")
    .upsert(rows, { onConflict: "youtube_id" });
  if (error) throw new Error(`videos.upsertFromApi: ${error.message}`);
  return rows.length;
}
