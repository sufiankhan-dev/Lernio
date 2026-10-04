# Intelligent Search

## Goal

Wire up the search half of Lernio: a server-side search API that talks to the **Sanity Context MCP** and calls an LLM to write and run GROQ, plus a **full search results page** at `/search` that renders ranked, clickable lesson result cards over the existing courses and lessons.

The reference is `design/lernio-search.png` (1122 x 1402) — a centered `SEARCH RESULTS` pill, a Playfair `Results for "query"` headline with the quoted query in orange, a `Found N results across M courses` subline, a `md`-height search input with a `⌘K` hint, a results meta row (`N results` left, `Most Relevant` select right), a vertical stack of white result cards, and an always-present `bg-primary-100` footer callout with a `Browse all courses` button.

**Scope decision from the user: lesson results only, video results deferred.** No `video` document type, no transcript ingestion, no chapter matching this round. The layout must leave room for the video card shape later, but no unused video component ships. Consequence to state plainly in the final report: the reference's four video cards are **not** delivered in this task.

**Provider: OpenAI**, exactly as `AGENTS.md` §6 specifies. `@ai-sdk/openai` with `OPENAI_API_KEY`. A Gemini detour was tried first and then reverted at the user's request; the history is in the Outcome section.

---

## Skills read

- `AGENTS.md` §1, §2, §3, §4, §5, §6, §7, §8, §10, §11, §12, §13, §14.
- `.claude/skills/create-agent-with-sanity-context/SKILL.md` (all 300 lines) — MCP URL shapes, the three tools, the `/initial-context` HTTP endpoint, the instruction-vs-system-prompt split.
- `.claude/skills/create-agent-with-sanity-context/references/nextjs-agent.md` — the `createMCPClient` transport pattern, the initial-context cache, dropping `initial_context` from the tool set, `stopWhen` step limits.
- `.claude/skills/create-agent-with-sanity-context/references/studio-setup.md` — the Context document fields, and the explicit requirement of a **deployed** Studio.
- `.claude/skills/create-agent-with-sanity-context/references/ecommerce/app/src/app/api/chat/route.ts` — the working reference route.
- `.claude/skills/dial-your-context/SKILL.md` — the "pure deltas only" rule for the Instructions field, and the `groqFilter` shape.
- `.claude/skills/shape-your-agent/SKILL.md` — the separation principle and the "less is more" rule for the system prompt.
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` and `01-app/03-api-reference/03-file-conventions/route.md` — route handler conventions for Next 16.3.8.
- `node_modules/next/dist/docs/01-app/02-guides/server-and-client-boundary.md` and `01-app/02-guides/data-security.md` — the boundaries this task must not cross.
- AI SDK docs: `ai-sdk-core/generating-structured-data` — `Output.object()`, tools + structured output in one call, and the note that output generation counts as a step for `stopWhen`.

Skills that do **not** apply: `sanity-migration` (no content import), `sanity-best-practices` schema rules beyond what the existing Studio already follows (the new type mirrors the existing house style).

---

## Code and config inspected

- `package.json` — **none** of `ai`, `@ai-sdk/openai`, `@ai-sdk/mcp`, `zod`, `react-markdown`, `posthog-js` are declared. `zod@4.6.5` resolves today only transitively (via `@sanity/cli`, `eslint-plugin-react-hooks`) and must be declared explicitly.
- **Live MCP probe, run against this project.** Base URL `https://api.sanity.io/v2026-03-03/context/mcp/gdotcciy/production` returns:
  ```json
  {"error":{"code":"STUDIO_NOT_DEPLOYED","message":"Only datasets with deployed Studio applications are supported."}}
  ```
  Same for `POST tools/list`. **This is `AGENTS.md` §12 gotcha #1 and it is currently true.** The dataset has 141 documents but no deployed Studio app.
