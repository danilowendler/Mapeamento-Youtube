import type Stripe from "stripe";
import { createStripeClient } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Sessão de Checkout para assinar um plano (doc 7 §7.4).
 * Sem payment_method_types: o Stripe decide os métodos dinamicamente.
 */
export async function createCheckoutSession(
  userId: string,
  email: string,
  planCode: "criador" | "pro",
): Promise<string> {
  const db = createAdminClient();
  const stripe = createStripeClient();

  const { data: plan, error } = await db
    .from("plans")
    .select("code, stripe_price_id")
    .eq("code", planCode)
    .single();
  if (error || !plan?.stripe_price_id) {
    throw new Error(
      `Plano ${planCode} sem stripe_price_id — rode scripts/setup-stripe-products.mjs.`,
    );
  }

  // Reutiliza o customer se o usuário já teve assinatura
  const { data: existing } = await db
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    client_reference_id: userId,
    ...(existing?.stripe_customer_id
      ? { customer: existing.stripe_customer_id }
      : { customer_email: email }),
    subscription_data: { metadata: { user_id: userId } },
    success_url: `${appUrl()}/app?settings=plano&checkout=sucesso`,
    cancel_url: `${appUrl()}/app?settings=plano&checkout=cancelado`,
    locale: "pt-BR",
  });

  if (!session.url) throw new Error("Checkout sem URL.");
  return session.url;
}

/** Sessão do Customer Portal (trocar plano, cartão, cancelar). */
export async function createPortalSession(userId: string): Promise<string> {
  const db = createAdminClient();
  const stripe = createStripeClient();

  const { data: sub } = await db
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!sub?.stripe_customer_id) {
    throw new Error("Usuário sem customer no Stripe.");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${appUrl()}/app?settings=plano`,
  });
  return session.url;
}

/** Mapeia status do Stripe para o nosso modelo (doc 5 §5.2). */
function mapStatus(
  status: Stripe.Subscription.Status,
): "active" | "past_due" | "canceled" {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    default:
      return "canceled";
  }
}

/**
 * Sincroniza uma assinatura do Stripe com a tabela subscriptions —
 * única porta de escrita, chamada apenas pelos webhooks.
 */
export async function upsertSubscriptionFromStripe(
  subscription: Stripe.Subscription,
): Promise<void> {
  const db = createAdminClient();

  const userId = subscription.metadata?.user_id;
  if (!userId) {
    throw new Error(
      `Assinatura ${subscription.id} sem metadata.user_id — impossível vincular.`,
    );
  }

  const priceId = subscription.items.data[0]?.price?.id ?? null;
  let planCode: string | null = null;
  if (priceId) {
    const { data: plan } = await db
      .from("plans")
      .select("code")
      .eq("stripe_price_id", priceId)
      .maybeSingle();
    planCode = plan?.code ?? null;
  }
  if (!planCode) {
    throw new Error(
      `Assinatura ${subscription.id}: price ${priceId} não mapeado em plans.`,
    );
  }

  const item = subscription.items.data[0];
  const periodStart = item?.current_period_start ?? null;
  const periodEnd = item?.current_period_end ?? null;

  const { error } = await db.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      plan_code: planCode,
      status: mapStatus(subscription.status),
      current_period_start: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : null,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`subscriptions.upsert: ${error.message}`);
}

/** Idempotência: true se o evento é novo (e o registra). */
export async function markEventProcessed(
  eventId: string,
  type: string,
): Promise<boolean> {
  const db = createAdminClient();
  const { error, data } = await db
    .from("processed_stripe_events")
    .insert({ id: eventId, type })
    .select("id")
    .maybeSingle();
  if (error) {
    // Violação de PK = evento repetido
    if (error.code === "23505") return false;
    throw new Error(`processed_stripe_events: ${error.message}`);
  }
  return data !== null;
}
