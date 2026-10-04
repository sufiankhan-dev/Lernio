import type { ChunkOptions, Cue } from './types'

/**
 * Splitting a transcript into short timestamped pieces.
 *
 * AGENTS.md section 9 requires the transcript to be stored as many short timestamped chunks and
 * section 12 warns against ever handing a whole transcript to the model, so this is the boundary
 * that keeps the context window safe: a query against `chunks` returns a few matching pieces, not
 * the full text of a lecture.
 *
 * Chunks also have to be *seekable*. A piece that spans an ad break or a long pause is a bad
 * thing to send a learner to, so a gap over `maxGapSeconds` always starts a new chunk.
 */

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = {
  targetSeconds: 30,
  targetChars: 600,
  maxChars: 900,
  maxGapSeconds: 10,
}

/**
 * Cleans the raw caption cues into something worth storing.
 *
 * Auto-generated captions repeat words, pad with whitespace and occasionally go backwards in time,
 * all of which produce overlapping or duplicated chunks. Dropping them here keeps the stored
 * transcript honest about what was said and when.
 */
function normalizeCues(cues: Cue[]): Cue[] {
  const seen = new Set<string>()
  const normalized: Cue[] = []

  let previousStart = -1

  for (const cue of cues) {
    const text = cue.text.replace(/\s+/g, ' ').trim()

    if (!text) continue
    if (!Number.isFinite(cue.startSeconds) || cue.startSeconds < 0) continue
    if (cue.startSeconds < previousStart) continue

    const startSeconds = Math.floor(cue.startSeconds)
    const endSeconds = Math.max(startSeconds, Math.floor(cue.endSeconds || startSeconds))

    const fingerprint = `${startSeconds}:${text.toLowerCase()}`
    if (seen.has(fingerprint)) continue

    seen.add(fingerprint)
    previousStart = startSeconds

    normalized.push({ startSeconds, endSeconds, text })
  }

  return normalized
}

/**
 * Breaks a single oversized cue at the sentence boundary nearest the limit.
 *
 * Without this a single dense cue could exceed `maxChars` on its own and there would be no later
 * cue to trigger a close, so the cap would never be enforced. A cue with no sentence boundary is
 * hard-cut, because a chunk over the cap is worse than an arbitrary cut.
 */
function splitText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]

  const pieces: string[] = []
  let rest = text

  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars)
    const boundary = Math.max(
      window.lastIndexOf('. '),
      window.lastIndexOf('? '),
      window.lastIndexOf('! '),
    )

    const cut = boundary > maxChars * 0.4 ? boundary + 1 : maxChars
    pieces.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }

  if (rest) pieces.push(rest)

  return pieces.filter(Boolean)
}

function makeChunk(startSeconds: number, parts: string[]): Cue {
  return {
    startSeconds,
    endSeconds: 0,
    text: parts.join(' ').replace(/\s+/g, ' ').trim(),
  }
}

/**
 * Groups cues into chunks.
 *
 * A chunk closes as soon as it reaches `targetSeconds` or `targetChars`, or as soon as the next
 * cue sits more than `maxGapSeconds` away. The closing second is the last cue's end, which is what
 * a result's clip length is measured against.
 */
export function buildChunks(
  cues: Cue[],
  options: ChunkOptions = DEFAULT_CHUNK_OPTIONS,
): Cue[] {
  const normalized = normalizeCues(cues)

  if (normalized.length === 0) return []

  const chunks: Cue[] = []

  let parts: string[] = []
  let startSeconds = normalized[0].startSeconds
  let lastEnd = normalized[0].endSeconds
  let length = 0

  const close = () => {
    if (parts.length === 0) return

    const chunk = makeChunk(startSeconds, parts)
    chunk.endSeconds = lastEnd
    chunks.push(chunk)

    parts = []
    length = 0
  }

  for (const cue of normalized) {
    const gap = cue.startSeconds - lastEnd
    const wouldBeLength = length + cue.text.length + (parts.length > 0 ? 1 : 0)
    const coversSeconds = lastEnd - startSeconds >= options.targetSeconds

    if (parts.length > 0 && (gap > options.maxGapSeconds || coversSeconds || wouldBeLength > options.targetChars)) {
      close()
    }

    if (parts.length === 0) {
      startSeconds = cue.startSeconds
    }

    for (const piece of splitText(cue.text, options.maxChars)) {
      parts.push(piece)
      length += piece.length + (parts.length > 1 ? 1 : 0)
    }

    lastEnd = cue.endSeconds
  }

  close()

  return mergeTrailingFragment(chunks, options)
}

/**
 * Folds a too-short final chunk back into the one before it.
 *
 * Auto-captions often end a video with a two-word sign-off. On its own that is a chunk that
 * matches almost nothing and reads badly in a result card, so it is merged when there is room.
 */
function mergeTrailingFragment(chunks: Cue[], options: ChunkOptions): Cue[] {
  if (chunks.length < 2) return chunks

  const last = chunks[chunks.length - 1]
  const previous = chunks[chunks.length - 2]

  if (last.text.length > options.targetChars / 4) return chunks
  if (previous.text.length + last.text.length + 1 > options.maxChars) return chunks

  previous.text = `${previous.text} ${last.text}`.trim()
  previous.endSeconds = Math.max(previous.endSeconds, last.endSeconds)

  return chunks.slice(0, -1)
}
