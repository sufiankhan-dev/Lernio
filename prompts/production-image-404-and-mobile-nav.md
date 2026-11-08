# Production Image 404s and Mobile Navigation

## Goal

Two things:

1. **Fix images that 404 in production.** Every `<Image>` request goes to
   `https://lernio-lms.vercel.app/_next/image?...` and gets a 404, while the underlying
   `https://cdn.sanity.io/...` URL returns 200. Stop depending on `/_next/image` and let Sanity's own
   image CDN serve responsive variants.
2. **Make the site usable on mobile.** The header renders logo + two nav links + bell + Sign in +
   Sign up + avatar in one unwrapped row with `gap-14` / `gap-10`, which overflows well before
   `lg`. Add a real mobile menu, then fix the page-level layouts that break at 375px (lesson sidebar
   ordering, lesson prev/next bar, hero type sizes, course cover, search controls, result card
   actions).

## Skills and docs read

- `AGENTS.md` — §2 (prompt before code), §3 (UI work: desktop reference is exact, adapt sensibly for
  mobile), §5 (boundaries), §6 (stack), §7 (private dataset, no client-side content), §12 (gotchas),
  §13 (checks).
- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` — `loader`,
  `loaderFile`, `fill`, `sizes`, Next 16 `qualities` behaviour.
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/images.md` —
  custom loader + the documented Sanity loader example.
- No Sanity schema/GROQ, Clerk, search-agent or ingestion skill applies: no content model, query,
  route handler or auth change here.

## Diagnosis (evidence, not a guess)

- The failing request is the Next.js optimizer path, and it returns **the app's own 404 page**:
  `curl` of
  `https://lernio-lms.vercel.app/_next/image?url=...cdn.sanity.io...&w=256&q=75`
  gives `404`, `content-type: text/html`, `x-matched-path: /404`, and the body is the Lernio 404
  document.
- The upstream asset is healthy: the exact `cdn.sanity.io/images/gdotcciy/production/...jpg?rect=...&w=256&h=256&fit=crop&auto=format`
  returns `200 image/jpeg`.
- So the optimizer is never reached. This deployment is **Services mode** (`vercel.json` declares
  `services` + a catch-all `rewrites` rule). In Services mode the platform does not expose the
  Next/Vercel image optimizer under `/_next/image`; the request falls into the `app` service and the
  Next app has no such route, hence its 404 page. This is a deployment-shape problem, not a
  `remotePatterns` problem (a mismatched pattern would be a 400 from the optimizer, which never
  runs).
- `next.config.ts` currently only sets `images.remotePatterns` for `cdn.sanity.io`, which only the
  built-in optimizer reads, so it cannot help.

## Code inspected

- `next.config.ts` — `remotePatterns` only.
- `sanity/lib/image.ts` — `urlFor()` via `@sanity/image-url`; call sites bake width/height in:
  - `components/course/CatalogGrid.tsx:32` → `width(256).height(256).fit("crop").auto("format")`
  - `app/courses/[slug]/page.tsx:72` → `width(720).height(900).fit("crop").auto("format")`
  - `components/search/*` receive an already-built `posterUrl` string from the search hydration route.
- The only three `next/image` consumers: `components/course/CatalogCard.tsx:43` (fill, `sizes="64px"`),
  `components/course/CourseHero.tsx:50` (fill, `sizes="(min-width:1024px) 280px, …"`),
  `components/search/SearchVideoResultCard.tsx:64` (fill, `sizes="275px"`).
- `components/ui/Nav.tsx` — `SiteNav` is a server component: `<nav className="flex items-center gap-14">`
  with logo + `ul` (`gap-10`) and, when `actions` is passed, a right cluster at `gap-4`. No mobile
  handling at all, no menu button, `Icon` has no `menu`/`close` glyphs (union at `Icon.tsx:3-37`,
  `outlinePaths` and `filledPaths` are `Record<IconName, …>` so both must be extended).
- `components/site/SiteHeader.tsx` — `h-[72px] lg:h-[104px]`, renders `SiteNav` with
  `<NotificationsMenu />` + `<AuthControls />` as actions. `AuthControls` renders a Sign in text
  button, a Sign up button (h-11 + px-4) and Clerk's `UserButton`.
- `components/site/NotificationsMenu.tsx` — already mobile-safe (`max-w-[calc(100vw-2rem)]`, closes
  on Escape/outside click).
- `app/globals.css` — `--text-hero` is clamped, but `--text-display-1: 3rem`,
  `--text-display-2: 2.25rem` and `--text-heading-1: 1.75rem` are fixed, so course and lesson `h1`s
  are 48px on a 320px screen.
