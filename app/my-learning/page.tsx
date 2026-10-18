import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { CatalogGrid } from "@/components/course/CatalogGrid";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Icon } from "@/components/ui/Icon";
import { LinkButton } from "@/components/ui/Button";
import { navLinks } from "@/lib/home-content";
import { getCatalogCourses } from "@/sanity/lib/data";

export const metadata: Metadata = {
  title: "My Learning — Lernio",
  description:
    "Everything you are learning on Lernio in one place, with your progress and the courses you have started.",
};

export default async function MyLearningPage() {
  // Second gate. proxy.ts already protects this route, but the Next.js proxy
  // docs warn that narrowing the matcher can silently drop coverage, so the page
  // refuses to render signed out on its own too.
  await auth.protect();

  const courses = await getCatalogCourses();
  const suggestions = courses.filter((course) => course.slug).slice(0, 3);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col rounded-t-[24px] bg-canvas">
      <SiteHeader
        links={navLinks.map((link) => ({ ...link, active: link.href === "/my-learning" }))}
      />

      <main className="flex-1 px-6 pt-10 pb-14 sm:px-8 lg:px-14">
        <div className="w-full">
          <h1 className="font-display text-heading-1 font-bold text-neutral-900">My Learning</h1>
          <p className="mt-2 text-body-large text-neutral-600">
            Your courses, your progress, all in one place.
          </p>

          {/* No progress document type and no read helper exist yet, so this is a
              real empty state rather than an invented one. The course and lesson
              pages make the same call: they render 0 and say so in a comment
              instead of fabricating a percentage. When progress lands, this panel
              is replaced by the learner's actual courses and resume positions. */}
          <section
            aria-labelledby="my-learning-empty"
            className="mt-8 rounded-lg border border-neutral-200 bg-white p-10 text-center shadow-sm"
          >
            <span
              aria-hidden="true"
              className="mx-auto flex size-14 items-center justify-center rounded-lg bg-primary-100 text-primary-600"
            >
              <Icon name="bookmark" size={26} />
            </span>
            <h2 id="my-learning-empty" className="mt-6 font-display text-heading-2 font-bold text-neutral-900">
              Nothing started yet
            </h2>
            <p className="mx-auto mt-3 max-w-[440px] text-body-large leading-6 text-neutral-600">
              Once you begin a lesson, it shows up here with your progress and a place to pick up where
              you left off.
            </p>
            <LinkButton href="/courses" icon="arrow-right" iconPosition="trailing" className="mt-8">
              Browse courses
            </LinkButton>
          </section>

          <section aria-labelledby="continue-exploring" className="mt-14">
            <h2
              id="continue-exploring"
              className="font-display text-heading-1 font-bold text-neutral-900"
            >
              Continue exploring
            </h2>
            <p className="mt-2 text-body-large text-neutral-600">
              Real courses from the catalog, ready when you are.
            </p>
            <div className="mt-8">
              {suggestions.length > 0 ? (
                <CatalogGrid courses={suggestions} />
              ) : (
                <p className="text-body-large text-neutral-600">
                  No courses yet. Publish a course in the Studio to see it here.
                </p>
              )}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}