import { z } from "zod";

/**
 * The shape the search agent must answer with.
 *
 * Two rules shape this deliberately.
 *
 * Ids only. The agent contributes which lessons are relevant and in what order.
 * Every visible string on the results page is read from Sanity by
 * `hydrateSearchResults`, so a hallucinated id resolves to nothing and is dropped
 * rather than rendered. This is how the grounding requirement is enforced rather
 * than merely requested.
 *
 * Flat. Google's structured output rejects large or deeply nested schemas, so this
 * stays two scalars per item. The route sends the user query to the model in the
 * user message, never interpolated into the system prompt.
 */
export const searchOutputSchema = z.object({
  results: z
    .array(
      z.object({
        lessonId: z
          .string()
          .describe(
            "The exact _id of a lesson returned by groq_query. Copy it verbatim. Never invent an id.",
          ),
        relevance: z
          .number()
          .describe(
            "0 to 100. How strongly this lesson answers the learner's query.",
          ),
      }),
    )
    .describe(
      "Every relevant lesson, best match first. Do not truncate to a handful.",
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