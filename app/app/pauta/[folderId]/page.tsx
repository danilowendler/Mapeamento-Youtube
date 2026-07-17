import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  FolderView,
  type FolderChannel,
  type FolderInfo,
  type FolderVideo,
} from "@/features/pauta/FolderView";
import { createClient } from "@/lib/supabase/server";
import { getPlanLimits } from "@/services/planService";

export const metadata = { title: "Pasta" };

/**
 * Página dedicada da pasta (M10.5, B5.4 — spec 2026-07-17): o board é
 * triagem; aqui é onde o criador planeja, organiza e estuda o que
 * salvou. RLS garante que só o dono enxerga a pasta.
 */
export default async function FolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  const { folderId } = await params;
  const supabase = await createClient();
  const limits = await getPlanLimits(supabase);
  if (!limits.favorites) redirect("/app/pauta");

  const { data: folder } = await supabase
    .from("pauta_categories")
    .select("id, name, kind, notes")
    .eq("id", folderId)
    .maybeSingle();
  if (!folder) notFound();

  const info: FolderInfo = {
    id: folder.id,
    name: folder.name,
    kind: folder.kind === "referencias" ? "referencias" : "pautas",
    notes: folder.notes,
  };

  // Demais pastas do mesmo tipo — destinos do "Mover"
  const { data: siblingRows } = await supabase
    .from("pauta_categories")
    .select("id, name, kind, position")
    .neq("id", folder.id)
    .eq("kind", info.kind)
    .order("position");
  const siblings = (siblingRows ?? []).map((s) => ({
    id: s.id,
    name: s.name,
  }));

  let videos: FolderVideo[] = [];
  let channels: FolderChannel[] = [];

  if (info.kind === "pautas") {
    const { data: favorites } = await supabase
      .from("favorites")
      .select("video_id, note, created_at")
      .eq("category_id", folder.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (favorites && favorites.length > 0) {
      const videoIds = favorites.map((f) => f.video_id);
      const { data: videoRows } = await supabase
        .from("videos")
        .select("youtube_id, channel_id, title, thumbnail_url, score")
        .in("youtube_id", videoIds);
      const channelIds = [
        ...new Set((videoRows ?? []).map((v) => v.channel_id)),
      ];
      const { data: channelRows } = await supabase
        .from("channels")
        .select("youtube_id, title")
        .in("youtube_id", channelIds);
      const channelById = new Map(
        (channelRows ?? []).map((c) => [c.youtube_id, c.title]),
      );
      const videoById = new Map(
        (videoRows ?? []).map((v) => [v.youtube_id, v]),
      );
      videos = favorites.flatMap((favorite) => {
        const video = videoById.get(favorite.video_id);
        if (!video) return [];
        return [
          {
            videoId: video.youtube_id,
            title: video.title,
            channelTitle: channelById.get(video.channel_id) ?? "—",
            score: Number(video.score ?? 0),
            thumbnailUrl: video.thumbnail_url,
            note: favorite.note,
            createdAt: favorite.created_at,
          },
        ];
      });
    }
  } else {
    type RefRow = {
      channel_id: string;
      note: string | null;
      created_at: string;
      channels: {
        title: string;
        subscriber_count: number | null;
        thumbnail_url: string | null;
      } | null;
    };
    const { data: refRows } = await supabase
      .from("channel_refs")
      .select(
        "channel_id, note, created_at, channels ( title, subscriber_count, thumbnail_url )",
      )
      .eq("folder_id", folder.id)
      .order("created_at", { ascending: false })
      .limit(200);
    channels = ((refRows ?? []) as unknown as RefRow[]).map((row) => ({
      channelId: row.channel_id,
      title: row.channels?.title ?? row.channel_id,
      subscriberCount: row.channels?.subscriber_count ?? null,
      thumbnailUrl: row.channels?.thumbnail_url ?? null,
      note: row.note,
      createdAt: row.created_at,
    }));
  }

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-md pt-md md:pt-lg">
      <Link
        href="/app/pauta"
        className="w-fit text-body-sm text-muted-soft transition-colors hover:text-ink"
      >
        ‹ Workspace
      </Link>

      <FolderView
        folder={info}
        siblings={siblings}
        videos={videos}
        channels={channels}
      />
    </div>
  );
}
