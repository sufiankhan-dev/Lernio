import type { InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes } from "react";
import { Icon } from "./Icon";

const control =
  "h-full w-full min-w-0 appearance-none bg-transparent text-body leading-5 text-neutral-900 outline-none " +
  "placeholder:text-neutral-400 disabled:text-neutral-400";

const shell =
  "flex h-11 w-full items-center gap-2 rounded-md border border-neutral-200 bg-white px-4 " +
  "transition-colors focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-200 " +
  "disabled:bg-neutral-100";

export type FieldSize = "sm" | "md" | "lg";

const fieldSizes: Record<FieldSize, string> = {
  sm: shell,
  md: shell,
  lg: "flex h-16 w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white px-5 " +
    "transition-colors focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-200 " +
    "disabled:bg-neutral-100",
};

const controlSizes: Record<FieldSize, string> = {
  sm: "text-body",
  md: "text-body",
  lg: "text-body-large",
};

const iconSizes: Record<FieldSize, number> = {
  sm: 18,
  md: 18,
  lg: 20,
};

const hintSizes: Record<FieldSize, string> = {
  sm: "rounded-xs bg-neutral-100 px-1.5 py-0.5 text-small font-medium text-neutral-500",
  md: "rounded-xs bg-neutral-100 px-1.5 py-0.5 text-small font-medium text-neutral-500",
  lg: "flex h-9 items-center gap-1 rounded-md border border-neutral-200 px-3 text-body-large font-medium text-neutral-600",
};

type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "size" | "hint"> & {
  label?: string;
  hint?: ReactNode;
  size?: FieldSize;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
  wrapperClassName?: string;
  id?: string;
};

export function SearchField({
  label = "Search",
  hint,
  size = "md",
  inputRef,
  className = "",
  wrapperClassName = "",
  id,
  ...rest
}: SearchFieldProps) {
  const inputId = id ?? "search-field";

  return (
    <div className={wrapperClassName}>
      <div className={fieldSizes[size]}>
        <Icon
          name="search"
          size={iconSizes[size]}
          className={`shrink-0 ${size === "lg" ? "text-neutral-500" : "text-neutral-400"}`}
        />
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          aria-label={label}
          className={`${control} ${controlSizes[size]} ${className}`}
          {...rest}
        />
        {hint ? <kbd className={`shrink-0 ${hintSizes[size]}`}>{hint}</kbd> : null}
      </div>
    </div>
  );
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
  label?: string;
  className?: string;
  wrapperClassName?: string;
  id?: string;
};

export function SelectField({
  label = "Sort by",
  className = "",
  wrapperClassName = "",
  id,
  children,
  ...rest
}: SelectFieldProps) {
  const selectId = id ?? "select-field";

  return (
    <div className={`${shell} ${wrapperClassName}`}>
      <select
        id={selectId}
        aria-label={label}
        className={`${control} cursor-pointer appearance-none pr-1 ${className}`}
        {...rest}
      >
        {children}
      </select>
      <Icon name="chevron-down" size={18} className="shrink-0 text-neutral-500" />
    </div>
  );
}
