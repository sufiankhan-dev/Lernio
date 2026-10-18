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