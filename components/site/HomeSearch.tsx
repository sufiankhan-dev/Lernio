"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchField } from "@/components/ui/Field";

export function HomeSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    router.push(`/search?q=${encodeURIComponent(trimmed.slice(0, 200))}`);
  }

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className="w-full"
      aria-label="Search your learning"
    >
      <label htmlFor="home-search" className="sr-only">
        Ask anything about your learning
      </label>
      <SearchField
        id="home-search"
        size="lg"
        inputRef={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Ask anything about your learning..."
        hint={
          <>
            <span aria-hidden="true">⌘</span>K
          </>
        }
      />
    </form>
  );
}
