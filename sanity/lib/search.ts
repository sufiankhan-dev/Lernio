import "server-only";

import type {
  SearchLessonResult,
  SearchResultCardData,
  SearchResultsPayload,
  SearchSelection,
  SearchVideoResult,
} from "@/lib/search-types";
import { dataset, projectId } from "@/sanity/env";
import { client } from "@/sanity/lib/client";
import {
  AGENT_CONTEXT_QUERY,
  SEARCH_HYDRATE_QUERY,
  SEARCH_VIDEO_LESSONS_QUERY,
  SEARCH_VIDEO_QUERY,
} from "@/sanity/lib/queries";
import { toVideoDocumentId } from "@/lib/video";

/**
 * Everything that talks to the Sanity Context MCP lives here.
 *
 * Four rules hold across this module:
 * - The read token and the LLM key never leave the server. The browser never calls
 *   the MCP or the LLM.
 * - The agent contributes ids, seconds and ordering. Every string rendered on the
 *   results page is projected here, so an invented id resolves to nothing and is
 *   dropped, and a second that matches no chapter or chunk boundary is dropped too.
 * - A video moment resolves in two stages. Chapters first, because their labels are
 *   clean. The transcript only when no chapter matched for that video.
 * - Cached context is cached for the process lifetime, so edits to the inline
 *   system prompt only take effect after a server restart.
 */

const MCP_API_VERSION = "v2026-03-03";
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * How far a reported second may sit from a real boundary and still be accepted.
 *
 * The agent copies `startSeconds` verbatim from a query result, so an exact match is
 * the normal case and five seconds only absorbs the rounding a model occasionally
 * does. It is deliberately far tighter than any real chapter or chunk spacing, so it
 * cannot turn a wrong second into a plausible one.
 */
const SNAP_TOLERANCE_SECONDS = 5;

let cachedInitialContext: string | null = null;
let cacheTimestamp = 0;
let loggedMissingContext = false;

type AgentContext = {
  slug: string;
  groqFilter: string | null;
  instructions: string | null;
};

function readToken(): string {
  const token = process.env.SANITY_API_READ_TOKEN;
  if (!token) {
    throw new Error("SANITY_API_READ_TOKEN is not set");
  }
  return token;
}

/**
 * Composed from the project coordinates rather than pasted as a literal, so the
 * endpoint cannot drift from `sanity/env.ts`. `SANITY_CONTEXT_MCP_URL` still wins
 * when set, which keeps the door open for a different endpoint later.
 */
export function getContextMcpUrl(slug?: string): string {
  const override = process.env.SANITY_CONTEXT_MCP_URL;
  const base = override?.trim()
    ? override.trim()
    : `https://api.sanity.io/${MCP_API_VERSION}/context/mcp/${projectId}/${dataset}`;

  if (!slug) return base;

  return `${base.replace(/\/$/, "")}/${slug}`;
}

