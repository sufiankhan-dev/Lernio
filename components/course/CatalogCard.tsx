import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { CourseLogo } from "./CourseLogo";
import type { CourseLogoKey } from "@/lib/home-content";

export type CatalogCardProps = {
  slug: string;
  title: string;
  summary: string;
  level: string;
  duration: string;
  moduleCount: number;
  logo: CourseLogoKey;
};

export function CatalogCard({
  slug,
  title,
  summary,
  level,
  duration,
  moduleCount,
  logo,
}: CatalogCardProps) {
  return (
    <Link
      href={`/courses/${slug}`}
      className="flex flex-col rounded-lg border border-neutral-200 bg-white px-6 pt-8 pb-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <CourseLogo logo={logo} title={title} />
      <h3 className="mt-8 font-display text-heading-1 leading-tight font-bold text-neutral-900">
        {title}
      </h3>
      <p className="mt-3 text-body-large leading-6 text-neutral-500">{summary}</p>
      <dl className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-neutral-200 pt-6 text-body text-neutral-500">
        <span className="inline-flex items-center gap-2">
          <Icon name="chart" size={14} className="shrink-0" />
          <dt className="sr-only">Level</dt>
          <dd>{level}</dd>
        </span>
        <span className="inline-flex items-center gap-2">
          <Icon name="clock" size={14} className="shrink-0" />
          <dt className="sr-only">Duration</dt>
          <dd>{duration}</dd>
        </span>
        <span className="inline-flex items-center gap-2">
          <Icon name="folder" size={14} className="shrink-0" />
          <dt className="sr-only">Modules</dt>
          <dd>{moduleCount} modules</dd>
        </span>
      </dl>
    </Link>
  );
}
