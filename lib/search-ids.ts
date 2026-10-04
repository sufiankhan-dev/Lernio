/**
 * Recovers lesson document ids from a search agent run.
 *
 * The agent normally answers with `{ results: [{ lessonId, relevance }] }`, which
 * `readOutputIds` reads. But `result.output` is a getter that throws rather than
 * returning undefined, and it throws whenever the agent spends its whole step budget
 * querying and never reaches its answer, which the AI SDK reports as
 * `AI_NoOutputGeneratedError`.
 *
 * `collectLessonIds` is the fallback for that case: the ids its `groq_query` calls
 * already returned are real, so recovering them turns a hard failure into a working
 * result. Everything recovered still goes through `hydrateSearchResults`, so an id
 * that does not exist is dropped exactly as it would be from the structured path.
 */

/**
 * The lesson ids from the agent's structured answer, or an empty list when there is
 * no output. Must be used instead of touching `result.output` directly, because that
 * access throws.
 */
export function readOutputIds(result: { output?: unknown }): string[] {
  let output: unknown;
  try {
    output = result.output;
  } catch {
    return [];
  }

  const results = (output as { results?: unknown } | undefined)?.results;
  if (!Array.isArray(results)) return [];

  return results
    .filter(
      (entry): entry is { lessonId: string } =>
        !!entry &&
        typeof (entry as { lessonId?: unknown }).lessonId === "string",
    )
    .map((entry) => entry.lessonId);
}

/**
 * Walks any tool-result shape and collects lesson document ids.
 *
 * MCP tool results arrive in several shapes (a JSON string, a content array, an
 * already-parsed object), so this recurses rather than assuming one. Only ids
 * prefixed `lesson.` are taken, which keeps course and category references out.
 * Depth is capped so a cyclic or deeply nested result cannot stall the request.
 */
export function collectLessonIds(
  value: unknown,
  found: string[] = [],
  depth = 0,
): string[] {
  const MAX_DEPTH = 8;
  if (depth > MAX_DEPTH || value == null) return found;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return collectLessonIds(JSON.parse(trimmed), found, depth + 1);
      } catch {
        return found;
      }
    }
    return found;
  }

  if (Array.isArray(value)) {
    for (const entry of value) collectLessonIds(entry, found, depth + 1);
    return found;
  }

  if (typeof value === "object") {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (key === "_id" && typeof entry === "string" && entry.startsWith("lesson.")) {
        if (!found.includes(entry)) found.push(entry);
      } else {
        collectLessonIds(entry, found, depth + 1);
      }
    }
  }

  return found;
}