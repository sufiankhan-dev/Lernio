# Lernio Sanity Content Model, Studio, and Read Data Layer

## Goal

Build the Lernio content model and the authoring Studio, plus the server-side read client and data
layer the Next.js app will read from.

Two deliverables:

1. **Content model + Studio.** A standalone Sanity Studio workspace at `studio/` holding the schema
   for `course`, `module`, `lesson`, `instructor`, and `category` (plus the embedded object types
   those need), a custom desk structure, and TypeGen wiring.
2. **Read data layer.** A server-only Sanity client, a `sanityFetch` helper, the GROQ query module,
   and typed read functions for the catalog, course, lesson, instructor, and category.

The Studio is currently embedded in the Next.js app at `app/studio/[[...tool]]`, which `AGENTS.md`
§5 forbids ("do not embed the Studio inside Next.js"). This change moves it to a standalone
workspace and deletes the embedded route.

Nothing else. No pages, no search, no progress, no video ingestion. Read `AGENTS.md` §14: keep it
small.

## Skills read

- `AGENTS.md` — §1 (what to build), §2 (prompt first), §4 (skills), §5 (layers and boundaries, two
  workspaces), §6 (stack), §7 (fixed decisions), §8 (the data being modeled, and which relationships
  are fixed), §12 (private dataset, server-only token, env in `.env.example`, Context MCP needs a
  deployed Studio), §13 (checks), §14 (when in doubt).
- `sanity-best-practices/SKILL.md` plus these references:
  - `references/project-structure.md` — the monorepo shape (standalone `studio/` beside the web
    app), and that "Embedded Studio" is legacy. Its §Setup note: configure TypeGen in
    `studio/sanity.cli.ts` to read queries from the web app and write types into the web app.
  - `references/schema.md` — `defineType` / `defineField` / `defineArrayMember` discipline; data over
    presentation; references vs nested objects; shared field arrays; array `_key` handling; icons;
    slug uniqueness validation; safe schema updates.
  - `references/studio-structure.md` — desk structure patterns, grouping and dividers.
  - `references/nextjs.md` — §2 `defineLive` + `<SanityLive />`, §3 `sanityFetch` options, §5
    standalone Studio setup, §6 token helper pattern, §7 `notFound()` on missing documents,
    §9 pagination.
  - `references/typegen.md` — `sanity.cli.ts` `typegen` config, `defineQuery` requirement that
    queries be assigned to a variable, **unique query variable names**, tsconfig `include`, and the
    recommendeden "commit generated types" strategy.
  - `references/groq.md` — always project fields at every level; quoted keys for nested/computed
    expressions; reverse references with `references(^._id)`; `count()`; filter/pagination guidance.

`sanity-migration`, `create-agent-with-sanity-context`, `dial-your-context`, and
`shape-your-agent` were **not** used: this task neither imports content nor builds the search agent
or its Context document (see "Deliberately out of scope").

## Code and config inspected

- `package.json` — Next `16.3.8`, React `19.2.8`, Tailwind `^4`, `next-sanity` `^13.3.4`,
  `@sanity/image-url` `^2.1.1`, `sanity` `^5.31.2`, `@sanity/vision` `^5.31.2`,
  `styled-components` `^6.5.3`, `@clerk/nextjs` `^7.9.9`. `package-lock.json` present, so npm.
- `sanity.config.ts` (root, `'use client'`) — embedded Studio config, `basePath: '/studio'`,
  `structureTool` + `visionTool`.
- `sanity.cli.ts` (root) — `defineCliConfig({ api: { projectId, dataset } })`, no typegen.
- `sanity/schemaTypes/index.ts` — `schema.types` is an **empty array**. Nothing is modelled yet.
- `sanity/structure.ts` — flat `S.documentTypeListItems()` under a "Content" title.
- `sanity/env.ts` — `apiVersion` defaults to `'2026-10-01'`; `dataset` and `projectId` read
  `NEXT_PUBLIC_SANITY_DATASET` / `NEXT_PUBLIC_SANITY_PROJECT_ID` via `assertValue`.
