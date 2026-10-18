# Protect My Learning, Match Page Width, Remove Star Icons

## Goal

Three changes:

1. **Make authentication actually protect something.** Clerk is installed, the header shows
   sign-in / sign-up and a `UserButton`, and `clerkMiddleware()` runs — but nothing is gated, so every
   route renders for a signed-out visitor. This gates the one route that is genuinely per-user.
2. **Make `/my-learning` the same width as `/courses`.** It is currently constrained to a 960px
   column inside a 1440px shell, so it reads narrower than every other content page.
3. **Remove the star icon** in two places: the "New courses and lessons added every week." note that
   sits directly above the footer, and the same line inside the footer.

## Skills read

- `AGENTS.md` — §2 (loop, prompt before code), §3 (UI work), §5 (auth is Clerk via middleware; the
  browser never writes), §7 (browsing public, gate only what a feature marks protected; My Learning
  is explicitly a presentational surface), §12 (Clerk secret key server only, protect in middleware
  not client code), §13 (checks).
- `.agents/skills/clerk-nextjs-patterns/SKILL.md` — `await auth()` is async; `<Show>` replaces the
  removed `SignedIn`/`SignedOut`/`Protect` components; server auth uses `auth()` from
  `@clerk/nextjs/server`.
- `.agents/skills/clerk-nextjs-patterns/references/middleware-strategies.md` — the public-first
  pattern: `createRouteMatcher([...])` + `clerkMiddleware(async (auth, req) => { if (isProtected(req))
  await auth.protect(); })`.
- `prompts/clerk-authentication.md` — read first. It set Clerk up and deliberately deferred gating:
  "**Proxy is not treated as authorisation.** When a private surface arrives, `auth.protect()` goes
  in the Route Handler / Server Action itself, not only in the matcher, per the Next.js proxy
  execution-order warning." This task is that deferred work, so that instruction is binding here.
- No Sanity, search-agent or UI skills apply. No schema, query or component redesign is involved.

## Code and config inspected

- `proxy.ts` — `clerkMiddleware()` with **no** handler, so nothing is gated. Its `config.matcher`
  already covers all non-static paths plus `/api` and `/__clerk/:path*`. Note the file is
  `proxy.ts`, not `middleware.ts` — Next.js 16 renamed it.
- `node_modules/@clerk/nextjs/dist/types/app-router/server/auth.d.ts` — confirms `auth()` is async
  and returns `SessionAuthWithRedirect` with `protect()`, `isAuthenticated`, `userId`,
  `sessionStatus`, `redirectToSignIn()`. The documented behaviour table: authenticated +
  authorised → returns the Auth object; authenticated but not authorised → `404`; **not
  authenticated → redirects to the sign-in page** for document requests.
- `node_modules/@clerk/nextjs/dist/types/server/index.d.ts` — `clerkMiddleware` and
  `createRouteMatcher` are both exported from `@clerk/nextjs/server`.
- `node_modules/@clerk/nextjs` is `7.9.9`, `@clerk/backend` is `3.21.1` (Clerk Core 3, so
  `isAuthenticated` exists and `<Show>` is the control component).
