# Fix `seed.ndjson` to match the Studio schema, then re-import

## Goal

The dataset imported cleanly but the Studio surfaces errors, because the seed writes several
fields under names the schema does not define. This task rewrites
`studio/scripts/seed/seed.ndjson` so every document conforms to `studio/schemaTypes`, then
re-imports with `--replace` so the dataset matches the schema.

The lesson image is a **poster**, per the user's correction: the field is `poster`, and the
seed's `thumbnail` was the wrong name.

## Skills read

- `AGENTS.md` — data model (section 8), checks (section 13).
- `agent/skills/sanity-migration/SKILL.md` — importing content into Sanity.

## The audit that produced this work

A script compared every seed document against `studio/schema.json` plus the `validation` rules
in the schema TypeScript files (validation rules are not present in `schema.json`, so the
required-field and max-length lists were read from the `.ts` sources). Full result:

```
=== unknown-field (250) ===
  x120  "thumbnail" is not in the lesson schema
  x120  "freePreview" is not in the lesson schema
  x10   "popular" is not in the course schema

=== missing-required (240) ===
  x120  required "summary" is absent
  x120  required "poster" is absent

=== type-mismatch (5) ===
  x5    "bio" schema says string, seed has array (2 blocks)

=== bad-object-type (122) ===
  x122  resources[]._type "resource" not in lessonResource

=== bad-option (162) ===
  x122  resource type "link" not in documentation/guide/repository/article/video/tool/other
  x13   learningOutcome icon outside layers/database/gauge/cloud/code/rocket/shield/zap
```

## Decisions confirmed by the user

1. **`duration` is seconds in the seed but minutes in the schema.** Seed values match
   `videos.json` exactly (min 187, max 2156, median 518), which is clearly seconds, while
   `lesson.ts` titles the field "Duration (minutes)" and describes it as "Whole minutes".
   **Decision: convert the seed to whole minutes.** `videos.json` keeps its raw seconds, since
   it is the ingestion manifest and is not modified.
2. **`instructor.bio` stays a plain string.** The schema declares it a required `text` field
   and the seed stores 2 Portable Text blocks. **Decision: flatten the seed**, joining the two
   blocks with a blank line. No schema change.
3. **Keep the schema's icon list closed.** The seed uses `workflow` (8), `sparkles` (3) and
   `puzzle` (2). **Decision: map** `workflow → cloud`, `sparkles → zap`, `puzzle → layers`.
   No schema change, so the UI icon map keeps resolving.

## Code and config inspected

| File | Finding |
| --- | --- |
| `studio/schemaTypes/documents/lesson.ts` | Fields: `title`, `slug`, `summary` (required, max 200), `videoUrl`, `poster` (required image, required `alt`), `duration` (required, min 1, integer, "Whole minutes"), `keyPoints`, `notes`, `proTip`, `resources`, `isFreePreview`, `studentCount`. |
| `studio/schemaTypes/documents/course.ts` | Fields include `isPopular` (not `popular`), `level` restricted to `beginner`/`intermediate`/`advanced`, `price`, `learningOutcomes`. |
| `studio/schemaTypes/documents/instructor.ts` | `bio` is `type: 'text'`, required, max 2000. |
| `studio/schemaTypes/objects/lesson-resource.ts` | Object `name` is `lessonResource`. `type` option list is `documentation`/`guide`/`repository`/`article`/`video`/`tool`/`other`. |
| `studio/schemaTypes/objects/learning-outcome.ts` | `icon` option list is `layers`/`database`/`gauge`/`cloud`/`code`/`rocket`/`shield`/`zap`. |
| `studio/node_modules/@sanity/import/dist/importBatches.js:56` | `--replace` maps to `createOrReplace`, so stale fields are dropped rather than merged. |
| `studio/node_modules/@sanity/import/dist/importFromArray.js:67` | Asset reuse is skipped only for `--missing`, so a `--replace` re-import **reuses** the 135 existing assets instead of duplicating them. |

## Transforms to apply to `seed.ndjson`

Applied by a script, in this order, then written back with the same compact
`JSON.stringify` formatting, one document per line, original key order preserved.

| # | Document | Change | Count |
| --- | --- | --- | --- |
| 1 | `course` | rename `popular` → `isPopular` | 10 |
| 2 | `lesson` | rename `thumbnail` → `poster` | 120 |
| 3 | `lesson` | rename `freePreview` → `isFreePreview` | 120 |
| 4 | `lesson` | add `summary` from the first normal `notes` block | 120 |
| 5 | `lesson` | `resources[]._type` `"resource"` → `"lessonResource"` | 122 |
| 6 | `lesson` | `resources[].type` `"link"` → `"documentation"` | 122 |
| 7 | `instructor` | `bio` block array → string joined with `"\n\n"` | 5 |
| 8 | `course` | `learningOutcomes[].icon`: `workflow`→`cloud`, `sparkles`→`zap`, `puzzle`→`layers` | 13 |
| 9 | `lesson` | `duration`: `Math.round(seconds / 60)` | 120 |

