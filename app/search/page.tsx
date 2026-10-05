import type { Metadata } from "next";
import { SearchPanel } from "@/components/search/SearchPanel";
import { SiteHeader } from "@/components/site/SiteHeader";
import { GradientBars } from "@/components/site/GradientBars";
import { navLinks } from "@/lib/home-content";

export const metadata: Metadata = {
  title: "Search — Lernio",
  description:
    "Search every Lernio course and lesson in plain English and jump straight to the moment that answers your question.",
};

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const query = firstValue(params.q).trim().slice(0, 200);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col rounded-t-[24px] bg-canvas">
      <SiteHeader links={navLinks.map((link) => ({ ...link, active: false }))} />

      <main className="flex-1 px-6 pt-10 pb-14 sm:px-8 lg:px-14">
        <div className="mx-auto w-full max-w-[960px]">
          <div className="flex flex-col items-center text-center">
            <p className="rounded-full bg-primary-100 px-3 py-1.5 text-[11px] font-semibold tracking-[0.15em] text-primary-600 uppercase">
              Search Results
            </p>
            <h1 className="mt-5 font-display text-heading-1 font-bold text-neutral-900">
              {query ? (
                <>
                  Results for <span className="text-primary-500">&ldquo;{query}&rdquo;</span>
                </>
              ) : (
                "Search your learning"
              )}
            </h1>
          </div>

          <div className="mt-4">
            <SearchPanel initialQuery={query} />
          </div>
        </div>
      </main>

      <GradientBars />
    </div>
  );
}