- `sanity/lib/client.ts` — `createClient` with `useCdn: true` and **no token**.
- `sanity/lib/live.ts` — `defineLive({ client })`, exports `sanityFetch` and `SanityLive`.
- `sanity/lib/image.ts` — `urlFor` via `createImageUrlBuilder`.
- `app/studio/[[...tool]]/page.tsx` — `<NextStudio config={config} />`, `dynamic = 'force-static'`.
- `app/layout.tsx` — `ClerkProvider` inside `<body>`; signature is `LayoutProps<"/">`, so this is
  Next 16 typed routes. No `<SanityLive />`.
- `tsconfig.json` — `"@/*": ["./*"]`, `include` covers `**/*.ts` and `**/*.tsx`, `exclude` covers
  `node_modules`, `agent`, `.agents`, `.claude`, `.next`.
- `.gitignore` — `.env*` with `!.env.example`; `/node_modules` is root-anchored.
- `.env.example` — Clerk keys only. **No Sanity variables documented yet**, even though
  `sanity/env.ts` already requires two.
- `.env.local` — already has `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET`.
  **No Sanity read token.** Values were not read into the transcript or any committed file.
- `lib/home-content.ts` — hardcoded catalog array with a `logo: CourseLogoKey` key of
  `"nextjs" | "docker" | "typescript"`.
- `components/course/CatalogCard.tsx` — takes `logo: CourseLogoKey`, plus `slug`, `title`,
  `summary`, `level`, `duration` (preformatted string), `moduleCount`.
- `design/lernio-course.png` — course page. Confirms POPULAR badge, level, total duration, module
  count, student count, a 4-up "What you'll learn" grid of icon/title/description cards, and a
  numbered course-content list where each module row shows title + summary + duration.
- `design/lernio-lesson.png` — lesson page. Confirms LESSON 5.1 label, title, one-line summary,
  duration / level / student count row, video poster, an "Overview" prose block, "In this lesson you
  will:" checkmarked key points, a "Pro Tip" callout, and a Resources row of cards each with an icon
  and external-link affordance. The sidebar numbers modules and lessons from order.

### Verified against installed packages

- `@sanity/icons@3.8.0` exports **all icons as root named exports** (`import { BookIcon } from
  '@sanity/icons'`). It has **no subpath exports** (`exports` is only `.` and `./package.json`), so
  the skill's "always import from a subpath" rule does not apply to this version. Confirmed by
  reading `node_modules/@sanity/icons/package.json` and `dist/index.d.ts` (242 named exports).
  Icon names confirmed to exist: `BookIcon`, `PlayIcon`, `UserIcon`, `TagIcon`, `FolderIcon`,
  `SparklesIcon`, `LinkIcon`. (`LightbulbIcon` and `TickIcon` do **not** exist.)
- `@sanity/cli-core` `typegen` config shape
  (`node_modules/@sanity/cli-core/dist/_exports/index.d.ts:155,1480`):
  `{ enabled?, formatGeneratedCode?, generates, overloadClientMethods?, path: string | string[], schema }`.
- Studio env loading: `node_modules/@sanity/cli-core/dist/loaders/studio/studioWorkerLoader.worker.js:154-160`
  — the Studio calls Vite `loadEnv(mode, server.config.envDir, '')` and assigns every key into
  `process.env` with `??=` (never overwriting). `envDir` is the **Studio** root, so a root
  `.env.local` is **not** visible to `studio/`. The Studio needs its own `studio/.env`. Because the
  prefix filter is `''`, unprefixed names such as `NEXT_PUBLIC_SANITY_*` work there too.
- `next-sanity@13.3.4` exports `defineQuery` and `groq` from its root
  (`node_modules/next-sanity/dist/index.d.ts`), and `defineLive` from `next-sanity/live`. Its
  `DefineLiveOptions` is `{ client, serverToken?, browserToken?, strict? }`, and `serverToken` is
  documented as never shared with the browser unless also passed as `browserToken`.
- `groq@5.31.2` is currently present only transitively via `sanity`, which this change removes from
  the root app. Queries therefore import `defineQuery` from `next-sanity`, not from `groq`.

## Decisions and assumptions

- **Standalone `studio/` workspace.** The embedded route is deleted, per `AGENTS.md` §5 and the
  `sanity-best-practices` monorepo pattern. The Next.js app stays at the repo root (this repo has no
  `web/` folder), so the layout is `studio/` + root app rather than `studio/` + `web/`.
- **No npm/pnpm workspaces.** Per `project-structure.md`, "no workspace tooling is required — each
  app manages its own dependencies." `studio/` gets its own `package.json` and its own
  `studio/node_modules`. This avoids re-hoisting the root `node_modules` that the existing Clerk and
  Next installs depend on.
