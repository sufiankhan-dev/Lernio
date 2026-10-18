import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { cardShell } from "@/components/ui/Card";
import { formatTimestamp } from "@/lib/format";
import type { SearchVideoResult } from "@/lib/search-types";

export type SearchVideoResultCardProps = {
  result: SearchVideoResult;
};

function initials(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * A video result: a lesson's video matched at one moment inside it.
 *
 * Matches the horizontal `VIDEO` card in `design/lernio-search.png`: a dark thumbnail
 * panel with a play overlay and the matched second bottom-right, then course identity,
 * title, summary and a "Watch from" action on the right.
 *
 * The action links to the lesson page with `?start=`, which is the same parameter the
 * lesson page already reads and normalises, so the embedded provider player opens on
 * this second and the learner never leaves the site.
 *
 * Every value here comes from a Sanity document. `startSeconds` in particular is not
 * whatever the agent reported: hydration confirmed it against the video document's own
 * chapter and transcript boundaries and dropped it otherwise.
 */
export function SearchVideoResultCard({ result }: SearchVideoResultCardProps) {
  const {
    lessonSlug,
    title,
    summary,
    posterUrl,
    posterAlt,
    courseTitle,
    moduleTitle,
    moduleNumber,
    lessonNumber,
    startSeconds,
  } = result;

  const timestamp = formatTimestamp(startSeconds);
  const lessonLabel =
    moduleNumber && lessonNumber
      ? `Lesson ${moduleNumber}.${lessonNumber}`
      : lessonNumber
        ? `Lesson ${lessonNumber}`
        : null;

  return (
    <article className={`${cardShell} flex-row items-stretch gap-6 p-4`}>
      <div className="relative hidden w-[275px] shrink-0 overflow-hidden rounded-md bg-neutral-900 sm:block">
        <div className="relative aspect-video w-full">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={posterAlt ?? ""}
              fill
              sizes="275px"
              className="object-cover"
            />
          ) : null}

          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center text-white/90"
          >
            <Icon name="play-circle" size={44} />
          </span>

          <span className="absolute right-2 bottom-2 rounded-xs bg-black/70 px-2 py-0.5 text-small font-medium text-white">
            {timestamp}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-body font-semibold text-white"
          >
            {initials(courseTitle)}
          </span>
          <p className="min-w-0 flex-1 truncate text-body text-neutral-600">
            {courseTitle}
          </p>
          <Badge variant="video">Video</Badge>
        </div>

        <h2 className="mt-4 text-heading-3 font-medium text-neutral-900">{title}</h2>

        {summary ? (
          <p className="mt-2 line-clamp-2 text-body text-neutral-500">{summary}</p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-4 pt-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-small text-neutral-500">
            {lessonLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="document" size={14} className="shrink-0" />
                <span className="truncate">{lessonLabel}</span>
              </span>
            ) : null}
            {moduleTitle ? (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="folder" size={14} className="shrink-0" />
                <span className="truncate">{moduleTitle}</span>
              </span>
            ) : null}
          </div>

          <LinkButton
            variant="text"
            icon="chevron-right"
            className="shrink-0 text-small"
            href={`/lessons/${lessonSlug}?start=${startSeconds}`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Icon name="play-circle" size={14} className="shrink-0" />
              Watch from {timestamp}
            </span>
          </LinkButton>
        </div>
      </div>
    </article>
  );
}