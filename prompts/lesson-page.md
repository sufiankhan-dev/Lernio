# Lernio Lesson Page

## Goal

Implement `/lessons/[slug]` matching `design/lernio-lesson.png`, rendered from the seeded Sanity
content, with the lesson video playing on the page through the provider's own embed.

Two deliverables in one change:

1. The page itself — left curriculum sidebar, breadcrumb, lesson header, video player, tabbed
   content, resources, prev/next footer.
2. The playback layer — a provider embed for the lesson's `videoUrl`, honouring a `?start=` seconds
   query param so a future search result can deep-link into a lesson.

The mock's copy is fictional (`Next.js for Production`, 12 modules, `35% complete`,
`3,426 students`). The layout, typography, colour, spacing and states follow the image; every string
and number comes from Sanity.

## Skills read

- `AGENTS.md` — all sections. §3 (UI work, image is the source of truth, reuse existing components),
  §5 (workspace boundaries), §7 (playback stays on site through a provider embed; never send the
  learner out; `start` param; search is result cards), §8 (lesson stores no parent course),
  §9 (only treat a provider as supported when playback and ingestion both exist), §12, §13.
- `node_modules/next/dist/docs/01-app/02-guides/videos.md` — `<iframe>` is the documented approach
  for platform-hosted video; an iframe needs explicit dimensions or an `aspect-ratio`, and should
  carry `title`, `allowFullScreen`, `loading`, `referrerPolicy`.
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` and
  `dynamic-routes.md` — `params`/`searchParams` are Promises; `PageProps<"/lessons/[slug]">` is the
  typed-routes convention this repo already uses.
- No other skill applies. Nothing in `sanity-best-practices`, `sanity-migration`, or the search-agent
  skills is needed: no schema change, no import, no search work.

## Code and config inspected

- `app/courses/[slug]/page.tsx` — the page template. Page shell
  (`mx-auto flex w-full max-w-[1440px] flex-1 flex-col rounded-t-[24px] bg-canvas`), `SiteHeader`,
  `generateMetadata` + `notFound()`, and the existing note that no progress source exists yet.
- `app/globals.css` — the whole design system in one `@theme` block. Reused as-is: `primary-*`,
  `neutral-*`, `canvas`; `font-display` (Playfair) / `font-sans` (Inter); `hero`, `display-1`,
  `display-2`, `heading-1..3`, `body-large`, `body`, `small`; `xs/sm/md/lg/xl` radii;
  `shadow-sm..xl`. **No new colour, size or radius.**
- `sanity/lib/queries.ts` — `LESSON_DETAIL_QUERY` already projects everything this page needs:
  `title`, `slug`, `summary`, `videoUrl`, `poster`, `duration`, `isFreePreview`, `studentCount`,
  `keyPoints`, `notes`, `proTip`, `resources[]`, and `course` (with `coverImage`, `level`,
  `studentCount`, `category`, `instructor`, and every `modules[]{ lessons[] }` with slugs and
  durations). **The course's `modules` projection lacks `summary`, which the mock's sidebar does not
  show either, so no query change is required.**
- `sanity/lib/data.ts` — `getLessonBySlug(slug)` already exists and is exported.
- `sanity.types.ts` — `LESSON_DETAIL_QUERY_RESULT` is deeply nullable at every level
  (`title`, `summary`, `videoUrl`, `poster`, `duration`, `keyPoints`, `notes`, `proTip`,
  `resources[]`, `course`, `course.modules[]`, `.lessons[]`). Every field needs a guard.
- `studio/scripts/seed/seed.ndjson` — all **120** lessons carry
  `videoUrl: "https://www.youtube.com/watch?v=<id>"` and an external `poster`
  (`https://i.ytimg.com/vi/<id>/hqdefault.jpg`). Notes are Portable Text blocks: a `normal` intro
  paragraph, an `h2`, `bullet` items, and a closing `normal` paragraph.
