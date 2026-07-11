import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchSession, SessionExpiryTimer } from '../../src/lib/session'

const mockGetPlaySession = vi.fn()
const mockCreatePlayerSession = vi.fn()

vi.mock('../../src/lib/api', () => ({
  getPlaySession: (...args: unknown[]) => mockGetPlaySession(...args),
  createPlayerSession: (...args: unknown[]) => mockCreatePlayerSession(...args),
}))

const baseFetch = {
  playSessionId: '',
  id: 'player-1',
  apiKey: 'key-1',
  scope: 'collection',
  variants: ['hq', 'lq'],
}

describe('fetchSession', () => {
  beforeEach(() => {
    mockGetPlaySession.mockReset()
    mockCreatePlayerSession.mockReset()
  })

  it('returns an existing session when playSessionId resolves', async () => {
    const existing = { ok: true, tracks: [] }
    mockGetPlaySession.mockResolvedValue(existing)

    const result = await fetchSession({ ...baseFetch, playSessionId: 'sess-1' })
    expect(mockGetPlaySession).toHaveBeenCalledWith('sess-1', undefined)
    expect(result).toBe(existing)
    expect(mockCreatePlayerSession).not.toHaveBeenCalled()
  })

  it('wraps a failed existing-session fetch in a friendly error', async () => {
    mockGetPlaySession.mockRejectedValue(new Error('boom'))
    await expect(fetchSession({ ...baseFetch, playSessionId: 'sess-1' }))
      .rejects.toThrow('failed to fetch session')
  })

  it('throws when apiKey, scope, and id are all missing', async () => {
    await expect(fetchSession({ playSessionId: '', id: '', apiKey: '', scope: '', variants: ['hq'] }))
      .rejects.toThrow('apiKey & id must be provided')
  })

  it('throws when no variants are provided', async () => {
    await expect(fetchSession({ ...baseFetch, variants: [] }))
      .rejects.toThrow('no variants provided')
  })

  it('throws when the api returns no session data', async () => {
    mockCreatePlayerSession.mockResolvedValue(undefined)
    await expect(fetchSession({ ...baseFetch }))
      .rejects.toThrow('failed to load session data')
  })

  it('forwards the locale to the API', async () => {
    mockGetPlaySession.mockResolvedValue({ ok: true, tracks: [] })
    await fetchSession({ ...baseFetch, playSessionId: 'sess-1', locale: 'fr' })
    expect(mockGetPlaySession).toHaveBeenCalledWith('sess-1', 'fr')

    mockCreatePlayerSession.mockResolvedValue({ ok: true, tracks: [] })
    await fetchSession({ ...baseFetch, locale: 'de' })
    expect(mockCreatePlayerSession).toHaveBeenCalledWith('key-1', 'collection', 'player-1', ['hq', 'lq'], undefined, 'de', undefined)
  })

  it('creates a session and re-orders tracks sequentially', async () => {
    mockCreatePlayerSession.mockResolvedValue({
      ok: true,
      tracks: [
        { id: 'c', order: 5 },
        { id: 'a', order: 1 },
        { id: 'b', order: 3 },
      ],
    })

    const result = await fetchSession({ ...baseFetch })
    expect(mockCreatePlayerSession).toHaveBeenCalledWith('key-1', 'collection', 'player-1', ['hq', 'lq'], undefined, undefined, undefined)
    expect(result.tracks.map(t => t.id)).toEqual(['a', 'b', 'c'])
    expect(result.tracks.map(t => t.order)).toEqual([1, 2, 3])
  })
})

describe('SessionExpiryTimer', () => {
  let timer: SessionExpiryTimer
  let onWarning: ReturnType<typeof vi.fn>
  let onExpiry: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    timer = new SessionExpiryTimer()
    onWarning = vi.fn()
    onExpiry = vi.fn()
  })

  afterEach(() => {
    timer.clear()
    vi.useRealTimers()
  })

  it('fires onExpiry immediately when already expired', () => {
    timer.schedule(new Date(Date.now() - 1000), { onWarning, onExpiry })
    expect(onExpiry).toHaveBeenCalledTimes(1)
    expect(onWarning).not.toHaveBeenCalled()
  })

  it('fires onWarning immediately when within the 30s buffer', () => {
    timer.schedule(new Date(Date.now() + 10_000), { onWarning, onExpiry })
    expect(onWarning).toHaveBeenCalledTimes(1)
    expect(onExpiry).not.toHaveBeenCalled()

    vi.advanceTimersByTime(10_000)
    expect(onExpiry).toHaveBeenCalledTimes(1)
  })

  it('schedules warning at expiry-30s and expiry at expiry for future sessions', () => {
    timer.schedule(new Date(Date.now() + 90_000), { onWarning, onExpiry })
    expect(onWarning).not.toHaveBeenCalled()
    expect(onExpiry).not.toHaveBeenCalled()

    vi.advanceTimersByTime(60_000)
    expect(onWarning).toHaveBeenCalledTimes(1)
    expect(onExpiry).not.toHaveBeenCalled()

    vi.advanceTimersByTime(30_000)
    expect(onExpiry).toHaveBeenCalledTimes(1)
  })

  it('clear() cancels pending timers', () => {
    timer.schedule(new Date(Date.now() + 90_000), { onWarning, onExpiry })
    timer.clear()
    vi.advanceTimersByTime(200_000)
    expect(onWarning).not.toHaveBeenCalled()
    expect(onExpiry).not.toHaveBeenCalled()
  })

  it('re-scheduling clears the previous timers', () => {
    timer.schedule(new Date(Date.now() + 90_000), { onWarning, onExpiry })
    const onWarning2 = vi.fn()
    const onExpiry2 = vi.fn()
    timer.schedule(new Date(Date.now() + 90_000), { onWarning: onWarning2, onExpiry: onExpiry2 })

    vi.advanceTimersByTime(90_000)
    expect(onWarning).not.toHaveBeenCalled()
    expect(onExpiry).not.toHaveBeenCalled()
    expect(onWarning2).toHaveBeenCalledTimes(1)
    expect(onExpiry2).toHaveBeenCalledTimes(1)
  })
})
