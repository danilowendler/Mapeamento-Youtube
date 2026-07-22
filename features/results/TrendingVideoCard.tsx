import Image from "next/image";
import { SaveMenu } from "@/features/pauta/SaveMenu";
import {
  formatCompactCount,
  formatDuration,
  formatRelativeDate,
  formatScoreMultiplier,
} from "@/utils/format";
import type { TrendingCard } from "./types";

/** Frase didática do ranking do vídeo vs. os recentes do canal (F1). */
function recentRankLabel(
  rank: { beaten: number; of: number },
  isShort: boolean,
): string {
  const recentes = isShort ? "shorts" : "vídeos longos";
  if (rank.beaten === rank.of) {
    return `Melhor que os últimos ${rank.of} ${recentes} do canal`;
  }
  if (rank.beaten === 0) {
    return `Ainda atrás dos últimos ${rank.of} ${recentes} do canal`;
  }
  return `Melhor que ${rank.beaten} dos últimos ${rank.of} ${recentes} do canal`;
}

/**
 * Card da aba Trending (Pré-M9 T2): views + idade em destaque no lugar
 * do score, com selo didático — vídeo novo ainda não tem score justo
 * porque a régua da mediana exige 14 dias (doc 3 §3.6). A aba separa
 * longos e shorts em seções (F2); o card ganha selo "SHORT" quando for
 * short. Quando o vídeo JÁ superou a mediana, mostra o score parcial
 * (piso honesto: views só crescem — T2b) e, quando há base, a posição
 * dele entre os últimos vídeos do mesmo formato do canal (F1). Estilo
 * de contorno, nunca os preenchimentos dos tiers de score fechado.
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
            {card.partialScore !== null ? (
              <span className="inline-flex items-center gap-xxxs border border-ink px-xxs py-xxxs text-caption-upper uppercase tabular-nums text-ink">
                já {formatScoreMultiplier(card.partialScore)} ↗
              </span>
            ) : (
              <span className="inline-flex items-center border border-hairline px-xxs py-xxxs text-caption-upper uppercase text-muted-soft">
                sem score ainda
              </span>
            )}
          </span>
        </div>
        <p className="text-title-sm tabular-nums text-ink">
          {card.viewCount !== null
            ? `${formatCompactCount(card.viewCount)} views`
            : "views indisponíveis"}
          {card.publishedAt &&
            ` · ${formatRelativeDate(new Date(card.publishedAt))}`}
          {card.isShort && (
            <span className="ml-xxs rounded-xs border border-ink px-[4px] text-caption-upper font-medium uppercase text-ink">
              short
            </span>
          )}
        </p>
        {card.recentRank && (
          <p className="text-body-sm text-ink">
            <span className="tabular-nums">
              ↑ {card.recentRank.beaten}/{card.recentRank.of}
            </span>{" "}
            {recentRankLabel(card.recentRank, card.isShort)}
          </p>
        )}
        <p className="truncate text-body-sm text-body">
          {card.channelTitle}
          {card.channelSubscribers !== null &&
            ` · ${formatCompactCount(card.channelSubscribers)} inscritos`}
        </p>
        <p className="text-caption text-muted">
          {card.recentRank
            ? "Comparado com os últimos vídeos do mesmo formato do canal (publicados antes deste, então já tiveram mais tempo de views). "
            : ""}
          {card.partialScore !== null
            ? `Score parcial: já fez ${formatScoreMultiplier(card.partialScore)} a mediana do canal e as views ainda crescem — o score fecha aos 14 dias e daqui só sobe.`
            : "Novo demais para um score justo — a comparação com a mediana do canal só vale após 14 dias de vida."}
        </p>
      </div>
    </a>
  );
}
