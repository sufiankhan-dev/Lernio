# Lernio Home Page

## Goal

Implement the Lernio home page at `/`, matching `design/lernio-home.png` exactly: the brand header,
the search hero, the All Courses row, the weekly note strip, and the orange gradient footer.

The reference image is the source of truth for layout, spacing, typography, color, and states
(AGENTS.md §3). There is no mobile reference, so the page must be responsive down to 375px by
adapting the layout sensibly (cards stack, hero type scales down, nav stays on one row) while the
desktop rendering stays exact.

## Skills read

- `AGENTS.md` — §2 (prompt first, then build), §3 (reference is truth, no restyling), §5 (layers),
  §6 (stack), §7 (search is cards, grounded results), §11 (search behaviour), §12 (gotchas),
  §13 (checks).
- `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md` — Server
  Components by default, `next/link` for internal navigation and automatic prefetching.
- `node_modules/next/dist/docs/01-app/01-getting-started/12-images.md` — `next/image` usage.
- `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md` — Tailwind v4 token layer,
  single global stylesheet import in the root layout.

Sanity, Clerk, PostHog, and search-agent skills were **not** used: this task touches none of them
(see "Deliberately out of scope").

## Code and config inspected

- `package.json` — Next `16.3.8`, React `19.2.8`, Tailwind `^4` via `@tailwindcss/postcss`, TypeScript
  `^5`, `eslint-config-next`. **No** Sanity, Clerk, PostHog, AI SDK, or icon library installed. No
  `clsx` / `tailwind-merge`. Scripts: `dev`, `build`, `start`, `lint`.
- `app/globals.css` — the design system token layer already exists: `--color-primary-100..900`,
  `--color-neutral-50..900`, `--color-white`, `--color-indigo-*`, `--color-success-*`,
  `--font-display` (Playfair) and `--font-sans` (Inter), type steps `display-1 … small`, radii
  `xs…xl`, four shadows, and base styles on `body` (`background-color: var(--color-neutral-50)`).
  Two helper classes exist: `.ds-section-label`, `.ds-spec-code`.
- `app/layout.tsx` — loads Inter + Playfair Display via `next/font/google` into `--font-inter` /
  `--font-playfair`, `<body className="min-h-full flex flex-col">`, metadata titled
  "Design System — Lernio".
- `components/ui/` — the primitive set built for `/design-system`: `Icon.tsx` (typed 24×24 grid,
  outline + filled, names: bell, search, play-circle, play-square, document, bookmark, chart, clock,
  user, chevron-right/down/left, check, check-circle, lock, external-link, folder, eye, target, grid,
  accessible), `Button.tsx` (`Button`, `LinkButton`, variants primary/secondary/tertiary/text, sizes
  sm/md, `h-11 rounded-md`), `Badge.tsx` (video/lesson/popular), `Card.tsx` (`CourseCard`,
  `LessonCard`, `ResourceCard` — compact, used by the design-system page), `Field.tsx`
  (`SearchField`, `SelectField` — `h-11 rounded-md`), `Nav.tsx` (`Logo`, `SiteNav`, `Breadcrumbs`),
  `Pagination.tsx`, `ProgressBar.tsx`, `SectionHeading.tsx`, `StatusIndicator.tsx`.
- `app/design-system/page.tsx` — the existing showcase; it consumes the primitives above and must
  keep working. Its hero uses an inline orange rounded-square logo, and section `13` renders
  `SiteNav`.
- `design/lernio-home.png` — 1024×1536, the source of truth for this task. Measured pixel
  positions are listed under "Measured geometry".
- `design/` also holds `lernio-course.png`, `lernio-lesson.png`, `lernio-search.png`,
  `lernio-designsystem.png` — not used by this task.
- `public/` — only the create-next-app SVGs (`file`, `globe`, `next`, `vercel`, `window`). No brand
  or avatar assets.
- `tsconfig.json` — path alias `@/* → ./*`, `strict: true`; `eslint.config.mjs` — next core-web-vitals
  + typescript, `agent/**`, `.agents/**`, `.claude/**` ignored.
