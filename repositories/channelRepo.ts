import { createAdminClient } from "@/lib/supabase/admin";
import type { YouTubeChannel } from "@/lib/youtube/types";

export type ChannelRow = {
  youtube_id: string;
  handle: string | null;
  title: string;
  uploads_playlist_id: string | null;
  refreshed_at: string | null;
  collection_status: "pending" | "collecting" | "ready" | "failed";
};

const admin = () => createAdminClient();

export async function findById(youtubeId: string): Promise<ChannelRow | null> {
  const { data, error } = await admin()
    .from("channels")
    .select(
      "youtube_id, handle, title, uploads_playlist_id, refreshed_at, collection_status",
    )
    .eq("youtube_id", youtubeId)
    .maybeSingle();
  if (error) throw new Error(`channels.findById: ${error.message}`);
  return data;
}

/** Upsert dos dados vindos da API (não toca em refreshed_at). */
export async function upsertFromApi(
  channel: YouTubeChannel,
  status: ChannelRow["collection_status"],
): Promise<void> {
  const { error } = await admin()
    .from("channels")
    .upsert(
      {
        youtube_id: channel.youtubeId,
        handle: channel.handle,
        title: channel.title,
        description: channel.description,
        thumbnail_url: channel.thumbnailUrl,
        subscriber_count: channel.subscriberCount,
        video_count: channel.videoCount,
        view_count: channel.viewCount,
        uploads_playlist_id: channel.uploadsPlaylistId,
        country: channel.country,
        default_language: channel.defaultLanguage,
        collection_status: status,
      },
      { onConflict: "youtube_id" },
    );
  if (error) throw new Error(`channels.upsertFromApi: ${error.message}`);
}

export async function markStatus(
  youtubeId: string,
  status: ChannelRow["collection_status"],
  options: { touchRefreshedAt?: boolean } = {},
): Promise<void> {
  const patch: Record<string, unknown> = { collection_status: status };
  if (options.touchRefreshedAt) patch.refreshed_at = new Date().toISOString();

  const { error } = await admin()
    .from("channels")
    .update(patch)
    .eq("youtube_id", youtubeId);
  if (error) throw new Error(`channels.markStatus: ${error.message}`);
}