- `.env.local` — confirmed present by **name only**, values never read or printed:
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
  `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (`/sign-in`), `NEXT_PUBLIC_CLERK_SIGN_UP_URL` (`/sign-up`),
  `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`.
  All six are set, so gating will redirect to a working sign-in page.
- `app/my-learning/page.tsx` — the target. Currently a Server Component with **no** auth call at all.
  Width: `<main className="flex-1 px-6 pt-10 pb-14 sm:px-8 lg:px-14">` wrapping
  `<div className="mx-auto w-full max-w-[960px]">`. The 960px cap is the only thing making it
  narrower than the catalog.
- `app/courses/page.tsx` — the reference width. Identical `<main>` classes, and **no** inner
  max-width wrapper. The shell is `mx-auto flex w-full max-w-[1440px] flex-1 flex-col rounded-t-[24px]
  bg-canvas`, which My Learning already matches exactly.
- `components/site/WeeklyNote.tsx` — 14 lines. Renders two hairline rules with centred text between
  them, and an `<Icon name="star" size={22} className="shrink-0 text-primary-500" />` inside the
  `<p>`. Used only by `app/page.tsx`, positioned directly above `SiteFooter`.
- `components/site/SiteFooter.tsx` — the footer's brand column renders
  `<Icon name="star" size={16} className="shrink-0 text-primary-400" />` followed by the same
  "New courses and lessons added every week." line. `Icon` is imported for **that one use only**,
  so removing the star makes the import unused and lint will fail unless it goes too.
- `components/site/SiteHeader.tsx` — renders `<AuthControls />`, which already switches between
  signed-out (sign in / sign up) and signed-in (`<UserButton>`) via `<Show when="…">`.
- `lib/home-content.ts` — `navLinks` includes `{ label: "My Learning", href: "/my-learning" }`.
- `app/api/search/route.ts` — has **no** auth check. `runtime = "nodejs"`, `maxDuration = 120`, and it
  drives a multi-step OpenAI agent run. Public and unmetered.

## Decisions and assumptions

1. **Exactly one route is gated: `/my-learning(.*)`.** Per `AGENTS.md` §5 and §7, browsing stays
   public and only surfaces keyed to a Clerk user id are private. Right now My Learning is the only
   such surface — there is no progress document type and no per-user read helper anywhere, so nothing
   else is per-user. Gating the catalog, a course, or a lesson would break the public product.
2. **Public-first, not protected-first.** Everything not matched stays reachable. This matches the
   skill's public-first pattern and the platform's own rule that browsing is public.
3. **Two layers of protection, per the earlier prompt's binding instruction.** The matcher in
   `proxy.ts` is the first gate; `await auth.protect()` at the top of the page component is the
   second. If someone later edits the matcher and drops `/my-learning`, the page still refuses to
   render signed out. This is defence in depth against the Next.js proxy-ordering warning, not
   redundancy for its own sake.
4. **`auth.protect()` in the page, not `redirectToSignIn()` by hand.** `protect()` is the documented
   API and does the right thing for document requests. Hand-rolling a `redirect()` would duplicate
   it and lose the return-to-intended-URL behaviour.
5. **The nav link stays visible when signed out.** It is not hidden or disabled. Clicking it hits the
   protected route and Clerk redirects to `/sign-in`, carrying a return URL so the learner lands
   back on My Learning after signing in. Hiding nav items is not a security control, and a nav that
   reflows on sign-in is worse than one that redirects.
6. **`/api/search` is deliberately left public.** It is the core public UX — the home hero searches
   without an account — so gating it would break the product's main entry point. It is nonetheless
   an **unauthenticated, unmetered endpoint that spends money on every call**; that is called out
   below for your decision rather than silently fixed.
7. **`/design-system` is left public.** It is documentation, it holds nothing sensitive, and
   protecting it would add a login wall in front of internal docs with no benefit.
8. **No progress is invented.** My Learning keeps its existing honest empty state. Gating the page
   does not create progress data, and the page does not pretend a signed-in learner has done anything.
9. **The page is not personalised.** Adding a first-name greeting via `currentUser()` would show the
   auth is real, but it was not asked for and adds a Clerk backend call to a page that otherwise
   renders from Sanity. Flagged as an optional follow-up instead.
10. **Width fix is a class deletion.** Removing `max-w-[960px]` from the inner `<div>` makes My
    Learning match `/courses` exactly, since both already share the same `<main>` classes and the
    same 1440px shell. The inner wrapper div itself stays, so the empty-state panel and the
    "Continue exploring" grid keep their current structure.
11. **Only the star glyph is removed, not the text.** "New courses and lessons added every week."
    stays in both places. In `WeeklyNote` that leaves centred text between two hairline rules; in the
    footer it leaves a plain muted line under the brand copy.
12. **`Icon`'s `star` definition stays in `components/ui/Icon.tsx`.** It is a shared primitive
    library, and an icon entry being unused by a page is not dead code tied to that page. Only the
    two call sites go.

## Requirements

### 1. `proxy.ts` — gate the protected route

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Public-first. Browsing stays public (AGENTS.md §5 and §7), so only the per-user
 * surface is gated. My Learning is the only private surface that exists today:
 * there is no progress document type or per-user read helper yet, so nothing else
 * is keyed to a Clerk user id.
 *
 * This matcher is the first gate, not the only one — the page also calls
 * auth.protect(), so narrowing this list later cannot expose it.
 */
const isProtectedRoute = createRouteMatcher(["/my-learning(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
```

