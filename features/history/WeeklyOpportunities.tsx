export type WeekPoint = {
  /** Início da semana (segunda), formatado "dd/mm". */
  label: string;
  value: number;
};

const PLOT_HEIGHT = 132;
const BAR_MAX = 104;

/**
 * Gráfico do Dashboard (M10.5, lote B4 — print 04): oportunidades por
 * semana, série única em --color-data-series. Sem legenda (série
 * única: o título nomeia) e sem eixo Y — cada barra carrega o valor
 * no topo. Server component; tooltip por CSS em hover/focus.
 */
export function WeeklyOpportunities({ weeks }: { weeks: WeekPoint[] }) {
  const max = Math.max(...weeks.map((w) => w.value), 1);

  return (
    <section
      aria-label="Oportunidades por semana, últimas 8 semanas"
      className="flex flex-col gap-sm rounded-md border border-hairline p-sm"
    >
      <h2 className="text-title-md text-ink">Oportunidades por semana</h2>

      <div
        className="grid grid-cols-8 items-end gap-xxs border-b border-hairline"
        style={{ height: PLOT_HEIGHT }}
      >
        {weeks.map((week, i) => {
          const height =
            week.value > 0
              ? Math.max(Math.round((week.value / max) * BAR_MAX), 3)
              : 0;
          return (
            <button
              key={week.label}
              type="button"
              tabIndex={0}
              aria-label={`Semana de ${week.label}: ${week.value} ${
                week.value === 1 ? "oportunidade" : "oportunidades"
              }`}
              className="group relative flex h-full cursor-default items-end justify-center"
            >
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-xxxs hidden -translate-x-1/2 whitespace-nowrap rounded-sm border border-hairline bg-canvas-elevated px-xxs py-xxxs text-caption group-hover:block group-focus-within:block"
              >
                <strong className="font-semibold text-ink">{week.value}</strong>{" "}
                <span className="text-body">
                  {week.value === 1 ? "oportunidade" : "oportunidades"} · sem.{" "}
                  {week.label}
                </span>
              </span>

              {week.value > 0 && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-caption text-body"
                  style={{ bottom: height + 4 }}
                >
                  {week.value}
                </span>
              )}

              {height > 0 && (
                <span
                  aria-hidden="true"
                  className="animate-bar-rise w-full max-w-[24px] rounded-t-[4px] bg-data-series transition-[filter] group-hover:brightness-125"
                  style={{ height, animationDelay: `${i * 40}ms` }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-8 gap-xxs" aria-hidden="true">
        {weeks.map((week, i) => (
          <span
            key={week.label}
            className={`text-center text-caption text-muted ${
              i % 2 === 1 ? "hidden sm:block" : ""
            }`}
          >
            {week.label}
          </span>
        ))}
      </div>

      {/* Vista em tabela: os mesmos números, sem depender de hover */}
      <table className="sr-only">
        <caption>Oportunidades por semana</caption>
        <thead>
          <tr>
            <th scope="col">Semana</th>
            <th scope="col">Oportunidades</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.label}>
              <th scope="row">{week.label}</th>
              <td>{week.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
