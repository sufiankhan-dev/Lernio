"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatDuration } from "@/lib/format";

export type CourseModule = {
  key: string;
  title: string | null;
  summary: string | null;
  minutes: number;
  lessons: {
    key: string;
    slug: string | null;
    title: string | null;
    minutes: number;
    isFreePreview: boolean;
  }[];
};

/** The reference shows the first 6 modules and a control to reveal the rest. */
const COLLAPSED_MODULE_COUNT = 6;

type CourseContentProps = {
  moduleCount: number;
  totalMinutes: number;
  modules: CourseModule[];
};

export function CourseContent({ moduleCount, totalMinutes, modules }: CourseContentProps) {
  const [openModules, setOpenModules] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  if (modules.length === 0) return null;

  const collapsible = moduleCount > COLLAPSED_MODULE_COUNT;
  const visibleModules = collapsible && !showAll ? modules.slice(0, COLLAPSED_MODULE_COUNT) : modules;

  function toggleModule(key: string) {
    setOpenModules((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  return (
    <section aria-labelledby="course-content" className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="course-content" className="font-display text-heading-1 font-bold text-neutral-900">
          Course Content
        </h2>
        <p className="flex items-center gap-2 text-body text-neutral-500">
          <span>{moduleCount} modules</span>
          <span aria-hidden="true">&#8226;</span>
          <span>{formatDuration(totalMinutes)}</span>
        </p>
      </div>

      <div className="mt-6 divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
        {visibleModules.map((module, index) => {
          const isOpen = openModules.includes(module.key);
          const panelId = `module-panel-${module.key}`;

          return (
            <div key={module.key}>
              <h3>
                <button
                  type="button"
                  onClick={() => toggleModule(module.key)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="flex w-full items-center gap-5 px-6 py-4 text-left transition-colors hover:bg-neutral-50"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-body text-neutral-700"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-heading-3 font-bold text-neutral-900">
                      {module.title}
                    </span>
                    {module.summary ? (
                      <span className="mt-0.5 block text-small text-neutral-500">
                        {module.summary}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-body whitespace-nowrap text-neutral-600">
                    {formatDuration(module.minutes)}
                  </span>
                  <Icon
                    name="chevron-down"
                    size={20}
                    className={`shrink-0 text-neutral-600 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </h3>

              {isOpen ? (
                <ul id={panelId} className="border-t border-neutral-200 bg-neutral-50 px-6 py-2">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <li key={lesson.key} className="border-b border-neutral-200 last:border-b-0">
                      <Link
                        href={lesson.slug ? `/lessons/${lesson.slug}` : "#"}
                        className="flex items-center gap-4 py-3 transition-colors hover:text-primary-500"
                      >
                        <span className="shrink-0 text-small text-neutral-500">
                          Lesson {index + 1}.{lessonIndex + 1}
                        </span>
                        <span className="min-w-0 flex-1 text-body font-medium text-neutral-900">
                          {lesson.title}
                        </span>
                        {lesson.isFreePreview ? (
                          <span className="shrink-0 rounded-xs border border-primary-200 bg-primary-100 px-2 py-0.5 text-small font-medium text-primary-500 uppercase">
                            Free preview
                          </span>
                        ) : null}
                        <span className="shrink-0 text-small whitespace-nowrap text-neutral-500">
                          {formatDuration(lesson.minutes)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>

      {collapsible ? (
        <div className="mt-6 flex justify-center">
          <Button
            variant="tertiary"
            icon="chevron-down"
            aria-expanded={showAll}
            onClick={() => setShowAll((value) => !value)}
            className="h-11 px-5"
          >
            {showAll ? "Show fewer modules" : `Show all ${moduleCount} modules`}
          </Button>
        </div>
      ) : null}
    </section>
  );
}