- **TypeGen points at the root app.** `studio/sanity.cli.ts` sets
  `typegen: { enabled: true, path: ['../sanity/**/*.ts'], schema: 'schema.json', generates:
  '../sanity.types.ts' }`. All GROQ lives in `sanity/lib/queries.ts`, so the glob is tight and never
  walks `node_modules`.
- **Generated types are committed** (`sanity.types.ts`), per `typegen.md` Option A, so types exist
  after a fresh `git pull`. `studio/schema.json` (the extract artifact) is gitignored.
- **`overloadClientMethods: true` is set explicitly.** Found during implementation: TypeGen's
  default behaviour in `sanity dev` watch mode silently drops the
  `declare module '@sanity/client' { interface SanityQueries { … } }` block, which is the only thing
  that lets `next-sanity`'s `sanityFetch` infer query result types. Without it, running `sanity dev`
  rewrites `sanity.types.ts` into a version where every `data` resolves to `{}` and the root app
  reports six spurious `tsc` errors. Setting the flag explicitly makes watch mode emit the
  augmentation too. Verified both ways.
- **`studio/` is excluded from the root `tsconfig.json` and `eslint.config.mjs`.** The two
  workspaces have separate dependency trees. Without the excludes, root `tsc` resolves
  `studio/*.ts` against `studio/node_modules`, and root `eslint` walks `studio/dist` — which OOMs
  the linter on the built Studio bundle.
- **`sanity/` on the web side keeps only what the app reads.** `env.ts`, `lib/client.ts`,
  `lib/image.ts`, `lib/live.ts` stay and stay importable by the Next app. `sanity/structure.ts` and
  `sanity/schemaTypes/` move into `studio/`, because the schema is Studio-owned and `AGENTS.md` §5
  puts content authoring in the Studio workspace.
- **`defineLive` stays.** The scaffold already has it and it is the documented default
  (`nextjs.md` §2, §3). `serverToken` is passed from `SANITY_API_READ_TOKEN`. **`browserToken` is
  deliberately not passed**, because `AGENTS.md` §5 forbids the browser holding a token and Visual
  Editing / Presentation is out of scope. With no draft-mode route, perspective stays `published`
  and `stega` stays off, which keeps generated types clean and keeps pages statically cacheable.
- **`<SanityLive />` goes in the root layout** after `{children}`, as `nextjs.md` §2 requires.
- **Token boundary.** `sanity/lib/client.ts` gets `import 'server-only'`. If that breaks
  `<SanityLive />` at build time (because it makes the live module transitively server-only), fall
  back to putting `server-only` on a dedicated `sanity/lib/token.ts` that only `live.ts` reads, and
  leave `client.ts` shareable. Report which of the two was used.
- **Read scope is the five requested types.** `video`, `agentContext`, and `progress` documents from
  `AGENTS.md` §8 are deliberately not modelled yet (see "Deliberately out of scope").
- **Course logo is not a new field.** `AGENTS.md` §8 fixes the course field list and it has no logo;
  the design's logo tile is covered by `coverImage`. `CatalogCard`'s `logo: CourseLogoKey` prop
  therefore becomes dead when the catalog reads Sanity. Flagged, not fixed here — the catalog page
  is a separate task.
- **Durations are stored as whole minutes** (`number`) and formatted in the UI. `AGENTS.md` §8 says
  numbers like "Module 5" are derived from order, so no stored module number and no stored module
  duration: a module's duration is the sum of its lessons.
- **Ordinary documents get Sanity-generated `_id`s** (`schema.md` §6). No slug-derived or
  deterministic ids, because none of these types is a singleton.
- **`level` is a constrained string list**, not a free string and not a boolean: `beginner`,
  `intermediate`, `advanced`. `AGENTS.md` §8 lists level as a course field.
- **`icon` on a learning outcome is a constrained string list** (`layers`, `database`, `gauge`,
  `cloud`, `code`, `rocket`, `shield`, `zap`), matching the four line icons in the course design.
  Storing a name the UI maps to an SVG keeps the Studio free of a custom icon plugin and keeps the
  field data, not presentation.
- **Lesson `summary` is added.** `AGENTS.md` §8 does not list it, but the lesson design renders a
  one-line description under the lesson title, and search results need a short description
  (`AGENTS.md` §11). It is a `text` field.
