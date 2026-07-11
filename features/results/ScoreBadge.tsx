import { formatScoreMultiplier } from "@/utils/format";

/**
 * Badge de score (doc 6 §6.4/6.6): brilho crescente por faixa,
 * reservando o vermelho `primary` só para 30×+ — mantém o acento
 * escasso do design system.
 */
export function ScoreBadge({ score }: { score: number }) {
  const tier =
    score >= 30
      ? "bg-primary text-on-primary"
      : score >= 10
        ? "bg-ink text-canvas"
        : "bg-canvas-elevated text-ink";

  return (
    <span
      className={`inline-flex min-w-[56px] items-center justify-center px-xxs py-xxxs text-title-md tabular-nums ${tier}`}
      title={`${formatScoreMultiplier(score)} a mediana do canal`}
    >
      {formatScoreMultiplier(score)}
    </span>
  );
}
