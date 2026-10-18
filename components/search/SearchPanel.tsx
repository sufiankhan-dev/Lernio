"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchField, SelectField } from "@/components/ui/Field";
import { LinkButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import { SearchVideoResultCard } from "@/components/search/SearchVideoResultCard";
import {
  SEARCH_SORTS,
  SEARCH_SORT_LABELS,
  type SearchResultCardData,
  type SearchResultsPayload,
  type SearchSort,
  type SearchStreamEvent,
} from "@/lib/search-types";

export type SearchPanelProps = {
  initialQuery: string;
};

type Phase = "idle" | "loading" | "ready" | "error";

/**
 * Reads the route's newline-delimited stream. Status lines arrive while the agent
 * queries Sanity; exactly one results or error line closes the stream.
 *
 * Cards only ever render from the final payload, so a partially generated result
 * set never reaches the screen.
 */
async function readSearchStream(
  response: Response,
  onStatus: (message: string) => void,
): Promise<SearchResultsPayload> {
  if (!response.body) {
    throw new Error("Search returned an empty response.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let payload: SearchResultsPayload | null = null;
  let failure: string | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let event: SearchStreamEvent;
      try {
        event = JSON.parse(trimmed) as SearchStreamEvent;
      } catch {
        continue;
      }

      if (event.type === "status") {
        onStatus(event.message);
      } else if (event.type === "results") {
        payload = event.payload;
      } else if (event.type === "error") {
        failure = event.message;
      }
    }
  }

  if (failure) throw new Error(failure);
  if (!payload) throw new Error("Search did not return any results.");
  return payload;
}

/** Stable sort keeps relevance order for equal keys, so ties stay predictable. */
function sortResults(results: SearchResultCardData[], sort: SearchSort) {
  if (sort === "newest") {
    return [...results].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  if (sort === "shortest") {
    return [...results].sort(
      (a, b) => (a.duration ?? Number.MAX_SAFE_INTEGER) - (b.duration ?? Number.MAX_SAFE_INTEGER),
    );
  }
  return results;
}

/**
 * The count line under the headline.
 *
 * Both numbers are computed after hydration dropped everything unresolvable, so they
 * always describe what is actually on screen. Never taken from the model.
 */
function countLine(payload: SearchResultsPayload): string {
  const count = payload.results.length;
  const courses = payload.totalCourses;

  return `Found ${count} ${count === 1 ? "result" : "results"} across ${courses} ${
    courses === 1 ? "course" : "courses"
  }`;
}

/** A lesson and a video can share an id space, so the key carries the kind too. */
function resultKey(result: SearchResultCardData): string {
  return result.kind === "video"
    ? `video-${result.videoId}`
    : `lesson-${result.lessonId}`;
}

export function SearchPanel({ initialQuery }: SearchPanelProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SearchSort>("relevance");
  // Derived from the URL on first render rather than set from an effect, so a
  // shared link starts searching without a cascading render.
  const [phase, setPhase] = useState<Phase>(initialQuery ? "loading" : "idle");
  const [status, setStatus] = useState(initialQuery ? "Searching..." : "");
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<SearchResultsPayload | null>(null);

  /**
   * Runs the request. Never sets state synchronously, so it is safe to call from an
   * effect as well as from an event handler.
   */
  const performSearch = useCallback(async (trimmed: string) => {
    const id = requestId.current + 1;
    requestId.current = id;

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });

      if (!response.ok && response.headers.get("Content-Type")?.includes("json")) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "Search is unavailable right now.");
      }

      const next = await readSearchStream(response, (message) => {
        // A newer request has superseded this one; drop its progress.
        if (requestId.current === id) setStatus(message);
      });

      if (requestId.current !== id) return;

      setPayload(next);
      setStatus("");
      setError("");
      setPhase("ready");
    } catch (caught) {
      if (requestId.current !== id) return;

      setError(caught instanceof Error ? caught.message : "Search is unavailable right now.");
      setStatus("");
      setPhase("error");
    }
  }, []);

  const startSearch = useCallback(
    (nextQuery: string) => {
      const trimmed = nextQuery.trim();
      if (!trimmed) {
        requestId.current += 1;
        setPhase("idle");
        setPayload(null);
        setStatus("");
        setError("");
        return;
      }

      setPhase("loading");
      setStatus("Searching...");
      setError("");
      setPayload(null);
      void performSearch(trimmed);
    },
    [performSearch],
  );

  // Run once for the query in the URL, so a shared link reproduces its results.
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    if (initialQuery) void performSearch(initialQuery.trim().slice(0, 200));
  }, [initialQuery, performSearch]);

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

    router.replace(`/search?q=${encodeURIComponent(trimmed)}`);
    startSearch(trimmed);
  }

  const results = payload ? sortResults(payload.results, sort) : [];
  const isLoading = phase === "loading";
  const hasSearched = phase === "ready" || phase === "error" || isLoading;

  return (
    <>
      <p
        aria-live="polite"
        className="text-center text-body-large text-neutral-600"
      >
        {payload ? countLine(payload) : ""}
      </p>

      <form role="search" onSubmit={onSubmit} className="mx-auto mt-4 w-full max-w-[725px]" aria-label="Search your learning">
        <label htmlFor="search-page-input" className="sr-only">
          Search your learning
        </label>
        <SearchField
          id="search-page-input"
          size="md"
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

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p aria-live="polite" className="text-body text-neutral-600">
          {isLoading
            ? status
            : payload
              ? `${payload.results.length} ${payload.results.length === 1 ? "result" : "results"}`
              : ""}
        </p>

        <SelectField
          label="Sort by"
          value={sort}
          onChange={(event) => setSort(event.target.value as SearchSort)}
          wrapperClassName="w-[190px]"
        >
          {SEARCH_SORTS.map((option) => (
            <option key={option} value={option}>
              {SEARCH_SORT_LABELS[option]}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="mt-4">
        {error ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center shadow-sm">
            <p className="text-body text-neutral-600">{error}</p>
            <button
              type="button"
              onClick={() => startSearch(query)}
              className="mt-4 text-body font-medium text-primary-500 transition-colors hover:text-primary-600"
            >
              Try again
            </button>
          </div>
        ) : null}

        {!error && results.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {results.map((result) => (
              <li key={resultKey(result)}>
                {result.kind === "video" ? (
                  <SearchVideoResultCard result={result} />
                ) : (
                  <SearchResultCard result={result} />
                )}
              </li>
            ))}
          </ul>
        ) : null}

        {!error && phase === "ready" && results.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <Icon name="search" size={28} className="mx-auto text-neutral-400" />
            <p className="mt-4 text-body-large font-medium text-neutral-900">
              No results match that yet
            </p>
            <p className="mt-2 text-body text-neutral-500">
              Try different keywords, or browse the full catalog to find your next course.
            </p>
            <div className="mt-6 flex justify-center">
              <LinkButton href="/courses" icon="arrow-right">
                Browse all courses
              </LinkButton>
            </div>
          </div>
        ) : null}

        {!hasSearched && !error ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <Icon name="search" size={28} className="mx-auto text-neutral-400" />
            <p className="mt-4 text-body-large font-medium text-neutral-900">
              Search the whole library
            </p>
            <p className="mt-2 text-body text-neutral-500">
              Ask a question in plain English and we will find the lessons that answer it.
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-8 flex flex-col gap-4 rounded-lg bg-primary-100 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-primary-500"
          >
            <Icon name="search" size={22} />
          </span>
          <div>
            <p className="text-body-large font-medium text-neutral-900">
              Can&apos;t find what you&apos;re looking for?
            </p>
            <p className="mt-1 text-body text-neutral-600">
              Try different keywords or browse our full course catalog.
            </p>
          </div>
        </div>
        <LinkButton
          href="/courses"
          icon="arrow-right"
          className="shrink-0 self-start sm:self-auto"
        >
          Browse all courses
        </LinkButton>
      </div>
    </>
  );
}