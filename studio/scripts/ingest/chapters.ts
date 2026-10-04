import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { Chapter, ChapterSource } from './types'

/**
 * Recovering a video's table of contents.
 *
 * Two sources, in precedence order:
 *
 * 1. An authored override in `scripts/ingest/chapters/<key>.json`. Curated chapter labels are
 *    better than anything scraped, and this is the escape hatch for videos whose description has
 *    no chapter block at all.
 * 2. The provider's own description markers, which is where curated videos keep their chapters.
 *
 * No chapters is a valid outcome. AGENTS.md section 7 makes chapters the first place search looks
 * for a timestamp and the transcript the backstop, so a video with no chapters still resolves
 * moments, just through noisier text.
 */

/**
 * How many entries a description block needs before it is trusted as a chapter list.
 *
 * Three is the number YouTube itself requires before it renders a chapter bar in its player, so a
 * shorter run is far more likely to be a stray timestamp than a real table of contents.
 */
const MIN_DESCRIPTION_CHAPTERS = 3

/** A description timestamp is trusted up to this far past the video's own length. */
const DURATION_TOLERANCE_SECONDS = 5

/** Labels are titles, not sentences. */
const MAX_LABEL_LENGTH = 120

/** `0:00`, `00:00`, `1:02:03`, optionally behind a list bullet. */
const TIMESTAMP_LINE =
  /^\s*(?:[-*•·]\s*)?(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s*(?:[-–—:|•·]\s*)?(.+)$/

/** Separator characters left dangling on a label once the timestamp is gone. */
const EDGE_SEPARATORS = /^[\s\-–—:|•·]+|[\s\-–—:|•·]+$/g

function toSeconds(hours: string | undefined, minutes: string, seconds: string): number {
  return (
    Number(hours ?? 0) * 3600 + Number(minutes) * 60 + Number(seconds)
  )
}

function cleanLabel(raw: string): string {
  const collapsed = raw.replace(/\s+/g, ' ').replace(EDGE_SEPARATORS, '').trim()

  return collapsed.length > MAX_LABEL_LENGTH
    ? collapsed.slice(0, MAX_LABEL_LENGTH).trimEnd()
    : collapsed
}

type ParsedLine = {
  index: number
  chapter: Chapter
}

function parseDescriptionLines(description: string): ParsedLine[] {
  const parsed: ParsedLine[] = []

  const lines = description.split(/\r?\n/)

  for (let index = 0; index < lines.length; index += 1) {
    const match = TIMESTAMP_LINE.exec(lines[index] ?? '')

    if (!match) continue

    const label = cleanLabel(match[4] ?? '')
    if (!label) continue

    parsed.push({
      index,
      chapter: {
        startSeconds: toSeconds(match[1], match[2], match[3]),
        label,
      },
    })
  }

  return parsed
}

/**
 * Picks the longest run of chapter lines that starts at zero and climbs.
 *
 * Descriptions contain timestamps that are not chapters: a "follow me at 3:45" line, a track
 * list, a chapter block followed by links. Requiring the run to begin at `0:00`, to increase
 * strictly, and to hold at least three entries is what separates a real chapter list from the
 * noise around it.
 */
function longestRunFromZero(parsed: ParsedLine[]): Chapter[] {
  let best: Chapter[] = []

  let run: ParsedLine[] = []

  for (let position = 0; position < parsed.length; position += 1) {
    const current = parsed[position]
    const previous = run[run.length - 1]

    const continues =
      previous === undefined ||
      (current.chapter.startSeconds > previous.chapter.startSeconds &&
        current.index === previous.index + 1)

    if (continues) {
      run.push(current)
    } else {
      run = [current]
    }

    const startsAtZero = run[0].chapter.startSeconds === 0

    if (startsAtZero && run.length > best.length) {
      best = run.map((entry) => entry.chapter)
    }
  }

  return best.length >= MIN_DESCRIPTION_CHAPTERS ? best : []
}

/**
 * Chapter markers from a provider description.
 *
 * Returns an empty array when the description has no trustworthy chapter block, or when the block
 * runs past the video's own duration, which means the description was written for a different
 * video or the timestamps are not chapters.
 */
export function parseDescriptionChapters(
  description: string,
  durationSeconds: number | null,
): Chapter[] {
  const chapters = longestRunFromZero(parseDescriptionLines(description))

  if (chapters.length === 0) return []

  const last = chapters[chapters.length - 1]

  if (
    durationSeconds !== null &&
    last.startSeconds > durationSeconds + DURATION_TOLERANCE_SECONDS
  ) {
    return []
  }

  return chapters
}

/** Turns a list of loosely typed entries into validated, ordered chapters. */
function normalizeEntries(
  entries: unknown[],
  origin: string,
  warnings: string[],
): Chapter[] {
  const chapters: Chapter[] = []

  entries.forEach((entry, index) => {
    const startSeconds = (entry as { startSeconds?: unknown })?.startSeconds
    const label = (entry as { label?: unknown })?.label

    if (
      typeof startSeconds !== 'number' ||
      !Number.isInteger(startSeconds) ||
      startSeconds < 0
    ) {
      warnings.push(
        `${origin} entry ${index} has no whole-second startSeconds and was dropped.`,
      )
      return
    }

    if (typeof label !== 'string' || !label.trim()) {
      warnings.push(`${origin} entry ${index} has no label and was dropped.`)
      return
    }

    chapters.push({ startSeconds, label: cleanLabel(label) })
  })

  chapters.sort((a, b) => a.startSeconds - b.startSeconds)

  return chapters
}

/**
 * Reads an authored chapter override from one video's file.
 *
 * Accepts either a bare array or `{ "chapters": [...] }`. Individual entries that are not a
 * non-negative integer second with a non-empty label are reported and dropped rather than failing
 * the whole file, and an override that yields nothing falls through to the description.
 */
export async function readChapterOverride(
  filePath: string,
): Promise<{ chapters: Chapter[]; warnings: string[] }> {
  const origin = `Chapter override ${path.basename(filePath)}`
  const warnings: string[] = []

  let raw: string
  try {
    raw = await readFile(filePath, 'utf8')
  } catch {
    return { chapters: [], warnings }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    return { chapters: [], warnings: [`${origin} is not valid JSON: ${String(error)}`] }
  }

  const entries = Array.isArray(parsed)
    ? parsed
    : (parsed as { chapters?: unknown })?.chapters

  if (!Array.isArray(entries)) {
    return { chapters: [], warnings: [`${origin} has no chapters array.`] }
  }

  return { chapters: normalizeEntries(entries, origin, warnings), warnings }
}

/**
 * Reads a single override file that holds every video's chapters, keyed by video key.
 *
 * `--overwrite-chapters` takes one of these so a one-off run does not have to write into the
 * repository's `chapters` directory. Its entries win over the directory.
 */
export async function readChapterOverrides(
  filePath: string,
): Promise<Map<string, Chapter[]>> {
  const overrides = new Map<string, Chapter[]>()
  const warnings: string[] = []
  const origin = `Chapter file ${path.basename(filePath)}`

  let raw: string
  try {
    raw = await readFile(filePath, 'utf8')
  } catch (error) {
    throw new Error(`${origin} could not be read: ${String(error)}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new Error(`${origin} is not valid JSON: ${String(error)}`)
  }

  const source = (parsed as { chapters?: Record<string, unknown> })?.chapters ?? parsed

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error(`${origin} must be an object keyed by video key.`)
  }

  for (const [key, entries] of Object.entries(source as Record<string, unknown>)) {
    if (!Array.isArray(entries)) continue

    const chapters = normalizeEntries(entries, `${origin} entry "${key}"`, warnings)

    if (chapters.length > 0) overrides.set(key, chapters)
  }

  if (warnings.length > 0) {
    for (const warning of warnings) console.warn(`  warning: ${warning}`)
  }

  return overrides
}

/** Resolves the chapters for one video and records which source won. */
export async function resolveChapters(input: {
  /** The video key, for example `youtube-9602Yzvd7ik`. */
  key: string
  /** The provider's own video id, accepted as a shorter override file name. */
  nativeId: string
  description: string
  durationSeconds: number | null
  /** Directory holding per-video `<key>.json` or `<nativeId>.json` overrides. */
  overrideDir: string
  /** Chapters from `--overwrite-chapters`, which outrank the directory. */
  fileChapters?: Chapter[] | null
}): Promise<{ chapters: Chapter[]; source: ChapterSource; warnings: string[] }> {
  if (input.fileChapters && input.fileChapters.length > 0) {
    return { chapters: input.fileChapters, source: 'override', warnings: [] }
  }

  const warnings: string[] = []

  for (const fileName of [`${input.key}.json`, `${input.nativeId}.json`]) {
    const override = await readChapterOverride(path.join(input.overrideDir, fileName))

    warnings.push(...override.warnings)

    if (override.chapters.length > 0) {
      return { chapters: override.chapters, source: 'override', warnings }
    }
  }

  const described = parseDescriptionChapters(input.description, input.durationSeconds)

  if (described.length > 0) {
    return { chapters: described, source: 'description', warnings }
  }

  return { chapters: [], source: 'none', warnings }
}