- `components/ui/Icon.tsx` — 32 names across exhaustive `outlinePaths` + `filledPaths` records.
  Has `check-circle`, `play-square`, `clock`, `chart`, `users`, `bookmark`, `chevron-*`,
  `arrow-right`, `external-link`, `document`, `code`. **Missing `arrow-left` and `lightbulb`**, both
  of which the mock uses.
- `components/ui/Card.tsx` — `ResourceCard` matches the mock's resource tiles (icon, title,
  description, external-link). Its `meta` prop is **required** and always renders a line; the mock
  shows no meta line.
- `components/ui/Nav.tsx` — `Breadcrumbs` already accepts `(string | { label, href? })[]`, so the
  4-level breadcrumb needs no primitive change.
- `components/ui/Button.tsx` — `Button`/`LinkButton` with `iconPosition: "leading" | "trailing"`
  (default trailing) and variants `primary | secondary | tertiary | text`. Covers "Back to course",
  "Previous Lesson" and "Next Lesson".
- `components/ui/ProgressBar.tsx` — `role="progressbar"`, `h-1.5`, `bg-primary-500` fill. Matches the
  sidebar's progress bar in the mock.
- `components/course/CourseContent.tsx` — the existing accordion, `Lesson {i}.{j}` labelling, and
  the `Free preview` pill, all reusable as patterns.
- `components/course/CatalogCard.tsx` — `CardMark` initials fallback for a square course tile.
- `lib/format.ts` — `formatDuration`, `formatStudentCount`, `formatLevel` are the only formatters;
  the lesson page reuses all three.
- `components/course/CourseActions.tsx` — the existing `aria-pressed` local-state bookmark pattern.
- `next.config.ts` — `images.remotePatterns` allows only `cdn.sanity.io`. The seeded `poster` assets
  are external (`i.ytimg.com`), so **the video player must not route the poster through
  `next/image`**.
- `package.json` — `@portabletext/react@6.2.0` is present in `node_modules` but only transitively;
  it must be added as a direct dependency before importing it.
- `design/lernio-lesson.png` — the source of truth. Measured at its 1536px design width: container
  1440 centred; sidebar column ~355px with a `border-r`; ~56px from the sidebar border to the main
  column; content inset 64px; player 16:9; footer bar spans the full container width below both
  columns.

## Decisions and assumptions

1. **YouTube is the only provider implemented.** All 120 seeded lessons are YouTube. AGENTS.md §9
   says a provider is not "supported" until both ingestion and playback exist, and ingestion is a
   separate task, so Vimeo and Bunny parsing is left out on purpose. `lib/video.ts` is shaped so
   adding one is a single function.
2. **The player is a plain `<iframe>` server component.** No client wrapper, no custom controls, no
   facade domain — AGENTS.md §7 forbids a custom player, and the Next docs recommend the plain
   iframe for platform-hosted video. `youtube-nocookie.com` is used, with `rel=0`. No `autoplay`:
   `start` seeks, and the learner presses play, which is also what browsers allow without muting.
3. **`?start=` is read from `searchParams` on the server**, which makes the route dynamic. This is
   deliberate: AGENTS.md §7 requires a result to deep-link to a lesson at a second, and that is the
   page's job. Consequently **no `generateStaticParams`** and **no new GROQ** — prerendering a
   page that reads `searchParams` is not possible, so `LESSON_SLUGS_QUERY` is not added. Tracked as
   a known trade-off in the closing report.
4. **`start` is clamped** to a non-negative integer and to the lesson's own `duration * 60`, so a
   hand-edited or malicious `?start=999999999` cannot ask the provider for a nonsense offset. Any
   unparsable or out-of-range value is ignored and the video starts at 0.
5. **The wordmark stays `Lernio`, not `Vertex`**, and `<SiteHeader />` is reused untouched. Same
   reasoning as `prompts/course-page.md` decision 3.
6. **Course progress renders `0%`, not the mock's `35%`.** There is no `progress` document type, no
   progress query and no progress route in the repo, so `35%` would be fabricated. Same approved
   stance as `prompts/course-page.md` decision 11. The real `ProgressBar` primitive renders at 0.