- Git log shows the previous task ended with "rebrand to Lernio", and `components/ui/Nav.tsx`
  already renders the wordmark "Lernio".
- No `.env` / `.env.example` exists yet, and no Sanity project is configured.

## Decisions and assumptions

1. **Wordmark is "Lernio", not "Vertex".** The reference image (and the design-system reference)
   say "Vertex", but this project is Lernio and the last commit explicitly rebranded to Lernio.
   Reproducing "Vertex" would ship the wrong brand. Everything else in the reference (including
   "Vertex understands what you want to learn") is copied, with "Vertex" → "Lernio". **Flagged for
   your call** — one-line revert if you want the literal reference text.
2. **Page background is a warm canvas, not `neutral-50`.** Sampling the reference gives `#FBF8F5`
   across the header, hero, courses section, and note strip, while cards sit a step lighter at
   `#FDFCFA`. `neutral-50` (`#FAFCFF`) is cool, so a new token `--color-canvas: #FBF8F5` is added
   and becomes the `body` background. This also brings `/design-system` closer to its own reference.
   **Flagged** — say the word and I will keep `neutral-50` instead.
3. **Hero display size is a new token.** The measured hero cap height is 48px, which is a ~64px
   Playfair size; the existing scale stops at `display-1` (48px). A single semantic token
   `--text-hero: clamp(2.5rem, 6.4vw, 4rem)` with `--text-hero--line-height: 1.1` is added. Nothing
   else is added to the scale.
4. **The reference was captured at 1024px wide and read 1:1** (verified against the design-system
   reference: its 36px hero title measures a 27px cap, i.e. Playfair's 0.70 cap ratio at scale 1).
   So the measured numbers below are CSS pixels. The page shell is `max-w-[1440px]`, so the main
   content spans the full 1440px on a desktop screen and the striped gutters only appear on narrower
   viewports.
5. **The striped outer frame is real page chrome**, not a mockup artifact: the body carries a
   diagonal hatch and the app shell is centred on top of it. It disappears below `sm`, where the
   shell goes full-bleed.
6. **Courses come from a typed local dataset** (`lib/home-content.ts`), not Sanity. Sanity is not
   installed, there is no project id, and §13 requires a Studio deploy before any dataset read. The
   dataset is shaped exactly like the course fields in AGENTS.md §8 (title, summary, level,
   duration, module count, logo key) so a later GROQ fetch is a drop-in replacement for the
   imported constant.
7. **Course logos are inline SVG** (`CourseLogo`): a Next.js black rounded square, a TypeScript blue
   square, and a simplified Docker whale. No new dependency, no image files. The Docker whale is an
   approximation of the brand mark — flag it if you want the official asset dropped into `public/`.
8. **The avatar is a placeholder.** There is no photo asset and Clerk is not installed. The avatar
   renders the existing filled `user` icon inside a `primary-100` circle with an `sr-only` name, and
   is wrapped in a labelled `Account` button so Clerk's `imageURL` can replace it later without
   touching the page. No `<img>` and no `next.config.ts` image pattern is introduced yet.
9. **The search field is presentational.** It is a real `<form role="search">` with a controlled
   input, a real `<label>` (visually hidden), a `⌘K` hint, and a global `⌘/Ctrl+K` focus shortcut.
   Submitting does not navigate: `/search` does not exist yet and building it is out of scope.
   **Flagged** as the follow-up wiring.
10. **Reuse over invention.** `Icon`, `Button`/`LinkButton`, `SearchField`, and `Nav` are reused or
    extended rather than replaced. `Card.tsx`'s compact `CourseCard` is left alone because the
    reference home card is a different, taller component; the new one lives in `components/course/`
    as `CatalogCard`. `Nav.tsx`'s `Logo` and `SiteNav` are extended (brand mark, optional `actions`
    slot, `next/link` support) rather than duplicated, which keeps `/design-system` working.
11. **Internal links use `next/link`.** `eslint-config-next` errors on `<a href="/courses">`. Routes
    that do not exist yet (`/courses`, `/my-learning`) are rendered as real links to those paths so
    the markup is correct and the 404 is an obvious, honest signal.
