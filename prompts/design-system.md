# Lernio Design System

## Goal

Implement the Lernio design system as a live, inspectable page at `/design-system`, matching
`design/lernio-designsystem.png` exactly, and back it with reusable tokens and primitives so the
rest of the app can be built from it.

The reference image is the source of truth for layout, spacing, typography, color, and states.
There is no mobile reference, so the page must be responsive down to mobile by collapsing the
grid sensibly while keeping the desktop rendering exact.

## Skills read

- `AGENTS.md` — especially §3 (UI work, reference is truth), §6 (tech stack), §12 (gotchas), §13 (checks).
- `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md` — Tailwind v4 setup via
  `@tailwindcss/postcss`, CSS Modules for scoped component styles, global CSS imported once in the
  root layout, and the recommendation to keep CSS imports in a single entry file.
- `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` — variable Google fonts through
  `next/font/google`, applied in the root layout for whole-app use.
- Sanity / Sanity Context skills were read earlier in the session but are not used by this task.

## Code and config inspected

- `package.json` — Next `16.3.8`, React `19.2.8`, Tailwind `^4` with `@tailwindcss/postcss`,
  TypeScript `^5`, eslint-config-next. No icon library, no component library, no `clsx`/`tailwind-merge`.
  Scripts: `dev`, `build`, `start`, `lint`.
- `postcss.config.mjs` — already correct for Tailwind v4 (`@tailwindcss/postcss`).
- `app/globals.css` — create-next-app scaffold. Uses `@theme inline`, Geist fonts wired to
  `--font-geist-sans`/`--font-geist-mono`, a hardcoded `body { font-family: Arial }`, and a
  `prefers-color-scheme: dark` block. All of this is scaffold and gets replaced.
- `app/layout.tsx` — loads Geist + Geist Mono via `next/font/google`, exports `metadata` titled
  "Create Next App", and uses the Next 16 typed `LayoutProps<"/">` signature.
- `app/page.tsx` — create-next-app default home page. Not part of this task.
- `design/` — reference images exist for home, course, lesson, search, and the design system.
- `design/lernio-designsystem.png` — the source of truth for this task.
- `tsconfig.json`, `eslint.config.mjs` — read to confirm path alias and lint strictness.

## Decisions and assumptions

1. **The wordmark reads "Vertex".** The reference image says "Vertex Design System", but the project is
   Lernio. I am reproducing the reference exactly per AGENTS.md §3, so the wordmark and the version
   line stay "Vertex". This is flagged for your call — one-line change if you want "Lernio".
2. **Tailwind v4 `@theme` is the token layer.** Colors, fonts, radii, shadows, and spacing steps are
   declared in `app/globals.css` inside `@theme`, which generates utilities automatically. No separate
   CSS custom-property layer or `tailwind.config.js` (v4 is config-file-free by default).
3. **Fonts.** Playfair Display (variable) and Inter (variable) via `next/font/google`, exposed as
   `--font-display` and `--font-sans`, replacing the Geist scaffold fonts.
4. **Light only.** The reference is a single light theme. The scaffold's `prefers-color-scheme: dark`
   block is removed so tokens do not flip unexpectedly.
5. **Icons are hand-built inline SVG**, not a library. The spec calls for a 24×24 grid, 2px stroke,
   rounded caps and joins, and only ~9 icons are shown (bell, search, play, document, bookmark,
   chart, clock, user, chevron). Building them avoids adding an unsanctioned dependency and matches
   the spec exactly. Outline and filled variants are separate path sets.
6. **Client components only where interactivity exists.** The showcase page itself is a Server
   Component. Only the Button (hover/disabled via CSS), Select, and the ⌘K hint need `"use client"`,
   and only if they need real state — prefer pure CSS first, add `"use client"` only where required.
7. **No new dependencies.** Everything ships with what is already installed.
8. **Route placement.** The showcase lives at `app/design-system/page.tsx`. The root `page.tsx` is left
   alone so the scaffold home is not disturbed.

## Files expected to touch

New:
- `app/design-system/page.tsx` — the 14-section showcase page.
- `app/design-system/design-system.module.css` — section-specific scoped styles where Tailwind
  utilities are insufficient (the numbered section header, the swatch grid, the spec table).
- `components/ui/Icon.tsx` — the icon set as typed React components (outline + filled).
- `components/ui/Button.tsx` — primary / secondary / tertiary / text variants.
- `components/ui/Badge.tsx` — video / lesson / popular tags.
- `components/ui/StatusIndicator.tsx` — in progress / completed / now playing / locked.
- `components/ui/ProgressBar.tsx` — track + fill + percentage label.
- `components/ui/Field.tsx` — search input and select.
- `components/ui/Card.tsx` — course card, lesson card (video), lesson card (lesson), resource card.
- `components/ui/Nav.tsx` — logo mark + links, breadcrumbs, pagination.
- `components/ui/SectionHeading.tsx` — the `01 / COLORS` numbered heading.

