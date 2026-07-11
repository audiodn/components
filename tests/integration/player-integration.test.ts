import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { fixture, html } from '@open-wc/testing'
import { AudioDnPlayer } from '../../src/player'

const mockSessionData = {
  ok: true,
  playSessionId: 'sess-int',
  expiresAt: new Date(Date.now() + 3600_000),
  playSession: {
    id: 'sess-int',
    variants: ['hq'],
    isDownloadable: false,
    expiresAt: new Date(Date.now() + 3600_000),
  },
  tracks: [{
    id: 'track-1',
    coverImagePrefix: '/img/',
    index: 'track-1',
    duration: 120,
    info: null,
    organizationIndex: null,
    order: 1,
    metadata: null,
    playerTitle: 'Integration Track',
    playerSubtitle: 'Test Artist',
    playerColor: '#c13c5b',
    fileName: 't.mp3',
    isDark: false,
    theme: [],
  }],
  firstTrack: {
    ok: true,
    playSessionId: 'sess-int',
    trackId: 'track-1',
    playSession: { id: 'sess-int', variants: ['hq'], isDownloadable: false, expiresAt: new Date(Date.now() + 3600_000) },
    track: { id: 'track-1', playerTitle: 'Integration Track', playerSubtitle: 'Test Artist', duration: 120, playerColor: '#c13c5b', isDark: false, theme: [] },
    levels: { avg: -12, max: -3, min: -24, levels: [0.5], metric: 'dBFS', resample: 1, numSamples: 1 },
    variants: [{
      id: 'v-1',
      url: 'https://cdn.test/t.mp3',
      data: null,
      path: '/hq',
      size: 5000000,
      props: { codec: 'mp3', bitrate: 320, isStereo: true, isStripTags: false, isStripCover: false },
      variant: { id: 'var-hq', index: 'hq', variantType: { id: 'vt-1', title: 'HQ', viewerId: 'v1' } },
      fileName: 't-hq.mp3',
      isPublic: true,
      contentType: 'audio/mpeg',
      isPreview: false,
      preview: { offsetStart: 0, offsetEnd: 0, duration: 0 },
    }],
    coverImage: {
      icon: { height: 64, type: 'image/jpeg', url: 'https://cdn.test/icon.jpg', width: 64 },
      small: { height: 128, type: 'image/jpeg', url: 'https://cdn.test/small.jpg', width: 128 },
      regular: { height: 256, type: 'image/jpeg', url: 'https://cdn.test/regular.jpg', width: 256 },
      large: { height: 512, type: 'image/jpeg', url: 'https://cdn.test/large.jpg', width: 512 },
    },
  },
}

const mockFetchSession = vi.fn()

vi.mock('../../src/lib/session', () => ({
  fetchSession: (...args: unknown[]) => mockFetchSession(...args),
  SessionExpiryTimer: vi.fn().mockImplementation(() => ({
    schedule: vi.fn(),
    clear: vi.fn(),
  })),
}))

vi.mock('../../src/lib/api', () => ({
  getPlaySessionTrack: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor (message: string, status: number) {
      super(message)
      this.name = 'ApiError'
      this.status = status
    }
  },
}))

vi.mock('../../src/lib/storage', () => ({
  createStorage: vi.fn(() => ({
    get: vi.fn().mockReturnValue(0.5),
    set: vi.fn(),
    remove: vi.fn(),
  })),
}))

