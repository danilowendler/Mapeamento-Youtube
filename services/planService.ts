import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  effectivePlanCode,
  type SubscriptionSnapshot,
} from "./effectivePlan";

export type PlanLimits = {
  searches_per_month: number;
  channels_per_search: number;
  history_days: number;
  favorites: boolean;
  export: boolean;
};

export type EffectivePlan = {
  code: string;
  name: string;
  limits: PlanLimits;
  subscriptionStatus: "active" | "past_due" | "canceled" | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
};

async function readSubscription(
  client: SupabaseClient,
  userId?: string,
): Promise<{
  snapshot: SubscriptionSnapshot;
  cancelAtPeriodEnd: boolean;
  rawStatus: "active" | "past_due" | "canceled" | null;
  currentPeriodEnd: string | null;
}> {
  let query = client
    .from("subscriptions")
    .select(
      "plan_code, status, current_period_end, cancel_at_period_end, user_id",
    );
  if (userId) query = query.eq("user_id", userId);
  const { data } = await query.maybeSingle();

  if (!data) {
    return {
      snapshot: null,
      cancelAtPeriodEnd: false,
      rawStatus: null,
      currentPeriodEnd: null,
    };
  }
  return {
    snapshot: {
      planCode: data.plan_code,
      status: data.status,
      currentPeriodEnd: data.current_period_end
        ? new Date(data.current_period_end)
        : null,
    },
    cancelAtPeriodEnd: data.cancel_at_period_end,
    rawStatus: data.status,
    currentPeriodEnd: data.current_period_end,
  };
}

async function resolvePlan(
  client: SupabaseClient,
  userId?: string,
): Promise<EffectivePlan> {
  const sub = await readSubscription(client, userId);
  const code = effectivePlanCode(sub.snapshot);

  const { data: plan, error } = await client
    .from("plans")
    .select("code, name, limits")
    .eq("code", code)
    .single();
  if (error || !plan) {
    throw new Error(`plans.${code} não encontrado: ${error?.message}`);
  }

  return {
    code: plan.code,
    name: plan.name,
    limits: plan.limits as PlanLimits,
    subscriptionStatus: sub.rawStatus,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    currentPeriodEnd: sub.currentPeriodEnd,
  };
}

/** Plano efetivo via cliente do usuário (RLS restringe à própria linha). */
export async function getEffectivePlan(
  supabase: SupabaseClient,
): Promise<EffectivePlan> {
  return resolvePlan(supabase);
}

/** Limites do plano do usuário (cliente com RLS). */
export async function getPlanLimits(
  supabase: SupabaseClient,
): Promise<PlanLimits> {
  return (await resolvePlan(supabase)).limits;
}

/** Variante para o pipeline (service role), por user_id. */
export async function getPlanLimitsForUser(
  userId: string,
): Promise<PlanLimits> {
  return (await resolvePlan(createAdminClient(), userId)).limits;
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
