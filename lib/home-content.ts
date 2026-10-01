export type CourseLogoKey = "nextjs" | "docker" | "typescript";

export type CourseSummary = {
  slug: string;
  title: string;
  summary: string;
  level: string;
  duration: string;
  moduleCount: number;
  logo: CourseLogoKey;
};

export const navLinks = [
  { label: "Courses", href: "/courses" },
  { label: "My Learning", href: "/my-learning" },
];

export const courses: CourseSummary[] = [
  {
    slug: "nextjs-for-production",
    title: "Next.js for Production",
    summary: "Build scalable, high-performance web applications with Next.js.",
    level: "Intermediate",
    duration: "18h 24m",
    moduleCount: 12,
    logo: "nextjs",
  },
  {
    slug: "docker-essentials",
    title: "Docker Essentials",
    summary: "Containerize applications and streamline your development workflow.",
    level: "Beginner",
    duration: "10h 12m",
    moduleCount: 8,
    logo: "docker",
  },
  {
    slug: "typescript-deep-dive",
    title: "TypeScript Deep Dive",
    summary: "Go beyond the basics and write safer, more expressive code.",
    level: "Intermediate",
    duration: "14h 36m",
    moduleCount: 10,
    logo: "typescript",
  },
];
