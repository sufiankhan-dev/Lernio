import type { Cue, ProviderResult, VideoProvider } from './types'

/**
 * The YouTube ingestion adapter.
 *
 * Two facts shaped this file, both verified by probing the live endpoints rather than assumed:
 *
 * - `youtube.com/api/timedtext`, the endpoint every transcript library used to scrape, now returns
 *   an empty body. It is dead. The working path is the InnerTube player endpoint, which returns a
 *   caption track URL when called with a mobile client, and that URL serves the transcript as
 *   `json3`.
 * - The same mobile response carries `videoDetails.shortDescription`, which is where curated videos
 *   keep their chapter markers. The web client exposes chapters in `playerOverlays`, but it also
 *   returns `playabilityStatus: UNPLAYABLE` from datacenter addresses, so it is not usable here.
 *
 * The key below is YouTube's own public InnerTube key, shipped in its web and mobile clients. It
 * is not a credential belonging to this project. `YOUTUBE_INNERTUBE_API_KEY` overrides it.
 */

const INNERTUBE_KEY =
  process.env.YOUTUBE_INNERTUBE_API_KEY ||
  'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'

/**
 * A YouTube video id is 11 characters of URL-safe base64.
 */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])

const YOUTUBE_SHORT_HOSTS = new Set(['youtu.be', 'www.youtu.be'])

/**
 * YouTube's own constant-timeouts keys are older and get rejected with a 400, so this pairs a
 * current client version with the matching User-Agent. The player endpoint refuses a mismatched
 * pair rather than serving captions.
 */
const CLIENT = {
  clientName: 'ANDROID',
  clientVersion: '20.10.38',
  androidSdkVersion: 35,
} as const

const USER_AGENT = `com.google.android.youtube/${CLIENT.clientVersion} (Linux; U; Android 15) gzip`

/** Retries for the two things YouTube does transiently: rate limits and 5xx. */
const MAX_ATTEMPTS = 3
const RETRY_BASE_MS = 500

type CaptionTrack = {
  baseUrl: string
  languageCode: string
  kind?: string
  name?: { simpleText?: string }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Fetches with a short backoff.
 *
 * Ingesting a full catalog is a few hundred requests, and YouTube rate limits by bursts. Retrying
 * two or three times turns a throttled run into a slightly slower one rather than a failure
 * halfway through.
 */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, init)

      if (response.ok || (response.status !== 429 && response.status < 500)) {
        return response
      }

      lastError = new Error(`HTTP ${response.status} ${response.statusText}`)
    } catch (error) {
      lastError = error
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_BASE_MS * 2 ** (attempt - 1))
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

type PlayerResponse = {
  playabilityStatus?: { status?: string; reason?: string }
  videoDetails?: {
    videoId?: string
    title?: string
    lengthSeconds?: string
    shortDescription?: string
  }
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[]
    }
  }
}

async function fetchPlayer(nativeId: string): Promise<PlayerResponse> {
  const response = await fetchWithRetry(
    `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_KEY}&prettyPrint=false`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept-language': 'en-US,en;q=0.9',
        'user-agent': USER_AGENT,
      },
      body: JSON.stringify({
        videoId: nativeId,
        context: { client: { ...CLIENT, hl: 'en', gl: 'US' } },
        contentCheckOk: true,
        racyCheckOk: true,
      }),
    },
  )

  if (!response.ok) {
    throw new Error(
      `YouTube player request failed with ${response.status} ${response.statusText}.`,
    )
  }

  return (await response.json()) as PlayerResponse
}

/**
 * Chooses which caption track to ingest.
 *
 * A hand-authored track beats an auto-generated one because it is punctuated and capitalised, and
 * both are needed: plenty of videos carry only auto captions, and plenty carry a manual English
 * track under a regional code. The returned label goes into the report so a wrong pick is visible.
 */
function selectCaptionTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  const english = tracks.filter((track) =>
    (track.languageCode ?? '').toLowerCase().startsWith('en'),
  )

  const manualEnglish = english.find(
    (track) => track.kind !== 'asr' && track.languageCode?.toLowerCase() === 'en',
  )
  if (manualEnglish) return manualEnglish

  const autoEnglish = english.find((track) => track.languageCode?.toLowerCase() === 'en')
  if (autoEnglish) return autoEnglish

  return english[0] ?? null
}

function describeTrack(track: CaptionTrack): string {
  const kind = track.kind === 'asr' ? 'auto' : 'manual'
  return `${track.languageCode} (${kind})`
}

