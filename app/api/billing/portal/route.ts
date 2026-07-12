import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPortalSession } from "@/services/billingService";

/** POST /api/billing/portal — abre o Customer Portal do assinante. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const url = await createPortalSession(user.id);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[billing/portal]", error);
    return NextResponse.json(
      { error: "Erro ao abrir o portal. Tente novamente." },
      { status: 500 },
    );
  }
}