Notes on the non-mechanical ones:

- **`summary` is derived, never invented.** Each lesson's `notes` array opens with one
  `style: "normal"` block whose spans read as a one-line overview. All 120 of those strings are
  between 93 and 181 characters, comfortably inside the schema's 200 character limit, so the
  summary is the concatenation of that first block's span text, unmodified. No new prose is
  written. Example: `The App Router maps folders to URL segments and reserved filenames to
  behaviour. Once you can read a folder tree as a set of routes, most of the framework stops
  being magic.`
- **`summary` is inserted directly after `slug`**, matching the schema's field order, without
  disturbing the order of any other key.
- **`documentation` is correct for all 122 resources.** All of them are official reference
  sites (`Next.js documentation`, `PostgreSQL documentation`, `OWASP Top 10`, and so on). No
  resource is a tool, video, or repository, so no other value from the option list is needed.
- **`duration` rounding.** `Math.round(187 / 60) = 3` at the low end and
  `Math.round(2156 / 60) = 36` at the high end, so every value stays above the schema's
  `min(1)`. No lesson rounds to 0.
- **`videos.json` is not touched.**

## Files touched

- `studio/scripts/seed/seed.ndjson` — modified in place by the transform script.
- A timestamped backup of the original is written to
  `C:\Users\DELL\AppData\Local\Temp\opencode\seed.ndjson.bak` before the write, outside the repo.
