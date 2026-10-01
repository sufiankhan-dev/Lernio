# Lernio Clerk Authentication

## Goal

Set up Clerk authentication in the existing Lernio Next.js app using the Clerk CLI, and make
sign-in, sign-up, and signed-in account controls visible in the site header so a learner can
create and recognise their first account. Browsing stays public; no route is gated yet.

## Skills read

- `AGENTS.md` — §2 (prompt first, then build), §3 (reference is truth, no restyling), §5 (layers
  and boundaries), §6 (stack), §7 (auth is Clerk, browsing public, protect via middleware),
  §12 (Clerk secret key server only, protect routes in middleware not client code), §13 (checks).
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` — Next.js 16 renamed
  `middleware` to `proxy`; one `proxy.ts` at the project root, single `proxy` export plus an
  optional `config.matcher`; matcher values must be static constants.
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` — full matcher
  semantics, negative matching, the "middleware is deprecated, renamed to proxy" note, and the
  warning that a matcher change can silently drop coverage so authorisation is also verified in
  each Server Function / Route Handler.
- Clerk docs referenced by the CLI output — `clerk.com/err/signedout-is-not-available-in-clerk-nextjs`
  and `node_modules/@clerk/nextjs/dist/types/removedControlComponents.d.ts`, which confirms
  `SignedIn` / `SignedOut` / `Protect` were **removed in Clerk Core 3** and are replaced by
  `<Show when="…">`. `ShowProps` (`node_modules/@clerk/shared/dist/types/authorization.d.ts:83`)
  takes `when: 'signed-in' | 'signed-out' | …` plus an optional `fallback`.

Sanity, PostHog, and the search-agent skills were **not** used: this task touches none of them
(see "Deliberately out of scope").

## Code and config inspected

- `package.json` — Next `16.3.8`, React `19.2.8`, Tailwind `^4`, TypeScript `^5`,
  `eslint-config-next`. `package-lock.json` present, so npm is the detected package manager. No
  auth library installed before this change.
- `app/layout.tsx` — Inter + Playfair via `next/font/google`, `<body className="min-h-full flex flex-col">`.
  Root layout only; no provider existed.
- `components/site/SiteHeader.tsx` — the only header. Renders `SiteNav` with a notifications bell
  button and a hardcoded account `Avatar` placeholder in the actions slot. That placeholder is what
  the Clerk controls replace.
- `components/ui/Nav.tsx` — `SiteNav` takes `actions?: ReactNode` and wraps them in
  `<div className="flex items-center gap-4">`, so Clerk controls drop straight in.
- `components/ui/Button.tsx` — the project's button primitives (`primary` / `secondary` /
  `tertiary` / `text`, `sm` / `md`). It renders a real `<button>` and has no `asChild`, so it
  cannot wrap a Clerk `SignInButton`; the header controls use plain buttons with the same token
  classes instead of a parallel design system.
- `design/lernio-home.png` — the reference. Signed-in state shows a round avatar at the far right
  of the header, next to the bell. That is the `UserButton` slot.
- `next.config.ts` — empty config object, untouched by this change.
- `.gitignore` — ignores `.env*`, so no env file is committed.

## Decisions and assumptions

- **Framework and PM detection**: the directory is an existing Next.js app-router project, so
  `clerk init` was run without `--framework` or `--pm` and it auto-detected both (`Detected Next.js
  (app-router)`, npm).
- **Clerk app**: `clerk init --app app_3K5lrU9RohdZ8teBe0Qw62pR8XR` links the project to the
  intended Clerk application.
- **Auth route style**: `mode="modal"` on `SignInButton` / `SignUpButton` so the header stays
  compact and the learner never leaves the page. The dedicated `/sign-in` and `/sign-up` routes
  that the CLI scaffolded still exist and work.
- **`<Show>` not `<SignedIn>` / `<SignedOut>`**: required by Clerk Core 3, which the installed
  `@clerk/nextjs` is. The first build failed on `<SignedOut>` and was fixed by switching to
  `<Show when="signed-out">` / `<Show when="signed-in">`.
- **No route gating**: `clerkMiddleware()` is used with no `publicRoutes` override, so nothing is
  protected. Adding `auth.protect()` or a matcher restriction is deferred to the feature that
  actually needs a private surface (progress, My Learning), per AGENTS.md §5 and §7.
- **`.env.example`**: created as the canonical list (AGENTS.md §12), with `!.env.example` added to
  `.gitignore` so it can be committed while `.env.local` stays ignored. No value from `.env.local`
  was read or printed.