Keep the matcher array byte-identical to what is there now — it already covers `/my-learning`.

### 2. `app/my-learning/page.tsx` — second gate and width fix

Add the import and the protect call:

```tsx
import { auth } from "@clerk/nextjs/server";
```

At the very top of the component body, before any data fetch:

```tsx
// Second gate. proxy.ts already protects this route, but the Next.js proxy
// docs warn that narrowing the matcher can silently drop coverage, so the page
// refuses to render signed out on its own too.
await auth.protect();
```

Then fix the width. Delete `max-w-[960px]` from the inner wrapper:

- from `<div className="mx-auto w-full max-w-[960px]">`
- to `<div className="w-full">`

Nothing else about the page's content, empty state or metadata changes.

### 3. `components/site/WeeklyNote.tsx` — drop the star

Remove the `<Icon name="star" … />` element, and delete the now-unused
`import { Icon } from "@/components/ui/Icon";` line. The `<p>` becomes:

```tsx
<p className="text-center text-body-large text-neutral-600">
  New courses and lessons added every week.
</p>
```

The `flex items-center gap-3` classes go with the icon, since they only existed to lay the star out
beside the text. The two hairline `<span>`s and the wrapper's padding stay.

### 4. `components/site/SiteFooter.tsx` — drop the star

Remove the `<Icon name="star" … />` element and the now-unused
`import { Icon } from "@/components/ui/Icon";` line. The paragraph becomes:

```tsx
<p className="mt-5 text-small text-primary-300">
  New courses and lessons added every week.
</p>
```

The `flex items-center gap-2` classes go with the icon. Everything else in the footer — the logo,
the three link columns, the bottom bar — is untouched.

## Files expected to touch

Modified:
- `proxy.ts` — add `createRouteMatcher` + `auth.protect()` for `/my-learning(.*)`.
- `app/my-learning/page.tsx` — add `auth.protect()`; drop `max-w-[960px]`.
- `components/site/WeeklyNote.tsx` — remove star + `Icon` import.
- `components/site/SiteFooter.tsx` — remove star + `Icon` import.

Not touched: `app/globals.css`, `app/layout.tsx`, `components/site/SiteHeader.tsx`,
`components/site/AuthControls.tsx`, `components/site/NotificationsMenu.tsx`, `components/ui/*`,
`lib/*`, `sanity/*`, `studio/*`, `app/api/search/route.ts`, `.env*`, `package.json`.

## Security considerations

- **This task strictly narrows access.** Nothing becomes less protected.
- **`CLERK_SECRET_KEY` stays server only.** It is read by `clerkMiddleware()` and `auth()` in
  Server Component / proxy context only. It is never imported into a `"use client"` file, and no
  client component is added or modified. The browser keeps seeing only
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, which is public by design.
- **No env value is read, printed, or copied into a committed file.** Only variable *names* were
  inspected. `.env.local` stays gitignored and `.env.example` needs no change, because no new
  variable is introduced.
- **The page refuses to render signed out even if the matcher is later narrowed.** That is the point
  of the second `auth.protect()`: a future edit to `proxy.ts` cannot silently expose the page.
- **Unauthorised document requests redirect rather than leak.** `auth.protect()` sends a
  signed-out visitor to `/sign-in`; it does not render a partial page first, so no per-user markup
  is ever streamed to an anonymous browser.
