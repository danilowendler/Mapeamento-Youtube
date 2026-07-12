import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/services/billingService";
import {
  enforceRateLimit,
  RateLimitedError,
} from "@/services/rateLimitService";

const bodySchema = z.object({
  plan: z.union([z.literal("criador"), z.literal("pro")]),
});

/** POST /api/billing/checkout — inicia a assinatura de um plano. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  }

  try {
    await enforceRateLimit(`checkout:${user.id}`, 5, 60);
    const url = await createCheckoutSession(
      user.id,
      user.email,
      parsed.data.plan,
    );
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof RateLimitedError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error("[billing/checkout]", error);
    return NextResponse.json(
      { error: "Erro ao iniciar o checkout. Tente novamente." },
      { status: 500 },
    );
  }
}
