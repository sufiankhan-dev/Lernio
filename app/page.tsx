import type { Metadata } from "next";
import Link from "next/link";
import { CatalogCard } from "@/components/course/CatalogCard";
import { GradientBars } from "@/components/site/GradientBars";
import { HomeHero } from "@/components/site/HomeHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import { WeeklyNote } from "@/components/site/WeeklyNote";
import { Icon } from "@/components/ui/Icon";
import { courses } from "@/lib/home-content";

export const metadata: Metadata = {
  title: "Lernio — Search your learning in plain English",
  description:
    "Lernio understands what you want to learn and finds the exact lessons across all your courses.",
};

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col rounded-t-[24px] bg-canvas">
      <SiteHeader />
      <HomeHero />
      <section aria-labelledby="all-courses" className="px-6 pt-14 pb-8 sm:px-8 lg:px-14">
        <div className="flex items-end justify-between gap-6">
          <h2 id="all-courses" className="font-display text-heading-1 font-bold text-neutral-900">
            All Courses
          </h2>
          <Link
            href="/courses"
            className="inline-flex shrink-0 items-center gap-2 text-body-large font-medium text-primary-500 transition-colors hover:text-primary-600"
          >
            View all courses
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CatalogCard key={course.slug} {...course} />
          ))}
        </div>
      </section>
      <WeeklyNote />
      <GradientBars />
    </div>
  );
}
