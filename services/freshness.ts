/** Política de frescor do corpus (doc 3 §3.3). */

export const FRESH_MAX_DAYS = 7;
export const STALE_MAX_DAYS = 30;

export type FreshnessDecision =
  /** ≤ 7 dias: cache hit, servir direto, custo zero. */
  | "fresh"
  /** 7–30 dias: servir do corpus E agendar recoleta incremental. */
  | "refresh_in_background"
  /** > 30 dias: NÃO servir antes de recoletar (conformidade YouTube). */
  | "recollect_required"
  /** Nunca coletado. */
  | "collect_new";

export function decideFreshness(
  refreshedAt: Date | null,
  now: Date = new Date(),
): FreshnessDecision {
  if (!refreshedAt) return "collect_new";

  const ageDays =
    (now.getTime() - refreshedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (ageDays <= FRESH_MAX_DAYS) return "fresh";
  if (ageDays <= STALE_MAX_DAYS) return "refresh_in_background";
  return "recollect_required";
}