type Json3Segment = { utf8?: string }

type Json3Event = {
  tStartMs?: number
  dDurationMs?: number
  segs?: Json3Segment[]
}

/**
 * Turns the `json3` caption payload into cues.
 *
 * Auto captions interleave newline-only events that carry no words, which is why an event with no
 * usable text is dropped rather than stored as an empty cue.
 */
function parseJson3(payload: unknown): Cue[] {
  const events = (payload as { events?: Json3Event[] })?.events

  if (!Array.isArray(events)) return []

  const cues: Cue[] = []

  for (const event of events) {
    if (!Array.isArray(event.segs)) continue

    const text = event.segs
      .map((segment) => (typeof segment.utf8 === 'string' ? segment.utf8 : ''))
      .join('')
      .replace(/\s+/g, ' ')
      .trim()

    if (!text) continue

    const startMs = typeof event.tStartMs === 'number' ? event.tStartMs : 0
    const durationMs = typeof event.dDurationMs === 'number' ? event.dDurationMs : 0

    cues.push({
      startSeconds: Math.round(startMs / 1000),
      endSeconds: Math.round((startMs + durationMs) / 1000),
      text,
    })
  }

  return cues
}

async function fetchTranscript(track: CaptionTrack): Promise<Cue[]> {
  const url = new URL(track.baseUrl)
  url.searchParams.set('fmt', 'json3')

  const response = await fetchWithRetry(url.toString(), {
    headers: { 'user-agent': USER_AGENT, 'accept-language': 'en-US,en;q=0.9' },
  })

  if (!response.ok) {
    throw new Error(
      `Caption request failed with ${response.status} ${response.statusText} for ${describeTrack(track)}.`,
    )
  }

  const body = await response.text()

  try {
    return parseJson3(JSON.parse(body))
  } catch {
    throw new Error(
      `Caption response for ${describeTrack(track)} was not JSON. It started with: ${body.slice(0, 120)}`,
    )
  }
}

function nativeIdFrom(url: URL): string | null {
  // youtu.be/<id>
  if (YOUTUBE_SHORT_HOSTS.has(url.hostname)) {
    const id = url.pathname.slice(1).split('/')[0] ?? ''
    return YOUTUBE_ID.test(id) ? id : null
  }

  // /watch?v=<id>
  const queryId = url.searchParams.get('v')
  if (queryId && YOUTUBE_ID.test(queryId)) return queryId

  // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
  const [, path, candidate] = url.pathname.split('/')
  if (path && YOUTUBE_ID.test(candidate)) return candidate

  return null
}

export const youtubeProvider: VideoProvider = {
  id: 'youtube',

  matches: (url) =>
    YOUTUBE_HOSTS.has(url.hostname) || YOUTUBE_SHORT_HOSTS.has(url.hostname),

  nativeId: nativeIdFrom,

  canonicalUrl: (nativeId) => `https://www.youtube.com/watch?v=${nativeId}`,

  async fetch(nativeId): Promise<ProviderResult> {
    const player = await fetchPlayer(nativeId)

    const status = player.playabilityStatus?.status

    if (status && status !== 'OK') {
      throw new Error(
        `YouTube reports ${status}${player.playabilityStatus?.reason ? `: ${player.playabilityStatus.reason}` : ''}.`,
      )
    }

    const tracks =
      player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []

    if (tracks.length === 0) {
      throw new Error('This video has no caption tracks, so there is no transcript to ingest.')
    }

    const track = selectCaptionTrack(tracks)

    if (!track) {
      const available = tracks
        .map((candidate) => describeTrack(candidate))
        .join(', ')

      throw new Error(
        `This video has no English caption track. Available: ${available}. The pipeline only ingests English so the stored transcript matches the catalog.`,
      )
    }

    const cues = await fetchTranscript(track)

    if (cues.length === 0) {
      throw new Error(
        `The ${describeTrack(track)} caption track for this video came back empty.`,
      )
    }

    const lengthSeconds = Number(player.videoDetails?.lengthSeconds)

    return {
      provider: 'youtube',
      nativeId,
      title: player.videoDetails?.title ?? null,
      durationSeconds: Number.isFinite(lengthSeconds) ? lengthSeconds : null,
      captionTrack: describeTrack(track),
      cues,
      description: player.videoDetails?.shortDescription ?? '',
    }
  },
}
