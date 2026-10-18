# Two-Stage Timestamp Resolution and Timestamped Playback

## Goal

Finish the search half of Lernio. Search today returns lesson cards only. This task adds the second result kind AGENTS.md §11 specifies, a **video moment**, and makes every video card deep link into the lesson page at the matched second with the embedded player seeking there.

Three deliverables:

1. **Two-stage timestamp resolution.** Chapters (the table of contents) are matched first because their labels are clean. The transcript is the noisier backstop and is consulted only when no chapter matches for that video.
2. **Video result cards** matching `design/lernio-search.png`, carrying the course, module and lesson label, a thumbnail, the clip length, a short description and the matched second.
3. **On-site timestamped playback.** A video card links to `/lessons/{slug}?start={seconds}`; the lesson page resolves that through the existing `?start=` plumbing into the provider's own `start` parameter, so the embed opens on the matched second and the learner never leaves the site.

The plumbing for (3) already exists and is verified: `app/lessons/[slug]/page.tsx:32,88,128` reads `start` and hands it to `VideoPlayer`, which calls `getVideoEmbed(videoUrl, startSeconds)`, and `lib/video.ts:111-113` sets `start` on the embed URL. Nothing in search produces that URL yet. This task closes that gap and fixes the one real defect in the existing guard.

---

## Skills read

