import type { Track, TrackVariant, TrackVariantPreview } from './track.ts'
import type { SessionData, PlaySessionTrack } from './session.ts'

// ---------------------------------------------------------------------
// Static Configuration

// Vite injects `import.meta.env` at build time; type it locally so we don't
// need a global vite/client type reference just for this one lookup.
const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
export const apiURL = viteEnv?.VITE_API_URL || 'https://api.audiodelivery.net'

// ---------------------------------------------------------------------
// Error Types

export class ApiError extends Error {
  status: number
  constructor (message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// ---------------------------------------------------------------------
// Retry Utility

const MAX_RETRIES = 1
const BASE_DELAY = 1000

async function fetchWithRetry (
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(input, init)
      return response
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, BASE_DELAY * Math.pow(2, attempt)))
      }
    }
  }

  throw lastError || new ApiError('Network request failed', 0)
}

// Thin wrapper kept for potential future instrumentation (metrics, tracing).
async function logApiCall<T> (
  _method: string,
  _path: string,
  apiCall: () => Promise<T>
): Promise<T> {
  return apiCall()
}

// Attaches an `Accept-Language` header so the API can optionally return
// localized messages. When no locale is provided the request is left untouched
// and the API falls back to its default language.
function withLocale (locale: string | undefined, init: RequestInit = {}): RequestInit {
  if (!locale) return init
  return {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      'Accept-Language': locale,
    },
  }
}

// ---------------------------------------------------------------------
// Private Types

type imageColor = {
  hex: string
  hue: number
  red: number
  area: number
  blue: number
  green: number
  active: boolean
  intensity: number
  lightness: number
  saturation: number
}

type coverImageSize = {
  height: number
  type: string
  url: string
  width: number
}

type track = {
  id: string
  cover_image_prefix: string
  index: string
  duration: number | null
  info: null | Record<string, unknown>
  organization_index: null | string
  order: number
  metadata: null | Record<string, unknown>
  player_title: string
  player_subtitle: string
  player_color: string
  player_color_light: string | null
  player_color_dark: string | null
  theme: imageColor[]
  file_name: string
  is_dark: boolean
}

type playSession = {
  id: string
  variants: string[]
  is_downloadable: boolean
  expires_at: string
}

type levels = {
  avg: number
  max: number
  min: number
  levels: number[]
  metric: string
  resample: number
  num_samples: number
}

type coverImage = {
  icon: coverImageSize
  large: coverImageSize
  regular: coverImageSize
  small: coverImageSize
}

type variant = {
  id: string
  url: string
  data: null | {
    duration: number,
    extension: string,
    capture_end: number,
    content_type: string,
    capture_start: number
  }
  path: string
  size: number
  props: variantProp
  variant: Record<string, unknown>
  file_name: string
  is_public: boolean
  content_type: string
}

type variantProp = {
  codec: string
  bitrate: number
  is_stereo: boolean
  is_strip_tags: boolean
  is_strip_cover: boolean
}

// ---------------------------------------------------------------------
// Upload Types

export interface UploadSession {
  id: string
  upload_session_id: string
  expires_at: string
  player_color?: string
}

export interface UploadSessionData {
  ok: boolean
  upload_session_id: string
  upload_session: UploadSession
  player_color?: string
  player_color_light?: string
  player_color_dark?: string
  expires_at: string
  message?: string
}

export interface TrackUpload {
  upload_url: string
}

export interface TrackUploadResponse {
  ok: boolean
  track_id: string
  track_upload: TrackUpload
}

export interface TrackVariantDownload {
  ok: boolean
  play_session_id: string
  track_id: string
  download: {
    variant: string
    url: string
  }
}

// ---------------------------------------------------------------------
// Public Api

