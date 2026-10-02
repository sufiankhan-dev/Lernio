import { CatalogCard } from "@/components/course/CatalogCard";
import type { CatalogCourse } from "@/sanity/lib/data";
import { urlFor } from "@/sanity/lib/image";

type CatalogGridProps = {
  courses: CatalogCourse[];
};

/**
 * Renders catalog cards for courses that have a slug. A course without one is
 * not routable, so it is skipped rather than linked to a dead `/courses/undefined`.
 */
export function CatalogGrid({ courses }: CatalogGridProps) {
  const routable = courses.filter((course) => course.slug);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {routable.map((course) => {
        const coverImage = course.coverImage;

        return (
          <CatalogCard
            key={course._id}
            slug={course.slug!}
            title={course.title ?? "Untitled course"}
            summary={course.summary}
            level={course.level}
            totalMinutes={course.totalDuration}
            moduleCount={course.moduleCount ?? 0}
            coverImageUrl={
              coverImage
                ? urlFor(coverImage).width(256).height(256).fit("crop").auto("format").url()
                : null
            }
            coverImageAlt={coverImage?.alt ?? null}
          />
        );
      })}
    </div>
  );
}