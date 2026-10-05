import type { IconName } from "@/components/ui/Icon";

/**
 * Presentation-only formatters for values the Sanity schemas store raw.
 *
 * `lesson.duration` is whole minutes, `course.level` is a lowercase slug, and
 * `course.studentCount` is a plain integer. Nothing here invents a value: every
 * function turns something the schema guarantees into the string the UI shows.
 */

/** 88 -> "1h 28m", 45 -> "45m", 0 -> "0m". */
export function formatDuration(minutes: number | null | undefined) {
  const total = Math.max(0, Math.round(minutes ?? 0));
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * A position inside a video, as the seconds a search result matched.
 *
 * 765 -> "12:45", 45 -> "0:45", 4520 -> "1:15:20". Minutes and seconds are always
 * zero-padded to two digits so a column of these labels up, which matters because a
 * search result carries several of them at once. Hours appear only when needed.
 */
export function formatTimestamp(seconds: number | null | undefined) {
  const total = Math.max(0, Math.floor(seconds ?? 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const pad = (value: number) => String(value).padStart(2, "0");

  if (hours === 0) return `${minutes}:${pad(secs)}`;
  return `${hours}:${pad(minutes)}:${pad(secs)}`;
}

/** 2100 -> "2.1k", 940 -> "940", 0 -> "0". */
export function formatStudentCount(count: number | null | undefined) {
  const total = Math.max(0, Math.round(count ?? 0));

  if (total < 1000) return String(total);
  if (total < 10_000) return `${(total / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${Math.round(total / 1000)}k`;
}

/** "intermediate" -> "Intermediate". */
export function formatLevel(level: string | null | undefined) {
  if (!level) return "";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

/**
 * `learningOutcome.icon` is a closed list in the Studio schema, so every seeded
 * value resolves. The fallback keeps an unexpected value from crashing the grid.
 */
const LEARNING_OUTCOME_ICONS: Record<string, IconName> = {
  layers: "layers",
  database: "database",
  gauge: "gauge",
  cloud: "cloud",
  code: "code",
  rocket: "rocket",
  shield: "shield",
  zap: "zap",
};

export function learningOutcomeIcon(icon: string | null | undefined): IconName {
  return (icon && LEARNING_OUTCOME_ICONS[icon]) || "layers";
}

/**
 * `lessonResource.type` is a closed list in the Studio schema, so every seeded
 * value resolves. The fallback keeps an unexpected value from crashing the grid.
 */
const RESOURCE_ICONS: Record<string, IconName> = {
  documentation: "document",
  article: "document",
  guide: "document",
  repository: "code",
  video: "play-circle",
  tool: "grid",
  other: "external-link",
};

export function resourceIcon(type: string | null | undefined): IconName {
  return (type && RESOURCE_ICONS[type]) || "external-link";
}