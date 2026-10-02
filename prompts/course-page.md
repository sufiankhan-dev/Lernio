# Lernio Course Page

## Goal

Implement `/courses/[slug]` matching `design/lernio-course.png` exactly, rendered from the
already-seeded Sanity content (10 courses, 120 lessons, 6 categories, 5 instructors).

The reference mock's copy is fictional (`Next.js for Production`, 12 modules, `18h 24m`,
`2.1k students`). This task renders the real seeded content instead, so the layout,
typography, colour, spacing and states match the image while every string and number comes
from Sanity. Nothing in the UI may be hardcoded.

## Skills read

- `AGENTS.md` (all sections, especially §3 UI work, §5 boundaries, §8 data model, §13 checks).
- No additional skill applies. This is a read-only page over existing GROQ. Nothing in
  `sanity-best-practices`, `sanity-migration`, the search-agent skills, or `node_modules/next/dist/docs/`
  is needed, because no schema, seed, migration, search, or unfamiliar Next API is being touched.

## Code and config inspected

- `app/layout.tsx` — root server layout, `ClerkProvider`, `SanityLive`, Inter + Playfair
  fonts via `--font-inter` / `--font-playfair`.
- `app/page.tsx` — the style reference for a Sanity-driven page. Establishes the page shell:
  `mx-auto flex w-full max-w-[1440px] flex-1 flex-col rounded-t-[24px] bg-canvas`, `<SiteHeader />`,
  content sections, `<WeeklyNote />`, `<GradientBars />`.
- `app/globals.css` — Tailwind v4 `@theme` tokens. Available and to be reused as-is:
  `primary-100..900`, `neutral-50..900`, `indigo-*`, `success-*`, `canvas`;
  `font-display` (Playfair) / `font-sans` (Inter);
  type scale `hero`, `display-1`, `display-2`, `heading-1..3`, `body-large`, `body`, `small`;
  radii `xs/sm/md/lg/xl`; shadows `sm/md/lg/xl`. **No new colours or sizes are to be added.**
- `sanity/lib/queries.ts` — `COURSE_DETAIL_QUERY` and `COURSE_SLUGS_QUERY` already exist and
  already project everything this page needs. **No query change is required.**
- `sanity/lib/data.ts` — `getCourseBySlug(slug)`, `getCourseSlugs()` already exist.
- `sanity/lib/image.ts` — `urlFor()` image URL builder (safe for server use, no token).
- `sanity.types.ts` — generated. `COURSE_DETAIL_QUERY_RESULT` is **deeply nullable**:
  `title`, `summary`, `level`, `coverImage`, `learningOutcomes`, `modules`, `modules[].lessons`,
  `instructor`, `category` can each be `null`. Every one needs a guard or a fallback.
- `components/site/SiteHeader.tsx` — existing header: `SiteNav` + bell + `AuthControls`.
  `navLinks` has no `active` field, so nothing highlights "Courses" today.
- `components/ui/Nav.tsx` — `BrandMark`, `Logo`, `SiteNav` (supports `active`), and
  `Breadcrumbs` which currently takes `string[]` and hardcodes `href="#"` on non-final crumbs.
- `components/ui/Icon.tsx` — 23 icon names across `outlinePaths` / `filledPaths`, both typed as
  `Record<IconName, ...>`. **It has none of the 8 learning-outcome icons.**
- `components/ui/Button.tsx` — `Button` / `LinkButton`, variants `primary | secondary | tertiary | text`,
  sizes `sm | md`, icon always **trailing**.
- `components/ui/Badge.tsx` — variant `popular` is exactly the reference's `POPULAR` pill.
- `components/ui/ProgressBar.tsx` — `role="progressbar"` track/fill, `h-1.5`, `rounded-full`,
  label defaults to `"N% complete"`. Matches the reference progress bar exactly.
- `components/site/GradientBars.tsx` — the orange gradient bar footer.
- `components/ui/Card.tsx` — compact search-result cards (`p-4`, `text-heading-3`), **not** the
  taller layout used on this page. Do not use these shells for the outcome cards.
- `components/course/CatalogCard.tsx`, `CourseLogo.tsx` — hardcoded to 3 slugs that do not exist in
  Sanity; flagged as dead code in `prompts/sanity-content-model-and-data-layer.md` decision 12.
  Not used here (the hero tile is a Sanity `coverImage`).
