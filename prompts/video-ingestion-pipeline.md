# Offline video ingestion pipeline

## Goal

Build the offline tooling in `studio/scripts/ingest/` that reads the video URLs the lessons
actually reference, fetches each provider's captions, splits the transcript into short
timestamped chunks, recovers chapter markers, and emits `video` documents as NDJSON that the
Sanity CLI imports. Add the `video` document type to the Studio schema so the dataset accepts
them.

The pipeline is offline tooling. It never runs in the request path, the browser never calls it,
and it holds no write token: it writes a file, and `sanity dataset import --replace` applies it.

## Skills read

- `AGENTS.md` — §5 boundaries (video pipeline is offline tooling), §7 timestamps resolve
  chapters first and transcript second, §8 the `video` document shape, §9 providers and
  ingestion, §12 the traps, §13 checks.
- `agent/skills/sanity-best-practices/SKILL.md` — document/array design, readOnly generated
  fields, deterministic `_id`s for idempotent re-runs.

## Decisions the user already made

1. **YouTube only.** AGENTS.md §9 says a provider counts as supported once both ingestion and
   playback exist. `lib/video.ts:12` implements YouTube playback only, and the seeded dataset is
   120/120 YouTube. So this adds the YouTube ingestion adapter and leaves the provider registry
   pluggable. **No Vimeo or Bunny adapter, and no new playback branch** — adding either without
   the other would claim a provider is supported when it is not.
2. **NDJSON plus `sanity dataset import --replace`**, matching the existing
   `seed:search-context` script. The pipeline holds no write credential and a re-run replaces the
   same `_id`s instead of duplicating them.

## Verified external behaviour

Probed live from this machine before writing the prompt. These are facts, not assumptions.

- **The legacy `youtube.com/api/timedtext` endpoint is dead.** `?lang=en&v=9602Yzvd7ik` returns
  `200` with a **zero byte body**. Do not build on it.
- **The Innertube player endpoint works with no API key.** `POST
  https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`
  with `context.client.clientName: "ANDROID"`, `clientVersion: "20.10.38"`, `androidSdkVersion: 35`,
  `hl: "en"`, `gl: "US"` and a matching `com.google.android.youtube/...` User-Agent returns
  `200` for valid ids with `videoDetails.title`, `videoDetails.lengthSeconds`,
  `videoDetails.shortDescription` and `captions.playerCaptionsTracklistRenderer.captionTracks`.
- **`clientName: "WEB"` returns `playabilityStatus: "UNPLAYABLE"`** from this network. Do not
  use the web client. An invalid id returns `playabilityStatus: "ERROR"` with no `videoDetails`.
- **Appending `&fmt=json3` to a caption track's `baseUrl`** returns the transcript as
  `events[]` with `tStartMs`, `dDurationMs` and `segs[].utf8`. Auto-captions interleave
  `aAppend: 1` events whose only segment is `"\n"`; those carry no words and must be dropped.
  Word-level timing lives in `segs[].tOffsetMs` and is not needed here.
- **Track selection matters.** `EXIgjIBu4EU` returns `en/asr` and `en-CA` (manual); `rGPpQdbDbwo`
  returns 19 auto tracks. Prefer a manual English track, then `en` auto, then any `en-*`, and
  log which was used.
- **Chapter markers live in `videoDetails.shortDescription`**, not in the player response.
  `playerOverlays...multiMarkersPlayerBarRenderer` is absent on the ANDROID client. Observed
  formats: `0:00 – Introduction` (en dash), `00:00 Introduction to Next.js Routing`,
  `00:00 - Introduction`, `00:00 | Overview`. `z9-_YQWxwJ4` and `s_CZeWuEZ_s` have **no**
  chapter block, so "no chapters" is a real, expected outcome, not a bug.
- **Transcript availability is broad.** 7 of 7 valid ids probed returned an English `asr` track.
- Both `node --env-file-if-exists=../.env.local` and the same flag through `tsx` load the root
  env, so the pipeline can pick up `SANITY_API_READ_TOKEN` without a dotenv dependency.
- `sanity dataset import --replace` is documented as "Replace documents with the same IDs". It
  does not clear the dataset. No asset flags are needed because video documents hold no assets.

## Code and config inspected