12. **No new dependencies, no config changes.** Everything ships with what is installed.

## Measured geometry from `design/lernio-home.png` (1024px viewport, y from top)

**Frame and header**
- Hatch gutters `x 0–27` and `x 996–1023`; app shell `x 27–996`.
- Header occupies `y 0–110`, hairline bottom border at `y ≈ 110`.
- Logo mark `x 79–100`, ~30×26, an orange "V" of two triangles with a notch at the top centre,
  gradient light orange top-left → deep orange bottom-right. Wordmark `x 117–180`, Playfair bold
  ~27px. Header content inset ~48px from the shell edge.
- Nav: "Courses" `x 271–297`, "My Learning" `x 352–428` (gap ~55px), Inter ~16px, neutral-900.
- Bell outline ~24px at `x ≈ 866–896`; avatar circle 44px at `x 911–961`; gap ~16px.

**Hero** (`y 110–742`)
- Badge pill `x 407–618`, `y 168–204` (211×36), radius full, 1px light orange border, near-white
  fill, text `INTELLIGENT LEARNING` ~11px uppercase, letter-spacing ~0.15em, `primary-500`.
- Headline two lines, cap top `y 242`, baselines `y ≈ 290` and `y ≈ 362` (72px line-height), font
  ~64px Playfair bold, centred, colour neutral-900.
- Subcopy `y 408–460`, two lines, Inter ~17px, line-height ~28px, colour neutral-600.
- CTA `x 397–622`, `y 500–556` (~56px tall, radius 12px, `primary-500` fill, white text, ~16px,
  trailing arrow icon ~20px).
- Search `x 135–885`, `y 602–666` (750×64), white fill, 1px light border, radius ~14px, search icon
  ~20px at the left, placeholder ~18px neutral-400, `⌘K` hint box `x 798–860`, `y 624–663`
  (62×39) with a light border and ~16px neutral-600 text.
- Hairline divider at `y = 742` spanning the shell.

**Courses section** (`y 742–1230`), content inset ~54px from the shell edge
- "All Courses" Playfair bold ~28px, cap `y 801–821`, neutral-900.
- "View all courses" ~15px Inter medium `primary-500` + arrow, right-aligned, baseline `y ≈ 818`.
- Cards top `y 855`, bottom `y 1226` (height 371). Three columns: `x 81–350`, `365–647`, `662–938`
  (width 269, gap 15). Radius ~16px, 1px neutral-200 border, white fill, `shadow-sm`.
- Card padding-left 26px (`x 110`), padding-top 32px. Logo tile `y 888–960`, 64×64, radius ~14px.
  Card title cap `y 995–1015` (~28px Playfair bold), description `y 1044–1083` (~16px/24px,
  neutral-500, 2–3 lines), divider `y ≈ 1156`, meta row `y 1179–1194` (~14px neutral-500, three
  icon+label pairs: level, duration, modules; icons ~14px).

**Note strip** (`y ≈ 1275–1340`)
- Left rule `x 100–300`, star outline ~22px `primary-500` at `x 312–330`, text
  `New courses and lessons added every week.` `x 340–693` (~16px Inter, neutral-600), right rule
  `x 705–930`.

**Gradient bars** (`y ≈ 1345–1536`)
- Two groups, left `x 27–399`, right `x 503–994`, central gap ~104px. Bars ~48–54px wide, some
  overlapping, tops at `y 1447 / 1402 / 1439 / 1345` (left) and `1471 / 1451 / 1421 / 1384 / 1345 /
  1365` (right); all bars run to the bottom edge. Vertical gradient, transparent at the top →
  warm orange (`primary-300`/`primary-400`) at the bottom.

## Files expected to touch

New:
- `lib/home-content.ts` — the typed placeholder dataset (courses, nav links) shaped like AGENTS.md
  §8 course fields.
