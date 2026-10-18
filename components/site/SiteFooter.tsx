import Link from "next/link";
import { Logo } from "@/components/ui/Nav";

/**
 * Site footer.
 *
 * Presentational chrome, like `WeeklyNote`: no state, no data, no client
 * boundary. Every link points at a route that exists today, because the primary
 * nav already carries one link to a page that was never built.
 */
const columns = [
  {
    heading: "Learn",
    links: [
      { label: "All Courses", href: "/courses" },
      { label: "Search", href: "/search" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Sign In", href: "/sign-in" },
      { label: "Create Account", href: "/sign-up" },
    ],
  },
  {
    heading: "Reference",
    links: [{ label: "Design System", href: "/design-system" }],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-primary-900 text-primary-200">
      <div className="px-6 pt-14 pb-8 sm:px-8 lg:px-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div className="max-w-[360px]">
            <Logo tone="light" />
            <p className="mt-4 text-body leading-6 text-primary-200">
              Search every lesson across all your courses in plain English.
            </p>
            <p className="mt-5 text-small text-primary-300">
              New courses and lessons added every week.
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="ds-section-label text-primary-300">{column.heading}</h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-body transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-small text-primary-300 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} Lernio. All rights reserved.
          </p>
          <p>Built for learners who know exactly what they want to learn.</p>
        </div>
      </div>
    </footer>
  );
}