- **`@sanity/context@2.2.0` peer dependencies: `sanity: '^6'`. This Studio is `sanity@5.31.2`.** The Studio plugin cannot be installed. This is exactly the `AGENTS.md` §12 fallback: author the `sanity.agentContext` type by hand, and expect Conversation Insights to be unavailable. Do **not** install `@sanity/context`.
- **YouTube reachability probe:** oEmbed returns HTTP 200 with real metadata; `youtube.com/api/timedtext` returns HTTP 200 with an **empty body**; the innertube `/youtubei/v1/player` endpoint returns 14 bytes of nothing. Transcript ingestion is not possible from this machine. Consistent with the user's decision to defer video.
- `sanity/lib/client.ts` — `import 'server-only'`, `token: process.env.SANITY_API_READ_TOKEN`, `useCdn: true`, `perspective: 'published'`, `stega: false`.
- `sanity/lib/data.ts` — the only data-access layer, all `import 'server-only'`, returns `null`/empty on miss and lets the caller decide. This is where hydration goes.
- `sanity/lib/queries.ts` (146 lines) — six `defineQuery` constants. Header comment sets three rules: project explicitly at every level, always include `_key`, derive the parent course by reverse reference. `LESSON_DETAIL_QUERY:92` already shows the reverse-reference shape and `:103-108` already walks `course.modules[].lessons[]`.
- `studio/sanity.cli.ts` — typegen path is `['../sanity/**/*.ts']`, output `../sanity.types.ts`, `overloadClientMethods: true`. **All new GROQ must live under `sanity/`** and every new schema type requires `npm run typegen`, because `SanityQueries` is keyed on the exact query string literal.
- `studio/schemaTypes/` — seven types, all house style: grouped `fields`, a `description` on non-obvious fields, closed radio lists via `options: { list: [...] }`, validation `Rule`. `lesson.ts:36` already reads `"One line. Shown under the lesson title and in search results."` — the schema was authored with search in mind.
- `studio/structure.ts` — an **explicit** `S.list()`. Per `studio-setup.md`, types only appear in the sidebar if listed here, so the new type needs a structure entry.
- `components/ui/Card.tsx:6-7` — the shared `shell` class string, currently module-private. `LessonCard:91` hardcodes `href="#"`, so it cannot be reused as-is for a real result link. `LessonCard` is also a **vertical** card; the reference's result card is **horizontal** with a left thumbnail panel.
- `components/ui/Field.tsx` — `SearchField` (`size: sm|md|lg`, `hint` renders a `<kbd>`, forwards `...rest` so it works controlled) and `SelectField` (`label` defaults to `"Sort by"`, forwards `onSelect`). Both are pure server/client-agnostic components.
- `components/ui/Icon.tsx` — `outlinePaths` and `filledPaths` are **exhaustive `Record<IconName, …>`**. Every icon used must already exist; `document`, `folder`, `search`, `play-circle`, `external-link`, `chevron-right`, `check-circle` are all present. No new icon is needed.
- `components/ui/Badge.tsx` — `BadgeVariant = "video" | "lesson" | "popular"`; `lesson` is already `bg-indigo-100 text-indigo-700`, which matches the reference's indigo `LESSON` badge.
- `components/site/HomeSearch.tsx:25` — `onSubmit={(event) => event.preventDefault()}`. This is the hand-off point from the home page.
- `app/courses/page.tsx` — the page shell convention: outer `mx-auto flex w-full max-w-[1440px] flex-1 flex-col rounded-t-[24px] bg-canvas`, then `SiteHeader`, then `<main className="flex-1 px-6 pt-10 pb-14 sm:px-8 lg:px-14">`, then `GradientBars`.
- `lib/format.ts` — `formatDuration(minutes)` for minutes, `formatStudentCount`, `formatLevel`. A new seconds formatter is needed for `Watch from` labels; video is deferred so this may not be needed at all.
- `.env.example` (24 lines) — eleven keys, server-only ones grouped at the bottom with a guard comment at L22-23: never prefix with `NEXT_PUBLIC_`, never import into a client component.
- `.env.local` — no LLM key of any kind. Values are written with surrounding quotes (`NEXT_PUBLIC_SANITY_PROJECT_ID="gdotcciy"`), which is fine because dotenv strips them; a naive PowerShell probe does not. Do not "fix" this.
- `proxy.ts` — `clerkMiddleware()` with no options, matcher already includes `/(api|trpc)(.*)`, so `/api/search` is inside the middleware. Nothing is protected; browsing stays public per §7.
- `next.config.ts` — only `cdn.sanity.io` is in `images.remotePatterns`. Seeded lesson posters are external `i.ytimg.com` URLs, which is why the lesson page never renders a poster through `next/image`. **The search cards must not introduce `next/image` for posters.**
- AI SDK v7 surface, verified against `https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data`: `generateText({ model, system, tools, output: Output.object({ schema }), stopWhen, onStepFinish })`, output read from `result.output`, and `Output.object` validation throws `AI_NoObjectGeneratedError`. Latest versions: `ai@7.0.127`, `@ai-sdk/openai@4.0.83`, `@ai-sdk/mcp@2.0.66`, all three with peer `zod: ^3.25.76 || ^4.1.8`.
- `@ai-sdk/openai` reads `OPENAI_API_KEY` by default. Chat model ids go up to `gpt-6.x`; `gpt-4.1` is the default because it supports both tool usage and object generation without the reasoning-model complications that make the final structured step less predictable.

---

## Decisions and assumptions

1. **The model returns lesson `_id`s and relevance scores only. Every visible string is read from Sanity by our own server code.** This is the strongest available reading of §7's "grounded" rule and §11's "never invent a course, lesson, timestamp, or count". The LLM does real work — it writes the GROQ and decides relevance and order — but it contributes no prose, no titles, no durations, and no counts to the page. Card description is `lesson.summary`; key points are `lesson.keyPoints`; the count line is computed from the hydrated array.

2. **Hydration runs through `sanity/lib/client.ts`, not through the MCP.** The model returns ids; the route then resolves them with our own `SEARCH_HYDRATE_QUERY`. Any id the model invents resolves to nothing and is silently dropped, so hallucinated ids cannot reach the page. This also keeps the trusted projection (course, module title, cover image) under our control rather than the model's.

3. **`sanity.agentContext` is hand-authored in the Studio schema, and the plugin is not installed.** `@sanity/context@2.2.0` requires `sanity@^6`; this Studio is `5.31.2`. The plugin only registers the document type and the Insights dashboard, so authoring the type ourselves is sufficient for the MCP to find the document. Conversation Insights stays unavailable, exactly as §12 predicts.

4. **The MCP URL is composed in code from `projectId`, `dataset` and an optional slug, with a full-URL env override.** `sanity/env.ts` already exports `projectId` and `dataset`, so hardcoding a URL string would duplicate config that §14 says to read from setup. `SANITY_CONTEXT_MCP_URL` overrides the composed value when set, which keeps the door open for the future Insights endpoint.

5. **A missing Context document is not fatal.** With no `SANITY_CONTEXT_SLUG`, the route uses the base MCP URL, which works without a document, and relies on the inline system prompt alone. With a slug configured but no published document, log once and fall back to the base URL rather than 500.

6. **`OPENAI_MODEL` defaults to `gpt-4.1`, overridable by env.** Deliberately not a reasoning model: the agent has to emit a structured object in a message that does not end in a tool call, and reasoning models make that step less predictable.

7. **The route streams newline-delimited typed events, not a chat protocol.** §5 says the route "streams results back". A results page is a list of cards, so a chat-shaped stream would be the wrong protocol. The route emits `{"type":"status"}` lines while the model queries, then one `{"type":"results"}` line with the final hydrated payload. The client renders status text, then cards. No half-built cards ever render, which is the failure mode of streaming a partial structured object.

8. **Sorting is client-side over the returned array.** `Most Relevant` is the server's order. `Newest` sorts by `_createdAt` descending and `Shortest` by `duration` ascending. Both fields are real and already hydrated. Re-sorting 40 items in the browser is instant and avoids a second LLM round trip per sort change.

