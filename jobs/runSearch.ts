import { NonRetriableError } from "inngest";
import { createAdminClient } from "@/lib/supabase/admin";
import { inngest, searchRunEvent } from "@/lib/inngest/client";
import { applyChannelAnalysis } from "@/services/analysisService";
import {
  ChannelNotFoundError,
  collectChannel,
} from "@/services/collectionService";
import type { QuotaPriorityValue } from "@/services/quotaService";

/**
 * Pipeline de uma pesquisa (doc 3 §3.5, ADR-004): para cada canal,
 * coleta → analisa → publica o resultado parcial. Cada publicação em
 * search_results chega ao frontend via Realtime — o usuário vê os
 * canais aparecendo um a um.
 *
 * Cada canal é um step durável: um retry do job não repete canais
 * já concluídos.
 */
export const runSearch = inngest.createFunction(
  {
    id: "run-search",
    concurrency: { limit: 5 },
    retries: 2,
    triggers: [searchRunEvent],
  },
  async ({ event, step }) => {
    const { searchId } = event.data;
    const priority = (event.data.priority ?? 2) as QuotaPriorityValue;
    const db = createAdminClient();

    const search = await step.run("carregar-pesquisa", async () => {
      const { data, error } = await db
        .from("searches")
        .select("id, status, input")
        .eq("id", searchId)
        .single();
      if (error || !data) {
        throw new NonRetriableError(`Pesquisa ${searchId} não encontrada.`);
      }
      await db
        .from("searches")
        .update({ status: "running" })
        .eq("id", searchId);
      return data;
    });

    const inputs: string[] =
      (search.input as { channels?: string[] }).channels ?? [];

    let failed = 0;

    for (const [index, input] of inputs.entries()) {
      const ok = await step.run(`canal-${index}`, async () => {
        try {
          // 1 · Coleta (ou cache hit) — custo controlado pela cota.
          // onResolved publica o chip "coletando…" imediatamente
          // (Realtime), dando vida à tela antes do canal ficar pronto.
          const collection = await collectChannel(input, priority, {
            onResolved: async (channelId) => {
              await db.from("search_results").upsert(
                { search_id: searchId, channel_id: channelId,
                  status: "collecting" },
                { onConflict: "search_id,channel_id" },
              );
            },
          });

          // 2 · Análise: baselines + scores no corpus
          const analysis = await applyChannelAnalysis(collection.channelId);

          // 3 · Publicar resultado parcial (Realtime empurra à UI)
          const { error } = await db.from("search_results").upsert(
            {
              search_id: searchId,
              channel_id: collection.channelId,
              status: "ready",
              top_score: analysis.topScore,
              completed_at: new Date().toISOString(),
            },
            { onConflict: "search_id,channel_id" },
          );
          if (error) throw new Error(`search_results: ${error.message}`);

          await bumpProgress(searchId, collection.quotaUnitsSpent);
          return true;
        } catch (error) {
          if (error instanceof ChannelNotFoundError) {
            // Canal inexistente: registra a falha e segue o lote
            await registerFailure(searchId, input, error.message);
            await bumpProgress(searchId, 0);
            return false;
          }
          throw error; // cota/transiente: deixa o Inngest retentar o step
        }
      });
      if (!ok) failed += 1;
    }

    await step.run("finalizar", async () => {
      const status =
        failed === 0
          ? "completed"
          : failed === inputs.length
            ? "failed"
            : "partial";
      const { error } = await db
        .from("searches")
        .update({ status, completed_at: new Date().toISOString() })
        .eq("id", searchId);
      if (error) throw new Error(`searches.finalize: ${error.message}`);
      return status;
    });
  },
);

/** Incrementa progresso e custo de forma atômica no banco. */
async function bumpProgress(searchId: string, units: number): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.rpc("bump_search_progress", {
    p_search_id: searchId,
    p_units: units,
  });
  if (error) throw new Error(`bump_search_progress: ${error.message}`);
}

/**
 * Falha de um canal que nem chegou a existir no corpus: não há
 * channel_id para search_results, então a entrada vai para
 * searches.failed_inputs — a UI lista o que não pôde ser analisado.
 */
async function registerFailure(
  searchId: string,
  input: string,
  message: string,
): Promise<void> {
  console.warn(`[run-search] ${searchId} · ${input}: ${message}`);
  const db = createAdminClient();
  const { error } = await db.rpc("append_failed_input", {
    p_search_id: searchId,
    p_input: input,
  });
  if (error) {
    console.error(`append_failed_input: ${error.message}`);
  }
}
