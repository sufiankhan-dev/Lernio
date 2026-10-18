# Emerald + Teal Theme and Site Footer

## Goal

Re-theme Lernio from warm cream/orange to **emerald + teal**, swap the two current typefaces for the
single **Outfit** family used by the Takmeel Holdings project, and build the **site footer** that does
not exist today.

Three deliverables:

1. **Theme** — new emerald primary ramp, teal accent ramp, cool canvas, and the three off-theme values
   that are hardcoded outside `@theme` (the logo mark gradient, the design-system swatch labels, the
   focus ring).
2. **Type** — one family, Outfit, exposed as both `--font-display` and `--font-sans` so all 29 existing
   `font-display` / `font-sans` usages retheme without a markup sweep.
3. **Footer** — a new `SiteFooter` rendered on every public page, on a dark emerald band that closes
   the page the way the existing `GradientBars` band opens it.

Layout and spacing stay as they are. This is a change of colour and typeface, not a redesign.

## Skills read

- `AGENTS.md` — §2 (loop, prompt before code), §3 (UI work: reference images are the source of truth),
  §5 (web workspace structure), §12 (gotchas), §13 (checks to run).
- `node_modules/next/dist/docs/` — Next.js 16 conventions for `next/font/google` and the root layout.
  The `<!-- BEGIN:nextjs-agent-rules -->` block is present and must not be removed.
- No Sanity, Clerk, search or ingestion skill applies. This task touches no schema, no query, no
  route handler and no auth surface.

## Code and config inspected

- `app/globals.css` — the whole token layer. `@theme` block holds `--color-primary-*` (orange 100-900),
  `--color-neutral-*` (slate), `--color-canvas`, `--color-indigo-*`, `--color-success-*`,
  `--font-display` (Playfair) / `--font-sans` (Inter), type scale, radii, shadows. `@layer base` sets
  `border-color`, `body` background (canvas + a 135° repeating pinstripe mixing `primary-700` at 12%),
  and `:focus-visible` at `primary-400`.
- `app/layout.tsx` — loads `Inter` → `--font-inter` and `Playfair_Display` → `--font-playfair`, both
  applied to `<html>`; exports default `metadata` titled "Design System — Lernio"; wraps children in
  `ClerkProvider` and appends `<SanityLive />`.
- Token usage measured across 60 source files: `neutral-` 231, `primary-` 73, `font-display` 26,
  `canvas` 8, `indigo-` 4, `success-` 4, `font-sans` 3. Everything routes through `@theme`, so
  retheming is a single-file edit.
- `components/ui/Nav.tsx` — `BrandMark` renders an SVG whose gradient stops are **hardcoded**
  `#FB923C` / `#F05A05` and whose gradient `id` is the fixed string `"lernio-brand-mark"`. `Logo`
  hardcodes `text-neutral-900`. Also exports `SiteNav` and `Breadcrumbs`.
- `components/ui/Button.tsx` — `primary` variant is `bg-primary-500 text-white`;
  `secondary`/`text` are `text-primary-500`; tertiary is neutral.
- `components/ui/Badge.tsx` — `video`/`popular` are `bg-primary-100 text-primary-500`;
  `lesson` is `bg-indigo-100 text-indigo-700`.
- `components/ui/StatusIndicator.tsx` — `completed` is `text-success-700`.
- `components/site/GradientBars.tsx` — `from-primary-400/85 via-primary-300/45 to-transparent`.
- `app/page.tsx`, `app/courses/page.tsx`, `app/courses/[slug]/page.tsx`, `app/lessons/[slug]/page.tsx`,
  `app/search/page.tsx` — each renders its **own** shell
  (`mx-auto flex w-full max-w-[1440px] flex-1 flex-col rounded-t-[24px] bg-canvas`), each renders
  `SiteHeader` itself, and all but the lesson page end with `GradientBars`.
- `lib/home-content.ts` — `navLinks = [{ Courses, /courses }, { My Learning, /my-learning }]` and a
  comment stating it holds app config, not authored content.
- `app/design-system/page.tsx` — 436 lines documenting the palette, the type scale and the components.
  It hardcodes 13 swatch hex labels, the "Playfair Display"/"Inter" font names in `typeScale`, a
  `fill="#FB7316"` logo tile, and two spec-list hex notes (`#E2E8F0`, `#FB923C`). It is a live page,
  so it will start lying about the theme unless it is updated.
