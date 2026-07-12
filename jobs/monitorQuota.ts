import * as Sentry from "@sentry/nextjs";
import { cron } from "inngest";
import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTodayUsage } from "@/services/quotaService";

const QUOTA_ALERT_THRESHOLD = 8000; // 80% de 10.000 (doc 8 §8.5)

/**
 * Sentinela horária (doc 8 §8.5): cota ≥ 80% e pesquisas travadas.
 * Alertas via Sentry (e-mail, quando o DSN estiver configurado) e
 * logs da Vercel como fallback.
 */
export const monitorQuota = inngest.createFunction(
  { id: "monitor-quota", triggers: [cron("0 * * * *")] },
  async () => {
    const findings: string[] = [];

    const usage = await getTodayUsage();
    if (usage.total >= QUOTA_ALERT_THRESHOLD) {
      findings.push(
        `Cota do YouTube em ${usage.total}/10000 unidades (${Math.round(
          (usage.total / 10000) * 100,
        )}%) — prioridades: ${JSON.stringify(usage.byPriority)}`,
      );
    }

    // Pesquisas presas em execução há mais de 15 minutos
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: stuck } = await createAdminClient()
      .from("searches")
      .select("id")
      .in("status", ["queued", "running"])
      .lt("created_at", cutoff);
    if (stuck && stuck.length > 0) {
      findings.push(
        `${stuck.length} pesquisa(s) presa(s) há mais de 15 min: ${stuck
          .map((s) => s.id)
          .join(", ")}`,
      );
    }

    for (const finding of findings) {
      console.error(`[monitor] ${finding}`);
      Sentry.captureMessage(finding, "warning");
    }

    return { findings: findings.length, quotaToday: usage.total };
  },
);
