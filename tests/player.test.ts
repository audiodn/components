import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { fixture, html } from '@open-wc/testing'
import { AudioDnPlayer } from '../src/player'

const mockSessionData = {
  ok: true,
  playSessionId: 'sess-123',
  expiresAt: new Date(Date.now() + 3600_000),
  playSession: {
    id: 'sess-123',
    variants: ['hq', 'lq'],
    isDownloadable: false,
    expiresAt: new Date(Date.now() + 3600_000),
  },
  tracks: [
    {
      id: 'track-1',
      coverImagePrefix: '/img/',
      index: 'track-1',
      duration: 180,
      info: null,
      organizationIndex: null,
      order: 1,
      metadata: null,
      playerTitle: 'Track One',
      playerSubtitle: 'Artist A',
      playerColor: '#c13c5b',
      fileName: 'track-one.mp3',
      isDark: false,
      theme: [],
    },
    {
      id: 'track-2',
      coverImagePrefix: '/img/',
      index: 'track-2',
      duration: 240,
      info: null,
      organizationIndex: null,
      order: 2,
      metadata: null,
      playerTitle: 'Track Two',
      playerSubtitle: 'Artist B',
      playerColor: '#2c3e50',
      fileName: 'track-two.mp3',
      isDark: true,
      theme: [],
    },
  ],
  firstTrack: {
    ok: true,
    playSessionId: 'sess-123',
    trackId: 'track-1',
    playSession: {
      id: 'sess-123',
      variants: ['hq', 'lq'],
      isDownloadable: false,
      expiresAt: new Date(Date.now() + 3600_000),
    },
    track: {
      id: 'track-1',
      playerTitle: 'Track One',
      playerSubtitle: 'Artist A',
      duration: 180,
      playerColor: '#c13c5b',
      isDark: false,
      theme: [],
    },
    levels: { avg: -12, max: -3, min: -24, levels: [0.5, 0.8, 0.3], metric: 'dBFS', resample: 1, numSamples: 3 },
    variants: [
      {
        id: 'v-1',
        url: 'https://cdn.test/track-1-hq.mp3',
        data: null,
        path: '/hq',
        size: 5000000,
        props: { codec: 'mp3', bitrate: 320, isStereo: true, isStripTags: false, isStripCover: false },
        variant: { id: 'var-hq', index: 'hq', variantType: { id: 'vt-1', title: 'HQ', viewerId: 'v1' } },
        fileName: 'track-one-hq.mp3',
        isPublic: true,
        contentType: 'audio/mpeg',
        isPreview: false,
        preview: { offsetStart: 0, offsetEnd: 0, duration: 0 },
      },
    ],
    coverImage: {
      icon: { height: 64, type: 'image/jpeg', url: 'https://cdn.test/icon.jpg', width: 64 },
      small: { height: 128, type: 'image/jpeg', url: 'https://cdn.test/small.jpg', width: 128 },
      regular: { height: 256, type: 'image/jpeg', url: 'https://cdn.test/regular.jpg', width: 256 },
      large: { height: 512, type: 'image/jpeg', url: 'https://cdn.test/large.jpg', width: 512 },
    },
  },
}

const mockTrackResult = {
  ok: true,
  playSessionId: 'sess-123',
  trackId: 'track-2',
  playSession: mockSessionData.playSession,
  track: mockSessionData.tracks[1],
  levels: { avg: -14, max: -5, min: -28, levels: [0.4, 0.7, 0.2], metric: 'dBFS', resample: 1, numSamples: 3 },
  variants: [
    {
      id: 'v-2',
      url: 'https://cdn.test/track-2-hq.mp3',
      data: null,
      path: '/hq',
      size: 6000000,
      props: { codec: 'mp3', bitrate: 320, isStereo: true, isStripTags: false, isStripCover: false },
      variant: { id: 'var-hq', index: 'hq', variantType: { id: 'vt-1', title: 'HQ', viewerId: 'v1' } },
      fileName: 'track-two-hq.mp3',
      isPublic: true,
      contentType: 'audio/mpeg',
      isPreview: false,
      preview: { offsetStart: 0, offsetEnd: 0, duration: 0 },
    },
  ],
  coverImage: mockSessionData.firstTrack.coverImage,
}

