import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Icon } from "./Icon";

const control =
  "h-full w-full min-w-0 appearance-none bg-transparent text-body leading-5 text-neutral-900 outline-none " +
  "placeholder:text-neutral-400 disabled:text-neutral-400";

const shell =
  "flex h-11 w-full items-center gap-2 rounded-md border border-neutral-200 bg-white px-4 " +
  "transition-colors focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-200 " +
  "disabled:bg-neutral-100";

type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label?: string;
  hint?: ReactNode;
  className?: string;
  wrapperClassName?: string;
  id?: string;
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
      <div className={shell}>
        <Icon name="search" size={18} className="shrink-0 text-neutral-400" />
        <input
          id={inputId}
          type="text"
          aria-label={label}
          className={`${control} ${className}`}
          {...rest}
        />
        {hint ? (
          <kbd className="shrink-0 rounded-xs bg-neutral-100 px-1.5 py-0.5 text-small font-medium text-neutral-500">
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
