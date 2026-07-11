/** Canal como o corpus o entende (mapeado da YouTube Data API). */
export type YouTubeChannel = {
  youtubeId: string;
  handle: string | null;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
  viewCount: number | null;
  uploadsPlaylistId: string | null;
  country: string | null;
  defaultLanguage: string | null;
};

/** Vídeo como o corpus o entende. */
export type YouTubeVideo = {
  youtubeId: string;
  channelId: string;
  title: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
};

export type UploadsPage = {
  items: { videoId: string; publishedAt: string | null }[];
  nextPageToken: string | null;
};

/** Erro estruturado da YouTube Data API. */
export class YouTubeApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly reason: string | null,
  ) {
    super(message);
    this.name = "YouTubeApiError";
  }

  get isQuotaExceeded() {
    return this.reason === "quotaExceeded";
  }

  get isNotFound() {
    return this.status === 404 || this.reason === "playlistNotFound";
  }
}
