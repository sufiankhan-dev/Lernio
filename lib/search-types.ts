/**
 * Wire types shared by the search route and the search UI.
 *
 * This module deliberately has no imports at all, so a client component can pull
 * from it with `import type` and never pull the AI SDK, the MCP client or Zod into
 * the browser bundle.
 */

export type SearchSort = "relevance" | "newest" | "shortest";

export const SEARCH_SORTS: SearchSort[] = ["relevance", "newest", "shortest"];

export const SEARCH_SORT_LABELS: Record<SearchSort, string> = {
  relevance: "Most Relevant",
  newest: "Newest",
  shortest: "Shortest",
};

/** One fully hydrated lesson, ready to render. Every field came from Sanity. */
export type SearchLessonResult = {
  kind: "lesson";
  lessonId: string;
  lessonSlug: string;
  title: string;
  summary: string;
  /** Minutes, as stored on the lesson document. */
  duration: number | null;
  /** ISO timestamp, used by the "Newest" sort. */
  createdAt: string;
  keyPoints: string[];
  courseTitle: string;
  courseSlug: string;
  categoryTitle: string | null;
  /** Null when the lesson is not reachable from any course module. */
  moduleTitle: string | null;
  moduleNumber: number | null;
  lessonNumber: number | null;
};

/**
 * One fully hydrated video moment: a lesson's video matched at a specific second.
 *
 * Every lesson field repeats here on purpose. A video result is always tied to the
 * lesson that uses that video, so the card needs the same course, module and lesson
 * identity a lesson card carries, plus the moment itself.
 */
export type SearchVideoResult = {
  kind: "video";
  /** The video document's _id. Never a lesson id. */
  videoId: string;
  lessonId: string;
  lessonSlug: string;
  title: string;
  summary: string;
  duration: number | null;
  createdAt: string;
  /** The lesson's poster, used as the card thumbnail. */
  posterUrl: string | null;
  posterAlt: string | null;
  courseTitle: string;
  courseSlug: string;
  categoryTitle: string | null;
  moduleTitle: string | null;
  moduleNumber: number | null;
  lessonNumber: number | null;
  /**
   * The second the lesson page opens at. Always a value that exists in the video
   * document, either as a chapter start or as a transcript chunk start, because
   * hydration drops any moment it cannot resolve against real data.
   */
  startSeconds: number;
};

/**
 * A single ranked result. One array discriminated on `kind`, so the agent's array
 * order is the global ranking across both kinds.
 */
export type SearchResultCardData = SearchLessonResult | SearchVideoResult;

/**
 * What the agent selects, before hydration. Ids plus, for a video, the second it
 * saw in a query result. Every visible value is resolved from Sanity afterwards.
 */
export type SearchSelection =
  | { kind: "lesson"; lessonId: string; relevance: number }
  | { kind: "video"; videoId: string; startSeconds: number; relevance: number };

export type SearchResultsPayload = {
  /** The query as the route received it, trimmed. */
  query: string;
  /** The agent's ordering, already filtered to selections that resolved. */
  results: SearchResultCardData[];
  /** Distinct courses across `results`, computed after dropping. */
  totalCourses: number;
};

export type SearchStatusEvent = {
  type: "status";
  message: string;
};

export type SearchResultsEvent = {
  type: "results";
  payload: SearchResultsPayload;
};

export type SearchErrorEvent = {
  type: "error";
  message: string;
};

export type SearchStreamEvent =
  | SearchStatusEvent
  | SearchResultsEvent
  | SearchErrorEvent;