import { notFound } from "next/navigation";
import {
  ChannelChips,
  type ChannelChip,
} from "@/features/results/ChannelChips";
import { RelatedChannels } from "@/features/results/RelatedChannels";
import { ResultsView } from "@/features/results/ResultsView";
import { SearchLive } from "@/features/results/SearchLive";
import type {
  OpportunityCard,
  TrendingCard,
} from "@/features/results/types";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  MIN_BUCKET_SAMPLE,
  MIN_DISPLAY_SCORE,
} from "@/services/outliers";
import { trendingSinceIso } from "@/services/freshness";
import { getPlanLimits } from "@/services/planService";
import { findRelatedChannels } from "@/services/relatedService";

export const metadata = { title: "Resultados" };

export default async function ResultadosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const limits = await getPlanLimits(supabase);

  // RLS garante que só o dono enxerga a pesquisa
  const { data: search } = await supabase
    .from("searches")
    .select(
      "id, status, channels_total, channels_done, created_at, failed_inputs, input",
    )
    .eq("id", id)
    .maybeSingle();
  if (!search) notFound();

  const searchInput = search.input as {
    keyword?: string;
    nicheName?: string;
  };
  const subtitle = searchInput.nicheName
    ? `Nicho: ${searchInput.nicheName}`
    : searchInput.keyword
      ? `Tema: “${searchInput.keyword}”`
      : null;

  const { data: results } = await supabase
    .from("search_results")
    .select("channel_id, status, top_score")
    .eq("search_id", id);

  const allChannelIds = (results ?? []).map((r) => r.channel_id);
  const readyChannelIds = (results ?? [])
    .filter((r) => r.status === "ready")
    .map((r) => r.channel_id);

  let cards: OpportunityCard[] = [];
  let trendingCards: TrendingCard[] = [];
  let oldestRefreshedAt: string | null = null;
  let channelById = new Map<
    string,
    {
      youtube_id: string;
      title: string;
      subscriber_count: number | null;
      refreshed_at: string | null;
    }
  >();
  const channelsWithBaselines = new Set<string>();

  if (allChannelIds.length > 0) {
    // Trending (Pré-M9 T2): últimos 7 dias direto do corpus, inclusive
    // sem score (< 14 dias não recebe score — doc 3 §3.6). Zero cota.
    const trendingSince = trendingSinceIso();
    const [videosRes, channelsRes, baselinesRes, trendingRes] =
      await Promise.all([
        supabase
          .from("videos")
          .select(
            "youtube_id, channel_id, title, thumbnail_url, is_short, duration_seconds, published_at, view_count, score, baseline_views, age_bucket",
          )
          .in("channel_id", readyChannelIds)
          .gte("score", MIN_DISPLAY_SCORE)
          .order("score", { ascending: false })
          .limit(200),
        supabase
          .from("channels")
          .select("youtube_id, title, subscriber_count, refreshed_at")
          .in("youtube_id", allChannelIds),
        supabase
          .from("channel_baselines")
          .select("channel_id, format, age_bucket, sample_size")
          .in("channel_id", readyChannelIds),
        supabase
          .from("videos")
          .select(
            "youtube_id, channel_id, title, thumbnail_url, is_short, duration_seconds, published_at, view_count",
          )
          .in("channel_id", readyChannelIds)
          .gte("published_at", trendingSince)
          .order("view_count", { ascending: false, nullsFirst: false })
          .limit(12),
      ]);

    channelById = new Map(
      (channelsRes.data ?? []).map((c) => [c.youtube_id, c]),
    );
    for (const b of baselinesRes.data ?? []) {
      channelsWithBaselines.add(b.channel_id);
    }
    const sampleByKey = new Map(
      (baselinesRes.data ?? []).map((b) => [
        `${b.channel_id}|${b.format}|${b.age_bucket}`,
        b.sample_size,
      ]),
    );

    cards = (videosRes.data ?? []).map((video) => {
      const channel = channelById.get(video.channel_id);
      const format = video.is_short ? "short" : "long";
      const bucketSample =
        sampleByKey.get(`${video.channel_id}|${format}|${video.age_bucket}`) ??
        0;
      const sampleUsed =
        bucketSample >= MIN_BUCKET_SAMPLE
          ? bucketSample
          : (sampleByKey.get(`${video.channel_id}|${format}|all`) ?? 0);

      return {
        videoId: video.youtube_id,
        title: video.title,
        thumbnailUrl: video.thumbnail_url,
        isShort: video.is_short,
        durationSeconds: video.duration_seconds,
        publishedAt: video.published_at,
        viewCount: video.view_count,
        score: Number(video.score),
        baselineViews: video.baseline_views,
        lowConfidence: sampleUsed < MIN_BUCKET_SAMPLE,
        channelId: video.channel_id,
        channelTitle: channel?.title ?? "—",
        channelSubscribers: channel?.subscriber_count ?? null,
      };
    });

    trendingCards = (trendingRes.data ?? []).map((video) => {
      const channel = channelById.get(video.channel_id);
      return {
        videoId: video.youtube_id,
        title: video.title,
        thumbnailUrl: video.thumbnail_url,
        isShort: video.is_short,
        durationSeconds: video.duration_seconds,
        publishedAt: video.published_at,
        viewCount: video.view_count,
        channelId: video.channel_id,
        channelTitle: channel?.title ?? "—",
        channelSubscribers: channel?.subscriber_count ?? null,
      };
    });

    // Frescor honesto (doc 3 §3.3): a análise mais antiga entre os
    // canais prontos data os números exibidos na Trending
    for (const channelId of readyChannelIds) {
      const refreshedAt = channelById.get(channelId)?.refreshed_at ?? null;
      if (
        refreshedAt !== null &&
        (oldestRefreshedAt === null || refreshedAt < oldestRefreshedAt)
      ) {
        oldestRefreshedAt = refreshedAt;
      }
    }
  }

  // Canais relacionados via corpus — só quando a pesquisa terminou
  const isDone = ["completed", "partial"].includes(search.status);
  const related =
    isDone && readyChannelIds.length > 0
      ? await findRelatedChannels(readyChannelIds)
      : [];

  // Canais já salvos como referência (RLS filtra por dono) — cobre os
  // chips analisados e os relacionados numa consulta só (B5)
  const savedLookupIds = [
    ...new Set([...allChannelIds, ...related.map((r) => r.channelId)]),
  ];
  const { data: savedRows } =
    savedLookupIds.length > 0
      ? await supabase
          .from("channel_refs")
          .select("channel_id")
          .in("channel_id", savedLookupIds)
      : { data: [] };
  const savedChannelIds = new Set(
    (savedRows ?? []).map((row) => row.channel_id),
  );
  const relatedWithSaved = related.map((channel) => ({
    ...channel,
    saved: savedChannelIds.has(channel.channelId),
  }));

  const chips: ChannelChip[] = (results ?? []).map((result) => ({
    channelId: result.channel_id,
    title: channelById.get(result.channel_id)?.title ?? result.channel_id,
    state:
      result.status === "failed"
        ? "failed"
        : result.status !== "ready"
          ? "collecting"
          : channelsWithBaselines.has(result.channel_id)
            ? "ready"
            : "no_eligible",
    opportunities: cards.filter((c) => c.channelId === result.channel_id)
      .length,
    saved: savedChannelIds.has(result.channel_id),
  }));

  const failedInputs = (search.failed_inputs ?? []) as string[];

  // Favoritos do usuário entre os vídeos exibidos (RLS filtra por dono)
  const shownVideoIds = [
    ...new Set([
      ...cards.map((card) => card.videoId),
      ...trendingCards.map((card) => card.videoId),
    ]),
  ];
  const { data: favoriteRows } =
    shownVideoIds.length > 0
      ? await supabase
          .from("favorites")
          .select("video_id")
          .in("video_id", shownVideoIds)
      : { data: [] };
  const favoritedIds = (favoriteRows ?? []).map((row) => row.video_id);

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-md pt-md">
      <header className="flex flex-col gap-xs">
        <div className="flex items-start justify-between gap-xs">
          <div className="flex flex-col gap-xxxs">
            <h1 className="font-display text-display-md text-ink">
              Oportunidades
            </h1>
            {subtitle && <p className="text-body-sm text-body">{subtitle}</p>}
          </div>
          {isDone && cards.length > 0 && (
            limits.export ? (
              <a
                href={`/api/searches/${search.id}/export`}
                className="inline-flex h-[36px] shrink-0 items-center rounded-sm border border-ink px-xs text-caption-upper uppercase text-ink"
              >
                Exportar CSV
              </a>
            ) : (
              <Link
                href="/app?settings=plano"
                title="Exportação disponível nos planos Criador e Pro"
                className="inline-flex h-[36px] shrink-0 items-center gap-xxxs rounded-sm border border-hairline px-xs text-caption-upper uppercase text-muted-soft hover:text-body"
              >
                Exportar CSV · planos pagos
              </Link>
            )
          )}
        </div>
        <SearchLive
          search={{
            id: search.id,
            status: search.status,
            channelsTotal: search.channels_total,
            channelsDone: search.channels_done,
          }}
        />
        <ChannelChips chips={chips} />
        {failedInputs.length > 0 && (
          <p className="text-body-sm text-warning">
            Não encontramos: {failedInputs.join(", ")} — confira se são URLs
            ou @handles válidos.
          </p>
        )}
      </header>

      {search.status === "failed" ? (
        <p className="rounded-md border border-warning/40 p-sm text-body-md text-warning">
          Não conseguimos analisar nenhum dos canais informados. Verifique as
          entradas e tente novamente.
        </p>
      ) : cards.length === 0 && trendingCards.length === 0 &&
        search.status !== "running" && search.status !== "queued" ? (
        <p className="rounded-md border border-dashed border-hairline p-sm text-body-md text-body">
          Nenhum vídeo com pelo menos{" "}
          {MIN_DISPLAY_SCORE.toLocaleString("pt-BR")}× a mediana do próprio
          canal — os vídeos destes canais performam de forma uniforme.
        </p>
      ) : (
        <ResultsView
          cards={cards}
          trending={trendingCards}
          oldestRefreshedAt={oldestRefreshedAt}
          favoritedIds={favoritedIds}
          savedChannelIds={[...savedChannelIds]}
          searchId={search.id}
        />
      )}

      <RelatedChannels related={relatedWithSaved} />
    </div>
  );
}
