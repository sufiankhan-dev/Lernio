# Seed the Sanity dataset from `studio/scripts/seed/seed.ndjson`

## Goal

Load the provided course content into the Sanity `production` dataset using the official
Sanity CLI import, then verify the resulting document counts. No content is authored or
generated. Neither seed file is modified.

## Skills read

- `AGENTS.md` — data model (section 8), checks (section 13), boundaries (section 5).
- `agent/skills/sanity-migration/SKILL.md` conventions for import-based seeding.

## Code and config inspected

| File | What it showed |
| --- | --- |
| `studio/package.json` | No `seed` script. Sanity CLI `6.7.2`, `sanity ^5.31.2`. |
| `studio/sanity.cli.ts` | `api: { projectId, dataset }` read from `studio/env.ts`. Typegen points at `../sanity/**/*.ts`. |
| `studio/.env` | `SANITY_STUDIO_PROJECT_ID=gdotcciy`, `SANITY_STUDIO_DATASET=production`. |
| `studio/schemaTypes/documents/*` | `course`, `lesson`, `instructor`, `category` exist. **No `video` type.** |
| `studio/scripts/seed/seed.ndjson` | 392,693 bytes, 141 lines, UTF-8 clean (0 replacement chars, 0 mojibake). 120 `lesson`, 10 `course`, 6 `category`, 5 `instructor`. |
| `studio/scripts/seed/videos.json` | 35,394 bytes. Plain object keyed by `<course>-<module>-<lesson>` slug, values `{id, title, channel, duration, query}`. Not NDJSON, no `_type`, no chapters, no transcript chunks. |
| `studio/node_modules/@sanity/import/dist/assetRefs.js:6` | `assetMatcher = /^(file|image)@([a-z]+:\/\/.*)/` — the `image@https://...` form is exactly what the importer accepts, so the 135 asset refs will be downloaded and uploaded. |
| `%USERPROFILE%/.config/sanity/config.json` | CLI authenticated (`authType: normal`), user token with project write access. |

## Decisions and assumptions

1. **`seed.ndjson` is imported as-is.** The `_id` values are deterministic
   (`course.<slug>`, `lesson.<slug>`, `instructor.<slug>`, `category.<slug>`), which is what
   makes the `--replace` re-run idempotent.
2. **Assets are fetched from their external URLs.** 135 unique `image@` refs:
   120 lesson thumbnails on `i.ytimg.com`, 5 instructor portraits on `randomuser.me`,
   10 course covers on `picsum.photos`. A reachability probe of one URL per host returned
   `200 image/jpeg` for all three, so `--allow-failing-assets` is **not** passed. If the
   import does abort on a single asset, re-run with that flag and report which assets
   landed as `null`.
3. **`--replace` is used** (user approved). The dataset currently holds only 12 system
   documents, so nothing authored is overwritten on this run.
4. **`videos.json` is treated as the ingestion manifest, not an import source** (user
   approved). It is not NDJSON, has no `_type`, carries no chapters or transcript chunks,
   and the `video` document type does not exist in the Studio schema. Per AGENTS.md
   section 9 the video documents come from the offline ingestion pipeline, which is not
   built yet. Importing placeholder video documents now would put off-spec documents in the
   dataset and give search nothing to resolve timestamps against.
5. **No `video` docs, no `agent context` doc, no progress records are created.** They are not
   in the seed file, and AGENTS.md keeps the Context document and progress state separate from
   seeded content.
6. **`videos.json` and `seed.ndjson` are not modified.** Nothing is rewritten, reformatted, or
   transformed into a temporary NDJSON.
7. **No new npm script is added.** The import is a one-off dataset operation, run from the
   Studio workspace so `sanity.cli.ts` resolves the project and dataset. It is documented in
   the close-out report so it can be re-run by hand.

## Files touched

- None created, modified, or deleted. Read-only except for the dataset itself.

## Requirements

1. Run the import from the `studio` workspace against the configured project and dataset.
2. Do not hand-wave the flags: import with `--replace`, no `--allow-failing-assets`, no
   `--allow-system-documents`, no `--allow-replacement-characters` (the file is clean UTF-8).
3. Capture the CLI's own summary output (documents imported, assets uploaded, any warnings)
   and report it verbatim rather than paraphrasing.
