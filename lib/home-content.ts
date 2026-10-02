/**
 * Site chrome shared across pages.
 *
 * Course content itself lives in Sanity and is read through
 * `sanity/lib/data.ts`. Only the primary navigation is kept here, because it is
 * app configuration rather than authored content.
 */
export const navLinks = [
  { label: "Courses", href: "/courses" },
  { label: "My Learning", href: "/my-learning" },
];