- Route inventory (verified by listing `page.tsx`): `/`, `/courses`, `/courses/[slug]`,
  `/lessons/[slug]`, `/search`, `/design-system`, `/sign-in/[[...sign-in]]`, `/sign-up/[[...sign-up]]`.
  There is **no** `app/my-learning/page.tsx` and **no** `app/not-found.tsx`.
- `package.json` — Next `16.3.8`, React `19.2.8`, Tailwind `^4` + `@tailwindcss/postcss`, no
  `clsx`/`tailwind-merge`, no icon library. Scripts: `dev`, `build`, `start`, `lint`, `typecheck`.
- Reference project `D:\property-builder` (Takmeel Holdings) — `app/layout.tsx:2,14-18,40` loads
  `Outfit` as `--font-outfit`; `app/globals.css:109-115` maps `--font-sans`, `--font-heading` and
  `--font-display` **all** to `var(--font-outfit)`. That is the pattern to copy.

## Decisions and assumptions

1. **Direction is emerald + teal**, chosen by the user. Primary is a deep pine-emerald, teal is the
   secondary accent.
2. **The emerald ramp is "deep pine", not stock Tailwind emerald.** Stock emerald `#10b981` fails
   badly: white on it is 2.54:1 and it is 2.42:1 as link text. Measured with a WCAG relative-luminance
   script, the chosen ramp gives white-on-500 **4.90:1** and 500-on-canvas **4.67:1**, both AA. The
   current orange is worse — white on `#FB7316` is **2.78:1** and the same colour as link text is
   **2.64:1**, so this re-theme also fixes an existing accessibility failure. Numbers are recorded in
   the requirements below.
3. **Neutrals are kept.** The slate ramp (`neutral-50` … `neutral-900`) already sits correctly against
   green and carries 231 usages. Changing it would be churn with no visual gain. Only `--color-canvas`
   shifts, from warm `#fbf8f5` to a cool mint `#f4f8f7`.
4. **One typeface, two tokens.** Like Takmeel, `--font-display` and `--font-sans` both resolve to
   `--font-outfit`. This rethemes all 29 existing usages with zero markup changes and leaves a second
   family as a one-token decision later. Playfair's serif fallback stack is replaced with a sans stack
   because Outfit is a geometric sans.
5. **The logo gradient becomes token-driven.** `BrandMark`'s stops move from hardcoded hex to
   `var(--color-primary-400)` / `var(--color-primary-600)`, so the mark follows the theme.
6. **`BrandMark`'s fixed gradient `id` must become a prop.** Adding a footer logo puts two `BrandMark`
   instances on one page with the same `id`, which is invalid HTML and makes the second mark's
   gradient unreliable. `useId()` is not an option because `BrandMark` is used by Server Components.
   The id becomes an optional prop, and the footer passes its own value.
7. **`Logo` gains an optional `tone` prop.** It hardcodes `text-neutral-900`, which is invisible on the
   footer's dark band. Default stays dark so no existing call site changes.
8. **The footer links only to routes that exist.** `/my-learning` is in the main nav but has no page and
   currently 404s. The footer must not add new 404s. It links to `/courses`, `/search`, `/sign-in`,
   `/sign-up` and `/design-system` only. `/my-learning` stays out of the footer; the broken nav link is
   reported to you rather than silently repeated in two places.
9. **Footer is a server component with no interactivity** — no newsletter form, no back-to-top script,
   no client boundary. It is presentational chrome like `WeeklyNote`.
10. **Footer placement.** It goes after `GradientBars` on the pages that render it, so the gradient band
    reads as a transition into the dark footer rather than being cut off by it. On the lesson page it
    goes after `LessonNavigation`.
11. **`indigo-700` becomes `teal-700`** on the `lesson` badge, retiring the `indigo-*` tokens which have
    exactly one usage.
12. **Two small contrast corrections ride along with the re-theme**, both caused by the new ramp:
    the `:focus-visible` ring moves `primary-400` → `primary-500` (400 is 2.94:1 on canvas and fails the
    3:1 non-text minimum), and badge text moves `primary-500` → `primary-600` on `primary-100`
    (600 is 5.53:1, 500 is 4.18:1).
