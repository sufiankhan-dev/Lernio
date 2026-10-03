"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { LinkButton } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatDuration } from "@/lib/format";

export type LessonSidebarModule = {
  key: string;
  title: string | null;
  minutes: number;
  lessons: {
    key: string;
    slug: string | null;
    title: string | null;
    minutes: number;
    isCurrent: boolean;
  }[];
};

export type LessonSidebarProps = {
  courseSlug: string | null;
  courseTitle: string | null;
  progressPercent: number;
  moduleCount: number;
  /** 1-based index of the module holding the current lesson. 0 when unknown. */
  currentModuleNumber: number;
  modules: LessonSidebarModule[];
};

/**
 * The rail down the left of the curriculum. Colour encodes position, not
 * completion: it runs orange from the current module down to the current lesson
 * and grey everywhere else. There is no progress source in the repo yet, so
 * nothing here claims a lesson was finished.
 */
function Rail({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute top-0 bottom-0 left-1/2 w-0 -translate-x-1/2 border-l-2 ${className}`}
    />
  );
}

function initials(title: string | null) {
  return (title ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function LessonSidebar({
  courseSlug,
  courseTitle,
  progressPercent,
  moduleCount,
  currentModuleNumber,
  modules,
}: LessonSidebarProps) {
  const currentModuleKey = modules[currentModuleNumber - 1]?.key ?? "";
  const [openModules, setOpenModules] = useState<string[]>(
    currentModuleKey ? [currentModuleKey] : [],
  );
  const [curriculumOpen, setCurriculumOpen] = useState(true);

  function toggleModule(key: string) {
    setOpenModules((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  return (
    <aside aria-label="Course curriculum" className="min-w-0 lg:border-r lg:border-neutral-200 lg:pr-2">
      {courseSlug ? (
        <LinkButton
          variant="text"
          href={`/courses/${courseSlug}`}
          icon="arrow-left"
          iconPosition="leading"
          iconSize={16}
          className="h-auto text-small"
        >
          Back to course
        </LinkButton>
      ) : null}

      <div className="mt-8 flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-md bg-neutral-900 font-display text-heading-2 font-bold text-white"
        >
          {initials(courseTitle)}
        </span>
        {courseTitle ? (
          <p className="text-body font-medium text-neutral-900">{courseTitle}</p>
        ) : null}
      </div>

      <div className="mt-5">
        <p className="text-small text-neutral-500">{progressPercent}% complete</p>
        <ProgressBar value={progressPercent} showLabel={false} className="mt-2" />
      </div>

      {modules.length > 0 ? (
        <div className="mt-8 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
          <h2>
            <button
              type="button"
              onClick={() => setCurriculumOpen((value) => !value)}
              aria-expanded={curriculumOpen}
              aria-controls="lesson-curriculum"
              className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-neutral-50"
            >
              <span className="min-w-0 flex-1 text-body font-medium text-neutral-900">
                Module {currentModuleNumber || 1} of {moduleCount}
              </span>
              <Icon
                name="chevron-down"
                size={20}
                className={`shrink-0 text-neutral-600 transition-transform ${
                  curriculumOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </h2>

          {curriculumOpen ? (
            <div id="lesson-curriculum" className="border-t border-neutral-200">
              {modules.map((module, index) => {
                const isOpen = openModules.includes(module.key);
                const panelId = `lesson-module-${module.key}`;
                const isCurrentModule = index + 1 === currentModuleNumber;
                const currentLessonIndex = module.lessons.findIndex((lesson) => lesson.isCurrent);
                // Only rows before the current module get the trailing tick. It is
                // a positional marker, so the icon stays aria-hidden rather than
                // announcing a completion this page cannot know about.
                const isBeforeCurrent = currentModuleNumber > 0 && index + 1 < currentModuleNumber;

                return (
                  <div key={module.key} className="border-b border-neutral-200 last:border-b-0">
                    <h3>
                      <button
                        type="button"
                        onClick={() => toggleModule(module.key)}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        className="flex w-full items-center gap-3 px-6 py-4 text-left transition-colors hover:bg-neutral-50"
                      >
                        <span className="relative flex w-9 shrink-0 justify-center">
                          <Rail className={isCurrentModule ? "border-primary-500" : "border-neutral-200"} />
                          <span
                            aria-hidden="true"
                            className="relative z-10 flex size-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-body text-neutral-700"
                          >
                            {index + 1}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-body font-medium text-neutral-900">
                            {module.title}
                          </span>
                          <span className="mt-0.5 block text-small text-neutral-500">
                            {formatDuration(module.minutes)}
                          </span>
                        </span>
                        {isBeforeCurrent ? (
                          <Icon name="check-circle" size={20} className="shrink-0 text-primary-500" />
                        ) : (
                          <Icon
                            name="chevron-down"
                            size={20}
                            className={`shrink-0 text-neutral-600 transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </button>
                    </h3>

                    {isOpen ? (
                      <ul id={panelId}>
                        {module.lessons.map((lesson, lessonIndex) => (
                          <li key={lesson.key} className="px-6">
                            <Link
                              href={lesson.slug ? `/lessons/${lesson.slug}` : "#"}
                              aria-current={lesson.isCurrent ? "page" : undefined}
                              className="flex items-center gap-3 py-3 transition-colors hover:text-primary-500"
                            >
                              <span className="relative flex w-9 shrink-0 justify-center">
                                <Rail
                                  className={
                                    isCurrentModule && lessonIndex <= currentLessonIndex
                                      ? "border-primary-500"
                                      : "border-neutral-200"
                                  }
                                />
                                <span
                                  aria-hidden="true"
                                  className={`relative z-10 bg-white ${
                                    lesson.isCurrent
                                      ? "size-2 rounded-full bg-primary-500"
                                      : "size-2.5 rounded-full border border-neutral-300"
                                  }`}
                                />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-body text-neutral-900">
                                  {lesson.title}
                                </span>
                                <span className="mt-0.5 flex items-center gap-2 text-small text-neutral-500">
                                  {formatDuration(lesson.minutes)}
                                  {lesson.isCurrent ? (
                                    <span className="font-medium text-primary-500">Now playing</span>
                                  ) : null}
                                </span>
                              </span>
                              {lesson.isCurrent ? (
                                <span
                                  aria-hidden="true"
                                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white"
                                >
                                  <Icon name="play-square" size={16} variant="filled" />
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}