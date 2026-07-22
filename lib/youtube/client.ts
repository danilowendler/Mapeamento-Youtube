import { parseIso8601Duration } from "@/utils/youtube";
import {
  YouTubeApiError,
  type UploadsPage,
  type YouTubeChannel,
  type YouTubeVideo,
} from "./types";

const BASE_URL = "https://www.googleapis.com/youtube/v3";

/** Custos de cota por endpoint (doc 3 §3.1). */
export const QUOTA_COSTS = {
  "channels.list": 1,
  "playlistItems.list": 1,
  "videos.list": 1,
  "search.list": 100,
} as const;

async function ytFetch<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY não configurada.");

  const url = new URL(`${BASE_URL}/${endpoint}`);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  url.searchParams.set("key", key);

  const response = await fetch(url);
  if (!response.ok) {
    let reason: string | null = null;
    let message = `YouTube API ${endpoint} respondeu ${response.status}`;
    try {
      const body = await response.json();
      reason = body?.error?.errors?.[0]?.reason ?? null;
      message = body?.error?.message ?? message;
    } catch {
      // corpo não-JSON: mantém a mensagem padrão
    }
    throw new YouTubeApiError(message, response.status, reason);
  }
  return response.json() as Promise<T>;
}

type ChannelResource = {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    customUrl?: string;
    country?: string;
    defaultLanguage?: string;
    thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
  };
  statistics?: {
    subscriberCount?: string;
    videoCount?: string;
    viewCount?: string;
  };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
};

function mapChannel(item: ChannelResource): YouTubeChannel {
  const customUrl = item.snippet?.customUrl ?? null;
  return {
    youtubeId: item.id,
    handle: customUrl?.startsWith("@") ? customUrl.slice(1) : customUrl,
    title: item.snippet?.title ?? "",
    description: item.snippet?.description?.slice(0, 500) ?? null,
    thumbnailUrl:
      item.snippet?.thumbnails?.medium?.url ??
      item.snippet?.thumbnails?.default?.url ??
      null,
    subscriberCount: toNumber(item.statistics?.subscriberCount),
    videoCount: toNumber(item.statistics?.videoCount),
    viewCount: toNumber(item.statistics?.viewCount),
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads ?? null,
    country: item.snippet?.country ?? null,
    defaultLanguage: item.snippet?.defaultLanguage ?? null,
  };
}

function toNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const CHANNEL_PARTS = "snippet,statistics,contentDetails";

/** channels.list por IDs (até 50 por chamada · 1 unidade). */
export async function getChannelsByIds(
  ids: string[],
): Promise<YouTubeChannel[]> {
  if (ids.length === 0) return [];
  if (ids.length > 50) throw new Error("channels.list aceita até 50 IDs.");
  const data = await ytFetch<{ items?: ChannelResource[] }>("channels", {
    part: CHANNEL_PARTS,
    id: ids.join(","),
    maxResults: "50",
  });
  return (data.items ?? []).map(mapChannel);
}

/** channels.list por @handle (1 unidade). Null se não existir. */
export async function getChannelByHandle(
  handle: string,
): Promise<YouTubeChannel | null> {
  const data = await ytFetch<{ items?: ChannelResource[] }>("channels", {
    part: CHANNEL_PARTS,
    forHandle: handle,
  });
  const item = data.items?.[0];
  return item ? mapChannel(item) : null;
}

/** playlistItems.list — uma página de uploads (até 50 · 1 unidade). */
export async function getUploadsPage(
  playlistId: string,
  pageToken?: string,
): Promise<UploadsPage> {
  const params: Record<string, string> = {
    part: "contentDetails",
    playlistId,
    maxResults: "50",
  };
  if (pageToken) params.pageToken = pageToken;

  const data = await ytFetch<{
    items?: {
      contentDetails?: { videoId?: string; videoPublishedAt?: string };
    }[];
    nextPageToken?: string;
  }>("playlistItems", params);

  return {
    items: (data.items ?? [])
      .filter((item) => Boolean(item.contentDetails?.videoId))
      .map((item) => ({
        videoId: item.contentDetails!.videoId!,
        publishedAt: item.contentDetails?.videoPublishedAt ?? null,
      })),
    nextPageToken: data.nextPageToken ?? null,
  };
}

export type SearchHit = {
  videoId: string;
  videoTitle: string;
  channelId: string;
  channelTitle: string;
};

/**
 * search.list — CUSTA 100 UNIDADES. Uso exclusivo do keywordService,
 * que cacheia por 72 h (doc 3 §3.7). Busca vídeos (não canais): os
 * canais que rankeiam para a keyword SÃO os canais do tema.
 */
export async function searchVideosByKeyword(
  query: string,
): Promise<SearchHit[]> {
  const data = await ytFetch<{
    items?: {
      id?: { videoId?: string };
      snippet?: { channelId?: string; channelTitle?: string; title?: string };
    }[];
  }>("search", {
    part: "snippet",
    q: query,
    type: "video",
    maxResults: "50",
    regionCode: "BR",
    relevanceLanguage: "pt",
    order: "relevance",
  });

  return (data.items ?? [])
    .filter((item) => item.id?.videoId && item.snippet?.channelId)
    .map((item) => ({
      videoId: item.id!.videoId!,
      videoTitle: item.snippet?.title ?? "",
      channelId: item.snippet!.channelId!,
      channelTitle: item.snippet?.channelTitle ?? "",
    }));
}

type VideoResource = {
  id: string;
  snippet?: {
    channelId?: string;
    title?: string;
    publishedAt?: string;
    thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
  };
  contentDetails?: { duration?: string };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
};

/** videos.list por IDs (até 50 por chamada · 1 unidade). */
export async function getVideosByIds(ids: string[]): Promise<YouTubeVideo[]> {
  if (ids.length === 0) return [];
  if (ids.length > 50) throw new Error("videos.list aceita até 50 IDs.");
  const data = await ytFetch<{ items?: VideoResource[] }>("videos", {
    part: "snippet,contentDetails,statistics",
    id: ids.join(","),
    maxResults: "50",
  });

  return (data.items ?? []).map((item) => ({
    youtubeId: item.id,
    channelId: item.snippet?.channelId ?? "",
    title: item.snippet?.title ?? "",
    thumbnailUrl:
      item.snippet?.thumbnails?.medium?.url ??
      item.snippet?.thumbnails?.default?.url ??
      null,
    publishedAt: item.snippet?.publishedAt ?? null,
    durationSeconds: item.contentDetails?.duration
      ? parseIso8601Duration(item.contentDetails.duration)
      : null,
    viewCount: toNumber(item.statistics?.viewCount),
    likeCount: toNumber(item.statistics?.likeCount),
    commentCount: toNumber(item.statistics?.commentCount),
  }));
}
