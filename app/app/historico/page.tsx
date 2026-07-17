import Link from "next/link";
import {
  WeeklyActivity,
  type WeekBucket,
} from "@/features/history/WeeklyActivity";
import { createClient } from "@/lib/supabase/server";
import { formatCompactCount } from "@/utils/format";

export const metadata = { title: "Histórico" };

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

export default async function HistoricoPage() {
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

  const [{ data: searches }, { data: recent }, { count: favoritesCount }] =
    await Promise.all([
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
    ]);

  // Oportunidades por pesquisa (materializadas pelo pipeline; RLS por dono)
  const recentIds = (recent ?? []).map((s) => s.id);
  const oppBySearch = new Map<string, number>();
  if (recentIds.length > 0) {
    const { data: results } = await supabase
      .from("search_results")
      .select("search_id, opportunities")
      .in("search_id", recentIds);
    for (const row of results ?? []) {
      oppBySearch.set(
        row.search_id,
        (oppBySearch.get(row.search_id) ?? 0) + (row.opportunities ?? 0),
      );
    }
  }

  const weeks: WeekBucket[] = Array.from({ length: WEEKS }, (_, i) => ({
    label: shortDate(new Date(firstWeekStart.getTime() + i * WEEK_MS)),
    searches: 0,
    opportunities: 0,
  }));
  let searchesThisMonth = 0;
  let opportunitiesThisMonth = 0;
  for (const search of recent ?? []) {
    const created = new Date(search.created_at);
    const index = Math.floor(
      (created.getTime() - firstWeekStart.getTime()) / WEEK_MS,
    );
    if (index >= 0 && index < WEEKS) {
      weeks[index].searches += 1;
      weeks[index].opportunities += oppBySearch.get(search.id) ?? 0;
    }
    if (created >= monthStart) {
      searchesThisMonth += 1;
      opportunitiesThisMonth += oppBySearch.get(search.id) ?? 0;
    }
  }

  const monthLabel = now.toLocaleDateString("pt-BR", {
    month: "long",
    timeZone: "UTC",
  });
  const tiles = [
    {
      label: "Pesquisas no mês",
      value: searchesThisMonth,
      caption: `em ${monthLabel}`,
    },
    {
      label: "Oportunidades encontradas",
      value: opportunitiesThisMonth,
      caption: "nas pesquisas do mês",
    },
    {
      label: "Favoritos na pauta",
      value: favoritesCount ?? 0,
      caption: "total acumulado",
    },
  ];

  const hasSearches = searches !== null && searches.length > 0;

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-md pt-xl">
      <h1 className="font-display text-display-lg text-ink">Histórico</h1>

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
          <div className="grid grid-cols-1 gap-xxs sm:grid-cols-3">
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className="flex flex-col gap-xxxs rounded-md border border-hairline p-xs"
              >
                <span className="text-caption text-muted-soft">
                  {tile.label}
                </span>
                <span className="text-display-md text-ink">
                  {formatCompactCount(tile.value)}
                </span>
                <span className="text-caption text-muted">{tile.caption}</span>
              </div>
            ))}
          </div>

          <WeeklyActivity weeks={weeks} />

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
                      <p className="truncate text-body-md text-ink">{label}</p>
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
        </>
      )}
    </div>
  );
}
