import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createStripeClient } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  markEventProcessed,
  upsertSubscriptionFromStripe,
} from "@/services/billingService";

/**
 * Webhooks do Stripe (doc 7 §7.4): verificação de assinatura +
 * idempotência por event id. Única porta de escrita em subscriptions.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook não configurado." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Sem assinatura." }, { status: 400 });
  }

  const stripe = createStripeClient();
  let event: Stripe.Event;
  try {
    const payload = await request.text();
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      secret,
    );
  } catch {
    return NextResponse.json(
      { error: "Assinatura inválida." },
      { status: 400 },
    );
  }

  const isNew = await markEventProcessed(event.id, event.type);
  if (!isNew) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);
          await upsertSubscriptionFromStripe(subscription);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await upsertSubscriptionFromStripe(event.data.object);
        break;
      }

      case "invoice.payment_failed": {
        // O status past_due chega via subscription.updated; aqui só
        // registramos o sinal para o funil/observabilidade.
        const invoice = event.data.object;
        await createAdminClient().from("product_events").insert({
          name: "payment_failed",
          properties: {
            customer:
              typeof invoice.customer === "string"
                ? invoice.customer
                : (invoice.customer?.id ?? null),
          },
        });
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error(`[stripe-webhook] ${event.type}:`, error);
    // 500 → o Stripe reentrega (com a idempotência já garantida acima,
    // removemos o registro para permitir o reprocessamento)
    await createAdminClient()
      .from("processed_stripe_events")
      .delete()
      .eq("id", event.id);
    return NextResponse.json({ error: "Falha interna." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
