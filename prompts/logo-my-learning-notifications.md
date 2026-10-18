# Canonical Logo, My Learning Page, Notifications Menu, Drop Gradient Bars

## Goal

Four changes to the Lernio web app:

1. **One logo everywhere.** Promote the design-system logo (emerald rounded square with a white "L",
   plus the "Lernio" wordmark) to the single source of truth, replacing the current double-triangle
   `BrandMark`. The design-system page then renders the shared component instead of its own inline SVG,
   so the docs can no longer drift from the header.
2. **Build `/my-learning`.** The main nav has linked to it since the home page shipped, and it 404s.
   Per `AGENTS.md` §7 it is a presentational surface, and there is no progress data to read — so it gets
   an honest empty state, not fabricated progress.
3. **Build the notifications dropdown.** The bell in the header is currently an inert `<button>` that
   does nothing on click.
4. **Remove the gradient bars** (`GradientBars`) that render directly above the footer.

## Skills read

- `AGENTS.md` — §2 (loop, prompt before code), §3 (UI work), §5 (web workspace structure),
  §7 (My Learning and the notification bell are presentational surfaces with no backend),
  §11 (surface with no backend), §12 (gotchas), §13 (checks).
- `node_modules/next/dist/docs/` — Next.js 16 conventions for `metadata`, `app/icon.svg` file
  conventions, and the typed `PageProps<"/my-learning">` signature.
- No Sanity, Clerk, search or ingestion skill applies. No schema, query, route handler or auth surface
  changes here.

## Code and config inspected

- `components/ui/Nav.tsx` — `BrandMark` currently draws a double-triangle "V" from two `<path>`s
  filled by a `linearGradient` whose stops read `var(--color-primary-400)` / `var(--color-primary-600)`,
  with an optional per-instance `markId`. `Logo` wraps it in a link with the wordmark in
  `font-display text-heading-1`.
- `app/design-system/page.tsx:125-131` — the target logo, currently inline and duplicated:
  `rect x=2 y=2 width=20 height=20 rx=6 fill=var(--color-primary-500)` + `path d="M8 6.5h2.6v8.9H16V18H8z"`
  in white, on a 24×24 viewBox at 34px, beside a `font-display text-heading-1` "Lernio" span.
- `components/site/SiteHeader.tsx` — renders the bell as an inert `<button aria-label="Notifications">`
  with `size-10`, inside `SiteNav`'s `actions` slot. A Server Component.
- `lib/home-content.ts` — `navLinks = [{ Courses, /courses }, { My Learning, /my-learning }]`. The
  header's `active` flag is set per page with `navLinks.map(l => ({ ...l, active: ... }))`.
- `sanity/lib/data.ts` — `getCatalogCourses()` returns `CatalogCourse[]` with `slug`, `title`,
  `summary`, `level`, `moduleCount`, `totalDuration`, `coverImage`. There is **no progress helper and
  no progress document type** anywhere in the codebase.
- `app/courses/[slug]/page.tsx:76-79` and `app/lessons/[slug]/page.tsx:46-47` — both hardcode
  `progressPercent = 0` / `hasProgress = false` with explicit comments refusing to fabricate a number.
  My Learning must follow that same rule.
- `components/course/CatalogGrid.tsx` + `CatalogCard.tsx` — takes `CatalogCourse[]`, filters to
  routable slugs, renders the card grid. Reusable as-is for a "continue exploring" section.
- `components/site/GradientBars.tsx` — used by exactly four pages: `app/page.tsx`,
  `app/courses/page.tsx`, `app/search/page.tsx`, `app/courses/[slug]/page.tsx`. No other consumer.
- `components/ui/Card.tsx` — `cardShell` is exported for reuse, plus `CourseCard`, `LessonCard`,
  `ResourceCard`.
- `lib/format.ts` — `formatDuration`, `formatLevel`, `formatStudentCount`. Nothing here invents a value.
- `app/favicon.ico` — 25,931 bytes, restored from git in the previous task. There is no `app/icon.svg`.
- Route inventory: `/`, `/courses`, `/courses/[slug]`, `/lessons/[slug]`, `/search`, `/design-system`,
  `/sign-in`, `/sign-up`, `/_not-found`. Confirmed **no** `app/my-learning/page.tsx`.

## Decisions and assumptions

