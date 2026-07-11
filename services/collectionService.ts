import { createAdminClient } from "@/lib/supabase/admin";
import {
  getChannelByHandle,
  getChannelsByIds,
  getUploadsPage,
  getVideosByIds,
} from "@/lib/youtube/client";
import * as channelRepo from "@/repositories/channelRepo";
import * as videoRepo from "@/repositories/videoRepo";
import { parseChannelInput } from "@/utils/youtube";
import { decideFreshness } from "./freshness";
import { reserveQuota, type QuotaPriorityValue } from "./quotaService";

/**
 * Profundidade de coleta (doc 3 §3.5, adaptativa desde o M4):
 * a DESCOBERTA (playlistItems, 1 un/página) pagina até achar um
 * mínimo de vídeos ELEGÍVEIS para baseline (≥ 14 dias), com teto de
 * 20 páginas (1.000 vídeos). A BUSCA DE MÉTRICAS (videos.list) cobre
 * só o que importa: os 200 mais recentes + os elegíveis, até 500.
 * Canais de altíssima frequência (ex.: CazéTV, ~35 uploads/dia) têm
 * centenas de vídeos "quentes demais" que não recebem score — pagar
 * métricas deles seria cota desperdiçada.
 */
export const BASE_VIDEOS_PER_CHANNEL = 200;
export const MAX_VIDEOS_FETCH = 500;
export const MIN_ELIGIBLE_VIDEOS = 50;
const MAX_DISCOVERY_PAGES = 20;
const PAGE_SIZE = 50;
const ELIGIBLE_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export class ChannelNotFoundError extends Error {
  constructor(input: string) {
    super(`Canal não encontrado: ${input}`);
    this.name = "ChannelNotFoundError";
  }
}

export type CollectionResult = {
  channelId: string;
  mode: "full" | "incremental" | "cache_hit";
  videosUpserted: number;
  quotaUnitsSpent: number;
};

/**
 * Coleta (ou recoleta) um canal a partir de ID, @handle ou URL,
 * respeitando a política de frescor (doc 3 §3.3) e o orçamento de
 * cota (doc 3 §3.4). Idempotente: upserts por ID do YouTube.
 *
 * Custos típicos: cache hit por ID = 0 unidades; canal frio de 200
 * vídeos ≈ 9 unidades; recoleta incremental ≈ 3–6 unidades.
 */
