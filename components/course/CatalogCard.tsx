import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatDuration, formatLevel } from "@/lib/format";

export type CatalogCardProps = {
  slug: string;
  title: string;
  summary: string | null;
  level: string | null;
  totalMinutes: number;
  moduleCount: number;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
};

function CardMark({
  title,
  coverImageUrl,
  coverImageAlt,
}: Pick<CatalogCardProps, "title" | "coverImageUrl" | "coverImageAlt">) {
  const shell = "relative size-16 shrink-0 overflow-hidden rounded-md bg-neutral-900";

  if (!coverImageUrl) {
    const initials = title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("");

    return (
      <span
        className={`${shell} flex items-center justify-center font-display text-heading-2 font-bold text-white`}
      >
        <span aria-hidden="true">{initials}</span>
      </span>
    );
  }

  return (
    <span className={shell}>
      <Image
        src={coverImageUrl}
        alt={coverImageAlt || title}
        fill
        sizes="64px"
        className="object-cover"
      />
    </span>
  );
}

type MetaIcon = "chart" | "clock" | "folder";

export function CatalogCard({
  slug,
  title,
  summary,
  level,
  totalMinutes,
  moduleCount,
  coverImageUrl,
  coverImageAlt,
}: CatalogCardProps) {
  const meta: { icon: MetaIcon; label: string; value: string }[] = (
    [
      { icon: "chart", label: "Level", value: formatLevel(level) },
      { icon: "clock", label: "Duration", value: formatDuration(totalMinutes) },
      { icon: "folder", label: "Modules", value: `${moduleCount} modules` },
    ] satisfies { icon: MetaIcon; label: string; value: string }[]
  ).filter((item) => item.value !== "");

  return (
    <Link
      href={`/courses/${slug}`}
      className="flex h-full flex-col rounded-lg border border-neutral-200 bg-white px-6 pt-8 pb-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <CardMark title={title} coverImageUrl={coverImageUrl} coverImageAlt={coverImageAlt} />
      <h3 className="mt-8 font-display text-heading-1 leading-tight font-bold text-neutral-900">
        {title}
      </h3>
      {summary ? (
        <p className="mt-3 mb-6 text-body-large leading-6 text-neutral-500">{summary}</p>
      ) : (
        <div className="mb-6" />
      )}
      {/* mt-auto pins the meta row to the bottom so footers align across a row
          of cards whose summaries differ in length. w-full plus justify-between
          spreads the three items across the full card width. */}
      <dl className="mt-auto flex w-full flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-neutral-200 pt-6 text-body text-neutral-500">
        {meta.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-2">
            <Icon name={item.icon} size={14} className="shrink-0" />
            <dt className="sr-only">{item.label}</dt>
            <dd>{item.value}</dd>
          </span>
        ))}
      </dl>
    </Link>
  );
}