9. **The `sanity.agentContext` document ships as seed NDJSON, and the Studio UI is the documented fallback.** Importing needs a write token the project does not have configured; creating the document through the Studio form needs nothing. Both paths are documented in the seed file header.

10. **The search results page is the only place `/search` lives. `HomeSearch` navigates to it.** No search overlay, no header search, no chatbox. §7 says search is a full results page.

11. **`LessonCard` gets an optional `href` prop that defaults to `"#"`,** so `app/design-system/page.tsx:385-412` keeps rendering unchanged. The new horizontal result card is a separate component that reuses the exported `cardShell` string.

12. **`react-markdown` is not installed.** §6 scopes it to "rendering the search reply", and this design has no reply — the `Found N results across M courses` line is server-computed. No model-authored prose is ever rendered, so there is no markdown to render and no XSS surface.

13. **`pt::text(notes)` is what the model matches against, and the wildcard rule is stated in both the system prompt and the Instructions field.** §11 requires this, and §12 warns the model follows the system prompt more reliably, so the critical rule goes in both.

14. **The Context document's `groqFilter` excludes `sanity.agentContext` itself,** along with any future internal types. It scopes to the four content types plus a draft filter.

15. **No PostHog in this task.** §7 lists analytics as its own concern and the user's request names three deliverables. Noted in the report, not built.

16. **`Next.js 16` conventions only.** The middleware entry is `proxy.ts`, page props use the generated `PageProps<"/search">` global rather than a hand-written `{ searchParams: Promise<…> }`, matching `app/lessons/[slug]/page.tsx:32`.

---

## The Context document, written per dial-your-context

Only deltas the schema does not already make obvious. Every GROQ snippet below was **run against the live dataset** before being written down, because the obvious syntax does not work. The traps that cost real queries:

- `match()` is **not a GROQ function**. Text matching uses the `match` **operator**: `title match "*fetch*"`. Calling `match("*x*", title)` is a parse error.
- The wildcards are mandatory. `title match "fetch"` returns 0 rows; `title match "*fetch*"` returns 2.
- `pt::text(notes)` returns **one string**, not an array. `count(pt::text(notes))` is `null`, and `pt::text(notes)[@ match "*x*"]` silently matches nothing. The working form is `pt::text(notes) match "*fetch*"`, which returns 4 rows for `fetch`.
- `keyPoints` is a real string array, so the array filter form works there: `count(keyPoints[@ match "*fetch*"]) > 0`.

### `groqFilter`

```groq
_type in ["course", "lesson", "category", "instructor"] && !(_id in path("drafts.**"))
```

Verified: returns 141 documents, and all 120 lessons pass.

### `instructions`

```markdown
### Rules

- Always exclude drafts with `!(_id in path("drafts.**"))`. There is no status field.
- GROQ has no `match()` function. Text matching uses the `match` **operator**: `title match "*fetch*"`. It is case-insensitive.
- The wildcards are required. `title match "fetch"` matches nothing. Always write `"*" + $kw + "*"`.
- Search token by token and OR the tokens together. Never rely on a multi-word phrase as a single pattern.
- Return only the `_id` of each matching lesson. Never write a title, duration, count or module number yourself, and never invent an id. The app resolves all of that from Sanity.

### Schema notes

- `lesson` has no course field. Derive it with the reverse reference `*[_type == "course" && references(^._id)][0]`.
- `modules` is embedded in `course`, and `lessons` is an array of references inside each module. A lesson's module title and its module and lesson numbers exist only by walking `course.modules[]` and finding the lesson `_ref` inside `modules[].lessons[]`. Those numbers are derived from array order and are not stored anywhere.
- `notes` is Portable Text. `pt::text(notes)` collapses the entire field into **one string**, so apply the `match` operator to it directly: `pt::text(notes) match "*fetch*"`. Do not wrap it in `count()` and do not filter it like an array; both silently match nothing. Every lesson has notes.
- `keyPoints` is an array of plain strings. Filter it with the array form: `count(keyPoints[@ match "*fetch*"]) > 0`.
- `poster` is an image whose asset is an external `i.ytimg.com` URL, not a Sanity-hosted asset.

### Query patterns

- All lessons matching any of several tokens, with course context:

```groq
*[_type == "lesson" && (
    title match $kw1 || summary match $kw1 || count(keyPoints[@ match $kw1]) > 0 || pt::text(notes) match $kw1
  || title match $kw2 || summary match $kw2 || count(keyPoints[@ match $kw2]) > 0 || pt::text(notes) match $kw2
)]{_id, title, keyPoints, "course": *[_type=="course" && references(^._id)][0]{title, modules[]{title, "lessons": lessons[]->{_id}}}}
```

  Pass each token already wrapped, for example `$kw1 = "*fetch*"`.

- High-signal first pass, title and summary only, which must outrank broad body matches:

```groq
*[_type == "lesson" && (title match $kw1 || summary match $kw1)]{_id, title}
```

- A token nothing matches returns zero rows. That is a valid answer. Return an empty array rather than loosening the pattern.

### Known limitations

- `instructor` and `category` are references from `course`. Dereference them with `->` in one hop; neither type has a back-reference to its courses other than through `course`.
- `groqFilter` already excludes this Context document, so you cannot read your own configuration.
```

---

## Files expected to touch

### New