- **Notes are Portable Text with `block` members only.** No image or custom block members: §14, keep
  it small, and nothing in the reference shows inline lesson media.
- **The lesson query derives its parent course with a reverse reference** and returns a light course
  outline (module title, lesson title, lesson slug, lesson duration) so the lesson sidebar and the
  previous/next footer can be derived without a second round trip. This is the pattern
  `AGENTS.md` §8 requires ("A lesson does not store its parent course").

## Files touched

**Created — `studio/` (standalone Studio workspace)**

- `studio/package.json` — `lernio-studio`, private. Scripts: `dev` (`sanity dev`), `build`
  (`sanity build`), `start` (`sanity start`), `deploy` (`sanity deploy` — deploys the Studio
  application), `typegen` (`sanity schemas extract --force && sanity typegen generate`).
  Dependencies: `sanity`, `@sanity/vision`, `@sanity/icons`, `react`, `react-dom`,
  `styled-components`. Dev: `typescript`, `@types/react`, `@types/react-dom`.
- `studio/tsconfig.json` — from the CLI template (`module: Preserve`, `jsx: preserve`,
  `include: ["**/*.ts", "**/*.tsx"]`), extended with `"strict": true`.
- `studio/sanity.config.ts` — `defineConfig` with `projectId`, `dataset`, `schema`, `structureTool`,
  `visionTool`. No `basePath` (a standalone Studio has no Next base path).
- `studio/sanity.cli.ts` — `defineCliConfig({ api: { projectId, dataset }, typegen: {...} })`.
- `studio/env.ts` — `apiVersion`, `projectId`, `dataset` with `assertValue`, reading
  `SANITY_STUDIO_PROJECT_ID` / `SANITY_STUDIO_DATASET` / `SANITY_STUDIO_API_VERSION` and falling
  back to the `NEXT_PUBLIC_SANITY_*` names, because the CLI loads unprefixed keys too.
- `studio/structure.ts` — desk structure grouped with dividers: Courses, Lessons, then a Taxonomy
  group holding Categories and Instructors.
- `studio/schemaTypes/index.ts` — `schema: { types: [...] }` aggregating documents and objects.
- `studio/schemaTypes/documents/course.ts`
- `studio/schemaTypes/documents/lesson.ts`
- `studio/schemaTypes/documents/instructor.ts`
- `studio/schemaTypes/documents/category.ts`
- `studio/schemaTypes/objects/module.ts`
- `studio/schemaTypes/objects/learning-outcome.ts`
- `studio/schemaTypes/objects/lesson-resource.ts`
- `studio/.env.example` — the Studio's own canonical env list.
- `studio/.gitignore` — `/node_modules`, `/dist`, `/.sanity`, `/logs`, `*.log`, `*.tsbuildinfo`,
  `schema.json`, `.env*` with `!.env.example`.

**Created — web data layer (root)**

- `sanity/lib/queries.ts` — every `defineQuery` const, each with a **unique** variable name
  (`typegen.md` "Unique Query Names").
- `sanity/lib/data.ts` — the server-only read functions the pages will call.
- `sanity.types.ts` — generated by TypeGen. Committed.

**Modified**

- `package.json` — remove `sanity`, `@sanity/vision`, `styled-components` (Studio-only after this
  change; verified by grep that nothing else imports them); add `@sanity/client` as an explicit
  dependency so `sanity.types.ts` does not rely on a transitive package; add `server-only`; add a
  `typecheck` script (`tsc --noEmit`) so the check is reproducible; add `studio:dev`, `studio:build`,
  and `studio:deploy` convenience scripts that run in `studio/`.
- `package-lock.json` — updated by the install.
- `sanity/lib/client.ts` — add the server-only read token, `perspective: 'published'`, and
  `server-only` guard.
- `sanity/lib/live.ts` — pass `serverToken`. No `browserToken`.
- `app/layout.tsx` — render `<SanityLive />` after `{children}` inside `<body>`.
- `.env.example` — add the Sanity block: `NEXT_PUBLIC_SANITY_PROJECT_ID`,
  `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`, and `SANITY_API_READ_TOKEN`
  (documented as server-only).
- `.gitignore` — add `/sanity.types.ts`? **No** — generated types are committed per `typegen.md`
  Option A. `sanity/schema.json` does not exist on the web side, so nothing to add there. `studio/`
  is handled by `studio/.gitignore`.

