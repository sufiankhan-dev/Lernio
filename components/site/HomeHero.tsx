import { LinkButton } from "@/components/ui/Button";
import { HomeSearch } from "./HomeSearch";

export function HomeHero() {
  return (
    <section className="border-b border-neutral-200 px-5 pt-14 pb-20 text-center sm:px-8">
      <div className="mx-auto flex w-full max-w-[760px] flex-col items-center">
        <span className="inline-flex items-center rounded-full border border-primary-200 bg-white px-4 py-1.5 text-[11px] font-semibold tracking-[0.15em] text-primary-500 uppercase">
          Intelligent Learning
        </span>
        <h1 className="mt-8 font-display text-hero font-bold text-neutral-900">
          Search your learning
          <br />
          in plain English.
        </h1>
        <p className="mt-6 max-w-[440px] text-body-large leading-7 text-neutral-600">
          Lernio understands what you want to learn and finds the exact lessons across all your
          courses.
        </p>
        <LinkButton
          href="/courses"
          icon="arrow-right"
          iconSize={20}
          className="mt-10 h-14 px-6 text-body-large"
        >
          Explore Courses
        </LinkButton>
        <div className="mt-12 w-full">
          <HomeSearch />
        </div>
      </div>
    </section>
  );
}