- `studio/schemaTypes/documents/agent-context.ts` — the `sanity.agentContext` document type: `name` (string, required), `slug` (slug, `source: "name"`, required; this becomes the `:slug` segment of the MCP URL), `groqFilter` (text, rows 4, with a description naming it the content scope), `instructions` (text, rows 12, with a description saying it is injected into the MCP tool descriptions). Add a top-level `description` explaining that the MCP URL for this document is the agent's configuration. House style: grouped `fields`, `Rule` validation, closed option lists where applicable.
- `studio/scripts/seed/agent-context.ndjson` — one NDJSON line for the Context document with `_id: "sanity.agentContext.default"`, `_type: "sanity.agentContext"`, `name: "Lernio Search"`, `slug: { current: "default", _type: "slug" }`, and the `groqFilter` and `instructions` blocks from this prompt. Header comment with the exact import command and the Studio-UI alternative.
- `sanity/lib/search.ts` — `import 'server-only'`. Owns everything MCP: `getContextMcpUrl()`, `fetchInitialContext()` with the 5-minute TTL cache and in-flight dedupe, `getAgentContext()` reading the `sanity.agentContext` document, `buildSystemPrompt()`, and `hydrateSearchResults(ids)`.
- `lib/search-types.ts` — pure TypeScript wire types, **no imports at all**, so client components can import them freely: `SearchSort`, `SearchStatusEvent`, `SearchResultsEvent`, `SearchErrorEvent`, `SearchStreamEvent`, `SearchResultCardData`, `SearchResultsPayload`.
- `lib/search-schema.ts` — the Zod `Output.object` schema for the model, plus `MAX_SEARCH_RESULTS`. Server-only by convention; not imported by any client component.
- `app/api/search/route.ts` — the search route. `export const runtime = "nodejs"` and a `maxDuration`.
- `app/search/page.tsx` — the results page. Server component, reads `?q=`, renders the shell and hands the query to the client panel.
- `components/search/SearchPanel.tsx` — `'use client'`. Owns query state, the `POST`, the NDJSON reader, the status line, the sort control, the count line, the result list, the empty state and the footer callout.
- `components/search/SearchResultCard.tsx` — the horizontal lesson result card matching the reference.

### Modified

- `studio/schemaTypes/index.ts` — register `agentContext`.
- `studio/structure.ts` — add the Context document to the list. Use a `listItem('Search')` group holding `agentContext`, mirroring the existing `Taxonomy` group, so it does not clutter the top level.
- `sanity/lib/queries.ts` — add `SEARCH_HYDRATE_QUERY` (see below) and `AGENT_CONTEXT_QUERY`, both `defineQuery`.
- `sanity/lib/data.ts` — no change required if hydration lives in `sanity/lib/search.ts` and uses `client.fetch` directly. Prefer this: keep the MCP concern in one module.
- `components/ui/Card.tsx` — export the `shell` string as `cardShell`, and add an optional `href` prop to `LessonCard` defaulting to `"#"`.
- `components/site/HomeSearch.tsx` — replace `preventDefault` with `router.push("/search?q=…")`, trimmed and length-capped.
- `package.json` — add `ai`, `@ai-sdk/openai`, `@ai-sdk/mcp`, `zod`.
- `.env.example` — add the new keys with the server-only guard comment repeated.

### Untouched on purpose

`app/layout.tsx`, `app/globals.css`, `proxy.ts` (search is public and already matched), `next.config.ts`, `studio/sanity.config.ts`, `studio/sanity.cli.ts`, all existing queries and page routes, `components/ui/Icon.tsx` (no new icon needed), `components/ui/Field.tsx` (both fields already fit), `components/ui/Badge.tsx`, `studio/scripts/seed/seed.ndjson`.

---

## Requirements

### Dependencies

Install `ai@^7`, `@ai-sdk/openai@^4`, `@ai-sdk/mcp@^2`, `zod@^4`. Declare `zod` explicitly rather than relying on its transitive resolution.

### `sanity/lib/queries.ts` additions

`AGENT_CONTEXT_QUERY` — read the Context document by slug:

```groq
*[_type == "sanity.agentContext" && slug.current == $slug][0]{
  _id, name, "slug": slug.current, groqFilter, instructions
}
```

`SEARCH_HYDRATE_QUERY` — resolve model-supplied ids to fully projected cards:

```groq
*[_type == "lesson" && _id in $ids]{
  _id,
  _createdAt,
  title,
  "slug": slug.current,
  summary,
  duration,
  keyPoints,
  "course": *[_type == "course" && references(^._id)][0]{
    _id,
    title,
    "slug": slug.current,
    coverImage{..., asset->{_id, url, metadata{dimensions, lqip}}},
    "category": category->{_id, title, "slug": slug.current},
    "modules[]{
      _key,
      title,
      "lessons": lessons[]->{_id}
    }
  }
}
```

It takes `$ids` and returns lessons in arbitrary order; **ordering is the model's contribution, applied after hydration**, not GROQ's `order()`.

Follow the file's existing header rules: project explicitly at every level, include `_key` in array projections. Run `npm run typegen` afterwards so `sanity.types.ts` picks up both new query result types; without it the client overloads will not typecheck.

### `sanity/lib/search.ts`

- `import 'server-only'` as the first line, matching `sanity/lib/client.ts:1`.
- `getContextMcpUrl()`: `SANITY_CONTEXT_MCP_URL` if set, else compose
  `https://api.sanity.io/v2026-03-03/context/mcp/${projectId}/${dataset}` plus `/${slug}` when a slug is resolved. Read the base pieces from `@/sanity/env`.
- `fetchInitialContext()`: module-level `cachedInitialContext` plus `cacheTimestamp` and `CACHE_TTL_MS = 5 * 60 * 1000`. Append `/initial-context` to the pathname with query params preserved, exactly as `nextjs-agent.md:23-27` shows. Send `Authorization: Bearer ${SANITY_API_READ_TOKEN}`. Return `null` on any failure — a missing schema block degrades quality, it does not break search. Comment the §12 gotcha here: **cached context means prompt edits only take effect after a server restart.**
- `getAgentContext()`: fetch `AGENT_CONTEXT_QUERY` with the configured slug. Return `null` when there is no slug or no published document, and log once rather than on every request.
- `buildSystemPrompt({ initialContext, instructions })`: an inline system prompt, following `shape-your-agent`'s "less is more" rule, kept under roughly 350 words, carrying: the role (a grounded search index over Lernio's courses and lessons), the **token-wildcard text-match rule**, the **return-ids-only contract**, the **never invent** rule, the ranking rule (a title or summary containing the exact concept outranks a broad body match), the instruction to return every relevant lesson rather than a handful, and the `initialContext` block appended as a data reference. **Escape backticks, or use a plain concatenated string** — §12's build-failure trap.
- `hydrateSearchResults(ids)`:
  1. Guard the empty case.
  2. `client.fetch(SEARCH_HYDRATE_QUERY, { ids })` using `sanity/lib/client`.
  3. Drop any id that did not resolve.
  4. For each surviving lesson, walk `course.modules[]` to find the module containing its `_id` and derive `moduleNumber` (1-based), `lessonNumber` (1-based within the module) and `moduleTitle`. A lesson whose course or module is absent keeps `null` for those and renders without the module line rather than crashing.
  5. Return the payload in **the model's order**, truncated to `MAX_SEARCH_RESULTS`.
