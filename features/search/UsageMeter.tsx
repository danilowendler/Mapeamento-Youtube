type Usage = { used: number; limit: number; periodEnd: string };

/**
 * Contador de uso sempre visível (doc 6 §6.3): transparência
 * antecipa o limite sem emboscada.
 */
export function UsageMeter({ usage }: { usage: Usage }) {
  const pct =
    usage.limit > 0 ? Math.min((usage.used / usage.limit) * 100, 100) : 0;

  return (
    <div className="flex items-center justify-between gap-xs border border-hairline px-xs py-xxs">
      <span className="text-caption-upper uppercase tracking-widest text-muted-soft">
        Pesquisas no mês
      </span>
      <div className="flex items-center gap-xs">
        <div className="h-[3px] w-[120px] bg-canvas-elevated">
          <div
            className={`h-full transition-all duration-500 ${
              pct >= 100 ? "bg-warning" : "bg-ink"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-body-sm tabular-nums text-body">
          <span className="text-ink">{usage.used}</span> / {usage.limit}
        </span>
      </div>
    </div>
  );
}
