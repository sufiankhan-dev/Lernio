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
    <span className="min-w-0">
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
      className="flex flex-wrap items-center gap-x-8 gap-y-6 border-t border-neutral-200 px-6 py-8 sm:px-8 lg:px-16"
    >
      {previous ? (
        <>
          <LinkButton
            variant="tertiary"
            href={previous.slug ? `/lessons/${previous.slug}` : "#"}
            icon="arrow-left"
            iconPosition="leading"
            className="h-12 px-5"
          >
            Previous Lesson
          </LinkButton>
          <Neighbour lesson={previous} />
        </>
      ) : null}

      <div className="ml-auto flex items-center gap-8">
        {next ? <Neighbour lesson={next} /> : null}
        {next ? (
          <LinkButton
            variant="primary"
            href={next.slug ? `/lessons/${next.slug}` : "#"}
            icon="arrow-right"
            className="h-12 px-5"
          >
            Next Lesson
          </LinkButton>
        ) : null}
      </div>
    </nav>
  );
}