7. **Sidebar completion marks are position-derived, not progress-derived.** The mock ticks modules
   1–4 with a check-circle. With no progress data, the only honest mapping is "modules before the
   current one", so those render a `primary-500` check-circle and every later module renders a
   `chevron-down`. The icon is `aria-hidden` (as `Icon` already is), so no false completion claim
   reaches assistive tech. When a progress source lands, real completion replaces this at one place.
8. **Within the current module, the marker rail is orange up to the current lesson and grey after
   it**, reproducing the mock's vertical rail. That is position, not completion.
9. **The sidebar curriculum header** reads `Module {n} of {total}` with a chevron that collapses or
   expands the whole module list. `n` is the current lesson's module index.
10. **The current lesson's module is open on load**; every other module starts collapsed.
11. **Lesson numbering is derived, never stored** — `Module {i}` and `Lesson {i}.{j}` from array
    order, matching `CourseContent.tsx` and AGENTS.md §8.
12. **Tabs: "Lesson Content" (default) and "Notes".** `Lesson Content` shows Overview, "In this
    lesson you will", the Pro Tip and Resources. `Notes` shows the lesson's Portable Text `notes`.
    Both tabs render server-side Portable Text; `LessonTabs` is a thin client shell that receives
    the two panels as `ReactNode` props, so no raw Sanity value crosses into the client bundle.
13. **`Overview` shows `lesson.summary`,** which the header already shows. In the seed
    `notes[0]` restates the summary, so the duplication is a seed artefact rather than a UI choice;
    no component invents a second wording. Called out in the closing report.
14. **The poster is not rendered.** The embed paints its own first frame, which is exactly what the
    mock shows. Rendering the external `i.ytimg.com` poster would also require adding a host to
    `next.config.ts`, which the reference does not need.
15. **An unrecognised `videoUrl` degrades to a neutral placeholder panel** carrying the lesson title
    and a line saying the video is not available for playback. No iframe with a broken `src`, and
    per §7 no outbound link to the provider.
16. **`ResourceCard.meta` becomes optional.** The mock's resource tiles show no meta line, and the
    existing component renders one unconditionally. Making the prop optional and rendering the
    span only when present is backwards compatible and reuses the approved card.
17. **`Icon` gains `arrow-left` and `lightbulb`.** Both are used by the mock and neither exists. Each
    needs an `outlinePaths` **and** a `filledPaths` entry, because both records are exhaustive over
    `IconName`. `arrow-left` is the exact mirror of the existing `arrow-right`.
18. **`ResourceCard` icon comes from the resource `type`** via a new `resourceIcon(type)` mapper in
    `lib/format.ts` (same shape as the existing `learningOutcomeIcon`): `documentation`/`article` →
    `document`, `guide` → `document`, `repository` → `code`, `video` → `play-circle`, `tool` →
    `grid`, `other`/unknown → `external-link`.
19. **`@portabletext/react` is added to `package.json`** as a direct dependency. It is already
    installed transitively at 6.2.0 with a React 19-compatible peer range, so this records
    reality rather than changing the tree.
20. **No `GradientBars` on this page.** The mock ends with the prev/next footer bar; there is no
    gradient band beneath it.
21. **Student count is compacted** (`18420` → `18.4k`), reusing `formatStudentCount`, so the lesson
    page matches the already-built course and catalog pages even though this one mock renders a
    comma-separated `3,426`. Consistency with shipped code wins.
22. **Lesson-level `studentCount` wins over the course's,** falling back to the course value, since
    the lesson projection already carries it.
23. **Responsive down to mobile** (no mobile reference in `design/`): below `lg` the sidebar stacks
    above the lesson column and its rail is dropped; the resource grid goes 3 → 2 → 1 columns; the
    footer bar wraps from one row into two. Desktop stays exact.
24. **No new tokens and no restyling.** Every value comes from `globals.css` or an existing component
    class.

## Files touched

New:

- `app/lessons/[slug]/page.tsx` — server component. `generateMetadata`, `notFound()`, reads
  `searchParams.start`, normalises the deep-nullable query result into plain objects, renders the
  page shell, sidebar and lesson column.
