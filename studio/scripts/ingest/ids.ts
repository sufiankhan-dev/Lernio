import { createHash } from 'node:crypto'

import type { ProviderId, VideoProvider } from './types'

/**
 * Turning a lesson's `videoUrl` into the pipeline's identity for a video.
 *
 * AGENTS.md section 9 keys video documents by an id derived from the video URL, one document per
 * unique video. Two lessons pointing at the same video must land on the same `_id`, or the
 * transcript gets duplicated and search sees the same moment twice.
 */

/**
 * The `_id` prefix. Deterministic so `sanity dataset import --replace` replaces these documents
 * on a re-run instead of adding new ones.
 */
export const DOCUMENT_ID_PREFIX = 'video.'

/**
 * Keeps a sanitized key inside Sanity's 128 character document id limit once the prefix and a
 * possible hash are added.
 */
const MAX_KEY_LENGTH = 120

/**
 * Reduces a key to the characters Sanity accepts in an `_id`: letters, digits, dot, underscore
 * and hyphen. A key must also not start with a dot or a hyphen.
 *
 * Truncation is deliberately avoided. Two long keys sharing a prefix would truncate to the same
 * id and one video would silently overwrite the other, so an over-long key keeps a readable head
 * and gains a hash of the full original instead.
 */
export function toDocumentKey(key: string): string {
  let safe = key.replace(/[^A-Za-z0-9._-]/g, '').replace(/^[.-]+/, '')

  if (safe.length > MAX_KEY_LENGTH) {
    const hash = createHash('sha256').update(key).digest('hex').slice(0, 12)
    safe = `${safe.slice(0, MAX_KEY_LENGTH - hash.length - 1)}-${hash}`
  }

  if (!safe) {
    throw new Error(`Video key "${key}" has no characters Sanity accepts in an _id.`)
  }

  return safe
}

/** The document `_id` for a video key, for example `video.youtube-9602Yzvd7ik`. */
export function toDocumentId(key: string): string {
  return `${DOCUMENT_ID_PREFIX}${toDocumentKey(key)}`
}

/** What the pipeline knows about a URL before it fetches anything. */
export type ResolvedVideo = {
  provider: ProviderId
  nativeId: string
  /** The `id` field value, for example `youtube-9602Yzvd7ik`. */
  key: string
  documentId: string
  canonicalUrl: string
}

function parseUrl(videoUrl: string): URL | null {
  let url: URL
  try {
    url = new URL(videoUrl)
  } catch {
    return null
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

  return url
}

/**
 * Matches a URL to a provider adapter and extracts its native video id.
 *
 * Returns null for anything no provider claims, which the caller reports as a skipped URL rather
 * than dropping silently. An unrecognised host is the normal case for a lesson pointing at a
 * provider that has no ingestion adapter yet, so the message says that instead of implying the
 * URL is broken.
 */
export function resolveVideo(
  videoUrl: string,
  providers: VideoProvider[],
): ResolvedVideo | { reason: string } {
  const url = parseUrl(videoUrl)

  if (!url) {
    return { reason: 'Not an http or https URL.' }
  }

  const provider = providers.find((candidate) => candidate.matches(url))

  if (!provider) {
    return {
      reason: `No ingestion adapter for ${url.hostname}. Only ${providers
        .map((candidate) => candidate.id)
        .join(', ')} can be ingested.`,
    }
  }

  const nativeId = provider.nativeId(url)

  if (!nativeId) {
    return { reason: `Malformed ${provider.id} URL: no video id found.` }
  }

  const key = `${provider.id}-${nativeId}`

  return {
    provider: provider.id,
    nativeId,
    key,
    documentId: toDocumentId(key),
    canonicalUrl: provider.canonicalUrl(nativeId),
  }
}

/** Whether a resolution produced a video or a reason. */
export function isResolved(
  value: ResolvedVideo | { reason: string },
): value is ResolvedVideo {
  return 'documentId' in value
}
