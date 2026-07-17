/**
 * Faixas de score do Dashboard (M10.5, lote B4 — print 04): barras
 * horizontais 3–10× / 10–30× / 30×+. O vermelho é reservado à faixa
 * 30×+, como no ScoreBadge (acento escasso do design system).
 */
export function ScoreBands({
  low,
  mid,
  high,
}: {
  low: number;
  mid: number;
  high: number;
}) {
  const rows = [
    { label: "3–10×", value: low, color: "bg-muted" },
    { label: "10–30×", value: mid, color: "bg-muted-soft" },
    { label: "30×+", value: high, color: "bg-primary" },
  ];
  const max = Math.max(low, mid, high, 1);

  return (
    <section
      aria-label="Oportunidades por faixa de score, últimas 8 semanas"
      className="flex flex-col gap-xs rounded-md border border-hairline p-sm"
    >
      <h2 className="text-title-sm text-ink">Faixas de score</h2>
      <div className="flex flex-col gap-xxs">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-xxs">
            <span className="w-[52px] shrink-0 text-body-sm tabular-nums text-body">
              {row.label}
            </span>
            <div className="h-[8px] flex-1 overflow-hidden rounded-full bg-canvas-elevated/50">
              <div
                className={`h-full rounded-full ${row.color}`}
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </div>
            <span className="w-[40px] shrink-0 text-right text-body-sm tabular-nums text-ink">
              {row.value}
            </span>
          </div>
        ))}
      </div>
      <p className="text-caption text-muted">últimas 8 semanas</p>
    </section>
  );
}
