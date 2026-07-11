/**
 * Integração AO VIVO · motor de outliers sobre o corpus real (M3).
 * Custo de cota: ZERO (só lê o corpus e grava scores/baselines).
 * Roda com RUN_LIVE_ANALYSIS=1.
 */
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { applyChannelAnalysis } from "@/services/analysisService";

const enabled =
  process.env.RUN_LIVE_ANALYSIS === "1" &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!enabled)("análise ao vivo (M3)", () => {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  it(
    "analisa todos os canais do corpus e grava scores coerentes",
    { timeout: 60000 },
    async () => {
      const { data: channels } = await admin
        .from("channels")
        .select("youtube_id, title")
        .eq("collection_status", "ready");
      expect(channels?.length).toBeGreaterThanOrEqual(3);

      for (const channel of channels ?? []) {
        const result = await applyChannelAnalysis(channel.youtube_id);
        expect(result.videosScored).toBeGreaterThan(0);

        // Baselines gravados para o canal
        const { data: baselines } = await admin
          .from("channel_baselines")
          .select("format, age_bucket, median_views, sample_size")
          .eq("channel_id", channel.youtube_id);
        expect(baselines!.length).toBeGreaterThan(0);

        // Top 3 outliers do canal (para inspeção manual no log)
        const { data: top } = await admin
          .from("videos")
          .select("title, view_count, score, baseline_views, is_short")
          .eq("channel_id", channel.youtube_id)
          .not("score", "is", null)
          .order("score", { ascending: false })
          .limit(3);

        console.log(`\n▶ ${channel.title}`);
        for (const v of top ?? []) {
          console.log(
            `  ${Number(v.score).toFixed(1)}× · ${v.view_count?.toLocaleString("pt-BR")} views (mediana ${v.baseline_views?.toLocaleString("pt-BR")}) · ${v.is_short ? "SHORT" : "LONGO"} · ${v.title.slice(0, 60)}`,
          );
        }

        // Sanidade: score recalculado bate com views/baseline
        for (const v of top ?? []) {
          const expected = (v.view_count ?? 0) / Math.max(v.baseline_views ?? 1, 1);
          expect(Number(v.score)).toBeCloseTo(
            Math.round(expected * 100) / 100,
            1,
          );
        }
      }
    },
  );

  it("vídeos com menos de 14 dias ficaram sem score", async () => {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const { data } = await admin
      .from("videos")
      .select("youtube_id, score")
      .gt("published_at", cutoff.toISOString())
      .not("score", "is", null);
    expect(data ?? []).toHaveLength(0);
  });
});