**Deleted**

- `app/studio/[[...tool]]/page.tsx` (and the now-empty `app/studio/` directory).
- `sanity.config.ts` (root).
- `sanity.cli.ts` (root).
- `sanity/structure.ts` (moved to `studio/structure.ts`).
- `sanity/schemaTypes/` (moved to `studio/schemaTypes/`).

## Requirements

1. `studio/` is a self-contained Studio that runs with `npm run dev` inside it on
   <http://localhost:3333> and builds with `npm run build`. It does not import anything from the root
   app except reading GROQ out of it for TypeGen.
2. The schema defines exactly the five document types the goal names — `course`, `lesson`,
   `instructor`, `category` as documents, `module` as an **embedded object** inside `course` — plus
   the `learningOutcome` and `lessonResource` objects and nothing else.
3. Every type and field uses `defineType` / `defineField` / `defineArrayMember`, and every array
   member is declared with `defineArrayMember` rather than a bare `{ type }` literal.
4. Every document and object type has an `@sanity/icons` icon imported from the package root.
5. `course` holds: `title`, `slug`, `summary`, `coverImage`, `level`, `price`, `isPopular`,
   `studentCount`, `learningOutcomes`, `instructor` (reference), `category` (reference), `modules`.
   `isPopular` is optional and defaults to `false`. `learningOutcomes` and `modules` are ordered
   arrays. `modules` requires at least one.
6. `module` holds `title`, `summary`, and an ordered `lessons` array of references to `lesson`, and
   requires at least one lesson. It stores no number and no duration.
7. `lesson` holds `title`, `slug`, `summary`, `videoUrl`, `poster`, `duration` (minutes),
   `isFreePreview`, `studentCount`, `notes` (Portable Text), `keyPoints`, `proTip`, `resources`. It
   stores **no** parent course reference.
8. `instructor` holds `name`, `slug`, `photo`, `expertise`, `bio`. `category` holds `title`, `slug`,
   `description`.
9. Slugs are required and validated so a duplicate slug in the same type is an authoring error.
10. The desk structure groups the types for an author and does not list any type twice.
11. TypeGen is enabled in `studio/sanity.cli.ts`, reads queries from the root app, and writes
    `sanity.types.ts` to the root. Every GROQ string is assigned to a uniquely named `defineQuery`
    const in `sanity/lib/queries.ts`.
12. The read client is server-only, carries `SANITY_API_READ_TOKEN`, and is never imported by a
    `"use client"` file. The token reaches no browser bundle.
13. `defineLive` receives `serverToken` and does **not** receive `browserToken`.
14. Every query projects explicitly at every level, including inside dereferenced references. No
    query returns a whole document.
15. The data layer exposes typed functions for: course list (catalog), course by slug, course slugs,
    lesson by slug, instructor by slug, and category list. Missing documents return `null`; the page
    decides to `notFound()`.
16. The lesson read returns the lesson plus a derived course outline, so module position, lesson
    number, previous lesson, and next lesson are derivable without extra queries.
17. `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass in the root. `npx tsc --noEmit` and
    `npm run build` pass in `studio/`.
18. `.env.example` (root) and `studio/.env.example` list every variable the two workspaces read. No
    secret value is written into any committed file.
19. No page, component, search, progress, or video code is added or changed beyond adding
    `<SanityLive />` to the root layout.

## Security considerations

- **`SANITY_API_READ_TOKEN` is server-only.** It lives in `.env.local` (gitignored), is read only in
  `sanity/lib/client.ts`, and is passed to `defineLive` as `serverToken`. It is never exported from
  a module a client component can reach, and never passed as `browserToken`.
- **`server-only` guard.** `sanity/lib/client.ts` imports `server-only`, so an accidental client
  import fails the build instead of leaking the token. The `token.ts` fallback above applies if
  `<SanityLive />` cannot coexist with it.
- **`sanity/lib/image.ts` stays token-free.** `urlFor` is safe in client components, because the
  image CDN serves public assets without a token.
- **Studio `.env` is local only.** `studio/.gitignore` ignores `.env*` except `.env.example`.
  `projectId` and `dataset` are not secrets, but the token is, and the Studio does not need the
  token at all — it authenticates as the logged-in author.
- **No token in the committed `sanity.types.ts`.** TypeGen output is types only.
- **No query returns unprojected content.** This matters for more than bandwidth: a query that
  returns a whole lesson would drag Portable Text and, once video documents exist, transcripts into
  the browser.
- **Env values were never printed.** Reads of `.env.local` were length-only.

## Acceptance criteria

- `studio/` runs standalone: `npm install` then `npm run dev` in `studio/` serves the Studio on
  <http://localhost:3333> with all five types in the desk.
- The Studio build succeeds: `npm run build` in `studio/`.
- The root app builds with the embedded Studio gone: `/studio` is no longer a route, and
  `npm run build` succeeds.
- `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass in the root; `npx tsc --noEmit` and
  `npm run build` pass in `studio/`.
