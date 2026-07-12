/**
 * Integração AO VIVO · search.list + cache de 72 h (M5).
 * Consome 100 unidades UMA vez (keyword fria); a segunda chamada
 * deve custar 0. Roda com RUN_LIVE_KEYWORD=1.
 */
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { getTodayUsage } from "@/services/quotaService";
import { resolveKeywordChannels } from "@/services/keywordService";

const enabled =
  process.env.RUN_LIVE_KEYWORD === "1" &&
  Boolean(process.env.YOUTUBE_API_KEY);

const KEYWORD = "finanças pessoais";

describe.skipIf(!enabled)("keyword ao vivo (M5)", () => {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  it(
    "keyword fria custa 100 unidades; repetida custa 0 (cache 72h)",
    { timeout: 60000 },
    async () => {
      const before = (await getTodayUsage()).total;

      const first = await resolveKeywordChannels(KEYWORD, 2);
      expect(first.length).toBeGreaterThan(3);
      expect(first.length).toBeLessThanOrEqual(10);
      const afterFirst = (await getTodayUsage()).total;

      const second = await resolveKeywordChannels(KEYWORD, 2);
      expect(second).toEqual(first);
      const afterSecond = (await getTodayUsage()).total;

      const firstCost = afterFirst - before;
      const secondCost = afterSecond - afterFirst;
      console.log(
        `canais=${first.length} · 1ª chamada=${firstCost}un · 2ª chamada=${secondCost}un`,
      );
      // 1ª: 100 se fria, 0 se já cacheada por execução anterior do teste
      expect([0, 100]).toContain(firstCost);
      expect(secondCost).toBe(0);

      const { data: cache } = await admin
        .from("keyword_cache")
        .select("keyword, result_count")
        .eq("keyword", KEYWORD)
        .single();
      expect(cache?.result_count).toBeGreaterThan(10);
    },
  );
});
