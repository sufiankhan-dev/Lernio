import { Icon } from "@/components/ui/Icon";
import { formatDuration, formatLevel, formatStudentCount } from "@/lib/format";
import { LessonBookmark } from "./LessonBookmark";

type LessonHeaderProps = {
  lessonLabel: string | null;
  title: string;
  summary: string | null;
  durationMinutes: number | null | undefined;
  level: string | null | undefined;
  studentCount: number | null | undefined;
};

export function LessonHeader({
  lessonLabel,
  title,
  summary,
  durationMinutes,
  level,
  studentCount,
}: LessonHeaderProps) {
  const duration = formatDuration(durationMinutes);
  const formattedLevel = formatLevel(level);
  const students = studentCount == null ? "" : `${formatStudentCount(studentCount)} students`;

  const meta = (
    [
      { icon: "clock", label: "Duration", value: duration },
      { icon: "chart", label: "Level", value: formattedLevel },
      { icon: "users", label: "Students", value: students },
    ] satisfies { icon: "clock" | "chart" | "users"; label: string; value: string }[]
  ).filter((item) => item.value !== "");

  return (
    <header>
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          {lessonLabel ? (
            <p className="text-small font-semibold tracking-wider text-primary-500 uppercase">
              {lessonLabel}
            </p>
          ) : null}
          <h1 className={`font-display text-display-1 font-bold text-neutral-900 ${lessonLabel ? "mt-3" : ""}`}>
            {title}
          </h1>
        </div>
        <LessonBookmark />
      </div>

      {summary ? (
        <p className="mt-5 max-w-[46ch] text-body-large text-neutral-600">{summary}</p>
      ) : null}

      {meta.length > 0 ? (
        <dl className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-body text-neutral-600">
          {meta.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-2">
              <Icon name={item.icon} size={16} className="shrink-0 text-neutral-500" />
              <dt className="sr-only">{item.label}</dt>
              <dd>{item.value}</dd>
            </span>
          ))}
        </dl>
      ) : null}
    </header>
  );
}