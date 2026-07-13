import Link from "next/link";
import { VideoCard } from "@/features/results/VideoCard";
import type { OpportunityCard } from "@/features/results/types";
import { createClient } from "@/lib/supabase/server";
import { getPlanLimits } from "@/services/planService";

export const metadata = { title: "Minha Pauta" };

export default async function PautaPage() {
  const supabase = await createClient();
  const limits = await getPlanLimits(supabase);

  if (!limits.favorites) {
    return (
      <div className="mx-auto flex max-w-[720px] flex-col gap-sm pt-xl">
        <h1 className="text-display-lg text-ink">Minha Pauta</h1>
        <div className="flex flex-col gap-xs border border-hairline p-sm">
          <p className="text-body-md text-body">
            Salve as melhores oportunidades e monte a pauta dos seus próximos
            vídeos — disponível nos planos Criador e Pro.
          </p>
          <Link
            href="/app/conta#planos"
            className="inline-flex h-[48px] w-fit items-center bg-primary px-md text-button-label uppercase text-on-primary active:bg-primary-active"
          >
            Ver planos
          </Link>
        </div>
      </div>
    );
  }

  const { data: favorites } = await supabase
    .from("favorites")
    .select("video_id, search_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  let cards: OpportunityCard[] = [];
  if (favorites && favorites.length > 0) {
    const videoIds = favorites.map((f) => f.video_id);
    const { data: videos } = await supabase
      .from("videos")
      .select(
        "youtube_id, channel_id, title, thumbnail_url, is_short, duration_seconds, published_at, view_count, score, baseline_views",
      )
      .in("youtube_id", videoIds);
    const channelIds = [...new Set((videos ?? []).map((v) => v.channel_id))];
    const { data: channels } = await supabase
      .from("channels")
      .select("youtube_id, title, subscriber_count")
      .in("youtube_id", channelIds);
    const channelById = new Map(
      (channels ?? []).map((c) => [c.youtube_id, c]),
    );
    const videoById = new Map((videos ?? []).map((v) => [v.youtube_id, v]));

    cards = favorites
      .map((favorite) => {
        const video = videoById.get(favorite.video_id);
        if (!video) return null;
        const channel = channelById.get(video.channel_id);
        return {
          videoId: video.youtube_id,
          title: video.title,
          thumbnailUrl: video.thumbnail_url,
          isShort: video.is_short,
          durationSeconds: video.duration_seconds,
          publishedAt: video.published_at,
          viewCount: video.view_count,
          score: Number(video.score ?? 0),
          baselineViews: video.baseline_views,
          lowConfidence: false,
          channelId: video.channel_id,
          channelTitle: channel?.title ?? "—",
          channelSubscribers: channel?.subscriber_count ?? null,
        };
      })
      .filter((card): card is OpportunityCard => card !== null);
  }

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-md pt-xl">
      <header className="flex flex-col gap-xxs">
        <h1 className="text-display-lg text-ink">Minha Pauta</h1>
        <p className="text-body-md text-body">
          As oportunidades que você salvou — a matéria-prima dos próximos
          vídeos.
        </p>
      </header>

      {cards.length === 0 ? (
        <p className="border border-dashed border-hairline p-sm text-body-md text-body">
          Nada salvo ainda — clique na ☆ de qualquer oportunidade para
          adicioná-la aqui.
        </p>
      ) : (
        <ul className="flex flex-col gap-xs">
          {cards.map((card) => (
            <li key={card.videoId}>
              <VideoCard card={card} favorited />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