1. **The design-system logo becomes `BrandMark`.** Rather than adding a second component, the existing
   `BrandMark` is rewritten to draw the design-system mark. `Logo`, `SiteNav`, `SiteHeader` and
   `SiteFooter` keep working unchanged, and the `markId` prop stays — the footer still needs its own
   gradient id... except the new mark has **no gradient at all**, so `markId` is deleted as dead
   surface. That also removes the duplicate-id problem the previous task worked around.
2. **One mark, one appearance, everywhere.** The footer does not get a light/dark variant of the logo.
   The square is `primary-500` and the "L" is white on every surface, because "the same logo
   everywhere" is the actual request. The white "L" is what carries the mark against the dark footer,
   not the square.
3. **`app/design-system/page.tsx` imports `Logo`** and deletes its inline SVG. One definition, so the
   documentation page cannot show a logo the app does not use.
4. **`app/icon.svg` is added** for the browser tab. The file-convention icon is the modern App Router
   way and takes precedence over the legacy `favicon.ico`. It hardcodes `#15805f` because a file-based
   icon cannot read a CSS custom property from the page.
5. **My Learning shows a real empty state, never fake progress.** There is no progress document type
   and no read helper. The page says so honestly and points at the catalog. It does **not** render
   invented percentages, invented "last watched" timestamps, or invented completed lessons. The page
   carries a comment in the same voice as the existing `progressPercent = 0` comments.
6. **My Learning is real and useful, not a dead end.** Alongside the empty state it renders a
   "Continue exploring" section built from `getCatalogCourses()`, so the page is populated with genuine
   catalog data rather than lorem.
7. **My Learning is a Server Component.** It needs no client state. Only the page it renders is new.
8. **The notifications dropdown is a new client component** in `components/site/`. It is the first
   interactive chrome in the header, so it needs real behaviour, not a hover-only mock: open/close on
   click, close on Escape, close on outside click, and focus returns to the trigger on Escape.
9. **Notification items are static placeholder copy**, defined as a module-level constant in the
   component file with a comment saying they are stand-ins. Nothing is fetched and no notification is
   invented as if it were real activity.
10. **`SiteHeader` keeps rendering the bell**, now as `<NotificationsMenu />`. The header stays a
    Server Component; only the menu carries `"use client"`.
11. **The gradient bars are deleted outright, not hidden.** `GradientBars.tsx` has no other consumer,
    so leaving the file would be dead code. The `mt-auto` it carried moves to the footer, which already
    has it, so short pages still pin the footer to the bottom.
12. **The diagonal pinstripe on the body background stays.** Only the bars were asked for, and the
    pinstripe is a separate effect (`repeating-linear-gradient` on `body`).

## Requirements

### 1. `components/ui/Nav.tsx` — the canonical mark

Replace the whole `BrandMark` body with the design-system mark, and delete the now-dead `markId`
prop from both `BrandMark` and `Logo`:

```tsx
export function BrandMark({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="var(--color-primary-500)" />
      <path d="M8 6.5h2.6v8.9H16V18H8z" fill="#fff" />
    </svg>
  );
}
```

Keep `Logo`'s existing `tone` prop and its `font-display text-heading-1` wordmark. Keep `SiteNav` and
`Breadcrumbs` untouched.

### 2. `app/design-system/page.tsx` — use the shared logo

Replace the inline `<svg>` + `<span>` block at lines 125-131 with `<Logo />`, adding it to the existing
import list from `@/components/ui/Nav` (which already imports `Breadcrumbs, SiteNav`).

### 3. `app/icon.svg` — new

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect x="2" y="2" width="20" height="20" rx="6" fill="#15805f"/>
  <path d="M8 6.5h2.6v8.9H16V18H8z" fill="#fff"/>
