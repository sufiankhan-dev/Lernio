/**
 * Shared types for the offline video ingestion pipeline.
 *
 * The pipeline turns provider metadata into `video` documents. It is offline tooling: it runs
 * from a terminal, never from a request, and it holds no write credential. It reads lessons to
 * discover which videos exist, fetches captions, and writes an NDJSON file that
 * `sanity dataset import --replace` applies. See AGENTS.md section 9.
 */

/** Providers this pipeline knows how to ingest. */
export type ProviderId = 'youtube'

/**
 * One caption cue, as the provider reports it.
 *
 * `endSeconds` is kept so the chunker can tell a real silence gap from continuous speech.
 * `endSeconds` is 0 when the provider does not report a duration.
 */
export type Cue = {
  startSeconds: number
  endSeconds: number
  text: string
}

/** One table-of-contents entry. */
export type Chapter = {
  startSeconds: number
  label: string
}

/** Where a video's chapter markers came from, so the report can be trusted. */
export type ChapterSource = 'override' | 'description' | 'none'

/**
 * What a provider returns for one video.
 *
 * `description` is passed through rather than parsed here, because reading chapter markers out of
 * prose is the pipeline's job and belongs in `chapters.ts`, not behind a provider.
 */
export type ProviderResult = {
  provider: ProviderId
  /** The provider's own id for the video, for example a YouTube video id. */
  nativeId: string
  title: string | null
  durationSeconds: number | null
  /** Which caption track was used, in words an operator can check. */
  captionTrack: string
  cues: Cue[]
  description: string
}

/**
 * A provider adapter.
 *
 * AGENTS.md section 9 says a provider counts as supported only once both ingestion and playback
 * exist for it. Playback lives in `lib/video.ts` and is YouTube-only today, so `providers` holds
 * YouTube alone. Adding Vimeo or Bunny means adding the matching branch to `getVideoEmbed` in the
 * same change; an adapter on its own would claim a support that does not exist.
 */
export type VideoProvider = {
  id: ProviderId
  /** Whether this provider owns the URL. */
  matches: (url: URL) => boolean
  /** The provider's own video id for the URL, or null when the URL is malformed for it. */
  nativeId: (url: URL) => string | null
  /** The canonical watch URL for a native id, which is what the document stores. */
  canonicalUrl: (nativeId: string) => string
  /** Fetches captions and metadata. Throws on failure so the CLI can count it. */
  fetch: (nativeId: string) => Promise<ProviderResult>
}

/** A fully built video document, before it is serialised to NDJSON. */
export type VideoDocument = {
  _id: string
  _type: 'video'
  id: string
  url: string
  title: string | null
  chapters: Chapter[]
  chunks: Cue[]
}

/** How a discovered URL turned into a document, or why it did not. */
export type IngestOutcome =
  | { status: 'built'; document: VideoDocument; meta: BuiltMeta }
  | { status: 'failed'; videoUrl: string; reason: string }

/** What the report prints for a video that was built. */
export type BuiltMeta = {
  videoId: string
  title: string | null
  durationSeconds: number | null
  chapterCount: number
  chapterSource: ChapterSource
  chunkCount: number
  coveredSeconds: number
  captionTrack: string
  bytes: number
}

/** Tunables for `chunk.ts`, all overridable from the CLI. */
export type ChunkOptions = {
  /** Close a chunk once it covers this many seconds. */
  targetSeconds: number
  /** Close a chunk once its text reaches this many characters. */
  targetChars: number
  /** Never let a chunk exceed this many characters, even mid sentence. */
  maxChars: number
  /** A silence gap longer than this starts a new chunk, so none spans an ad break. */
  maxGapSeconds: number
}