- Derive `totalCourses` from the distinct `course._id` values in the hydrated array. Never from the model.

### `lib/search-schema.ts`

A Zod object shaped for `Output.object`:

```ts
z.object({
  results: z.array(z.object({
    lessonId: z.string().describe("The exact _id of a lesson returned by groq_query. Copy it verbatim. Never invent an id."),
    relevance: z.number().describe("0-100. How strongly this lesson answers the learner's query."),
  })).describe("Every relevant lesson, best match first. Do not truncate to a handful."),
})
```

Keep it this shallow on purpose: §12 notes that large or deeply nested schemas are rejected by structured output. Two scalar fields per item cannot trip that limit.

`MAX_SEARCH_RESULTS = 40`, stated in the prompt so the model's list and the truncation agree.

### `app/api/search/route.ts`

- `export const runtime = "nodejs"` and `export const maxDuration = 60`.
- `POST` only. Parse and validate the body with Zod: `{ query: string, sort?: SearchSort }`. Trim the query, reject empty, cap at 200 characters. Reject anything else with a 400 and a short message.
- Build the MCP client with `createMCPClient({ transport: { type: "http", url, headers: { Authorization: \`Bearer ${token}\` } } })`.
- `const allTools = await mcp.tools()`, then destructure `initial_context` out, per `nextjs-agent.md:172-173`.
- Call `generateText` with `model: openai(process.env.OPENAI_MODEL || "gpt-4.1")`, `system: buildSystemPrompt(...)`, `tools`, `output: Output.object({ schema })`, and a `stopWhen` step limit that leaves room for several `groq_query` calls **plus** the output step, since output generation counts as a step.
- Use `onStepFinish` to emit a `status` event, so the user sees progress during the MCP round trips.
- Close the MCP client in a `finally`, per `route.ts:207-209`.
- Return a `ReadableStream` of newline-delimited JSON: `{"type":"status","message":…}` lines, then exactly one `{"type":"results","payload":…}`, with `Content-Type: application/x-ndjson`.
- Map failures to a `{"type":"error","message":…}` line plus a 500, never a stack trace. Handle `AI_NoObjectGeneratedError` by falling back to an empty result set rather than a crash. Catch a missing key or missing MCP URL and return a clear message — never echo a secret.
- Never return a whole transcript or chunk array. Not applicable this round, but keep the §12 rule in a comment so the video round inherits it.

### `app/search/page.tsx`

