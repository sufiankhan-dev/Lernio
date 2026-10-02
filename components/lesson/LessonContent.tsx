import { Icon } from "@/components/ui/Icon";
import { ResourceCard } from "@/components/ui/Card";
import { resourceIcon } from "@/lib/format";

type LessonContentProps = {
  summary: string | null;
  keyPoints: string[] | null;
  proTip: string | null;
  resources: {
    key: string;
    type: string | null;
    title: string | null;
    description: string | null;
    url: string | null;
  }[];
};

export function LessonContent({ summary, keyPoints, proTip, resources }: LessonContentProps) {
  const points = (keyPoints ?? []).filter(Boolean);
  const items = (resources ?? []).filter((resource) => resource.url);

  return (
    <div>
      {summary ? (
        <section aria-labelledby="lesson-overview">
          <h2
            id="lesson-overview"
            className="font-display text-heading-2 font-bold text-neutral-900"
          >
            Overview
          </h2>
          <p className="mt-4 max-w-[68ch] text-body-large text-neutral-600">{summary}</p>
        </section>
      ) : null}

      {points.length > 0 ? (
        <>
          <div className="mt-10 border-t border-neutral-200" />
          <section aria-labelledby="lesson-key-points" className="mt-10">
            <h3 id="lesson-key-points" className="text-body font-semibold text-neutral-900">
              In this lesson you will:
            </h3>
            <ul className="mt-5 space-y-4">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <Icon
                    name="check-circle"
                    size={20}
                    className="mt-0.5 shrink-0 text-primary-500"
                  />
                  <span className="text-body text-neutral-700">{point}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}

      {proTip ? (
        <aside className="mt-10 rounded-lg bg-primary-100 p-6">
          <div className="flex items-center gap-3">
            <Icon name="lightbulb" size={24} className="shrink-0 text-primary-500" />
            <h3 className="font-display text-heading-3 font-bold text-neutral-900">Pro Tip</h3>
          </div>
          <p className="mt-3 max-w-[72ch] text-body text-neutral-700">{proTip}</p>
        </aside>
      ) : null}

      {items.length > 0 ? (
        <>
          <div className="mt-10 border-t border-neutral-200" />
          <section aria-labelledby="lesson-resources" className="mt-10">
            <h2
              id="lesson-resources"
              className="font-display text-heading-2 font-bold text-neutral-900"
            >
              Resources
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((resource) => (
                <ResourceCard
                  key={resource.key}
                  title={resource.title ?? "Untitled resource"}
                  description={resource.description ?? ""}
                  icon={resourceIcon(resource.type)}
                  actionHref={resource.url ?? "#"}
                />
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}