4. Verify afterwards with GROQ over the query API using the existing server-side read token.
   Verification is read-only and uses the token from the root `.env.local`; the token is never
   echoed into a committed file or sent to the browser.
5. Verify counts **and** integrity, not just totals:
   - per-type counts match the NDJSON (course 10, lesson 120, instructor 5, category 6)
   - zero documents where `_type == "video"`
   - zero documents whose asset field resolved to `null` (an asset that failed to upload)
   - reverse reference check: every lesson in the file is reachable from a course module,
     and every course module lesson ref resolves to a real lesson document
   - all 10 courses reference an existing instructor and an existing category
6. Report the delta against the pre-import baseline of 12 system documents and 0 content
   documents.

## Verification queries

Counts:

```groq
{
  "course": count(*[_type == "course"]),
  "lesson": count(*[_type == "lesson"]),
  "instructor": count(*[_type == "instructor"]),
  "category": count(*[_type == "category"]),
  "video": count(*[_type == "video"]),
  "system": count(*[_type == "system.group" || _type == "system.retention"])
}
```

Asset integrity, one query per family so a failure names the family:

```groq
// lessons
count(*[_type == "lesson" && !defined(thumbnail.asset._ref)])
// courses
count(*[_type == "course" && !defined(coverImage.asset._ref)])
// instructors
count(*[_type == "instructor" && !defined(photo.asset._ref)])
```

Referential integrity:

```groq
// lesson ids referenced by some course module that do not resolve to a lesson document
count(*[defined(modules[_ref in *[_type == "lesson"]._id]) == false && _type == "course"]) == 0

// dangling instructor or category references from courses
count(*[_type == "course" && (!defined(instructor._ref) || !defined(category._ref))])
```

Lesson coverage per course, to confirm every seeded lesson landed inside a course:

```groq
*[_type == "course"]{ "course": slug.current, "moduleLessons": count(modules[]->_ref[]) }
```

The expected total across all courses is 120, matching the 120 lesson documents in the file.

## Security considerations

- The import uses the CLI's stored user token from `%USERPROFILE%/.config/sanity/config.json`.
  Never copy that token into a file, a command that lands in shell history as a literal
  argument, or the repo.
- Verification queries authenticate with `SANITY_API_READ_TOKEN`, which is a **Viewer** token.
  It is read-only, which is exactly right for counting after the import, and it stays server
  side. Never prefix it `NEXT_PUBLIC_`, never pass it to the browser, never commit it.
- No secret is written to `seed.ndjson` or `videos.json`. Confirm both files are byte-identical
  after the run (`scripts/seed` files must be unmodified).
- The import writes only to dataset `production` in project `gdotcciy`. Confirm the resolved
  project and dataset from the CLI output before trusting the result.

## Acceptance criteria

- [ ] `sanity dataset import` completes against `gdotcciy` / `production` with `--replace`.
- [ ] CLI reports 141 documents imported (10 + 120 + 5 + 6) and reports the asset uploads.
- [ ] Post-import GROQ counts are exactly course 10, lesson 120, instructor 5, category 6,
      video 0.
- [ ] Zero lessons, courses, or instructors have a missing asset ref.
- [ ] Every lesson in the file is referenced by a course module; module lesson count totals 120.
- [ ] No course has a missing instructor or category reference.
- [ ] `seed.ndjson` and `videos.json` are unmodified.
- [ ] No repo file is created or changed by this task.

## Checks to run

- Pre-import baseline count query (already captured: 12 system docs, 0 content docs).
- The import command itself, with full output captured.
- Post-import count, asset-integrity, and referential-integrity queries above.
- `git status --porcelain` on the repo to prove no tracked file changed.
- No type check, lint, or build: this task adds no code, no route, and no config. AGENTS.md
  section 13 requires those checks only when code changes, and none does here.

## Manual test steps

1. Open the Studio (`npm run studio:dev` from the repo root, or `npm run dev` in `studio`).
2. Confirm the desk lists **10 courses**, 120 lessons reachable through their modules,
   5 instructors, and 6 categories.
3. Open `Next.js App Router in Depth`. Confirm the cover image renders, the instructor and
   category resolve, and modules expand to their lessons in order.
4. Open any lesson. Confirm the thumbnail renders, Portable Text notes render with bullets,
   `keyPoints` and `resources` populate, and `duration` matches the `duration` in
   `videos.json` for that lesson slug.
