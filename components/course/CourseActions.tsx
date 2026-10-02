"use client";

import { useState } from "react";
import { Button, LinkButton } from "@/components/ui/Button";

type CourseActionsProps = {
  /** Slug of the lesson the primary CTA opens. Null when the course has no lessons. */
  firstLessonSlug: string | null;
  /** True when a resume position is known. False until progress tracking exists. */
  hasProgress: boolean;
};

export function CourseActions({ firstLessonSlug, hasProgress }: CourseActionsProps) {
  const [bookmarked, setBookmarked] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-4">
      {firstLessonSlug ? (
        <LinkButton
          href={`/lessons/${firstLessonSlug}`}
          icon="arrow-right"
          iconSize={20}
          className="h-14 px-6 text-body-large"
        >
          {hasProgress ? "Continue Learning" : "Start Learning"}
        </LinkButton>
      ) : null}
      <Button
        variant="tertiary"
        icon="bookmark"
        iconPosition="leading"
        aria-pressed={bookmarked}
        onClick={() => setBookmarked((value) => !value)}
        className={`h-14 px-6 text-body-large ${
          bookmarked ? "border-primary-500 text-primary-500" : ""
        }`}
      >
        Bookmark
      </Button>
    </div>
  );
}