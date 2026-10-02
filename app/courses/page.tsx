import type { Metadata } from "next";
import { CatalogGrid } from "@/components/course/CatalogGrid";
import { GradientBars } from "@/components/site/GradientBars";
import { SiteHeader } from "@/components/site/SiteHeader";
import { navLinks } from "@/lib/home-content";
import { getCatalogCourses } from "@/sanity/lib/data";

export const metadata: Metadata = {
  title: "All Courses — Lernio",
  description: "Browse every Lernio course across web development, AI, data and DevOps.",
};

export default async function CoursesPage() {
  const courses = await getCatalogCourses();
  const count = courses.filter((course) => course.slug).length;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col rounded-t-[24px] bg-canvas">
      <SiteHeader links={navLinks.map((link) => ({ ...link, active: link.href === "/courses" }))} />

      <main className="flex-1 px-6 pt-10 pb-14 sm:px-8 lg:px-14">
        <h1 className="font-display text-heading-1 font-bold text-neutral-900">All Courses</h1>
        <p className="mt-2 text-body-large text-neutral-600">
          {count} {count === 1 ? "course" : "courses"}
        </p>

        {count > 0 ? (
          <div className="mt-8">
            <CatalogGrid courses={courses} />
          </div>
        ) : (
          <p className="mt-8 text-body-large text-neutral-600">
            No courses yet. Publish a course in the Studio to see it here.
          </p>
        )}
      </main>

      <GradientBars />
    </div>
  );
}