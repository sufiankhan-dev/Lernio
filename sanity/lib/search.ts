import "server-only";

import type { SearchResultCardData, SearchResultsPayload } from "@/lib/search-types";
import { dataset, projectId } from "@/sanity/env";
import { client } from "@/sanity/lib/client";
import {
  AGENT_CONTEXT_QUERY,
  SEARCH_HYDRATE_QUERY,
} from "@/sanity/lib/queries";

/**
 * Everything that talks to the Sanity Context MCP lives here.
 *
 * Three rules hold across this module:
 * - The read token and the LLM key never leave the server. The browser never calls
 *   the MCP or the LLM.
 * - The agent contributes ids and ordering. Every string rendered on the results
 *   page is projected here, so an invented id resolves to nothing and is dropped.
 * - Cached context is cached for the process lifetime, so edits to the inline
 *   system prompt only take effect after a server restart.
 */

const MCP_API_VERSION = "v2026-03-03";
const CACHE_TTL_MS = 5 * 60 * 1000;

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
}): string {
  const { initialContext, instructions, maxResults } = input;

  const sections = [
    "You are the search index behind Lernio, a learning platform. A learner types a plain language question and you find the lessons in the course library that answer it.",
    "",
    "## How to search",
    "- Use the groq_query tool to search. Your training data knows nothing about this catalog.",
    '- GROQ has no match() function. Text matching uses the match OPERATOR: title match "*fetch*". It is case-insensitive.',
    '- The wildcards are required. title match "fetch" matches nothing. Always write "*" + $kw + "*".',
    "- Search token by token and OR the tokens together. Never rely on a multi-word phrase as a single pattern.",
    "- Filter a string array with the array form: count(keyPoints[@ match $kw]) > 0.",
    "- notes is Portable Text. pt::text(notes) collapses the whole field into ONE string, so apply the operator to it directly: pt::text(notes) match $kw. Do not wrap it in count() and do not filter it like an array; both silently match nothing.",
    "- Search a few different ways before you conclude: match titles and summaries, then key points, then the notes projection.",
    "- Use at most 4 groq_query calls. Once you have covered those passes, stop querying and answer. Every extra call costs a request against a rate limit and stops you from ever producing an answer.",
    "- Return every lesson that genuinely matches, up to " +
      String(maxResults) +
      ". Do not stop at the first few and do not pad the list with weak matches.",
    "",
    "## How to rank",
    "- Rank by specificity. A title or summary containing the exact concept beats a broad keyword hit in a notes body.",
    "- Prefer lessons whose title matches the concept over lessons that merely mention it in passing.",
    "- Order the array best match first.",
    "",
    "## What you return",
    "- Return only the lessonId and a relevance score for each result.",
    "- Copy each lessonId verbatim from a groq_query result. Never invent, guess, reconstruct or truncate an id.",
    "- Never write a title, summary, duration, course name, module number, lesson number or result count. The app resolves all of that from Sanity itself.",
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
  keyPoints: string[] | null;
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

function toCardData(lesson: HydratedLesson): SearchResultCardData | null {
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
    keyPoints: Array.isArray(lesson.keyPoints)
      ? lesson.keyPoints.filter((point): point is string => typeof point === "string")
      : [],
    courseTitle: lesson.course?.title ?? "",
    courseSlug: lesson.course?.slug ?? "",
    categoryTitle: lesson.course?.category?.title ?? null,
    moduleTitle,
    moduleNumber,
    lessonNumber,
  };
}

/**
 * Turns the agent's ordered id list into renderable cards.
 *
 * Ids that do not resolve are dropped rather than rendered, which is what makes the
 * results page grounded in real data. The count line is computed from what survives,
 * never taken from the model. Order is the model's, capped at `maxResults`.
 */
export async function hydrateSearchResults(
  ids: string[],
  query: string,
  maxResults: number,
): Promise<SearchResultsPayload> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean))).slice(0, maxResults);

  if (uniqueIds.length === 0) {
    return { query, results: [], totalCourses: 0 };
  }

  const lessons = await client.fetch<HydratedLesson[] | null>(
    SEARCH_HYDRATE_QUERY,
    { ids: uniqueIds },
    { perspective: "published" },
  );

  const byId = new Map<string, HydratedLesson>();
  for (const lesson of lessons ?? []) {
    if (lesson?._id) byId.set(lesson._id, lesson);
  }

  const results: SearchResultCardData[] = [];
  for (const id of uniqueIds) {
    const lesson = byId.get(id);
    if (!lesson) continue;

    const card = toCardData(lesson);
    if (card) results.push(card);
  }

  const courseIds = new Set(
    results.map((result) => result.courseSlug).filter(Boolean),
  );

  return { query, results, totalCourses: courseIds.size };
}

export type { AgentContext, HydratedLesson };