- `AGENTS.md` §1, §2, §3, §4, §5, §6, §7, §8, §9, §10, §11, §12, §13, §14.
- `agent/skills/dial-your-context/SKILL.md` — pure-deltas rule for the Instructions field, and the "verify every claim with evidence" quality gate. Applied in the Evidence section below: every GROQ snippet in the Context document was run against the live dataset first.
- `agent/skills/shape-your-agent/SKILL.md` — the separation principle and "less is more". The system prompt gains two-stage rules because they are *agent behaviour*; the schema notes and query patterns go in the Context document only. Nothing is duplicated across both layers except the two-stage rule itself, which AGENTS.md §12 requires in both.
- `prompts/intelligent-search.md` — the previous round's decisions, deviations and known constraints, so this round does not undo them.
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` and `01-app/02-guides/server-and-client-boundary.md` — unchanged from the previous round, still the governing constraints.
- `studio/scripts/ingest/ids.ts` and `chapters.ts` — the document-id derivation and the authored-chapter override precedence this task depends on.

Not applicable: `sanity-migration` (no content import), `sanity-best-practices` schema authoring (no new document type; `video` already exists and its field descriptions already describe the two-stage behaviour correctly).

---

## Code and config inspected

- `app/api/search/route.ts` (187 lines) — `createMCPClient` over HTTP, `initial_context` dropped from the tool set, `generateText` with `Output.object`, `MAX_STEPS = 8`, `maxDuration = 120`, NDJSON stream, `readOutputIds` then `collectLessonIds` fallback, `errorMessage` that logs server-side and returns a generic string.
- `sanity/lib/search.ts` (330 lines) — the whole MCP module. `getContextMcpUrl`, `fetchInitialContext` with a 5-minute TTL and a process-lifetime cache, `getAgentContext`, `buildSystemPrompt` (array concatenation, not a template literal, §12's backtick trap), `locateLesson` walking `course.modules[]`, `hydrateSearchResults(ids, query, maxResults)` returning `{ query, results, totalCourses }`.
- `lib/search-schema.ts` — `searchOutputSchema` as `{ results: [{ lessonId, relevance }] }`, flat on purpose, plus `MAX_SEARCH_RESULTS = 40` and `searchRequestSchema`.
- `lib/search-types.ts` — zero-import wire types. `SearchResultCardData` is a single flat lesson shape. **No `kind` discriminator and no second variant exist.**
- `lib/search-ids.ts` — `readOutputIds` wraps the throwing `result.output` getter in try/catch; `collectLessonIds` recurses to depth 8 and takes only `_id` values prefixed `lesson.`.
- `lib/video.ts` — `youtubeId`, host allowlist, `normalizeStartSeconds`, `getVideoEmbed`. The `start` parameter is already set on the embed URL. **YouTube only.**
- `components/search/SearchResultCard.tsx` — the horizontal lesson card. Course initials tile, `Badge variant="lesson"`, key-points panel, `View lesson` link to `/lessons/{slug}`.
- `components/search/SearchPanel.tsx` — NDJSON reader, `requestId` race guard, client-side sort, count line, empty state, footer callout. Imports only `@/components/**`, `next/navigation`, React and `import type` from `lib/search-types`.
- `app/search/page.tsx` — renders the pill and the Playfair headline, then a **static** subline reading "Finding the lessons that answer your question." The design's `Found 28 results across 8 courses` is not implemented anywhere. `payload.totalCourses` is computed at `sanity/lib/search.ts:327` and never read by any component.
- `studio/schemaTypes/documents/video.ts` — `video` with `id`, `url`, `title`, `chapters[]{startSeconds, label}`, `chunks[]{startSeconds, text}`. Every field `readOnly`. Its header comment already states that search resolves against chapters first and falls back to chunks.
- `studio/scripts/ingest/out/videos.ndjson` — 120 documents, 1.57 MB. Verified shape on `video.youtube--BBulGM6xF0`: 8 chapters (`Intro` at 0, `Greedy Decoding` at 37, `Temperature` at 110, …) and 17 chunks of 300 to 900 characters each.
- `studio/scripts/seed/agent-context.ndjson` — one NDJSON line holding `groqFilter` and `instructions`. **`groqFilter` is `_type in ["course", "lesson", "category", "instructor"]`, which excludes `video`.**
- `studio/package.json` — `seed:search-context` and `videos:import` scripts.
- `design/lernio-search.png` — read directly. Four `VIDEO` cards and three `LESSON` cards. See the Card section for the exact measurements.
- `next.config.ts` — `images.remotePatterns` allows only `cdn.sanity.io`.
- `lib/format.ts` — `formatDuration(minutes)` only. **No seconds formatter exists.**
- `components/ui/Icon.tsx` — `outlinePaths` and `filledPaths` are exhaustive records. `play-circle`, `play-square`, `clock`, `folder`, `document`, `chevron-right`, `search`, `check-circle` all exist. **No new icon is needed.**
- `components/ui/Badge.tsx` — `BadgeVariant` already includes `"video"` as `bg-primary-100 text-primary-500`, matching the reference's orange `VIDEO` badge. It is currently unused.
- `.env.local` — `OPENAI_API_KEY` and `SANITY_API_READ_TOKEN` are set. **`SANITY_CONTEXT_SLUG` is absent**, so `getAgentContext()` returns `null` today and the Context document is never read.

### Verified against the live dataset

Every GROQ snippet in this prompt was executed against `gdotcciy/production` with the read token before being written down.

| Probe | Result |
| --- | --- |
| `count(*[_type == "video"])` | 120 |
| `count(*[_type == "video" && count(chapters) > 0])` | **57** |
| `count(*[_type == "video" && count(chunks) > 0])` | **120** |
| `count(*[_type == "lesson" && defined(videoUrl)])` | 120 |
| `count(*[_type == "video" && _id != "video." + id])` | 0, so `_id` is always `"video." + id` |
| `count(*[_type == "video" && !string::startsWith(url, "https://www.youtube.com/watch?v=")])` | 0, every `url` is the canonical watch form |
| `count(*[_type == "lesson" && !defined(*[_type == "video" && _id == "video.youtube-" + string::split(^.videoUrl, "watch?v=")[1]][0])])` | **0 unresolved**, every lesson derives its video document |
| `count(*[_type == "lesson" && count(*[_type == "video" && url == ^.videoUrl]) > 0])` | 120, exact URL join also holds today |
| `count(*[_type == "lesson" && defined(poster.asset->url)])` | 120 |
| distinct `poster.asset->url` hosts | `cdn.sanity.io` only, all `-480x360.jpg` |

Chapter matching, with the `@.` accessor, which is required:

```groq
*[_type == "video" && count(chapters[@.label match $kw]) > 0][0...2]{
  _id, url, "hits": chapters[@.label match $kw]{startSeconds, label}
}
```

Returns `{"_id": "video.youtube--BBulGM6xF0", "url": "https://www.youtube.com/watch?v=-BBulGM6xF0", "hits": [{"label": "Temperature", "startSeconds": 110}]}` for `$kw = "*temperature*"`. **0 problems.**

Chunk matching, same shape with `chunks[@.text match $kw]`:

```groq
*[_type == "video" && count(chunks[@.text match $kw]) > 0][0...2]{
  _id, url, "hits": chunks[@.text match $kw]{startSeconds, text}
}
```

Returns 8 hits on `video.youtube--BBulGM6xF0` and 1 on `video.youtube-GvNrhULVpHI`. **0 problems.**

**The fallback is not hypothetical.** For `*temperature*`: `chapterHits = 1`, `chunkHits = 4`, `chunkOnly = 3`. Three of the four videos that match are reachable only through the transcript, because 63 of the 120 videos have no chapters at all. Without the fallback, search silently loses most of its video coverage.

**MCP liveness.** `GET https://api.sanity.io/v2026-03-03/context/mcp/gdotcciy/production/default/initial-context` returns **HTTP 200, 4892 bytes**. The body mentions `video` but contains neither `chapters` nor `chunks`, because `groqFilter` scopes the compressed schema to the four content types. Widening the filter is what puts those two fields in front of the model.

**A real defect in `normalizeStartSeconds`.** Comparing each lesson's authored `duration` in minutes against the true last transcript timestamp across all 120 lessons: **10 videos run past their authored duration, with a largest overshoot of 14 seconds.** Example: `building-ai-apps-with-llms-cost-and-latency` is authored at 780s and its transcript ends at 789s. Today `normalizeStartSeconds` caps at `duration * 60`, so a moment matched in that tail is silently rewound by up to 14 seconds. Small, but it is exactly the class of bug this feature introduces, so it gets fixed here rather than left behind.

---

## Decisions and assumptions

1. **The agent returns `videoId` plus `startSeconds`, and the server validates the second against the video document.** This is the only place grounding and two-stage resolution can both hold. The model picks *which moment matched* by copying a `startSeconds` it actually saw in a `groq_query` result. The server then re-reads that video document and confirms the second corresponds to a real chapter or a real chunk boundary. A second that matches nothing real is dropped. A fabricated `videoId` resolves to no document and is dropped. Same guarantee the lesson path already has, extended to timestamps.

2. **Chapter precedence is enforced twice, deliberately.** In the prompt, so the model spends its query budget on chapters first (labels are clean and cheap). In code, so the outcome does not depend on the model cooperating: when the agent returns several moments for one video, any chapter-derived hit outranks a transcript-derived hit regardless of relevance score. The prompt alone would be a request; the code is the guarantee.

3. **`videoId` is the video document `_id`, and the lesson is resolved from it, not the other way round.** A video result must always be tied to the lesson that uses that video (AGENTS.md §7), so hydration walks video → lesson. The `video.url` → `lesson.videoUrl` equality join works today (120 of 120), but it is fragile: an author pasting a `youtu.be` short link would break it. Instead `lib/video.ts` gains a `toVideoDocumentId(url)` helper mirroring `studio/scripts/ingest/ids.ts`, deriving `video.youtube-<nativeId>` from the URL. Verified above to resolve all 120 lessons. Where a derived id misses, hydration falls back to the URL equality join, so a non-YouTube or future provider still works once §9's ingestion and playback both exist for it.

4. **The wire type becomes a discriminated union on `kind`.** `SearchResultCardData = SearchLessonResult | SearchVideoResult`, discriminated by `kind: "lesson" | "video"`. One array, so the model's array order is the global ranking across both kinds, which is what §11's "ranked best first" requires. Two parallel arrays would force a second ranking pass with no signal to rank on. The union stays two variants deep with scalar fields each, so the previous round's "keep it flat for structured output" constraint still holds.

5. **The Zod output schema gains a `z.union` over the two variants. `z.discriminatedUnion` does not work and must not be restored.** Decision 4 above specified `z.discriminatedUnion("kind", …)`. That compiles to JSON Schema `oneOf`, and OpenAI's structured output rejects `oneOf` outright:

   ```
   Invalid schema for response_format 'response':
   In context=('properties', 'results', 'items'), 'oneOf' is not permitted.
   ```

   `z.union` compiles to `anyOf`, which is accepted, and the `kind` literal still tells the model which variant to fill. All three shapes were probed against the live API with the project's own key before choosing:

   | Shape | Result |
   | --- | --- |
   | `oneOf`, i.e. `z.discriminatedUnion` | **REJECTED**, `oneOf is not permitted` |
   | `anyOf`, i.e. `z.union` | ACCEPTED, returned a correct interleaved lesson and video |
   | two parallel arrays | ACCEPTED, but loses the single ranked list |

   `anyOf` is the right answer because it keeps one interleaved array, which is what the results page renders. The reason is written into the comment above `searchOutputSchema` so the next reader does not "simplify" it back. This is a new entry for AGENTS.md §12: the model provider, not only the schema's depth, constrains what the output schema may contain. The fallback path is extended rather than replaced: `collectLessonIds` becomes `collectSelections`, which recovers `lesson.` ids **and** `video.` ids with their `startSeconds` from the `groq_query` results when the agent burns its step budget before answering.

6. **`MAX_STEPS` goes from 8 to 10 and the query budget from 4 to 6.** Video matching needs more queries than lesson matching: a lesson query is one pass over one type, while moment matching needs a chapters pass, a chunks pass, and a join back to lessons. The previous round's post-deployment notes record that at 8 steps the model sometimes spent the entire budget querying and never emitted its structured output. The prompt cap rises to 6 so the answer step still fits inside 10.

7. **The Context document's `groqFilter` widens to include `video`.** Without it the MCP cannot read a single chapter or chunk, and the compressed schema in `initial-context` keeps describing a dataset the agent cannot query. `video` is an internal lookup that must never surface as a result; that stays a prompt rule, because `groqFilter` governs *read* access, not *result* shape.

8. **`SANITY_CONTEXT_SLUG=default` gets added to `.env.local`.** It is absent today, so `getAgentContext()` returns `null`, the route falls back to the base MCP URL, and every instruction in the Context document — including the two-stage rules this task depends on — never reaches the model. The variable is already in `.env.example`. Adding it makes the Context document authoritative, which is where AGENTS.md §10 wants the search config to live.

9. **The two-stage rule is stated in both the system prompt and the Context document.** AGENTS.md §11 requires it and §12 warns the model follows the inline prompt more reliably. The Context document carries the schema notes and the verified query patterns as pure deltas, per `dial-your-context`; the system prompt carries the behavioural rule and the return contract, per `shape-your-agent`.

10. **Video cards show the lesson's poster, `summary`, and title.** The reference's video card reads exactly like a lesson card with a thumbnail swapped in: "Data Fetching in Server Components" over "Learn how to fetch data on the server using async/await…". Those are lesson fields. So the video card is lesson data plus a timestamp, which means no transcript text is ever rendered and §12's transcript rule is satisfied on the rendering side as well as the query side.

11. **Posters are Sanity CDN assets, so `next.config.ts` needs no change.** The previous prompt warned that posters were external `i.ytimg.com` URLs and that `next/image` must be avoided. That is stale: all 120 posters are `cdn.sanity.io/…-480x360.jpg`, already in `remotePatterns`. `next/image` is used.

12. **No transcript text crosses the wire in any direction.** The hydration query projects `chapters[]{startSeconds, label}` and `chunks[].startSeconds`, and deliberately **not** `chunks[].text`. Validating a second against real chunk boundaries needs only the boundaries, and skipping the text keeps the response small and keeps §12's rule true of our own code, not only the agent's.

13. **Only YouTube playback ships.** All 120 ingested videos are YouTube and `lib/video.ts` implements only YouTube. AGENTS.md §9 is explicit that a provider is not supported until both ingestion and playback exist for it. Vimeo and Bunny playback stays a single branch in `getVideoEmbed` for whenever their ingestion lands; nothing here pretends otherwise.

14. **`normalizeStartSeconds` gets a 60-second grace above the authored duration, and discards rather than clamps.** The grace is kept, because the measured drift is real: across the 120 seeded lessons, ten videos run past their authored `duration`, with a largest overshoot of 14 seconds, so an exact cap silently rewound a genuine tail match. The clamping is replaced with a discard, because keeping it produced a visible lie. Verified end to end: `?start=999999` on a 16-minute lesson resolved to the clamp ceiling and the new badge rendered **"Playing from 17:00"** on a sixteen-minute video.

   The original code's comment already described the correct behaviour — "anything that sits beyond the lesson's own runtime is discarded and the video opens at 0" — while the code clamped with `Math.min`. So this closes a comment-versus-code mismatch that predates this task, and it means an absurd or hand-edited `?start=` opens at 0 and shows no badge at all.

15. **The count subline moves into `SearchPanel`.** The design puts `Found 28 results across 8 courses` directly under the headline, above the input. It depends on hydrated results, which only exist client-side, so `app/search/page.tsx` drops its static "Finding the lessons that answer you question." line and `SearchPanel` renders the count as its first element. This is the one place the page's server shell changes.

16. **The empty-state copy changes from "No lessons match that yet" to "No results match that yet"**, because a search can now return video moments as well as lessons. The rest of that state, including the catalog link, is unchanged.

17. **The thumbnail pill shows the matched second, not the clip length.** Asked and answered. In the reference the pill and the `Watch from` label carry the identical number in all four video cards, so the pill is the timestamp. Consequently **no clip length is computed or carried at all**: `clipSeconds` is dropped from `resolveVideoMoment` and from the wire type rather than computed and left unused, per §14's "keep it small". AGENTS.md §11's clip-length item is not delivered, and that is stated plainly in the final report.

18. **The lesson page gets a small seek badge, asked and answered.** A learner who clicks `Watch from 12:45` otherwise lands on a page whose video is silently at 12:45 with nothing explaining why. When, and only when, `?start=` resolves to a positive second, the lesson page renders a compact `play-circle` plus `Playing from 12:45` line above the player. It is absent for an ordinary lesson visit, so the reference's lesson page is untouched in the common case. This is the one intentional addition beyond the reference images, and it is called out here so it can be vetoed.

---

## Files expected to touch

### New

- `components/search/SearchVideoResultCard.tsx` — the video result card, matching the reference's fourth, fifth, sixth and eighth rows.

### Modified

- `lib/search-types.ts` — split `SearchResultCardData` into `SearchLessonResult | SearchVideoResult` on `kind`. Add `SearchSelection`, the agent-facing selection union (`lessonId` or `videoId` + `startSeconds`). Only the video variant carries `posterUrl`, `posterAlt` and `startSeconds`; the lesson variant keeps its existing fields unchanged.
- `lib/search-schema.ts` — `searchOutputSchema` becomes `{ results: discriminatedUnion("kind", [lesson, video]) }`. Keep `MAX_SEARCH_RESULTS = 40`. Add `VIDEO_SNAP_TOLERANCE_SECONDS`.
- `lib/search-ids.ts` — `readOutputIds` becomes `readOutputSelections` returning `SearchSelection[]` off the discriminated output. `collectLessonIds` becomes `collectSelections`, recovering both kinds: `lesson.` ids, and `video.` ids paired with the `startSeconds` of the matching `hits[]` entry they were returned beside.
- `lib/video.ts` — add `toVideoDocumentId(url)`, mirroring `studio/scripts/ingest/ids.ts` for the YouTube provider, plus a `formatTimestamp`-adjacent seconds clamp change. Add the 60-second grace to `normalizeStartSeconds`.
- `lib/format.ts` — add `formatTimestamp(seconds)` producing `m:ss` and `h:mm:ss`, matching the reference's `12:45` / `08:32` / `15:18` pills.
- `sanity/lib/queries.ts` — extend `SEARCH_HYDRATE_QUERY` with `poster{..., asset->{_id, url, metadata{dimensions, lqip}}, alt}` so video cards have a thumbnail. Add `SEARCH_VIDEO_QUERY`, fetching by video `_id` and projecting **only** `chapters[]{startSeconds, label}` and `"chunkStarts": chunks[].startSeconds`, plus the lesson reverse lookup by derived id and by URL equality.
- `sanity/lib/search.ts` — `buildSystemPrompt` gains the two-stage section. `hydrateSearchResults` accepts `SearchSelection[]`, splits by kind, runs both queries, resolves each moment, merges in the model's order and applies per-video chapter precedence. Add `resolveVideoMoment(video, requestedSeconds)` and a server log line reporting the chapter and transcript counts.
- `app/api/search/route.ts` — pass `maxQueries` into the prompt, raise `MAX_STEPS` to 10, use the new selection readers, keep the recovery fallback.
- `components/search/SearchResultCard.tsx` — the props type narrows to the lesson variant. No markup change.
- `components/search/SearchPanel.tsx` — render the count subline first, dispatch on `result.kind`, use a composite React key, fix the empty-state copy. Keep the "must never import `lib/search-schema`, `sanity/**` or `ai`" rule intact.
- `app/search/page.tsx` — drop the static subline so the panel can own the count.
- `app/lessons/[slug]/page.tsx` — render the seek badge above `VideoPlayer` when `startSeconds > 0`.
- `studio/scripts/seed/agent-context.ndjson` — widen `groqFilter` to include `video`; add the verified two-stage schema notes and query patterns.
- `.env.local` — add `SANITY_CONTEXT_SLUG=default`.
- `.env.example` — no change needed; `SANITY_CONTEXT_SLUG=default` is already documented there.

### Untouched on purpose

`proxy.ts` (search stays public), `components/ui/Icon.tsx` (every icon needed exists), `components/ui/Badge.tsx` (`video` variant already exists), `components/lesson/VideoPlayer.tsx` (already takes `startSeconds` and already seeks), `next.config.ts` (posters are Sanity CDN), `studio/schemaTypes/documents/video.ts` (its descriptions already describe this behaviour correctly), `studio/scripts/ingest/**` (offline tooling, already done), `package.json` (no new dependency), `components/lesson/VideoPlayer.tsx` (already takes `startSeconds` and already seeks; the badge is rendered by the page, not the player).

---

## Requirements

### 1. The two-stage rule in the system prompt

`buildSystemPrompt` gains a `maxQueries` parameter and a section between "How to search" and "How to rank", covering:

- `video` documents hold the video intelligence. Match a video in **two stages**: chapters first, transcript only if no chapter matched for that video.
- Match chapters with `count(chapters[@.label match $kw]) > 0` and project `chapters[@.label match $kw]{startSeconds, label}`. Labels are clean, so a chapter hit is the better answer.
- Only when a video has no matching chapter, match the transcript with `count(chunks[@.text match $kw]) > 0` and project `chunks[@.text match $kw]{startSeconds, text}`.
- **Project the matched entries, never the whole array.** Return only `startSeconds`, and at most a handful per video. Never select `chunks` or `chapters` unfiltered: a whole transcript overflows the context window (AGENTS.md §12).
- A video result must be reported as a `videoId` plus the `startSeconds` you saw in the result, and it must be tied to the lesson that uses that video. A video document is an internal lookup and is never a result on its own.
- Cap the agent at 6 `groq_query` calls, then stop and answer.

The existing "How to search", "How to rank" and "What you return" sections keep their wording. Only the caps, the return contract and the new section change. Keep the array-concatenation construction; do not convert to a template literal (§12).

### 2. The output schema

```ts
export const searchOutputSchema = z.object({
  results: z
    .array(
      z.discriminatedUnion("kind", [
        z.object({
          kind: z.literal("lesson"),
          lessonId: z.string().describe(
            "The exact _id of a lesson returned by groq_query. Copy it verbatim. Never invent an id.",
          ),
          relevance: z.number().describe(
            "0 to 100. How strongly this lesson answers the learner's query.",
          ),
        }),
        z.object({
          kind: z.literal("video"),
          videoId: z.string().describe(
            "The exact _id of a video document returned by groq_query. Copy it verbatim. Never invent an id.",
          ),
          startSeconds: z.number().describe(
            "The exact startSeconds of the matching chapter or transcript entry, copied from a groq_query result. Never invent or estimate a timestamp.",
          ),
          relevance: z.number().describe(
            "0 to 100. How strongly this moment answers the learner's query.",
          ),
        }),
      ]),
    )
    .describe(
      "Every relevant lesson and video moment, best match first, interleaved. Do not truncate to a handful.",
    ),
});
```

Stay at two variants of three scalars. No nested objects, no arrays of objects inside an item.

### 3. `resolveVideoMoment`, the core of two-stage resolution

A pure function in `sanity/lib/search.ts`:

```ts
type VideoProjection = {
  chapters: Array<{ startSeconds: number | null; label: string | null }> | null;
  chunkStarts: number[] | null;
};

type ResolvedMoment = {
  startSeconds: number;
  source: "chapter" | "transcript";
  label: string | null;
};
```

- Exact match first: a chapter whose `startSeconds` equals the requested second, else a chunk start equal to it.
- Then a snap within `VIDEO_SNAP_TOLERANCE_SECONDS` (5), nearest wins, chapters checked before chunks.
- A chapter hit yields `source: "chapter"` and the chapter's `label`.
- A chunk hit yields `source: "transcript"`, `label: null`.
- Neither found means **return `null`** and drop the moment. This is the grounding guarantee for timestamps: the model cannot put a card on a second that does not exist in that video.
- `label` is returned for the server log and for verification, and is **not** put on the wire. §3 forbids improving beyond the reference, and the reference's video card has nowhere to show a chapter label.

Pure, no I/O, so it can be unit-exercised directly the way `hydrateSearchResults` was in the previous round.

### 4. Hydration

`hydrateSearchResults(selections, query, maxResults)`:

1. Dedupe lesson ids, preserving first-seen order. Dedupe video moments to one per video at this stage; chapter precedence is applied after resolution, so keep every requested second per video until then.
2. Empty input short-circuits to `{ query, results: [], totalCourses: 0 }`.
3. Fetch lessons with `SEARCH_HYDRATE_QUERY`. Fetch videos with `SEARCH_VIDEO_QUERY`. Both from `sanity/lib/client`, `perspective: "published"`.
4. Resolve each video to its lesson: by derived document id from `lesson.videoUrl`, falling back to `video.url == lesson.videoUrl`. A video with no lesson is dropped, because a video result is always tied to a lesson (§7).
5. Drop a lesson with no slug, as today. Drop a video whose moment does not resolve.
6. Apply per-video chapter precedence: among surviving hits for one video, a `chapter` hit beats a `transcript` hit; ties break on the higher relevance, then on the lower second.
7. Rebuild the array in the model's order, truncated to `maxResults`.
8. Recompute `totalCourses` from the distinct `courseSlug` of everything that survived.
9. Log one server line: `[search] resolved N moments (X chapter, Y transcript), dropped Z`.

### 5. The video card

From `design/lernio-search.png`, measured against the existing lesson card:

- **Left panel**, `hidden sm:flex`, `w-[275px] shrink-0`, `rounded-md bg-neutral-900`, `aspect-video` so it matches the reference's roughly 16:9 tile. `next/image` with the lesson `posterUrl`, `fill`, `sizes="275px"`, `object-cover`. Centred `play-circle` overlay in white at roughly 40% the panel height. A pill bottom-right, `rounded-xs bg-black/70 px-2 py-0.5 text-small font-medium text-white`, showing **the matched second**, the same value as the `Watch from` label, because that is what the reference shows. When there is no poster, the dark panel and the overlay still render, so the card never collapses.
- **Right column**, identical structure to the lesson card: course initials tile `size-9 rounded-md bg-neutral-900`, course name `truncate`, then `<Badge variant="video">Video</Badge>` pushed right, matching the reference's orange pill.
- **Title** `text-heading-3 font-medium text-neutral-900`, **description** `line-clamp-2 text-body text-neutral-500`.
- **Footer row**: `Lesson {m}.{n}` with the `document` icon, then the module title with the `folder` icon, then pushed right `Watch from {m:ss}` in `primary-500` with a `play-circle` icon, wrapped in a `LinkButton variant="text"` to `/lessons/{lessonSlug}?start={startSeconds}`. The reference also shows a trailing `chevron-right` on that action; `LinkButton` already renders one with `icon`, so pass `chevron-right`.
- The whole card is not one big link. The action is the link, same as the lesson card.
- Every field degrades: no poster, no module, no lesson number, no course. No `null`, `undefined` or `NaN` reaches the DOM.

### 6. `SearchPanel`

- Count subline as the **first** element, matching the reference's position under the headline: `Found {n} results across {m} courses`, with correct singular forms for 1 result and 1 course. Live-updating, `aria-live="polite"`, and absent while loading with no results yet.
- Dispatch: `result.kind === "video" ? <SearchVideoResultCard …/> : <SearchResultCard …/>`.
- React key: `${result.kind}-${result.id}`, since a lesson and a video can share an id prefix space.
- Sort still works across both kinds: `newest` on `createdAt`, `shortest` on `duration`. Both variants carry both fields.
- Empty state copy becomes "No results match that yet". Everything else about that state is unchanged.
- Still imports only `@/components/**`, `next/navigation`, React and `import type` from `lib/search-types`.

### 7. `normalizeStartSeconds` and the lesson-page seek badge

`normalizeStartSeconds` gets a `START_GRACE_SECONDS = 60` above `duration * 60`, with a comment recording the measured 14-second maximum drift between authored `duration` and the real transcript length across the 120 seeded lessons. The guard still rejects negative, non-finite and absurd values; it no longer rewinds a genuine tail match.

`app/lessons/[slug]/page.tsx` renders the seek badge. When `startSeconds > 0`, a compact line sits directly above `VideoPlayer`:

- A `play-circle` icon in `primary-500`, the existing size used elsewhere for play affordances.
- Text `Playing from {formatTimestamp(startSeconds)}`, in `text-small text-neutral-600`, matching the surrounding meta treatment rather than competing with the lesson title.
- It is the value `normalizeStartSeconds` already returned, so it can never disagree with where the player actually seeks.
- Nothing renders when `startSeconds === 0`, so an ordinary lesson visit is byte-identical to today.

### 8. The Context document

Per `dial-your-context`: pure deltas only, every claim backed by a query that was actually run. The seed NDJSON is a single line, so it carries no comments; the import command goes in the prompt and the final report.

`groqFilter` becomes:

```groq
_type in ["course", "lesson", "category", "instructor", "video"] && !(_id in path("drafts.**"))
```

Additions to `instructions`, all verified above:

- `video` is an internal lookup, one document per unique video, keyed by `video.` + `id` where `id` is `youtube-` plus the native id. It holds `chapters` (the table of contents) and `chunks` (the transcript in short timestamped pieces). Never return a video as a result on its own; a video result is always tied to the lesson that uses it.
- **The array filter needs the `@.` accessor.** `chapters[@ label match $kw]` is a parse error. Use `chapters[@.label match $kw]` and `chunks[@.text match $kw]`. This cost real queries to find.
- Two stages. Chapters first, because the labels are clean. The transcript only when no chapter matched for that video. 57 of 120 videos have chapters, so the transcript is the only route to the other 63.
- Project only the matched entries, and only `startSeconds` plus `label`. Never project a whole `chunks` or `chapters` array: it overflows the context window.
- Two verified patterns, one per stage:

```groq
*[_type == "video" && count(chapters[@.label match $kw]) > 0]{
  _id, "hits": chapters[@.label match $kw]{startSeconds, label}
}
```

```groq
*[_type == "video" && count(chapters[@.label match $kw]) == 0 && count(chunks[@.text match $kw]) > 0]{
  _id, "hits": chunks[@.text match $kw]{startSeconds, text}
}
```

  The second one carries the chapter guard inline, so a single query cannot return both stages for one video.
- A video document's `url` is always the canonical `https://www.youtube.com/watch?v=<id>` form, and every lesson's `videoUrl` derives it. A lesson has no video field; its video document is found by matching the URL.

The existing Rules, Schema notes, Query patterns and Known limitations sections stay, with the `lesson` material untouched. The `poster` line stays but is corrected: posters are Sanity CDN assets, not `i.ytimg.com`.

### 9. Getting the Context document live

`npm --prefix studio run seed:search-context` needs a write token, and this project has only `SANITY_API_READ_TOKEN` in `.env.local` and no write token in `studio/.env`. So the seed file ships ready to import, and the import command plus the Studio-form alternative go in the final report for the user to run. The inline system prompt carries the two-stage rules regardless, so search works before the import and improves after it.

---

## Security considerations

- **The read token and the OpenAI key stay server-side.** `sanity/lib/search.ts` keeps `import "server-only"` as its first line. Neither key gains a `NEXT_PUBLIC_` prefix, and neither appears in any response the route returns.
- **The browser still never calls the MCP or the LLM.** `SearchPanel` keeps its import restriction; the discriminated union lives in `lib/search-types.ts`, which still has zero runtime imports.
- **The timestamp is untrusted input and is treated as such twice.** `startSeconds` from the model is validated against the video document before a card is built. `start` from the query string is validated by `normalizeStartSeconds`, which rejects non-numeric, negative and absurd values. A card can therefore only link to a second that exists in that video, and a hand-edited `?start=` still cannot seek past the end.
- **No transcript text is rendered, and none crosses the wire.** The hydration query projects chunk *boundaries*, not chunk text. This keeps §12's rule true of our own code and keeps the response payload small.
- **The video document is a lookup, never a result.** A video without a lesson is dropped in hydration, and the prompt forbids returning one. The `groqFilter` widening grants read access to `video`; it grants no way to surface one.
- **Search stays public.** `proxy.ts` is unchanged, nothing in `/search` or `/api/search` requires a session, and `POST /api/search` keeps its 503 guard for a missing key.
- **Cost.** A search now costs more model calls than before, since video matching needs up to 6 queries instead of 4. `MAX_STEPS` rises to 10 and `maxDuration` stays at 120s. **Rate limiting is still not implemented**, which was already true and is now more expensive. Flag it again in the report.
- **The embed host allowlist in `lib/video.ts` is untouched**, so a hand-edited `lesson.videoUrl` still resolves to `null` and a placeholder rather than an iframe pointing at an arbitrary third party.

---

## Acceptance criteria

1. `npm run typegen`, `npm run typecheck` and `npm run lint` pass with no errors, and `sanity.types.ts` gains the result types for the new and extended queries.
2. `npm run build` succeeds with `/api/search` and `/search` still registered as dynamic.
3. `npm --prefix studio run typecheck` and `npm run studio:build` pass. No Studio schema change is required.
4. No client bundle contains `ai`, `@ai-sdk/*`, `createMCPClient`, `OPENAI_API_KEY` or `SANITY_API_READ_TOKEN`, verified with a positive control.
5. A video moment's `startSeconds` is always a value that exists in that video document, either as a chapter `startSeconds` or as a chunk `startSeconds`. No card carries an invented second.
6. Chapter precedence holds in code: given one chapter hit and one transcript hit for the same video, only the chapter hit becomes a card, regardless of relevance order.
7. `resolveVideoMoment` returns `null` for a second that matches nothing within tolerance, and the moment is dropped rather than rendered.
8. A video card links to `/lessons/{lessonSlug}?start={startSeconds}`, that URL returns 200, and the rendered iframe `src` carries the provider's own `start` parameter with the same integer.
9. The lesson page shows `Playing from m:ss` when and only when `?start=` resolves to a positive second, and the badge's value equals the `start` on the embed URL. No badge renders for an ordinary lesson visit.
10. `normalizeStartSeconds("999999", 45)` returns 0 or a value within `45*60 + 60`, and `normalizeStartSeconds` no longer rewinds a genuine tail match.
11. The two-stage rule is present in the inline system prompt, and the same rule plus the verified `@.` patterns are present in the Context document seed.
12. `groqFilter` includes `video`, and after the document is imported the MCP `initial-context` body mentions `chapters` and `chunks`.
13. `Found N results across M courses` renders under the headline once results arrive, with correct singular forms for `1 result` and `1 course`, and `N` equals the rendered card count exactly.
14. The video card matches the reference: dark thumbnail panel, centred play overlay, timestamp pill bottom-right showing the same value as the `Watch from` label, course mark, orange `VIDEO` badge, title, two-line description, `Lesson m.n`, module title, and the `Watch from m:ss` action.
15. No clip length is computed, carried on the wire, or rendered anywhere.
16. The sort control reorders both kinds together with no network request, and `Most Relevant` preserves the server order.
17. Every rendered string traces to a Sanity document. No card text originates from the model.
18. No `null`, `undefined` or `NaN` appears between tags at any state, including a video card with no poster, no module and no lesson number.
19. At 390px the video card's thumbnail panel hides exactly as the lesson card's does, the footer meta wraps, and nothing overflows horizontally.

---

## Checks to run

From the repo root for the web workspace, from `studio/` for the Studio.

1. `npm run typegen` — required first, because `SanityQueries` is keyed on the exact query string literal and the client overloads will not typecheck without it.
2. `npm run typecheck`.
3. `npm run lint`.
4. `npm run build`.
5. `npm --prefix studio run typecheck` and `npm run studio:build`.
6. Exercise `resolveVideoMoment` directly, importing the same module the route uses, against the 8 cases in the manual steps. It is pure, so no server or dataset is needed.
7. Exercise `hydrateSearchResults` against the live dataset through a Node resolve hook for the `@/` alias, the way the previous round did: real selections hydrate, fabricated `videoId`s drop, an out-of-range second drops, chapter precedence holds, ordering is preserved.
8. Confirm the client bundle is clean, with a positive control.
9. `npm run dev`, then exercise `/search` and a `?start=` lesson URL in a browser.
10. Confirm against the live MCP endpoint that `/initial-context` serves the widened schema once the Context document is imported.

---

## Manual test steps

1. `npm run dev`, open `http://localhost:3000/search`.
2. Type `temperature`, press Enter. The URL becomes `/search?q=temperature`.
3. Watch the status line, then results render. The subline reads `Found N results across M courses` and `N` equals the card count.
4. Confirm at least one `VIDEO` card and at least one `LESSON` card are present, interleaved in one ranked list.
5. On a `VIDEO` card, read the pill on the thumbnail and the `Watch from` label. They must match, and both must be a `m:ss` or `h:mm:ss` value.
6. Click `Watch from`. The lesson page loads with a `Playing from 12:45` badge above the player and the video already at that second. Confirm the iframe `src` carries `start=<seconds>` and that all three values agree.
7. Reload that lesson URL directly. Same result, so the deep link is shareable.
8. Open an ordinary lesson URL with no `?start=`. Confirm no badge renders and the video starts at 0.
9. Edit the URL to `?start=999999`. The player opens at 0 or within the lesson's runtime, never past the end.
10. Edit the URL to `?start=abc`. The player opens at 0.
10. Find a video whose match came from a transcript chapter. Search `greedy decoding` or `top-k`, terms unlikely to be chapter labels. Confirm those cards still render and still seek correctly, which is the fallback doing its job.
11. Find a video whose match came from a chapter. Search `temperature`. Confirm the card's second equals a chapter `startSeconds` in the video document.
12. Search `qqqzzz nonsense xyzzy`. Confirm the empty state reads "No results match that yet" with the catalog link and the footer callout, and no error styling.
13. Switch the sort to `Newest`, then `Shortest`, then back to `Most Relevant`. No network request fires and the original order returns.
14. Copy the `/search?q=temperature` URL into a private window. The same results render.
15. Open `/` and submit the home search box. It lands on `/search?q=…` with results.
16. Resize to 390px. Thumbnail panels hide, footer meta wraps, nothing overflows.
17. In devtools, confirm `/api/search` returns NDJSON with `status` lines then one `results` line.
18. In devtools, search the loaded JS for `ai-sdk`, `SANITY_API_READ_TOKEN` and `OPENAI_API_KEY`. Expect zero hits.
19. In the server log, find `[search] resolved N moments (X chapter, Y transcript)`. Confirm `X + Y` equals the number of video cards and that both numbers are non-zero across a few queries, which is the observable proof that both stages ran.
20. Restart `next dev` after any prompt edit and confirm the change takes effect, demonstrating the §12 restart gotcha.

---

## Deliberately out of scope

- **Vimeo and Bunny playback.** §9 says a provider is supported only once ingestion and playback both exist. All 120 ingested videos are YouTube, so only YouTube ships.
- **PostHog analytics.** §7's video play and watch-depth events are their own concern.
- **Progress tracking and resume position.** §7 wants it; no progress document type or read helper exists yet.
- **Conversation Insights.** `@sanity/context` needs `sanity@^6`; this Studio is `5.31.2`.
- **Semantic search.** `text::semanticSimilarity()` needs embeddings, a plan and billing decision. Token-wildcard matching is what ships.
- **Rate limiting on `/api/search`.** Still absent, and this task makes each search cost more. Flagged, not built.
- **Transcript chapters shown on the card.** The reference has no room for a chapter label, and §3 forbids improving beyond the reference. The chapter label is resolved and logged, never rendered.
- **The clip length AGENTS.md §11 asks a video card to carry.** Answered: the pill shows the matched second, matching the reference, and no clip length is computed. Stated plainly here and in the final report rather than left as a silent omission.
---

# Outcome

## Checks run, real output

| Check | Result |
| --- | --- |
| `npm run typegen` | Passed. 10 queries and 26 schema types, up from 8 queries. |
| `npm run typecheck` | Passed, exit 0. |
| `npm run lint` | Passed, exit 0, no errors or warnings. |
| `npm run build` | Passed. `/api/search` and `/search` both registered as dynamic (``f``). |
| `npm --prefix studio run typecheck` | Passed, exit 0. |
| `npm --prefix studio run build` | Passed. |
| Client bundle scan, 27 chunks | 0 hits for `@ai-sdk`, `ai-sdk`, `createMCPClient`, `OPENAI_API_KEY`, `SANITY_API_READ_TOKEN`, `api.openai.com`, `zod`. Positive control confirmed `Watch from`, `Found`, `Most Relevant` and `No results match that yet` are present, so the scan was looking in the right place. |
| `resolveVideoMoment` and `hydrateSearchResults` against the live dataset | **59 passed, 0 failed.** Harness run through `studio/node_modules/.bin/tsx` with a resolve hook for the `@/` alias, then deleted. |
| `readOutputSelections` and `collectSelections` | **26 passed, 0 failed.** Same harness, then deleted. |
| Timestamped playback, served from the production build | 13 of 14 assertions passed on the first run; the one failure was a wrong expectation in the harness and is described below. |

## Verified against the live dataset

The log line the hydration step emits is the observable proof that both stages ran:

```
[search] resolved 2 moments (1 chapter, 1 transcript), dropped 1
3 results across 1 courses (2 video, 1 lesson)
  VIDEO  1:50     poster=yes lesson=1.2 Temperature and sampling
         -> /lessons/building-ai-apps-with-llms-temperature-and-sampling?start=110
  VIDEO  1:24     poster=yes lesson=3.1 Tool calling fundamentals
         -> /lessons/building-ai-apps-with-llms-tool-calling?start=84
  LESSON Temperature and sampling
```

One moment resolved through a chapter and one through the transcript fallback, from a single call. Both video cards carry a poster, a module number, a lesson number and a working deep link. The fabricated video id, the fabricated lesson id and the invented second were all dropped.

Every grounding assertion passed:

- A second matching no chapter and no chunk boundary returns `null` and the moment is dropped.
- `300`, `999999`, `125`, `-1`, `NaN` and `Infinity` are all rejected. `125` is the meaningful one: it is more than the 5-second tolerance from every chapter *and* every chunk boundary.
- `118` snaps to the chunk at `113`, because 5 is exactly the tolerance and the tolerance is inclusive. That is the documented contract, not a leak.
- `chapters: null` falls through to the transcript and lands on the nearest chunk boundary, which is stage two working rather than a defect.
- Chapter precedence holds in code: given a chapter hit scored `10` and a transcript hit scored `99` for the same video, the chapter hit wins and only one card is produced.
- `totalCourses` equals the distinct course count of what survived, and no card carries `undefined` or `NaN`.

## Timestamped playback, served from the build

| URL | Embed `start` | Badge | Verdict |
| --- | --- | --- | --- |
| `?start=110` | `start=110` | `Playing from 1:50` | agrees, and 110 is the real `startSeconds` of the chapter labelled `Temperature` |
| `?start=999999` | absent, opens at 0 | absent | discarded |
| `?start=abc` | absent | absent | discarded |
| `?start=-5` | absent | absent | discarded |
| no `?start=` | absent | absent | an ordinary visit is unchanged |
| `?start=360` on a lesson authored at 360s | `start=360` | shown | a genuine tail match survives |
| `?start=366` on that lesson, 14s past authored | `start=366` | shown | the grace admits the real drift |
| `?start=421`, past authored plus grace | absent | absent | discarded |

The last three are the reason the grace exists. Without it, `?start=366` would have been rewound to 360 on a real lesson.

## The GROQ traps, all found by running the queries

1. **Array-of-object filters need the `@.` accessor.** `chapters[@ label match $kw]` is a parse error, `expected ']' following expression`. `chapters[@.label match $kw]` is correct. This is stated in the system prompt, the Context document, and is now a named check.
2. **`pt::text(notes)` returns one string, not an array.** Carried over from the previous round and re-verified.
3. **`chunks[-1]` and `count(chunks)-1` slicing and `math::max` inside a nested subquery all fail to parse.** The real end of a transcript was measured in PowerShell instead.
4. **A nested subquery needs `^` to reach the outer scope.** `*[_type == "lesson" && !defined(*[_type == "video" && _id == "video.youtube-" + string::split(^.videoUrl, "watch?v=")[1]][0])]` returned 120 unresolved without the caret and **0 unresolved** with it.

Measured once and reused: 120 videos, **57 with chapters**, 120 with chunks, 120 lessons all deriving their video document id, all 120 posters on `cdn.sanity.io`. For `*temperature*`: 1 chapter hit, 4 chunk hits, **3 reachable only through the transcript**. The fallback is not a nicety, it is the majority path.

## Two deviations, both forced by evidence

1. **`z.discriminatedUnion` became `z.union`.** See Decisions 2 and 5. `oneOf` is rejected by OpenAI, verified against the live API across three schema shapes.
2. **`normalizeStartSeconds` discards instead of clamping.** See Decision 14. Found by the end-to-end check rendering "Playing from 17:00" on a sixteen-minute video.

## One test-harness correction

The first playback run reported a mismatch between the badge and the embed `start`. The app was right and the harness was wrong: it matched `[?&]start=` against HTML where the ampersand is escaped to `&amp;`. Decoding before reading the query string fixed it.

Two `resolveVideoMoment` assertions also failed on first run, both wrong expectations rather than defects, and both now assert the real contract: `118` is inside the inclusive tolerance of the chunk at `113`, and `chapters: null` correctly falls through to the transcript.

## Blocked on the user

1. **Import the Context document.** `groqFilter` still excludes `video` in the live dataset, so the agent cannot read a chapter or a chunk and search returns lessons only. The seed is ready at `studio/scripts/seed/agent-context.ndjson` and needs a write token, which this project does not have:

   ```
   npm --prefix studio run seed:search-context
   ```

   The alternative is the Studio form: open the `Lernio Search` Context document, paste the new `groqFilter` and the new `### Video moments` section, and publish. Both the seed file and this prompt carry the exact content.

   Until then, video results cannot appear in a real search. The inline system prompt already carries the two-stage rule, so the moment the filter widens the behaviour is correct with no code change.

2. **Top up the OpenAI credits.** The account returned `credit_balance_exhausted` partway through verification, so the last live agent search could not be run to completion. Everything reachable without it was verified directly, and the one live search that did complete returned a real lesson through the structured-output path, proving the `anyOf` fix.

## Known constraint, unchanged and now more expensive

A search costs one model call per agent step plus the answer. Video matching raised the query budget from 4 to 6 and `MAX_STEPS` from 8 to 10, so a search now costs more model calls than it did before. `maxDuration` stays at 120s. There is still **no rate limiting** on `/api/search`.
