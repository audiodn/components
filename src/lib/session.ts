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
  coverImage: CoverImage
}

/**
 * fetches an existing session when provided with playSessionId.
 * When the session is expired, or does not exist a new session
 * is created
 *
 * @async
 * @param {fetchSession} fetchSession - player instance data used to make api calls
 * @param {string} fetchSession.playSessionId - existing session id
 * @param {string} fetchSession.id - player instance id
 * @param {string} fetchSession.apiKey - player instance api key
 * @param {string} fetchSession.scope - player instance scope
 * @param {string[]} fetchSession.variants - list of accepted variants
 * @throws {Error} - when apiKey, scope, and id are not provided
 * @throws {Error} - when no variants are provided
 * @throws {Error} - when the api responds with an error
 * @returns {Promise<SessionData | undefined>} session data with tracks ordered
 *
 * @example
 *
 *   this.sessionData = await Session.fetchSession({
 *     playSessionId: "player-abc123',
 *     id: "04ea3a34-a0f7-45e8-a711-9c7274490e2e",
 *     apiKey: "super-secret",
 *     scipe: "collection",
 *     variants: ["hq", "lq"]
 *   })
 *
 *   // from player instance, which has properties set on `this`
 *   this.sessionData = await Session.fetchSession(this)
 *
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
      throw new Error('failed to fetch session', { cause: err })
    }
  }

  if (!apiKey && !scope && !id) {
    throw new Error('apiKey & id must be provided')
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
