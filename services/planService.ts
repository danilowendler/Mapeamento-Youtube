import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlanLimits = {
  searches_per_month: number;
  channels_per_search: number;
  history_days: number;
  favorites: boolean;
  export: boolean;
};

/**
 * Limites do plano do usuário. Até o M7 (Stripe/subscriptions),
 * todo usuário está no plano 'free'.
 */
export async function getPlanLimits(
  supabase: SupabaseClient,
): Promise<PlanLimits> {
  const { data, error } = await supabase
    .from("plans")
    .select("limits")
    .eq("code", "free")
    .single();
  if (error || !data) {
    throw new Error(`plans.free não encontrado: ${error?.message}`);
  }
  return data.limits as PlanLimits;
}

/** Variante para o pipeline (service role), por user_id. */
export async function getPlanLimitsForUser(
  _userId: string,
): Promise<PlanLimits> {
  // M7: resolver o plano ativo do usuário via subscriptions
  return getPlanLimits(createAdminClient());
}

/** Uso do ciclo corrente (para o contador da UI). */
export async function getCurrentUsage(supabase: SupabaseClient): Promise<{
  used: number;
  limit: number;
  periodEnd: string;
}> {
  const limits = await getPlanLimits(supabase);
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  const start = periodStart.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("usage_periods")
    .select("searches_used, period_end")
    .eq("period_start", start)
    .maybeSingle();

  const nextMonth = new Date(periodStart);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

  return {
    used: data?.searches_used ?? 0,
    limit: limits.searches_per_month,
    periodEnd: data?.period_end ?? nextMonth.toISOString().slice(0, 10),
  };
}
