import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getPlaySession, getPlaySessionTrack, createUploadSession, getTrackUploadUrl } from '../../src/lib/api'

function jsonResponse (body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as unknown as Response
}

const playSessionBody = {
  ok: true,
  tracks: [{ order: 1 }],
  play_session_id: 'sess-1',
  play_session: { id: 'sess-1', variants: [], is_downloadable: false, expires_at: new Date().toISOString() },
  expires_at: new Date().toISOString(),
}

describe('api — Accept-Language forwarding', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function lastInit (): RequestInit {
    return fetchMock.mock.calls[0]?.[1] as RequestInit
  }

  function headers (): Record<string, string> {
    return (lastInit()?.headers ?? {}) as Record<string, string>
  }

  it('adds Accept-Language on a GET request when a locale is provided', async () => {
    fetchMock.mockResolvedValue(jsonResponse(playSessionBody))
    await getPlaySession('sess-1', 'fr')
    expect(headers()['Accept-Language']).toBe('fr')
  })

  it('omits Accept-Language when no locale is provided', async () => {
    fetchMock.mockResolvedValue(jsonResponse(playSessionBody))
    await getPlaySession('sess-1')
    expect(headers()['Accept-Language']).toBeUndefined()
  })

  it('forwards the locale on a track fetch', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      ok: true,
      play_session_id: 'sess-1',
      track_id: 'track-1',
      play_session: { id: 'sess-1', variants: [], is_downloadable: false, expires_at: new Date().toISOString() },
      track: {},
      levels: {},
      variants: [],
      cover_image: {},
    }))
    await getPlaySessionTrack('sess-1', 'track-1', 'es')
    expect(headers()['Accept-Language']).toBe('es')
  })

  it('preserves existing headers and adds Accept-Language on a POST request', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      ok: true, upload_session_id: 'up-1', upload_session: { id: 'up-1' }, expires_at: '',
    }))
    await createUploadSession('key-1', 'col-1', 'de')

    const h = headers()
    expect(h['Accept-Language']).toBe('de')
    expect(h.Authorization).toBe('Bearer key-1')
    expect(h['Content-Type']).toBe('application/json')
  })

  it('forwards the locale when requesting a track upload URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      ok: true, track_id: 'track-1', track_upload: { upload_url: 'https://cdn.test/put' },
    }))
    await getTrackUploadUrl('up-1', 'song.mp3', 123, 'fr')

    const h = headers()
    expect(h['Accept-Language']).toBe('fr')
    expect(h['Content-Type']).toBe('application/json')
  })
})