- `components/site/SiteHeader.tsx` — header chrome: shell, hairline, brand, nav, bell, avatar.
- `components/site/HomeHero.tsx` — badge, headline, subcopy, CTA, search field.
- `components/site/HomeSearch.tsx` — `"use client"`; controlled input, ⌘K hint, `⌘/Ctrl+K` focus.
- `components/site/WeeklyNote.tsx` — rules + star + line.
- `components/site/GradientBars.tsx` — `aria-hidden` footer decoration.
- `components/course/CatalogCard.tsx` — the tall reference course card.
- `components/course/CourseLogo.tsx` — inline brand marks keyed by slug.
- `components/site/Avatar.tsx` — placeholder avatar.

Modified:
- `app/page.tsx` — replaced entirely; assembles header → hero → courses → note → bars and exports
  its own `metadata`.
- `app/globals.css` — add `--color-canvas`, `--text-hero` / `--text-hero--line-height`, and point
  `body` at the canvas colour with the diagonal hatch as its `background-image`.
- `components/ui/Icon.tsx` — add `arrow-right` and `star` (outline + filled) to both path maps and
  to `IconName`.
- `components/ui/Button.tsx` — `LinkButton` renders `next/link` (the old plain `<a href="#">` is
  gone, so real internal hrefs no longer trip `@next/next/no-html-link-for-pages`) and both
  `Button` and `LinkButton` take an optional `iconSize`. Also fixes a dead `hover:bg-primary-50`
  utility (`primary-50` is not in the theme) to `hover:bg-primary-100`.
- `components/ui/Field.tsx` — `SearchField` gains `size` (`sm` / `md` / `lg`), where `lg` is the
  64px-tall hero field with a 20px icon, `body-large` text, and a bordered `⌘K` hint; it also takes
  an `inputRef` for the `⌘K` focus shortcut. `md` is byte-identical to today's behaviour.
- `components/ui/Nav.tsx` — `Logo` becomes the reference triangle mark + "Lernio" wordmark (with
  `BrandMark` exported); `SiteNav` gains an optional `actions` slot, switches to `next/link`, and
  uses the reference nav spacing.

Untouched:
- `app/design-system/page.tsx`, `app/design-system/design-system.module.css`, `app/layout.tsx`,
  `package.json`, `postcss.config.mjs`, `next.config.ts`, `public/**`.

## Requirements

1. **Desktop matches the reference** using the measured geometry: header 110px tall with a hairline
   bottom border, hero with the badge/headline/subcopy/CTA/search stack at the measured gaps,
   a full-width hairline divider, the courses section with its 56px inset, three equal cards of the
   measured proportions, the note strip, and the gradient bars bleeding to the bottom edge.
2. **Only design-system tokens plus the two additions in "Decisions".** Every colour, radius,
   shadow, and spacing step comes from `app/globals.css`. No arbitrary hex in components.
3. **Responsive without a reference.** Below `lg` the three cards go to two columns from `sm` and one
   below that, the hero type follows the `clamp`, the search field goes full width with `px-5`, the
   header nav keeps both links on one row, and the gradient bars shrink via `clamp`. At 375px
   nothing clips, overlaps, or causes horizontal page scroll.
4. **The page shell** is `mx-auto w-full max-w-[1440px]` with `rounded-t-[24px]`, sitting on the
   hatched body background. Below `sm` the shell is full-bleed, so the hatch is never painted.
5. **Reused primitives, not copies.** The header consumes `Nav`'s `Logo`/`SiteNav`, the CTA consumes
   `LinkButton` with `icon="arrow-right"`, the search consumes `Field`'s `SearchField` (extended
   with a `size`/`hint` that can render the taller reference field), and icons come from `Icon`.
6. **Accessibility.** One `<h1>` (the hero headline). The search input has a visually hidden
   `<label>`; the bell is a `<button>` with an `aria-label`; the avatar is a `<button>`/link with an
   `aria-label`; nav links use `aria-current="page"` where appropriate; decorative SVG, the
   gradient bars, and the hatch are `aria-hidden`; every interactive element gets the existing
   `:focus-visible` ring; no meaning is carried by colour alone (the level/duration/module labels are
   text, not just icons).
