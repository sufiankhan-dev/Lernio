import { LinkButton } from "@/components/ui/Button";
import { formatDuration } from "@/lib/format";

export type LessonNeighbour = {
  slug: string | null;
  title: string | null;
  minutes: number;
};

type LessonNavigationProps = {
  previous: LessonNeighbour | null;
  next: LessonNeighbour | null;
};

function Neighbour({ lesson }: { lesson: LessonNeighbour }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-body font-medium text-neutral-900">{lesson.title}</span>
      <span className="mt-1 block text-small text-neutral-500">
        {formatDuration(lesson.minutes)}
      </span>
    </span>
  );
}

export function LessonNavigation({ previous, next }: LessonNavigationProps) {
  if (!previous && !next) return null;

  return (
    <nav
      aria-label="Lesson navigation"
      className="flex flex-col gap-6 border-t border-neutral-200 px-6 py-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-6 sm:px-8 lg:px-16"
    >
      {previous ? (
        <div className="flex min-w-0 items-center gap-4 sm:gap-8">
          <LinkButton
            variant="tertiary"
            href={previous.slug ? `/lessons/${previous.slug}` : "#"}
            icon="arrow-left"
            iconPosition="leading"
            className="h-12 shrink-0 px-5"
          >
            Previous Lesson
          </LinkButton>
          <Neighbour lesson={previous} />
        </div>
      ) : null}

      <div className="flex min-w-0 items-center justify-between gap-4 sm:ml-auto sm:justify-end sm:gap-8">
        {next ? <Neighbour lesson={next} /> : null}
        {next ? (
          <LinkButton
            variant="primary"
            href={next.slug ? `/lessons/${next.slug}` : "#"}
            icon="arrow-right"
            className="h-12 shrink-0 px-5"
          >
            Next Lesson
          </LinkButton>
        ) : null}
      </div>
    </nav>
  );
}