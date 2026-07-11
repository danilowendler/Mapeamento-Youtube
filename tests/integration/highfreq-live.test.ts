/**
 * Integração AO VIVO · coleta adaptativa para canais de altíssima
 * frequência de publicação (correção M4 — caso CazéTV).
 * Consome ~20 unidades. Roda com RUN_LIVE_HIGHFREQ=1.
 */
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { applyChannelAnalysis } from "@/services/analysisService";
import { collectChannel } from "@/services/collectionService";

const enabled =
  process.env.RUN_LIVE_HIGHFREQ === "1" &&
  Boolean(process.env.YOUTUBE_API_KEY);

const CAZETV = "UCZiYbVptd3PVPf4f6eR6UaQ";

describe.skipIf(!enabled)("coleta adaptativa · canal de alta frequência", () => {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  it(
    "coleta profunda produz vídeos elegíveis e scores",
    { timeout: 120000 },
    async () => {
      // Força recoleta (derruba o frescor)
      await admin
        .from("channels")
        .update({ refreshed_at: null, collection_status: "pending" })
        .eq("youtube_id", CAZETV);

      const result = await collectChannel(CAZETV, 4);
      expect(result.mode).not.toBe("cache_hit");
      console.log(
        `coletados=${result.videosUpserted} · unidades=${result.quotaUnitsSpent}`,
      );

      const analysis = await applyChannelAnalysis(CAZETV);
      console.log(
        `com score=${analysis.videosScored} · topScore=${analysis.topScore}`,
      );
      expect(analysis.videosScored).toBeGreaterThan(0);

      const { data: baselines } = await admin
        .from("channel_baselines")
        .select("format, age_bucket, median_views, sample_size")
        .eq("channel_id", CAZETV);
      expect(baselines!.length).toBeGreaterThan(0);
      console.log("baselines:", JSON.stringify(baselines));
    },
  );
});