- TypeGen emits `sanity.types.ts` at the repo root with no duplicate-query warnings, and the
  generated result types match the data-layer function return types.
- Authoring a course, module, lesson, instructor, and category in the Studio persists with the field
  names this prompt specifies, and the read functions return them.
- No file reachable from the browser contains `SANITY_API_READ_TOKEN` or its value.

## Checks to run

**In `studio/`:**

- `npm install`
- `npx tsc --noEmit` → clean
- `npm run typegen` (this runs `sanity schemas extract && sanity typegen generate`; the
  `--force` flag in `typegen.md` no longer exists in this CLI version) → 6 queries, 22 schema types,
  writes `sanity.types.ts` to the repo root
- `npm run build` → Build Sanity Studio
- `npm run dev` → serves on <http://localhost:3333> (HTTP 200), with TypeGen watch active

**In the root app:**

- `npm install`
- `npm run typecheck` (`tsc --noEmit`) → clean
- `npm run lint` → clean
- `npm run build` → succeeds; `/studio` is absent from the route table
- `npm run dev` → `/` returns 200, `/studio` returns 404
- `.next/static` grep for `SANITY_API_READ_TOKEN` and the project id → no matches, so nothing in a
  client bundle carries the token

Report the real output of each. Never claim a check passed without running it.

**Not runnable by me without your Sanity login:** `npx sanity login` and
`npx sanity deploy` (deploys the Studio application). Those are yours to run.

## Manual test steps

1. `cd studio && npm install`, then `npm run dev`. Open <http://localhost:3333>.
2. Confirm the desk shows Courses, Lessons, and a Taxonomy group with Categories and Instructors.
3. Create a category, then an instructor. Confirm the slugs auto-derive from the titles and that
   creating a second category with the same slug is blocked.
4. Create a course: set title, summary, level, price, cover image, popular flag, one learning
   outcome, and reference the instructor and category.
5. Add a module with a title and summary, then add a lesson reference. Confirm you cannot save a
   module with zero lessons, and that the module card has no number and no duration field.
6. Create the lesson: title, summary, YouTube URL, poster, duration, key points, a pro tip, two
   resources, and notes. Confirm the lesson form has **no** course field.
7. Confirm the course preview shows the cover image and the category subtitle.
8. Back in the root app, run `npm run dev`, then in a second terminal run `npm run typegen` in
   `studio/` and confirm `sanity.types.ts` appears at the repo root. Run `npm run typecheck` at the
   repo root to confirm the generated types resolve.
9. Sign in to <http://localhost:3333>, publish the course, and confirm the published document is
   readable by the root data layer.

## Deliberately out of scope

- **`video` documents and the transcript ingestion pipeline** (`AGENTS.md` §9). The `videoUrl` on a
  lesson exists now; the video document that consumes it comes later.
- **The `agentContext` document and the search agent** (§10, §11), including the Context MCP. The
  schema is MCP-readable once the Studio application is deployed — that is the handoff point.
- **`progress` records and any write** (§7). This change is read-only; no route writes.
- **Catalog, course, lesson, instructor, and My Learning pages.** This change only provides the
  functions they will call.
- **Draft mode, Presentation, and Visual Editing.** That is what would require a `browserToken`,
  which `AGENTS.md` §5 forbids without a stated need.
- **`sanity-migration`.** No content is imported in this task. When it is, the schema types here are
  its target.
- **`CatalogCard`'s `logo` prop** and `lib/home-content.ts`. Flagged, not changed.
- **PostHog** and **`@portabletext/react`** rendering.
- **CORS origins.** Not needed for a Studio on its own origin. It becomes necessary if Presentation
  or Visual Editing is added later.