13. **`success-*` is left alone, deliberately, and flagged.** `success-700` `#15803d` and the new
    `primary-500` `#15805f` are close in hue. `StatusIndicator` uses `success-700` only for the
    `completed` state, which always renders with a `check-circle` glyph, so the states stay
    distinguishable in context. If you want them further apart, the fix is a one-line token change.

## Requirements

### 1. `app/globals.css` — tokens

Replace the `--color-primary-*` block with the measured "deep pine" emerald ramp:

| Token | Hex |
|---|---|
| `--color-primary-100` | `#dcf2e8` |
| `--color-primary-200` | `#b0e0cc` |
| `--color-primary-300` | `#79c4a7` |
| `--color-primary-400` | `#3aa47f` |
| `--color-primary-500` | `#15805f` |
| `--color-primary-600` | `#0f6b4f` |
| `--color-primary-700` | `#0b5641` |
| `--color-primary-800` | `#084535` |
| `--color-primary-900` | `#063529` |

Add the teal accent ramp: `--color-teal-100 #ccfbf1`, `--color-teal-200 #99f6e4`,
`--color-teal-300 #5eead4`, `--color-teal-400 #2dd4bf`, `--color-teal-500 #14b8a6`,
`--color-teal-600 #0d9488`, `--color-teal-700 #0f766e`.

Remove the `--color-indigo-100 / -500 / -700` tokens (last consumer is the `lesson` badge).

Change `--color-canvas` from `#fbf8f5` to `#f4f8f7`.

Change the two font tokens so both resolve to Outfit with a **sans** fallback stack:

```css
--font-display: var(--font-outfit), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
  "Helvetica Neue", Arial, sans-serif;
--font-sans: var(--font-outfit), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
  "Helvetica Neue", Arial, sans-serif;
```

In `@layer base`, change `:focus-visible` outline from `var(--color-primary-400)` to
`var(--color-primary-500)`.

Leave `--color-neutral-*`, `--color-white`, `--color-success-*`, the type scale, radii, spacing and
shadows untouched. The `body` pinstripe needs no edit — it already derives from `--color-primary-700`
and `--color-canvas`, so it rethemes itself.

### 2. `app/layout.tsx` — the font

Remove the `Inter` and `Playfair_Display` imports and their config blocks. Load only:

```tsx
import { Outfit } from "next/font/google";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});
```

Set `<html className={`${outfit.variable} h-full antialiased`}>`. Change nothing else in the file —
`ClerkProvider`, `SanityLive`, and the typed `LayoutProps<"/">` signature all stay.

### 3. `components/ui/Nav.tsx` — the logo

- `BrandMark` gradient stops become `var(--color-primary-400)` and `var(--color-primary-600)`.
- Add an optional `markId?: string` prop (default `"lernio-brand-mark"`) used for the
  `<linearGradient id>` and the matching `fill="url(#...)"`.
- `Logo` gains an optional `tone?: "dark" | "light"` prop, default `"dark"`. `"light"` swaps
  `text-neutral-900` for `text-white`. `BrandMark` also needs a dark-surface-safe treatment — the
  gradient itself is fine on dark, so only the wordmark colour changes.

### 4. `components/ui/Badge.tsx` — the lesson badge

`lesson: "bg-teal-100 text-teal-700"` (4.86:1, AA). Change `video` and `popular` text from
`primary-500` to `primary-600` (5.53:1 on `primary-100`).

### 5. `components/site/SiteFooter.tsx` — new

A server component. Layout:

- Dark band `bg-primary-900 text-primary-200`, sitting inside the page shell so it keeps the shared
  `rounded-t-[24px]` container treatment used by every page.
