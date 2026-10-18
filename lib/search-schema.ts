import { z } from "zod";

/**
 * The shape the search agent must answer with.
 *
 * Three rules shape this deliberately.
 *
 * Ids and seconds only. The agent contributes which lessons and which video moments
 * are relevant, and in what order. Every visible string on the results page is read
 * from Sanity by `hydrateSearchResults`, so a hallucinated id resolves to nothing and
 * is dropped rather than rendered. A hallucinated timestamp is checked against the
 * video document and dropped for the same reason.
 *
 * One interleaved array. A single ranked list is what the results page renders and
 * what AGENTS.md §11 asks for, so both kinds share one array rather than arriving in
 * two buckets that would need re-merging without a cross-kind ranking signal.
 *
 * Flat, and built with `z.union` rather than `z.discriminatedUnion`. This is not a
 * style choice. `z.discriminatedUnion` compiles to JSON Schema `oneOf`, and OpenAI's
 * structured output rejects `oneOf` outright with
 * `Invalid schema for response_format 'response': In context=('properties',
 * 'results', 'items'), 'oneOf' is not permitted.` `z.union` compiles to `anyOf`,
 * which is accepted, and the `kind` literal still tells the model which variant to
 * fill. Verified against the live API against both shapes; do not "simplify" this
 * back to `discriminatedUnion`.
 *
 * The route sends the user query to the model in the user message, never
 * interpolated into the system prompt.
 */
const lessonSelection = z.object({
  kind: z.literal("lesson"),
  lessonId: z
    .string()
    .describe(
      "The exact _id of a lesson returned by groq_query. Copy it verbatim. Never invent an id.",
    ),
  relevance: z
    .number()
    .describe("0 to 100. How strongly this lesson answers the learner's query."),
});

const videoSelection = z.object({
  kind: z.literal("video"),
  videoId: z
    .string()
    .describe(
      "The exact _id of a video document returned by groq_query. Copy it verbatim. Never invent an id.",
    ),
  startSeconds: z
    .number()
    .describe(
      "The exact startSeconds of the chapter or transcript entry that matched, copied from a groq_query result. Never invent, round or estimate a timestamp.",
    ),
  relevance: z
    .number()
    .describe("0 to 100. How strongly this moment answers the learner's query."),
});

export const searchOutputSchema = z.object({
  // `z.union`, not `z.discriminatedUnion`. See the note above: the latter emits
  // `oneOf`, which OpenAI refuses.
  results: z
    .array(z.union([lessonSelection, videoSelection]))
    .describe(
      "Every relevant lesson and video moment, best match first, interleaved into one ranked list. Do not truncate to a handful.",
    ),
});

/**
 * The most results a single search returns.
 *
 * AGENTS.md requires returning all relevant matches rather than a handful, so this
 * is deliberately well above the handful a model would settle for. The number is
 * stated in the system prompt so the agent's list and this truncation agree.
 */
export const MAX_SEARCH_RESULTS = 40;

/**
 * How many `groq_query` calls the agent is allowed before it must answer.
 *
 * Video matching needs more calls than lesson matching: a lesson query is one pass
 * over one type, while matching a moment takes a chapters pass, a transcript pass and
 * a join back to the lesson. The previous round recorded the model spending its whole
 * step budget querying and never emitting its structured output, so the budget rises
 * here and `MAX_STEPS` in the route rises with it.
 */
export const MAX_SEARCH_QUERIES = 6;

/**
 * Guards the request body before anything reaches the model.
 *
 * Sorting is deliberately absent. It is a view concern applied client-side to the
 * hydrated array, so changing it must not cost a second model round trip.
 */
export const searchRequestSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Enter something to search for.")
    .max(200, "Keep the search under 200 characters."),
});

export type SearchOutput = z.infer<typeof searchOutputSchema>;