- `lib/home-content.ts` — only a typed placeholder catalog plus `navLinks`. No formatting helpers exist.
- `next.config.ts` — empty. No `images.remotePatterns`, so Sanity CDN images are not yet
  allowed through `next/image`.
- `prompts/seed-sanity-dataset.md`, `prompts/fix-seed-schema-mismatch.md` — confirm the live
  `production` dataset is schema-clean: `duration` is **whole minutes**, `learningOutcome.icon`
  is a closed set of `layers | database | gauge | cloud | code | rocket | shield | zap`.
  The seed uses 7 of the 8 (`gauge`, `cloud`, `layers`, `shield`, `code`, `rocket`, `zap`).
- `design/lernio-course.png` — 1024x1536, the source of truth. Measured: content inset 64px;
  cover tile 280x341 (portrait, ~4:5) at x=64; right column starts x=401 (57px gap);
  title Playfair ~48px; meta row 4 items; outcome grid 2 cols; 6 module rows visible;
  "Show all N modules" centered below; progress card 880x58 overlapping the gradient bars.

## Decisions and assumptions

1. **No new GROQ.** `COURSE_DETAIL_QUERY` already returns `isPopular`, `price`, `studentCount`,
   `coverImage`, `learningOutcomes[]`, `category`, `instructor`, and `modules[]->lessons[]` with
   `slug`, `summary`, `duration`, `isFreePreview`. `COURSE_SLUGS_QUERY` feeds `generateStaticParams`.
   Adding a query would mean re-running TypeGen, so the existing one is the right call.
2. **`generateStaticParams` + `generateMetadata`.** Slugs come from `getCourseSlugs()`. Because
   that returns `(string | null)[]`, filter with a type guard before passing it to
   `generateStaticParams`. `notFound()` when `getCourseBySlug` returns `null`.
3. **Wordmark stays `Lernio`, not `Vertex`.** The mock image (and every other mock in `design/`)
   shows "Vertex", but the shipped `Logo` component, the root metadata, the README and `AGENTS.md`
   all say Lernio, and the home page is already approved and built with "Lernio". Reuse
   `<SiteHeader />` untouched rather than fork the brand for one page.
4. **`Breadcrumbs` is extended, not replaced.** Its prop becomes
   `(string | { label: string; href?: string })[]`, normalised internally. Plain strings keep
   rendering `href="#"`, so the existing `/design-system` call site
   (`items={["All Courses", "Next.js for Production", ...]}`, `app/design-system/page.tsx:429`)
   keeps working with zero changes.
5. **`LinkButton`/`Button` gain `iconPosition?: "leading" | "trailing"`** defaulting to `trailing`.
   The reference's Bookmark button has a **leading** icon, which the current primitive cannot
   express. Extending the primitive beats forking a bespoke button next to it.
6. **`SiteHeader` gains an optional `links` prop** defaulting to `navLinks`, so this page can pass
   `[{ label: "Courses", active: true }, { label: "My Learning" }]` and get the orange active state
   `SiteNav` already supports. Existing pages are unaffected.
7. **Normalise on the server, then hand plain objects to the client.** The two client components
   (`CourseContent`, `CourseActions`) receive a small serialisable shape, never the raw
   `COURSE_DETAIL_QUERY_RESULT`. This keeps the nullability handling in one place.
8. **Duration is summed from lesson minutes.** `lesson.duration` is whole minutes, so
   `formatDuration(minutes)` yields `"1h 28m"` when there is an hour component and `"45m"` when not.
   Course total = sum over all modules; module total = sum over its lessons. No duration is stored
   on `course` or `module`, so it must be derived (same approach `getCatalogCourses` already uses).
9. **`level` is stored lowercase** (`beginner | intermediate | advanced`) and the UI shows title case.
10. **Student count is compacted** (`18420` -> `"18.4k"`), matching the mock's `2.1k students`.
11. **Progress is `0%` with a `Start Learning` CTA** (approved decision). There is no `progress`
    document type, no progress query and no progress route in the repo, so hardcoding `35%` would
    ship a fabricated number. The bar renders the real `ProgressBar` primitive at `0`, the copy
    reads `0% complete` / `Start Learning`, and the CTA targets the first lesson in the curriculum.
    Wiring the real source later is a change to one prop at the call site.
12. **`CourseActions` is a client component for one reason**: the Bookmark toggle needs local
    pressed state, exactly like `components/ui/Pagination.tsx` already does. It holds **no** local
    storage, issues **no** request and writes **nothing**, so it does not cross the
    "browser never writes" boundary. Everything else on the page stays a server component.
