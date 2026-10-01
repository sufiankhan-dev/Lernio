"use client";

import { useEffect, useRef, useState } from "react";
import { SearchField } from "@/components/ui/Field";

export function HomeSearch() {
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

  return (
    <form
      role="search"
      onSubmit={(event) => event.preventDefault()}
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
