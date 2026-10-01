import type { CourseLogoKey } from "@/lib/home-content";

const marks: Record<CourseLogoKey, React.ReactNode> = {
  nextjs: (
    <>
      <rect width="64" height="64" rx="14" fill="#0F172A" />
      <path
        d="M23 45V19l19 26V19"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  docker: (
    <>
      <rect x="14" y="13" width="10" height="10" rx="1.5" fill="#2496ED" />
      <rect x="26" y="13" width="10" height="10" rx="1.5" fill="#2496ED" />
      <rect x="14" y="25" width="10" height="10" rx="1.5" fill="#2496ED" />
      <rect x="26" y="25" width="10" height="10" rx="1.5" fill="#2496ED" />
      <path
        d="M6 41c0-7 6-11 13-11h19c8 0 13-3 16-8 2 4 3 8 2 11-1 4-5 6-10 6h-2c0 6-5 10-11 10H17c-7 0-11-3-11-8z"
        fill="#2496ED"
      />
      <path d="M6 41h5c1 0 2 3 0 4H7c-1-1-1-3-1-4z" fill="#FFFFFF" />
      <circle cx="47" cy="35" r="2" fill="#0F172A" />
    </>
  ),
  typescript: (
    <>
      <rect width="64" height="64" rx="14" fill="#3178C6" />
      <text
        x="32"
        y="43"
        textAnchor="middle"
        fontSize="27"
        fontWeight="700"
        fill="#FFFFFF"
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        TS
      </text>
    </>
  ),
};

type CourseLogoProps = {
  logo: CourseLogoKey;
  title: string;
  size?: number;
};

export function CourseLogo({ logo, title, size = 64 }: CourseLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={`${title} logo`}
      className="shrink-0"
    >
      {marks[logo]}
    </svg>
  );
}
