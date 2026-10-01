"use client";

import { useState } from "react";
import { Icon } from "./Icon";

type PaginationProps = {
  page: number;
  total: number;
  onChange?: (page: number) => void;
};

export function Pagination({ page: initialPage, total, onChange }: PaginationProps) {
  const [page, setPage] = useState(initialPage);
  const visible = [1, 2, 3, "…", total] as const;

  const goTo = (next: number) => {
    const clamped = Math.min(total, Math.max(1, next));
    setPage(clamped);
    onChange?.(clamped);
  };

  return (
    <nav aria-label="Pagination" className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Previous page"
        onClick={() => goTo(page - 1)}
        disabled={page === 1}
        className="flex size-8 items-center justify-center rounded-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-40"
      >
        <Icon name="chevron-left" size={16} />
      </button>
      {visible.map((item, index) =>
        typeof item === "number" ? (
          <button
            key={`${item}-${index}`}
            type="button"
            aria-current={item === page ? "page" : undefined}
            onClick={() => goTo(item)}
            className={
              item === page
                ? "flex size-8 items-center justify-center rounded-sm border border-primary-500 text-body font-medium text-primary-500"
                : "flex size-8 items-center justify-center rounded-sm text-body text-neutral-900 transition-colors hover:bg-neutral-100"
            }
          >
            {item}
          </button>
        ) : (
          <span key={`gap-${index}`} className="px-1 text-body text-neutral-400">
            {item}
          </span>
        ),
      )}
      <button
        type="button"
        aria-label="Next page"
        onClick={() => goTo(page + 1)}
        disabled={page === total}
        className="flex size-8 items-center justify-center rounded-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-40"
      >
        <Icon name="chevron-right" size={16} />
      </button>
    </nav>
  );
}