13. **Onward links point at routes that do not exist yet.** `/lessons/<slug>` and `/courses` are not
    built. The hrefs are written correctly so nothing has to be revisited when those pages land,
    and the 404s are called out in the closing report rather than hidden.
14. **Accordion starts fully collapsed** with `chevron-down`, matching the mock. Expanding a module
    reveals its lessons as `Lesson {module}.{lesson}` labels, title, duration, and a free-preview
    tag when `isFreePreview` is set.
15. **The initial collapsed list shows the first 6 modules** and the `Show all {n} modules` button
    renders only when the course has more than 6, exactly as the mock does (6 of 12 shown). With
    the seeded data every course has 4 modules, so the button correctly does not appear. This is
    called out in the manual test steps so it is not mistaken for a bug.
16. **The progress card overlaps the gradient bars** with a negative top margin, reproducing the
    mock's layering, rather than introducing a sticky-positioned bar.
17. **Responsive down to mobile**, adapting sensibly since there is no mobile reference: the hero
    stacks (cover tile full width, then the text column), the outcome grid goes 1-column below
    `sm`, the progress card wraps to stacked rows, and the content inset drops from 64px to 24px.
    Desktop stays exact.
18. **`next/image` for the cover.** `cdn.sanity.io` is added to `images.remotePatterns` following the
    documented next-sanity pattern, because `next.config.ts` currently allows no remote images.
19. **No new tokens, no new colours, no restyling.** Every value comes from `globals.css` tokens
    and existing component classes.

## Files touched

New:

- `app/courses/[slug]/page.tsx` — server component. `generateStaticParams`, `generateMetadata`,
  `notFound()`, page shell, breadcrumb, hero, outcomes, content, gradient bars, progress card.
- `components/course/CourseHero.tsx` — cover tile, `POPULAR` badge, Playfair title, summary,
  4-item meta row.
- `components/course/CourseActions.tsx` — `"use client"`. `Continue Learning` / `Start Learning`
  link + `Bookmark` toggle with local state.
- `components/course/LearningOutcomes.tsx` — the bordered "What you'll learn" card and its 2-col grid.
- `components/course/CourseContent.tsx` — `"use client"`. Module accordion + `Show all N modules`.
- `components/course/CourseProgressBar.tsx` — presentational bar (label, value, `ProgressBar`, CTA).
- `lib/format.ts` — `formatDuration(minutes)`, `formatStudentCount(count)`, `formatLevel(level)`,
  and the `learningOutcome.icon` -> `IconName` map.

Modified:

- `components/ui/Icon.tsx` — add `layers`, `database`, `gauge`, `cloud`, `code`, `rocket`,
  `shield`, `zap` (all 8 schema-allowed `learningOutcome` values) and `users` (the mock's
  two-person students icon). Each needs an `outlinePaths` **and** a `filledPaths` entry, since
  both records are exhaustive over `IconName`.
- `components/ui/Nav.tsx` — `Breadcrumbs` accepts `{ label, href? }` objects alongside strings.
- `components/ui/Button.tsx` — `iconPosition` on `Button` and `LinkButton`.
- `components/site/SiteHeader.tsx` — optional `links` override.
- `next.config.ts` — `images.remotePatterns` for `cdn.sanity.io`.

Untouched on purpose: `sanity/lib/queries.ts`, `sanity/lib/data.ts`, `sanity.types.ts`,
every Studio file, `app/globals.css`, `lib/home-content.ts`, and the `CatalogCard`/`CourseLogo`
dead code (that is a separate cleanup task).

## Requirements

### Route (`app/courses/[slug]/page.tsx`)

- Server component. Reads via `getCourseBySlug(params.slug)`.
- `params` is a Promise in this Next version; follow the existing typed-routes convention
  (`PageProps<"/courses/[slug]">`) rather than destructuring synchronously.
- `notFound()` when the course is missing.
- `generateStaticParams` returns `(await getCourseSlugs()).filter(Boolean)`.
- `generateMetadata` returns the course `title` and `summary`, falling back to the app defaults.
- Page shell copied from `app/page.tsx`.

### Breadcrumb

- `All Courses` -> `/courses` (linked), then the course title (current page, `aria-current="page"`),
  separated by `chevron-right` — matching `Breadcrumbs`' existing markup and the mock.