const mockFetchSession = vi.fn()
const mockGetPlaySessionTrack = vi.fn()
const mockSchedule = vi.fn()
const mockClear = vi.fn()

vi.mock('../src/lib/session', () => ({
  fetchSession: (...args: unknown[]) => mockFetchSession(...args),
  SessionExpiryTimer: vi.fn().mockImplementation(() => ({
    schedule: mockSchedule,
    clear: mockClear,
  })),
}))

vi.mock('../src/lib/api', () => ({
  getPlaySessionTrack: (...args: unknown[]) => mockGetPlaySessionTrack(...args),
  ApiError: class ApiError extends Error {
    status: number
    constructor (message: string, status: number) {
      super(message)
      this.name = 'ApiError'
      this.status = status
    }
  },
}))

vi.mock('../src/lib/storage', () => ({
  createStorage: vi.fn(() => ({
    get: vi.fn().mockReturnValue(0.7),
    set: vi.fn(),
    remove: vi.fn(),
  })),
}))

vi.mock('../src/lib/audio', () => ({
  createAudioInstance: vi.fn(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    load: vi.fn(),
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
    paused: true,
    ended: false,
    readyState: 0,
    networkState: 0,
    error: null,
    src: '',
    currentSrc: '',
    autoplay: false,
  })),
}))

