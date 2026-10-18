import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type BadgeVariant = "video" | "lesson" | "popular";

const variants: Record<BadgeVariant, string> = {
  // Badge text is primary-600, not primary-500: 600 is 5.53:1 on primary-100 and
  // 500 is only 4.18:1, which fails AA at this 12px size.
  video: "bg-primary-100 text-primary-600",
  lesson: "bg-teal-100 text-teal-700",
  popular: "bg-primary-100 text-primary-600 border border-primary-200",
};

type BadgeProps = {
  variant?: BadgeVariant;
  icon?: IconName;
  children: ReactNode;
  className?: string;
};

export function Badge({ variant = "video", icon, children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex w-fit max-w-full items-center gap-1 self-start rounded-xs px-2 py-0.5 text-small font-medium uppercase tracking-wide ${variants[variant]} ${className}`}
    >
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}