- Container matches the shell: `px-6 sm:px-8 lg:px-14`, `max-w-[1440px]`.
- Top region is a responsive grid: single column on mobile, `sm:grid-cols-2`, and
  `lg:grid-cols-[1.6fr_repeat(3,1fr)]` on desktop.
  - **Column 1** — `Logo` with `tone="light"` and `markId="lernio-brand-mark-footer"`, then one
    sentence describing the product, reusing the hero's line so the site speaks with one voice:
    "Search every lesson across all your courses in plain English." Then the existing
    "New courses and lessons added every week." note, with the existing `star` icon in `primary-400`.
  - **Column 2 — "Learn"**: All Courses → `/courses`; Search → `/search`.
  - **Column 3 — "Account"**: Sign In → `/sign-in`; Create Account → `/sign-up`.
  - **Column 4 — "Reference"**: Design System → `/design-system`.
- Column headings use the existing `.ds-section-label` class in `primary-300`.
- Links: `text-primary-200`, hover `text-white`, with a `focus-visible` ring that stays visible on
  the dark band. `transition-colors` only — no hover transforms.
- Bottom bar: `border-t border-white/10`, flex row, copyright line
  `© {year} Lernio. All rights reserved.` on the left and a muted note on the right.
  Read the year with `new Date().getFullYear()` so it never goes stale.
- Must pass lint: no unescaped entities, no `any`, accessible markup, no client directive.

Text colours on `primary-900`, all measured: white **13.56:1**, `primary-300` **6.63:1**,
`primary-200` **9.28:1**, `neutral-400` **5.29:1**. All AA. Do not use `primary-500` or
`primary-600` for text on this band — both are far too dark against it.

### 6. Pages — render the footer

Add `<SiteFooter />` to:

- `app/page.tsx` — after `<GradientBars />`.
- `app/courses/page.tsx` — after `<GradientBars />`.
- `app/search/page.tsx` — after `<GradientBars />`.
- `app/courses/[slug]/page.tsx` — after `<GradientBars />`, before `<CourseProgressBar />`, so the
  fixed progress bar keeps floating over the footer rather than the footer's padding.
- `app/lessons/[slug]/page.tsx` — after `<LessonNavigation />`.

Do **not** add it to `app/sign-in`, `app/sign-up` or `app/design-system`. Auth pages are focused
surfaces and a footer there competes with the Clerk form.

Do not restructure the five page shells. They duplicate the wrapper today and that duplication is
pre-existing; collapsing it into a shared `SiteShell` is a separate refactor.

### 7. `app/design-system/page.tsx` — keep the docs truthful

- `primarySwatches`: all five hex values → the new ramp. Add `Primary 600`, `Primary 700` and the
  three lowest (`800`, `900`) so the dark band used by the footer is documented too.
- `neutralSwatches`: unchanged.
- Add a `tealSwatches` array and render it under a "Teal accent" heading, since `teal-*` is now a real
  token family.
- `typeScale`: every `font` value `"Playfair Display"` / `"Inter"` → `"Outfit"`.
- The logo tile's `fill="#FB7316"` → the new `primary-500` (`#15805f`).
- Spec list hex notes: `Border: 1px solid #E2E8F0` stays (neutral-200 is unchanged);
  `Focus: Border color #FB923C` → `#15805f` to match the new ring.

## Files expected to touch

New:
- `components/site/SiteFooter.tsx`

Modified:
- `app/globals.css` — primary ramp, teal ramp, drop indigo, canvas, both font tokens, focus ring.
- `app/layout.tsx` — Outfit in, Inter + Playfair out.
- `components/ui/Nav.tsx` — `BrandMark` gradient stops + `markId` prop; `Logo` `tone` prop.
- `components/ui/Badge.tsx` — lesson badge to teal; video/popular text to `primary-600`.
- `app/page.tsx`, `app/courses/page.tsx`, `app/search/page.tsx`, `app/courses/[slug]/page.tsx`,
  `app/lessons/[slug]/page.tsx` — render `<SiteFooter />`.
- `app/design-system/page.tsx` — swatches, type scale, logo fill, focus hex.

Not touched: `sanity/`, `studio/`, `lib/`, every `components/course/*`, `components/lesson/*`,
`components/search/*`, `app/api/search/route.ts`, `.env*`, `proxy.ts`.

## Security considerations

- **No secret moves or is exposed.** No env var, Sanity token, Clerk key or MCP credential is read or
  referenced. The footer is pure markup.
- **Footer is static.** No form, no fetch, no server action, no `dangerouslySetInnerHTML`. The social
  or contact links, if added, are plain anchors to existing routes only.
