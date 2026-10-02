import { Icon } from "@/components/ui/Icon";
import { learningOutcomeIcon } from "@/lib/format";

export type LearningOutcome = {
  key: string;
  icon: string | null;
  title: string | null;
  description: string | null;
};

type LearningOutcomesProps = {
  outcomes: LearningOutcome[];
};

export function LearningOutcomes({ outcomes }: LearningOutcomesProps) {
  if (outcomes.length === 0) return null;

  return (
    <section
      aria-labelledby="learning-outcomes"
      className="mt-14 rounded-lg border border-neutral-200 bg-white p-8 shadow-sm"
    >
      <h2
        id="learning-outcomes"
        className="font-display text-heading-1 font-bold text-neutral-900"
      >
        What you&apos;ll learn
      </h2>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {outcomes.map((outcome) => (
          <article
            key={outcome.key}
            className="flex gap-5 rounded-lg border border-neutral-200 bg-white p-6"
          >
            <Icon
              name={learningOutcomeIcon(outcome.icon)}
              size={40}
              className="shrink-0 text-primary-500"
            />
            <div className="min-w-0">
              {outcome.title ? (
                <h3 className="font-display text-heading-2 font-bold text-neutral-900">
                  {outcome.title}
                </h3>
              ) : null}
              {outcome.description ? (
                <p className="mt-2 text-body-large leading-6 text-neutral-500">
                  {outcome.description}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}