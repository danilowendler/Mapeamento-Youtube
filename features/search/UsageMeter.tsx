type Usage = { used: number; limit: number; periodEnd: string };

/**
 * Contador de uso sempre visível (doc 6 §6.3): transparência
 * antecipa o limite sem emboscada.
 */
export function UsageMeter({ usage }: { usage: Usage }) {
  const pct =
    usage.limit > 0 ? Math.min((usage.used / usage.limit) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-xs">
      <div className="h-[3px] max-w-[160px] flex-1 bg-canvas-elevated">
        <div
          className={`h-full ${pct >= 100 ? "bg-warning" : "bg-ink"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-body-sm tabular-nums text-body">
        {usage.used} de {usage.limit} pesquisas neste mês
      </span>
    </div>
  );
}
