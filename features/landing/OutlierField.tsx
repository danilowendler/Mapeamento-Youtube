import { CountUp } from "./CountUp";

/**
 * O visual-assinatura da marca: um campo de barras uniformes (o
 * "normal" de um canal) e UMA barra vermelha que rompe a escala —
 * a tese do produto renderizada em código. Dados do caso real do
 * corpus: canal com mediana de 7,8 mil views e um vídeo de 5,6 mi.
 *
 * Alturas determinísticas (nada de Math.random em render): ruído
 * controlado ao redor da mediana, como um canal de verdade.
 */
const NOISE = [
  26, 31, 24, 29, 33, 27, 25, 30, 28, 35, 26, 29, 32, 27, 24, 31, 28, 26,
  34, 29, 27, 25, 30, 33, 26, 28, 31, 27, 29, 25, 32, 28,
];
const OUTLIER_INDEX = 24;
const MEDIAN_PCT = 28;

export function OutlierField() {
  return (
    <figure
      aria-label="Gráfico: dezenas de vídeos com views próximas da mediana do canal e um único vídeo 716 vezes acima"
      className="relative w-full overflow-hidden border-y border-hairline bg-technical-grid"
    >
      <div className="relative mx-auto flex h-[300px] max-w-[1280px] items-end gap-[6px] px-md pt-xl md:h-[380px] md:gap-[10px]">
        {/* Linha da mediana — hairline tracejada com rótulo técnico */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 z-0 border-t border-dashed border-muted/60"
          style={{ bottom: `${MEDIAN_PCT}%` }}
        >
          <span className="absolute -top-[22px] left-md text-caption-upper uppercase tracking-widest text-muted">
            mediana do canal · 7,8 mil views
          </span>
        </div>

        {NOISE.map((height, index) => {
          if (index === OUTLIER_INDEX) {
            return (
              <div
                key={index}
                className="relative flex h-full flex-1 flex-col items-center justify-end"
              >
                {/* O badge carimba depois que a barra termina de subir */}
                <span
                  className="animate-badge-stamp z-10 mb-xxs bg-primary px-xxs py-xxxs text-title-md tabular-nums text-on-primary"
                  style={{ animationDelay: "2.05s" }}
                >
                  <CountUp end={716} suffix="×" durationMs={1200} />
                </span>
                <div
                  className="animate-bar-rise w-full bg-primary"
                  style={{
                    height: "88%",
                    animationDelay: "1.45s",
                    animationDuration: "0.9s",
                    boxShadow: "0 0 48px rgb(218 41 28 / 0.35)",
                  }}
                />
              </div>
            );
          }
          return (
            <div
              key={index}
              className="animate-bar-rise flex-1 bg-canvas-elevated"
              style={{
                height: `${height}%`,
                animationDelay: `${index * 45}ms`,
              }}
            />
          );
        })}
      </div>

      <figcaption className="border-t border-hairline">
        <p className="mx-auto max-w-[1280px] px-md py-xs text-body-sm text-muted">
          Caso real do corpus: um canal com mediana de 7,8 mil views publicou
          um vídeo que fez 5,6 milhões —{" "}
          <span className="text-body">
            encontrado pela plataforma em segundos
          </span>
          .
        </p>
      </figcaption>
    </figure>
  );
}
