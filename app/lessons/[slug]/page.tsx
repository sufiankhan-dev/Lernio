import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { PortableTextBlock } from "@portabletext/react";
import { LessonContent } from "@/components/lesson/LessonContent";
import { LessonHeader } from "@/components/lesson/LessonHeader";
import { LessonNavigation, type LessonNeighbour } from "@/components/lesson/LessonNavigation";
import { LessonNotes } from "@/components/lesson/LessonNotes";
import { LessonSidebar, type LessonSidebarModule } from "@/components/lesson/LessonSidebar";
import { LessonTabs } from "@/components/lesson/LessonTabs";
import { VideoPlayer } from "@/components/lesson/VideoPlayer";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Breadcrumbs } from "@/components/ui/Nav";
import { navLinks } from "@/lib/home-content";
import { normalizeStartSeconds } from "@/lib/video";
import { getLessonBySlug } from "@/sanity/lib/data";

export async function generateMetadata(
  props: PageProps<"/lessons/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const lesson = await getLessonBySlug(slug);

  if (!lesson) return { title: "Lesson not found — Lernio" };

  return {
    title: lesson.title ? `${lesson.title} — Lernio` : "Lernio",
    description: lesson.summary ?? undefined,
  };
}

export default async function LessonPage(props: PageProps<"/lessons/[slug]">) {
  const [{ slug }, { start }] = await Promise.all([props.params, props.searchParams]);
  const lesson = await getLessonBySlug(slug);

  if (!lesson?.slug) notFound();

  const title = lesson.title ?? "Untitled lesson";
  const course = lesson.course ?? null;
  const courseSlug = course?.slug ?? null;
  const courseTitle = course?.title ?? null;

  // No progress document type or read helper exists yet, so there is no real
  // completion to show. The bar renders 0 rather than a fabricated percentage,
  // matching the decision taken for the course page.
  const progressPercent = 0;

  const modules: LessonSidebarModule[] = (course?.modules ?? []).map((module, index) => {
    const lessons = module.lessons ?? [];

    return {
      key: module._key || `module-${index}`,
      title: module.title,
      minutes: lessons.reduce((total, item) => total + (item.duration ?? 0), 0),
      lessons: lessons.map((item, lessonIndex) => ({
        key: item._id || `${index}-${lessonIndex}`,
        slug: item.slug,
        title: item.title,
        minutes: item.duration ?? 0,
        isCurrent: item.slug === lesson.slug,
      })),
    };
  });

  // Curriculum order drives both the sidebar's "Lesson n.m" label and the
  // prev/next footer, so flatten once and read the neighbours off it.
  const flatLessons = modules.flatMap((module) => module.lessons);
  const currentIndex = flatLessons.findIndex((item) => item.isCurrent);
  const currentModuleNumber =
    currentIndex === -1 ? 0 : modules.findIndex((module) => module.lessons.some((l) => l.isCurrent)) + 1;

  const asNeighbour = (item: (typeof flatLessons)[number] | undefined): LessonNeighbour | null =>
    item ? { slug: item.slug, title: item.title, minutes: item.minutes } : null;

  const previous = asNeighbour(currentIndex > 0 ? flatLessons[currentIndex - 1] : undefined);
  const next = asNeighbour(
    currentIndex === -1 ? undefined : flatLessons[currentIndex + 1],
  );

  const currentModule = currentModuleNumber > 0 ? modules[currentModuleNumber - 1] : null;
  // "Lesson 5.1" is derived from curriculum order, so it only exists once the
  // lesson has been located in its course. A lesson nothing references gets no
  // eyebrow rather than a fabricated "Lesson 0.0".
  const lessonNumber =
    currentIndex === -1 ? 0 : (currentModule?.lessons.findIndex((l) => l.isCurrent) ?? 0) + 1;
  const lessonLabel =
    currentIndex === -1 ? null : `Lesson ${currentModuleNumber}.${lessonNumber}`;

  const startSeconds = normalizeStartSeconds(start, lesson.duration);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col rounded-t-[24px] bg-canvas">
      <SiteHeader links={navLinks.map((link) => ({ ...link, active: link.href === "/courses" }))} />

      <div className="grid flex-1 gap-8 px-6 pt-8 pb-10 sm:px-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-12 lg:px-16">
        <LessonSidebar
          courseSlug={courseSlug}
          courseTitle={courseTitle}
          progressPercent={progressPercent}
          moduleCount={modules.length}
          currentModuleNumber={currentModuleNumber}
          modules={modules}
        />

        <div className="min-w-0">
          <Breadcrumbs
            items={[
              { label: "All Courses", href: "/courses" },
              ...(courseTitle
                ? [{ label: courseTitle, href: courseSlug ? `/courses/${courseSlug}` : "#" }]
                : []),
              ...(currentModule?.title ? [{ label: currentModule.title }] : []),
              { label: title },
            ]}
          />

          <div className="mt-8">
            <LessonHeader
              lessonLabel={lessonLabel}
              title={title}
              summary={lesson.summary}
              durationMinutes={lesson.duration}
              level={course?.level}
              studentCount={lesson.studentCount ?? course?.studentCount ?? null}
            />
          </div>

          <div className="mt-8">
            <VideoPlayer title={title} videoUrl={lesson.videoUrl} startSeconds={startSeconds} />
          </div>

          <LessonTabs
            content={
              <LessonContent
                summary={lesson.summary}
                keyPoints={lesson.keyPoints}
                proTip={lesson.proTip}
                resources={(lesson.resources ?? []).map((resource, index) => ({
                  key: resource._key || `resource-${index}`,
                  type: resource.type,
                  title: resource.title,
                  description: resource.description,
                  url: resource.url,
                }))}
              />
            }
            notes={
              <LessonNotes
                title={title}
                notes={(lesson.notes as PortableTextBlock[] | null) ?? null}
              />
            }
          />
        </div>
      </div>

      <LessonNavigation previous={previous} next={next} />
    </div>
  );
}