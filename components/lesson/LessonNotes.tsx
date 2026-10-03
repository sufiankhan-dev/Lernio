import {
  PortableText,
  type PortableTextBlock,
  type PortableTextComponents,
} from "@portabletext/react";
import { Icon } from "@/components/ui/Icon";

/**
 * Headings, paragraphs and lists come straight from the Studio schema's Portable
 * Text styles, mapped onto the design system's type scale. Nothing here renders
 * raw HTML, so authored content cannot inject markup.
 */
const components: PortableTextComponents = {
  block: {
    h2: ({ children }) => (
      <h2 className="mt-8 font-display text-heading-2 font-bold text-neutral-900 first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-6 font-display text-heading-3 font-bold text-neutral-900 first:mt-0">
        {children}
      </h3>
    ),
    normal: ({ children }) => (
      <p className="mt-4 max-w-[68ch] text-body-large text-neutral-600 first:mt-0">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mt-4 border-l-2 border-primary-300 pl-4 text-body-large text-neutral-600">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6">{children}</ul>,
    number: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-6">{children}</ol>,
  },
  listItem: {
    bullet: ({ children }) => <li className="text-body-large text-neutral-600">{children}</li>,
    number: ({ children }) => <li className="text-body-large text-neutral-600">{children}</li>,
  },
  marks: {
    link: ({ children, value }) => {
      const href = typeof value?.href === "string" ? value.href : "#";

      return (
        <a
          href={href}
          rel="noopener noreferrer"
          className="text-primary-500 underline underline-offset-2 transition-colors hover:text-primary-600"
        >
          {children}
        </a>
      );
    },
  },
};

type LessonNotesProps = {
  title: string;
  notes: PortableTextBlock[] | null;
};

export function LessonNotes({ title, notes }: LessonNotesProps) {
  if (!notes || notes.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-6">
        <Icon name="document" size={24} className="shrink-0 text-neutral-500" />
        <p className="text-body text-neutral-600">There are no written notes for {title}.</p>
      </div>
    );
  }

  return <PortableText value={notes} components={components} />;
}