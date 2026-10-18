"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * Header notifications menu.
 *
 * There is no notifications document type and no read helper yet, so these rows
 * are stand-ins for real activity. They are a static module-level constant on
 * purpose: nothing here is fetched, and nothing pretends to be live data.
 */
const NOTIFICATIONS: { id: string; icon: IconName; title: string; detail: string; time: string }[] = [
  {
    id: "n1",
    icon: "zap",
    title: "New lesson published",
    detail: "Tokens and context windows was added to Building AI Apps with LLMs.",
    time: "2h ago",
  },
  {
    id: "n2",
    icon: "users",
    title: "You are on the leaderboard",
    detail: "You finished in the top 10% of this week's Data Fetching challenge.",
    time: "Yesterday",
  },
  {
    id: "n3",
    icon: "clock",
    title: "Your weekly goal is waiting",
    detail: "A quick 20 minutes keeps your learning streak alive.",
    time: "2d ago",
  },
];

const UNREAD_COUNT = 3;
const PANEL_ID = "lernio-notifications-panel";

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      // Return focus to the trigger so a keyboard user is not dropped at the
      // top of the document when the panel closes.
      triggerRef.current?.focus();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        aria-controls={PANEL_ID}
        onClick={() => setOpen((value) => !value)}
        className="relative flex size-10 items-center justify-center rounded-full text-neutral-900 transition-colors hover:bg-neutral-100"
      >
        <Icon name="bell" size={24} />
        {UNREAD_COUNT > 0 ? (
          <>
            {/* The badge is decorative; the count is announced once by the
                visually hidden text beside it, not twice. */}
            <span
              aria-hidden="true"
              className="absolute top-1 right-0.5 flex size-[18px] items-center justify-center rounded-full bg-primary-500 text-[10px] leading-none font-semibold text-white"
            >
              {UNREAD_COUNT}
            </span>
            <span className="sr-only">{`${UNREAD_COUNT} unread notifications`}</span>
          </>
        ) : null}
      </button>

      {open ? (
        <div
          id={PANEL_ID}
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4">
            <h2 className="font-display text-heading-3 font-semibold text-neutral-900">
              Notifications
            </h2>
            {/* Presentational only: there is no notifications store to mark. */}
            <button
              type="button"
              className="text-small text-primary-500 transition-colors hover:text-primary-600"
            >
              Mark all read
            </button>
          </div>

          <ul className="divide-y divide-neutral-200">
            {NOTIFICATIONS.map((item) => (
              <li key={item.id}>
                <Link
                  href="/courses"
                  className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-neutral-50"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-100 text-primary-600"
                  >
                    <Icon name={item.icon} size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-medium text-neutral-900">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-small leading-5 text-neutral-500">
                      {item.detail}
                    </span>
                  </span>
                  <span className="shrink-0 text-small text-neutral-400">{item.time}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="border-t border-neutral-200 px-5 py-3">
            <Link
              href="/courses"
              className="inline-flex items-center gap-1.5 text-small text-primary-500 transition-colors hover:text-primary-600"
            >
              Browse new courses
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}