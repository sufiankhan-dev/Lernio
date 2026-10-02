import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "text";
export type ButtonSize = "sm" | "md";
export type ButtonIconPosition = "leading" | "trailing";

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconSize?: number;
  iconPosition?: ButtonIconPosition;
  children?: ReactNode;
};

const base =
  "inline-flex h-11 max-w-full min-w-0 items-center justify-center gap-2 rounded-md font-medium " +
  "transition-colors disabled:cursor-not-allowed disabled:pointer-events-none";

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 text-body",
  md: "px-4 text-body",
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-500 text-white shadow-sm hover:bg-primary-600 disabled:bg-primary-100 disabled:text-primary-300",
  secondary:
    "bg-transparent text-primary-500 border border-primary-500 hover:bg-primary-100 " +
    "disabled:border-primary-200 disabled:text-primary-300",
  tertiary:
    "bg-white text-neutral-900 border border-neutral-200 shadow-sm hover:border-neutral-300 hover:bg-neutral-50 " +
    "disabled:text-neutral-300 disabled:shadow-none",
  text: "bg-transparent px-0 text-primary-500 hover:text-primary-600 disabled:text-primary-300",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconSize = 16,
  iconPosition = "trailing",
  children,
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  const glyph = icon ? <Icon name={icon} size={iconSize} className="shrink-0" /> : null;

  return (
    <button
      type={type}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {iconPosition === "leading" ? glyph : null}
      <span className="min-w-0 truncate">{children}</span>
      {iconPosition === "trailing" ? glyph : null}
    </button>
  );
}

type LinkButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconSize?: number;
  iconPosition?: ButtonIconPosition;
  children?: ReactNode;
  className?: string;
  href?: string;
};

export function LinkButton({
  variant = "primary",
  size = "md",
  icon,
  iconSize = 16,
  iconPosition = "trailing",
  children,
  className = "",
  href = "/",
}: LinkButtonProps) {
  const glyph = icon ? <Icon name={icon} size={iconSize} className="shrink-0" /> : null;

  return (
    <Link href={href} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {iconPosition === "leading" ? glyph : null}
      <span className="min-w-0 truncate">{children}</span>
      {iconPosition === "trailing" ? glyph : null}
    </Link>
  );
}