Modified:
- `app/globals.css` — replace scaffold with the full token layer and base styles.
- `app/layout.tsx` — swap Geist for Playfair Display + Inter, update metadata.

Untouched:
- `app/page.tsx` — no change.
- `package.json`, `postcss.config.mjs` — no change.

## Design tokens extracted from the reference

**Primary**
| Token | Hex |
| --- | --- |
| primary-500 | `#FB7316` |
| primary-400 | `#FB923C` |
| primary-300 | `#FDBA74` |
| primary-200 | `#FED7AA` |
| primary-100 | `#FFEEE5` |

**Neutral**
| Token | Hex |
| --- | --- |
| neutral-900 | `#0F172A` |
| neutral-700 | `#334155` |
| neutral-500 | `#64748B` |
| neutral-300 | `#CBD5E1` |
| neutral-200 | `#E2E8F0` |
| neutral-100 | `#F1F5F9` |
| neutral-50 | `#FAFCFF` |
| white | `#FFFFFF` |

**Typography**
| Style | Font | Size / Line Height | Weight | Use |
| --- | --- | --- | --- | --- |
| Display 1 | Playfair Display | 48 / 56 | Bold | Page titles |
| Display 2 | Playfair Display | 36 / 44 | Bold | Section titles |
| Heading 1 | Inter | 28 / 36 | SemiBold | Card titles |
| Heading 2 | Inter | 22 / 30 | SemiBold | Sub section |
| Heading 3 | Inter | 18 / 26 | Medium | Small titles |
| Body Large | Inter | 16 / 24 | Regular | Body copy |
| Body | Inter | 14 / 20 | Regular | Supporting text |
| Small | Inter | 12 / 16 | Regular | Captions, meta |

Exposed as `text-display-1`, `text-display-2`, `text-heading-1` … `text-small` with matching
`leading-*`, plus `font-display` and `font-sans` families.

**Spacing** — base unit 4px: `4, 8, 12, 16, 24, 32, 40, 48, 64` (rem: 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4).
Exposed as `p-1` … `p-16` style steps on the 4px scale.

**Radius** — `xs 4px`, `sm 8px`, `md 12px`, `lg 16px`, `xl 24px`, `full` circle.

**Shadows**
| Token | Value |
| --- | --- |
| shadow-sm | `0 1px 2px 0 rgba(15, 23, 42, 0.05)` |
| shadow-md | `0 4px 12px -2px rgba(15, 23, 42, 0.08)` |
| shadow-lg | `0 12px 24px -4px rgba(15, 23, 42, 0.10)` |
| shadow-xl | `0 20px 40px -8px rgba(15, 23, 42, 0.12)` |

**Component specs from the reference**
- Buttons: height `44px` default, padding `0 16px` (`0 12px` at md), radius `12px`,
  font Inter Medium `14–16px`. Four variants — Primary (solid primary-500, white text), Secondary
  (transparent, 1px primary-500 border, primary-500 text), Tertiary (white bg, neutral border, with
  an external-link icon), Text (primary-500 text, with a play icon). Three states — Default, Hover
  (primary darkens), Disabled (muted, non-interactive).
- Fields: height `44px`, radius `12px`, border `1px solid #E2E8F0`, padding `0 16px`,
  focus border `#FB923C`. Search field carries a leading search icon and a trailing `⌘K` hint.
  Select shows "Most Relevant" with a chevron.
- Badges: VIDEO (primary-100 bg, primary-500 text), LESSON (light indigo bg, indigo text),
  POPULAR (primary-100 bg, primary-500 text, thin border).
- Status: In Progress (primary outline circle), Completed (green check), Now Playing (primary filled
  play circle), Locked (neutral lock).
- Progress bar: primary-500 fill on a neutral-200 track, height ~6px, radius full, label `35% complete`.
- Icons: 24×24 grid, 2px stroke for outline, rounded line caps and joins, consistent optical balance.
- Layout: page background `neutral-50`; each numbered panel is white with a 1px `neutral-200` border
  and a radius; panels sit in a responsive grid. Row 1 is the hero (spans left) + `01 COLORS`
  (right, two columns of swatches). Row 2 is `02 TYPOGRAPHY` + `03 TYPE SCALE`. Row 3 is
  `04 SPACING SYSTEM` + `05 RADIUS & SHADOWS`. Row 4 is `06 ICONS` + `07 BUTTONS` + `08 INPUTS`.
  Row 5 is `09 BADGES / TAGS` + `10 STATUS / INDICATORS` + `11 PROGRESS BAR`. Row 6 is `12 CARDS`
  (full width, four card types). Row 7 is `13 NAVIGATION`. Row 8 is `14 PRINCIPLES`.