- **Header control styling**: follows the reference image (avatar at far right) and the existing
  token vocabulary (`text-body-large`, `text-body`, `primary-500/600`, `h-11`, `rounded-md`,
  `shadow-sm`) rather than importing a new visual language.

## Files touched

- `package.json` / `package-lock.json` — `@clerk/nextjs` added.
- `proxy.ts` — **created** by `clerk init`; `config.matcher` extended with
  `"/__clerk/:path*"` after `"/(api|trpc)(.*)"`.
- `app/layout.tsx` — `ClerkProvider` wraps `{children}` inside `<body>`.
- `app/sign-in/[[...sign-in]]/page.tsx` — **created** by `clerk init`.
- `app/sign-up/[[...sign-up]]/page.tsx` — **created** by `clerk init`.
- `components/site/AuthControls.tsx` — **created**; the Clerk header controls.
- `components/site/SiteHeader.tsx` — hardcoded account `Avatar` replaced with `<AuthControls />`.
- `.env.example` — **created**; canonical env list.
- `.gitignore` — `!.env.example` exception added.
- `components/site/Avatar.tsx` — left in place, now unreferenced by the header.

## Requirements

1. Clerk is initialised through the CLI, linked to `app_3K5lrU9RohdZ8teBe0Qw62pR8XR`.
2. `ClerkProvider` sits inside `<body>`, not wrapping `<html>`.
3. `proxy.ts` uses `clerkMiddleware()` and its matcher contains `"/__clerk/:path*"` exactly once,
   after the API / TRPC matcher.
4. The header shows sign-in and sign-up actions when signed out, and a user button when signed in.
5. Auth controls use `@clerk/nextjs` only. No `@clerk/clerk-react`.
6. `CLERK_SECRET_KEY` never reaches client code. Only the publishable key is client-visible.
7. The home page layout and design stay exactly as the reference shows, apart from the account
   slot.
8. The build, type check, and lint all pass.

## Security considerations

- `CLERK_SECRET_KEY` stays in `.env.local` only, which is gitignored. It is used by
  `clerkMiddleware()` and any future server-side `auth()` call, never imported into a `"use client"`
  file.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is the only key that reaches the browser, by design.
- Proxy is not treated as authorisation. When a private surface arrives, `auth.protect()` goes in
  the Route Handler / Server Action itself, not only in the matcher, per the Next.js proxy
  execution-order warning.
- Browsing stays public. No matcher restriction and no `publicRoutes` list, so no content is
  accidentally hidden.
- Env values were never read, printed, or copied into a committed file.

## Acceptance criteria

- `clerk doctor` reports the app reachable and the keys present, with no errors.
- `npm run build` succeeds; `/`, `/sign-in/...`, and `/sign-up/...` are emitted, and Proxy is
  registered.
- `npx tsc --noEmit` and `npm run lint` are clean.
- Signed out, the header shows "Sign in" and "Sign up" and no avatar.
- Signed in, the header shows the Clerk user button and no sign-in or sign-up actions.

## Checks run

- `clerk --version` → `3.4.0`
- `clerk auth login` → signed in, no listing or `clerk init` run beforehand
- `clerk init --app app_3K5lrU9RohdZ8teBe0Qw62pR8XR` → detected Next.js app-router, installed
  `@clerk/nextjs`, scaffolded `proxy.ts` and the two auth routes
- `clerk doctor` → all green except a note that a production instance is not configured yet
- `npx tsc --noEmit` → clean
- `npm run lint` → clean
- `npm run build` → succeeded after the `<Show>` fix

## Manual test steps

1. Run `npm run dev` and open <http://localhost:3000>.
2. In the header, confirm "Sign in" and "Sign up" are visible and the avatar is not.
3. Click "Sign up", create an account, and confirm a profile avatar appears in the header.
4. Click "Sign up" again and confirm the signed-out actions are gone.
5. Open <http://localhost:3000/sign-in> and <http://localhost:3000/sign-up> directly; both render.
6. Sign out from the user button and confirm the signed-out actions return.

## Deliberately out of scope

- Protecting any route. Nothing is gated yet.
- Progress, My Learning, or any other Clerk-dependent feature.
- Clerk organisations, webhooks, or billing.
- PostHog, Sanity, and the search agent.
- Styling the Clerk `<SignIn />` / `<SignUp />` pages to match the Lernio design system. The
  scaffolded default styling is left in place; theming them is a separate piece of UI work.