- `components/lesson/LessonSidebar.tsx` — `"use client"`. Course tile + progress, `Module {n} of
  {total}` collapse toggle, module accordion with the marker rail, current-module lessons with the
  "Now playing" state.
- `components/lesson/LessonHeader.tsx` — server. `LESSON {i}.{j}` eyebrow, Playfair title, bookmark
  slot, summary, 3-item meta row.
- `components/lesson/LessonBookmark.tsx` — `"use client"`. `aria-pressed` local-state toggle, the
  existing `CourseActions` pattern.
- `components/lesson/VideoPlayer.tsx` — server. 16:9 provider embed, or the placeholder panel.
- `components/lesson/LessonTabs.tsx` — `"use client"`. Tab list + panel switch over two
    server-rendered `ReactNode`s.
- `components/lesson/LessonContent.tsx` — server. Overview, key-point checklist, Pro Tip callout,
    resources grid.
- `components/lesson/LessonNotes.tsx` — server. Portable Text `notes` via `@portabletext/react`.
- `components/lesson/LessonNavigation.tsx` — server. Full-width prev/next footer bar.
- `lib/video.ts` — `getVideoEmbed(url, startSeconds)`. YouTube id extraction from `watch`,
    `youtu.be`, `embed`, `shorts` and `live` forms; `null` for anything else.

Modified:

- `components/ui/Icon.tsx` — add `arrow-left` and `lightbulb` to `IconName`, `outlinePaths` and
  `filledPaths`.
- `components/ui/Card.tsx` — `ResourceCard.meta` becomes optional and renders conditionally.
- `lib/format.ts` — add `resourceIcon(type)`.
- `package.json` — add `@portabletext/react` to `dependencies`.

Untouched on purpose: `sanity/lib/queries.ts`, `sanity/lib/data.ts`, `sanity.types.ts`, every Studio
file, `app/globals.css`, `next.config.ts`, `.env.example`, and every existing page.

## Requirements

### Route (`app/lessons/[slug]/page.tsx`)

- Server component. `props: PageProps<"/lessons/[slug]">`; `await props.params` for `slug` and
  `await props.searchParams` for `start`.
- `notFound()` when `getLessonBySlug` returns `null` or the lesson has no `slug`.
- `generateMetadata` returns the lesson `title` and `summary`, falling back to `Lesson not found —
  Lernio` and `Lernio`.
- Page shell copied from `app/courses/[slug]/page.tsx`, but **without** `GradientBars`.
- Two-column `lg` grid below the header: sidebar (own column, `lg:border-r lg:border-neutral-200`)
  and the lesson column, ~40–56px apart, both inside the same `lg:px-16` inset. The prev/next footer
  is a sibling of the grid and spans the full container width with a `border-t`.
- Normalise first, then pass plain objects to the client sidebar. The raw
  `LESSON_DETAIL_QUERY_RESULT` never reaches a client component.
