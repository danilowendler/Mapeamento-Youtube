/**
 * Integração AO VIVO · pipeline de coleta contra a YouTube API real.
 * Consome cota de verdade (~10-30 unidades) — por isso só roda com
 * RUN_LIVE_COLLECTION=1. É o critério de conclusão do M2:
 * coletar canais reais, popular o corpus e provar o cache hit.
 */
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { collectChannel } from "@/services/collectionService";

const enabled =
  process.env.RUN_LIVE_COLLECTION === "1" &&
  Boolean(process.env.YOUTUBE_API_KEY) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

// Canais brasileiros grandes e estáveis (críterio M2: 3 canais reais)
const CHANNELS = ["@manualdomundo", "@CanalNostalgia", "@coisadenerd"];

describe.skipIf(!enabled)("coleta ao vivo (M2)", () => {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  it(
    "coleta 3 canais reais e popula o corpus",
    { timeout: 120000 },
    async () => {
      for (const handle of CHANNELS) {
        const result = await collectChannel(handle, 4);
        expect(result.channelId).toMatch(/^UC/);
        // cache_hit é aceitável em re-execuções do teste no mesmo dia
        if (result.mode !== "cache_hit") {
          expect(result.videosUpserted).toBeGreaterThan(50);
          expect(result.quotaUnitsSpent).toBeGreaterThanOrEqual(3);
          expect(result.quotaUnitsSpent).toBeLessThanOrEqual(12);
        }

        const { count } = await admin
          .from("videos")
          .select("youtube_id", { count: "exact", head: true })
          .eq("channel_id", result.channelId);
        expect(count ?? 0).toBeGreaterThan(50);
      }
    },
  );

  it("segunda coleta é cache hit com custo zero", async () => {
    const first = await collectChannel(CHANNELS[0], 4);
    const again = await collectChannel(first.channelId, 4);
    expect(again.mode).toBe("cache_hit");
    expect(again.quotaUnitsSpent).toBe(0);
  });

  it("Shorts e longos foram classificados", async () => {
    const { data } = await admin
      .from("videos")
      .select("is_short, duration_seconds")
      .not("duration_seconds", "is", null)
      .limit(500);
    const shorts = (data ?? []).filter((v) => v.is_short);
    for (const video of shorts) {
      expect(video.duration_seconds).toBeLessThanOrEqual(180);
    }
  });
});