</svg>
```

### 4. `components/site/NotificationsMenu.tsx` — new

`"use client"`. Props: none. Behaviour:

- **Trigger** — the existing bell button, unchanged in size and colour
  (`size-10`, `text-neutral-900`, `hover:bg-neutral-100`, `Icon name="bell" size={24}`), plus:
  - `aria-expanded={open}`, `aria-controls="lernio-notifications-panel"`.
  - An unread count badge — a `primary-500` circle with white text, absolutely positioned over the
    bell's top-right, carrying `aria-hidden="true"` and a visually-hidden "3 unread notifications"
    so the count is announced once, not twice.
- **Panel** — absolutely positioned under the trigger, right-aligned:
  `absolute right-0 top-full z-50 mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-lg border border-neutral-200 bg-white shadow-xl`,
  in a `relative` wrapper. Same Tailwind radius/border/shadow vocabulary as `cardShell`.
- **Panel contents**, top to bottom:
  1. Header row: `Notifications` heading (`font-display text-heading-3`) and a `Mark all read`
     `text-small` text button. Both are visual only — give the button `type="button"` and no handler,
     which is honest for a surface with no backend.
  2. A list of three placeholder notifications, each a row with a `primary-100` `size-9` rounded icon
     tile, a `text-body` title, a `text-small text-neutral-500` line, and a `text-small` relative time.
     Use existing `IconName`s (`zap`, `users`, `clock`). Separate rows with `divide-y divide-neutral-200`.
  3. Footer: a `Link` to `/courses` reading "Browse new courses", `text-small text-primary-500`.
- **Close behaviours** — `useState` for `open`, `useRef` for the wrapper. Close on outside pointer
  click, on `Escape` (focus returns to the trigger button), and when the trigger is clicked again.
  Attach the listeners in a `useEffect` only while open, and clean them up.
- **Accessibility** — the panel is a plain `<div id="lernio-notifications-panel">` with
  `aria-label="Notifications"`. Every icon tile is `aria-hidden`. No `role="menu"`, because the rows
  are links and not menu items.
- Placeholder copy lives in a module-level constant with a comment stating it stands in for real data.

### 5. `components/site/SiteHeader.tsx` — mount the menu

Swap the inline bell `<button>` for `<NotificationsMenu />`, import it, and delete the now-unused
`Icon` import **only if** `Icon` is no longer referenced elsewhere in that file.

### 6. `app/my-learning/page.tsx` — new page

- Server Component. `export const metadata` with title `"My Learning — Lernio"` and a real description.
- Uses the Next 16 typed signature: `export default function MyLearningPage()`.
- Shell, matching the other pages exactly:
  `mx-auto flex w-full max-w-[1440px] flex-1 flex-col rounded-t-[24px] bg-canvas`.
- `SiteHeader` with `navLinks.map(l => ({ ...l, active: l.href === "/my-learning" }))`.
- `main` with `flex-1 px-6 pt-10 pb-14 sm:px-8 lg:px-14` and an inner `max-w-[960px]` column, the same
  measure the search page uses.
- Contents, in order:
  1. `h1` "My Learning" in `font-display text-heading-1 font-bold text-neutral-900`, with a
     `text-body-large text-neutral-600` subtitle.
  2. **Empty state panel** — `rounded-lg border border-neutral-200 bg-white p-10 text-center shadow-sm`,
     echoing `cardShell`. A `primary-100` `size-14` rounded tile holding a `bookmark` icon in
     `primary-600`, then a heading, then body copy that states plainly that nothing has been started
     and that progress will appear here, then a `LinkButton href="/courses" icon="arrow-right"`.
     Carry a code comment recording that no progress document type or read helper exists yet, in the
     same voice as the existing `progressPercent = 0` comments.
  3. **"Continue exploring"** — a `SectionHeading` (or an `h2` with the same treatment the home page
     uses for "All Courses") followed by `CatalogGrid` over `getCatalogCourses()` sliced to 3,
     filtered to routable slugs exactly as `CatalogGrid` already does.
- `<SiteFooter />` last.

### 7. Remove the gradient bars

From each of `app/page.tsx`, `app/courses/page.tsx`, `app/search/page.tsx`, `app/courses/[slug]/page.tsx`:
delete the `import { GradientBars }` line and the `<GradientBars />` element.

Then delete `components/site/GradientBars.tsx`.

Check each page still composes: the shell is `flex flex-col`, `<main>` carries `flex-1`, and
`SiteFooter` carries `mt-auto`, so the footer pins to the bottom on short pages.

## Files expected to touch

New:
- `components/site/NotificationsMenu.tsx`
- `app/my-learning/page.tsx`
- `app/icon.svg`

Modified:
- `components/ui/Nav.tsx` — new `BrandMark`, drop `markId`.
- `app/design-system/page.tsx` — use `<Logo />`.
- `components/site/SiteHeader.tsx` — mount `<NotificationsMenu />`.
- `app/page.tsx`, `app/courses/page.tsx`, `app/search/page.tsx`, `app/courses/[slug]/page.tsx` —
  remove `GradientBars`.

Deleted:
- `components/site/GradientBars.tsx`

Not touched: `sanity/`, `studio/`, `lib/`, `app/api/`, `proxy.ts`, `.env*`, `app/lessons/[slug]/page.tsx`
(never had the bars), `components/site/SiteFooter.tsx` (mark id comes from `BrandMark`, not the footer).

## Security considerations

- **No secrets move or are exposed.** No env var, Sanity token, Clerk key or MCP credential is read.
- **The notifications menu is client-side and holds no data.** It renders a module-level constant of
  placeholder strings. It performs no fetch, holds no token, and calls no external service. No secret
  can reach it because none exists in the module.
- **No new write path.** Nothing here creates a server action or API route, so the "browser never
  writes" rule from `AGENTS.md` §5 is untouched.
- **`ClerkProvider` is not modified.** The bell is rendered for signed-out and signed-in visitors
  alike, exactly as it is today; the menu is deliberately not auth-gated, because gating it would be
  access control on a surface that has none.
- **My Learning reads through the existing server-only Sanity client.** It calls `getCatalogCourses()`,
  the same helper the catalog and home pages already use, so no new query, token exposure or client-side
  fetch is introduced.
- **`app/icon.svg` is static SVG with two hex values.** It cannot execute script and references nothing
  external.
- **Escape handling and focus return** are accessibility requirements, not security ones, but closing
  the panel on Escape prevents a keyboard user being trapped in an open overlay.

## Acceptance criteria

1. The logo rendered in the header, the footer and the design-system page is byte-identical geometry
   — the same rounded square and the same "L" path.
2. `grep -ri "gradientBars" app components` returns nothing.
3. `components/site/GradientBars.tsx` no longer exists.
4. `grep -ri "linearGradient" components/ui/Nav.tsx` returns nothing; the old double-triangle paths
   are gone.
5. `/my-learning` returns 200 and the main nav's "My Learning" link no longer 404s.
6. My Learning renders zero fabricated data — no invented percentages, completion counts, or
   timestamps. It shows the empty state plus real catalog courses.
7. My Learning collapses to one readable column at 375px and matches the other pages' shell.
8. Clicking the bell opens the panel; Escape, an outside click, and a second click all close it;
   Escape returns focus to the trigger.
9. The panel does not overflow the viewport at 375px and is not clipped by the header.
10. The notifications trigger keeps `aria-label="Notifications"`, adds `aria-expanded` and
    `aria-controls`, and the unread count is announced exactly once.
11. `/design-system` shows the shared logo, not an inline duplicate.
12. The browser tab shows the emerald "L" mark.
13. No page regresses in layout after the bars are removed; short pages still pin the footer to the
    bottom.
14. No new dependency. `package.json` is unchanged.
15. `npm run typecheck`, `npm run lint` and `npm run build` all pass.

## Checks to run

From `C:\Users\DELL\Desktop\lernio`:

```
npm run typecheck
npm run lint
npm run build
```

All three must pass. Report the real output.

Then confirm against the running dev server. **Note: port 3000 on this machine is a different app
(ScopeSentry). Lernio's dev server is on port 3001** — verify the port before asserting anything.

## Manual test steps

1. `npm run dev`, open `http://localhost:3001`.
2. **Header** — confirm the logo is now the emerald rounded square with a white "L", in both the header
   and the footer, and that it is identical on both.
