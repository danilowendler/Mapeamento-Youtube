export type WeekBucket = {
  /** Início da semana (segunda), formatado "dd/mm". */
  label: string;
  searches: number;
  opportunities: number;
};

/**
 * Gráfico de barras do mini-dashboard do Histórico (M10, lote 3).
 * Pesquisas e oportunidades têm escalas muito diferentes, então nunca
 * dividem um eixo (regra dataviz: eixo duplo é proibido) — são dois
 * painéis compactos com escala própria e a mesma linha de semanas.
 * Server component: tooltips por CSS (hover/focus), sem JS no cliente.
 */
export function WeeklyActivity({ weeks }: { weeks: WeekBucket[] }) {
  return (
    <section
      aria-label="Atividade das últimas 8 semanas"
      className="flex flex-col gap-sm border border-hairline p-sm"
    >
      <h2 className="text-caption-upper uppercase text-muted-soft">
        Atividade · últimas 8 semanas
      </h2>

      <Panel
        title="Pesquisas"
        values={weeks.map((w) => w.searches)}
        labels={weeks.map((w) => w.label)}
        unit={["pesquisa", "pesquisas"]}
      />
      <Panel
        title="Oportunidades encontradas"
        values={weeks.map((w) => w.opportunities)}
        labels={weeks.map((w) => w.label)}
        unit={["oportunidade", "oportunidades"]}
      />

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
        <caption>Pesquisas e oportunidades por semana</caption>
        <thead>
          <tr>
            <th scope="col">Semana</th>
            <th scope="col">Pesquisas</th>
            <th scope="col">Oportunidades</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.label}>
              <th scope="row">{week.label}</th>
              <td>{week.searches}</td>
              <td>{week.opportunities}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

const PANEL_HEIGHT = 72;
const BAR_MAX = 52;

function Panel({
  title,
  values,
  labels,
  unit,
}: {
  title: string;
  values: number[];
  labels: string[];
  unit: [string, string];
}) {
  const max = Math.max(...values, 1);
  const peak = Math.max(...values);

  return (
    <div className="flex flex-col gap-xxs">
      <p className="text-caption text-muted-soft">{title}</p>
      <div
        className="grid grid-cols-8 items-end gap-xxs border-b border-hairline"
        style={{ height: PANEL_HEIGHT }}
      >
        {values.map((value, i) => {
          const height =
            value > 0 ? Math.max(Math.round((value / max) * BAR_MAX), 3) : 0;
          const isPeak = value === peak && value > 0;
          return (
            <button
              key={labels[i]}
              type="button"
              tabIndex={0}
              aria-label={`Semana de ${labels[i]}: ${value} ${
                value === 1 ? unit[0] : unit[1]
              }`}
              className="group relative flex h-full cursor-default items-end justify-center"
            >
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-xxxs hidden -translate-x-1/2 whitespace-nowrap border border-hairline bg-canvas-elevated px-xxs py-xxxs text-caption group-hover:block group-focus-within:block"
              >
                <strong className="font-semibold text-ink">{value}</strong>{" "}
                <span className="text-body">
                  {value === 1 ? unit[0] : unit[1]} · sem. {labels[i]}
                </span>
              </span>

              {/* Rótulo direto seletivo: só o pico da série */}
              {isPeak && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-caption text-body"
                  style={{ bottom: height + 4 }}
                >
                  {value}
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
    </div>
  );
}
