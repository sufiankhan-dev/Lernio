import { LinkButton } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";

type CourseProgressBarProps = {
  /** Percent complete, 0-100. */
  value: number;
  /** Slug of the lesson the CTA opens. Null when the course has no lessons. */
  firstLessonSlug: string | null;
  /** True when a resume position is known. False until progress tracking exists. */
  hasProgress: boolean;
};

export function CourseProgressBar({ value, firstLessonSlug, hasProgress }: CourseProgressBarProps) {
  const label = hasProgress ? "Continue Learning" : "Start Learning";

  return (
    <div className="-mt-10 px-6 sm:px-8 lg:px-16">
      <div className="flex flex-col gap-5 rounded-lg border border-neutral-200 bg-white px-6 py-4 shadow-sm sm:flex-row sm:items-center sm:gap-8">
        <div className="min-w-0">
          <p className="text-small text-neutral-500">Your Progress</p>
          <p className="mt-1 font-display text-heading-3 font-bold text-neutral-900">
            {value}% complete
          </p>
        </div>

        <ProgressBar value={value} showLabel={false} className="flex-1" />

        {firstLessonSlug ? (
          <LinkButton
            href={`/lessons/${firstLessonSlug}`}
            icon="arrow-right"
            iconSize={20}
            className="h-12 shrink-0 px-6 text-body-large"
          >
            {label}
          </LinkButton>
        ) : null}
      </div>
    </div>
  );
}