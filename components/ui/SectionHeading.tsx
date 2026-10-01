type SectionHeadingProps = {
  number: string;
  label: string;
  className?: string;
};

export function SectionHeading({ number, label, className = "" }: SectionHeadingProps) {
  return (
    <h2 className={`flex items-baseline gap-2.5 ${className}`}>
      <span className="ds-section-label text-primary-500">{number}</span>
      <span className="ds-section-label text-neutral-900">{label}</span>
    </h2>
  );
}
