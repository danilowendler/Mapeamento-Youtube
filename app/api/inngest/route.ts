import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { collectChannel } from "@/jobs/collectChannel";
import { runSearch } from "@/jobs/runSearch";

/** Endpoint que o Inngest usa para descobrir e invocar as funções. */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [collectChannel, runSearch],
});
