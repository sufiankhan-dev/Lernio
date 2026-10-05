import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { cardShell } from "@/components/ui/Card";
import { formatDuration } from "@/lib/format";
import type { SearchLessonResult } from "@/lib/search-types";

export type SearchResultCardProps = {
  result: SearchLessonResult;
};

function initials(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/** How many key points fit the reference's left panel before it crowds. */
const KEY_POINT_LIMIT = 3;

/**
 * A lesson result. Matches the horizontal card in `design/lernio-search.png`:
 * a neutral key-points panel on the left, and course identity, title, summary and
 * the lesson link on the right.
 *
 * Every value here comes from a Sanity document via `SEARCH_HYDRATE_QUERY`. Nothing
 * on this card originates from the model, which returns ids only.
 */
export function SearchResultCard({ result }: SearchResultCardProps) {
  const {
    lessonSlug,
    title,
    summary,
    duration,
    keyPoints,
    courseTitle,
    moduleTitle,
    moduleNumber,
    lessonNumber,
  } = result;

  const points = keyPoints.slice(0, KEY_POINT_LIMIT);
  const moduleLabel =
    moduleNumber && moduleTitle ? `Module ${moduleNumber}: ${moduleTitle}` : null;

  return (
    <article className={`${cardShell} flex-row items-stretch gap-6 p-4`}>
      <div className="hidden w-[275px] shrink-0 flex-col justify-between rounded-md bg-neutral-100 p-5 sm:flex">
        <div>
          <Icon name="document" size={22} className="text-neutral-700" />
          {points.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {points.map((point, index) => (
                <li
                  key={`${lessonSlug}-${index}`}
                  className="flex gap-2 text-small text-neutral-700"
                >
                  <span aria-hidden="true" className="text-neutral-400">
                    &bull;
                  </span>
                  <span className="min-w-0">{point}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-small text-neutral-500">
              Open the lesson to see what it covers.
            </p>
          )}
        </div>
        <Icon
          name="check-circle"
          size={20}
          variant="filled"
          className="mt-4 self-end text-neutral-500"
        />
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
          <Badge variant="lesson">Lesson</Badge>
        </div>

        <h2 className="mt-4 text-heading-3 font-medium text-neutral-900">{title}</h2>

        {summary ? (
          <p className="mt-2 line-clamp-2 text-body text-neutral-500">{summary}</p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-4 pt-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-small text-neutral-500">
            {moduleLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="folder" size={14} className="shrink-0" />
                <span className="truncate">{moduleLabel}</span>
              </span>
            ) : null}
            {lessonNumber ? (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="document" size={14} className="shrink-0" />
                <span>Lesson {moduleNumber ? `${moduleNumber}.${lessonNumber}` : lessonNumber}</span>
              </span>
            ) : null}
            {duration ? (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="clock" size={14} className="shrink-0" />
                <span>{formatDuration(duration)}</span>
              </span>
            ) : null}
          </div>

          <LinkButton
            variant="text"
            icon="external-link"
            className="shrink-0 text-small"
            href={`/lessons/${lessonSlug}`}
          >
            View lesson
          </LinkButton>
        </div>
      </div>
    </article>
  );
}