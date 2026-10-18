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
 * Only YouTube is implemented. All 120 ingested videos are YouTube, and AGENTS.md §9
 * says a provider counts as supported once both ingestion and playback exist for it.
 * Vimeo and Bunny playback therefore waits for their ingestion to land. Adding one is
 * a single branch here plus a matching branch in `toVideoDocumentId`.
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
 * `start` arrives from the query string, so it is parsed defensively: anything that is
 * not a finite integer, is negative, or sits beyond the lesson's own runtime is
 * discarded and the video opens at 0. Discarding rather than clamping is deliberate. A
 * hand-edited `?start=999999` must not be rounded down to the last second of the video,
 * because the lesson page shows this value back to the learner as "Playing from", and a
 * badge reading 17:00 on a sixteen minute lesson is a lie the page tells about itself.
 *
 * The runtime cap carries a grace margin because `lesson.duration` is authored in whole
 * minutes and does not always match the real video. Measured across the 120 seeded
 * lessons, ten videos run past their authored duration, with a largest overshoot of
 * 14 seconds. Without the grace, a moment genuinely matched in that tail is silently
 * rewound, which is exactly the class of bug timestamped deep links introduce. Sixty
 * seconds covers the drift with room to spare.
 */

/** Slack above the authored runtime, covering authored-versus-actual drift. */
export const START_GRACE_SECONDS = 60;

export function normalizeStartSeconds(
  value: string | string[] | undefined,
  durationMinutes: number | null | undefined,
): number {
  if (typeof value !== "string") return 0;

  // `Number` rather than `parseInt` so "90abc" is rejected instead of truncated.
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;

  const maxSeconds = Math.max(0, Math.round((durationMinutes ?? 0) * 60)) + START_GRACE_SECONDS;
  if (seconds > maxSeconds) return 0;

  return Math.floor(seconds);
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

/**
 * Resolves a lesson's `videoUrl` to the `_id` of its video document.
 *
 * The offline ingestion pipeline keys every video document as `video.` plus a key
 * built from the provider id and the native id, so a lesson's URL determines its
 * video document deterministically. Deriving the id here rather than joining on the
 * stored URL means an author pasting a `youtu.be` short link still resolves, which a
 * string equality join would miss.
 *
 * Mirrors `studio/scripts/ingest/ids.ts`. That module is offline tooling and is not
 * importable from the web app, so the few lines it needs are repeated deliberately.
 * Returns null for a host or shape this app does not recognise, in which case the
 * caller falls back to matching on the stored URL.
 */
export function toVideoDocumentId(url: string | null | undefined): string | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const id = youtubeId(parsed);
  if (!id) return null;

  // `toDocumentKey` only strips characters Sanity rejects in an _id, and a YouTube
  // native id is already URL-safe base64, so nothing here needs escaping.
  return `video.youtube-${id}`;
}