import { NonRetriableError } from "inngest";
import { channelCollectEvent, inngest } from "@/lib/inngest/client";
import {
  ChannelNotFoundError,
  collectChannel as runCollection,
} from "@/services/collectionService";

/**
 * Job durável de coleta de canal (doc 3 §3.5).
 * - Paralelismo limitado: evita rajadas contra a API e o Postgres.
 * - Canal inexistente não é retentado (erro do usuário, não do sistema).
 * - Cota esgotada é retentável — o Inngest aplica backoff exponencial.
 */
export const collectChannel = inngest.createFunction(
  {
    id: "collect-channel",
    concurrency: { limit: 3 },
    retries: 3,
    triggers: [channelCollectEvent],
  },
  async ({ event, step }) => {
    return step.run("coletar-canal", async () => {
      try {
        return await runCollection(event.data.input, event.data.priority ?? 2);
      } catch (error) {
        if (error instanceof ChannelNotFoundError) {
          throw new NonRetriableError(error.message, { cause: error });
        }
        throw error;
      }
    });
  },
);