export async function collectChannel(
  input: string,
  priority: QuotaPriorityValue,
): Promise<CollectionResult> {
  const parsed = parseChannelInput(input);
  if (!parsed) throw new ChannelNotFoundError(input);
  if (parsed.kind === "name") {
    throw new Error(
      "Resolução por nome usa busca (100 unidades) e será habilitada no M3.",
    );
  }

  let unitsSpent = 0;
  const spend = async (
    operation: Parameters<typeof reserveQuota>[0],
  ): Promise<void> => {
    await reserveQuota(operation, priority);
    unitsSpent += operation === "search.list" ? 100 : 1;
  };

  // 1 · Cache hit por ID não custa nada (handle exige 1 unidade p/ resolver)
  if (parsed.kind === "id") {
    const known = await channelRepo.findById(parsed.value);
    if (isServableFromCache(known)) {
      return cacheHit(known!.youtube_id);
    }
  }

  // 2 · Dados atuais do canal na API (1 unidade)
  await spend("channels.list");
  const channel =
    parsed.kind === "id"
      ? ((await getChannelsByIds([parsed.value]))[0] ?? null)
      : await getChannelByHandle(parsed.value);
  if (!channel) throw new ChannelNotFoundError(input);
  if (!channel.uploadsPlaylistId) {
    throw new ChannelNotFoundError(
      `${input} não tem playlist de uploads acessível.`,
    );
  }

  // Handle resolvido: se o canal já está fresco no corpus, servir cache.
  const existing = await channelRepo.findById(channel.youtubeId);
  if (parsed.kind === "handle" && isServableFromCache(existing)) {
    return { ...cacheHit(channel.youtubeId), quotaUnitsSpent: unitsSpent };
  }

  const mode: "full" | "incremental" = existing?.refreshed_at
    ? "incremental"
    : "full";

  await channelRepo.upsertFromApi(channel, "collecting");
  const jobId = await startJob(channel.youtubeId, mode);

  try {
    // 3 · DESCOBERTA: pagina a playlist de uploads (1 unidade/página)
    // até ter MIN_ELIGIBLE_VIDEOS elegíveis ou bater o teto de páginas.
    // No modo incremental, para na primeira página sem vídeos novos.
    const knownIds = await videoRepo.getKnownIds(channel.youtubeId);
    const discoveredIds: string[] = [];
    const eligibleIds: string[] = [];
    const eligibleCutoff = Date.now() - ELIGIBLE_AGE_MS;
    let pageToken: string | undefined;

    const basePages = BASE_VIDEOS_PER_CHANNEL / PAGE_SIZE;

    for (let page = 0; page < MAX_DISCOVERY_PAGES; page += 1) {
      await spend("playlistItems.list");
      const result = await getUploadsPage(
        channel.uploadsPlaylistId,
        pageToken,
      );
      for (const item of result.items) {
        discoveredIds.push(item.videoId);
        if (
          item.publishedAt &&
          new Date(item.publishedAt).getTime() <= eligibleCutoff
        ) {
          eligibleIds.push(item.videoId);
        }
      }

      const pageHasOnlyKnown =
        mode === "incremental" &&
        result.items.every((item) => knownIds.has(item.videoId));
      const pastBaseDepth = page + 1 >= basePages;
      const hasEnoughEligible = eligibleIds.length >= MIN_ELIGIBLE_VIDEOS;

      if (!result.nextPageToken || pageHasOnlyKnown) break;
      if (pastBaseDepth && hasEnoughEligible) break;
      pageToken = result.nextPageToken;
    }

    // 4 · MÉTRICAS: só o que importa — 200 mais recentes (contexto e
    // futuro frescor) + todos os elegíveis (matéria-prima do baseline)
    // + conhecidos no modo incremental (refresh), até o teto de 500.
    const toFetch = new Set([
      ...discoveredIds.slice(0, BASE_VIDEOS_PER_CHANNEL),
      ...eligibleIds,
    ]);
    if (mode === "incremental") {
      const recentKnown = await videoRepo.getRecentIds(
        channel.youtubeId,
        BASE_VIDEOS_PER_CHANNEL,
      );
      for (const id of recentKnown) toFetch.add(id);
    }
    const ids = [...toFetch].slice(0, MAX_VIDEOS_FETCH);

    // 5 · Métricas em lotes de 50 (1 unidade/lote) + upsert idempotente
    let videosUpserted = 0;
    for (let start = 0; start < ids.length; start += PAGE_SIZE) {
      await spend("videos.list");
      const videos = await getVideosByIds(ids.slice(start, start + PAGE_SIZE));
      videosUpserted += await videoRepo.upsertFromApi(videos);
    }

    // 6 · Fechar: canal pronto, frescor renovado, job contabilizado
    await channelRepo.markStatus(channel.youtubeId, "ready", {
      touchRefreshedAt: true,
    });
    await finishJob(jobId, "completed", { videosUpserted, unitsSpent });

    return {
      channelId: channel.youtubeId,
      mode,
      videosUpserted,
      quotaUnitsSpent: unitsSpent,
    };
  } catch (error) {
    await channelRepo.markStatus(channel.youtubeId, "failed");
    await finishJob(jobId, "failed", {
      unitsSpent,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function isServableFromCache(
  channel: Awaited<ReturnType<typeof channelRepo.findById>>,
): boolean {
  return (
    channel?.collection_status === "ready" &&
    decideFreshness(
      channel.refreshed_at ? new Date(channel.refreshed_at) : null,
    ) === "fresh"
  );
}

function cacheHit(channelId: string): CollectionResult {
  return {
    channelId,
    mode: "cache_hit",
    videosUpserted: 0,
    quotaUnitsSpent: 0,
  };
}

async function startJob(
  channelId: string,
  mode: "full" | "incremental",
): Promise<string> {
  const { data, error } = await createAdminClient()
    .from("collection_jobs")
    .insert({ channel_id: channelId, mode })
    .select("id")
    .single();
  if (error) throw new Error(`collection_jobs.insert: ${error.message}`);
  return data.id;
}

async function finishJob(
  jobId: string,
  status: "completed" | "failed",
  details: { videosUpserted?: number; unitsSpent: number; error?: string },
): Promise<void> {
  const { error } = await createAdminClient()
    .from("collection_jobs")
    .update({
      status,
      videos_upserted: details.videosUpserted ?? null,
      quota_units_spent: details.unitsSpent,
      error: details.error ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (error) throw new Error(`collection_jobs.update: ${error.message}`);
}