| File | What it showed |
| --- | --- |
| `studio/package.json` | Scripts are `sanity dev|build|deploy|typegen` and `seed:search-context`. No `tsx` in devDependencies, though `studio/node_modules/tsx@4.23.15` resolves. No `typecheck` script. |
| `studio/schemaTypes/index.ts` | Types: course, lesson, instructor, category, module, learningOutcome, lessonResource, agentContext. **No `video` type.** |
| `studio/schemaTypes/documents/lesson.ts` | `videoUrl` is a plain `url`, description already says "A YouTube, Vimeo, or Bunny watch URL". `duration` is whole minutes. Field style: `defineField`, `description` on every non-obvious field. |
| `studio/schemaTypes/objects/lesson-resource.ts` | The pattern for an embedded object: its own file under `objects/`, `defineType({ type: 'object' })`. |
| `studio/structure.ts` | Nav is hand-written: Courses, Lessons, divider, Taxonomy, divider, Search. Videos go in their own group. |
| `studio/.gitignore` | Ignores `/node_modules`, `/dist`, `/.sanity`, `/schema.json`, `*.tsbuildinfo`, `.env*`. **The ingest output dir is not ignored yet.** |
| `studio/.env.example` | Only project coordinates. The read token used by the pipeline is not listed. |
| `studio/tsconfig.json` | `include: ["**/*.ts", "**/*.tsx"]`, `strict: true`, `module: Preserve`, `noEmit`. So pipeline files are typechecked by `tsc` in the studio workspace. Keep them strict-clean. |
| `lib/video.ts` | YouTube embed only, `lib/video.ts:12` states playback for Vimeo and Bunny waits on ingestion. Confirms decision 1. |
| `sanity/lib/search.ts` | Search currently returns `{ lessonId, relevance }` and hydrates lessons only. **Nothing consumes video documents yet.** Out of scope, see below. |
| `studio/scripts/seed/agent-context.ndjson` | `groqFilter` is `_type in ["course", "lesson", "category", "instructor"]`, so `video` is **not** visible to the Context MCP agent today. |
| `studio/scripts/seed/seed.ndjson` | 120 lessons, each with a `videoUrl` of the form `https://www.youtube.com/watch?v=<11 char id>`. |

## Decisions and assumptions

1. **One document per unique video, discovered from the dataset.** The pipeline queries
   `*[_type == "lesson"].videoUrl` with the server-only read token, dedupes by provider video
   id, so a video used by three lessons yields one document and the pipeline needs no manifest
   upkeep. `--urls <file>` reads a newline-delimited URL list instead when the token is absent.
2. **`_id` is `video.<provider>-<nativeId>`, for example `video.youtube-9602Yzvd7ik`.**
   Deterministic, so `--replace` is idempotent. The `id` field stores the bare
   `youtube-9602Yzvd7ik`. Every character outside `[A-Za-z0-9._-]` is stripped, the result is
   trimmed of leading `.`/`-` so the id is legal, and anything over 120 characters is hashed with
   `node:crypto` rather than truncated (truncation would collide).
3. **Document fields are exactly `id`, `url`, `title`, `chapters`, `chunks`.** `title` is the one
   addition to the AGENTS.md §8 list; it exists so the Studio list is readable and comes free
   from the player response. Nothing else is stored. In particular there is **no** whole
   transcript field, per §12.
4. **Generated fields are `readOnly` in the Studio** so an author cannot hand-edit data the
   pipeline owns, and the nav labels the group as generated. Regeneration overwrites regardless.
5. **Chapter sources, in precedence order:** an authored override at
   `scripts/ingest/chapters/<id>.json`, then the provider's own description markers, then none.
   No chapters is a valid outcome and the log says so; per §7 search then falls back to the
   transcript. Overrides exist because description chapters are curated by whoever uploaded the
   video, and we do not want that to be the only path. Ship **one** real override so the code
   path is exercised rather than dead.
6. **Description chapter parsing requires YouTube's own rules**: a contiguous run of lines that
   starts at `0:00`, is strictly increasing, has at least 3 entries, and does not run past the
   video duration. Anything looser picks up timestamps from social links and subscribe bumps.
   A line is `[(h:)mm:ss]` then an optional `-`, `–`, `—`, `|` or `:` separator, then a label.
   Labels are collapsed to single spaces and capped at 120 characters.
