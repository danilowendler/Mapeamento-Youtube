import Link from "next/link";
import { FormatSplit } from "@/features/history/FormatSplit";
import { ScoreBands } from "@/features/history/ScoreBands";
import {
  WeeklyOpportunities,
  type WeekPoint,
} from "@/features/history/WeeklyOpportunities";
import { createClient } from "@/lib/supabase/server";
import { formatCompactCount, formatScoreMultiplier } from "@/utils/format";

export const metadata = { title: "Dashboard" };

const STATUS: Record<string, { label: string; dot: string }> = {
  queued: { label: "Na fila", dot: "bg-muted" },
  running: { label: "Analisando…", dot: "animate-pulse bg-info" },
  completed: { label: "Concluída", dot: "bg-success" },
  partial: { label: "Parcial", dot: "bg-focus-ring" },
  failed: { label: "Falhou", dot: "bg-warning" },
};

const WEEKS = 8;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Segunda-feira (UTC) da semana da data. */
function mondayUtc(date: Date): Date {
  const day = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day;
}

function shortDate(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const firstWeekStart = new Date(
    mondayUtc(now).getTime() - (WEEKS - 1) * WEEK_MS,
  );
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const since = new Date(
    Math.min(firstWeekStart.getTime(), monthStart.getTime()),
  );

  const [
    { data: searches },
    { data: recent },
    { count: favoritesCount },
    { data: best },
  ] = await Promise.all([
    supabase
      .from("searches")
      .select("id, type, input, status, channels_total, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("searches")
      .select("id, created_at")
      .gte("created_at", since.toISOString()),
    supabase.from("favorites").select("*", { count: "exact", head: true }),
    supabase
      .from("search_results")
      .select("top_score")
      .not("top_score", "is", null)
      .order("top_score", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Contagens materializadas pelo pipeline (RLS por dono via searches)
  type ResultRow = {
    search_id: string;
    opportunities: number | null;
    opps_3_10: number | null;
    opps_10_30: number | null;
    opps_30_plus: number | null;
    opps_short: number | null;
    opps_long: number | null;
  };
  const recentIds = (recent ?? []).map((s) => s.id);
  const bySearch = new Map<string, ResultRow[]>();
  if (recentIds.length > 0) {
    const { data: results } = await supabase
      .from("search_results")
      .select(
        "search_id, opportunities, opps_3_10, opps_10_30, opps_30_plus, opps_short, opps_long",
      )
      .in("search_id", recentIds);
    for (const row of (results ?? []) as ResultRow[]) {
      const list = bySearch.get(row.search_id) ?? [];
      list.push(row);
      bySearch.set(row.search_id, list);
    }
  }

  const weeks: WeekPoint[] = Array.from({ length: WEEKS }, (_, i) => ({
    label: shortDate(new Date(firstWeekStart.getTime() + i * WEEK_MS)),
    value: 0,
  }));
  let searchesThisMonth = 0;
  let opportunitiesThisMonth = 0;
  const bands = { low: 0, mid: 0, high: 0, short: 0, long: 0 };

  for (const search of recent ?? []) {
    const created = new Date(search.created_at);
    const rows = bySearch.get(search.id) ?? [];
    const opps = rows.reduce((sum, r) => sum + (r.opportunities ?? 0), 0);

    const index = Math.floor(
      (created.getTime() - firstWeekStart.getTime()) / WEEK_MS,
    );
    if (index >= 0 && index < WEEKS) {
      weeks[index].value += opps;
      for (const r of rows) {
        bands.low += r.opps_3_10 ?? 0;
        bands.mid += r.opps_10_30 ?? 0;
        bands.high += r.opps_30_plus ?? 0;
        bands.short += r.opps_short ?? 0;
        bands.long += r.opps_long ?? 0;
      }
    }
    if (created >= monthStart) {
      searchesThisMonth += 1;
      opportunitiesThisMonth += opps;
    }
  }

  const monthLabel = now.toLocaleDateString("pt-BR", {
    month: "long",
    timeZone: "UTC",
  });
  const bestScore = best?.top_score !== null && best?.top_score !== undefined
    ? Number(best.top_score)
    : null;
  const tiles = [
    {
      label: "Pesquisas no mês",
      value: formatCompactCount(searchesThisMonth),
      caption: `em ${monthLabel}`,
    },
    {
      label: "Oportunidades",
      value: formatCompactCount(opportunitiesThisMonth),
      caption: "nas pesquisas do mês",
    },
    {
      label: "Favoritos",
      value: formatCompactCount(favoritesCount ?? 0),
      caption: "total no workspace",
    },
    {
      label: "Melhor score",
      value: bestScore !== null ? formatScoreMultiplier(bestScore) : "—",
      caption: "acima da mediana",
    },
  ];

  const hasSearches = searches !== null && searches.length > 0;

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-md pt-xl">
      <header className="flex flex-col gap-xxs">
        <h1 className="font-display text-display-lg uppercase text-ink">
          Dashboard
        </h1>
        <p className="text-body-md text-body">
          Desempenho das suas pesquisas — métricas, evolução e o histórico
          completo.
        </p>
      </header>

      {!hasSearches ? (
        <p className="rounded-md border border-dashed border-hairline p-sm text-body-md text-body">
          Nenhuma pesquisa ainda —{" "}
          <Link href="/app" className="text-ink underline">
            faça a primeira
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-xxs md:grid-cols-4">
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className="flex flex-col gap-xxxs rounded-md border border-hairline p-xs"
              >
                <span className="text-caption text-muted-soft">
                  {tile.label}
                </span>
                <span className="text-display-md font-bold tracking-[-0.5px] text-ink">
                  {tile.value}
                </span>
                <span className="text-caption text-muted">{tile.caption}</span>
              </div>
            ))}
          </div>

          <WeeklyOpportunities weeks={weeks} />

          <div className="grid grid-cols-1 gap-xxs md:grid-cols-2">
            <ScoreBands low={bands.low} mid={bands.mid} high={bands.high} />
            <FormatSplit long={bands.long} short={bands.short} />
          </div>

          <section
            aria-label="Histórico de pesquisas"
            className="flex flex-col gap-xs"
          >
            <h2 className="text-title-md text-ink">Histórico de pesquisas</h2>
            <ul className="flex flex-col">
              {searches.map((search) => {
                const input = search.input as {
                  channels?: string[];
                  keyword?: string;
                  nicheName?: string;
                };
                const label = input.nicheName
                  ? `Nicho: ${input.nicheName}`
                  : input.keyword
                    ? `“${input.keyword}”`
                    : `${(input.channels ?? []).slice(0, 3).join(", ")}${
                        (input.channels ?? []).length > 3
                          ? ` +${(input.channels ?? []).length - 3}`
                          : ""
                      }`;
                return (
                  <li key={search.id} className="border-b border-hairline">
                    <Link
                      href={`/app/pesquisas/${search.id}`}
                      className="flex items-center justify-between gap-xs py-xs transition-colors hover:bg-canvas-elevated/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-body-md text-ink">
                          {label}
                        </p>
                        <p className="text-body-sm text-muted-soft">
                          {new Date(search.created_at).toLocaleDateString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                          {" · "}
                          {search.channels_total}{" "}
                          {search.channels_total === 1 ? "canal" : "canais"}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-xxs text-caption-upper uppercase text-body">
                        <span
                          aria-hidden="true"
                          className={`h-[6px] w-[6px] rounded-full ${
                            (STATUS[search.status] ?? STATUS.queued).dot
                          }`}
                        />
                        {(STATUS[search.status] ?? STATUS.queued).label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