export async function createPlayerSession (
  apiKey: string,
  scope: string,
  id: string,
  variants: string[],
  expiresIn?: number,
  locale?: string,
  downloadable?: boolean
): Promise<SessionData> {
  type firstTrackResponse = {
    track_id: string
    cover_image: coverImage
    track: track
    levels: levels
    variants: variant[]
  }

  type apiResponse = {
    ok: boolean
    expires_at: string
    tracks: track[]
    play_session_id: string
    play_session: playSession
    first_track?: firstTrackResponse | null
    message?: string
  }

  const path = `/v1/play_session/${scope}`

  return logApiCall('POST', path, async () => {
    const urlPlaySession = `${apiURL}${path}`
    const response = await fetchWithRetry(urlPlaySession, withLocale(locale, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        [`${scope}_id`]: id,
        variants,
        ...(expiresIn && { expires_in: expiresIn }),
        // Requested download intent; the API key is the authoritative gate and
        // the server stores (key AND this) on the session.
        ...(downloadable && { is_downloadable: true }),
      }),
    }))
    const body = (await response.json()) as apiResponse

    if (!response.ok || !body.ok) {
      throw new ApiError(body.message || 'Failed to create play session', response.status)
    }

    if (!body.tracks?.length) {
      throw new ApiError('No tracks found in session', response.status)
    }

    const data = {
      ok: body.ok,
      playSessionId: body.play_session_id,
      expiresAt: new Date(body.expires_at),
      playSession: camelcaseKeys(body.play_session),
      tracks: [],
    } as SessionData

    data.playSession.expiresAt = new Date(data.playSession.expiresAt)

    for (const track of body.tracks) {
      data.tracks.push(camelcaseKeys(track) as Track)
    }

    if (body.first_track) {
      data.firstTrack = parseFirstTrack(body.first_track)
    }

    return data
  })
}

export async function getPlaySession (
  playSessionId: string,
  locale?: string
): Promise<SessionData> {
  type firstTrackResponse = {
    track_id: string
    cover_image: coverImage
    track: track
    levels: levels
    variants: variant[]
  }

  type apiResponse = {
    ok: boolean
    expires_at?: string
    tracks: track[]
    play_session_id: string
    play_session: playSession
    first_track?: firstTrackResponse | null
    message?: string
  }

  const path = `/v1/play_session/${playSessionId}`

  return logApiCall('GET', path, async () => {
    const urlPlaySession = `${apiURL}${path}`
    const response = await fetchWithRetry(urlPlaySession, withLocale(locale))
    const body = (await response.json()) as apiResponse

    if (!response.ok || !body.ok) {
      throw new ApiError(body.message || 'Failed to fetch play session', response.status)
    }

    if (!body.tracks?.length) {
      throw new ApiError('No tracks found in session', response.status)
    }

    const data = {
      ok: body.ok,
      playSessionId: body.play_session_id,
      expiresAt: new Date(body.expires_at || body.play_session.expires_at),
      playSession: camelcaseKeys(body.play_session),
      tracks: [],
    } as SessionData

    data.playSession.expiresAt = new Date(data.playSession.expiresAt)

    for (const track of body.tracks) {
      data.tracks.push(camelcaseKeys(track) as Track)
    }

    if (body.first_track) {
      data.firstTrack = parseFirstTrack(body.first_track)
    }

    return data
  })
}

export async function getPlaySessionTrack (
  playSessionId: string,
  trackId: string,
  locale?: string
): Promise<PlaySessionTrack> {
  type apiResponse = {
    ok: boolean
    play_session_id: string
    track_id: string
    play_session: playSession
    track: track
    levels: levels
    variants: variant[]
    cover_image: coverImage
    message?: string
  }

  const path = `/v1/play/${playSessionId}/${trackId}`

  return logApiCall('GET', path, async () => {
    const urlPlaySessionTrack = `${apiURL}${path}`
    const response = await fetchWithRetry(urlPlaySessionTrack, withLocale(locale))
    const body = (await response.json()) as apiResponse

    if (!response.ok || !body.ok) {
      throw new ApiError(body.message || 'Failed to fetch track data', response.status)
    }

    return {
      ok: body.ok,
      playSessionId: body.play_session_id,
      trackId: body.track_id,
      playSession: camelcaseKeys(body.play_session),
      track: camelcaseKeys(body.track) as Track,
      levels: camelcaseKeys(body.levels),
      variants: parseVariants(body.variants),
      coverImage: camelcaseKeys(body.cover_image),
    } as PlaySessionTrack
  })
}

