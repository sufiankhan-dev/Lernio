import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { CourseCard, LessonCard, ResourceCard } from "@/components/ui/Card";
import { SearchField, SelectField } from "@/components/ui/Field";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Breadcrumbs, SiteNav } from "@/components/ui/Nav";
import { Pagination } from "@/components/ui/Pagination";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import styles from "./design-system.module.css";

const primarySwatches = [
  { name: "Primary 500", hex: "#FB7316", className: "bg-primary-500" },
  { name: "Primary 400", hex: "#FB923C", className: "bg-primary-400" },
  { name: "Primary 300", hex: "#FDBA74", className: "bg-primary-300" },
  { name: "Primary 200", hex: "#FED7AA", className: "bg-primary-200" },
  { name: "Primary 100", hex: "#FFEEE5", className: "bg-primary-100" },
];

const neutralSwatches = [
  { name: "Neutral 900", hex: "#0F172A", className: "bg-neutral-900" },
  { name: "Neutral 700", hex: "#334155", className: "bg-neutral-700" },
  { name: "Neutral 500", hex: "#64748B", className: "bg-neutral-500" },
  { name: "Neutral 300", hex: "#CBD5E1", className: "bg-neutral-300" },
  { name: "Neutral 200", hex: "#E2E8F0", className: "bg-neutral-200" },
  { name: "Neutral 100", hex: "#F1F5F9", className: "bg-neutral-100" },
  { name: "Neutral 50", hex: "#FAFCFF", className: "bg-neutral-50" },
  { name: "White", hex: "#FFFFFF", className: "bg-white" },
];

const typeScale = [
  { style: "Display 1", font: "Playfair Display", size: "48 / 56", weight: "Bold", use: "Page titles" },
  { style: "Display 2", font: "Playfair Display", size: "36 / 44", weight: "Bold", use: "Section titles" },
  { style: "Heading 1", font: "Inter", size: "28 / 36", weight: "SemiBold", use: "Card titles" },
  { style: "Heading 2", font: "Inter", size: "22 / 30", weight: "SemiBold", use: "Sub section" },
  { style: "Heading 3", font: "Inter", size: "18 / 26", weight: "Medium", use: "Small titles" },
  { style: "Body Large", font: "Inter", size: "16 / 24", weight: "Regular", use: "Body copy" },
  { style: "Body", font: "Inter", size: "14 / 20", weight: "Regular", use: "Supporting text" },
  { style: "Small", font: "Inter", size: "12 / 16", weight: "Regular", use: "Captions, meta" },
];

const spacing = [
  { px: 4, rem: "0.25rem" },
  { px: 8, rem: "0.5rem" },
  { px: 12, rem: "0.75rem" },
  { px: 16, rem: "1rem" },
  { px: 24, rem: "1.5rem" },
  { px: 32, rem: "2rem" },
  { px: 40, rem: "2.5rem" },
  { px: 48, rem: "3rem" },
  { px: 64, rem: "4rem" },
];

const radii = [
  { label: "4px", note: "xs", className: "rounded-xs" },
  { label: "8px", note: "sm", className: "rounded-sm" },
  { label: "12px", note: "md", className: "rounded-md" },
  { label: "16px", note: "lg", className: "rounded-lg" },
  { label: "24px", note: "xl", className: "rounded-xl" },
  { label: "Full", note: "circle", className: "rounded-full" },
];

const shadows = [
  { name: "Sm", spec: "0 1px 2px 0\nrgba(15, 23, 42, 0.05)", className: "shadow-sm" },
  { name: "Md", spec: "0 4px 12px -2px\nrgba(15, 23, 42, 0.08)", className: "shadow-md" },
  { name: "Lg", spec: "0 12px 24px -4px\nrgba(15, 23, 42, 0.10)", className: "shadow-lg" },
  { name: "Xl", spec: "0 20px 40px -8px\nrgba(15, 23, 42, 0.12)", className: "shadow-xl" },
];

const icons: IconName[] = [
  "bell",
  "search",
  "play-circle",
  "document",
  "bookmark",
  "chart",
  "clock",
  "user",
  "chevron-right",
];

