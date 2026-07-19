import { formatScoreMultiplier } from "@/utils/format";

/**
 * Badge de score (doc 6 §6.4/6.6): brilho crescente por faixa,
 * reservando o vermelho `primary` só para 30×+ — mantém o acento
 * escasso do design system. A faixa 1.5–3× é sinal fraco (Pré-M9 T1):
 * só contorno, mais apagada que a 3–10×.
 */
export function ScoreBadge({ score }: { score: number }) {
  const tier =
    score >= 30
      ? "bg-primary text-on-primary"
      : score >= 10
        ? "bg-ink text-canvas"
        : score >= 3
          ? "bg-canvas-elevated text-ink"
          : "border border-hairline text-body";

  return (
    <span
      className={`inline-flex min-w-[56px] items-center justify-center px-xxs py-xxxs text-title-md tabular-nums ${tier}`}
      title={`${formatScoreMultiplier(score)} a mediana do canal`}
    >
      {formatScoreMultiplier(score)}
    </span>
  );
}