7. **Chunking groups cues up to 30 seconds or 600 characters**, whichever comes first, and breaks
   the group at any silence gap over 10 seconds so a chunk never spans an ad break. A single cue
   longer than the character target is split at the sentence boundary nearest the target. Cue
   text is joined with single spaces and whitespace-collapsed. Exact duplicate cues are dropped,
   because auto-captions repeat.
8. **English track preference** is manual `en`, then `en` auto, then the first `en-*`. The
   choice is logged per video so a wrong pick is visible.
9. **Failures are loud.** Default is fail-fast on the first video that cannot be built, and the
   process exits non-zero. `--skip-failures` continues, still printing a failure summary and
   still exiting non-zero. A video with no captions is a failure, never a document with an
   empty `chunks` array: an empty transcript looks identical to a match that found nothing.
10. **A document over roughly 1 MB is refused** rather than truncated, so an unusually long video
    fails visibly instead of landing a partial transcript.
11. **Politeness**: `--concurrency` defaults to 3, and any request that fails with 429 or 5xx is
    retried twice with exponential backoff.
12. **`title` is only for the Studio list.** Search resolves every visible string from the lesson
    that references the video, so nothing renders from this field.

## Files touched

Created:

- `studio/schemaTypes/documents/video.ts` — the `video` document type.
- `studio/schemaTypes/objects/video-chapter.ts` — `{ startSeconds, label }`.
- `studio/schemaTypes/objects/video-chunk.ts` — `{ startSeconds, text }`.
- `studio/scripts/ingest/index.ts` — CLI entry: flags, orchestration, reporting, exit code.
- `studio/scripts/ingest/types.ts` — shared types plus the provider adapter interface.
- `studio/scripts/ingest/ids.ts` — URL parsing, provider detection, `_id` derivation.
- `studio/scripts/ingest/sources.ts` — URL discovery from the dataset or from `--urls`.
- `studio/scripts/ingest/chapters.ts` — override loading and description marker parsing.
- `studio/scripts/ingest/chunk.ts` — the cue to chunk chunker.
- `studio/scripts/ingest/youtube.ts` — the YouTube adapter: player response, caption fetch, retry.
- `studio/scripts/ingest/chapters/z9-_YQWxwJ4.json` — one authored chapter override.

Modified:

- `studio/schemaTypes/index.ts` — register `video`, `videoChapter`, `videoChunk`.
- `studio/structure.ts` — add a "Video data" group holding the generated documents.
- `studio/package.json` — `ingest:videos`, `ingest:videos:dry`, `videos:import`, `typecheck`
  scripts; `tsx` devDependency.
- `studio/.gitignore` — ignore `/scripts/ingest/out`.
- `studio/.env.example` — document `SANITY_API_READ_TOKEN` as an optional, read-only, server-side
  variable used only by the offline pipeline, and say plainly it must never be prefixed
  `NEXT_PUBLIC_`.

Not touched: `lib/video.ts`, `sanity/**`, `app/**`, `components/**`, `lib/**`, the root
`package.json`, `studio/scripts/seed/**`.

## Requirements

### Schema

1. `video` is a document with `id` (string, required), `url` (url, required), `title` (string),
   `chapters` (array of `videoChapter`), `chunks` (array of `videoChunk`). Every field is
   `readOnly` and carries a description saying the offline pipeline owns it.
2. Both object types validate `startSeconds` as a required non-negative integer and their text or
   label as required and non-empty.
3. The `preview` selects `title` with `id` and chapter and chunk counts as the subtitle.
4. The type is registered in `studio/schemaTypes/index.ts` and reachable from `structure.ts`
   under a group titled to make clear it is generated, not authored.

### Pipeline

5. `ingest:videos` runs `tsx scripts/ingest/index.ts --env-file-if-exists=../.env.local` from the
   `studio` workspace. Flags: `--out <path>`, `--dry-run`, `--urls <file>`, `--only <id>`,
   `--limit <n>`, `--concurrency <n>`, `--skip-failures`, `--overwrite-chapters <file>`. Unknown
   flags print usage and exit non-zero.
6. URL discovery: default reads distinct `videoUrl` values from lessons via the read token and
   reports how many lessons and unique videos were found. `--urls` reads a file instead and says
   in its output that the dataset was not consulted. `--only` filters the discovered set.