- Flatten `course.modules[].lessons[]` in order to find the current lesson's `{ moduleIndex,
  lessonIndex, lessonNumber }` and its `{ previous, next }` neighbours. When the lesson's course or
  its lesson list is missing, hide the neighbours rather than guessing.

### Sidebar (`components/lesson/LessonSidebar.tsx`)

- `"use client"`, holding exactly two pieces of state: which modules are open (the current one
  seeded open) and whether the curriculum is collapsed. No fetch, no storage, no write.
- `Back to course` link to `/courses/{course.slug}`, `LinkButton variant="text"`,
  `icon="arrow-left"` **leading**, `text-primary-500`.
- Square `size-14` course tile: initials on `bg-neutral-900` (the `CatalogCard` `CardMark` pattern,
  which is what the mock's dark tile shows) — not `next/image`, since seeded covers are external
  `picsum` URLs that `next.config.ts` does not allow.
- Course title, then `{n}% complete` from the real `ProgressBar` at `0`, `showLabel={false}`.
- `Module {n} of {total}` header with a `chevron-down` that rotates when collapsed, `aria-expanded`
  and `aria-controls` on the whole curriculum.
- Module row: `size-9` `rounded-full border` number badge, title, `formatDuration(module minutes)`,
  then a trailing check-circle for modules before the current one and a `chevron-down` otherwise.
  The whole row is a `<button>` with `aria-expanded` / `aria-controls`; only one module is open at a
  time is **not** required — multi-open is allowed, matching `CourseContent`.
- Module minutes are summed from lesson `duration` (whole minutes), the same derivation as
  `getCatalogCourses`.
- Lesson row inside the open module: a marker on the rail (filled `size-2 rounded-full` in
  `primary-500` for the current lesson, `border border-neutral-300 rounded-full` otherwise), title,
  `formatDuration`, and for the current lesson a `text-primary-500` "Now playing" line plus a
  `bg-primary-500 text-white rounded-full` `play-square` button on the right.
- The rail is `border-l-2`: `primary-500` from the current module's header down to and including the
  current lesson, `neutral-200` above and below.
- Each lesson row links to `/lessons/{slug}`; the current one is `aria-current="page"`.
- `Free preview` pill on lessons where `isFreePreview` is true, matching `CourseContent`.
- Empty state: if there are no modules, render the "Back to course" link and the course block only.

### Lesson header (`components/lesson/LessonHeader.tsx`)

- `LESSON {i}.{j}` eyebrow: `text-small font-semibold uppercase tracking-wider text-primary-500`.
- Title `font-display text-display-1 text-neutral-900`.
- Bookmark button on the right: `size-14 rounded-md border border-neutral-200`, `text-primary-500`
  icon, `aria-pressed`, from `LessonBookmark`.
- Summary `text-body-large text-neutral-600`, wrapped to the mock's ~2 lines.
- Meta `dl`, three items, 16px icons, `text-body`, each with an `sr-only` `<dt>`: `clock` +
  `formatDuration(lesson.duration)`, `chart` + `formatLevel(course.level)`,
  `users` + `{formatStudentCount(n)} students`. Filter out items with no value, as `CatalogCard`
  does, and render nothing when all three are empty.

### Player (`components/lesson/VideoPlayer.tsx`)

- `aspect-video w-full overflow-hidden rounded-lg bg-neutral-900 shadow-sm` wrapper.
- `<iframe>` with the `src` from `getVideoEmbed`, plus `title` (`{lesson.title} — video`),
  `allowFullScreen`, `loading="lazy"`, `referrerPolicy="strict-origin-when-cross-origin"`,
  `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"`,
  `className="aspect-video h-full w-full border-0"`.
- Placeholder panel when `getVideoEmbed` returns `null`: same box, `bg-neutral-900`, a `play-square`
  icon and the line "This lesson's video is not available for playback." No iframe, no outbound link.

### Tabs and content

- `LessonTabs` is `"use client"` and renders a `role="tablist"` of two `role="tab"` buttons: active
  is `text-primary-500` with a `border-b-2 border-primary-500`, inactive is `text-neutral-500`; a
  full-width `border-b border-neutral-200` under the row. Panels are `role="tabpanel"`, rendered
  from the two `ReactNode` props. Correct `aria-selected`, `aria-controls` and `id` wiring.
- `LessonContent` renders, in order:
  - `h2` `Overview` (`font-display text-heading-2`) then `lesson.summary` in `text-body-large`.
  - `border-t border-neutral-200` divider.
  - `In this lesson you will:` label then `keyPoints` as a checklist: `check-circle` in
    `text-primary-500` and `text-body text-neutral-700`. Render nothing when `keyPoints` is empty.
  - Pro Tip callout: `rounded-lg bg-primary-100 p-6`, a `lightbulb` icon in `text-primary-500`, a
    `Pro Tip` label in `font-display text-heading-3`, and `proTip` in `text-body text-neutral-700`.
    Render nothing when `proTip` is null.
  - `border-t` divider, `h2` `Resources`, then a `sm:grid-cols-2 xl:grid-cols-3 gap-4` of
    `ResourceCard` with `icon={resourceIcon(type)}`. Render nothing when `resources` is empty.
