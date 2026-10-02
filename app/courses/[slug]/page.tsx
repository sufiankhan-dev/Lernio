import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CourseContent, type CourseModule } from "@/components/course/CourseContent";
import { CourseHero } from "@/components/course/CourseHero";
import { CourseProgressBar } from "@/components/course/CourseProgressBar";
import { LearningOutcomes } from "@/components/course/LearningOutcomes";
import { GradientBars } from "@/components/site/GradientBars";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Breadcrumbs } from "@/components/ui/Nav";
import { navLinks } from "@/lib/home-content";
import { getCourseBySlug, getCourseSlugs } from "@/sanity/lib/data";
import { urlFor } from "@/sanity/lib/image";

export async function generateStaticParams() {
  const slugs = await getCourseSlugs();

  return slugs.filter((slug): slug is string => Boolean(slug)).map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/courses/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const course = await getCourseBySlug(slug);

  if (!course) return { title: "Course not found — Lernio" };

  return {
    title: course.title ? `${course.title} — Lernio` : "Lernio",
    description: course.summary ?? undefined,
  };
}

export default async function CoursePage(props: PageProps<"/courses/[slug]">) {
  const { slug } = await props.params;
  const course = await getCourseBySlug(slug);

  if (!course?.slug) notFound();

  const title = course.title ?? "Untitled course";

  const outcomes = (course.learningOutcomes ?? []).map((outcome, index) => ({
    key: outcome._key || `outcome-${index}`,
    icon: outcome.icon,
    title: outcome.title,
    description: outcome.description,
  }));

  const modules: CourseModule[] = (course.modules ?? []).map((module, index) => {
    const lessons = module.lessons ?? [];

    return {
      key: module._key || `module-${index}`,
      title: module.title,
      summary: module.summary,
      minutes: lessons.reduce((total, lesson) => total + (lesson.duration ?? 0), 0),
      lessons: lessons.map((lesson, lessonIndex) => ({
        key: lesson._id || `${index}-${lessonIndex}`,
        slug: lesson.slug,
        title: lesson.title,
        minutes: lesson.duration ?? 0,
        isFreePreview: lesson.isFreePreview ?? false,
      })),
    };
  });

  const totalMinutes = modules.reduce((total, module) => total + module.minutes, 0);
  const firstLessonSlug = modules.flatMap((module) => module.lessons).find((l) => l.slug)?.slug ?? null;

  const coverImage = course.coverImage;
  const coverImageUrl = coverImage
    ? urlFor(coverImage).width(720).height(900).fit("crop").auto("format").url()
    : null;

  // No progress document type or read helper exists yet, so there is no resume
  // position to show. The bar renders a real 0 rather than a fabricated number.
  const progressPercent = 0;
  const hasProgress = false;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col rounded-t-[24px] bg-canvas">
      <SiteHeader
        links={navLinks.map((link) => ({ ...link, active: link.href === "/courses" }))}
      />

      <main className="flex-1 px-6 pt-8 pb-10 sm:px-8 lg:px-16">
        <Breadcrumbs
          items={[
            { label: "All Courses", href: "/courses" },
            { label: title },
          ]}
        />

        <CourseHero
          title={title}
          summary={course.summary}
          level={course.level}
          isPopular={course.isPopular ?? false}
          studentCount={course.studentCount}
          moduleCount={modules.length}
          totalMinutes={totalMinutes}
          coverImageUrl={coverImageUrl}
          coverImageAlt={course.coverImage?.alt ?? null}
          firstLessonSlug={firstLessonSlug}
          hasProgress={hasProgress}
        />

        <LearningOutcomes outcomes={outcomes} />

        <CourseContent
          moduleCount={modules.length}
          totalMinutes={totalMinutes}
          modules={modules}
        />
      </main>

      <GradientBars />
      <CourseProgressBar
        value={progressPercent}
        firstLessonSlug={firstLessonSlug}
        hasProgress={hasProgress}
      />
    </div>
  );
}