### Hero

- Two columns on `lg`: `280px` portrait cover tile (`aspect-[4/5]`, `object-cover`,
  `rounded-lg`, `overflow-hidden`) and the text column, ~56px gap. Stacks below `sm`.
- Cover from `urlFor(course.coverImage)` through `next/image`. When `coverImage` is absent, render
  a `bg-neutral-900` placeholder tile carrying the course initials rather than an empty box or a
  broken image.
- `POPULAR` badge (`<Badge variant="popular">`) above the title, only when `isPopular` is true.
- Title in `font-display text-display-1`.
- Summary in `text-body-large text-neutral-600`, max width so it wraps like the mock's 3 lines.
- Meta row, `text-body`, four items each with a 16px icon: `chart` + level, `clock` + total
  duration, `folder` + `{n} modules`, `users` + `{compact} students`. Each item carries a `sr-only`
  `<dt>` so the `dl` is valid — same pattern as `CatalogCard`.
- Actions row: `CourseActions`.

### Actions (`CourseActions.tsx`)

- `Continue Learning` when there is a resume target, otherwise `Start Learning`. With no progress
  source it is always `Start Learning`, linking to the first lesson of the first module.
- `LinkButton variant="primary"` at `h-14 px-6 text-body-large`, `icon="arrow-right"` trailing.
- `Bookmark` is a real `<button>` with `aria-pressed`, `h-14 px-6`, `variant="tertiary"` styling,
  `icon="bookmark"` **leading**, local pressed state only.

### Learning outcomes

- One bordered `rounded-lg bg-white p-8 shadow-sm` card, `h2` `What you'll learn` in
  `font-display text-heading-1`.
- Inner grid `sm:grid-cols-2`, `gap-4`.
- Each item: `rounded-lg border border-neutral-200 bg-white p-6`, 40px `text-primary-500` icon
  from the `learningOutcome.icon` map (fallback `layers` for an unknown value), Playfair
  `text-heading-2` title, `text-body-large text-neutral-500` description.
- `learningOutcomes` may be `null` -> render nothing rather than an empty bordered card.

### Course content

- Header row: `h2` `Course Content` (`font-display text-heading-1`) and, right-aligned,
  `{n} modules` + a bullet + total duration, in `text-body text-neutral-500`.
- List: `rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden` with
  `divide-y divide-neutral-200`.
- Row: 32px `rounded-full border border-neutral-200` number badge; `flex-1 min-w-0` block with
  Playfair `text-heading-3` module title and `text-small text-neutral-500` module summary; then
  `text-body` module duration and a `chevron-down` that rotates to `chevron-up`-style
  (`rotate-180`) when open.
- The whole row is a `<button>` with `aria-expanded` / `aria-controls`.
- Expanded panel: the module's lessons, labelled `Lesson {n}.{m}`, with title, duration, a
  `Free preview` tag when set, each linking to `/lessons/{slug}`.
- `Show all {n} modules` button below the list, centered, bordered white, `h-11 px-5`,
  `text-body`, `chevron-down` trailing; label becomes `Show fewer modules` when open. Renders only
  when `modules.length > 6`.
- With zero modules, render nothing.

### Progress bar

- Overlaps `<GradientBars />` via a negative top margin.
- `rounded-lg border border-neutral-200 bg-white shadow-sm`, left block with
  `text-small text-neutral-500` `Your Progress` over `font-display text-heading-3` `{value}% complete`,
  centre `<ProgressBar value={0} showLabel={false} />`, right `Start Learning` primary button.
- `role="progressbar"` and its `aria-valuenow` come from the existing primitive, not hand-rolled.

## Security considerations

- The page is a **server component**. It imports `getCourseBySlug` from `sanity/lib/data.ts`, which
  is `import 'server-only'`. If a bundler ever tries to pull it into the client graph it fails the
  build, which is the intended guard.
- `SANITY_API_READ_TOKEN` stays server-side. It is never referenced in a `NEXT_PUBLIC_` variable,
  never read in either new client component, and never serialised into props. `urlFor()` is used
  instead, which needs only the public project id and dataset and therefore works with
  `next/image` from the server render.
- The two client components receive only plain display strings, numbers and slugs. No tokens, no
  Sanity image objects beyond the already-resolved CDN URL, no `_id`/`_rev` internals.
