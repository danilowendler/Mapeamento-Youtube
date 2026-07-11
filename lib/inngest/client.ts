import { Inngest, eventType } from "inngest";
import { z } from "zod";

/**
 * Evento: pedido de coleta de um canal para o corpus.
 * priority: 1 pagante · 2 gratuito · 3 recoleta · 4 manutenção (doc 3 §3.4).
 */
export const channelCollectEvent = eventType("corpus/channel.collect", {
  schema: z.object({
    /** ID canônico (UC...), @handle ou URL do canal. */
    input: z.string().min(2),
    priority: z
      .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
      .optional(),
  }),
});

/** Evento: executar uma pesquisa criada (coleta + análise progressivas). */
export const searchRunEvent = eventType("search/run.requested", {
  schema: z.object({
    searchId: z.string().uuid(),
    priority: z
      .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
      .optional(),
  }),
});

export const inngest = new Inngest({ id: "mapeamento-inteligente" });
