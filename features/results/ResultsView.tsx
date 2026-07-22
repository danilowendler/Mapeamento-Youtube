"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { TRENDING_WINDOW_DAYS } from "@/services/freshness";
import { formatRelativeDate } from "@/utils/format";
import { ChannelOverview } from "./ChannelOverview";
import { TrendingVideoCard } from "./TrendingVideoCard";
import { VideoCard } from "./VideoCard";
import type {
  ChannelSummary,
  OpportunityCard,
  TrendingCard,
} from "./types";

type SortKey = "score" | "views" | "date" | "subs";

const DAY_MS = 24 * 60 * 60 * 1000;

const SUBS_RANGES: Record<string, (subs: number | null) => boolean> = {
  todos: () => true,
  "ate-10k": (s) => s !== null && s < 10_000,
  "10k-100k": (s) => s !== null && s >= 10_000 && s < 100_000,
  "100k-1m": (s) => s !== null && s >= 100_000 && s < 1_000_000,
  "1m-mais": (s) => s !== null && s >= 1_000_000,
};

/** Balde do filtro de país para canais sem country autodeclarado. */
const COUNTRY_UNKNOWN = "sem";

const regionNamesPtBr = new Intl.DisplayNames(["pt-BR"], {
  type: "region",
  fallback: "code",
});

