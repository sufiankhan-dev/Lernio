type ProgressBarProps = {
  value: number;
  label?: string;
  showLabel?: boolean;
  className?: string;
};

export function ProgressBar({ value, label, showLabel = true, className = "" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const text = label ?? `${clamped}% complete`;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={text}
        className="h-1.5 min-w-[120px] flex-1 overflow-hidden rounded-full bg-neutral-200"
      >
        <div className="h-full rounded-full bg-primary-500" style={{ width: `${clamped}%` }} />
      </div>
      {showLabel ? (
        <span className="text-small font-medium text-neutral-700 whitespace-nowrap">{text}</span>
      ) : null}
    </div>
  );
}