- Server component using `PageProps<"/search">`, awaiting `searchParams` per `app/lessons/[slug]/page.tsx:32`.
- The `app/courses/page.tsx` shell: outer `mx-auto flex w-full max-w-[1440px] flex-1 flex-col rounded-t-[24px] bg-canvas`, `SiteHeader`, `<main className="flex-1 px-6 pt-10 pb-14 sm:px-8 lg:px-14">`, `GradientBars`.
- `metadata.title` — `Search — Lernio`. Note `app/layout.tsx:20` still says `"Design System — Lernio"`; that is a pre-existing leftover, out of scope here.
- Renders the static parts from the reference: the `SEARCH RESULTS` pill (`text-[11px] font-semibold uppercase tracking-[0.15em]` in `primary-600`, matching `.ds-section-label`'s treatment), the `Results for "<q>"` Playfair headline with the query in `text-primary-500`, and hands the rest to `SearchPanel`.
- With no `?q=`, render a prompt state pointing at the input rather than firing a request.

### `components/search/SearchPanel.tsx`

- `'use client'`. Imports only `@/components/**`, `next/navigation`, React, and `import type` from `lib/search-types`. **It must never import `lib/search-schema`, `sanity/**`, or `ai`.**
- Owns `query`, `results`, `status`, `error`, `isLoading`, `sort`.
- On submit: `router.replace(\`/search?q=${encodeURIComponent(q)}\`)`, then run the search.
- `fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, sort }) })`, then read `res.body` with a `TextDecoder`, splitting on newlines and JSON-parsing each line.
- Render order per the reference: search input (`SearchField` with the `md` size and the same `⌘K` hint as `HomeSearch`), then the meta row — `N results` on the left in `text-body text-neutral-600`, `SelectField label="Sort by"` on the right with `Most Relevant` / `Newest` / `Shortest`, then the cards, then the footer callout.
- `Most Relevant` uses the server order untouched. `Newest` sorts by `createdAt` descending. `Shortest` sorts by `duration` ascending. Both are stable sorts so equal keys keep relevance order.
- `aria-live="polite"` on the status and count lines so the result count is announced.
- Keyboard: `⌘K` / `Ctrl+K` focuses and selects the input, reusing `HomeSearch.tsx:10-21`.
- Loading: the status line shows the streamed messages; the card area shows a neutral skeleton or nothing, never stale results presented as fresh.
- Empty result set: a message that points to the full catalog, per §11.
- Error: a short message with a retry affordance.
- Footer callout, present in every state including empty and error: `bg-primary-100 rounded-lg`, a circular orange magnifier badge, `Can't find what you're looking for?` plus `Try different keywords or browse our full course catalog.`, and a white `Browse all courses` button linking to `/courses`.
- Responsive: single column below `sm`, input full width, meta row wraps.

### `components/search/SearchResultCard.tsx`

Matches the reference's horizontal `LESSON` card, reusing `cardShell` from `components/ui/Card.tsx`:

- **Left panel** (`hidden sm:block`, about `w-[275px]`, `bg-neutral-100 rounded-md p-4`): the lesson's `keyPoints`, first three, each with a small bullet; a `check-circle` icon in `success-500` at the bottom right. Per the reference there is no duration pill on this shape.
- **Right column**:
  - Row one: the course mark — a `size-9 rounded-md` tile with the course initials in white, reusing the `CatalogCard`/`LessonSidebar` initials precedent — plus the course name in `text-body text-neutral-600`, and the `Badge variant="lesson"` pushed right.
  - Title: `text-heading-3 font-medium text-neutral-900`.
  - Description: `lesson.summary` clamped to two lines.
  - Footer row: `Module {n}` with a `folder` icon when a module resolved, and a `View lesson` `LinkButton variant="text" icon="external-link"` linking to `/lessons/{lessonSlug}`.
- The whole card is not one big link; the action is the link, matching the reference.
- Handle a missing summary, missing key points, a missing course and a missing module without rendering `null`, `undefined` or `NaN`.

### `components/site/HomeSearch.tsx`

`onSubmit` calls `router.push(\`/search?q=${encodeURIComponent(query.trim())}\`)` and no-ops on an empty query. Everything else, including the `⌘K` handler, stays.

### `.env.example`

Append a search block, keeping the existing server-only guard comment:

```
# Intelligent search (server only, never prefix with NEXT_PUBLIC_)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1
SANITY_CONTEXT_SLUG=default
# Optional. Overrides the composed MCP URL when you need a specific endpoint.
SANITY_CONTEXT_MCP_URL=
```

---

## Security considerations

- `sanity/lib/search.ts` opens with `import 'server-only'`, so any accidental client import fails the build rather than leaking.
- `SANITY_API_READ_TOKEN` and `OPENAI_API_KEY` are read only inside server modules. Neither is prefixed `NEXT_PUBLIC_`, neither is passed to a client component, and neither appears in any payload the route returns.
- The MCP bearer token goes only in the `Authorization` header of the server-side HTTP transport. The browser never sees it and never calls the MCP or the LLM (§5).
- **The client bundle must not contain the AI SDK, the MCP client, or the Zod schema.** `SearchPanel` imports `import type` from `lib/search-types` only, and that file has zero runtime imports.
- Grounding is a security property here, not just a quality one. The model can only reference ids it was shown; every rendered string comes from `SEARCH_HYDRATE_QUERY`; the count line is computed from the hydrated array. A hallucinated id resolves to nothing and is dropped.
- The route is a paid upstream call. Cap the query at 200 characters, cap results at 40, and set a `maxDuration`. Note in the report that rate limiting is not implemented, so put it behind a limit before exposing this publicly.
- Input is validated with Zod before it reaches the model. Trim, reject empty, reject over-length, and never interpolate raw input into the system prompt — the user query goes in the user message only.
- No model output is rendered as HTML or markdown. There is no XSS surface because there is no prose.
- `poster` images are external `i.ytimg.com` URLs and `next.config.ts` only allows `cdn.sanity.io`. The cards must not add `next/image` for them; the lesson shape uses the key-points panel, not an image. If a future video card needs a poster, either add the host to `remotePatterns` or proxy it, deliberately.
- Searching stays public. Nothing in `/search` or `/api/search` requires a session, and `proxy.ts` is unchanged.

---

## Acceptance criteria

1. `npm run typecheck` and `npm run lint` pass with no errors.
2. `npm run build` succeeds; `/search` and `/api/search` appear in the route manifest.
3. `npm run typegen` runs clean and `sanity.types.ts` gains result types for both new queries.
4. `studio` typechecks and `npm run studio:build` succeeds with the new document type registered and visible in the sidebar under Search.
5. No client bundle contains `ai`, `@ai-sdk/openai`, `@ai-sdk/mcp`, `SANITY_API_READ_TOKEN`, or `OPENAI_API_KEY`.
6. `POST /api/search` with `{"query":"data fetching"}` returns NDJSON: one or more `status` lines, then one `results` line.
7. Every result card's title, summary, key points, course name, module title and duration traces to a document returned by `SEARCH_HYDRATE_QUERY`. No card text originates from the model.
8. The count line reads `Found N results across M courses` where `N` is the rendered card count and `M` is the distinct course count, both computed after hydration and dropping.
9. Searching for a seeded topic returns multiple real lessons from more than one course. Searching gibberish returns the empty state.
10. Every result action links to `/lessons/{slug}` for a lesson that exists; no `href="#"`, no dead link.
11. The page matches `design/lernio-search.png`: eyebrow pill, Playfair headline with the query in orange, count subline, input with `⌘K`, `N results` plus `Most Relevant` meta row, white cards with the indigo `LESSON` badge, and the always-present `bg-primary-100` footer callout.
12. The sort control reorders all three ways without a network request, and `Most Relevant` matches the order the server returned.
13. `⌘K` focuses the input on `/search`. Submitting navigates to `/search?q=…` and the URL is shareable — pasting it reproduces the same results.
14. A missing OpenAI key returns a readable error, not a stack trace and not a 500 with a secret in it.
15. No `null`, `undefined` or `NaN` appears anywhere in the rendered output, including for a lesson with no summary, no key points or no course.
16. At 390px the cards stack, the input goes full width, and nothing overflows horizontally.

---

## Checks to run

Run from the repo root for the web workspace, and from `studio/` for the Studio.

1. `npm run typecheck` — the new query result types and the route's Zod schema.
2. `npm run lint` — including the `react-hooks/exhaustive-deps` rule on the panel's effects.
3. `npm run typegen` — required after the schema and query changes, otherwise the client overloads fail to typecheck.
4. `npm run build` — needed because routes, config and server modules changed.
5. `npm run dev`, then exercise `/search` manually.
6. `npm --prefix studio run build` — the new document type must compile.
7. **Live MCP verification, per §13.** Once the Studio is deployed, confirm the endpoint returns a schema and the three tools:
   ```powershell
   curl.exe -sS -H "Authorization: Bearer $SANITY_API_READ_TOKEN" "https://api.sanity.io/v2026-03-03/context/mcp/gdotcciy/production/default/initial-context"
   ```
   Then run one `tools/list` POST and one `groq_query` through it to confirm the Instructions field and the wildcard rule reach the model.
8. Confirm the bundled client chunk contains no `ai` or `@ai-sdk` code and no secret.

---

## Manual test steps

1. `npm run dev`, open `http://localhost:3000/search`.
2. The prompt state shows with no request fired. The `⌘K` hint is visible.
3. Type `data fetching`, press Enter. The URL becomes `/search?q=data+fetching`.
4. A status line appears, then results render. Count the cards.
5. Check the count line: `Found N results across M courses` where `N` equals the card count and `M` is the distinct course count.
6. Every card shows a real seeded lesson. Open one and confirm the `View lesson` link lands on a page that loads, with the module number matching the course page.
7. Switch to `Newest`, then `Shortest`. No network request fires; the order changes and `Most Relevant` restores the original order.
8. Copy the URL into a private window. The same results render.
9. Search `zustand state management`. Expect a different result set.
10. Search `qqqzzz nonsense`. Expect the empty state and the footer callout, with no error styling.
11. Search a single word that matches many lessons, `fetch`. Confirm the list is not capped at three or four.
12. Reload with `OPENAI_API_KEY` unset. Expect a readable error message, no stack trace, no key echoed.
13. Reload with the Context document missing. Expect search to still work via the base MCP URL and the inline prompt alone.
14. Open `/` and submit the home search box. Confirm it lands on `/search?q=…` with results.
15. Resize to 390px. Cards stack, the input is full width, nothing overflows.
16. In devtools, confirm the `/api/search` response is NDJSON with `status` lines then one `results` line.
17. In devtools, search the loaded JS for `ai-sdk`, `SANITY_API_READ_TOKEN` and `OPENAI_API_KEY`. Expect zero hits.
18. Change the `initialContext` cache TTL comment behaviour by editing the inline system prompt, then restart `next dev` and confirm the change takes effect — demonstrating the §12 restart gotcha.

---

## Blocked on the user

Two things must happen outside my reach before the feature is verifiable end to end.

1. **Deploy the Studio.** The Context MCP refuses this dataset with `STUDIO_NOT_DEPLOYED`, confirmed by a live probe. From `studio/`:
   ```
   npx sanity login
   npx sanity deploy
   ```
   then open the deployed Studio URL once in a browser so the schema is deployed. `npx sanity login` is an interactive browser OAuth, so I cannot run it.
2. **Add the OpenAI key.** Put it in `.env.local` as `OPENAI_API_KEY`. `.env.local` is gitignored, which matches the existing Clerk and Sanity secrets.

Optional, and only if a Studio UI pass is preferred over the import: create the Search Context document through the Studio form after deploying, pasting the `groqFilter` and `instructions` blocks from this prompt, with the slug `default`.

---

## Deliberately out of scope

- **Video results.** No `video` document type, no chapters, no transcripts, no timestamp resolution, no video card component. The transcript pipeline is a separate task, and YouTube caption fetching is blocked from this machine.
- **PostHog analytics.** §7's engagement events are their own concern; no instrumentation ships here.
- **Conversation Insights.** `@sanity/context` needs `sanity@^6`; this Studio is `5.31.2`.
- **Semantic search.** `text::semanticSimilarity()` needs embeddings, which is a plan and billing decision. §11's token-wildcard matching is what ships.
- **Progress tracking, `/my-learning`, `/instructors/[slug]`, pagination, rate limiting, and the notifications bell.** All pre-existing gaps unrelated to this task.

---

# Outcome

## Checks run, real output

| Check | Result |
| --- | --- |
| `npm run typegen` | Passed. 8 queries, 23 schema types. |
| `npm run typecheck` | Passed, no errors. |
| `npm run lint` | Passed, no errors or warnings. Two found and fixed during the run, see deviations. |
| `npm run build` | Passed. `/api/search` and `/search` both registered as dynamic (`ƒ`). |
| `npm --prefix studio run build` | Passed in 28.6s. |
| `npx tsc --noEmit -p studio/tsconfig.json` | Passed, exit 0. |
| Client bundle scan, 25 chunks in `.next/static` | 0 hits for `@ai-sdk`, `ai-sdk`, `createMCPClient`, `OPENAI_API_KEY`, `SANITY_API_READ_TOKEN`, `api.openai.com`. Positive control confirmed `View lesson`, `Most Relevant` and the empty-state copy **are** present, so the scan was looking in the right place. |
| `GET /search` and `GET /search?q=…` | 200. All reference copy present. 0 occurrences of `null`, `undefined` or `NaN` between tags. The 124 raw hits are `$undefined` markers inside the RSC flight payload, which is normal React serialisation. |
| `POST /api/search` validation | Empty query 400, missing query 400, wrong type 400, over 200 chars 400, invalid JSON 400, array body 400, unknown field accepted then ignored. |
| `POST /api/search` happy path | Streams `{"type":"status"}` then, once the Studio is deployed, `{"type":"results"}`. Today it streams a status then a generic error, and the server log records the precise cause. |

## Verified against the live dataset

`hydrateSearchResults` was exercised directly, importing the same module the route uses, via a Node resolve hook for the `@/` alias:

- 6 real lessons hydrated, 2 fabricated ids dropped, duplicates collapsed.
- Module title, module number `3` and lesson number `2` derived correctly from `course.modules[]` order.
- Every card field populated: slug, title, summary, duration, keyPoints, courseTitle, courseSlug, categoryTitle, createdAt.
- Caller's ordering preserved, `maxResults` honoured, empty input short-circuits.
- **0 problems.**

`buildSystemPrompt` was asserted to contain the corrected `match` operator form, the verified `keyPoints[@ match ...]` array form and the verified `pt::text(notes) match ...` form, to be free of the invalid `match()` function form, and to inject both the Context instructions and the initial context. 2405 characters. **0 problems.**

## The GROQ correction

The instructions written above were wrong on the first pass and were caught by running them. `match()` is not a GROQ function, and `pt::text()` does not return an array. Seven of ten probe queries failed with `Undefined function "match"` or returned 0 rows. Corrected syntax, all re-verified:

| Query | Result |
| --- | --- |
| `title match "*fetch*"` | 2 |
| `summary match "*fetch*"` | 1 |
| `count(keyPoints[@ match "*fetch*"]) > 0` | 2 |
| `pt::text(notes) match "*agent*"` | 3 |
| `pt::text(notes) match "*AGENT*"` | 3, so it is case-insensitive |
| `title match "fetch"`, no wildcards | 0, so the wildcards are mandatory |
| Multi-token OR across title, summary, keyPoints and notes | 43 |
| Gibberish tokens | 0 |

## Deviations from the prompt

1. **`sort` was removed from the request body.** Sorting is a client-side view concern, so sending it would have been dead weight and risked a refetch on every sort change. `searchRequestSchema` now validates `query` only.
2. **`LessonCard` gained `actionHref`, not `href`.** `ResourceCard` already uses that prop name, so this keeps the two cards consistent.
3. **The Context document's import step is an npm script, not a file header comment.** NDJSON cannot carry comments. `studio/scripts/seed/agent-context.ndjson` is imported with `npm --prefix studio run seed:search-context`.
4. **The route logs the underlying failure to the server console** and returns a generic message to the browser, so an upstream error carrying an endpoint or token can never reach the client.
5. **The structure gained a `Search` group** rather than a bare top-level item, so it does not crowd the existing `Taxonomy` group.

## Provider detour and revert

The first implementation shipped on `@ai-sdk/google`, at the user's request, overriding §6. It worked against the MCP but the free tier capped the account at **20 model requests per day**, and iterative testing consumed the quota, so a full end-to-end query could not be completed on it.

The user then supplied an OpenAI key and asked to revert. `@ai-sdk/google` was uninstalled, `@ai-sdk/openai` installed, `OPENAI_API_KEY` and `OPENAI_MODEL` replaced the two Google variables, and `DEFAULT_MODEL` became `gpt-4.1`. This also restores agreement with §6. **No Gemini references remain** in source, `.env.example`, `.env.local` or this file.

## Post-deployment fixes

Deploying and testing surfaced three real problems that are now fixed, and none of them were provider-specific.

1. **The agent never emitted its structured output.** With `Output.object` plus tools, the model must produce the object in a message that does not end in a tool call. Spending the entire step budget on `groq_query` surfaces as `AI_NoOutputGeneratedError`, which is exactly the case the AI SDK docs call out. Two changes: the system prompt now caps the agent at 4 queries and tells it to stop and answer, and `MAX_STEPS` went to 8 so the answer step has room.
2. **`result.output` throws rather than returning undefined.** It is a getter, so the obvious `result.output?.results ?? []` guard does not work, because the access itself raises. `readOutputIds` in `lib/search-ids.ts` wraps the read in a try/catch, which is what makes the guard possible at all.
3. **Added a grounded fallback.** When there is no structured output, `collectLessonIds` walks the `groq_query` tool results and recovers the lesson ids the agent already retrieved. Those ids are real and still pass through `hydrateSearchResults`, so a hard failure becomes a working result page instead of an error.

## Verified end to end on OpenAI

Deployment: the Studio is live at `https://lernio.sanity.studio/`, and the MCP endpoint serves both `/initial-context` and `groq_query`.

- `GET .../context/mcp/gdotcciy/production/initial-context` — **HTTP 200**, 2285 bytes of schema context. Previously `STUDIO_NOT_DEPLOYED`.
- `GET .../context/mcp/gdotcciy/production/default/initial-context` — **HTTP 200**, and the body carries the Context document's instructions under `### Context Instructions`, including the `match` operator rule and the `pt::text(notes)` note.
- The MCP session exposes four tools: `initial_context`, `groq_query`, `schema_explorer`, `array_field_reader`.
- **A real `groq_query` returned real rows**, and the echoed `executedQuery` shows the Context `groqFilter` being applied: `*[_type != "sanity.agentContext" && (_type in ["course","lesson","category","instructor"] && !(_id in global::path("drafts.**`. That confirms the filter works and the agent cannot see its own configuration.
- `collectLessonIds` and `readOutputIds` were exercised against that real tool result, plus 8 shape-tolerance cases. **0 problems.**

Live search, `how do i fetch data and catch it`:

- Streamed one `status` line, one `groq_query` call, then `results`. **The structured-output path was used, not the fallback.**
- **9 results across 5 courses.** Count line `Found 9 results across 5 courses`.
- Top hit `Fetching data in server components | Next.js App Router in Depth | module 3.1`, which is the right answer for the query.
- Module and lesson numbers derived correctly across all nine cards, for example `3.1`, `4.2`, `1.3`, `3.2`, `3.3`, `1.2`, `4.1`, `4.3`.
- **0 cards missing a required field, 0 implausible slugs, 0 `undefined` or `NaN`.** Every string traces to a Sanity document.
- Sampled three result links; all returned **HTTP 200**.
- Gibberish query `qqqzzz nonsense xyzzy` returned **0 results, 0 courses**, which is the empty-state path.

`npm run typecheck`, `npm run lint` and `npm run build` are clean, and no `[search] request failed` appears in the server log for the successful runs.

## Known constraint for the user

A single search costs one model call per agent step plus the answer, so **2 or more calls**. `MAX_STEPS` is capped at 8 for that reason, and `maxDuration` is 120s because a multi-step run regularly exceeds 60s. There is still **no rate limiting** on `/api/search`, so put it behind a limit before exposing it publicly.