import { createAdminClient } from "@/lib/supabase/admin";
import { searchVideosByKeyword } from "@/lib/youtube/client";
import { reserveQuota, type QuotaPriorityValue } from "./quotaService";

/** TTL do cache de keyword (doc 3 §3.2). */
export const KEYWORD_CACHE_HOURS = 72;
/** Canais distintos aproveitados por keyword (controla custo de coleta). */
export const MAX_CHANNELS_PER_KEYWORD = 10;
/** Keywords consultadas por nicho no MVP (limita o pior caso a 3×100 un). */
export const MAX_KEYWORDS_PER_NICHE = 3;

export function normalizeKeyword(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Resolve uma keyword para canais do tema — do cache (0 unidades) ou
 * da API (100 unidades, reservadas ANTES). Resultado sempre cacheado
 * e compartilhado entre todos os usuários.
 */
export async function resolveKeywordChannels(
  rawKeyword: string,
  priority: QuotaPriorityValue,
): Promise<string[]> {
  const keyword = normalizeKeyword(rawKeyword);
  const db = createAdminClient();

  // 1 · Cache dentro da janela de 72 h?
  const cutoff = new Date(
    Date.now() - KEYWORD_CACHE_HOURS * 60 * 60 * 1000,
  ).toISOString();
  const { data: cached } = await db
    .from("keyword_cache")
    .select("keyword, fetched_at")
    .eq("keyword", keyword)
    .gte("fetched_at", cutoff)
    .maybeSingle();

  if (cached) {
    const { data: rows, error } = await db
      .from("keyword_results")
      .select("channel_id, position")
      .eq("keyword", keyword)
      .order("position");
    if (error) throw new Error(`keyword_results: ${error.message}`);
    return distinctChannels(
      (rows ?? []).map((r) => r.channel_id),
      MAX_CHANNELS_PER_KEYWORD,
    );
  }

  // 2 · API: reserva as 100 unidades antes de gastar
  await reserveQuota("search.list", priority);
  const hits = await searchVideosByKeyword(keyword);

  // 3 · Cacheia (upsert + substituição dos resultados)
  const { error: cacheError } = await db.from("keyword_cache").upsert({
    keyword,
    fetched_at: new Date().toISOString(),
    result_count: hits.length,
  });
  if (cacheError) throw new Error(`keyword_cache: ${cacheError.message}`);

  await db.from("keyword_results").delete().eq("keyword", keyword);
  if (hits.length > 0) {
    const { error: resultsError } = await db.from("keyword_results").insert(
      hits.map((hit, index) => ({
        keyword,
        position: index,
        channel_id: hit.channelId,
        channel_title: hit.channelTitle,
        video_id: hit.videoId,
      })),
    );
    if (resultsError) {
      throw new Error(`keyword_results.insert: ${resultsError.message}`);
    }
  }

  return distinctChannels(
    hits.map((hit) => hit.channelId),
    MAX_CHANNELS_PER_KEYWORD,
  );
}

/**
 * Resolve um nicho curado: consulta as primeiras MAX_KEYWORDS_PER_NICHE
 * keywords (cache primeiro) e une os canais preservando a ordem de
 * relevância intercalada (round-robin entre keywords).
 */
export async function resolveNicheChannels(
  slug: string,
  priority: QuotaPriorityValue,
  maxChannels: number,
): Promise<{ nicheName: string; channelIds: string[] }> {
  const db = createAdminClient();
  const { data: niche, error } = await db
    .from("niches")
    .select("id, name, keywords, is_active")
    .eq("slug", slug)
    .single();
  if (error || !niche || !niche.is_active) {
    throw new Error(`Nicho não encontrado: ${slug}`);
  }

  const keywords = (niche.keywords as string[]).slice(
    0,
    MAX_KEYWORDS_PER_NICHE,
  );
  const perKeyword = await Promise.all(
    keywords.map((keyword) => resolveKeywordChannels(keyword, priority)),
  );

  // Round-robin: 1º canal de cada keyword, depois os 2ºs, etc.
  const merged: string[] = [];
  const maxLen = Math.max(...perKeyword.map((list) => list.length), 0);
  for (let i = 0; i < maxLen; i += 1) {
    for (const list of perKeyword) {
      if (list[i]) merged.push(list[i]);
    }
  }

  const channelIds = distinctChannels(merged, maxChannels);

  // Alimenta a malha de afinidade canal↔nicho (doc 5 §5.1) — é ela
  // que torna "canais relacionados" cada vez melhor com o uso.
  // Nota: os canais podem ainda não existir em channels (a coleta vem
  // depois); a FK exige presença, então registra só os já conhecidos
  // e o pipeline completa a malha nas próximas pesquisas do nicho.
  const { data: known } = await db
    .from("channels")
    .select("youtube_id")
    .in("youtube_id", channelIds);
  for (const row of known ?? []) {
    await db.rpc("bump_channel_niche_affinity", {
      p_channel_id: row.youtube_id,
      p_niche_id: niche.id,
    });
  }

  return {
    nicheName: niche.name,
    channelIds,
  };
}

export type KeywordMatchRow = {
  channel_id: string;
  video_id: string | null;
  position: number;
};

/**
 * "Vídeo que casou": para cada canal, o vídeo de melhor posição que o
 * trouxe para a busca (Pré-M9 T5). Ignora linhas sem video_id. Puro —
 * não depende da ordem das linhas.
 */
export function pickBestMatchPerChannel(
  rows: KeywordMatchRow[],
): Map<string, string> {
  const bestVideo = new Map<string, string>();
  const bestPos = new Map<string, number>();
  for (const row of rows) {
    if (!row.video_id) continue;
    const prev = bestPos.get(row.channel_id);
    if (prev === undefined || row.position < prev) {
      bestVideo.set(row.channel_id, row.video_id);
      bestPos.set(row.channel_id, row.position);
    }
  }
  return bestVideo;
}

/**
 * Mapa canal → vídeo que casou com a busca, a partir do corpus de
 * keyword_results (service role — a UI nunca lê direto). As keywords
 * já devem chegar normalizadas (como são gravadas). Zero cota.
 */
export async function matchedVideosByChannel(
  keywords: string[],
): Promise<Map<string, string>> {
  if (keywords.length === 0) return new Map();
  const db = createAdminClient();
  const { data } = await db
    .from("keyword_results")
    .select("channel_id, video_id, position")
    .in("keyword", keywords);
  return pickBestMatchPerChannel(data ?? []);
}

export function distinctChannels(ids: string[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
      if (result.length >= limit) break;
    }
  }
  return result;
}
