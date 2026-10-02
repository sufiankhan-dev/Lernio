import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { formatDuration, formatLevel, formatStudentCount } from "@/lib/format";
import { CourseActions } from "./CourseActions";

type MetaIcon = "chart" | "clock" | "folder" | "users";

export type CourseHeroProps = {
  title: string;
  summary: string | null;
  level: string | null;
  isPopular: boolean;
  studentCount: number | null;
  moduleCount: number;
  totalMinutes: number;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  firstLessonSlug: string | null;
  hasProgress: boolean;
};

function CoverTile({
  title,
  coverImageUrl,
  coverImageAlt,
}: Pick<CourseHeroProps, "title" | "coverImageUrl" | "coverImageAlt">) {
  const shell =
    "relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-neutral-900 shadow-sm";

  if (!coverImageUrl) {
    const initials = title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("");

    return (
      <div
        className={`${shell} flex items-center justify-center font-display text-display-1 font-bold text-white`}
      >
        <span aria-hidden="true">{initials}</span>
      </div>
    );
  }

  return (
    <div className={shell}>
      <Image
        src={coverImageUrl}
        alt={coverImageAlt || title}
        fill
        sizes="(min-width: 1024px) 280px, (min-width: 640px) 220px, 100vw"
        className="object-cover"
      />
    </div>
  );
}

export function CourseHero({
  title,
  summary,
  level,
  isPopular,
  studentCount,
  moduleCount,
  totalMinutes,
  coverImageUrl,
  coverImageAlt,
  firstLessonSlug,
  hasProgress,
}: CourseHeroProps) {
  const meta: { icon: MetaIcon; label: string; value: string }[] = (
    [
      { icon: "chart", label: "Level", value: formatLevel(level) },
      { icon: "clock", label: "Duration", value: formatDuration(totalMinutes) },
      { icon: "folder", label: "Modules", value: `${moduleCount} modules` },
      { icon: "users", label: "Enrolled", value: `${formatStudentCount(studentCount)} students` },
    ] satisfies { icon: MetaIcon; label: string; value: string }[]
  ).filter((item) => item.value !== "");

  return (
    <section className="grid items-start gap-8 pt-8 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:gap-12 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-14">
      <CoverTile title={title} coverImageUrl={coverImageUrl} coverImageAlt={coverImageAlt} />

      <div className="min-w-0">
        {isPopular ? <Badge variant="popular">Popular</Badge> : null}
        <h1 className="mt-4 font-display text-display-1 font-bold text-neutral-900">{title}</h1>
        {summary ? (
          <p className="mt-5 max-w-[560px] text-body-large leading-7 text-neutral-600">{summary}</p>
        ) : null}

        <dl className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-body text-neutral-600">
          {meta.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-2">
              <Icon name={item.icon} size={16} className="shrink-0 text-neutral-600" />
              <dt className="sr-only">{item.label}</dt>
              <dd>{item.value}</dd>
            </span>
          ))}
        </dl>

        <div className="mt-8">
          <CourseActions firstLessonSlug={firstLessonSlug} hasProgress={hasProgress} />
        </div>
      </div>
    </section>
  );
}