vi.mock('../../src/lib/audio', () => ({
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

describe('Player Integration Tests', () => {
  let element: AudioDnPlayer

  beforeEach(async () => {
    mockFetchSession.mockResolvedValue(structuredClone(mockSessionData))
    element = await fixture(html`<audiodn-player></audiodn-player>`) as unknown as AudioDnPlayer
    await element.updateComplete
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Communication', () => {
    it('should render play button sub-component', () => {
      expect(element.shadowRoot?.querySelector('audiodn-play-button')).to.exist
    })

    it('should render volume control sub-component', () => {
      expect(element.shadowRoot?.querySelector('audiodn-volume-control')).to.exist
    })

    it('should toggle play/pause via handleUIPlayPause', () => {
      const playSpy = vi.fn()
      const pauseSpy = vi.fn()
      element.audio.play = playSpy
      element.audio.pause = pauseSpy

      element.state = 'paused'
      element.handleUIPlayPause()
      expect(playSpy).toHaveBeenCalled()

      element.state = 'playing'
      element.handleUIPlayPause()
      expect(pauseSpy).toHaveBeenCalled()
    })

    it('should persist volume changes to storage', () => {
      const storageSpy = vi.fn()
      element.storage.set = storageSpy

      element.handleUIChangeVolume(new CustomEvent('adni-volumechange', { detail: 0.8 }))
      expect(element.volume).toBe(0.8)
      expect(storageSpy).toHaveBeenCalledWith('volume', 0.8, false)
    })
  })

  describe('Downloadable player', () => {
    it('passes download=true to settings menu when the downloadable attribute is set', async () => {
      // The cog download option is driven by the player's own `downloadable`
      // attribute, not the session flag. The API key remains the authoritative
      // gate server-side; the attribute only surfaces the option.
      const downloadablePlayer = await fixture(html`<audiodn-player downloadable></audiodn-player>`) as unknown as AudioDnPlayer
      await downloadablePlayer.updateComplete

      const settingsMenu = downloadablePlayer.shadowRoot?.querySelector('audiodn-settings-menu') as HTMLElement & { download?: boolean }
      expect(settingsMenu).to.exist
      expect((settingsMenu as any).download).toBe(true)
    })

    it('does not enable the download option by default', async () => {
      const settingsMenu = element.shadowRoot?.querySelector('audiodn-settings-menu') as HTMLElement & { download?: boolean }
      expect(settingsMenu).to.exist
      expect((settingsMenu as any).download).toBe(false)
    })
  })

  describe('Audio Event Handling', () => {
    it('should update state on play event', () => {
      element.handleEvent(new Event('play'))
      expect(element.state).toBe('playing')
    })

    it('should update state on pause event', () => {
      element.state = 'playing'
      element.handleEvent(new Event('pause'))
      expect(element.state).toBe('paused')
    })

    it('should handle timeupdate without crashing', () => {
      expect(() => element.handleEvent(new Event('timeupdate'))).not.toThrow()
    })

    it('should handle error event without crashing', () => {
      expect(() => element.handleEvent(new Event('error'))).not.toThrow()
    })
  })

  describe('Global Event Handling', () => {
    it('should emit volume change event globally', () => {
      const spy = vi.fn()
      document.addEventListener('adn-volumechange', spy)

      element.handleUIChangeVolume(new CustomEvent('adni-volumechange', { detail: 0.6 }))
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        detail: { origin: element, data: 0.6 },
      }))

      document.removeEventListener('adn-volumechange', spy)
    })

    it('should emit play state change globally on play', () => {
      const spy = vi.fn()
      document.addEventListener('adn-playchange', spy)

      element.handleEvent(new Event('play'))
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        detail: { origin: element, action: 'play' },
      }))

      document.removeEventListener('adn-playchange', spy)
    })

    it('should pause when another player plays', () => {
      element.state = 'playing'
      const pauseSpy = vi.fn()
      element.audio.pause = pauseSpy

      element.handleEvent(new CustomEvent('adn-playchange', {
        detail: { origin: 'other', action: 'play' },
      }))
      expect(pauseSpy).toHaveBeenCalled()
    })

    it('should ignore play events from itself', () => {
      element.state = 'playing'
      const pauseSpy = vi.fn()
      element.audio.pause = pauseSpy

      element.handleEvent(new CustomEvent('adn-playchange', {
        detail: { origin: element, action: 'play' },
      }))
      expect(pauseSpy).not.toHaveBeenCalled()
    })

    it('should not pause when another player pauses', () => {
      element.state = 'playing'
      const pauseSpy = vi.fn()
      element.audio.pause = pauseSpy

      element.handleEvent(new CustomEvent('adn-playchange', {
        detail: { origin: 'other', action: 'pause' },
      }))
      expect(pauseSpy).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle stalled events gracefully', () => {
      expect(() => element.handleEvent(new Event('stalled'))).not.toThrow()
      expect(element.isBuffering).toBe(true)
    })
  })
})