5. Open an instructor. Confirm the portrait renders and the bio renders as Portable Text.
6. Run the app (`npm run dev` at the repo root) and load `/`. Confirm the catalog renders the
   seeded courses with cover images, then open a course and a lesson.
7. Note: the video embed should load the YouTube player from the seeded `videoUrl`. Timestamped
   search will **not** work yet, because no `video` documents exist until the ingestion pipeline
   runs. That is expected from this task, not a failure.

## Out of scope

- Building the video ingestion pipeline.
- Creating `video` documents or a `video` schema type.
- Creating the agent context document or any progress records.
- Seeding My Learning, notifications, or free-preview access control (presentational per
  AGENTS.md section 7).

---

# Outcome

## Import

Run from the `studio` workspace:

```
npx sanity dataset import "scripts/seed/seed.ndjson" --dataset production --replace
```

CLI output, verbatim:

```
- [0%] Reading/validating data file (0.00s)
√ [100%] Reading/validating data file (215ms)
- [0%] Importing documents (0.00s)
√ [100%] Importing documents (1.55s)
- [0%] Importing assets (files/images) (0.00s)
√ [100%] Importing assets (files/images) (34.54s)
- [0%] Setting asset references to documents (0.00s)
√ [100%] Setting asset references to documents (445ms)
- [0%] Strengthening references (0.00s)
√ [100%] Strengthening references (410ms)
Done! Imported 141 documents to dataset "production"
```

No `--allow-failing-assets` was needed. All 135 assets uploaded, so the Studio now shows
real images rather than broken placeholders.

## Verification result

Pre-import baseline was 12 system documents and 0 content documents. After import:

| Check | Result |
| --- | --- |
| courses | 10 (expected 10) |
| lessons | 120 (expected 120) |
| instructors | 5 (expected 5) |
| categories | 6 (expected 6) |
| video documents | 0 (expected 0, no video type exists yet) |
| progress documents | 0 |
| agent context documents | 0 |
| `sanity.imageAsset` | 135 (all uploaded) |
| modules | 40, four per course |
| module lesson refs | 120, all unique |
| orphaned lessons | 0 |
| dangling lesson refs | 0 |
| unresolved instructor or category refs | 0 |
| empty modules | 0 |
| lessons missing `videoUrl`, `duration`, `notes`, `keyPoints`, `resources` | 0 |
| lessons whose `_id` does not match `lesson.<slug>` | 0 |

`seed.ndjson` and `videos.json` are byte-identical before and after, confirmed by SHA-256.
`git status --porcelain` shows only this prompt file and the untracked `studio/scripts/`
directory. No tracked file changed.

## Finding: the seed and the Studio schema disagree on three field names

The import succeeded and all data is present, but three fields are written under a name the
schema and the app queries do not read. GROQ returns `null` for all of them, so these UI
elements will silently render empty:

| Studio schema / app query reads | Seed writes | Result |
| --- | --- | --- |
| `course.isPopular` | `course.popular` | 10/10 courses set `popular`, 0/10 set `isPopular`. Popular badge never renders. |
| `lesson.isFreePreview` | `lesson.freePreview` | 120/120 set `freePreview`, 0/120 set `isFreePreview`. Free preview badge never renders. |
| `lesson.poster` | `lesson.thumbnail` | 120/120 set `thumbnail` with a valid uploaded asset, 0/120 set `poster`. Lesson poster image never renders. |

`lesson.summary` is also absent from all 120 seed lessons. It is declared in the schema and
projected by `LESSON_DETAIL_QUERY`, so the lesson summary line renders empty. This one is a
plain omission rather than a name collision.

`proTip` is present on 34 of 120 lessons and matches the schema, so the pro tip section is
correctly populated where the seed provides it.

The seed files were not modified, per instruction. Fixing this means deciding which side is
canonical: rename the schema and app queries to the seed's names, or rename the fields in the
seed. That is a separate change and needs the user's call.

## Note on GROQ at API version 2026-10-01

Computed projection keys must be quoted. `{"slug": slug.current}` parses, but
`{slug: slug.current}` and `{n: count(notes)}` fail with `string literal expected`. Bare
attribute projections such as `{_id, duration, videoUrl}` are unaffected. Every query in
`sanity/lib/queries.ts` already quotes its computed keys, so no application query needs
changing. Worth knowing before writing new GROQ in this project.