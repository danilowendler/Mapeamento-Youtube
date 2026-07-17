/**
 * Split de formatos do Dashboard (M10.5, lote B4 — print 04): longos
 * vs shorts entre as oportunidades encontradas. Duas categorias:
 * azul dataviz + cinza, com gap de 2px entre os segmentos e rótulos
 * diretos (sem depender de cor).
 */
export function FormatSplit({
  long,
  short,
}: {
  long: number;
  short: number;
}) {
  const total = long + short;
  const pct = (value: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <section
      aria-label="Oportunidades por formato, últimas 8 semanas"
      className="flex flex-col gap-xs rounded-md border border-hairline p-sm"
    >
      <h2 className="text-title-sm text-ink">Formatos</h2>

      {total === 0 ? (
        <p className="text-body-sm text-body">
          Sem oportunidades no período.
        </p>
      ) : (
        <>
          <div className="flex h-[8px] gap-[2px] overflow-hidden rounded-full">
            <div
              className="rounded-full bg-data-series"
              style={{ width: `${(long / total) * 100}%` }}
            />
            <div
              className="rounded-full bg-muted-soft"
              style={{ width: `${(short / total) * 100}%` }}
            />
          </div>
          <div className="flex flex-col gap-xxxs">
            <p className="flex items-center gap-xxs text-body-sm text-body">
              <span
                aria-hidden="true"
                className="h-[8px] w-[8px] shrink-0 rounded-full bg-data-series"
              />
              Vídeos longos
              <span className="ml-auto tabular-nums text-ink">
                {long} · {pct(long)}%
              </span>
            </p>
            <p className="flex items-center gap-xxs text-body-sm text-body">
              <span
                aria-hidden="true"
                className="h-[8px] w-[8px] shrink-0 rounded-full bg-muted-soft"
              />
              Shorts
              <span className="ml-auto tabular-nums text-ink">
                {short} · {pct(short)}%
              </span>
            </p>
          </div>
        </>
      )}
      <p className="text-caption text-muted">últimas 8 semanas</p>
    </section>
  );
}
