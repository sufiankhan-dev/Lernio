import type { ReactNode } from "react";
import { Badge, type BadgeVariant } from "./Badge";
import { Icon, type IconName } from "./Icon";
import { LinkButton } from "./Button";

const shell =
  "flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md";

/** The shared card surface. Reused by the search result card. */
export const cardShell = shell;

export type CourseCardProps = {
  title: string;
  description: string;
  level: string;
  duration: string;
  modules: string;
  logo?: string;
  children?: ReactNode;
};

export function CourseCard({
  title,
  description,
  level,
  duration,
  modules,
  logo,
  children,
}: CourseCardProps) {
  return (
    <article className={shell}>
      <div className="flex items-start gap-3">
        {logo ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-small font-semibold text-white">
            {logo}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-heading-3 font-medium text-neutral-900">{title}</h3>
          <p className="mt-1 text-body text-neutral-500">{description}</p>
        </div>
      </div>
      {children}
      <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-neutral-500">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="chart" size={14} />
          <dt className="sr-only">Level</dt>
          <dd>{level}</dd>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Icon name="clock" size={14} />
          <dt className="sr-only">Duration</dt>
          <dd>{duration}</dd>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Icon name="folder" size={14} />
          <dt className="sr-only">Modules</dt>
          <dd>{modules}</dd>
        </span>
      </dl>
    </article>
  );
}

export type LessonCardProps = {
  badge?: BadgeVariant;
  title: string;
  description: string;
  meta?: string;
  action?: string;
  actionHref?: string;
  actionIcon?: IconName;
  children?: ReactNode;
};

export function LessonCard({
  badge = "video",
  title,
  description,
  meta,
  action,
  actionHref = "#",
  actionIcon = "external-link",
  children,
}: LessonCardProps) {
  return (
    <article className={shell}>
      <Badge variant={badge}>{badge === "lesson" ? "Lesson" : "Video"}</Badge>
      <h3 className="text-heading-3 font-medium text-neutral-900">{title}</h3>
      <p className="text-body text-neutral-500">{description}</p>
      {children}
      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        {meta ? <span className="text-small text-neutral-500">{meta}</span> : <span />}
        {action ? (
          <LinkButton variant="text" icon={actionIcon} className="text-small" href={actionHref}>
            {action}
          </LinkButton>
        ) : null}
      </div>
    </article>
  );
}

export type ResourceCardProps = {
  title: string;
  description: string;
  meta?: string;
  icon?: IconName;
  actionHref?: string;
};

export function ResourceCard({
  title,
  description,
  meta,
  icon = "document",
  actionHref = "#",
}: ResourceCardProps) {
  return (
    <article className={shell}>
      <Icon name={icon} size={22} className="text-neutral-700" />
      <h3 className="text-heading-3 font-medium text-neutral-900">{title}</h3>
      <p className="text-body text-neutral-500">{description}</p>
      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        {meta ? <span className="text-small text-neutral-500">{meta}</span> : <span />}
      <a
        href={actionHref}
        aria-label={`Open ${title}`}
        className="text-primary-500 transition-colors hover:text-primary-600"
      >
        <Icon name="external-link" size={16} />
      </a>
      </div>
    </article>
  );
}
