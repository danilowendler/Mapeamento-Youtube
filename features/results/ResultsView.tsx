"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { formatRelativeDate } from "@/utils/format";
import { TrendingVideoCard } from "./TrendingVideoCard";
import { VideoCard } from "./VideoCard";
import type { OpportunityCard, TrendingCard } from "./types";

type SortKey = "score" | "views" | "date" | "subs";

const DAY_MS = 24 * 60 * 60 * 1000;

const SUBS_RANGES: Record<string, (subs: number | null) => boolean> = {
  todos: () => true,
  "ate-10k": (s) => s !== null && s < 10_000,
  "10k-100k": (s) => s !== null && s >= 10_000 && s < 100_000,
  "100k-1m": (s) => s !== null && s >= 100_000 && s < 1_000_000,
  "1m-mais": (s) => s !== null && s >= 1_000_000,
};

/**
 * Resultados com filtros e ordenação client-side, estado na URL
 * (compartilhável — doc 6 §6.4). Formatos nunca se misturam nas abas
 * de score; a aba Trending (Pré-M9 T2) mistura de propósito — não há
 * ranking por score ali, só recência × views — e por isso o formato
 * vira etiqueta no card e os filtros de score/idade somem.
 */
export function ResultsView({
  cards,
  trending = [],
  oldestRefreshedAt = null,
  favoritedIds = [],
  savedChannelIds = [],
  searchId,
}: {
  cards: OpportunityCard[];
  trending?: TrendingCard[];
  oldestRefreshedAt?: string | null;
  favoritedIds?: string[];
  savedChannelIds?: string[];
  searchId?: string;
}) {
  const favoritedSet = useMemo(() => new Set(favoritedIds), [favoritedIds]);
  const savedChannelSet = useMemo(
    () => new Set(savedChannelIds),
    [savedChannelIds],
  );
  const router = useRouter();
  const params = useSearchParams();

  const formatParam = params.get("f");
  const format =
    formatParam === "short" || formatParam === "trending"
      ? formatParam
      : "long";
  const isTrending = format === "trending";
  // URL limpa = piso de exibição 1.5× (Pré-M9 T1)
  const minScore = Number(params.get("s") ?? 1.5);
  const maxAgeMonths = Number(params.get("i") ?? 0); // 0 = todas
  const subsRange = params.get("t") ?? "todos";
  const sortParam = (params.get("o") ?? "score") as SortKey;
  // Trending não tem score: o default (e qualquer o=score) vira views
  const sort: SortKey =
    isTrending && sortParam === "score" ? "views" : sortParam;

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  // Referência de "agora" fixada na montagem (regra de pureza do
  // compiler; o filtro de idade não precisa de relógio vivo)
  const [now] = useState(() => Date.now());

  const { longs, shorts, visible } = useMemo(() => {
    const longs = cards.filter((card) => !card.isShort);
    const shorts = cards.filter((card) => card.isShort);
    if (isTrending) return { longs, shorts, visible: [] };
    const pool = format === "long" ? longs : shorts;

    const filtered = pool.filter((card) => {
      if (card.score < minScore) return false;
      if (maxAgeMonths > 0) {
        if (!card.publishedAt) return false;
        const ageMonths =
          (now - new Date(card.publishedAt).getTime()) / (30 * DAY_MS);
        if (ageMonths > maxAgeMonths) return false;
      }
      const inRange = SUBS_RANGES[subsRange] ?? SUBS_RANGES.todos;
      return inRange(card.channelSubscribers);
    });

    filtered.sort((a, b) => {
      switch (sort) {
        case "views":
          return (b.viewCount ?? 0) - (a.viewCount ?? 0);
        case "date":
          return (
            new Date(b.publishedAt ?? 0).getTime() -
            new Date(a.publishedAt ?? 0).getTime()
          );
        case "subs":
          return (b.channelSubscribers ?? 0) - (a.channelSubscribers ?? 0);
        default:
          return b.score - a.score;
      }
    });

    return { longs, shorts, visible: filtered };
  }, [cards, format, isTrending, minScore, maxAgeMonths, subsRange, sort, now]);

  const trendingVisible = useMemo(() => {
    if (!isTrending) return [];
    const inRange = SUBS_RANGES[subsRange] ?? SUBS_RANGES.todos;
    const filtered = trending.filter((card) =>
      inRange(card.channelSubscribers),
    );
    filtered.sort((a, b) => {
      switch (sort) {
        case "date":
          return (
            new Date(b.publishedAt ?? 0).getTime() -
            new Date(a.publishedAt ?? 0).getTime()
          );
        case "subs":
          return (b.channelSubscribers ?? 0) - (a.channelSubscribers ?? 0);
        default:
          return (b.viewCount ?? 0) - (a.viewCount ?? 0);
      }
    });
    return filtered;
  }, [isTrending, trending, subsRange, sort]);

  const selectClass =
    "h-[36px] cursor-pointer rounded-sm border border-hairline bg-canvas px-xxs text-body-sm text-ink";

  return (
    <div className="flex flex-col gap-sm">
      <div role="tablist" className="flex border-b border-hairline">
        {(
          [
            { key: "long", label: `Vídeos longos (${longs.length})` },
            { key: "short", label: `Shorts (${shorts.length})` },
            { key: "trending", label: `Trending (${trending.length})` },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={format === key}
            onClick={() => setParam("f", key === "long" ? null : key)}
            className={`cursor-pointer px-xs py-xxs text-nav-link uppercase transition-colors ${
              format === key
                ? "border-b-2 border-ink text-ink"
                : "text-muted-soft hover:text-body"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-xxs">
        {!isTrending && (
          <>
            <label className="flex items-center gap-xxxs text-body-sm text-body">
              Score
              <select
                className={selectClass}
                value={String(minScore)}
                onChange={(e) =>
                  setParam("s", e.target.value === "1.5" ? null : e.target.value)
                }
              >
                <option value="1.5">≥ 1,5×</option>
                <option value="3">≥ 3×</option>
                <option value="10">≥ 10×</option>
                <option value="30">≥ 30×</option>
              </select>
            </label>
            <label className="flex items-center gap-xxxs text-body-sm text-body">
              Idade
              <select
                className={selectClass}
                value={String(maxAgeMonths)}
                onChange={(e) =>
                  setParam("i", e.target.value === "0" ? null : e.target.value)
                }
              >
                <option value="0">Todas</option>
                <option value="3">Até 3 meses</option>
                <option value="12">Até 1 ano</option>
              </select>
            </label>
          </>
        )}
        <label className="flex items-center gap-xxxs text-body-sm text-body">
          Canal
          <select
            className={selectClass}
            value={subsRange}
            onChange={(e) =>
              setParam("t", e.target.value === "todos" ? null : e.target.value)
            }
          >
            <option value="todos">Todos</option>
            <option value="ate-10k">Até 10 mil</option>
            <option value="10k-100k">10–100 mil</option>
            <option value="100k-1m">100 mil–1 mi</option>
            <option value="1m-mais">1 mi+</option>
          </select>
        </label>
        <label className="ml-auto flex items-center gap-xxxs text-body-sm text-body">
          Ordenar
          <select
            className={selectClass}
            value={sort}
            onChange={(e) =>
              setParam("o", e.target.value === "score" ? null : e.target.value)
            }
          >
            {isTrending ? (
              <option value="views">Views</option>
            ) : (
              <>
                <option value="score">Score</option>
                <option value="views">Views</option>
              </>
            )}
            <option value="date">Mais recentes</option>
            <option value="subs">Tamanho do canal</option>
          </select>
        </label>
      </div>

      {isTrending ? (
        trendingVisible.length === 0 ? (
          <p className="rounded-md border border-dashed border-hairline p-sm text-body-md text-body">
            Nenhum vídeo publicado nos últimos 7 dias pelos canais desta
            pesquisa{subsRange !== "todos" ? " com o filtro de canal atual" : ""}
            . A Trending mostra o que está saindo agora, antes mesmo de ter
            score.
          </p>
        ) : (
          <ul className="flex flex-col gap-xs">
            {trendingVisible.map((card) => (
              <li key={card.videoId}>
                <TrendingVideoCard
                  card={card}
                  favorited={favoritedSet.has(card.videoId)}
                  channelSaved={savedChannelSet.has(card.channelId)}
                  searchId={searchId}
                />
              </li>
            ))}
          </ul>
        )
      ) : visible.length === 0 ? (
        <p className="rounded-md border border-dashed border-hairline p-sm text-body-md text-body">
          Nenhum vídeo neste formato com os filtros atuais — ajuste o score
          mínimo ou os demais filtros.
        </p>
      ) : (
        <ul className="flex flex-col gap-xs">
          {visible.map((card) => (
            <li key={card.videoId}>
              <VideoCard
                card={card}
                favorited={favoritedSet.has(card.videoId)}
                channelSaved={savedChannelSet.has(card.channelId)}
                searchId={searchId}
              />
            </li>
          ))}
        </ul>
      )}

      {isTrending && (
        <p className="text-caption text-muted">
          Números da última análise
          {oldestRefreshedAt &&
            ` (${formatRelativeDate(new Date(oldestRefreshedAt))})`}
          {" "}— vídeos novos crescem rápido, então as views no YouTube já
          podem estar maiores.
        </p>
      )}
    </div>
  );
}
