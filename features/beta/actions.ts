"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type RedeemState = { error?: string };

/** Resgata um código de convite do beta (função SQL atômica). */
export async function redeemInvite(
  _prev: RedeemState,
  formData: FormData,
): Promise<RedeemState> {
  const code = String(formData.get("code") ?? "").trim();
  if (code.length < 4) {
    return { error: "Informe o código do convite." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_beta_invite", {
    p_code: code,
  });

  if (error) {
    return { error: "Não foi possível validar o convite. Tente novamente." };
  }
  if (data !== true) {
    return { error: "Código inválido ou já utilizado." };
  }

  redirect("/app");
}
