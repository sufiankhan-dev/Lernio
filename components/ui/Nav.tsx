import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function BrandMark({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="lernio-brand-mark" x1="7" y1="3" x2="25" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FB923C" />
          <stop offset="1" stopColor="#F05A05" />
        </linearGradient>
      </defs>
      <path d="M2 4h11.3L16 29.6z" fill="url(#lernio-brand-mark)" />
      <path d="M18.7 4H30L16 29.6z" fill="url(#lernio-brand-mark)" />
    </svg>
  );
}

export function Logo({ className = "", href }: { className?: string; href?: string }) {
  return (
    <Link
      href={href ?? "/"}
      className={`inline-flex items-center gap-2 ${className}`}
      aria-label="Lernio home"
    >
      <BrandMark />
      <span className="font-display text-heading-1 leading-none font-bold tracking-tight text-neutral-900">
        Lernio
      </span>
    </Link>
  );
}

type SiteNavProps = {
  links: { label: string; href?: string; active?: boolean }[];
  actions?: ReactNode;
  className?: string;
};

export function SiteNav({ links, actions, className = "" }: SiteNavProps) {
  return (
    <div className={`flex items-center ${actions ? "w-full justify-between" : ""} ${className}`}>
      <nav aria-label="Main" className="flex items-center gap-14">
        <Logo />
        <ul className="flex items-center gap-10">
          {links.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href ?? "#"}
                aria-current={link.active ? "page" : undefined}
                className={
                  link.active
                    ? "text-body font-medium text-primary-500"
                    : "text-body-large font-medium text-neutral-900 transition-colors hover:text-primary-500"
                }
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {actions ? <div className="flex items-center gap-4">{actions}</div> : null}
    </div>
  );
}

export type BreadcrumbItem = string | { label: string; href?: string };

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-small text-neutral-500">
        {items.map((item, index) => {
          const { label, href } = typeof item === "string" ? { label: item, href: "#" } : item;
          const isLast = index === items.length - 1;
          return (
            <li key={label} className="flex items-center gap-1.5">
              {index > 0 ? (
                <Icon name="chevron-right" size={12} className="text-neutral-300" />
              ) : null}
              {isLast || !href ? (
                <span aria-current={isLast ? "page" : undefined} className="text-neutral-900">
                  {label}
                </span>
              ) : (
                <Link href={href} className="transition-colors hover:text-primary-500">
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
