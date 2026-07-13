import { expect, afterEach } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers)

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  // Clear any global state or mocks
  vi.clearAllMocks()
})

// Mock sessionStorage for tests
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  },
  writable: true
})

// Mock localStorage for tests
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  },
  writable: true
})

// Mock the canvas 2D context. jsdom doesn't implement getContext, which the
// waveform component calls in firstUpdated(); without this, waveform draws throw
// noisy "Not implemented" errors during player/waveform tests. The stub records
// fillStyle so the waveform's color normalization round-trips.
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  value: vi.fn(() => {
    const ctx: Record<string, unknown> = {
      canvas: {},
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() }))
    }
    return ctx
  })
})

// Mock Audio API for tests
Object.defineProperty(window, 'Audio', {
  value: vi.fn().mockImplementation(() => {
    const el = {
      _src: '',
      preload: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      load: vi.fn(),
      getAttribute: vi.fn(function (this: { _src: string }, name: string) {
        if (name === 'src') return this._src || null
        return null
      }),
      removeAttribute: vi.fn(function (this: { _src: string }, name: string) {
        if (name === 'src') this._src = ''
      }),
      currentTime: 0,
      duration: 0,
      volume: 1,
      muted: false,
      paused: true,
      ended: false,
      readyState: 0,
      networkState: 0,
      error: null,
      currentSrc: '',
    }
    Object.defineProperty(el, 'src', {
      get () { return el._src },
      set (value: string) { el._src = value },
      configurable: true,
    })
    return el
  }),
  writable: true
})
