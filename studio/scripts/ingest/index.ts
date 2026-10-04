import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { resolveChapters, readChapterOverrides } from './chapters'
import { buildChunks, DEFAULT_CHUNK_OPTIONS } from './chunk'
import { isResolved, resolveVideo } from './ids'
import { discoverFromDataset, discoverFromFile } from './sources'
import type {
  BuiltMeta,
  Chapter,
  ChunkOptions,
  IngestOutcome,
  VideoDocument,
  VideoProvider,
} from './types'
import { youtubeProvider } from './youtube'

/**
 * The offline video ingestion pipeline.
 *
 * Reads the video URLs lessons reference, fetches each video's captions, splits the transcript
 * into short timestamped chunks, recovers chapter markers, and writes `video` documents as NDJSON
 * for `sanity dataset import --replace`.
 *
 * It runs from a terminal and never from a request. It holds no write credential: the only thing it
 * changes on disk is the output file, and the dataset changes only when someone runs the import.
 * See AGENTS.md section 9.
 */

const PROVIDERS: VideoProvider[] = [youtubeProvider]

const DEFAULT_OUT = path.join(__dirname, 'out', 'videos.ndjson')
const OVERRIDE_DIR = path.join(__dirname, 'chapters')
const DEFAULT_CONCURRENCY = 3

/**
 * A document over this size is refused rather than written.
 *
 * The transcript is stored as many small chunks precisely so nothing large is fetched wholesale, so
 * a single video producing a megabyte of chunks means the chunker misbehaved. Failing loudly beats
 * landing a partial transcript that looks complete.
 */
const MAX_DOCUMENT_BYTES = 1_000_000

type Options = {
  out: string
  dryRun: boolean
  urlsFile: string | null
  only: string | null
  limit: number | null
  concurrency: number
  skipFailures: boolean
  chaptersFile: string | null
  chunk: ChunkOptions
}

function usage(): string {
  return `Build Lernio video documents from provider captions.

Usage: npm run ingest:videos -- [options]

  --out <path>              NDJSON output. Default scripts/ingest/out/videos.ndjson
  --dry-run                 Fetch and build everything, print the report, write nothing
  --urls <file>             Read video URLs from a file instead of the dataset
  --only <videoId>          Ingest just this video id or key, for example 9602Yzvd7ik
  --limit <n>               Ingest at most n videos
  --concurrency <n>         Parallel provider requests. Default ${DEFAULT_CONCURRENCY}
  --skip-failures           Keep going after a video fails. Still exits non-zero
  --overwrite-chapters <f>  JSON of { "<video key>": [{ startSeconds, label }] } to use first

Chunk size can be tuned with CHUNK_TARGET_SECONDS, CHUNK_TARGET_CHARS and CHUNK_MAX_GAP_SECONDS.

Import the result with: npm run videos:import`
}

