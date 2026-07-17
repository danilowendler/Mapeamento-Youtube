import Link from "next/link";
import {
  WorkspaceBoard,
  type ChannelItem,
  type VideoItem,
  type WorkspaceFolder,
} from "@/features/pauta/WorkspaceBoard";
import { createClient } from "@/lib/supabase/server";
import { getPlanLimits } from "@/services/planService";

export const metadata = { title: "Workspace" };

export default async function WorkspacePage() {
  const supabase = await createClient();
  const limits = await getPlanLimits(supabase);

  if (!limits.favorites) {
    return (
      <div className="mx-auto flex max-w-[720px] flex-col gap-sm pt-xl">
        <h1 className="font-display text-display-lg uppercase text-ink">
          Workspace
        </h1>
        <div className="flex flex-col gap-xs rounded-md border border-hairline p-sm">
          <p className="text-body-md text-body">
            Salve as melhores oportunidades e organize a pauta dos seus
            próximos vídeos em pastas — disponível nos planos Criador e Pro.
          </p>
          <Link
            href="/app?settings=plano"
            className="inline-flex h-[48px] w-fit items-center rounded-sm bg-primary px-md text-button-label uppercase text-on-primary active:bg-primary-active"
          >
            Ver planos
          </Link>
        </div>
      </div>
    );
  }

  const [{ data: folderRows }, { data: favorites }, { data: refRows }] =
    await Promise.all([
      supabase
        .from("pauta_categories")
        .select("id, name, kind, position")
        .order("position")
        .order("created_at"),
      supabase
        .from("favorites")
        .select("video_id, category_id, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("channel_refs")
        .select(
          "channel_id, folder_id, channels ( title, subscriber_count, thumbnail_url )",
        )
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  const folders: WorkspaceFolder[] = (folderRows ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    kind: f.kind === "referencias" ? "referencias" : "pautas",
  }));

  // Vídeos favoritados → cards de vídeo
  let videos: VideoItem[] = [];
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
          folderId: favorite.category_id,
        },
      ];
    });
  }

  // Canais salvos → cards de canal
  type RefRow = {
    channel_id: string;
    folder_id: string | null;
    channels: {
      title: string;
      subscriber_count: number | null;
      thumbnail_url: string | null;
    } | null;
  };
  const channels: ChannelItem[] = ((refRows ?? []) as unknown as RefRow[]).map(
    (row) => ({
      channelId: row.channel_id,
      title: row.channels?.title ?? row.channel_id,
      subscriberCount: row.channels?.subscriber_count ?? null,
      thumbnailUrl: row.channels?.thumbnail_url ?? null,
      folderId: row.folder_id,
    }),
  );

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-md pt-xl">
      <header className="flex flex-col gap-xxs">
        <h1 className="font-display text-display-lg uppercase text-ink">
          Workspace
        </h1>
        <p className="text-body-md text-body">
          Sua área de trabalho — arraste as oportunidades soltas para dentro
          das pastas.{" "}
          <span className="text-muted-soft">
            Pautas guardam vídeos; Referências guardam canais.
          </span>
        </p>
      </header>

      <WorkspaceBoard folders={folders} videos={videos} channels={channels} />
    </div>
  );
}
