/**
 * Integração · ciclo de assinatura (M7): o upsert que o webhook
 * executa muda o plano efetivo e os limites; past_due fora da graça
 * rebaixa para free. Usa o banco de dev + price ids reais (modo
 * teste) gravados pelo scripts/setup-stripe-products.mjs.
 */
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { upsertSubscriptionFromStripe } from "@/services/billingService";
import { getPlanLimitsForUser } from "@/services/planService";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasEnv = Boolean(url && serviceKey);

function fakeSubscription(overrides: {
  userId: string;
  priceId: string;
  status: Stripe.Subscription.Status;
  periodEnd: Date;
}): Stripe.Subscription {
  return {
    id: `sub_test_${overrides.userId.slice(0, 8)}`,
    customer: `cus_test_${overrides.userId.slice(0, 8)}`,
    status: overrides.status,
    cancel_at_period_end: false,
    metadata: { user_id: overrides.userId },
    items: {
      data: [
        {
          price: { id: overrides.priceId },
          current_period_start: Math.floor(Date.now() / 1000) - 86400,
          current_period_end: Math.floor(
            overrides.periodEnd.getTime() / 1000,
          ),
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

describe.skipIf(!hasEnv)("assinatura · upsert + plano efetivo", () => {
  const admin = createClient(url ?? "", serviceKey ?? "", {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let userId = "";
  let criadorPriceId = "";

  beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email: `billing-${Date.now()}@teste.mapeamento.local`,
      password: `billing-${Date.now()}-Aa1!`,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error("createUser");
    userId = data.user.id;

    const { data: plan } = await admin
      .from("plans")
      .select("stripe_price_id")
      .eq("code", "criador")
      .single();
    criadorPriceId = plan?.stripe_price_id ?? "";
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("price_id do plano criador está configurado (setup script)", () => {
    expect(criadorPriceId).toMatch(/^price_/);
  });

  it("assinatura ativa → limites do plano criador (30 pesquisas)", async () => {
    await upsertSubscriptionFromStripe(
      fakeSubscription({
        userId,
        priceId: criadorPriceId,
        status: "active",
        periodEnd: new Date(Date.now() + 30 * 86400 * 1000),
      }),
    );
    const limits = await getPlanLimitsForUser(userId);
    expect(limits.searches_per_month).toBe(30);
    expect(limits.channels_per_search).toBe(20);
    expect(limits.favorites).toBe(true);
  });

  it("past_due dentro da graça mantém o plano", async () => {
    await upsertSubscriptionFromStripe(
      fakeSubscription({
        userId,
        priceId: criadorPriceId,
        status: "past_due",
        periodEnd: new Date(Date.now() - 2 * 86400 * 1000), // venceu há 2 dias
      }),
    );
    const limits = await getPlanLimitsForUser(userId);
    expect(limits.searches_per_month).toBe(30);
  });

  it("past_due além da graça rebaixa para free", async () => {
    await upsertSubscriptionFromStripe(
      fakeSubscription({
        userId,
        priceId: criadorPriceId,
        status: "past_due",
        periodEnd: new Date(Date.now() - 10 * 86400 * 1000), // 10 dias
      }),
    );
    const limits = await getPlanLimitsForUser(userId);
    expect(limits.searches_per_month).toBe(3);
  });

  it("cancelamento rebaixa para free", async () => {
    await upsertSubscriptionFromStripe(
      fakeSubscription({
        userId,
        priceId: criadorPriceId,
        status: "canceled",
        periodEnd: new Date(Date.now() + 10 * 86400 * 1000),
      }),
    );
    const limits = await getPlanLimitsForUser(userId);
    expect(limits.searches_per_month).toBe(3);
  });
});