- `LessonNotes` renders `notes` through `@portabletext/react` `PortableText` with `h2`/`h3` mapped
  to `font-display text-heading-2`, paragraphs to `text-body-large text-neutral-600`, and lists to
  the same `list-disc`/`list-decimal` treatment. Empty state when `notes` is null or empty.

### Footer navigation (`components/lesson/LessonNavigation.tsx`)

- `border-t border-neutral-200`, full container width, `flex flex-wrap items-center gap-6`.
- `Previous Lesson`: `LinkButton variant="tertiary"`, `icon="arrow-left"` **leading**, linking to
  the previous lesson's slug.
- Next to it, the previous lesson's title (`text-body font-medium text-neutral-900`) over
  `formatDuration` (`text-small text-neutral-500`).
- Mirrored on the right for the next lesson, then the `Next Lesson` `LinkButton variant="primary"`
  with `icon="arrow-right"` trailing.
- At a boundary, omit that side's block and button entirely rather than rendering a dead link.

## Security considerations

- The page is a **server component** and imports `getLessonBySlug` from `sanity/lib/data.ts`, which
  is `import 'server-only'`. If anything ever tried to pull it into the client graph the build
  fails, which is the intended guard.
- `SANITY_API_READ_TOKEN` stays on the server. It is never referenced by a `NEXT_PUBLIC_` variable,
  never read by any new client component, and never serialised into props.
- The only client components are `LessonSidebar`, `LessonBookmark` and `LessonTabs`. They receive
  plain strings, numbers, booleans, slugs and pre-rendered `ReactNode`s — no tokens, no Sanity
  image objects, no `_id`/`_rev`.
- `LessonSidebar` and `LessonBookmark` are local UI state only. Neither fetches, stores or writes
  anything, so no browser-side write path is introduced (AGENTS.md §5, §7).
- **`start` is untrusted input.** It is parsed with `Number.parseInt`, rejected when `NaN`, clamped
  to `>= 0`, and capped at `lesson.duration * 60`. Only then is it placed into the embed query
  string, and only after `encodeURIComponent`, so a crafted value cannot inject extra parameters or
  break out of the URL.
- `videoUrl` is author-supplied. `lib/video.ts` parses it with `new URL()` inside a `try/catch` and
  matches against an **allowlist of provider hosts**; anything else yields `null`. A hostile or
  malformed `videoUrl` therefore cannot turn the player into an arbitrary third-party iframe.
- The embed uses `youtube-nocookie.com` so no YouTube advertising cookie is set until the learner
  interacts, and `referrerPolicy="strict-origin-when-cross-origin"` withholds the referring URL.
- `notes` is authored Portable Text and is rendered by `@portabletext/react`, which does not inject
  raw HTML. Any `markDefs` link is rendered through `next/link`/an `<a>`, never `dangerouslySetInnerHTML`.
- Nothing new is added to `.env.example`, because no new environment variable is introduced.

## Acceptance criteria

- `npm run typecheck` exits 0. In particular `Icon.tsx` typechecks, proving `arrow-left` and
  `lightbulb` have both path records.
- `npm run lint` exits 0 with no new warnings.
- `npm run build` succeeds. `next build` output shows `/lessons/[slug]` as a dynamic route (it reads
  `searchParams`), which is expected — see decision 3.
- `/lessons/nextjs-app-router-in-depth-file-system-routing` renders that lesson's real seeded
  content: title, summary, YouTube embed, 3-item meta row, key-point checklist, Pro Tip, resource
  card, and a sidebar listing all 4 modules of its course.
- The YouTube iframe actually loads and plays inside the page. Nothing navigates the learner to
  `youtube.com`.
- Every visible string and number traces to a seeded document or an arithmetic derivation of one. No
  title, summary, duration, module count, lesson number or student count is hardcoded.
- `LESSON {i}.{j}` and `Module {n} of {total}` are correct for the lesson's real position, including
  the first lesson of the first module (`Lesson 1.1`, `Module 1 of 4`).
