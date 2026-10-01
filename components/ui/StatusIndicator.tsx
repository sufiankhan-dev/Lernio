import { Icon, type IconName } from "./Icon";

export type StatusName = "in-progress" | "completed" | "now-playing" | "locked";

type StatusIndicatorProps = {
  status: StatusName;
  label?: string;
  className?: string;
};

const config: Record<StatusName, { icon: IconName; className: string }> = {
  "in-progress": { icon: "play-circle", className: "text-primary-500" },
  completed: { icon: "check-circle", className: "text-success-700" },
  "now-playing": { icon: "play-square", className: "text-primary-500" },
  locked: { icon: "lock", className: "text-neutral-500" },
};

const defaultLabels: Record<StatusName, string> = {
  "in-progress": "In Progress",
  completed: "Completed",
  "now-playing": "Now Playing",
  locked: "Locked",
};

export function StatusIndicator({ status, label, className = "" }: StatusIndicatorProps) {
  const { icon, className: tone } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 text-body font-medium text-neutral-700 ${className}`}>
      <Icon name={icon} size={16} className={tone} variant="outline" />
      <span>{label ?? defaultLabels[status]}</span>
    </span>
  );
}
