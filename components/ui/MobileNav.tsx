"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

const PANEL_ID = "mobile-nav-panel";

type MobileNavProps = {
  links: { label: string; href?: string; active?: boolean }[];
  actions?: ReactNode;
  /** The brand is passed in from the server `SiteNav` so this module stays free of it. */
  brand: ReactNode;
};

/**
 * Header navigation below `lg`.
 *
 * The desktop row (logo, links, bell, auth) cannot fit a phone, so on small screens the header
 * keeps only the logo and a menu button and everything else moves into this full-screen sheet.
 * It closes on link click, on the close button, on Escape (with focus back on the trigger) and
 * when the viewport reaches the desktop breakpoint, and it locks page scroll while open.
 */
export function MobileNav({ links, actions, brand }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    const desktop = window.matchMedia("(min-width: 1024px)");

    function onBreakpointChange(event: MediaQueryListEvent) {
      if (event.matches) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpointChange);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpointChange);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls={PANEL_ID}
        onClick={() => setOpen(true)}
        className="flex size-10 shrink-0 items-center justify-center rounded-md text-neutral-900 transition-colors hover:bg-neutral-100 lg:hidden"
      >
        <Icon name="menu" size={24} />
      </button>

      {open ? (
        <div
          id={PANEL_ID}
          role="dialog"
          aria-modal="true"
          aria-label="Main menu"
          className="fixed inset-0 z-[60] flex h-dvh w-full flex-col overflow-y-auto bg-white lg:hidden"
        >
          <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-neutral-200 px-5">
            {brand}
            <button
              ref={closeRef}
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="flex size-10 items-center justify-center rounded-md text-neutral-900 transition-colors hover:bg-neutral-100"
            >
              <Icon name="close" size={24} />
            </button>
          </div>

          <nav aria-label="Main">
            <ul className="divide-y divide-neutral-200 border-b border-neutral-200">
              {links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href ?? "#"}
                    aria-current={link.active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`block px-5 py-4 text-body-large font-medium transition-colors ${
                      link.active ? "text-primary-500" : "text-neutral-900 hover:text-primary-500"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {actions ? (
            <div className="mt-auto flex items-center gap-4 border-t border-neutral-200 px-5 py-6">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