- `app/lessons/[slug]/page.tsx:97` — `grid … lg:grid-cols-[340px_minmax(0,1fr)]` with
  `LessonSidebar` **first in DOM**, so on mobile the whole curriculum card renders above the video.
- `components/lesson/LessonSidebar.tsx` — `curriculumOpen` defaults to `true`.
- `components/lesson/LessonNavigation.tsx` — one `flex-wrap` row: Previous button + title,
  `ml-auto` + next title + Next button. Does not stack cleanly at 375px.
- `components/course/CourseHero.tsx:29` — mobile cover is `aspect-[4/5] w-full` (~470px tall at 375px).
- `components/course/CourseContent.tsx:108-126` — lesson row is label + title + Free preview badge +
  duration in one line; cramped below `sm`.
- `components/search/SearchPanel.tsx:253-273` — sort select is a fixed `w-[190px]`.
- `components/search/SearchResultCard.tsx:102` and `SearchVideoResultCard.tsx:106` — bottom row is
  meta + action side by side; squeezes at 320px.
- `app/page.tsx:27` — "All Courses" heading and "View all courses" link in one non-wrapping row.
- `app/design-system/page.tsx:422` renders `SiteNav` inside a panel, so the mobile menu must work
  there too (no `actions` passed).

## Decisions and assumptions

1. **Custom loader instead of the optimizer.** A `loaderFile` removes `/_next/image` from the
   critical path entirely, so the fix does not depend on Vercel routing, plan, or Services mode.
   Sanity's CDN already resizes and negotiates format (`auto=format`), so nothing is lost.