3. `/design-system` — confirm the hero logo is the same mark, and that no inline duplicate SVG remains
   in that file.
4. Reload the browser tab and confirm the favicon is the emerald "L", not the old Next.js default.
5. **Notifications** — click the bell. Confirm: the panel opens below the trigger, an unread count
   badge shows, three notifications render with icon tiles, and "Browse new courses" sits at the
   bottom. Press `Escape` — confirm it closes and focus is back on the bell. Click the bell again,
   then click elsewhere — confirm it closes.
6. Narrow the window to 375px and reopen the panel — confirm it stays inside the viewport and is not
   clipped.
7. Tab through the header — confirm the bell is reachable and shows a visible focus ring.
8. **My Learning** — click "My Learning" in the nav. Confirm it loads (no 404), the nav item is marked
   active, the empty state reads honestly, and "Continue exploring" shows three real course cards that
   link to real course pages.
9. Open a course card from My Learning — confirm it resolves.
10. **Gradient bars** — visit `/`, `/courses`, `/search` and a course page. Confirm the bar decoration
    is gone and the footer sits directly under the page content. Check a short page (e.g. an empty
    search) still pins the footer to the bottom.
11. `/sign-in` and `/sign-up` — confirm the bell area is unchanged and there is still no footer.
12. Open the DevTools console on each page and confirm zero errors or hydration warnings. The
    notifications menu is the first client component in the header, so hydration warnings here matter.