function parsePositiveInt(value: string | undefined, flag: string): number {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} needs a whole number greater than zero.`)
  }

  return parsed
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]

  if (!raw) return fallback

  const parsed = Number(raw)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    out: DEFAULT_OUT,
    dryRun: false,
    urlsFile: null,
    only: null,
    limit: null,
    concurrency: DEFAULT_CONCURRENCY,
    skipFailures: false,
    chaptersFile: null,
    chunk: {
      targetSeconds: envInt('CHUNK_TARGET_SECONDS', DEFAULT_CHUNK_OPTIONS.targetSeconds),
      targetChars: envInt('CHUNK_TARGET_CHARS', DEFAULT_CHUNK_OPTIONS.targetChars),
      maxChars: Math.max(
        envInt('CHUNK_MAX_CHARS', DEFAULT_CHUNK_OPTIONS.maxChars),
        envInt('CHUNK_TARGET_CHARS', DEFAULT_CHUNK_OPTIONS.targetChars),
      ),
      maxGapSeconds: envInt('CHUNK_MAX_GAP_SECONDS', DEFAULT_CHUNK_OPTIONS.maxGapSeconds),
    },
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = (): string => {
      const value = argv[index + 1]

      if (value === undefined || value.startsWith('--')) {
        throw new Error(`${arg} needs a value.`)
      }

      index += 1

      return value
    }

    switch (arg) {
      case '--out':
        options.out = path.resolve(next())
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--urls':
        options.urlsFile = path.resolve(next())
        break
      case '--only':
        options.only = next()
        break
      case '--limit':
        options.limit = parsePositiveInt(next(), '--limit')
        break
      case '--concurrency':
        options.concurrency = parsePositiveInt(next(), '--concurrency')
        break
      case '--skip-failures':
        options.skipFailures = true
        break
      case '--overwrite-chapters':
        options.chaptersFile = path.resolve(next())
        break
      case '--help':
      case '-h':
        console.log(usage())
        process.exit(0)
        break
      default:
        throw new Error(`Unknown flag: ${arg}`)
    }
  }

  return options
}

/** Serialises one document with array keys derived from position, so a re-run is byte-identical. */
function serialize(document: VideoDocument): string {
  return JSON.stringify({
    _id: document._id,
    _type: document._type,
    id: document.id,
    url: document.url,
    title: document.title,
    chapters: document.chapters.map((chapter, index) => ({
      _key: `chapter-${index}`,
      _type: 'videoChapter',
      startSeconds: chapter.startSeconds,
      label: chapter.label,
    })),
    chunks: document.chunks.map((chunk, index) => ({
      _key: `chunk-${index}`,
      _type: 'videoChunk',
      startSeconds: chunk.startSeconds,
      text: chunk.text,
    })),
  })
}

async function ingestOne(
  videoUrl: string,
  providers: VideoProvider[],
  options: Options,
  fileChapters: Map<string, Chapter[]>,
): Promise<IngestOutcome> {
  const resolved = resolveVideo(videoUrl, providers)

  if (!isResolved(resolved)) {
    throw new Error(resolved.reason)
  }

  const provider = providers.find((candidate) => candidate.id === resolved.provider)

  if (!provider) {
    return {
      status: 'failed',
      videoUrl,
      reason: `No adapter registered for ${resolved.provider}.`,
    }
  }

  const result = await provider.fetch(resolved.nativeId)

  const chunks = buildChunks(result.cues, options.chunk)

  if (chunks.length === 0) {
    throw new Error('The transcript produced no chunks. Refusing to store an empty transcript.')
  }

  const { chapters, source, warnings } = await resolveChapters({
    key: resolved.key,
    nativeId: resolved.nativeId,
    description: result.description,
    durationSeconds: result.durationSeconds,
    overrideDir: OVERRIDE_DIR,
    fileChapters: fileChapters.get(resolved.key) ?? null,
  })

  for (const warning of warnings) {
    console.warn(`  warning: ${resolved.key}: ${warning}`)
  }

  const document: VideoDocument = {
    _id: resolved.documentId,
    _type: 'video',
    id: resolved.key,
    url: resolved.canonicalUrl,
    title: result.title,
    chapters,
    chunks,
  }

  const bytes = Buffer.byteLength(serialize(document), 'utf8')

  if (bytes > MAX_DOCUMENT_BYTES) {
    throw new Error(
      `The document is ${bytes} bytes, over the ${MAX_DOCUMENT_BYTES} byte limit. Refusing to store a partial transcript.`,
    )
  }

  const first = chunks[0].startSeconds
  const last = chunks[chunks.length - 1]

  return {
    status: 'built',
    document,
    meta: {
      videoId: resolved.key,
      title: result.title,
      durationSeconds: result.durationSeconds,
      chapterCount: chapters.length,
      chapterSource: source,
      chunkCount: chunks.length,
      coveredSeconds: Math.max(0, last.endSeconds - first),
      captionTrack: result.captionTrack,
      bytes,
    },
  }
}

/**
 * Runs every video through the pipeline with a fixed number of workers.
 *
 * A small pool rather than one request per video at once: ingesting a whole catalog is a few
 * hundred requests and asking for all of them simultaneously is how a run gets rate limited.
 */
async function ingestAll(
  candidates: Array<{ videoUrl: string; key: string }>,
  providers: VideoProvider[],
  options: Options,
  fileChapters: Map<string, Chapter[]>,
): Promise<IngestOutcome[]> {
  const outcomes: IngestOutcome[] = []
  const queue = [...candidates]
  const total = queue.length
  let completed = 0

  const worker = async (): Promise<void> => {
    for (let candidate = queue.shift(); candidate !== undefined; candidate = queue.shift()) {
      const { videoUrl, key } = candidate

      try {
        outcomes.push(await ingestOne(videoUrl, providers, options, fileChapters))
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)

        if (!options.skipFailures) throw new Error(`${key}: ${reason}`)

        outcomes.push({ status: 'failed', videoUrl, reason })
      }

      completed += 1

      const last = outcomes[outcomes.length - 1]

      if (last.status === 'built') {
        reportProgress(completed, total, last.meta)
      } else {
        console.log(`[${pad(completed)}/${pad(total)}] ${key.padEnd(24)} ${last.status.toUpperCase()}  ${last.reason}`)
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(options.concurrency, Math.max(1, total)) }, worker),
  )

  return outcomes
}

function pad(value: number): string {
  return String(value).padStart(3, ' ')
}

function shortUrl(videoUrl: string): string {
  return videoUrl.length > 60 ? `${videoUrl.slice(0, 57)}...` : videoUrl
}

function reportProgress(completed: number, total: number, meta: BuiltMeta): void {
  const chapters =
    meta.chapterCount === 0
      ? 'chapters   0 (none)'
      : `chapters ${String(meta.chapterCount).padStart(3)} (${meta.chapterSource})`

  console.log(
    `[${pad(completed)}/${pad(total)}] ${meta.videoId.padEnd(24)} ${chapters}  chunks ${String(meta.chunkCount).padStart(3)}  ${String(meta.coveredSeconds).padStart(5)}s  ${meta.captionTrack}`,
  )
}

async function main(): Promise<number> {
  const options = parseArgs(process.argv.slice(2))

  const discovered = options.urlsFile
    ? await discoverFromFile(options.urlsFile)
    : await discoverFromDataset()

  console.log(
    discovered.source === 'dataset'
      ? `Found ${discovered.lessonCount ?? 0} lessons in the dataset.`
      : `Reading video URLs from ${path.basename(options.urlsFile ?? '')}. The dataset was not consulted.`,
  )

  const fileChapters = options.chaptersFile
    ? await readChapterOverrides(options.chaptersFile)
    : new Map<string, Chapter[]>()

  const seen = new Set<string>()
  const candidates: Array<{ videoUrl: string; key: string }> = []
  const skipped: Array<{ videoUrl: string; reason: string }> = []

  for (const videoUrl of discovered.urls) {
    const resolved = resolveVideo(videoUrl, PROVIDERS)

    if (!isResolved(resolved)) {
      skipped.push({ videoUrl, reason: resolved.reason })
      continue
    }

    // Two lessons pointing at the same video must produce one document.
    if (seen.has(resolved.key)) continue

    seen.add(resolved.key)
    candidates.push({ videoUrl, key: resolved.key })
  }

  for (const entry of skipped) {
    console.log(`  skipped ${shortUrl(entry.videoUrl)}  ${entry.reason}`)
  }

  let selected = candidates

  if (options.only) {
    const wanted = options.only.toLowerCase()

    selected = candidates.filter((candidate) => candidate.key.toLowerCase().includes(wanted))

    if (selected.length === 0) {
      console.error(`No discovered video matches "${options.only}".`)
      return 1
    }
  }

  if (options.limit) selected = selected.slice(0, options.limit)

  console.log(
    `Ingesting ${selected.length} unique videos at concurrency ${options.concurrency}, chunks of ${options.chunk.targetSeconds}s or ${options.chunk.targetChars} characters.`,
  )
  console.log('')

  const outcomes = await ingestAll(selected, PROVIDERS, options, fileChapters)

  const built = outcomes.filter(
    (outcome): outcome is Extract<IngestOutcome, { status: 'built' }> =>
      outcome.status === 'built',
  )
const failed = outcomes.filter((outcome) => outcome.status === 'failed')

  const lines = built
    .map((outcome) => outcome.document)
    // Workers finish out of order, so sort by document id. Two runs over unchanged input then
    // produce a byte-identical file, which is what makes the output reviewable in a diff.
    .sort((a, b) => (a._id < b._id ? -1 : a._id > b._id ? 1 : 0))
    .map((document) => serialize(document))
  const totalBytes = lines.reduce((sum, line) => sum + Buffer.byteLength(line, 'utf8'), 0)

  const chaptersFromDescription = built.filter(
    (outcome) => outcome.meta.chapterSource === 'description',
  ).length
  const chaptersFromOverride = built.filter(
    (outcome) => outcome.meta.chapterSource === 'override',
  ).length
  const withoutChapters = built.filter((outcome) => outcome.meta.chapterCount === 0).length
  const totalChunks = built.reduce((sum, outcome) => sum + outcome.meta.chunkCount, 0)
  const totalChapters = built.reduce((sum, outcome) => sum + outcome.meta.chapterCount, 0)

  console.log('')
  console.log(
    [
      `Videos built          ${built.length}`,
      `  chapters from url   ${chaptersFromDescription}`,
      `  chapters from file  ${chaptersFromOverride}`,
      `  no chapters         ${withoutChapters} (search falls back to the transcript)`,
      `Chapters              ${totalChapters}`,
      `Transcript chunks     ${totalChunks}`,
      `Skipped urls          ${skipped.length}`,
      `Failed videos         ${failed.length}`,
      `Output                ${totalBytes} bytes`,
    ].join('\n'),
  )

  for (const outcome of failed) {
    console.log(`  FAILED ${shortUrl(outcome.videoUrl)}  ${outcome.reason}`)
  }

  if (options.dryRun) {
    console.log('')
    console.log('Dry run. Nothing was written.')
    return failed.length > 0 ? 1 : 0
  }

  const outPath = options.out

  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, lines.length > 0 ? `${lines.join('\n')}\n` : '', 'utf8')

  console.log('')
  console.log(`Wrote ${lines.length} documents to ${outPath}`)
  console.log('Apply them with: npm run videos:import')

  return failed.length > 0 ? 1 : 0
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((error: unknown) => {
    console.error(`\nIngestion failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
