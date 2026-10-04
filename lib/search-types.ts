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
export type SearchResultCardData = {
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

export type SearchResultsPayload = {
  /** The query as the route received it, trimmed. */
  query: string;
  /** The model's ordering, already filtered to ids that resolved. */
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