7. Every unrecognised or malformed URL is skipped with a counted reason, never silently dropped.
8. A video document is only written when it has at least one chunk. Report per video: the id, the
   chapter count and their source, the chunk count, the total seconds covered, and which caption
   track was used.
9. Output is newline-delimited JSON, one document per line, `_id` and `_type` first, arrays
   carrying stable `_key` values derived from the array index so a re-run produces a byte-identical
   file for unchanged input.
10. `--dry-run` performs the whole fetch and build, prints the same report, and writes nothing.

## Security considerations

- The pipeline is server-side tooling and reads only `SANITY_API_READ_TOKEN`. It performs no
  writes; the dataset changes only through `sanity dataset import`, which uses the CLI's own
  credentials.
- Nothing under `studio/scripts/ingest/` is imported by the Studio or by the web app, and no
  pipeline file is reachable from a route. The browser never gains a new code path.
- Never log a token. Never write a token into the NDJSON, a report, or a committed file.
- Video documents hold no references to other documents, so no cross-dataset reference checking
  applies to the import.
- The pipeline fetches only `youtube.com`. It accepts no URL from the browser and follows no
  redirect to an arbitrary host.
- The generated NDJSON is git-ignored, since it is reproducible output rather than source.

## Acceptance criteria

1. `npm --prefix studio run typecheck` passes with the pipeline included.
2. `npm --prefix studio run ingest:videos -- --dry-run --limit 3` reports three videos built with
   a non-zero chapter or chunk count, and writes no file.
3. A full run writes NDJSON where every line parses, every document has `_type: "video"`, a
   non-empty `chunks` array, and a `_id` matching `/^video\.youtube-[A-Za-z0-9_-]{11}$/`.
4. For `9602Yzvd7ik` the report shows chapters from the description and a chunk count consistent
   with a 350 second video at the configured 30 second target.
5. `z9-_YQWxwJ4` builds with chapters from the override file, proving the override path.
6. `sanity schemas extract` succeeds, and after `videos:import` a GROQ count of `_type == "video"`
   equals the number of lines written.
7. Re-running the import changes no document ids and creates no duplicates.

## Checks to run

From the `studio` workspace, reporting real output:

- `npm run typecheck`
- `npm run lint` if a lint script exists, otherwise skip and say so
- `npm run ingest:videos -- --dry-run --limit 3`
- `npm run ingest:videos` full run, then inspect the report and the first document
- `npm run videos:import`, then verify with GROQ over the query API using the existing read token:
  - `count(*[_type == "video"])`
  - documents with zero chunks: `count(*[_type == "video" && count(chunks) == 0])` must be 0
  - non-monotonic chunks: spot-check one document's `chunks[].startSeconds` ordering
- `npx sanity schemas extract` so the committed `schema.json` stays in step

Root workspace: **no changes**, so `npm run typecheck` and `npm run lint` there must still pass
unchanged. Report their output anyway.

## Manual test steps

1. `npm --prefix studio run typecheck` — expect no errors.
2. `npm --prefix studio run ingest:videos -- --dry-run --limit 3` — expect three video ids, each
   with a chapter count, a chunk count and a caption track name, and no file written.
3. `npm --prefix studio run ingest:videos` — expect one line per unique video plus a totals
   block. Note any video listed as failed and why.
4. Open `studio/scripts/ingest/out/videos.ndjson`, take the line for `9602Yzvd7ik`, and confirm
   `chapters[0].startSeconds === 0` and that `chunks[].startSeconds` never decreases.
5. `npm --prefix studio run videos:import` — expect the CLI to report the document count.
6. In Sanity Studio, open **Video data**: confirm the documents are listed, open one and confirm
   every field is read-only, and confirm chapters and chunks are present and ordered.
7. Run the GROQ counts from the checks section and confirm the video count matches the line count.
8. Re-run step 5 and confirm the count is unchanged.

## Out of scope

- **Vimeo and Bunny ingestion and playback.** Decision 1 above.
- **Wiring video documents into search.** No change to `sanity/lib/search.ts`,
  `lib/search-schema.ts`, the results UI, or `studio/scripts/seed/agent-context.ndjson`. That
  Context document's `groqFilter` still excludes `video`, so the agent cannot see these documents
  yet. Timestamp resolution, video-moment result cards, and the `?start=` handoff from a result
  to the lesson page are the next piece of work. Flagged, not started.
- **Progress tracking, analytics, and any page work.**
