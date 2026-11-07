# Lernio

Lernio is an AI-powered learning platform where learners search a course library in plain English and land on the exact second of a lesson video that answers their question.

Courses, lessons, instructors and categories are authored in Sanity. A Next.js app renders the catalog, course pages and lesson pages, keeps video playback on-site, and runs a grounded search agent over the content through the Sanity Context MCP.

## What it does

- **Catalog and course pages** — browse every course, see level, duration, module count and the full curriculum, then open any lesson.
- **Lesson pages** — a provider video embed (YouTube), lesson notes, key points, a pro tip, resources, a curriculum sidebar and previous/next navigation.
- **Timestamped search** — `/search?q=...` returns ranked video moments and lesson matches with a result count and a sort control. A video result opens the lesson page at `?start=<seconds>`, and the embed begins there.
- **Grounded results** — the model contributes only lesson ids, video ids, timestamps and ordering. Every visible string is hydrated from Sanity, so invented ids and timestamps are dropped instead of rendered.
- **Accounts** — Clerk handles sign-in, sign-up and the account menu. Browsing stays public; `/my-learning` is gated in middleware.
- **Standalone Studio** — the Sanity Studio is its own workspace, so it can deploy and update independently of the web app.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| CMS | Sanity Studio v5, `next-sanity`, `@sanity/image-url`, `@portabletext/react` |
| Auth | Clerk (`@clerk/nextjs`) |
| Search | Sanity Context MCP + Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/mcp`) |
| Validation | Zod |

## Repository layout

```text
app/                     Next.js App Router
  api/search/            Streaming search route (NDJSON)
  courses/               Catalog and course detail pages
  lessons/[slug]/        Lesson page with on-site playback
  search/                Full search results page
  my-learning/           Protected learner page
  sign-in/, sign-up/     Clerk hosted components
  design-system/         Internal UI reference page
components/              Course, lesson, search, site and UI components
lib/                     Pure helpers: search wire types, Zod schemas, video embeds
sanity/                  Server-only data layer, GROQ queries and Context MCP client
studio/                  Standalone Sanity Studio workspace
  schemaTypes/           Course, lesson, instructor, category, video, agent context
  scripts/ingest/        Offline YouTube transcript and chapter pipeline
  scripts/seed/          Content, agent context and video URL seeds