function initialContextUrl(mcpUrl: string): string {
  const url = new URL(mcpUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/initial-context`;
  return url.toString();
}

/**
 * Fetches the compressed schema overview once per TTL and injects it into the
 * system prompt, which removes a tool round trip on the first call and keeps the
 * schema prefix stable for prompt caching.
 *
 * Returns null on any failure. A missing schema block costs result quality; it must
 * never take search down.
 */
export async function fetchInitialContext(mcpUrl: string): Promise<string | null> {
  const isStale = Date.now() - cacheTimestamp > CACHE_TTL_MS;

  if (!isStale && cachedInitialContext) return cachedInitialContext;

  try {
    const response = await fetch(initialContextUrl(mcpUrl), {
      headers: { Authorization: `Bearer ${readToken()}` },
      cache: "no-store",
    });

    if (!response.ok) return cachedInitialContext;

    const text = await response.text();
    if (!text) return cachedInitialContext;

    cachedInitialContext = text;
    cacheTimestamp = Date.now();
    return text;
  } catch {
    return cachedInitialContext;
  }
}

/**
 * Reads the Context document that scopes and instructs the agent.
 *
 * Returns null when no slug is configured or no document is published, which is a
 * supported state: the base MCP URL works without a document, and the inline
 * system prompt carries the critical rules on its own.
 */
export async function getAgentContext(): Promise<AgentContext | null> {
  const slug = process.env.SANITY_CONTEXT_SLUG?.trim();
  if (!slug) return null;

  try {
    const context = await client.fetch<AgentContext | null>(
      AGENT_CONTEXT_QUERY,
      { slug },
      { perspective: "published" },
    );

    if (!context && !loggedMissingContext) {
      loggedMissingContext = true;
      console.warn(
        `[search] No published sanity.agentContext with slug "${slug}". Falling back to the base MCP URL and the inline system prompt only.`,
      );
    }

    return context ?? null;
  } catch {
    return null;
  }
}

/**
 * The inline system prompt.
 *
 * `shape-your-agent` argues for less is more, but AGENTS.md §12 notes the model
 * follows the inline system prompt more reliably than the injected Context
 * document. So the critical rules are stated here and repeated as short deltas in
 * the Context document's instructions, and nothing else is duplicated.
 *
 * Built by concatenation rather than a template literal so a stray backtick in the
 * embedded schema block cannot break the build.
 */
export function buildSystemPrompt(input: {
  initialContext: string | null;
  instructions: string | null;
  maxResults: number;
  maxQueries: number;
}): string {
  const { initialContext, instructions, maxResults, maxQueries } = input;

  const sections = [
    "You are the search index behind Lernio, a learning platform. A learner types a plain language question and you find the lessons and the exact moments inside their videos that answer it.",
    "",
    "## How to search",
    "- Use the groq_query tool to search. Your training data knows nothing about this catalog.",
    '- GROQ has no match() function. Text matching uses the match OPERATOR: title match "*fetch*". It is case-insensitive.',
    '- The wildcards are required. title match "fetch" matches nothing. Always write "*" + $kw + "*".',
    "- Search token by token and OR the tokens together. Never rely on a multi-word phrase as a single pattern.",
    "- Filtering an array of objects needs the @. accessor: chapters[@.label match $kw], not chapters[@ label match $kw], which is a parse error.",
    "- Filter a string array with the array form: count(keyPoints[@ match $kw]) > 0.",
    "- notes is Portable Text. pt::text(notes) collapses the whole field into ONE string, so apply the operator to it directly: pt::text(notes) match $kw. Do not wrap it in count() and do not filter it like an array; both silently match nothing.",
    "- Search a few different ways before you conclude: match titles and summaries, then key points, then the notes projection.",
    "- Use at most " +
      String(maxQueries) +
      " groq_query calls. Once you have covered those passes, stop querying and answer. Every extra call costs a request against a rate limit and stops you from ever producing an answer.",
    "- Return every lesson and every video moment that genuinely matches, up to " +
      String(maxResults) +
      ". Do not stop at the first few and do not pad the list with weak matches.",
    "",
    "## How to match a video, in two stages",
    "A video document holds the intelligence for one lesson's video. Match it in two stages, in this order.",
    "1. Chapters first. A video has a chapters array whose labels are clean. Filter it with count(chapters[@.label match $kw]) > 0 and project chapters[@.label match $kw]{startSeconds, label}.",
    "2. The transcript only as a fallback. Most videos have no chapters at all, so when a video produced no matching chapter, match its transcript with count(chunks[@.text match $kw]) > 0 and project chunks[@.text match $kw]{startSeconds, text}.",
    "- Project only the entries that matched. Never select a whole chapters or chunks array to read it: a full transcript overflows the context window.",
    "- A video document is an internal lookup and is never a result on its own. Every video moment you return must be tied to the lesson that uses that video, so also select the lesson's title and slug alongside the moment.",
    "",
    "## How to rank",
    "- Rank by specificity. A title, summary or chapter label containing the exact concept beats a broad keyword hit in a notes body or a transcript.",
    "- Prefer a lesson or a chapter that matches the concept over one that merely mentions it in passing.",
    "- A chapter match outranks a transcript match for the same video, because the label is the author or provider's own description of that moment.",
    "- Order the array best match first.",
    "",
    "## What you return",
    "- Return only the kind, the id, a relevance score, and for a video the matched second.",
    '- For a lesson: kind "lesson" and its lessonId. For a moment: kind "video", its videoId, and startSeconds.',
    "- Copy every id and every startSeconds verbatim from a groq_query result. Never invent, guess, reconstruct, round or estimate an id or a timestamp.",
    "- Never write a title, summary, duration, course name, module number, lesson number, thumbnail or result count. The app resolves all of that from Sanity itself.",
    "- Return an empty array when nothing in the library matches. An empty result is correct; a fabricated one is not.",
    "",
    "## When nothing fits",
    "- Say so by returning an empty array. Do not offer a near miss as if it were a match.",
  ];

  if (instructions) {
    sections.push(
      "",
      "## Dataset notes from the content owner",
      "These notes come from the Sanity Context document and describe how this particular dataset is shaped. They override any assumption you would otherwise make from the schema alone.",
      "",
      instructions,
    );
  }

  if (initialContext) {
    sections.push(
      "",
      "## Schema reference",
      "A compressed overview of the dataset. Read it to write correct queries. Do not restate it back to the learner.",
      "",
      initialContext,
    );
  }

  return sections.join("\n");
}

type HydratedLesson = {
  _id: string;
  _createdAt: string;
  title: string | null;
  slug: string | null;
  summary: string | null;
  duration: number | null;
  videoUrl: string | null;
  keyPoints: string[] | null;
  poster: {
    alt: string | null;
    asset: { url: string | null } | null;
  } | null;
  course: {
    _id: string;
    title: string | null;
    slug: string | null;
    category: { title: string | null } | null;
    modules: Array<{
      title: string | null;
      lessons: Array<{ _id: string } | null> | null;
    }> | null;
  } | null;
};

/** A video document as `SEARCH_VIDEO_QUERY` projects it. */
type HydratedVideo = {
  _id: string;
  url: string | null;
  chapters: Array<{
    startSeconds: number | null;
    label: string | null;
  }> | null;
  /** Transcript boundaries only. The chunk text is never projected. */
  chunkStarts: number[] | null;
};

/**
 * A reported second that has been confirmed against real video data.
 *
 * `source` records which stage resolved it. It is used for logging and for
 * precedence, never rendered: the reference's video card has nowhere to show it.
 */
type ResolvedMoment = {
  startSeconds: number;
  source: "chapter" | "transcript";
  label: string | null;
};

/**
 * The nearest boundary to `requested`, or null when nothing is close enough.
 *
 * Exact equality wins over proximity, so a verbatim `startSeconds` copied out of a
 * query result always resolves to itself and never to a neighbouring entry.
 */
function nearestBoundary(
  requested: number,
  boundaries: number[],
): number | null {
  let best: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const boundary of boundaries) {
    const distance = Math.abs(boundary - requested);
    if (distance === 0) return boundary;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = boundary;
    }
  }

  return bestDistance <= SNAP_TOLERANCE_SECONDS ? best : null;
}

/**
 * Confirms the second the agent reported against the video document.
 *
 * This is where two-stage timestamp resolution actually happens. Chapters are checked
 * first because their labels are clean and they are the moment a human would name.
 * The transcript is the noisier backstop and is only consulted when no chapter is
 * close enough, which is the common case: 57 of the 120 seeded videos have chapters
 * at all, so the other 63 are reachable only through the transcript.
 *
 * Returning null is the grounding guarantee for timestamps. A second that matches
 * neither a chapter nor a chunk boundary does not exist in that video, so the moment
 * is dropped rather than rendered.
 *
 * Pure, so it can be exercised directly without a server or a dataset.
 */
export function resolveVideoMoment(
  video: HydratedVideo,
  requestedSeconds: number,
): ResolvedMoment | null {
  if (!Number.isFinite(requestedSeconds) || requestedSeconds < 0) return null;

  const requested = Math.floor(requestedSeconds);

  const chapters = (video.chapters ?? [])
    .map((chapter) => ({
      startSeconds:
        typeof chapter?.startSeconds === "number" ? Math.floor(chapter.startSeconds) : null,
      label: typeof chapter?.label === "string" ? chapter.label : null,
    }))
    .filter(
      (chapter): chapter is { startSeconds: number; label: string | null } =>
        chapter.startSeconds !== null,
    );

  for (const chapter of chapters) {
    if (chapter.startSeconds === requested) {
      return { startSeconds: chapter.startSeconds, source: "chapter", label: chapter.label };
    }
  }

  const chapterStart = nearestBoundary(requested, chapters.map((chapter) => chapter.startSeconds));
  if (chapterStart !== null) {
    const chapter = chapters.find((entry) => entry.startSeconds === chapterStart);
    return { startSeconds: chapterStart, source: "chapter", label: chapter?.label ?? null };
  }

  const chunkStarts = (video.chunkStarts ?? []).filter(
    (start): start is number => typeof start === "number" && Number.isFinite(start),
  );

  for (const start of chunkStarts) {
    if (Math.floor(start) === requested) {
      return { startSeconds: requested, source: "transcript", label: null };
    }
  }

  const chunkStart = nearestBoundary(
    requested,
    chunkStarts.map((start) => Math.floor(start)),
  );

  if (chunkStart !== null) {
    return { startSeconds: chunkStart, source: "transcript", label: null };
  }

  return null;
}

/**
 * Walks `course.modules[]` to locate the module holding a lesson.
 *
 * Module and lesson numbers are derived from array order, never stored, so this is
 * the only place they can come from. A lesson with no course, or one no module
 * references, keeps nulls rather than failing, and the card renders without the
 * module line.
 */
function locateLesson(
  lessonId: string,
  course: HydratedLesson["course"],
): { moduleTitle: string | null; moduleNumber: number | null; lessonNumber: number | null } {
  const modules = course?.modules;
  if (!Array.isArray(modules)) {
    return { moduleTitle: null, moduleNumber: null, lessonNumber: null };
  }

  for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex += 1) {
    const lessons = modules[moduleIndex]?.lessons;
    if (!Array.isArray(lessons)) continue;

    const lessonIndex = lessons.findIndex(
      (entry) => entry && entry._id === lessonId,
    );
    if (lessonIndex === -1) continue;

    return {
      moduleTitle: modules[moduleIndex]?.title ?? null,
      moduleNumber: moduleIndex + 1,
      lessonNumber: lessonIndex + 1,
    };
  }

  return { moduleTitle: null, moduleNumber: null, lessonNumber: null };
}

/**
 * The lesson fields every card shape shares.
 *
 * A video card repeats the whole lesson identity because a moment is only ever
 * rendered as a moment of a specific lesson, at a specific point in its course.
 */
type LessonCardFields = {
  lessonId: string;
  lessonSlug: string;
  title: string;
  summary: string;
  duration: number | null;
  createdAt: string;
  courseTitle: string;
  courseSlug: string;
  categoryTitle: string | null;
  moduleTitle: string | null;
  moduleNumber: number | null;
  lessonNumber: number | null;
};

function toLessonFields(lesson: HydratedLesson): LessonCardFields | null {
  // A card without a slug cannot link anywhere, so it is not a usable result.
  if (!lesson.slug) return null;

  const { moduleTitle, moduleNumber, lessonNumber } = locateLesson(
    lesson._id,
    lesson.course,
  );

  return {
    lessonId: lesson._id,
    lessonSlug: lesson.slug,
    title: lesson.title ?? "",
    summary: lesson.summary ?? "",
    duration: typeof lesson.duration === "number" ? lesson.duration : null,
    createdAt: lesson._createdAt ?? "",
    courseTitle: lesson.course?.title ?? "",
    courseSlug: lesson.course?.slug ?? "",
    categoryTitle: lesson.course?.category?.title ?? null,
    moduleTitle,
    moduleNumber,
    lessonNumber,
  };
}

function toLessonResult(lesson: HydratedLesson): SearchLessonResult | null {
  const fields = toLessonFields(lesson);
  if (!fields) return null;

  return {
    kind: "lesson",
    ...fields,
    keyPoints: Array.isArray(lesson.keyPoints)
      ? lesson.keyPoints.filter((point): point is string => typeof point === "string")
      : [],
  };
}

function toVideoResult(
  videoId: string,
  lesson: HydratedLesson,
  moment: ResolvedMoment,
): SearchVideoResult | null {
  const fields = toLessonFields(lesson);
  if (!fields) return null;

  return {
    kind: "video",
    videoId,
    ...fields,
    posterUrl: lesson.poster?.asset?.url ?? null,
    posterAlt: lesson.poster?.alt ?? null,
    startSeconds: moment.startSeconds,
  };
}

/** One moment candidate, before per-video precedence picks a winner. */
type MomentCandidate = {
  videoId: string;
  moment: ResolvedMoment;
  relevance: number;
  /** Position in the agent's array, so ties fall back to its ordering. */
  order: number;
};

/**
 * Picks at most one moment per video.
 *
 * Chapter precedence is enforced here rather than trusted to the prompt. When the
 * agent reports several hits for one video, a chapter-derived hit beats a
 * transcript-derived one no matter how the two were scored, because the chapter label
 * is the clean description of that moment and the transcript is the noisy backstop.
 * Ties break on relevance, then on the agent's own ordering.
 */
function pickMomentsPerVideo(candidates: MomentCandidate[]): Map<string, MomentCandidate> {
  const best = new Map<string, MomentCandidate>();

  for (const candidate of candidates) {
    const current = best.get(candidate.videoId);
    if (!current) {
      best.set(candidate.videoId, candidate);
      continue;
    }

    const candidateIsChapter = candidate.moment.source === "chapter";
    const currentIsChapter = current.moment.source === "chapter";

    const wins =
      (candidateIsChapter && !currentIsChapter) ||
      (candidateIsChapter === currentIsChapter &&
        (candidate.relevance > current.relevance ||
          (candidate.relevance === current.relevance && candidate.order < current.order)));

    if (wins) best.set(candidate.videoId, candidate);
  }

  return best;
}

/**
 * Turns the agent's ordered selections into renderable cards.
 *
 * Selections that do not resolve are dropped rather than rendered, which is what makes
 * the results page grounded in real data: an invented lesson or video id resolves to
 * nothing, and an invented second resolves to no chapter or chunk boundary. The count
 * line is computed from what survives, never taken from the model. Order is the
 * model's, capped at `maxResults`.
 */
export async function hydrateSearchResults(
  selections: SearchSelection[],
  query: string,
  maxResults: number,
): Promise<SearchResultsPayload> {
  const lessonIds: string[] = [];
  const videoIds: string[] = [];
  const requestedSeconds = new Map<string, number[]>();

  for (const selection of selections) {
    if (selection.kind === "lesson") {
      if (!lessonIds.includes(selection.lessonId)) lessonIds.push(selection.lessonId);
      continue;
    }

    if (!videoIds.includes(selection.videoId)) videoIds.push(selection.videoId);

    const existing = requestedSeconds.get(selection.videoId);
    if (existing) {
      if (!existing.includes(selection.startSeconds)) existing.push(selection.startSeconds);
    } else {
      requestedSeconds.set(selection.videoId, [selection.startSeconds]);
    }
  }

  if (lessonIds.length === 0 && videoIds.length === 0) {
    return { query, results: [], totalCourses: 0 };
  }

  const relevanceByVideoId = new Map<string, number>();

  selections.forEach((selection, index) => {
    if (selection.kind !== "video") return;
    if (relevanceByVideoId.has(selection.videoId)) return;

    relevanceByVideoId.set(selection.videoId, selection.relevance ?? 100 - index);
  });

  const lessonsPromise =
    lessonIds.length > 0
      ? client.fetch<HydratedLesson[] | null>(
          SEARCH_HYDRATE_QUERY,
          { ids: lessonIds.slice(0, maxResults) },
          { perspective: "published" },
        )
      : Promise.resolve<HydratedLesson[] | null>(null);

  const videosPromise =
    videoIds.length > 0
      ? client.fetch<HydratedVideo[] | null>(
          SEARCH_VIDEO_QUERY,
          { ids: videoIds.slice(0, maxResults) },
          { perspective: "published" },
        )
      : Promise.resolve<HydratedVideo[] | null>(null);

  const [lessons, videos] = await Promise.all([lessonsPromise, videosPromise]);

  const lessonById = new Map<string, HydratedLesson>();
  for (const lesson of lessons ?? []) {
    if (lesson?._id) lessonById.set(lesson._id, lesson);
  }

  const videoList = (videos ?? []).filter((video): video is HydratedVideo => !!video?._id);

  // The reverse half of the join: a video result is always tied to the lesson that
  // uses that video, so the lessons are fetched by the videos' stored URLs.
  const videoUrls = videoList
    .map((video) => video.url)
    .filter((url): url is string => typeof url === "string" && url.length > 0);

  const videoLessons =
    videoUrls.length > 0
      ? await client.fetch<HydratedLesson[] | null>(
          SEARCH_VIDEO_LESSONS_QUERY,
          { urls: videoUrls },
          { perspective: "published" },
        )
      : null;

  const lessonByUrl = new Map<string, HydratedLesson>();
  const lessonByDerivedVideoId = new Map<string, HydratedLesson>();

  for (const lesson of videoLessons ?? []) {
    if (!lesson?._id) continue;
    if (lesson.videoUrl) lessonByUrl.set(lesson.videoUrl, lesson);
    const derived = toVideoDocumentId(lesson.videoUrl);
    if (derived) lessonByDerivedVideoId.set(derived, lesson);
  }

  const candidates: MomentCandidate[] = [];
  let droppedMoments = 0;

  for (const video of videoList) {
    const seconds = requestedSeconds.get(video._id);
    if (!seconds || seconds.length === 0) continue;

    const lesson = lessonByUrl.get(video.url ?? "") ?? lessonByDerivedVideoId.get(video._id);
    if (!lesson) continue;

    for (const second of seconds) {
      const moment = resolveVideoMoment(video, second);
      if (!moment) {
        droppedMoments += 1;
        continue;
      }

      candidates.push({
        videoId: video._id,
        moment,
        relevance: relevanceByVideoId.get(video._id) ?? 0,
        order: videoIds.indexOf(video._id),
      });
    }
  }

  const winners = pickMomentsPerVideo(candidates);

  if (candidates.length > 0 || droppedMoments > 0) {
    const chapterCount = [...winners.values()].filter(
      (candidate) => candidate.moment.source === "chapter",
    ).length;
    console.log(
      `[search] resolved ${winners.size} moments (${chapterCount} chapter, ${winners.size - chapterCount} transcript), dropped ${droppedMoments}`,
    );
  }

  const videoResults = new Map<string, SearchVideoResult>();
  for (const [videoId, candidate] of winners) {
    const video = videoList.find((entry) => entry._id === videoId);
    const lesson = video ? lessonByUrl.get(video.url ?? "") ?? lessonByDerivedVideoId.get(videoId) : null;
    if (!video || !lesson) continue;

    const card = toVideoResult(videoId, lesson, candidate.moment);
    if (card) videoResults.set(videoId, card);
  }

  const results: SearchResultCardData[] = [];
  const seenLessonIds = new Set<string>();

  for (const selection of selections) {
    if (results.length >= maxResults) break;

    if (selection.kind === "lesson") {
      if (seenLessonIds.has(selection.lessonId)) continue;

      const lesson = lessonById.get(selection.lessonId);
      if (!lesson) continue;

      const card = toLessonResult(lesson);
      if (!card) continue;

      seenLessonIds.add(selection.lessonId);
      results.push(card);
      continue;
    }

    // One card per video, placed at the video's first appearance.
    if (seenLessonIds.has(selection.videoId)) continue;

    const card = videoResults.get(selection.videoId);
    if (!card) continue;

    seenLessonIds.add(selection.videoId);
    results.push(card);
  }

  const courseSlugs = new Set(
    results.map((result) => result.courseSlug).filter(Boolean),
  );

  return { query, results, totalCourses: courseSlugs.size };
}

export type { AgentContext, HydratedLesson, HydratedVideo, ResolvedMoment };