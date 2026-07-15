import { getPlaySession, createPlayerSession } from './api.ts'
import type { Track, TrackLevels, TrackVariant, CoverImage } from './track.ts'

export interface FetchSession {
  playSessionId: string;
  id: string;
  apiKey: string;
  scope: string;
  variants: string[];
  sessionTtl?: number;
  locale?: string;
  downloadable?: boolean;
}

const SESSION_REFRESH_BUFFER_MS = 30_000

export interface PlaySession {
  id: string;
  variants: string[];
  isDownloadable: boolean;
  expiresAt: Date;
}

export type SessionData = {
  ok: boolean;
  expiresAt: Date;
  tracks: Track[];
  playSessionId: string;
  playSession: PlaySession;
  firstTrack?: PlaySessionTrack;
}

export type PlaySessionTrack = {
  ok: boolean
  playSessionId: string
  trackId: string
  playSession: PlaySession
  track: Track
  levels: TrackLevels
  variants: TrackVariant[]
  coverImage?: CoverImage
}

/**
 * fetches an existing session when provided with playSessionId.
 * When the session is expired, or does not exist a new session
 * is created (when apiKey, scope, and id are available).
 *
 * @async
 * @param {FetchSession} fetchSession - player instance data used to make api calls
 * @throws {Error} - when apiKey, scope, or id are not provided (for create path)
 * @throws {Error} - when no variants are provided
 * @throws {Error} - when the existing session cannot be fetched and create is not possible
 * @throws {Error} - when the api responds with an error
 * @returns {Promise<SessionData>} session data with tracks ordered
 */
export async function fetchSession ({
  playSessionId,
  id,
  apiKey,
  scope,
  variants,
  sessionTtl,
  locale,
  downloadable,
}: FetchSession): Promise<SessionData> {
  if (playSessionId) {
    try {
      const existingSessionData = await getPlaySession(playSessionId, locale)
      if (existingSessionData) {
        return existingSessionData as SessionData
      }
    } catch (err) {
      // Expired or missing sessions: fall through to create when credentials exist.
      if (!(apiKey && scope && id)) {
        throw new Error('failed to fetch session', { cause: err })
      }
    }
  }

  if (!apiKey) {
    throw new Error('apiKey must be provided')
  }
  if (!scope) {
    throw new Error('scope must be provided')
  }
  if (!id) {
    throw new Error('id must be provided')
  }

  if (!variants.length) {
    throw new Error('no variants provided')
  }

  const sessionData = await createPlayerSession(apiKey, scope, id, variants, sessionTtl, locale, downloadable)
  if (!sessionData) {
    throw new Error('failed to load session data')
  }

  // sort tracks and update order
  sessionData.tracks = sessionData.tracks
    .sort((a, b) => a.order - b.order)
    .map((track, i) => {
      track.order = i + 1
      return track
    })

  return sessionData
}

export interface SessionExpiryHandlers {
  onWarning: () => void
  onExpiry: () => void
}

/**
 * Schedules callbacks around a session's expiresAt time.
 * Fires `onWarning` at `expiresAt - 30s` (to allow preemptive refresh),
 * then `onExpiry` at actual expiry.
 * If the session is already within the buffer window, fires immediately.
 */
export class SessionExpiryTimer {
  private _warningTimer: ReturnType<typeof setTimeout> | null = null
  private _expiryTimer: ReturnType<typeof setTimeout> | null = null

  schedule (expiresAt: Date, handlers: SessionExpiryHandlers) {
    this.clear()

    const now = Date.now()
    const expiresMs = expiresAt.getTime()
    const msUntilExpiry = expiresMs - now
    const msUntilWarning = msUntilExpiry - SESSION_REFRESH_BUFFER_MS

    if (msUntilExpiry <= 0) {
      handlers.onExpiry()
      return
    }

    if (msUntilWarning <= 0) {
      handlers.onWarning()
    } else {
      this._warningTimer = setTimeout(handlers.onWarning, msUntilWarning)
    }

    this._expiryTimer = setTimeout(handlers.onExpiry, msUntilExpiry)
  }

  clear () {
    if (this._warningTimer !== null) {
      clearTimeout(this._warningTimer)
      this._warningTimer = null
    }
    if (this._expiryTimer !== null) {
      clearTimeout(this._expiryTimer)
      this._expiryTimer = null
    }
  }
}