describe('AudioDnPlayer', () => {
  let element: AudioDnPlayer

  beforeEach(async () => {
    mockFetchSession.mockReset()
    mockGetPlaySessionTrack.mockReset()
    mockSchedule.mockReset()
    mockClear.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  async function createPlayer (attrs: Record<string, string> = {}) {
    mockFetchSession.mockResolvedValue(structuredClone(mockSessionData))
    mockGetPlaySessionTrack.mockResolvedValue(structuredClone(mockTrackResult))
    const el = document.createElement('audiodn-player')
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
    element = await fixture(el) as unknown as AudioDnPlayer
    await element.updateComplete
    return element
  }

  async function createPlayerWithoutSession () {
    mockFetchSession.mockRejectedValue(new Error('No session'))
    element = await fixture(html`<audiodn-player></audiodn-player>`) as unknown as AudioDnPlayer
    await element.updateComplete
    return element
  }

  describe('Default properties', () => {
    it('should initialize with expected defaults', async () => {
      await createPlayerWithoutSession()
      expect(element.scope).toBe('')
      expect(element.id).toBe('')
      expect(element.size).toBe('large')
      expect(element.state).toBe('paused')
      expect(element.currentTime).toBe(0)
      expect(element.progressMinimum).toBe(0)
      expect(element.progressMaximum).toBe(1)
    })

    it('should read properties from attributes', async () => {
      await createPlayer({
        'api-key': 'key-abc',
        scope: 'collection',
        id: 'col-1',
        variants: 'hq,lq',
        size: 'small',
      })
      expect(element.apiKey).toBe('key-abc')
      expect(element.scope).toBe('collection')
      expect(element.id).toBe('col-1')
      expect(element.variants).toBe('hq,lq')
      expect(element.size).toBe('small')
    })
  })

  describe('i18n', () => {
    it('defaults to English', async () => {
      await createPlayer()
      expect(element.locale).toBe('en')
    })

    it('reads the locale from the attribute', async () => {
      await createPlayer({ locale: 'fr' })
      expect(element.locale).toBe('fr')
    })

    it('localizes the region label and propagates locale to sub-components', async () => {
      await createPlayer({ locale: 'de' })
      const region = element.shadowRoot?.querySelector('.player-main')
      expect(region?.getAttribute('aria-label')).toBe('Audio-Player')

      const playButton = element.shadowRoot?.querySelector('audiodn-play-button') as any
      expect(playButton?.locale).toBe('de')
      const progress = element.shadowRoot?.querySelector('audiodn-progress') as any
      expect(progress?.locale).toBe('de')
    })

    it('localizes the loader label', async () => {
      mockFetchSession.mockImplementation(() => new Promise(() => {}))
      const el = document.createElement('audiodn-player')
      el.setAttribute('locale', 'es')
      element = await fixture(el) as unknown as AudioDnPlayer
      await element.updateComplete
      const loading = element.shadowRoot?.querySelector('.player-loading')
      expect(loading?.getAttribute('aria-label')).toBe('Cargando el reproductor de audio')
    })

    it('localizes the load-failure notification', async () => {
      mockFetchSession.mockRejectedValue(new Error('No session'))
      const el = document.createElement('audiodn-player')
      el.setAttribute('locale', 'fr')
      element = await fixture(el) as unknown as AudioDnPlayer
      await element.updateComplete
      const message = element.shadowRoot?.querySelector('audiodn-notification')
        ?.shadowRoot?.querySelector('.notification-message')
      expect(message?.textContent?.trim()).toBe('Impossible de charger le lecteur.')
    })
  })

  describe('Session loading', () => {
    it('should call fetchSession on connectedCallback', async () => {
      await createPlayer()
      expect(mockFetchSession).toHaveBeenCalledTimes(1)
    })

    it('should populate tracks from session data', async () => {
      await createPlayer()
      expect(element.tracks).toHaveLength(2)
      expect(element.tracks[0].id).toBe('track-1')
      expect(element.tracks[1].id).toBe('track-2')
    })

    it('should apply first track data when available', async () => {
      await createPlayer()
      expect(element.activeTrack?.id).toBe('track-1')
      expect(element.activeLevels).toBeDefined()
      expect(element.activeCoverImage).toBeDefined()
    })

    it('should schedule session expiry after loading', async () => {
      await createPlayer()
      expect(mockSchedule).toHaveBeenCalledTimes(1)
    })

    it('should set isLoading to false after session loads', async () => {
      await createPlayer()
      expect(element.isLoading).toBe(false)
    })

    it('should handle session fetch failure gracefully', async () => {
      await createPlayerWithoutSession()
      expect(element.isLoading).toBe(false)
      expect(element.tracks).toEqual([])
    })
  })

  describe('Track selection', () => {
    it('should select a track and fetch its data', async () => {
      await createPlayer()
      mockGetPlaySessionTrack.mockResolvedValue(structuredClone(mockTrackResult))

      await element.selectTrack(element.tracks[1])
      expect(mockGetPlaySessionTrack).toHaveBeenCalledWith('sess-123', 'track-2', 'en')
      expect(element.activeTrack?.id).toBe('track-2')
    })

    it('should use cached track data on subsequent selections', async () => {
      await createPlayer()
      mockGetPlaySessionTrack.mockResolvedValue(structuredClone(mockTrackResult))

      await element.selectTrack(element.tracks[1])
      const callsAfterFirst = mockGetPlaySessionTrack.mock.calls.filter(
        (args: string[]) => args[1] === 'track-2'
      ).length
      expect(callsAfterFirst).toBe(1)

      await element.selectTrack(element.tracks[1])
      const callsAfterSecond = mockGetPlaySessionTrack.mock.calls.filter(
        (args: string[]) => args[1] === 'track-2'
      ).length
      expect(callsAfterSecond).toBe(1) // still 1, served from cache
    })

    it('should not select track without a session', async () => {
      await createPlayerWithoutSession()
      const track = { id: 'track-1', duration: 180 }
      await element.selectTrack(track as any)
      expect(mockGetPlaySessionTrack).not.toHaveBeenCalled()
    })
  })

  describe('Play/pause', () => {
    it('should call audio.play when paused', async () => {
      await createPlayer()
      element.state = 'paused'
      element.handleUIPlayPause()
      expect(element.audio.play).toHaveBeenCalled()
    })

    it('should call audio.pause when playing', async () => {
      await createPlayer()
      element.state = 'playing'
      element.handleUIPlayPause()
      expect(element.audio.pause).toHaveBeenCalled()
    })
  })

  describe('handleEvent (audio events)', () => {
    it('should set state to playing on play event', async () => {
      await createPlayer()
      element.handleEvent(new Event('play'))
      expect(element.state).toBe('playing')
      expect(element.isBuffering).toBe(false)
    })

    it('should set state to paused on pause event', async () => {
      await createPlayer()
      element.state = 'playing'
      element.handleEvent(new Event('pause'))
      expect(element.state).toBe('paused')
    })

    it('should set isBuffering on waiting event', async () => {
      await createPlayer()
      element.handleEvent(new Event('waiting'))
      expect(element.isBuffering).toBe(true)
    })

    it('should set isBuffering on stalled event', async () => {
      await createPlayer()
      element.handleEvent(new Event('stalled'))
      expect(element.isBuffering).toBe(true)
    })

    it('should clear isBuffering on playing event', async () => {
      await createPlayer()
      element.isBuffering = true
      element.handleEvent(new Event('playing'))
      expect(element.isBuffering).toBe(false)
    })

    it('should dispatch adn-playchange on play', async () => {
      await createPlayer()
      const spy = vi.fn()
      document.addEventListener('adn-playchange', spy)

      element.handleEvent(new Event('play'))
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        detail: { origin: element, action: 'play' },
      }))

      document.removeEventListener('adn-playchange', spy)
    })

    it('should dispatch adn-playchange on pause', async () => {
      await createPlayer()
      const spy = vi.fn()
      document.addEventListener('adn-playchange', spy)

      element.handleEvent(new Event('pause'))
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        detail: { origin: element, action: 'pause' },
      }))

      document.removeEventListener('adn-playchange', spy)
    })
  })

  describe('Multi-instance coordination', () => {
    it('should pause when another player starts playing', async () => {
      await createPlayer()
      element.state = 'playing'
      const pauseSpy = vi.fn()
      element.audio.pause = pauseSpy

      element.handleEvent(new CustomEvent('adn-playchange', {
        detail: { origin: 'other-player', action: 'play' },
      }))
      expect(pauseSpy).toHaveBeenCalled()
    })

    it('should ignore play events from itself', async () => {
      await createPlayer()
      element.state = 'playing'
      const pauseSpy = vi.fn()
      element.audio.pause = pauseSpy

      element.handleEvent(new CustomEvent('adn-playchange', {
        detail: { origin: element, action: 'play' },
      }))
      expect(pauseSpy).not.toHaveBeenCalled()
    })

    it('should not pause if already paused when another player plays', async () => {
      await createPlayer()
      element.state = 'paused'
      const pauseSpy = vi.fn()
      element.audio.pause = pauseSpy

      element.handleEvent(new CustomEvent('adn-playchange', {
        detail: { origin: 'other-player', action: 'play' },
      }))
      expect(pauseSpy).not.toHaveBeenCalled()
    })

    it('should sync volume from storage on external volume change', async () => {
      await createPlayer()
      element.handleEvent(new CustomEvent('adn-volumechange', {
        detail: { origin: 'other-player', data: 0.9 },
      }))
      expect(element.volume).toBe(0.7) // reads from mock storage which returns 0.7
    })

    it('should ignore its own volume events', async () => {
      await createPlayer()
      const originalVolume = element.volume

      element.handleEvent(new CustomEvent('adn-volumechange', {
        detail: { origin: element, data: 0.9 },
      }))
      expect(element.volume).toBe(originalVolume)
    })
  })

  describe('Volume', () => {
    it('should save volume to storage on UI change', async () => {
      await createPlayer()
      element.handleUIChangeVolume(new CustomEvent('adni-volumechange', { detail: 0.4 }))
      expect(element.volume).toBe(0.4)
      expect(element.audio.volume).toBe(0.4)
      expect(element.storage.set).toHaveBeenCalledWith('volume', 0.4, false)
    })

    it('should dispatch global volume event on UI change', async () => {
      await createPlayer()
      const spy = vi.fn()
      document.addEventListener('adn-volumechange', spy)

      element.handleUIChangeVolume(new CustomEvent('adni-volumechange', { detail: 0.6 }))
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        detail: { origin: element, data: 0.6 },
      }))

      document.removeEventListener('adn-volumechange', spy)
    })
  })

  describe('Seek', () => {
    it('should seek to correct position for non-preview variant', async () => {
      await createPlayer()
      element.activeTrack = mockSessionData.tracks[0] as any
      element.activeVariant = mockSessionData.firstTrack.variants[0] as any

      element.handleUISeek(new CustomEvent('adni-seek', { detail: 0.5 }))
      expect(element.audio.currentTime).toBe(90) // 0.5 * 180
    })
  })

  describe('Variant helpers', () => {
    it('should parse variant list from comma-separated string', async () => {
      await createPlayer({ variants: 'hq, lq, preview' })
      const result = element.getVariants()
      expect(result).toEqual(['hq', 'lq', 'preview'])
    })

    it('should filter empty entries', async () => {
      await createPlayer({ variants: 'hq,,lq,' })
      expect(element.getVariants()).toEqual(['hq', 'lq'])
    })
  })

  describe('calculateCurrentTime', () => {
    it('should return 0 when no active variant', async () => {
      await createPlayer()
      element.activeVariant = undefined
      expect(element.calculateCurrentTime(50, false)).toBe(0)
    })

    it('should return desiredTime for non-preview variant', async () => {
      await createPlayer()
      element.activeVariant = { isPreview: false } as any
      expect(element.calculateCurrentTime(42, false)).toBe(42)
      expect(element.calculateCurrentTime(42, true)).toBe(42)
    })

    it('should add offset for preview variant in raw mode', async () => {
      await createPlayer()
      element.activeVariant = {
        isPreview: true,
        preview: { offsetStart: 10, offsetEnd: 40, duration: 30 },
      } as any
      expect(element.calculateCurrentTime(5, true)).toBe(15) // 5 + 10
    })

    it('should subtract offset for preview variant in seek mode', async () => {
      await createPlayer()
      element.activeVariant = {
        isPreview: true,
        preview: { offsetStart: 10, offsetEnd: 40, duration: 30 },
      } as any
      expect(element.calculateCurrentTime(25, false)).toBe(15) // 25 - 10
    })

    it('should clamp to 0 when offset exceeds desired time', async () => {
      await createPlayer()
      element.activeVariant = {
        isPreview: true,
        preview: { offsetStart: 20, offsetEnd: 40, duration: 20 },
      } as any
      expect(element.calculateCurrentTime(5, false)).toBe(0)
    })
  })

  describe('Keyboard navigation', () => {
    it('should toggle play on Space key', async () => {
      await createPlayer()
      element.state = 'paused'
      const keyEvent = new KeyboardEvent('keydown', { key: ' ' })
      element['handleKeydown'](keyEvent)
      expect(element.audio.play).toHaveBeenCalled()
    })

    it('should toggle play on Enter key', async () => {
      await createPlayer()
      element.state = 'paused'
      const keyEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      element['handleKeydown'](keyEvent)
      expect(element.audio.play).toHaveBeenCalled()
    })

    it('should seek forward on ArrowRight', async () => {
      await createPlayer()
      element.activeTrack = { id: 't', duration: 100 } as any
      element.activeVariant = { isPreview: false } as any
      element.currentTime = 50

      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' })
      element['handleKeydown'](keyEvent)
      expect(element.currentTime).toBe(55)
    })

    it('should seek backward on ArrowLeft', async () => {
      await createPlayer()
      element.activeTrack = { id: 't', duration: 100 } as any
      element.activeVariant = { isPreview: false } as any
      element.currentTime = 50

      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' })
      element['handleKeydown'](keyEvent)
      expect(element.currentTime).toBe(45)
    })

    it('should increase volume on ArrowUp', async () => {
      await createPlayer()
      element.volume = 0.5
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      element['handleKeydown'](keyEvent)
      expect(element.volume).toBeCloseTo(0.55)
    })

    it('should decrease volume on ArrowDown', async () => {
      await createPlayer()
      element.volume = 0.5
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      element['handleKeydown'](keyEvent)
      expect(element.volume).toBeCloseTo(0.45)
    })

    it('should clamp volume at 1', async () => {
      await createPlayer()
      element.volume = 0.98
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      element['handleKeydown'](keyEvent)
      expect(element.volume).toBe(1)
    })

    it('should clamp volume at 0', async () => {
      await createPlayer()
      element.volume = 0.02
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      element['handleKeydown'](keyEvent)
      expect(element.volume).toBe(0)
    })
  })

  describe('Rendering', () => {
    it('should render loading state initially when session is pending', async () => {
      mockFetchSession.mockImplementation(() => new Promise(() => {})) // never resolves
      element = await fixture(html`<audiodn-player></audiodn-player>`) as unknown as AudioDnPlayer

      const loading = element.shadowRoot?.querySelector('.player-loading')
      expect(loading).to.exist
    })

    it('should render player-main after session loads', async () => {
      await createPlayer()
      const main = element.shadowRoot?.querySelector('.player-main')
      expect(main).to.exist
    })

    it('should render sub-components', async () => {
      await createPlayer()
      expect(element.shadowRoot?.querySelector('audiodn-play-button')).to.exist
      expect(element.shadowRoot?.querySelector('audiodn-volume-control')).to.exist
      expect(element.shadowRoot?.querySelector('audiodn-progress')).to.exist
      expect(element.shadowRoot?.querySelector('audiodn-cover-art')).to.exist
      expect(element.shadowRoot?.querySelector('audiodn-track-title')).to.exist
      expect(element.shadowRoot?.querySelector('audiodn-notification')).to.exist
    })

    it('should render tracklist', async () => {
      await createPlayer()
      const tracklist = element.shadowRoot?.querySelector('audiodn-tracklist')
      expect(tracklist).to.exist
    })

    it('should reflect buffering state on the play button', async () => {
      await createPlayer()
      element.isBuffering = true
      await element.updateComplete
      const playButton = element.shadowRoot?.querySelector('audiodn-play-button') as unknown as { buffering: boolean, updateComplete: Promise<unknown> }
      await playButton?.updateComplete
      expect(playButton?.buffering).toBe(true)
    })

    it('should show error/retry state on the play button when it has an error', async () => {
      await createPlayer()
      element.hasError = true
      await element.updateComplete
      const playButton = element.shadowRoot?.querySelector('audiodn-play-button') as unknown as { state: string, updateComplete: Promise<unknown> }
      await playButton?.updateComplete
      expect(playButton?.state).toBe('error')
    })

    it('should have screen-reader live region', async () => {
      await createPlayer()
      const srOnly = element.shadowRoot?.querySelector('.sr-only')
      expect(srOnly).to.exist
      expect(srOnly?.getAttribute('aria-live')).toBe('polite')
    })
  })

  describe('Audio error retry', () => {
    it('should retry on audio error up to max retries', async () => {
      await createPlayer()
      element.activeVariant = { url: 'https://cdn.test/track.mp3', isPreview: false } as any

      vi.useFakeTimers()
      element.handleEvent(new Event('error'))
      // While a retry is scheduled the player shows the buffering state.
      expect(element.isBuffering).toBe(true)
      expect(element.hasError).toBe(false)

      vi.advanceTimersByTime(1000)
      expect(element.audio.src).toBe('https://cdn.test/track.mp3')
      expect(element.audio.load).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('should surface an error state after exhausting retries', async () => {
      await createPlayer()
      element.activeVariant = { url: 'https://cdn.test/track.mp3', isPreview: false } as any
      ;(element as unknown as { _audioRetryCount: number })._audioRetryCount = 2
      ;(element as unknown as { _audioMaxRetries: number })._audioMaxRetries = 2

      element.handleEvent(new Event('error'))

      expect(element.hasError).toBe(true)
      expect(element.isBuffering).toBe(false)
    })
  })

  describe('Cleanup', () => {
    it('should clear session timer on disconnect', async () => {
      await createPlayer()
      element.disconnectedCallback()
      expect(mockClear).toHaveBeenCalled()
    })

    it('should pause audio and clear src on disconnect', async () => {
      await createPlayer()
      element.disconnectedCallback()
      expect(element.audio.pause).toHaveBeenCalled()
      expect(element.audio.src).toBe('')
    })
  })
})
