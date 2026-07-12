/**
 * Diagramas dos 3 passos do "como funciona" — mesma linguagem
 * visual do produto (renderizados em código, nunca fotos).
 */

/** Passo 1: o campo de entrada com nichos — a porta do produto. */
export function StepInputDiagram() {
  return (
    <div
      aria-hidden="true"
      className="flex h-[180px] flex-col justify-center gap-xs border border-hairline bg-technical-grid p-sm"
    >
      <div className="flex h-[44px] items-center border border-hairline bg-canvas px-xs">
        <span className="text-body-md text-muted">
          finanças pessoais<span className="animate-pulse text-ink">▏</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-xxs">
        {["Finanças", "Games", "Fitness", "Culinária"].map((niche) => (
          <span
            key={niche}
            className="border border-hairline px-xxs py-xxxs text-caption-upper uppercase text-body"
          >
            {niche}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Passo 2: a varredura — barras sendo medidas contra a mediana. */
export function StepScanDiagram() {
  const rows = [34, 78, 41, 55, 38, 62];
  return (
    <div
      aria-hidden="true"
      className="relative flex h-[180px] flex-col justify-center gap-xxs overflow-hidden border border-hairline bg-technical-grid p-sm"
    >
      {rows.map((width, index) => (
        <div key={index} className="relative h-[14px] bg-canvas">
          <div
            className="h-full bg-canvas-elevated"
            style={{ width: `${width}%` }}
          />
        </div>
      ))}
      {/* Linha de mediana vertical + varredura viva */}
      <div className="absolute inset-y-sm left-[52%] border-l border-dashed border-muted/70" />
      <div className="absolute inset-y-0 w-1/4 animate-progress-sweep bg-ink/5" />
    </div>
  );
}

/** Passo 3: a oportunidade encontrada — o card com o porquê. */
export function StepCardDiagram() {
  return (
    <div
      aria-hidden="true"
      className="flex h-[180px] items-center border border-hairline bg-technical-grid p-sm"
    >
      <div className="flex w-full items-start gap-xs border border-hairline bg-canvas p-xs">
        <div className="flex h-[52px] w-[88px] shrink-0 items-center justify-center bg-canvas-elevated text-caption text-muted">
          16:9
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-xxxs">
          <div className="flex items-start justify-between gap-xs">
            <span className="text-title-sm text-ink">
              O tema que furou a bolha
            </span>
            <span className="bg-primary px-xxs text-title-sm tabular-nums text-on-primary">
              54×
            </span>
          </div>
          <span className="text-caption text-muted">
            25,9 mi views vs. mediana de 481 mil do canal
          </span>
          <span className="text-caption text-focus-ring">★ salvo na pauta</span>
        </div>
      </div>
    </div>
  );
}