const principles = [
  { icon: "eye", title: "Clarity First", copy: "Every element should communicate clearly." },
  { icon: "grid", title: "Consistency", copy: "Use components and patterns consistently across the platform." },
  { icon: "target", title: "Focus & Calm", copy: "Remove noise and help learners focus on what matters." },
  { icon: "accessible", title: "Accessibility", copy: "Design with accessibility and inclusivity in mind." },
];

function Swatches({ items }: { items: typeof primarySwatches }) {
  return (
    <div className={styles.swatchGrid}>
      {items.map((item) => (
        <div key={item.hex}>
          <div className={`${styles.swatch} ${item.className}`} />
          <p className="mt-2 text-small font-medium text-neutral-900">{item.name}</p>
          <p className={styles.code}>{item.hex}</p>
        </div>
      ))}
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className={styles.grid} style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <section className={`${styles.panel} ${styles.hero}`}>
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" width={34} height={34} aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="6" fill="#FB7316" />
                <path d="M8 6.5h2.6v8.9H16V18H8z" fill="#fff" />
              </svg>
              <span className="font-display text-heading-1 font-bold tracking-tight text-neutral-900">
                Lernio
              </span>
            </div>
            <h1 className="font-display text-display-2 font-bold leading-[2.75rem] text-neutral-900">
              Design System
            </h1>
            <p className="text-body leading-5 text-neutral-500">
              A unified design language for the Lernio learning platform. Clean, modern and focused
              on clarity, consistency and intuitive learning experiences.
            </p>
            <p className="ds-section-label mt-2 text-neutral-500">
              Version 1.0 <span className="mx-1 text-primary-500">•</span> May 2025
            </p>
          </section>

          <section className={styles.panel}>
            <SectionHeading number="01" label="Colors" className="mb-5" />
            <div className="space-y-5">
              <div>
                <p className="mb-2.5 text-body font-medium text-neutral-900">Primary</p>
                <Swatches items={primarySwatches} />
              </div>
              <div>
                <p className="mb-2.5 text-body font-medium text-neutral-900">Neutral</p>
                <Swatches items={neutralSwatches} />
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <section className={styles.panel}>
            <SectionHeading number="02" label="Typography" className="mb-6" />
            <div className="space-y-7">
              <div className="flex items-center gap-8">
                <span className={`${styles.specimen} font-display`}>Ag</span>
                <div>
                  <p className="text-heading-2 font-display font-semibold text-neutral-900">
                    Playfair Display
                  </p>
                  <p className="mt-1.5 text-body text-neutral-500">
                    Elegant{" "}
                    <span className="mx-0.5 text-primary-500">•</span> Readable{" "}
                    <span className="mx-0.5 text-primary-500">•</span> Timeless
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <span className={`${styles.specimen} font-sans font-medium`}>Ag</span>
                <div>
                  <p className="text-heading-2 font-semibold text-neutral-900">Inter</p>
                  <p className="mt-1.5 text-body text-neutral-500">
                    Clean <span className="mx-0.5 text-primary-500">•</span> Modern{" "}
                    <span className="mx-0.5 text-primary-500">•</span> Highly legible
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <SectionHeading number="03" label="Type Scale" className="mb-4" />
            <div className={styles.tableScroll}>
              <table className={styles.typeScale}>
                <thead>
                  <tr>
                    <th scope="col">Style</th>
                    <th scope="col">Font</th>
                    <th scope="col">Size / Line Height</th>
                    <th scope="col">Weight</th>
                    <th scope="col">Use</th>
                  </tr>
                </thead>
                <tbody>
                  {typeScale.map((row) => (
                    <tr key={row.style}>
                      <td>{row.style}</td>
                      <td>{row.font}</td>
                      <td>{row.size}</td>
                      <td>{row.weight}</td>
                      <td>{row.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section className={styles.panel}>
            <SectionHeading number="04" label="Spacing System" className="mb-1" />
            <p className="mb-5 text-body text-neutral-500">Base unit: 4px</p>
            <div className={styles.spacingRow}>
              {spacing.map((step) => (
                <div key={step.px} className="flex flex-col items-center gap-2">
                  <div
                    className={styles.spacingBlock}
                    style={{ width: `${step.px}px`, height: `${step.px}px` }}
                  />
                  <span className="text-small font-medium text-neutral-900">{step.px}</span>
                  <span className={styles.code}>({step.rem})</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <SectionHeading number="05" label="Radius & Shadows" className="mb-5" />
            <p className="mb-3 text-body font-medium text-neutral-900">Radius</p>
            <div className={`${styles.radiusRow} mb-6`}>
              {radii.map((radius) => (
                <div key={radius.label} className="text-center">
                  <div className={`${styles.radiusBox} ${radius.className}`} />
                  <p className="mt-2 text-small font-medium text-neutral-900">{radius.label}</p>
                  <p className={styles.code}>({radius.note})</p>
                </div>
              ))}
            </div>
            <p className="mb-3 text-body font-medium text-neutral-900">Shadows</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {shadows.map((shadow) => (
                <div key={shadow.name} className={`${styles.shadowBox} ${shadow.className}`}>
                  <p className="text-body font-semibold text-neutral-900">{shadow.name}</p>
                  <p className={`${styles.code} mt-1 whitespace-pre-line`}>{shadow.spec}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <section className={styles.panel}>
            <SectionHeading number="06" label="Icons" className="mb-5" />
            <p className="mb-2.5 text-body font-medium text-neutral-900">Outline Style</p>
            <div className={`${styles.iconRow} mb-5 text-neutral-900`}>
              {icons.map((name) => (
                <Icon key={`o-${name}`} name={name} />
              ))}
            </div>
            <p className="mb-2.5 text-body font-medium text-neutral-900">Filled Style</p>
            <div className={`${styles.iconRow} mb-5 text-neutral-900`}>
              {icons.map((name) => (
                <Icon key={`f-${name}`} name={name} variant="filled" />
              ))}
            </div>
            <p className="mb-1.5 text-body font-medium text-neutral-900">Icon Specs</p>
            <ul className={styles.specList}>
              <li>24x24px grid</li>
              <li>2px stroke width (outline)</li>
              <li>Rounded line caps</li>
              <li>Consistent optical balance</li>
            </ul>
          </section>

          <section className={styles.panel}>
            <SectionHeading number="07" label="Buttons" className="mb-5" />
            <div className="mb-2 grid grid-cols-4 gap-2 text-small text-neutral-500">
              <span>Primary</span>
              <span>Secondary</span>
              <span>Tertiary</span>
              <span>Text</span>
            </div>
            {[
              { label: "Default", state: "" },
              { label: "Hover", state: "hover:bg-primary-600" },
              { label: "Disabled", state: "disabled" },
            ].map((row) => (
              <div key={row.label} className="mb-3">
                <p className="mb-1.5 text-small text-neutral-500">{row.label}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {row.state === "disabled" ? (
                    <>
                      <Button disabled>Get Started</Button>
                      <Button variant="secondary" disabled>
                        Explore Courses
                      </Button>
                      <Button variant="tertiary" disabled icon="external-link">
                        View Lesson
                      </Button>
                      <Button variant="text" disabled icon="play-circle">
                        Watch Video
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button className={row.state}>Get Started</Button>
                      <Button variant="secondary" className={row.state}>
                        Explore Courses
                      </Button>
                      <Button variant="tertiary" icon="external-link">
                        View Lesson
                      </Button>
                      <Button variant="text" icon="play-circle">
                        Watch Video
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            <p className="mb-1.5 text-body font-medium text-neutral-900">Button Specs</p>
            <ul className={styles.specList}>
              <li>Height: 44px (default)</li>
              <li>Padding: 0 16px (lg), 0 12px (md)</li>
              <li>Radius: 12px</li>
              <li>Font: Inter Medium (14–16px)</li>
            </ul>
          </section>

          <section className={styles.panel}>
            <SectionHeading number="08" label="Inputs" className="mb-5" />
            <p className="mb-2 text-body font-medium text-neutral-900">Search / Text Input</p>
            <SearchField placeholder="Search anything..." hint="⌘K" className="mb-5" />
            <p className="mb-2 text-body font-medium text-neutral-900">Select</p>
            <SelectField defaultValue="most-relevant" className="mb-5">
              <option value="most-relevant">Most Relevant</option>
              <option value="newest">Newest</option>
              <option value="shortest">Shortest</option>
            </SelectField>
            <p className="mb-1.5 text-body font-medium text-neutral-900">Field Specs</p>
            <ul className={styles.specList}>
              <li>Height: 44px</li>
              <li>Radius: 12px</li>
              <li>Border: 1px solid #E2E8F0</li>
              <li>Padding: 0 16px</li>
              <li>Focus: Border color #FB923C</li>
            </ul>
          </section>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <section className={styles.panel}>
            <SectionHeading number="09" label="Badges / Tags" className="mb-5" />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="mb-2 text-small text-neutral-500">Video</p>
                <Badge variant="video">Video</Badge>
              </div>
              <div>
                <p className="mb-2 text-small text-neutral-500">Lesson</p>
                <Badge variant="lesson">Lesson</Badge>
              </div>
              <div>
                <p className="mb-2 text-small text-neutral-500">Popular</p>
                <Badge variant="popular">Popular</Badge>
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <SectionHeading number="10" label="Status / Indicators" className="mb-5" />
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <StatusIndicator status="in-progress" />
              <StatusIndicator status="completed" />
              <StatusIndicator status="now-playing" />
              <StatusIndicator status="locked" />
            </div>
          </section>

          <section className={styles.panel}>
            <SectionHeading number="11" label="Progress Bar" className="mb-8 pt-1" />
            <ProgressBar value={35} />
          </section>
        </div>

        <section className={styles.panel}>
          <SectionHeading number="12" label="Cards" className="mb-5" />
          <div className={styles.cardGrid}>
            <CourseCard
              title="Next.js for Production"
              description="Build scalable, high-performance web applications with Next.js."
              level="Intermediate"
              duration="18h 24m"
              modules="12 modules"
              logo="N"
            />
            <LessonCard
              badge="video"
              title="Data Fetching in Server Components"
              description="Learn how to fetch data on the server using async/await and Next.js best practices."
              meta="Lesson 5.1 · 12:45"
              action="Watch from 12:45"
              actionIcon="play-circle"
            />
            <LessonCard
              badge="lesson"
              title="Data Fetching & Caching"
              description="Explore different data fetching methods in Next.js and how to cache and revalidate data for optimal performance."
              meta="Module 5"
              action="View lesson"
            />
            <ResourceCard
              title="Caching and Revalidation Guide"
              description="Deep dive into Next.js caching strategies."
              meta="PDF · 1.2 MB"
            />
          </div>
        </section>

        <div className="grid gap-3 lg:grid-cols-3">
          <section className={styles.panel}>
            <SectionHeading number="13" label="Navigation" className="mb-5" />
            <SiteNav
              links={[
                { label: "Courses", active: true },
                { label: "My Learning" },
              ]}
            />
          </section>

          <section className={styles.panel}>
            <p className="mb-4 text-body font-medium text-neutral-900">Breadcrumbs</p>
            <Breadcrumbs
              items={["All Courses", "Next.js for Production", "Data Fetching & Caching"]}
            />
          </section>

          <section className={styles.panel}>
            <p className="mb-4 text-body font-medium text-neutral-900">Pagination</p>
            <Pagination page={1} total={8} />
          </section>
        </div>

        <section className={styles.panel}>
          <SectionHeading number="14" label="Principles" className="mb-6" />
          <div className={styles.principleGrid}>
            {principles.map((principle) => (
              <div key={principle.title} className={styles.principle}>
                <Icon name={principle.icon as IconName} size={26} className="shrink-0 text-neutral-700" />
                <div>
                  <p className="text-body font-semibold text-neutral-900">{principle.title}</p>
                  <p className="mt-1 text-body text-neutral-500">{principle.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="mt-8 flex justify-center gap-3 pb-2">
        <LinkButton variant="tertiary" icon="external-link">
          Open Storybook
        </LinkButton>
      </footer>
    </main>
  );
}
