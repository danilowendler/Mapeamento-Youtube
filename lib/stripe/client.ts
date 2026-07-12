import Stripe from "stripe";

/**
 * Cliente Stripe — só em código de servidor. A chave vem do ambiente
 * (doc 8 §8.2); nunca logar nem expor em mensagens de erro.
 */
export function createStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada.");
  return new Stripe(key);
}
