import Image from "next/image";
import { SaveMenu } from "@/features/pauta/SaveMenu";
import {
  formatCompactCount,
  formatDuration,
  formatRelativeDate,
} from "@/utils/format";
import type { TrendingCard } from "./types";

/**
 * Card da aba Trending (Pré-M9 T2): views + idade em destaque no lugar
 * do score, com selo didático — vídeo novo ainda não tem score justo
 * porque a régua da mediana exige 14 dias (doc 3 §3.6). O formato vira
 * etiqueta no próprio card, já que a aba mistura longos e shorts.
 */
export function TrendingVideoCard({
  card,
  favorited = false,
  channelSaved = false,
  searchId,
}: {
  card: TrendingCard;
  favorited?: boolean;
  channelSaved?: boolean;
  searchId?: string;
}) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${card.videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-xs rounded-md border border-hairline p-xs transition-all duration-150 hover:border-muted hover:bg-canvas-elevated/20"
    >
      <div className="relative h-[68px] w-[120px] shrink-0 overflow-hidden rounded-sm bg-canvas-elevated">
        {card.thumbnailUrl ? (
          <Image
            src={card.thumbnailUrl}
            alt=""
            fill
            sizes="120px"
            className="object-cover"
          />
        ) : null}
        <span className="absolute bottom-[2px] right-[2px] bg-canvas/90 px-[4px] text-caption tabular-nums text-ink">
          {formatDuration(card.durationSeconds)}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-xxxs">
        <div className="flex items-start justify-between gap-xs">
          <h3 className="line-clamp-2 text-title-sm text-ink">{card.title}</h3>
          <span className="flex shrink-0 items-center gap-xxs">
            <SaveMenu
              videoId={card.videoId}
              channelId={card.channelId}
              searchId={searchId}
              initialVideoSaved={favorited}
              initialChannelSaved={channelSaved}
            />
            <span className="inline-flex items-center border border-hairline px-xxs py-xxxs text-caption-upper uppercase text-muted-soft">
              sem score ainda
            </span>
          </span>
        </div>
        <p className="text-title-sm tabular-nums text-ink">
          {card.viewCount !== null
            ? `${formatCompactCount(card.viewCount)} views`
            : "views indisponíveis"}
          {card.publishedAt &&
            ` · ${formatRelativeDate(new Date(card.publishedAt))}`}
          <span className="ml-xxs rounded-xs border border-hairline px-[4px] text-caption-upper uppercase text-muted-soft">
            {card.isShort ? "short" : "longo"}
          </span>
        </p>
        <p className="truncate text-body-sm text-body">
          {card.channelTitle}
          {card.channelSubscribers !== null &&
            ` · ${formatCompactCount(card.channelSubscribers)} inscritos`}
        </p>
        <p className="text-caption text-muted">
          Novo demais para um score justo — a comparação com a mediana do
          canal só vale após 14 dias de vida.
        </p>
      </div>
    </a>
  );
}