2. **One global loader, URL-string based.** `CatalogCard`, `CourseHero` and the search cards receive
   plain URL strings (the search card's poster is built server-side and shipped as JSON), so the
   loader must work from a URL, not from a Sanity image reference. Non-Sanity URLs are returned
   untouched.
3. **Preserve the built-in aspect ratio.** Call sites bake `w` and `h` (square for cards, 4:5 for the
   course cover) with `fit=crop`. The loader reads the existing `h/w` ratio and rescales `h`
   proportionally with the requested `w`, so crops keep their shape, then sets `q` and
   `auto=format`. Verified by hand: `w=64`→`h=64` and the 720×900 cover at `w=640`→`h=800`, both
   `200 image/jpeg` from `cdn.sanity.io`.
4. **`remotePatterns` is removed.** With a custom loader it is dead config that would suggest the
   optimizer is in use. A short comment records why.
5. **Mobile nav is a full-screen sheet, not a squeezed row.** A sheet is the only thing that fits
   logo + links + bell + auth at 320px, and it works identically inside the design-system panel. The
   desktop header keeps byte-identical classes at `lg` and up (`gap-14`, `gap-10`, `h-[104px]`).
6. **Mobile sheet owns the actions on small screens.** The header row on `<lg` shows logo + menu
   button only; the bell and `AuthControls` render inside the sheet. This avoids duplicating the
   auth UI visually and keeps tap targets at 44px+.
7. **`BrandMark`/`Logo` stay in `Nav.tsx`.** The client sheet receives the brand as a `brand` prop
   node from the server `SiteNav`, so there is no client→server import cycle and `Nav.tsx` does not
   become a client module (it also exports `Breadcrumbs`).
8. **Type tokens get clamps, not per-component overrides.** Clamping `--text-display-1`,
   `--text-display-2` and `--text-heading-1` in `globals.css` fixes every page at once while
   resolving to the exact current rem values at `lg` (1024px) and above, so the desktop reference is
   unchanged.
9. **Lesson page: content first, curriculum second on mobile.** Reordering with `order-*` avoids a
   hydration flip and avoids duplicating the sidebar markup.
10. **No new dependencies, no schema changes, no server-route changes.** This is presentation plus
    one config file and one pure module.

## Requirements

### 1. `lib/image-loader.ts` (new)

Default-export a Next `ImageLoader`:

```ts
import type { ImageLoaderProps } from "next/image";

/** Sanity's CDN is already an image CDN; see next.config.ts for why this exists. */
export default function sanityImageLoader({ src, width, quality }: ImageLoaderProps): string {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }

  // Only rewrite Sanity assets. Anything else passes through untouched.
  if (url.hostname !== "cdn.sanity.io") return src;

  const sourceWidth = Number(url.searchParams.get("w"));
  const sourceHeight = Number(url.searchParams.get("h"));
  const aspect = sourceWidth > 0 && sourceHeight > 0 ? sourceHeight / sourceWidth : null;

  url.searchParams.set("w", String(width));
  if (aspect) {
    url.searchParams.set("h", String(Math.round(width * aspect)));
  } else {
    url.searchParams.delete("h");
  }
  url.searchParams.set("q", String(quality ?? 75));
  url.searchParams.set("auto", "format");
  return url.toString();
}
```

Keep it dependency-free and client-safe (no `server-only`, no env import).

### 2. `next.config.ts`

```ts
const nextConfig: NextConfig = {
  // Production runs in Services mode, where Vercel does not expose /_next/image, so every
  // optimized request 404s. Sanity's CDN already resizes and picks a format, so images are
  // loaded straight from it through the custom loader instead of the Next optimizer.
  images: {
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
  },
};
```

Delete `remotePatterns`. Do not set `unoptimized` (that would drop `srcset`).

### 3. `components/ui/Icon.tsx`

Add `"menu"` and `"close"` to `IconName` and to **both** `outlinePaths` and `filledPaths`
(stroke glyphs are fine for both; keep the same 24×24 geometry as the neighbours):

- `menu`: `M4 7h16`, `M4 12h16`, `M4 17h16`
- `close`: `M6 6l12 12`, `M18 6L6 18`

### 4. `components/ui/MobileNav.tsx` (new, `"use client"`)

Props: `{ links: { label: string; href?: string; active?: boolean }[]; actions?: ReactNode; brand: ReactNode }`.

- **Trigger** — `size-10` icon button, `lg:hidden`, `aria-label="Open menu"`,
  `aria-expanded={open}`, `aria-controls="mobile-nav-panel"`, `Icon name="menu" size={24}`.
- **Sheet** — `open` renders `fixed inset-0 z-[60] flex h-dvh w-full flex-col overflow-y-auto bg-white lg:hidden`
  with `role="dialog"`, `aria-modal="true"`, `aria-label="Main menu"`, `id="mobile-nav-panel"`.
  - Top bar mirrors the header: `flex h-[72px] shrink-0 items-center justify-between border-b border-neutral-200 px-5`,
    the `brand` node on the left, a `size-10` close button on the right (`aria-label="Close menu"`,
    `Icon name="close"`).
  - `nav aria-label="Main"` with `ul` `divide-y divide-neutral-200 border-b border-neutral-200`; each
    item is a `Link` `block px-5 py-4 text-body-large font-medium` — active uses
    `text-primary-500` + `aria-current="page"`, inactive `text-neutral-900`.
  - When `actions` is passed, render it in `mt-auto flex items-center gap-4 border-t border-neutral-200 px-5 py-6`.
- **Behaviour** — close on link click, on the close button, on `Escape`, and when the viewport
  reaches `lg` (`window.matchMedia("(min-width: 1024px)")` change listener). On open set
  `document.body.style.overflow = "hidden"` and restore the previous value on cleanup. On open move
  focus to the close button; on `Escape` return focus to the trigger. All listeners inside
  `useEffect` with cleanup.
- Do **not** render the sheet while closed (no `hidden`-only sheet that keeps `AuthControls`
  mounted twice on desktop).

### 5. `components/ui/Nav.tsx`

`SiteNav` becomes:

- Desktop links `ul`: add `hidden lg:flex` (keep `items-center gap-10`).
- Desktop actions wrapper: `hidden lg:flex items-center gap-4`.
- Right side on mobile: `<MobileNav links={links} actions={actions} brand={<Logo />} />`.
- Nav container: keep `gap-14` on `lg`, use a smaller gap below it (`gap-6 lg:gap-14`) so the row
  cannot collide before the breakpoint; keep `justify-between` behaviour when actions exist.
- Existing `Logo`, `BrandMark`, `Breadcrumbs` exports unchanged.

### 6. `components/site/SiteHeader.tsx`

No structural change expected: it keeps passing `<NotificationsMenu />` + `<AuthControls />` as
`actions`, which now render in the sheet below `lg` and in the row at `lg`+. Verify the header keeps
`h-[72px] lg:h-[104px]` and the `px-5 sm:px-8 lg:px-12` gutters, and that nothing overflows at 320px.

### 7. `app/globals.css` — responsive type tokens

- `--text-hero: clamp(2.25rem, 6.4vw, 4rem)` (was `2.5rem` minimum).
- `--text-display-1: clamp(2rem, 4.6875vw, 3rem)`, `--text-display-1--line-height: clamp(2.5rem, 5.47vw, 3.5rem)`.
- `--text-display-2: clamp(1.75rem, 3.5156vw, 2.25rem)`, `--text-display-2--line-height: clamp(2.25rem, 4.3vw, 2.75rem)`.
- `--text-heading-1: clamp(1.5rem, 2.7344vw, 1.75rem)`, `--text-heading-1--line-height: clamp(2rem, 3.5156vw, 2.25rem)`.

Each maximum is reached exactly at 1024px, so `lg` and up keeps the current desktop sizes. Keep the
comment block above the tokens, updating it to say display sizes are fluid down to mobile.

### 8. `app/lessons/[slug]/page.tsx` — content first on mobile

- Grid children get ordering: the wrapper around `LessonSidebar` renders with
  `order-2 min-w-0 lg:order-1`, the content column with `order-1 min-w-0 lg:order-2`.
  Keep the desktop column order and `lg:grid-cols-[340px_minmax(0,1fr)]` unchanged.
- Keep `LessonSidebar`'s internal defaults; do not add a mobile-only duplicate.

### 9. `components/lesson/LessonNavigation.tsx`

- Container: `flex flex-col gap-6 border-t … px-6 py-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8`.
- Previous group in a `flex min-w-0 items-center gap-4 sm:gap-8` wrapper; the neighbour title keeps
  `truncate` and `min-w-0`.
- Next group: `flex min-w-0 items-center justify-between gap-4 sm:ml-auto sm:gap-8 sm:justify-end`.
- Buttons keep their size; on mobile they may sit on their own row with the title truncating beside
  them. No horizontal scroll at 320px.

### 10. `components/course/CourseHero.tsx`

- `CoverTile` shell adds `mx-auto max-w-[260px] sm:mx-0 sm:max-w-none` so the 4:5 cover is not
  ~470px tall at 375px. Keep `aspect-[4/5]` and desktop widths unchanged.

### 11. `components/course/CourseContent.tsx`

- Lesson row: hide the duration below `sm` (`hidden sm:inline`/`sm:block`), keep the Free preview
  badge and allow the row to wrap (`flex-wrap` with `gap-y-1`), title stays `min-w-0 flex-1`.
- Module rows already wrap; leave them, only verify no overflow at 320px.

### 12. `components/search/SearchPanel.tsx`

- Sort select: `wrapperClassName="w-full sm:w-[190px]"` and the row above it stays `flex-wrap`
  with `justify-between`, so on mobile the select sits full width under the count.
- No change to search behaviour, request handling, sorting or stream parsing.

### 13. `components/search/SearchResultCard.tsx` and `SearchVideoResultCard.tsx`

- Bottom row: `flex flex-col items-start gap-3 pt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4`.
- Keep the action `shrink-0` (and `self-start` on mobile) so it never squeezes the meta line.
- The `hidden … sm:block`/`sm:flex` side panels stay as they are.

### 14. `app/page.tsx`

- "All Courses" header row: `flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between`.
- `HomeHero` spacing: `px-5 pt-10 pb-14 sm:px-8 sm:pt-14 sm:pb-20` (desktop unchanged at `sm`+).

## Files expected to touch

New:
- `lib/image-loader.ts`
- `components/ui/MobileNav.tsx`

Modified:
- `next.config.ts`
- `components/ui/Icon.tsx`
- `components/ui/Nav.tsx`
- `components/site/SiteHeader.tsx` (only if the mobile row needs it; otherwise untouched)
- `app/globals.css`
- `app/lessons/[slug]/page.tsx`
- `app/page.tsx`
- `components/lesson/LessonNavigation.tsx`
- `components/course/CourseHero.tsx`
- `components/course/CourseContent.tsx`
- `components/search/SearchPanel.tsx`
- `components/search/SearchResultCard.tsx`
- `components/search/SearchVideoResultCard.tsx`
- `components/site/HomeHero.tsx`

Not touched: `sanity/**`, `studio/**`, `app/api/**`, `proxy.ts`, `app/courses/**` (beyond shared
components), `.env*`, `vercel.json` (the deployment shape is intentional; the fix removes the
dependency on it).

## Security considerations

- **No token or secret is read, moved or exposed.** The loader is a pure URL rewrite in the browser
  bundle; it contains no project id, dataset, token or env access (the Sanity URL it receives is
  already a public CDN URL).
- **No new network origin.** The loader only rewrites URLs whose hostname is exactly `cdn.sanity.io`;
  every other `src` passes through unchanged, so it cannot be used to proxy an arbitrary host.
- **No content leaves the server.** Nothing here fetches content client-side; pages keep reading the
  private dataset through the server-only client per `AGENTS.md` §5.
- **No write path and no auth change.** `proxy.ts`, Clerk keys, and route protection are untouched;
  the mobile sheet only re-renders the existing client components in a different container.
- **Dialog semantics are honest.** The sheet is a labelled, `aria-modal` dialog that closes on
  Escape with focus restored; no focus is trapped in a hidden element, and the body scroll lock is
  reverted on unmount and on breakpoint change.

## Acceptance criteria

1. In a production build, no page emits a `/_next/image` URL: `grep -o "/_next/image"` over the
   rendered HTML of `/`, `/courses`, a course page, a lesson page and `/search?q=hooks` returns
   nothing.
2. Every rendered image `src` points at `cdn.sanity.io` with `w`, `q` and `auto=format` params, and
   each such URL returns `200` with an `image/*` content type.
3. Catalog card thumbnails keep their square crop, and the course cover keeps its 4:5 crop, at every
   generated `srcset` width.
4. A non-Sanity `posterUrl` (if one is ever returned) is passed through untouched and does not throw.
5. At 320px and 375px the header shows the logo and a menu button only — no horizontal scroll, no
   clipped actions.
6. The menu button opens a full-screen sheet containing both nav links (active one marked), the
   notifications bell and the auth controls; close button, Escape and link click all close it, and
   the page behind does not scroll while it is open.
7. Resizing to `lg` closes the sheet and restores the exact desktop header (logo, links, bell, auth
   in one row).
8. `/design-system` mobile renders the same menu (links only, no auth block) and nothing is clipped
   by the panel border.
9. At 375px, a lesson page shows breadcrumb → title → video → tabs before the curriculum card, and
   the prev/next bar stacks without overflow.
10. Course and lesson `h1`s are 32px at 375px (not 48px) and still 48px at `lg`; the desktop
    reference layout is otherwise unchanged at `lg` and above.
11. The course cover is at most 260px wide on mobile and full column width from `sm` up.
12. Search sort control is full width at 375px; result card actions sit under the meta row and do not
    truncate the labels.
13. No new dependency; `package.json` is unchanged.
14. `npm run typecheck`, `npm run lint` and `npm run build` all pass.

## Checks to run

From `C:\Users\DELL\Desktop\lernio`:

```
npm run typecheck
npm run lint
npm run build
```

Then the production server, because this fix is specifically about the production path:

```
npm start
```

and confirm the image URLs in the served HTML are Sanity URLs (not `/_next/image`), e.g.:

```
curl -s http://localhost:3000/courses | Select-String -Pattern "_next/image", "cdn.sanity.io"
```

(Note: on this machine port 3000 may be another app (ScopeSentry); Lernio's dev server normally runs
on 3001. Check which port `npm start` prints and use that.)

## Manual test steps

1. `npm run build` then `npm start`, open the printed URL (expect 3000 or 3001).
2. **Images** — open `/`. Confirm the three featured course thumbnails render, and in DevTools →
   Network there is **no** `/_next/image` request; image requests go to `cdn.sanity.io` and return
   200.
3. Open a course page — confirm the large cover renders at 4:5 with no distortion, and the catalog
   card from `/courses` still renders square.
4. Open `/search?q=data%20fetching` — confirm video-result thumbnails render.
5. **Mobile nav** — open DevTools device toolbar at 375px: the header shows the logo and a menu
   button only. Tap it: a full-screen sheet opens with Courses, My Learning, the bell and Sign in /
   Sign up. Tap a link — sheet closes and navigation happens. Reopen, press Escape — closes and
   focus is on the menu button. Reopen, try to scroll the page behind — it does not scroll.
6. Widen to 1024px and above — sheet closes automatically, desktop header is identical to the
   reference image (logo, links, bell, auth in one row, 104px tall).
7. **Lesson page at 375px** — breadcrumb, title, video and tabs come before the curriculum card; the
   Previous/Next bar stacks with no horizontal scroll.
8. **Course page at 375px** — cover is at most 260px wide and centered; lesson rows inside an opened
   module wrap without overflow; Free preview badge stays visible.
9. **Home at 375px** — hero heading fits (no clipping), "All Courses" heading and "View all courses"
   stack.
10. **Search at 375px** — sort select is full width; result cards show title, summary, meta and the
    action underneath, nothing truncated.
11. **`/my-learning` at 375px** — empty state and course cards fit, no horizontal scroll.
12. Console on each page: zero errors and zero hydration warnings (the mobile sheet and the
    notification menu are both client components in the header).
