import { readFile } from 'node:fs/promises'

import { apiVersion, dataset, projectId } from '../../env'

/**
 * Discovering which videos to ingest.
 *
 * The pipeline reads the dataset rather than a checked-in manifest, because the set of videos
 * that matter is defined by what lessons actually reference. A manifest would drift; this cannot.
 * It also gives the dedupe that AGENTS.md section 9 asks for for free: three lessons sharing a
 * video collapse to one document.
 *
 * Reads only, with the server-only token. The dataset is never written from here; the output file
 * is applied later by `sanity dataset import`.
 */

export type DiscoveredUrls = {
  /** How the URLs were found, so the report can say when the dataset was skipped. */
  source: 'dataset' | 'file'
  /** Lessons scanned, or null when reading from a file. */
  lessonCount: number | null
  urls: string[]
}

const QUERY = `{
  "lessonCount": count(*[_type == "lesson"]),
  "urls": array::unique(*[_type == "lesson" && defined(videoUrl)].videoUrl)
}`

/**
 * Every distinct `lesson.videoUrl` in the dataset.
 *
 * Uses the query API directly rather than a client library so the pipeline has no dependency
 * beyond Node's own fetch, and so the one request it makes is visible in the code.
 */
export async function discoverFromDataset(): Promise<DiscoveredUrls> {
  const token = process.env.SANITY_API_READ_TOKEN

  if (!token) {
    throw new Error(
      'SANITY_API_READ_TOKEN is not set. Pass --urls <file> to ingest without reading the dataset.',
    )
  }

  const url = new URL(
    `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`,
  )
  url.searchParams.set('query', QUERY)

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) {
    throw new Error(
      `Sanity query failed with ${response.status} ${response.statusText}. Check the token and dataset.`,
    )
  }

  const body = (await response.json()) as {
    result?: { lessonCount?: number; urls?: unknown }
  }

  const result = body.result ?? {}
  const urls = Array.isArray(result.urls)
    ? result.urls.filter((url): url is string => typeof url === 'string' && url.length > 0)
    : []

  return {
    source: 'dataset',
    lessonCount: typeof result.lessonCount === 'number' ? result.lessonCount : null,
    urls,
  }
}

/**
 * URLs from a newline-delimited file, for running the pipeline without dataset access.
 *
 * Blank lines and `#` comments are ignored, so the file can be a hand-written scratch list.
 */
export async function discoverFromFile(filePath: string): Promise<DiscoveredUrls> {
  const raw = await readFile(filePath, 'utf8')

  const urls = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))

  return { source: 'file', lessonCount: null, urls }
}
