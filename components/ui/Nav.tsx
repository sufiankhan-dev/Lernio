import { Icon } from "./Icon";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 24 24" width={26} height={26} aria-hidden="true" focusable="false">
        <path d="M2 4h20L12 21z" fill="#FB7316" />
        <path d="M8.6 10.4h6.8L12 16.6z" fill="#fff" />
      </svg>
      <span className="font-display text-heading-2 font-bold tracking-tight text-neutral-900">Vertex</span>
    </span>
  );
}

type SiteNavProps = {
  links: { label: string; href?: string; active?: boolean }[];
};

export function SiteNav({ links }: SiteNavProps) {
  return (
    <nav aria-label="Main" className="flex items-center gap-6">
      <Logo />
      <ul className="flex items-center gap-5">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href ?? "#"}
              aria-current={link.active ? "page" : undefined}
              className={
                link.active
                  ? "text-body font-medium text-primary-500"
                  : "text-body font-medium text-neutral-900 transition-colors hover:text-primary-500"
              }
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

type BreadcrumbsProps = {
  items: string[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-small text-neutral-500">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item} className="flex items-center gap-1.5">
              {index > 0 ? (
                <Icon name="chevron-right" size={12} className="text-neutral-300" />
              ) : null}
              {isLast ? (
                <span aria-current="page" className="text-neutral-900">
                  {item}
                </span>
              ) : (
                <a href="#" className="transition-colors hover:text-primary-500">
                  {item}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}


