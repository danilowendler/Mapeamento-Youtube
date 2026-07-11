import { createAdminClient } from "@/lib/supabase/admin";
import { QUOTA_COSTS } from "@/lib/youtube/client";

/**
 * Orçamento de cota da YouTube API (doc 3 §3.4).
 * A reserva é atômica no banco (reserve_quota, advisory lock);
 * este service é a única porta de entrada do restante do código.
 */

/** Prioridades de consumo (doc 3 §3.4). */
export const QuotaPriority = {
  paidInteractive: 1,
  freeInteractive: 2,
  incrementalRefresh: 3,
  maintenance: 4,
} as const;

export type QuotaPriorityValue =
  (typeof QuotaPriority)[keyof typeof QuotaPriority];

export type QuotaOperation = keyof typeof QUOTA_COSTS;

export class QuotaExceededError extends Error {
  constructor(operation: string) {
    super(`Cota diária esgotada para a operação ${operation}.`);
    this.name = "QuotaExceededError";
  }
}

/**
 * Reserva as unidades de uma operação ANTES da chamada à API.
 * Lança QuotaExceededError se o orçamento do dia não comporta.
 */
export async function reserveQuota(
  operation: QuotaOperation,
  priority: QuotaPriorityValue,
): Promise<void> {
  const units = QUOTA_COSTS[operation];
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("reserve_quota", {
    p_units: units,
    p_priority: priority,
    p_operation: operation,
  });
  if (error) {
    throw new Error(`Falha ao reservar cota: ${error.message}`);
  }
  if (data !== true) {
    throw new QuotaExceededError(operation);
  }
}

/** Consumo do dia de cota corrente, total e por prioridade. */
export async function getTodayUsage(): Promise<{
  total: number;
  byPriority: Record<number, number>;
}> {
  const supabase = createAdminClient();
  // Mesmo cálculo de "dia de cota" da função SQL (meia-noite Pacífico).
  const quotaDay = new Date()
    .toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

  const { data, error } = await supabase
    .from("quota_ledger")
    .select("priority, units")
    .eq("quota_day", quotaDay);
  if (error) throw new Error(`Falha ao ler quota_ledger: ${error.message}`);

  const byPriority: Record<number, number> = {};
  let total = 0;
  for (const row of data ?? []) {
    byPriority[row.priority] = (byPriority[row.priority] ?? 0) + row.units;
    total += row.units;
  }
  return { total, byPriority };
}