- Sidebar progress reads `0% complete` with no fabricated percentage; the current module is open on
  load; the current lesson shows "Now playing".
- The footer prev/next links point at the correct adjacent lesson slugs. The first lesson of a
  course renders no "Previous Lesson", and the last renders no "Next Lesson".
- `/lessons/does-not-exist` renders the 404 page.
- `/lessons/<slug>?start=90` produces an embed URL ending in `start=90`, with no extra parameters
  injected; `/lessons/<slug>?start=abc`, `?start=-5` and `?start=999999999` all fall back to no
  `start` parameter.
- No unhandled console error, no `null`/`undefined`/`NaN` in the rendered output, and no broken image
  or broken iframe for any of the 120 seeded lessons.
- Only the 3 new client components carry `"use client"`; everything else stays on the server.
- `/`, `/courses`, `/courses/[slug]` and `/design-system` still render unchanged.

## Checks to run

From the repo root (the web workspace is the repo root; `studio/` is the separate Studio workspace):

1. `npm run typecheck`
2. `npm run lint`
3. `npm run build` — required, because a route and server modules were added. Confirm the build
   succeeds and note how `/lessons/[slug]` is classified in the route table.
4. `npm run dev`, then open a lesson route and compare against `design/lernio-lesson.png`.

No Studio check is needed: no schema changed, no content was imported, no Studio deploy is required.

## Manual test steps

1. Run `npm run dev` from the repo root.
2. Open `http://localhost:3000/courses/nextjs-app-router-in-depth`, then click the first lesson in
   module 1. It must land on `/lessons/nextjs-app-router-in-depth-file-system-routing`.
3. Confirm the video plays **on the page**: the YouTube player loads in the 16:9 frame, plays, and
   the browser URL stays on `localhost:3000`. Press play, scrub, and change volume with the
   provider's own controls.
4. Compare against `design/lernio-lesson.png`. Only the words and numbers differ; layout, spacing,
   type scale, colour and component states should line up.
5. Confirm the header shows `LESSON 1.1`, the lesson title, its summary, and a meta row of
   `6m` / `Intermediate` / a compacted student count.
6. Click the sidebar's `Module 1 of 4` chevron. The whole curriculum collapses and expands again.
7. Open module 2 in the sidebar. Its three lessons appear with durations; the current lesson's module
   shows `Now playing` and the orange play button; the rail is orange down to the current lesson and
   grey elsewhere. Click a sibling lesson and confirm you navigate to it.
8. Toggle `Lesson Content` / `Notes`. Both render, `aria-selected` tracks the active tab, and the
   Notes panel shows the Portable Text notes with the `h2` and bullet list.
9. Confirm the Pro Tip callout and the resources grid render from the seeded `proTip` and
   `resources[]`, each opening its `url` via the external-link icon.
10. Click `Next Lesson` three times. Each hop moves to the next lesson in curriculum order, the
    `LESSON {i}.{j}` eyebrow increments, and the sidebar's open module follows. On the last lesson of
    the course the `Next Lesson` button is gone.
11. Open `http://localhost:3000/lessons/nextjs-app-router-in-depth-file-system-routing?start=90`.
    Confirm the embed's `src` in DevTools contains `start=90` and the player is positioned at 1:30.
12. Repeat with `?start=abc`, `?start=-5`, and `?start=999999999`. Confirm no `start` parameter is
    sent and the video starts at 0, with no error in the console.
13. Click `Back to course` and the breadcrumb's `All Courses`. Both navigate correctly.
14. Click the bookmark icon. It toggles its pressed state and back with no network request and
    nothing written to storage.
15. Visit `/lessons/does-not-exist` and confirm the 404 page renders rather than an error.
16. Narrow the browser to 390px and confirm the sidebar stacks above the lesson column, the resource
    grid becomes one column, and the footer wraps. The desktop layout must be unchanged.
17. Reload `/`, `/courses` and `/courses/[slug]` and confirm all three still render unchanged.