- Section heading pattern: orange zero-padded number in a small bold font, then an uppercase
  letter-spaced label in neutral-900.

## Requirements

1. **`app/globals.css`** declares every token above in `@theme`, imports Tailwind once, sets base
   typography and background, and contains no scaffold leftovers (no Arial, no dark-mode block,
   no Geist variables).
2. **`app/layout.tsx`** loads Playfair Display and Inter as variable fonts and exposes them as
   `--font-display` / `--font-sans`; metadata title and description describe the design system.
3. **`/design-system` renders all 14 sections** in the reference order, with the same grid structure:
   hero, colors, typography, type scale table, spacing, radius, shadows, icons, buttons, inputs,
   badges, status, progress bar, cards, navigation, principles.
4. **Every component is reusable and driven by props**, not hardcoded to the showcase. The showcase
   page consumes them; it does not reimplement their internals.
5. **Responsive.** Desktop matches the reference. Below `lg` the grid drops to two columns, below
   `sm` to one; the four-card row and the principles row wrap; swatch rows wrap; the type scale
   table becomes horizontally scrollable rather than squashed.
6. **States are real.** Button Default / Hover / Disabled render as three distinct rows. The disabled
   button is genuinely non-interactive (`disabled` attribute), not just visually muted.
7. **Accessibility.** Buttons expose `disabled`; the search field has a real `<label>` or
   `aria-label`; the select is a native `<select>`; icons that carry meaning are labelled, purely
   decorative icons are `aria-hidden`; focus-visible rings are present on all interactive elements;
   the primary/success/status colors are not the sole carrier of meaning (labels accompany them).
8. **Icon set matches the spec**: 24×24 viewBox, 2px stroke, round caps and joins for outline; filled
   variants are solid fills. Set: bell, search, play (circle and square), document, bookmark,
   chart, clock, user, chevron-right, chevron-down, check, lock, external-link.
9. **No invented tokens.** Every color, radius, shadow, and spacing step used comes from the list
   above. No extra shades, no new breakpoints beyond what the responsive requirement needs.
10. **No new dependencies, no config changes.**

## Security considerations

- No secrets, tokens, or env vars are introduced. This page is fully static.
- No data fetching, no route handlers, no `use client` boundary that would leak anything.
- The only client-side interactivity is presentational (select open/close if needed, progress fill).
  No user input is submitted anywhere.
- External font requests must go through `next/font`, which self-hosts them, so no third-party
  request is made at runtime.

## Acceptance criteria

1. `npm run lint` passes with no errors.
2. `npx tsc --noEmit` passes with no errors.
3. `npm run build` succeeds.
4. `npm run dev` serves `/design-system` with no console errors and no hydration warnings.
5. `/design-system` visually matches `design/lernio-designsystem.png` at desktop width: same section
   order, same grid arrangement, same colors, same type sizes, same component proportions.
6. Every token in the reference is reachable as a named utility or component prop.
7. Narrowing the viewport to 375px produces a single-column layout with nothing clipped or
   overlapping.
8. Keyboard tab order moves through every interactive element with a visible focus ring.
9. The disabled button cannot be activated by click, Enter, or Space.
10. `app/globals.css` and `app/layout.tsx` contain no create-next-app scaffold remnants.

## Checks to run

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

Then load `http://localhost:3000/design-system`.

## Manual test steps

1. Run `npm run dev`, open `http://localhost:3000/design-system`.
2. Compare against `design/lernio-designsystem.png` at ~1440px wide. Check section order, the hero
   block, the two-column colors block, the four-card row, and the principles row.
3. Inspect each swatch and confirm the hex label matches the fill above it.
4. Confirm the type scale table reads Style / Font / Size-Line Height / Weight / Use with the values
   in this prompt.
5. Click and hover every button variant; confirm Hover darkens the fill and the Disabled row is inert.
6. Focus the search field with Tab; confirm the border turns `#FB923C` and a ring is visible.
7. Set the progress bar example to 35% and confirm the fill and label agree.
8. Narrow to 375px; confirm one column, no horizontal scroll on the page (the type scale table may
   scroll internally), and no overlap.
9. Tab through the page and confirm a visible focus ring on every interactive element.
10. Run the three commands in "Checks to run" and confirm clean output.
