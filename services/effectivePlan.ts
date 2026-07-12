/** Regra do plano efetivo (doc 7 §7.4) — puro, espelha o SQL. */

export const PAST_DUE_GRACE_DAYS = 7;

export type SubscriptionSnapshot = {
  planCode: string;
  status: "active" | "past_due" | "canceled";
  currentPeriodEnd: Date | null;
} | null;

/**
 * Plano efetivo do usuário: assinatura ativa vale; past_due mantém o
 * plano por 7 dias após o fim do período pago (aviso na UI); depois,
 * ou em cancelamento, rebaixa para free — sem apagar nada.
 */
export function effectivePlanCode(
  subscription: SubscriptionSnapshot,
  now: Date = new Date(),
): string {
  if (!subscription) return "free";
  if (subscription.status === "active") return subscription.planCode;
  if (subscription.status === "past_due") {
    const periodEnd = subscription.currentPeriodEnd ?? now;
    const graceEnd =
      periodEnd.getTime() + PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000;
    if (now.getTime() < graceEnd) return subscription.planCode;
  }
  return "free";
}