- The Bookmark toggle is local component state. It writes nothing, calls nothing, and touches no
  storage, so it does not introduce a browser-side write path that AGENTS.md §5 and §7 forbid.
  Persistence belongs to the future bookmarks feature, which must go through a server route.
- `coverImage.alt` is required by the Studio schema, so it is always present; it is still rendered
  defensively with a fallback to the course title.
- Nothing in this change exposes a `NEXT_PUBLIC_` value beyond what `.env.example` already lists,
  so `.env.example` needs no edit.

## Acceptance criteria

- `npm run typecheck` exits 0. Notably `Icon.tsx` typechecks, proving all new `IconName` members
  have both `outlinePaths` and `filledPaths` entries.
- `npm run lint` exits 0 with no new warnings.
- `npm run build` succeeds and statically generates all 10 seeded course routes.
- `/courses/nextjs-app-router-in-depth` renders that course's real seeded title, summary, cover,
  level, student count, 4 modules and 12 lessons.
- Every visible string and number traces back to a seeded document or to an arithmetic derivation
  of one. No title, summary, duration, module count or student count is hardcoded.
- Layout, type, colour and spacing match `design/lernio-course.png` at desktop width, with only the
  content differing.
- `POPULAR` appears on the 5 seeded courses with `isPopular: true` and on none of the other 5.
- The accordion opens and closes, `aria-expanded` tracks state, and "Show all n modules" appears
  when and only when there are more than 6 modules.
- The progress bar reads `0% complete` with the CTA `Start Learning` and no fabricated percentage.
- Nothing renders `null`, `undefined`, `NaN`, an empty bordered card, or a broken image for any of
  the 10 seeded courses.
- Only the 2 new client components carry `"use client"`; the rest of the page stays on the server.
- `/` and `/design-system` still render unchanged, including the existing `Breadcrumbs` string call.

## Checks to run

From the repo root (the web workspace is the repo root; `studio/` is the separate Studio workspace):

1. `npm run typecheck`
2. `npm run lint`
3. `npm run build` — required, because a route and server modules were added. Confirm the build
   output lists the 10 `/courses/[slug]` paths as prerendered.
4. `npm run dev`, then load a course route and compare against `design/lernio-course.png`.

No Studio check is needed: no schema changed, no content was imported, and no Studio deploy is
required by this change.

## Manual test steps

1. Run `npm run dev` from the repo root.
2. Open `http://localhost:3000/courses/nextjs-app-router-in-depth`.
   Expect the real seeded course: Playfair title, its seeded summary, cover tile, `POPULAR` badge,
   `Intermediate`, a computed total duration, `4 modules`, a compacted student count, 4 outcome
   cards, and 4 module rows.
3. Compare against `design/lernio-course.png` side by side. Only the words and numbers differ;
   layout, spacing, type scale, colour and component states should line up.
4. Hover/click a module row. It expands to show its lessons as `Lesson 1.1`, `1.2`, `1.3` with
   durations, and the chevron rotates. Click again to collapse. Confirm the free-preview tag shows
   on lessons where the seed set `isFreePreview: true`.
5. Confirm `Show all N modules` is **absent**. This is correct, not a bug: seeded courses have 4
   modules and the threshold is 6. To see the button, temporarily lower the threshold constant and
   reload, or trust the logic.
6. Click `Start Learning`. It navigates to `/lessons/<first-lesson-slug>`, which currently 404s
   because the lesson page is a separate task. The href is correct.
7. Click `All Courses` in the breadcrumb. It navigates to `/courses`, which currently 404s because
   the catalog page is a separate task (the header `Courses` link already behaves this way).
8. Click `Bookmark`. It toggles to its pressed state and back, with no network request in the
   Network tab and nothing written to storage.
9. Visit `/courses/react-performance-engineering` and confirm the `POPULAR` badge is **absent**
   (`isPopular: false` in the seed), proving the badge is data-driven and not hardcoded.
10. Visit `/courses/python-for-data-work` and confirm `Beginner` renders as title case and
    `price: 0` causes no layout problem (price is not shown on this page).
11. Visit `/courses/does-not-exist` and confirm the 404 page renders rather than an error or a
    crash.
12. Narrow the browser to 390px and confirm the hero stacks, the outcome grid becomes one column,
    the module rows stay readable and the progress card wraps. The desktop layout must be unchanged.
13. Reload `/` and `/design-system` and confirm both still render, in particular the
    `Breadcrumbs` section on `/design-system`.