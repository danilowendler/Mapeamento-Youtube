"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUsage, getEffectivePlan } from "@/services/planService";

export type SettingsData = {
  displayName: string | null;
  email: string | null;
  createdAt: string | null;
  plan: {
    code: string;
    name: string;
    subscriptionStatus: "active" | "past_due" | "canceled" | null;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    usage: { used: number; limit: number };
  };
};

/**
 * Dados do modal de Configurações (M10.5, lote B2), carregados só
 * quando o modal abre — o layout do /app não paga essas queries em
 * cada navegação.
 */
export async function getSettingsData(): Promise<{
  data?: SettingsData;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const [{ data: profile }, plan, usage] = await Promise.all([
    supabase.from("profiles").select("display_name, created_at").single(),
    getEffectivePlan(supabase),
    getCurrentUsage(supabase),
  ]);

  return {
    data: {
      displayName: profile?.display_name ?? null,
      email: user.email ?? null,
      createdAt: profile?.created_at ?? null,
      plan: {
        code: plan.code,
        name: plan.name,
        subscriptionStatus: plan.subscriptionStatus,
        cancelAtPeriodEnd: plan.cancelAtPeriodEnd,
        currentPeriodEnd: plan.currentPeriodEnd,
        usage: { used: usage.used, limit: usage.limit },
      },
    },
  };
}

const nameSchema = z
  .string()
  .trim()
  .min(2, "O nome precisa de pelo menos 2 caracteres.")
  .max(60, "Nome de até 60 caracteres.");

export async function updateDisplayName(
  rawName: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data })
    .eq("id", user.id);
  if (error) return { error: "Erro ao salvar. Tente novamente." };

  // Sidebar (nome no rodapé) e saudação do Mapping usam o profile
  revalidatePath("/app", "layout");
  return {};
}