/** Nome pt-BR do país (Intl.DisplayNames); código cru se inválido. */
function countryNameOf(code: string): string {
  try {
    return regionNamesPtBr.of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * Resultados com filtros e ordenação client-side, estado na URL
 * (compartilhável — doc 6 §6.4). Formatos nunca se misturam: nas abas
 * de score cada aba é um formato, e a aba Trending (Pré-M9 T2) separa
 * longos e shorts em duas seções (F2). Na Trending não há ranking por
 * score — só recência × views + posição vs. recentes do canal (F1) —
 * por isso os filtros de score/idade somem ali.
 */
export function ResultsView({
  cards,
  trending = [],
  channels = [],
  countries = [],
  collecting = false,
  oldestRefreshedAt = null,
  favoritedIds = [],
  savedChannelIds = [],
  searchId,
}: {
  cards: OpportunityCard[];
  trending?: TrendingCard[];
  /** Canais analisados, para a aba "Canais" (visão geral). */
  channels?: ChannelSummary[];
  /** Países declarados pelos canais analisados da pesquisa (ISO). */
  countries?: string[];
  /** Coleta em andamento — troca os estados vazios por "coletando…". */
  collecting?: boolean;
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
    formatParam === "short" ||
    formatParam === "trending" ||
    formatParam === "canais"
      ? formatParam
      : "long";
  const isTrending = format === "trending";
  const isCanais = format === "canais";
  // URL limpa = piso de exibição 1.5× (Pré-M9 T1)
  const minScore = Number(params.get("s") ?? 1.5);
  const maxAgeMonths = Number(params.get("i") ?? 0); // 0 = todas
  const subsRange = params.get("t") ?? "todos";
  const country = params.get("p") ?? "todos"; // ISO, "sem" ou "todos"
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

  // Países dos CANAIS ANALISADOS da pesquisa (T3b — não dos cards
  // visíveis: canal sem oportunidade ainda conta), nomeados em pt-BR.
  // country é autodeclarado no YouTube e frequentemente vazio (T3).
  const countryOptions = useMemo(
    () =>
      [...new Set(countries)]
        .map((code) => ({ code, name: countryNameOf(code) }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [countries],
  );

  const matchesCountry = useCallback(
    (channelCountry: string | null) => {
      if (country === "todos") return true;
      if (country === COUNTRY_UNKNOWN) return channelCountry === null;
      return channelCountry === country;
    },
    [country],
  );

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
      if (!matchesCountry(card.channelCountry)) return false;
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
  }, [
    cards,
    format,
    isTrending,
    minScore,
    maxAgeMonths,
    subsRange,
    matchesCountry,
    sort,
    now,
  ]);

  const trendingVisible = useMemo(() => {
    if (!isTrending) return [];
    const inRange = SUBS_RANGES[subsRange] ?? SUBS_RANGES.todos;
    const filtered = trending.filter(
      (card) =>
        inRange(card.channelSubscribers) &&
        matchesCountry(card.channelCountry),
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
  }, [isTrending, trending, subsRange, matchesCountry, sort]);

  // F2: shorts e longos nunca se misturam (regra do projeto) — a Trending
  // agora separa em duas seções, cada uma já filtrada e ordenada acima.
  const trendingLongs = useMemo(
    () => trendingVisible.filter((card) => !card.isShort),
    [trendingVisible],
  );
  const trendingShorts = useMemo(
    () => trendingVisible.filter((card) => card.isShort),
    [trendingVisible],
  );

  // Trending vazia por análise VELHA (coleta > 7 d) é diferente de
  // "os canais não postaram": só a primeira tem conserto (reanalisar).
  const trendingIsStale =
    !collecting &&
    oldestRefreshedAt !== null &&
    (now - new Date(oldestRefreshedAt).getTime()) / DAY_MS >
      TRENDING_WINDOW_DAYS;

  const selectClass =
    "h-[36px] cursor-pointer rounded-sm border border-hairline bg-canvas px-xxs text-body-sm text-ink";

  return (
    <div className="flex flex-col gap-sm">
      <div role="tablist" className="flex flex-wrap border-b border-hairline">
        {(
          [
            { key: "long", label: `Vídeos longos (${longs.length})` },
            { key: "short", label: `Shorts (${shorts.length})` },
            {
              key: "trending",
              label: `Trending (${trending.length})`,
              hot: true,
            },
            { key: "canais", label: `Canais (${channels.length})` },
          ] as const
        ).map((tab) => {
          const active = format === tab.key;
          const hot = "hot" in tab && tab.hot;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active}
              onClick={() => setParam("f", tab.key === "long" ? null : tab.key)}
              className={`flex cursor-pointer items-center gap-xxxs px-xs py-xxs text-nav-link uppercase transition-colors ${
                active
                  ? `border-b-2 text-ink ${hot ? "border-primary" : "border-ink"}`
                  : "text-muted-soft hover:text-body"
              }`}
            >
              {hot && (
                <span
                  aria-hidden="true"
                  className="h-[6px] w-[6px] shrink-0 rounded-full bg-primary"
                />
              )}
              {tab.label}
            </button>
          );
        })}
      </div>

      {!isCanais && (
        <>
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
        {/* Sem país declarado, o select só teria "Todos" + "Não informado"
            (ambos = tudo) — inútil; some. Com ≥ 1 país, ainda ajuda. */}
        {countryOptions.length > 0 && (
          <label className="flex items-center gap-xxxs text-body-sm text-body">
            País
            <select
              className={selectClass}
              value={country}
              onChange={(e) =>
                setParam("p", e.target.value === "todos" ? null : e.target.value)
              }
            >
              <option value="todos">Todos</option>
              {countryOptions.map(({ code, name }) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
              <option value={COUNTRY_UNKNOWN}>Não informado</option>
            </select>
          </label>
        )}
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

      {country !== "todos" && (
        <p className="text-caption text-muted">
          O país é autodeclarado pelo canal no YouTube e muitos canais não
          preenchem — esses ficam em “Não informado”, não somem da pesquisa.
        </p>
      )}
        </>
      )}

      {isCanais ? (
        <ChannelOverview channels={channels} />
      ) : isTrending ? (
        trendingVisible.length === 0 ? (
          collecting ? (
            <p className="rounded-md border border-dashed border-hairline p-sm text-body-md text-body">
              Coletando… os lançamentos recentes aparecem conforme os canais
              ficam prontos.
            </p>
          ) : trendingIsStale ? (
            <div className="flex flex-col items-start gap-xs rounded-md border border-dashed border-hairline p-sm">
              <p className="text-body-md text-body">
                Esta análise foi feita
                {oldestRefreshedAt
                  ? ` ${formatRelativeDate(new Date(oldestRefreshedAt))}`
                  : " há um tempo"}{" "}
                — por isso a Trending ainda não mostra o que estes canais
                publicaram nos últimos 7 dias. Rode uma nova análise para
                atualizar.
              </p>
              <Link
                href="/app"
                className="inline-flex h-[36px] items-center rounded-sm border border-ink px-xs text-caption-upper uppercase text-ink transition-colors hover:bg-canvas-elevated/30"
              >
                Reanalisar em uma nova pesquisa
              </Link>
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-hairline p-sm text-body-md text-body">
              {`Nenhum vídeo publicado nos últimos 7 dias pelos canais desta pesquisa${subsRange !== "todos" ? " com o filtro de canal atual" : ""}. A Trending mostra o que está saindo agora, antes mesmo de ter score.`}
            </p>
          )
        ) : (
          <div className="flex flex-col gap-sm">
            {(
              [
                { label: "Vídeos longos", items: trendingLongs },
                { label: "Shorts", items: trendingShorts },
              ] as const
            ).map((section) =>
              section.items.length === 0 ? null : (
                <section key={section.label} className="flex flex-col gap-xs">
                  <h3 className="text-caption-upper uppercase text-muted-soft">
                    {section.label} ({section.items.length})
                  </h3>
                  <ul className="flex flex-col gap-xs">
                    {section.items.map((card) => (
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
                </section>
              ),
            )}
          </div>
        )
      ) : visible.length === 0 ? (
        <p className="rounded-md border border-dashed border-hairline p-sm text-body-md text-body">
          {collecting
            ? "Coletando… os vídeos aparecem conforme os canais ficam prontos."
            : cards.length === 0
              ? "Nenhum vídeo com pelo menos 1,5× a mediana do próprio canal — os vídeos destes canais performam de forma uniforme. Veja os canais analisados na aba Canais."
              : "Nenhum vídeo neste formato com os filtros atuais — ajuste o score mínimo ou os demais filtros."}
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
