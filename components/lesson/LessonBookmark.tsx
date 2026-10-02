"use client";

import { Icon } from "@/components/ui/Icon";
import { useState } from "react";

/**
 * Local pressed state only, matching the existing `CourseActions` bookmark.
 * Nothing is fetched, stored or written; persisting a bookmark belongs to a
 * future feature that must go through a server route.
 */
export function LessonBookmark() {
  const [saved, setSaved] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setSaved((value) => !value)}
      aria-pressed={saved}
      aria-label={saved ? "Remove bookmark" : "Bookmark this lesson"}
      className="flex size-14 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-primary-500 transition-colors hover:border-primary-200 hover:bg-primary-100"
    >
      <Icon name="bookmark" size={24} variant={saved ? "filled" : "outline"} />
    </button>
  );
}