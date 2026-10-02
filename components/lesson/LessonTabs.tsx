"use client";

import type { ReactNode } from "react";
import { useState } from "react";

const TABS = [
  { id: "content", label: "Lesson Content" },
  { id: "notes", label: "Notes" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type LessonTabsProps = {
  content: ReactNode;
  notes: ReactNode;
};

/**
 * Both panels arrive as already-rendered server nodes, so the Portable Text and
 * the resource grid never enter the client bundle and this component holds only
 * the selected tab. The Notes tab is presentational per AGENTS.md §7; it shows
 * the lesson's stored notes and writes nothing.
 */
export function LessonTabs({ content, notes }: LessonTabsProps) {
  const [active, setActive] = useState<TabId>("content");

  return (
    <div className="mt-10">
      <div role="tablist" aria-label="Lesson details" className="flex gap-8 border-b border-neutral-200">
        {TABS.map((tab) => {
          const isActive = tab.id === active;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`lesson-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`lesson-panel-${tab.id}`}
              onClick={() => setActive(tab.id)}
              className={`-mb-px border-b-2 pb-3 text-body transition-colors ${
                isActive
                  ? "border-primary-500 font-medium text-primary-500"
                  : "border-transparent text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`lesson-panel-${active}`}
        aria-labelledby={`lesson-tab-${active}`}
        tabIndex={0}
        className="pt-8 focus-visible:outline-none"
      >
        {active === "content" ? content : notes}
      </div>
    </div>
  );
}