- The transform and audit scripts live in
  `C:\Users\DELL\AppData\Local\Temp\opencode\`, outside the repo. No new repo files beyond this
  prompt.

## Requirements

1. Back up `seed.ndjson` before writing, and record the before/after SHA-256.
2. Run the audit against the **transformed in-memory documents first**, before writing anything
   to disk. The audit must report zero findings in every bucket except `duration`. Only then
   write the file. This is a dry run gate, not an afterthought.
3. Re-run the audit against the file after writing, to prove the on-disk bytes parse and are
   clean.
4. Assert the document count is unchanged at 141 lines and that every `_id` is byte-identical to
   the original, so no document is added, dropped, or renamed.
5. Re-import from the `studio` workspace with `--replace`, and capture the CLI output verbatim.
6. Re-run the live dataset verification, extended to assert the previously null fields now
   resolve: `isPopular` on 10/10 courses, `isFreePreview` on 120/120 lessons, `poster` with a
   resolved `asset._ref` on 120/120 lessons, `summary` present on 120/120 lessons, `bio` a
   string on 5/5 instructors, `resources[]._type` `lessonResource` on all 122 resources, and
   zero documents still carrying `popular`, `thumbnail`, `freePreview`, `_type == "resource"`,
   or a Portable Text array in `bio`.
7. Confirm the asset count is still 135, proving assets were reused and not duplicated.
8. Confirm referential integrity still holds: 120 module lesson refs, 0 orphans, 0 dangling.

## Security considerations

- The import uses the CLI's stored user token from `%USERPROFILE%/.config/sanity/config.json`.
  Never write it into a file or pass it as a literal command argument.
- Verification reads through the `SANITY_API_READ_TOKEN` Viewer token, read from `.env.local`
  by the script itself so it never appears in a command line or a committed file. It stays
  server side.
- `videos.json` and `.env` are never written.
- The transform writes only inside `studio/scripts/seed/` plus the temp backup. It performs no
  network calls.

## Acceptance criteria

- [ ] Backup written; before/after hashes recorded and the file is intentionally changed.
- [ ] Dry-run audit on transformed documents reports 0 unknown-field, 0 missing-required,
      0 type-mismatch, 0 bad-object-type, 0 bad-option findings.
- [ ] On-disk file still has 141 lines and identical `_id` values.
- [ ] `--replace` import completes with no errors and no failed-asset warnings.
- [ ] Live counts unchanged: 10 courses, 120 lessons, 5 instructors, 6 categories, 0 videos.
- [ ] Live `isPopular` 10/10, `isFreePreview` 120/120, `poster.asset._ref` 120/120,
      `summary` 120/120, string `bio` 5/5, `lessonResource` 122/122.
- [ ] Live counts of `popular`, `thumbnail`, `freePreview`, `_type == "resource"` are all 0.
- [ ] Asset count still 135.
- [ ] Referential integrity intact.

## Checks to run

- Transform dry-run audit, then post-write audit, then live dataset audit.
- No type check, lint, or build: this task changes one data file and no code, route, or config.

## Manual test steps

1. `npm run studio:dev`. Open a course. The **Popular** badge shows on the four courses with
   `isPopular: true` and not on the other six.
2. Open a lesson. The **Poster image** field renders the thumbnail, and its **Alternative
   text** is populated. No "unknown field" warnings in the document.
3. Open the same lesson. The **Summary** field shows the one-line overview, and the Duration
   shows whole minutes, for example `9 min` for the old 518 second value.
4. Open a lesson's **Resources**. The entries render as `Lesson resource` objects with Type
   `Documentation`, not as blank unknown objects.
5. Open an instructor. The **Bio** field is plain editable text with two paragraphs and no
   type-mismatch error.
6. Open a course's **What you'll learn** grid. Every icon resolves to a glyph. No icon shows as
   a missing or raw name.
7. Confirm the Studio document inspector shows no validation errors on any seeded document.
8. `npm run dev` at the root, load `/`, open a course and a lesson, confirm covers, posters,
   durations, and the free preview badge render.

---

# Outcome

## Seed file hashes

| File | Before | After |
| --- | --- | --- |
| `seed.ndjson` | `10B9F805…3951` | `F087FA7D…7C24F` |
| `videos.json` | `3979204D…98A9` | `3979204D…98A9` (untouched) |

Backup of the original: `C:\Users\DELL\AppData\Local\Temp\opencode\seed.ndjson.bak`.

## One extra transform beyond the 9 planned

The 120 poster `alt` strings read `Video thumbnail for <lesson>`, which contradicts the poster
terminology this task established. After renaming the field to `poster`, the alt text was
rewritten to `Poster image for <lesson>`. This was not in the original plan and is called out
here for the record. Course cover alts already said `Cover image for …` and instructor alts
said `Portrait of …`, so neither needed changing.

## Process note: the transform is not idempotent

`duration` conversion divides by 60, so running the transform twice against an
already-converted file would divide minutes again. The script now refuses any lesson whose
`duration` is at or below 60, since the original seed's minimum is 187 seconds and converted
values land between 3 and 36. The mid-task sequence was: restore from the pristine backup,
re-run the single transform from the original, audit, then import. An earlier guard attempt
using a `> 1440` threshold was wrong, because the original maximum is 2156 seconds; it was
caught by the dry run before any write.

## Dry-run audit gate

The audit compares every document against `studio/schema.json` plus the `validation` rules
read from the schema TypeScript files, since `schema.json` does not carry validation and does
not carry `options.list` values either. Before the fix:

```
unknown-field     250    thumbnail x120, freePreview x120, popular x10
missing-required  240    summary x120, poster x120
type-mismatch        5    bio is an array where the schema says string
bad-object-type  122    resources[]._type "resource" instead of "lessonResource"
bad-option       162    resource type "link" x122, icons outside the closed list x13
```

After the fix, every bucket is zero and only the informational duration line remains:

```
lesson.duration min=3 max=36 median=9
```

## Import

```
npx sanity dataset import "scripts/seed/seed.ndjson" --dataset production --replace
```

```
√ [100%] Reading/validating data file (103ms)
√ [100%] Importing documents (1.44s)
√ [100%] Importing assets (files/images) (9.37s)
√ [100%] Setting asset references to documents (452ms)
√ [100%] Strengthening references (453ms)
Done! Imported 141 documents to dataset "production"
```

No errors, no failed-asset warnings. Asset phase dropped from 34.5s to 9.4s, confirming the
135 existing assets were reused rather than re-uploaded.

## Verification, 22 checks, all passing

Counts unchanged: 10 courses, 120 lessons, 5 instructors, 6 categories, 0 videos, 12 system.

Fields that previously resolved to `null` now populate:

| Field | Result |
| --- | --- |
| `course.isPopular` | 10/10 defined, 4 set true |
| `lesson.isFreePreview` | 120/120 defined, 10 set true |
| `lesson.poster` | 120/120, all with a resolved `asset._ref` and non-empty `alt` |
| `lesson.summary` | 120/120 non-empty |
| `instructor.bio` | 5/5 plain strings |
| `resources[]._type` | 122/122 `lessonResource` |
| `resources[].type` | 122/122 `documentation` |
| `learningOutcomes[].icon` | 40 outcomes, all inside the closed list |
| `lesson.duration` | 120/120 within 1 to 60, range 3 to 36, median 9, total 1370 |

Stale fields confirmed fully removed, which is what `createOrReplace` guarantees:
`popular` 0, `thumbnail` 0, `freePreview` 0, resources typed `resource` 0.

Assets still 135, so nothing was duplicated. Referential integrity intact: 120 module lesson
refs, all unique, 0 orphans, 0 dangling refs, 0 unresolved instructor or category refs.

Document identity preserved: 141 lines, `_id` values and their order byte-identical to the
backup.