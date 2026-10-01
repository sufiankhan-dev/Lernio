import type { SVGProps } from "react";

export type IconName =
  | "bell"
  | "search"
  | "play-circle"
  | "play-square"
  | "document"
  | "bookmark"
  | "chart"
  | "clock"
  | "user"
  | "chevron-right"
  | "chevron-down"
  | "chevron-left"
  | "arrow-right"
  | "star"
  | "check"
  | "check-circle"
  | "lock"
  | "external-link"
  | "folder"
  | "eye"
  | "target"
  | "grid"
  | "accessible";

export type IconVariant = "outline" | "filled";

type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  variant?: IconVariant;
  size?: number;
};

const STROKE_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const outlinePaths: Record<IconName, React.ReactNode> = {
  bell: (
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  "play-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5l6 3.5-6 3.5z" />
    </>
  ),
  "play-square": (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M10 8.5l6 3.5-6 3.5z" />
    </>
  ),
  document: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  bookmark: <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />,
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </>
  ),
  "chevron-right": <path d="m9 5 7 7-7 7" />,
  "chevron-down": <path d="m5 9 7 7 7-7" />,
  "chevron-left": <path d="m15 5-7 7 7 7" />,
  "arrow-right": (
    <>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  star: (
    <path d="m12 3.6 2.6 5.5 6 .8-4.4 4.2 1.1 6L12 17.3 6.7 20.1l1.1-6L3.4 9.9l6-.8z" />
  ),
  check: <path d="m4 12 5 5L20 6" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  "external-link": (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  ),
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  eye: (
    <>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.75" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
  accessible: (
    <>
      <circle cx="12" cy="4.5" r="1.75" />
      <path d="M5 8.5h14" />
      <path d="M12 8.5v5m0 0-4 7m4-7 4 7" />
    </>
  ),
};

const filledPaths: Record<IconName, React.ReactNode> = {
  bell: (
    <>
      <path d="M12 2a6 6 0 0 0-6 6c0 5.5-1.8 7.6-2.7 8.4-.4.4 0 1.1.5 1.1h16.4c.5 0 .9-.7.5-1.1-.9-.8-2.7-2.9-2.7-8.4a6 6 0 0 0-6-6z" />
      <path d="M9.8 20a2.2 2.2 0 0 0 4.4 0z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path
        d="m20.5 20.5-4.6-4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  ),
  "play-circle": (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.5 7.2 17 12l-7.5 4.8z" fill="#fff" />
    </>
  ),
  "play-square": (
    <>
      <rect x="2" y="2" width="20" height="20" rx="4" />
      <path d="M9.5 7.2 17 12l-7.5 4.8z" fill="#fff" />
    </>
  ),
  document: (
    <>
      <path d="M13.5 2.5H7A2.5 2.5 0 0 0 4.5 5v14A2.5 2.5 0 0 0 7 21.5h10a2.5 2.5 0 0 0 2.5-2.5V8.5z" />
      <path d="M8 13h8v1.6H8zm0 3.4h5.5V18H8z" fill="#fff" />
    </>
  ),
  bookmark: <path d="M5.5 3h13A1.5 1.5 0 0 1 20 4.5V22l-8-4.8L4 22V4.5A1.5 1.5 0 0 1 5.5 3z" />,
  chart: (
    <path d="M3 19.5h18v2H3zM4.5 10h2.5v8H4.5zm5.5-6h2.5v14H10zm5.5 3h2.5v11H15.5z" />
  ),
  clock: (
    <>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.6V6h-2v7.4l5 3 1-1.7z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4.5" />
      <path d="M12 13.5c-4.7 0-8.5 2.4-8.5 5.4V21h17v-2.1c0-3-3.8-5.4-8.5-5.4z" />
    </>
  ),
  "chevron-right": <path d="M9.3 4.3 8 5.7l5.3 5.3L8 16.3l1.3 1.4 6.7-6.7z" />,
  "chevron-down": <path d="M4.3 9.3 5.7 8l5.3 5.3L16.3 8l1.4 1.3-6.7 6.7z" />,
  "chevron-left": <path d="M14.7 4.3 16 5.7l-5.3 5.3 5.3 5.3-1.3 1.4L8 11.3z" />,
  "arrow-right": (
    <path d="M12.9 4.3 11.5 5.7l5.1 5.1H3.2v1.8h13.4l-5.1 5.1 1.4 1.4 6.9-6.9z" />
  ),
  star: (
    <path d="m12 2.4 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z" />
  ),
  check: <path d="M20.3 5.7a1 1 0 0 1 0 1.4l-10 10a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.4L9.6 15l9.3-9.3a1 1 0 0 1 1.4 0z" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M16.6 8.6 11.4 13.8l-3.6-3.6-1.2 1.2 4.8 4.8 6.4-6.4z" fill="#fff" />
    </>
  ),
  lock: (
    <>
      <rect x="3.5" y="9.5" width="17" height="12" rx="2.5" />
      <path d="M7.5 10V7a4.5 4.5 0 0 1 9 0v3h-2V7a2.5 2.5 0 0 0-5 0v3z" />
    </>
  ),
  "external-link": (
    <path d="M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14zM5 5h5v2H6v11h11v-4h2v6H4V5z" />
  ),
  folder: <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.5h8.8A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />,
  eye: (
    <>
      <path d="M12 5c-6.4 0-10 7-10 7s3.6 7 10 7 10-7 10-7-3.6-7-10-7zm0 11.5A4.5 4.5 0 1 1 16.5 12 4.5 4.5 0 0 1 12 16.5z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 6.5A5.5 5.5 0 1 0 17.5 12 5.5 5.5 0 0 0 12 6.5zm0 9A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z" fill="#fff" />
      <circle cx="12" cy="12" r="1.6" />
    </>
  ),
  grid: (
    <path d="M3.5 4.5h6v6h-6zm11 0h6v6h-6zm-11 9h6v6h-6zm11 0h6v6h-6z" />
  ),
  accessible: (
    <>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M4 7.5h16v2H4z" />
      <path d="M12 9.5h2.4l1.9 11h-2.2l-1.4-8.4-3.6 8.4H7l5-11z" />
    </>
  ),
};

export function Icon({ name, variant = "outline", size = 24, ...rest }: IconProps) {
  const paths = variant === "filled" ? filledPaths[name] : outlinePaths[name];

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      {...(variant === "outline" ? STROKE_PROPS : {})}
      {...rest}
    >
      {paths}
    </svg>
  );
}