export async function getPlaySessionTrackVariantDownload (
  playSessionId: string,
  trackId: string,
  variant: string,
  locale?: string
): Promise<TrackVariantDownload> {
  const path = `/v1/play/${playSessionId}/${trackId}/${variant}/download`

  return logApiCall('GET', path, async () => {
    const urlPlaySessionTrack = `${apiURL}${path}`
    const response = await fetchWithRetry(urlPlaySessionTrack, withLocale(locale))
    const body = await response.json()

    if (!response.ok || !body?.ok) {
      throw new ApiError(body?.message || 'Failed to fetch download URL', response.status)
    }

    return body as TrackVariantDownload
  })
}

export async function createUploadSession (
  apiKey: string,
  collectionId?: string,
  locale?: string
): Promise<UploadSessionData> {
  const path = '/v1/upload_session'

  return logApiCall('POST', path, async () => {
    const urlUploadSession = `${apiURL}${path}`
    const payload: Record<string, string> = {}
    if (collectionId) payload.collection_id = collectionId
    const response = await fetchWithRetry(urlUploadSession, withLocale(locale, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    }))

    const body = await response.json()

    if (!response.ok || !body?.ok) {
      throw new ApiError(body?.message || 'Failed to create upload session', response.status)
    }

    return body as UploadSessionData
  })
}

export async function getUploadSession (
  uploadSessionId: string,
  locale?: string
): Promise<UploadSessionData> {
  const path = `/v1/upload_session/${uploadSessionId}`

  return logApiCall('GET', path, async () => {
    const urlUploadSession = `${apiURL}${path}`
    const response = await fetchWithRetry(urlUploadSession, withLocale(locale))
    const body = await response.json()

    if (!response.ok || !body?.ok) {
      throw new ApiError(body?.message || 'Failed to fetch upload session', response.status)
    }

    return body as UploadSessionData
  })
}

export async function getTrackUploadUrl (
  uploadSessionId: string,
  fileName: string,
  fileSize: number,
  locale?: string
): Promise<TrackUploadResponse> {
  const path = `/v1/upload/${uploadSessionId}/track`

  return logApiCall('POST', path, async () => {
    const urlTrackUpload = `${apiURL}${path}`
    const response = await fetchWithRetry(urlTrackUpload, withLocale(locale, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_name: fileName,
        file_size: fileSize,
      }),
    }))

    const body = await response.json()

    if (!response.ok || !body?.ok) {
      throw new ApiError(body?.message || 'Failed to get upload URL', response.status)
    }

    return body as TrackUploadResponse
  })
}

// ---------------------------------------------------------------------
// Helpers

function parseVariants (variants: variant[]): TrackVariant[] {
  return variants.map(v => {
    const trackVariant = camelcaseKeys(v) as TrackVariant
    if (v.data !== null) {
      trackVariant.isPreview = true
      trackVariant.preview = {
        offsetStart: v.data.capture_start,
        offsetEnd: v.data.capture_end,
        duration: v.data.duration,
      } as TrackVariantPreview
    }
    return trackVariant
  })
}

function parseFirstTrack (firstTrack: {
  track_id: string
  cover_image: coverImage
  track: track
  levels: levels
  variants: variant[]
}): PlaySessionTrack {
  return {
    ok: true,
    playSessionId: '',
    trackId: firstTrack.track_id,
    playSession: {} as PlaySessionTrack['playSession'],
    track: camelcaseKeys(firstTrack.track) as Track,
    levels: camelcaseKeys(firstTrack.levels),
    variants: parseVariants(firstTrack.variants),
    coverImage: camelcaseKeys(firstTrack.cover_image),
  } as PlaySessionTrack
}

function toCamel (str: string): string {
  return str.toLowerCase().replace(/([-_][a-z])/g, function (group) {
    return group.toUpperCase().replace('-', '').replace('_', '')
  })
}

function camelcaseKeys (obj: object): object {
  const newObj: { [index: string]: unknown } = {}

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value.constructor === Object) {
      newObj[toCamel(key)] = camelcaseKeys(value)
      continue
    }

    if (Object.hasOwn(obj, key)) {
      newObj[toCamel(key)] = value
    }
  }

  return newObj
}
