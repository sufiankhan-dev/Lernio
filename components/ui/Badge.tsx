import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type BadgeVariant = "video" | "lesson" | "popular";

const variants: Record<BadgeVariant, string> = {
  video: "bg-primary-100 text-primary-500",
  lesson: "bg-indigo-100 text-indigo-700",
  popular: "bg-primary-100 text-primary-500 border border-primary-200",
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
      className={`inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-small font-medium uppercase tracking-wide ${variants[variant]} ${className}`}
    >
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}
