import Image from "next/image";
import { FavoriteButton } from "@/features/favorites/FavoriteButton";
import {
  formatCompactCount,
  formatDuration,
  formatRelativeDate,
} from "@/utils/format";
import { ScoreBadge } from "./ScoreBadge";
import type { OpportunityCard } from "./types";

/** Card de oportunidade (doc 6 §6.4): thumbnail + score + o porquê. */
export function VideoCard({
  card,
  favorited = false,
  searchId,
}: {
  card: OpportunityCard;
  favorited?: boolean;
  searchId?: string;
}) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${card.videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-xs border border-hairline p-xs transition-colors hover:border-muted"
    >
      <div className="relative h-[68px] w-[120px] shrink-0 overflow-hidden bg-canvas-elevated">
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
          <span className="flex shrink-0 items-center gap-xxxs">
            <FavoriteButton
              videoId={card.videoId}
              searchId={searchId}
              initialFavorited={favorited}
            />
            <ScoreBadge score={card.score} />
          </span>
        </div>
        <p className="truncate text-body-sm text-body">
          {card.channelTitle}
          {card.channelSubscribers !== null &&
            ` · ${formatCompactCount(card.channelSubscribers)} inscritos`}
        </p>
        <p className="text-body-sm text-muted-soft">
          {card.viewCount !== null &&
            `${formatCompactCount(card.viewCount)} views`}
          {card.publishedAt &&
            ` · ${formatRelativeDate(new Date(card.publishedAt))}`}
        </p>
        <p className="text-caption text-muted">
          {card.baselineViews !== null &&
            `${formatCompactCount(card.viewCount ?? 0)} views vs. mediana de ${formatCompactCount(card.baselineViews)} do canal`}
          {card.lowConfidence && (
            <span className="ml-xxs border border-hairline px-[4px] text-caption-upper uppercase">
              amostra pequena
            </span>
          )}
        </p>
      </div>
    </a>
  );
}
