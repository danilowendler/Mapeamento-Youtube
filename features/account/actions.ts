"use server";

import { redirect } from "next/navigation";
import { createStripeClient } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type DeleteAccountState = { error?: string };

/**
 * Exclusão de conta self-service (doc 8 §8.3, LGPD).
 * Ordem importa: 1) cancela a assinatura no Stripe (senão o cartão
 * continua sendo cobrado); 2) apaga o usuário — o cascade remove
 * toda a zona do usuário; o corpus global não referencia usuários
 * por construção (doc 5 §5.5).
 */
export async function deleteAccount(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const confirmation = String(formData.get("confirmation") ?? "");
  if (confirmation.trim().toUpperCase() !== "EXCLUIR") {
    return { error: 'Digite EXCLUIR para confirmar.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const admin = createAdminClient();

  // 1 · Cancelamento imediato da assinatura ativa, se houver
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    subscription?.stripe_subscription_id &&
    subscription.status !== "canceled"
  ) {
    try {
      await createStripeClient().subscriptions.cancel(
        subscription.stripe_subscription_id,
      );
    } catch (error) {
      console.error("[delete-account] cancelamento Stripe:", error);
      return {
        error:
          "Não conseguimos cancelar sua assinatura automaticamente. " +
          "Cancele em Gerenciar assinatura e tente excluir de novo.",
      };
    }
  }

  // 2 · Exclusão do usuário (cascade limpa a zona do usuário)
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[delete-account]", error.message);
    return { error: "Erro ao excluir a conta. Tente novamente." };
  }

  await supabase.auth.signOut();
  redirect("/?conta=excluida");
}