- **No write path is added.** No server action, no route handler, no progress mutation. The "browser
  never writes" rule from `AGENTS.md` §5 is untouched.
- **Gating is authentication, not authorization.** This checks that a user is signed in. It does not
  claim the user may read *any particular* progress record — there is no progress data, and when it
  arrives every read must additionally scope by `userId`.
- **Known and deliberately accepted:** `/api/search` remains a public, unauthenticated, unmetered
  endpoint that drives a multi-step OpenAI agent run on every call. Gating it would break the public
  home-page search. The exposure is real and is reported below rather than fixed unilaterally.

## Acceptance criteria

1. Signed out, `/my-learning` does not render — it redirects to `/sign-in`.
2. Signed out, `/`, `/courses`, `/courses/[slug]`, `/lessons/[slug]`, `/search` and `/design-system`
   all still render 200 with no login wall.
3. Signed in, `/my-learning` renders normally.
4. After signing in from the redirect, the learner lands back on `/my-learning` rather than the home
   page. If Clerk's return URL does not carry through, this is reported, not silently accepted.
5. `/my-learning` and `/courses` use identical `<main>` classes and neither has an inner max-width.
6. At 1440px, the My Learning content grid spans the same width as the catalog grid.
7. No `name="star"` icon remains in `app/` or `components/`.
8. `Icon.tsx` still exports the `star` definition, and still typechecks.
9. Both star call sites keep their surrounding text and spacing intact.
10. `npm run typecheck` and `npm run lint` pass with **no unused-import warning** — this is the
    specific failure mode of removing the two icons.
11. `npm run build` succeeds and `/my-learning` is emitted as a dynamic route (it now reads cookies
    through `auth()`, so it must no longer be prerendered as static).
12. No new dependency. `package.json` is unchanged.

## Checks to run

From `C:\Users\DELL\Desktop\lernio`:

```
npm run typecheck
npm run lint
npm run build
```

Then verify the gate against the running dev server. **Port 3000 on this machine is a different app
(ScopeSentry); Lernio's dev server is on port 3001.** Confirm the port before asserting anything.

Anonymous check, using `curl`/PowerShell with **no cookies**:

```
Invoke-WebRequest -Uri "http://localhost:3001/my-learning" -UseBasicParsing -MaximumRedirection 0
```

Expect a redirect (307/302 to `/sign-in`), not a 200. Compare with `/courses`, which must stay 200.

## Manual test steps

1. `npm run dev`, open `http://localhost:3001`, and stay **signed out**.
2. Click **My Learning** in the nav — confirm you are sent to the sign-in page, and that the My
   Learning page itself never flashes or renders.
3. Sign in. Confirm you return to `/my-learning` and the page renders.
4. Sign out via the `UserButton`, then reload `/my-learning` directly — confirm the redirect again.
5. Visit `/`, `/courses`, open a course, open a lesson, and run a search — confirm **none** of them
   ask you to sign in.
6. On `/my-learning` at 1440px, confirm the "Continue exploring" course grid is now as wide as the
   catalog grid on `/courses`.
7. On the home page, scroll to the bottom — the "New courses and lessons added every week." line
   should be centred between the two hairlines with **no** star.
8. Scroll into the footer — the same line under the brand copy should have **no** star either.
9. `/design-system` — confirm the layout is unchanged.
10. Open the DevTools console on each page and confirm zero errors and zero hydration warnings.

## Deliberately out of scope

- **Rate limiting, auth or metering on `/api/search`.** Flagged for your call, not changed here.
- **Progress, resume positions and completion.** No schema exists; My Learning keeps its honest
  empty state. When progress lands, every read must scope by `userId` and every write must go through
  a server route with a write token.
- **Personalising My Learning** with the signed-in user's name via `currentUser()`.
- **Theming the Clerk `/sign-in` and `/sign-up` pages** to match the Lernio design system. Still
  default Clerk styling, as noted in the original auth prompt.
- **Gating `/design-system`.**
- **Clerk organisations, roles, billing, webhooks, or session tasks.** This is single-tenant
  authentication with no roles.