- **Links are internal.** Every `href` is a real in-app route (decision 8). No external domains, no
  `target="_blank"`, so no `rel="noopener noreferrer"` obligation is created.
- **`ClerkProvider` and `SanityLive` are untouched**, so the auth boundary and the live-content
  listener keep working exactly as before. The footer renders inside the same `ClerkProvider` tree.
- **No client boundary added**, so no new hydration surface and no new bundle.
- **Token values are design constants, not secrets.** The hex values in `globals.css` are public by
  definition.

## Acceptance criteria

1. No page anywhere renders the old orange family. A repo-wide search for `FB7316`, `FB923C`,
   `F05A05`, `FDBA74`, `FED7AA`, `FFEEE5`, `C74904`, `9C3A0C`, `7D310E`, `CFB4B0`… returns only the
   deliberate historical note, if any — no live value.
2. No page renders Playfair Display or Inter. `--font-inter` and `--font-playfair` no longer exist in
   the codebase.
3. `--color-indigo-*` is fully removed and nothing references `indigo-`.
4. The logo mark is emerald on every page, and the footer mark and header mark do **not** share a
   gradient `id` in the rendered HTML.
5. The footer wordmark is legible on the dark band (white), while the header wordmark is unchanged.
6. Every footer link resolves to a real route. Clicking each one from the home page footer returns 200
   and not a 404.
7. The footer appears on `/`, `/courses`, `/search`, `/courses/[slug]`, `/lessons/[slug]` and on none of
   `/sign-in`, `/sign-up`, `/design-system`.
8. Footer copyright shows the current year.
9. `:focus-visible` is clearly visible on the canvas, on white cards, and on the dark footer band.
10. Measured contrast holds: white on `primary-500` 4.90:1, `primary-500` on canvas 4.67:1,
    `primary-600` on `primary-100` 5.53:1, `teal-700` on `teal-100` 4.86:1, `primary-300` on
    `primary-900` 6.63:1.
11. `/design-system` no longer displays any orange hex or any Playfair/Inter font name.
12. No new dependency. `package.json` is unchanged.
13. `npm run typecheck`, `npm run lint` and `npm run build` all pass.

## Checks to run

From `C:\Users\DELL\Desktop\lernio`:

```
npm run typecheck
npm run lint
npm run build
```

All three must pass. Report the real output — do not claim a check passed without running it.

Then start the dev server and confirm each page in the manual steps below renders without a console
error.

## Manual test steps

1. `npm run dev`, open `http://localhost:3000`.
2. **Home** — confirm: hero is Outfit, not a serif. The "Explore Courses" button is deep emerald with
   white text. The badge above the hero is mint with dark emerald text. The logo mark is emerald. The
   star note and the gradient bar band are emerald. Scroll to the footer.
3. **Footer** — confirm: dark emerald band; white "Lernio" wordmark; three link columns with visible
   headings; links brighten on hover; a top border separates the bottom bar; the year is 2026. Click
   **All Courses**, **Search**, **Sign In**, **Create Account**, and **Design System** — each must
   load a real page, not a 404.
4. **Tab to a footer link and press Enter** — confirm the focus ring is visible against the dark band.
5. **Check for duplicate IDs** — in DevTools run
   `document.querySelectorAll('#lernio-brand-mark').length`. Must be `1`, not `2`.
6. `/courses` — confirm the same footer, and that the "All Courses" heading and course cards picked up
   the new theme.
7. `/search` — run a search. Confirm the result page heading, the "Search Results" pill, and both
   result card types (video moment and lesson) are emerald/teal. The **lesson** badge is teal, the
   **video** badge is mint.
8. Open a course, then a lesson. Confirm the sidebar, the current-lesson highlight, the video area, the
   tabs and the prev/next navigation are all on-theme, and the footer sits below the prev/next bar.
9. Resize to 375px wide. Confirm the footer collapses to a single readable column, the header nav is
   still usable, and nothing overflows horizontally.
10. `/design-system` — scroll the Colors and Typography sections. Confirm the primary and teal swatches
    show the new hexes, and the type table reads "Outfit" on every row.
11. `/sign-in` — confirm there is **no** footer below the Clerk form, as intended.
12. Open DevTools console on every page above and confirm zero errors or warnings.