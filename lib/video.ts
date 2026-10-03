/**
 * Provider embed resolution for lesson videos.
 *
 * AGENTS.md §7 requires playback to stay on the site through the provider's own
 * player, so this module turns an author's watch URL into an embed URL and
 * nothing else. It never fetches the provider, never proxies the video, and
 * never returns a URL for a host it does not recognise: an unrecognised
 * `lesson.videoUrl` resolves to `null` so the page can show a placeholder
 * rather than an iframe pointing at an arbitrary third party.
 *
 * Only YouTube is implemented. AGENTS.md §9 says a provider counts as supported
 * once both ingestion and playback exist, and the ingestion pipeline has not
 * landed yet, so Vimeo and Bunny playback waits for it. Adding one is a single
 * branch here.
 */

/** A YouTube id is 11 characters of URL-safe base64. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const YOUTUBE_SHORT_HOSTS = new Set(["youtu.be", "www.youtu.be"]);

/** Hosts allowed to supply the player, matched exactly against the parsed URL. */
const ALLOWED_HOSTS = new Set([...YOUTUBE_HOSTS, ...YOUTUBE_SHORT_HOSTS]);

export type VideoEmbed = {
  provider: "youtube";
  src: string;
};

function youtubeId(url: URL): string | null {
  // youtu.be/<id>
  if (YOUTUBE_SHORT_HOSTS.has(url.hostname)) {
    const id = url.pathname.slice(1).split("/")[0] ?? "";
    return YOUTUBE_ID.test(id) ? id : null;
  }

  // /watch?v=<id>
  const queryId = url.searchParams.get("v");
  if (queryId && YOUTUBE_ID.test(queryId)) return queryId;

  // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
  const [, path, candidate] = url.pathname.split("/");
  if (path && YOUTUBE_ID.test(candidate)) return candidate;

  return null;
}

/**
 * Normalises an untrusted `start` value.
 *
 * `start` arrives from the query string, so it is parsed defensively: anything
 * that is not a finite integer, is negative, or sits beyond the lesson's own
 * runtime is discarded and the video opens at 0. Without the runtime cap a
 * hand-edited `?start=` could ask the provider to seek past the end of the
 * video.
 */
export function normalizeStartSeconds(
  value: string | string[] | undefined,
  durationMinutes: number | null | undefined,
): number {
  if (typeof value !== "string") return 0;

  // `Number` rather than `parseInt` so "90abc" is rejected instead of truncated.
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;

  const maxSeconds = Math.max(0, Math.round((durationMinutes ?? 0) * 60));

  return Math.min(Math.floor(seconds), maxSeconds);
}

/**
 * Resolves a lesson's `videoUrl` to a player embed, seeking to `startSeconds`
 * when one was requested. Returns `null` for a missing, malformed or
 * unsupported URL so the caller can render a placeholder.
 */
export function getVideoEmbed(
  videoUrl: string | null | undefined,
  startSeconds = 0,
): VideoEmbed | null {
  if (!videoUrl) return null;

  let url: URL;
  try {
    url = new URL(videoUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!ALLOWED_HOSTS.has(url.hostname)) return null;

  const id = youtubeId(url);
  if (!id) return null;

  // The privacy-enhanced host, so no YouTube cookie is set until the learner
  // interacts with the player. `rel=0` drops the "more videos" suggestions
  // that would otherwise push learners off the platform.
  const embed = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
  embed.searchParams.set("rel", "0");

  if (startSeconds > 0) {
    embed.searchParams.set("start", String(Math.floor(startSeconds)));
  }

  return { provider: "youtube", src: embed.toString() };
}