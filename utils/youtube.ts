/** Limite de duração de um Short em segundos (doc 3 §3.6). */
export const SHORT_MAX_SECONDS = 180;

/**
 * Converte duração ISO 8601 da YouTube API ("PT1H2M10S") em segundos.
 * Retorna null para formatos irreconhecíveis (ex.: lives sem duração).
 */
export function parseIso8601Duration(value: string): number | null {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match || (!match[1] && !match[2] && !match[3])) return null;
  const [, h, m, s] = match;
  return (
    Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0)
  );
}

/** Shorts (≤ 180 s) e vídeos longos nunca se misturam (doc 3 §3.6). */
export function isShortDuration(durationSeconds: number | null): boolean {
  return durationSeconds !== null && durationSeconds <= SHORT_MAX_SECONDS;
}

export type ChannelInput =
  | { kind: "id"; value: string }
  | { kind: "handle"; value: string }
  | { kind: "name"; value: string };

/**
 * Interpreta a entrada do usuário para um canal: ID canônico (UC...),
 * @handle, URLs do YouTube nesses formatos, ou nome livre (resolvido
 * via busca — caro — apenas a partir do M3).
 */
export function parseChannelInput(raw: string): ChannelInput | null {
  const input = raw.trim();
  if (!input) return null;

  const channelId = /^UC[0-9A-Za-z_-]{22}$/;
  if (channelId.test(input)) return { kind: "id", value: input };

  if (input.startsWith("@")) {
    const handle = input.slice(1).trim();
    return handle ? { kind: "handle", value: handle } : null;
  }

  const asUrl = /^https?:\/\//i.test(input) ? input : null;
  if (asUrl) {
    try {
      const url = new URL(asUrl);
      if (!/(^|\.)youtube\.com$/i.test(url.hostname)) return null;
      const path = decodeURIComponent(url.pathname);

      const idMatch = /^\/channel\/(UC[0-9A-Za-z_-]{22})/.exec(path);
      if (idMatch) return { kind: "id", value: idMatch[1] };

      const handleMatch = /^\/@([^/]+)/.exec(path);
      if (handleMatch) return { kind: "handle", value: handleMatch[1] };

      return null;
    } catch {
      return null;
    }
  }

  return { kind: "name", value: input };
}
