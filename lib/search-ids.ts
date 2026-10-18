import type { SearchSelection } from "@/lib/search-types";

/**
 * Recovers the agent's selections from a search run.
 *
 * The agent normally answers with the structured `results` array, which
 * `readOutputSelections` reads. But `result.output` is a getter that throws rather
 * than returning undefined, and it throws whenever the agent spends its whole step
 * budget querying and never reaches its answer, which the AI SDK reports as
 * `AI_NoOutputGeneratedError`.
 *
 * `collectSelections` is the fallback for that case: the selections its
 * `groq_query` calls already returned are real, so recovering them turns a hard
 * failure into a working result. Everything recovered still goes through
 * `hydrateSearchResults`, so an id that does not exist is dropped exactly as it
 * would be from the structured path, and a timestamp that matches no chapter or
 * chunk boundary is dropped for the same reason.
 */

/** Guards against a pathological or cyclic tool result stalling the request. */
const MAX_DEPTH = 8;

/**
 * The selections from the agent's structured answer, or an empty list when there is
 * no output. Must be used instead of touching `result.output` directly, because that
 * access throws.
 */
export function readOutputSelections(result: { output?: unknown }): SearchSelection[] {
  let output: unknown;
  try {
    output = result.output;
  } catch {
    return [];
  }

  const results = (output as { results?: unknown } | undefined)?.results;
  if (!Array.isArray(results)) return [];

  const selections: SearchSelection[] = [];

  for (const entry of results) {
    if (!entry || typeof entry !== "object") continue;

    const candidate = entry as {
      kind?: unknown;
      lessonId?: unknown;
      videoId?: unknown;
      startSeconds?: unknown;
      relevance?: unknown;
    };

    const relevance =
      typeof candidate.relevance === "number" && Number.isFinite(candidate.relevance)
        ? candidate.relevance
        : 0;

    if (
      candidate.kind === "lesson" &&
      typeof candidate.lessonId === "string" &&
      candidate.lessonId
    ) {
      selections.push({ kind: "lesson", lessonId: candidate.lessonId, relevance });
      continue;
    }

    if (
      candidate.kind === "video" &&
      typeof candidate.videoId === "string" &&
      candidate.videoId &&
      typeof candidate.startSeconds === "number" &&
      Number.isFinite(candidate.startSeconds)
    ) {
      selections.push({
        kind: "video",
        videoId: candidate.videoId,
        startSeconds: candidate.startSeconds,
        relevance,
      });
    }
  }

  return selections;
}

function pushLesson(found: SearchSelection[], id: string) {
  if (found.some((entry) => entry.kind === "lesson" && entry.lessonId === id)) return;

  // Discovery order is the only ranking signal available on this path, so it is
  // encoded as a descending score to keep the caller's ordering intact.
  found.push({ kind: "lesson", lessonId: id, relevance: 100 - found.length });
}

function pushVideo(found: SearchSelection[], id: string, startSeconds: number) {
  const exists = found.some(
    (entry) => entry.kind === "video" && entry.videoId === id && entry.startSeconds === startSeconds,
  );
  if (exists) return;

  found.push({ kind: "video", videoId: id, startSeconds, relevance: 100 - found.length });
}

/**
 * Collects every numeric `startSeconds` reachable from a value, which is how a
 * projected `hits` array, a bare `chapters` array or a bare `chunks` array is read
 * without caring which one the agent happened to ask for.
 */
function collectSeconds(value: unknown, out: number[], depth: number) {
  if (depth > MAX_DEPTH || value == null) return;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        collectSeconds(JSON.parse(trimmed), out, depth + 1);
      } catch {
        return;
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) collectSeconds(entry, out, depth + 1);
    return;
  }

  if (typeof value !== "object") return;

  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (key === "startSeconds" && typeof entry === "number" && Number.isFinite(entry)) {
      out.push(Math.floor(entry));
    } else {
      collectSeconds(entry, out, depth + 1);
    }
  }
}

/**
 * Walks any tool-result shape and collects lesson ids and video moments.
 *
 * MCP tool results arrive in several shapes (a JSON string, a content array, an
 * already-parsed object), so this recurses rather than assuming one. Only `_id`
 * values prefixed `lesson.` or `video.` are taken, which keeps course and category
 * references out. For a video, every `startSeconds` found alongside its `_id`
 * becomes a candidate second, and hydration decides which of them is real.
 */
export function collectSelections(
  value: unknown,
  found: SearchSelection[] = [],
  depth = 0,
): SearchSelection[] {
  if (depth > MAX_DEPTH || value == null) return found;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return collectSelections(JSON.parse(trimmed), found, depth + 1);
      } catch {
        return found;
      }
    }
    return found;
  }

  if (Array.isArray(value)) {
    for (const entry of value) collectSelections(entry, found, depth + 1);
    return found;
  }

  if (typeof value !== "object") return found;

  const record = value as Record<string, unknown>;
  const id = record._id;

  if (typeof id === "string") {
    if (id.startsWith("lesson.")) {
      pushLesson(found, id);
    } else if (id.startsWith("video.")) {
      const seconds: number[] = [];
      for (const [key, entry] of Object.entries(record)) {
        if (key === "_id") continue;
        collectSeconds(entry, seconds, depth + 1);
      }
      for (const second of seconds) pushVideo(found, id, second);
    }
  }

  for (const [key, entry] of Object.entries(record)) {
    if (key === "_id") continue;
    collectSelections(entry, found, depth + 1);
  }

  return found;
}