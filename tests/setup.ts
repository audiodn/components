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
      play: vi.fn().mockResolvedValue(undefined),
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

// MediaRecorder / getUserMedia for the voice recorder component.
class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true)
  state: 'inactive' | 'recording' | 'paused' = 'inactive'
  mimeType: string
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  private _chunksEmitted = false

  constructor (_stream: MediaStream, opts?: { mimeType?: string }) {
    this.mimeType = opts?.mimeType || 'audio/webm;codecs=opus'
    MockMediaRecorder.instances.push(this)
  }

  static instances: MockMediaRecorder[] = []

  start () {
    this.state = 'recording'
  }

  pause () {
    this.state = 'paused'
  }

  resume () {
    this.state = 'recording'
  }

  stop () {
    this.state = 'inactive'
    if (!this._chunksEmitted && this.ondataavailable) {
      this.ondataavailable({ data: new Blob(['audio'], { type: this.mimeType }) })
      this._chunksEmitted = true
    }
    this.onstop?.()
  }
}

Object.defineProperty(window, 'MediaRecorder', {
  value: MockMediaRecorder,
  writable: true,
  configurable: true,
})

Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn(async () => ({
      getTracks: () => [{ stop: vi.fn() }],
    })),
  },
  writable: true,
  configurable: true,
})

// AudioContext for client-side waveform levels + live mic analyser.
class MockAudioContext {
  decodeAudioData = vi.fn(async () => ({
    getChannelData: () => new Float32Array(1024).map((_, i) => Math.sin(i / 10) * 0.5),
  }))

  createAnalyser = vi.fn(() => ({
    fftSize: 256,
    smoothingTimeConstant: 0.65,
    getByteTimeDomainData: vi.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = 128
    }),
  }))

  createMediaStreamSource = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  }))

  close = vi.fn(async () => undefined)
}

Object.defineProperty(window, 'AudioContext', {
  value: MockAudioContext,
  writable: true,
  configurable: true,
})

if (!URL.createObjectURL) {
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:mock-url'),
    writable: true,
  })
} else {
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:mock-url')
}

if (!URL.revokeObjectURL) {
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: vi.fn(),
    writable: true,
  })
} else {
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
}

// Expose for tests that need to reset MediaRecorder instances.
;(globalThis as unknown as { MockMediaRecorder: typeof MockMediaRecorder }).MockMediaRecorder = MockMediaRecorder