7. **No client component unless needed.** `HomeSearch` is the only `"use client"` file (it needs
   state and a key listener). `HomePage`, header, hero, cards, note, and bars are Server
   Components.
8. **The gradient bars** are pure CSS (`bg-gradient-to-t from-primary-400/… to-transparent`), sized
   from a height array that mirrors the measured profile, `aria-hidden`, and clipped by the shell so
   they stop at the bottom edge exactly like the reference.
9. **`/design-system` keeps working** and keeps its own look; the only visible change there is the
   brand mark in `Nav`'s `Logo`.

## Security considerations

- No secrets, tokens, or env vars. No `.env` is read or created by this task.
- No data fetching, no route handlers, no network calls, no `next/image` remote patterns, so there
  is nothing to leak to the browser and nothing for middleware to protect yet.
- The search input is client-side state only. It holds no user data beyond the current keystrokes and
  performs no navigation or submission, so it cannot become an injection or exfiltration path.
- Markup is static and fully escaped by React. The only interpolated values are the local dataset and
  the gradient bar heights (numbers from a literal array).
- Fonts continue to be self-hosted through `next/font`, so no third-party runtime request.

## Acceptance criteria

1. `npm run lint` passes with no errors (in particular no `<a>` for internal routes).
2. `npx tsc --noEmit` passes with no errors.
3. `npm run build` succeeds.
4. `npm run dev` serves `/` with no console errors and no hydration warnings.
5. `/` matches `design/lernio-home.png` at a 1024px viewport: same section order, same measurements
   within ~10% for the block positions listed above, same colours, type sizes, and card proportions.
6. `/design-system` still renders all 14 sections and is visually unchanged apart from the brand
   mark and slightly wider nav gaps, which move it toward its own reference.
7. At 375px the page is a single column with no horizontal scroll, no clipping, and no overlap.
8. `⌘K` / `Ctrl+K` focuses the hero search input; the `⌘K` hint is visible in the field.
9. Every interactive element is reachable by keyboard with a visible focus ring, in a sensible order.
10. The gradient bars and hatch are invisible to assistive technology.

## Checks to run

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

Then load `http://localhost:3000/`.

## Manual test steps

1. Run `npm run dev` and open `http://localhost:3000/`.
2. Set the viewport to 1024px wide and compare against `design/lernio-home.png` top to bottom:
   header height and hairline, badge, headline size and centring, subcopy, CTA, search field width
   and height, the divider, the three cards' width/height/padding, the note strip, the bars.
3. Check the type: headline Playfair bold ~64px, card titles Playfair bold ~28px, "All Courses"
   Playfair bold ~28px, body copy Inter 16px, meta row Inter 14px, nav links Inter 16px.
4. Check the colours: page `#FBF8F5`, cards white, CTA `#FB7316`, badge text `#FB7316`, star and
   "View all courses" `#FB7316`.
5. Hover the CTA and confirm it darkens to `primary-600`; hover "View all courses" and the nav links.
6. Click into the search field, type, then press `⌘K` / `Ctrl+K` from elsewhere on the page and
   confirm focus jumps to it.
7. Tab from the top of the page and confirm the order: logo → Courses → My Learning → bell →
   avatar → CTA → search, each with a visible focus ring.
8. Hover a card and confirm the shadow lifts; click a card and confirm it navigates to
   `/courses/...` (a 404 is expected today, the route does not exist yet).
9. Narrow to 768px, then 375px: confirm the cards stack, the hero type scales down, the search field
   is full width with 16px gutters, the bars shrink, and there is no horizontal scroll.
10. Resize back to desktop and re-check the reference; then run the four commands in "Checks to run"
    and confirm clean output.

## Deliberately out of scope

Not built here, and not stubbed: Sanity client, GROQ, TypeGen, the Studio, Clerk auth and middleware,
PostHog, the `/search` route and search API, video ingestion, progress tracking, the course detail,
lesson, instructor, and My Learning pages, and the notifications bell behaviour. Per AGENTS.md §7 the
bell and the free-preview badge are presentational, and the bell is a labelled, inert button here.