design/                  Desktop design references
prompts/                 Per-feature implementation prompts
proxy.ts                 Clerk middleware (Next.js 16's middleware entry point)
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Home with search entry point and featured courses |
| `/courses` | Full catalog |
| `/courses/[slug]` | Course hero, learning outcomes and curriculum |
| `/lessons/[slug]` | Video, lesson content, notes and curriculum sidebar |
| `/search` | Search results page (video moments and lessons) |
| `/my-learning` | Protected learner area (currently a real empty state) |
| `/sign-in`, `/sign-up` | Clerk authentication |
| `/design-system` | Internal component and token reference |
| `POST /api/search` | Server-only search agent endpoint |

## How search works

1. The search page sends `POST /api/search` with a query (validated by Zod, 1–200 characters).
2. The route reads the `sanity.agentContext` document for the content scope (`groqFilter`) and query instructions, then fetches the MCP `initial-context` schema overview (cached for five minutes).
3. It opens an MCP client to `https://api.sanity.io/v2026-03-03/context/mcp/<projectId>/<dataset>/<slug>` with the server-only read token and exposes the `schema_explorer` and `groq_query` tools.
4. `generateText` runs the agent with an inline system prompt, up to six GROQ queries and ten steps, and requires a structured answer: lesson ids, video ids, matched seconds and relevance. The default model is `gpt-4.1`; override it with `OPENAI_MODEL`.
5. The server hydrates those ids from Sanity. A video second is accepted only if it matches a real chapter or transcript boundary (chapters first, transcript as fallback, five-second tolerance). Anything unresolvable is dropped.
6. The route streams NDJSON status lines and one final results payload. The UI renders the count, both card kinds and the sort control (Most Relevant, Newest, Shortest).

A single search returns up to 40 results. The route runs on the Node.js runtime with a 120-second maximum duration.

The agent's instructions live in two places: the inline system prompt in `sanity/lib/search.ts` and the `sanity.agentContext` document. The model follows the system prompt more reliably, so critical query and ranking rules are duplicated there.

## Content model

| Type | Notes |
| --- | --- |
| `course` | Marketing fields, learning outcomes, instructor and category references, and an ordered array of embedded `module` objects. |
| `module` | Embedded in a course: title, summary and ordered lesson references. Module and lesson numbers are derived from array order, never stored. |
| `lesson` | Title, slug, video URL, poster, duration, free-preview flag, student count, Portable Text notes, key points, pro tip and resources. It does **not** store its parent course; the course is found with a reverse reference. |
| `instructor` | Name, slug, photo, expertise and bio. |
| `category` | Title, slug and description. |
| `video` | Internal lookup generated by the ingestion pipeline: one per unique video URL, with `chapters` and timestamped transcript `chunks`. Never rendered as a result on its own. |
| `sanity.agentContext` | Search configuration: a content scope filter (`groqFilter`) and query instructions. |

The seeded dataset in `studio/scripts/seed/` contains 10 courses, 120 lessons, 5 instructors and 6 categories.

## Getting started

### Prerequisites

- Node.js 20 or newer and npm
- A Sanity project with a **private** dataset
- A Clerk application
- An OpenAI API key

### 1. Install

```bash
npm install
npm --prefix studio install
```

### 2. Configure environment variables

The root `.env.example` and `studio/.env.example` are the canonical lists.

```bash
# macOS / Linux
cp .env.example .env.local
cp studio/.env.example studio/.env

# Windows PowerShell
Copy-Item .env.example .env.local
Copy-Item studio/.env.example studio/.env
```

Fill in the web app values in `.env.local`:

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Browser | Clerk publishable key |
| `CLERK_SECRET_KEY` | Server only | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Browser | Auth routes |
| `NEXT_PUBLIC_CLERK_*_FALLBACK_REDIRECT_URL` | Browser | Post-auth redirects |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` | Browser | Sanity project coordinates |
| `NEXT_PUBLIC_SANITY_API_VERSION` | Browser | API version (defaults to `2026-10-01`) |
| `SANITY_API_READ_TOKEN` | **Server only** | Reads the private dataset and authenticates the MCP request |
| `OPENAI_API_KEY` | **Server only** | Search agent model access |
| `OPENAI_MODEL` | Server only, optional | Overrides the default `gpt-4.1` |
| `SANITY_CONTEXT_SLUG` | Server only, optional | Context document slug (defaults to `default`) |
| `SANITY_CONTEXT_MCP_URL` | Server only, optional | Full MCP endpoint override |

The Studio reads its own `studio/.env`:

| Variable | Purpose |
| --- | --- |
| `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET`, `SANITY_STUDIO_API_VERSION` | Studio project coordinates |
| `SANITY_API_READ_TOKEN` | Used only by the offline ingestion pipeline |
| `SANITY_STUDIO_BASEPATH` | Vercel only: `/studio`. Leave unset locally and for Sanity hosting |
| `YOUTUBE_INNERTUBE_API_KEY` | Optional override for the pipeline's YouTube client key |

### 3. Set up Sanity

From `studio/`:

```bash
npx sanity login
npx sanity dataset create production        # skip if it already exists
npx sanity dataset import scripts/seed/seed.ndjson --dataset production --replace
npm run seed:search-context
npm run deploy
```

The Studio **must be deployed** before the Context MCP will serve the dataset. A schema-only deploy is not enough. After a schema change, regenerate types from the repo root:

```bash
npm run typegen
```

### 4. Run

```bash
npm run dev          # web app at http://localhost:3000
npm run studio:dev   # Studio at http://localhost:3333
```

Search needs `OPENAI_API_KEY` and `SANITY_API_READ_TOKEN` in `.env.local`; without them the route returns a clear 503.

## Deploy on Vercel

The repo deploys as **one Vercel project with two services**, configured in `vercel.json`:

| Service | Root | Framework | Public path |
| --- | --- | --- | --- |
| `app` | `.` | `nextjs` | `/` |
| `studio` | `studio` | `sanity` | `/studio` |

- Both services install independently (`studio/` has its own lockfile), and project env vars are shared.
- Set `SANITY_STUDIO_BASEPATH=/studio` in the Vercel project so the Studio's assets and router resolve under `/studio`. Keep it out of local `.env` files: `sanity deploy` would otherwise build the Sanity-hosted Studio under `/studio`.
- `/static/*` is also routed to the Studio because the built HTML hardcodes its favicons at `/static/...`.
- There are no service bindings. The app never calls the Studio service; it calls Sanity's hosted API and its own `/api/search` route.
- Deploying the Studio to Vercel does not replace `npm run studio:deploy`. The Context MCP only serves a dataset with a Studio deployed to Sanity hosting.

## Video ingestion

`studio/scripts/ingest/` is offline tooling. It reads the video URLs that lessons reference, fetches YouTube captions, splits the transcript into short timestamped chunks, recovers chapters, and writes `video` documents as NDJSON. It never runs in a request path and holds no write credential — the dataset changes only when someone runs the import.

```bash
# Smoke test: fetch and build three videos, write nothing
npm --prefix studio run ingest:videos -- --dry-run --limit 3

# Full run, writing scripts/ingest/out/videos.ndjson
npm --prefix studio run ingest:videos

# Import the generated documents
npm --prefix studio run videos:import
```

Useful flags: `--out`, `--urls`, `--only`, `--limit`, `--concurrency`, `--skip-failures`, `--overwrite-chapters`. Chunking can be tuned with `CHUNK_TARGET_SECONDS`, `CHUNK_TARGET_CHARS`, `CHUNK_MAX_CHARS` and `CHUNK_MAX_GAP_SECONDS`.

Chapters come from, in order: an authored override in `scripts/ingest/chapters/<key>.json`, the provider's description markers, or none. Videos without chapters fall back to transcript matching in search.

Only YouTube is supported end to end. Vimeo and Bunny need both an ingestion adapter and a playback branch in `lib/video.ts` before they count as supported.

## Security model

- The Sanity dataset is private. The read token stays on the server and is never exposed to the browser.
- The browser never calls the MCP or the LLM. All search work happens in `app/api/search/route.ts`.
- Clerk's secret key is server only. Private routes are gated in `proxy.ts` and re-checked with `auth.protect()` on the page.
- The search model returns ids and timestamps only. Hydration from Sanity prevents hallucinated courses, lessons, counts or seconds from reaching the UI.
- Video embeds are restricted to an allowlist of provider hosts, and the `?start` value is validated against the lesson duration before use.
- Search errors are logged server-side and returned to the browser as generic messages.

## Scripts

| Command | Workspace | What it does |
| --- | --- | --- |
| `npm run dev` | root | Next.js dev server |
| `npm run build` | root | Production build |
| `npm run start` | root | Serve the production build |
| `npm run lint` | root | ESLint |
| `npm run typecheck` | root | TypeScript check |
| `npm run studio:dev` | root | Studio dev server |
| `npm run studio:build` | root | Build the Studio |
| `npm run studio:deploy` | root | Deploy the Studio |
| `npm run typegen` | root | Extract schema and regenerate `sanity.types.ts` |
| `npm run ingest:videos` | `studio/` | Run the video ingestion pipeline |
| `npm run ingest:videos:dry` | `studio/` | Dry-run the pipeline |
| `npm run videos:import` | `studio/` | Import generated video documents |
| `npm run seed:search-context` | `studio/` | Import the Context document |

## Current scope

These are deliberately not built yet:

- **Progress tracking** — there is no progress document type or write route. The course, lesson and My Learning pages show a real empty state (`0`), not a fabricated percentage.
- **Product analytics** — PostHog is not wired up.
- **Instructor pages** — the `INSTRUCTOR_DETAIL_QUERY` data helper exists, but no `/instructors/[slug]` route is rendered.
- **Vimeo and Bunny** — ingestion and playback are YouTube-only.
- **Notifications and bookmarks** — the bell menu and bookmark control are presentational.
- **Context Studio plugin** — `@sanity/context` is not installed because its peer range targets a newer Sanity major. The `sanity.agentContext` type is authored by hand, and Conversation Insights is unavailable. Edit the Context document through the Studio or by NDJSON import.
- **Semantic search** — search uses keyword matching with wildcards; `text::semanticSimilarity()` is not used.

`AGENTS.md` is the engineering brief for the project. Each feature's implementation prompt and the reasoning behind it live in `prompts/`.

## Design references

The desktop references used to build the UI:

| Page | Reference |
| --- | --- |
| Home | [`design/lernio-home.png`](design/lernio-home.png) |
| Catalog / course | [`design/lernio-course.png`](design/lernio-course.png) |
| Lesson | [`design/lernio-lesson.png`](design/lernio-lesson.png) |
| Search | [`design/lernio-search.png`](design/lernio-search.png) |
| Design system | [`design/lernio-designsystem.png`](design/lernio-designsystem.png) |

## Checks

```bash
# Web workspace
npm run typecheck
npm run lint
npm run build

# Studio workspace
npm --prefix studio run typecheck
npm --prefix studio run deploy
```
