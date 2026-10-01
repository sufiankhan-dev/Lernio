import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Icon } from "./Icon";

const fieldBase =
  "h-11 w-full rounded-md border border-neutral-200 bg-white px-4 text-body text-neutral-900 " +
  "placeholder:text-neutral-400 transition-colors focus:border-primary-400 focus:outline-none " +
  "focus:ring-2 focus:ring-primary-200 disabled:bg-neutral-100 disabled:text-neutral-400";

type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label?: string;
  hint?: ReactNode;
  className?: string;
  wrapperClassName?: string;
};

export function SearchField({
  label = "Search",
  hint,
  className = "",
  wrapperClassName = "",
  id,
  ...rest
}: SearchFieldProps) {
  const inputId = id ?? "search-field";

  return (
    <div className={wrapperClassName}>
      <div className="relative">
        <Icon
          name="search"
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
        />
        <input
          id={inputId}
          type="search"
          aria-label={label}
          className={`${fieldBase} pl-10 ${hint ? "pr-16" : ""} ${className}`}
          {...rest}
        />
        {hint ? (
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xs bg-neutral-100 px-1.5 py-0.5 text-small font-medium text-neutral-500">
            {hint}
          </kbd>
        ) : null}
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
    <div className={`relative ${wrapperClassName}`}>
      <select
        id={selectId}
        aria-label={label}
        className={`${fieldBase} appearance-none pr-10 ${className}`}
        {...rest}
      >
        {children}
      </select>
      <Icon
        name="chevron-down"
        size={18}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500"
      />
    </div>
  );
}
