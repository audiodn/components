import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fixture } from '@open-wc/testing'
import { AudiodnRecorder } from '../src/recorder'

const mockSessionData = {
  ok: true,
  upload_session_id: 'up-sess-1',
  upload_session: { id: 'up-sess-1', upload_session_id: 'up-sess-1', expires_at: new Date(Date.now() + 3600_000).toISOString() },
  player_color: '#123456',
  expires_at: new Date(Date.now() + 3600_000).toISOString(),
}

const mockCreateUploadSessionWithTrack = vi.fn()
const mockGetUploadSession = vi.fn()
const mockGetTrackUploadUrl = vi.fn()
const mockSchedule = vi.fn()
const mockClear = vi.fn()

vi.mock('../src/lib/api', () => ({
  createUploadSessionWithTrack: (...args: unknown[]) => mockCreateUploadSessionWithTrack(...args),
  getUploadSession: (...args: unknown[]) => mockGetUploadSession(...args),
  getTrackUploadUrl: (...args: unknown[]) => mockGetTrackUploadUrl(...args),
}))

vi.mock('../src/lib/session', () => ({
  SessionExpiryTimer: vi.fn().mockImplementation(() => ({
    schedule: mockSchedule,
    clear: mockClear,
  })),
}))

class MockXHR {
  static instances: MockXHR[] = []
  status = 200
  upload: { onprogress: ((e: ProgressEvent) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  open = vi.fn()
  send = vi.fn()
  abort = vi.fn(() => { this.onabort?.() })
  constructor () {
    MockXHR.instances.push(this)
  }
}

type MockMediaRecorderCtor = {
  instances: Array<{
    state: string
    stop: () => void
    pause: () => void
    resume: () => void
  }>
  isTypeSupported: ReturnType<typeof vi.fn>
}

function getMockMediaRecorder (): MockMediaRecorderCtor {
  return (globalThis as unknown as { MockMediaRecorder: MockMediaRecorderCtor }).MockMediaRecorder
}

describe('AudiodnRecorder', () => {
  let element: AudiodnRecorder

  beforeEach(() => {
    mockCreateUploadSessionWithTrack.mockReset()
    mockGetUploadSession.mockReset()
    mockGetTrackUploadUrl.mockReset()
    mockSchedule.mockReset()
    mockClear.mockReset()
    MockXHR.instances = []
    getMockMediaRecorder().instances = []
    getMockMediaRecorder().isTypeSupported.mockReturnValue(true)
    vi.stubGlobal('XMLHttpRequest', MockXHR as unknown as typeof XMLHttpRequest)
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
      getAudioTracks: () => [{ stop: vi.fn(), getSettings: () => ({}) }],
    } as unknown as MediaStream)
    vi.mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValue([])
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  async function createRecorder (attrs: Record<string, string> = {}) {
    const el = document.createElement('audiodn-recorder')
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    element = await fixture(el) as unknown as AudiodnRecorder
    await element.updateComplete
    return element
  }

  async function notificationMessage (): Promise<string | undefined> {
    const notif = element.shadowRoot?.querySelector('audiodn-notification') as
      (HTMLElement & { updateComplete: Promise<unknown> }) | null
    await notif?.updateComplete
    return notif?.shadowRoot?.querySelector('.notification-message')?.textContent?.trim()
  }

  describe('Session loading', () => {
    it('accepts api-key without creating a session up front', async () => {
      await createRecorder({ 'api-key': 'key-1', 'collection-id': 'col-1' })

      expect(mockCreateUploadSessionWithTrack).not.toHaveBeenCalled()
      expect(mockGetUploadSession).not.toHaveBeenCalled()
      expect(element.error).toBeUndefined()
      expect(element.isLoading).toBe(false)
      expect(element.mode).toBe('idle')
    })

    it('fetches an existing session from upload-session-id', async () => {
      mockGetUploadSession.mockResolvedValue(structuredClone(mockSessionData))
      await createRecorder({ 'upload-session-id': 'up-sess-1' })

      expect(mockGetUploadSession).toHaveBeenCalledWith('up-sess-1', 'en')
      expect(element.sessionData?.upload_session_id).toBe('up-sess-1')
      expect(mockSchedule).toHaveBeenCalledTimes(1)
    })

    it('errors when neither api-key nor upload-session-id is provided', async () => {
      await createRecorder()
      expect(element.error).toBe('Either upload-session-id or api-key must be provided')
    })

    it('surfaces a session fetch failure and emits session-error', async () => {
      mockGetUploadSession.mockRejectedValue(new Error('Server said no'))
      const errorSpy = vi.fn()
      const el = document.createElement('audiodn-recorder')
      el.setAttribute('upload-session-id', 'up-sess-1')
      el.addEventListener('session-error', errorSpy)
      element = await fixture(el) as unknown as AudiodnRecorder
      await element.updateComplete

      expect(element.error).toBe('Server said no')
      expect(errorSpy).toHaveBeenCalled()
      expect(await notificationMessage()).toBe('Server said no')
    })
  })

  describe('Recording', () => {
    beforeEach(async () => {
      await createRecorder({ 'api-key': 'key-1', 'collection-id': 'col-1' })
    })

    it('starts recording on mic click (toggle mode)', async () => {
      const startedSpy = vi.fn()
      element.addEventListener('recording-started', startedSpy)

      await element.startRecording()
      await element.updateComplete

      expect(element.mode).toBe('recording')
      expect(startedSpy).toHaveBeenCalled()
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
      expect(getMockMediaRecorder().instances).toHaveLength(1)
    })

    it('enters a countdown (not immediate recording) on mic click', async () => {
      element.handleMicClick()
      await element.updateComplete
      await Promise.resolve()
      await element.updateComplete

      expect(element.mode).toBe('countdown')
      expect(element.countdownValue).toBe(3)
      // The recorder is acquired ahead of time so it's ready the instant the
      // countdown ends, but it must not have actually started recording yet.
      expect(getMockMediaRecorder().instances[0]?.state).not.toBe('recording')
      expect(element.shadowRoot?.querySelector('.recorder-countdown-number')?.textContent?.trim()).toBe('3')
    })

    it('counts down 3-2-1 then starts recording automatically', async () => {
      vi.useFakeTimers()
      try {
        const startedSpy = vi.fn()
        element.addEventListener('recording-started', startedSpy)

        await element.startCountdown()
        await element.updateComplete
        expect(element.mode).toBe('countdown')
        expect(element.countdownValue).toBe(3)

        await vi.advanceTimersByTimeAsync(500)
        expect(element.countdownValue).toBe(2)
        expect(element.mode).toBe('countdown')

        await vi.advanceTimersByTimeAsync(500)
        expect(element.countdownValue).toBe(1)
        expect(element.mode).toBe('countdown')

        await vi.advanceTimersByTimeAsync(500)
        expect(element.mode).toBe('recording')
        expect(startedSpy).toHaveBeenCalledTimes(1)
      } finally {
        vi.useRealTimers()
      }
    })

    it('cancels the countdown and releases the mic on a second click', async () => {
      vi.useFakeTimers()
      try {
        const stopTrack = vi.fn()
        vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue({
          getTracks: () => [{ stop: stopTrack }],
          getAudioTracks: () => [{ stop: stopTrack, getSettings: () => ({}) }],
        } as unknown as MediaStream)
        const discardedSpy = vi.fn()
        element.addEventListener('recording-discarded', discardedSpy)

        await element.startCountdown()
        await element.updateComplete
        expect(element.mode).toBe('countdown')

        element.handleMicClick()
        await element.updateComplete

        expect(element.mode).toBe('idle')
        expect(element.countdownValue).toBe(0)
        expect(stopTrack).toHaveBeenCalled()
        expect(discardedSpy).toHaveBeenCalledTimes(1)

        // No lingering timer should flip it back into recording.
        await vi.advanceTimersByTimeAsync(5000)
        expect(element.mode).toBe('idle')
        expect(getMockMediaRecorder().instances[0]?.state).not.toBe('recording')
      } finally {
        vi.useRealTimers()
      }
    })

    it('honors a custom countdown attribute length', async () => {
      vi.useFakeTimers()
      try {
        element.countdown = 2
        const startedSpy = vi.fn()
        element.addEventListener('recording-started', startedSpy)

        await element.startCountdown()
        await element.updateComplete
        expect(element.mode).toBe('countdown')
        expect(element.countdownValue).toBe(2)

        await vi.advanceTimersByTimeAsync(500)
        expect(element.countdownValue).toBe(1)

        await vi.advanceTimersByTimeAsync(500)
        expect(element.mode).toBe('recording')
        expect(startedSpy).toHaveBeenCalledTimes(1)
      } finally {
        vi.useRealTimers()
      }
    })

    it('skips the countdown when countdown="0"', async () => {
      element.countdown = 0
      const startedSpy = vi.fn()
      element.addEventListener('recording-started', startedSpy)

      await element.startCountdown()
      await element.updateComplete

      expect(element.mode).toBe('recording')
      expect(startedSpy).toHaveBeenCalledTimes(1)
      expect(element.shadowRoot?.querySelector('.recorder-countdown-number')).to.not.exist
    })

    it('clamps countdown to a safe range', () => {
      element.countdown = -5
      expect(element.effectiveCountdown()).toBe(3)
      element.countdown = 99
      expect(element.effectiveCountdown()).toBe(10)
      element.countdown = 1.9
      expect(element.effectiveCountdown()).toBe(1)
    })

    it('stops recording when the main button is clicked again', async () => {
      await element.startRecording()
      await element.updateComplete
      expect(element.mode).toBe('recording')
      expect(element.shadowRoot?.querySelector('.recorder-mic-button.is-recording')).to.exist

      element.handleMicClick()
      await element.updateComplete
      await Promise.resolve()
      await element.updateComplete

      expect(element.mode).toBe('preview')
    })

    it('stops recording and enters preview', async () => {
      const stoppedSpy = vi.fn()
      element.addEventListener('recording-stopped', stoppedSpy)

      await element.startRecording()
      element.stopRecording()
      await element.updateComplete
      // allow computeLevels microtasks
      await Promise.resolve()
      await element.updateComplete

      expect(element.mode).toBe('preview')
      expect(stoppedSpy).toHaveBeenCalled()
      expect(element.shadowRoot?.querySelector('.recorder-wave-box')).to.exist
    })

    it('pauses and resumes recording', async () => {
      await element.startRecording()
      element.pauseRecording()
      expect(element.isPaused).toBe(true)
      expect(getMockMediaRecorder().instances[0]!.state).toBe('paused')

      element.resumeRecording()
      expect(element.isPaused).toBe(false)
      expect(getMockMediaRecorder().instances[0]!.state).toBe('recording')
    })

    it('discards a recording and returns to idle', async () => {
      const discardSpy = vi.fn()
      element.addEventListener('recording-discarded', discardSpy)

      await element.startRecording()
      element.stopRecording()
      await element.updateComplete

      element.discardRecording()
      await element.updateComplete

      expect(element.mode).toBe('idle')
      expect(discardSpy).toHaveBeenCalled()
    })

    it('advances preview progress when media duration is Infinity', async () => {
      await element.startRecording()
      // Seed a known recorded duration before stop so effectiveDuration has a fallback.
      element.elapsedSeconds = 4
      element.stopRecording()
      await element.updateComplete
      await Promise.resolve()
      await element.updateComplete

      expect(element.mode).toBe('preview')
      expect(element.durationSeconds).toBeGreaterThan(0)

      // Simulate WebM: HTMLAudioElement.duration is Infinity while currentTime advances.
      const audio = (element as unknown as { _previewAudio: HTMLAudioElement | null })._previewAudio
      expect(audio).toBeTruthy()
      Object.defineProperty(audio!, 'duration', { configurable: true, get: () => Infinity })
      Object.defineProperty(audio!, 'currentTime', { configurable: true, writable: true, value: 2 })

      ;(element as unknown as { onPreviewTimeUpdate: () => void }).onPreviewTimeUpdate()
      await element.updateComplete

      expect(element.previewProgress).toBeCloseTo(0.5, 5)
      expect(element.effectiveDuration()).toBeGreaterThan(0)
      expect(Number.isFinite(element.effectiveDuration())).toBe(true)
    })

    it('shows discard, play/pause, and confirm controls in preview', async () => {
      await element.startRecording()
      element.stopRecording()
      await element.updateComplete

      const controls = element.shadowRoot?.querySelectorAll('.recorder-preview .recorder-control-btn')
      expect(controls?.length).toBe(3)
      expect(element.shadowRoot?.querySelector('.recorder-wave-box')).to.exist
    })

    it('generates a UTC-based voice filename', () => {
      const name = element.generateFileName('audio/webm;codecs=opus')
      expect(name).toMatch(/^voice-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z\.webm$/)
    })

    it('formats timers as HH:MM:SS and MM:SS', () => {
      expect(element.formatHms(10)).toBe('00:00:10')
      expect(element.formatHms(3661)).toBe('01:01:01')
      expect(element.formatMmSs(32)).toBe('00:32')
      expect(element.formatMmSs(125)).toBe('02:05')
    })
  })

  describe('Upload flow (api-key)', () => {
    beforeEach(async () => {
      await createRecorder({ 'api-key': 'key-1', 'collection-id': 'col-1', 'accent-color': '#7c3aed' })
      await element.startRecording()
      element.stopRecording()
      await element.updateComplete
      await Promise.resolve()
    })

    it('creates session+track in one request and PUTs the blob', async () => {
      mockCreateUploadSessionWithTrack.mockResolvedValue({
        ...mockSessionData,
        track_id: 'track-1',
        track_upload: { upload_url: 'https://cdn.test/put', method: 'PUT' },
      })
      const uploadedSpy = vi.fn()
      element.addEventListener('file-uploaded', uploadedSpy)

      const sendPromise = element.sendRecording()
      await Promise.resolve()

      expect(mockCreateUploadSessionWithTrack).toHaveBeenCalledWith(
        'key-1',
        'col-1',
        expect.stringMatching(/^voice-/),
        { player_color: '#7c3aed' },
        'en'
      )

      const xhr = MockXHR.instances[0]
      expect(xhr).toBeDefined()
      expect(xhr!.open).toHaveBeenCalledWith('PUT', 'https://cdn.test/put')

      xhr!.status = 200
      xhr!.onload?.()
      await sendPromise
      await element.updateComplete

      expect(uploadedSpy).toHaveBeenCalled()
      const detail = uploadedSpy.mock.calls[0]![0].detail
      expect(detail.trackId).toBe('track-1')
      expect(detail.fileName).toMatch(/^voice-.*\.webm$/)
      expect(detail.blob).toBeInstanceOf(Blob)
      expect(element.mode).toBe('done')
    })

    it('hides the host with display:none when auto-hide is set', async () => {
      element.autoHide = true
      mockCreateUploadSessionWithTrack.mockResolvedValue({
        ...mockSessionData,
        track_id: 'track-1',
        track_upload: { upload_url: 'https://cdn.test/put', method: 'PUT' },
      })

      const sendPromise = element.sendRecording()
      await Promise.resolve()
      MockXHR.instances[0]!.status = 200
      MockXHR.instances[0]!.onload?.()
      await sendPromise
      await element.updateComplete

      expect(element.mode).toBe('done')
      expect(element.style.display).toBe('none')
    })

    it('does not hide the host when auto-hide is unset', async () => {
      mockCreateUploadSessionWithTrack.mockResolvedValue({
        ...mockSessionData,
        track_id: 'track-1',
        track_upload: { upload_url: 'https://cdn.test/put', method: 'PUT' },
      })

      const sendPromise = element.sendRecording()
      await Promise.resolve()
      MockXHR.instances[0]!.status = 200
      MockXHR.instances[0]!.onload?.()
      await sendPromise
      await element.updateComplete

      expect(element.mode).toBe('done')
      expect(element.style.display).not.toBe('none')
    })

    it('records progress and emits upload-progress', async () => {
      mockCreateUploadSessionWithTrack.mockResolvedValue({
        ...mockSessionData,
        track_id: 'track-1',
        track_upload: { upload_url: 'https://cdn.test/put' },
      })
      const progressSpy = vi.fn()
      element.addEventListener('upload-progress', progressSpy)

      const sendPromise = element.sendRecording()
      await Promise.resolve()

      MockXHR.instances[0]!.upload.onprogress?.(
        { lengthComputable: true, loaded: 40, total: 100 } as ProgressEvent
      )
      await element.updateComplete

      expect(element.uploadProgress).toBe(40)
      expect(progressSpy).toHaveBeenCalled()
      expect(element.shadowRoot?.querySelector('.recorder-upload-percent')?.textContent?.trim()).toBe('40%')
      expect(element.shadowRoot?.querySelector('.recorder-uploading .recorder-lower-slot')).to.exist
      expect(element.shadowRoot?.querySelector('.recorder-control-btn--cancel')).to.exist

      MockXHR.instances[0]!.status = 200
      MockXHR.instances[0]!.onload?.()
      await sendPromise
    })

    it('cancels an in-flight upload and returns to preview', async () => {
      mockCreateUploadSessionWithTrack.mockResolvedValue({
        ...mockSessionData,
        track_id: 'track-1',
        track_upload: { upload_url: 'https://cdn.test/put' },
      })

      const sendPromise = element.sendRecording()
      await Promise.resolve()
      expect(element.mode).toBe('uploading')

      element.cancelUpload()
      await sendPromise.catch(() => undefined)
      await element.updateComplete

      expect(element.mode).toBe('preview')
    })

    it('returns to preview and notifies on upload failure', async () => {
      mockCreateUploadSessionWithTrack.mockResolvedValue({
        ...mockSessionData,
        track_id: 'track-1',
        track_upload: { upload_url: 'https://cdn.test/put' },
      })

      const sendPromise = element.sendRecording()
      await Promise.resolve()

      MockXHR.instances[0]!.status = 500
      MockXHR.instances[0]!.onload?.()
      await sendPromise
      await element.updateComplete

      expect(element.mode).toBe('preview')
      expect(await notificationMessage()).toMatch(/Upload failed/)
    })
  })

  describe('Upload flow (upload-session-id)', () => {
    it('uses getTrackUploadUrl for a pre-created session', async () => {
      mockGetUploadSession.mockResolvedValue(structuredClone(mockSessionData))
      mockGetTrackUploadUrl.mockResolvedValue({
        ok: true,
        track_id: 'track-2',
        track_upload: { upload_url: 'https://cdn.test/put2' },
      })
      await createRecorder({ 'upload-session-id': 'up-sess-1' })

      await element.startRecording()
      element.stopRecording()
      await element.updateComplete
      await Promise.resolve()

      const sendPromise = element.sendRecording()
      await Promise.resolve()

      expect(mockGetTrackUploadUrl).toHaveBeenCalledWith(
        'up-sess-1',
        expect.stringMatching(/^voice-/),
        expect.any(Number),
        'en'
      )
      expect(mockCreateUploadSessionWithTrack).not.toHaveBeenCalled()

      MockXHR.instances[0]!.status = 204
      MockXHR.instances[0]!.onload?.()
      await sendPromise
      expect(element.mode).toBe('done')
    })
  })

  describe('Rendering', () => {
    it('renders the idle mic button once ready', async () => {
      await createRecorder({ 'api-key': 'key-1' })
      expect(element.shadowRoot?.querySelector('.recorder-mic-button')).to.exist
    })

    it('renders the error state with the message verbatim', async () => {
      await createRecorder()
      const text = element.shadowRoot?.querySelector('.recorder-error-text')
      expect(text?.textContent?.trim()).toBe('Either upload-session-id or api-key must be provided')
    })

    it('hides the mic device menu when only one audio input exists', async () => {
      vi.mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValue([
        { deviceId: 'mic-1', kind: 'audioinput', label: 'Built-in Mic', groupId: 'g1' } as MediaDeviceInfo,
      ])
      await createRecorder({ 'api-key': 'key-1' })
      await element.refreshAudioInputs()
      await element.updateComplete
      expect(element.shadowRoot?.querySelector('.recorder-device')).to.not.exist
    })

    it('shows the mic device menu when multiple audio inputs exist', async () => {
      vi.mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValue([
        { deviceId: 'mic-1', kind: 'audioinput', label: 'Built-in Mic', groupId: 'g1' } as MediaDeviceInfo,
        { deviceId: 'mic-2', kind: 'audioinput', label: 'USB Mic', groupId: 'g2' } as MediaDeviceInfo,
        { deviceId: 'spk-1', kind: 'audiooutput', label: 'Speakers', groupId: 'g3' } as MediaDeviceInfo,
      ])
      await createRecorder({ 'api-key': 'key-1' })
      await element.refreshAudioInputs()
      await element.updateComplete
      expect(element.shadowRoot?.querySelector('.recorder-device-button')).to.exist
      expect(element.shadowRoot?.querySelector('.recorder-device-menu')).to.not.exist

      element.toggleDeviceMenu()
      await element.updateComplete
      // Fixed positioning runs after updateComplete inside toggleDeviceMenu
      await Promise.resolve()
      const options = element.shadowRoot?.querySelectorAll('.recorder-device-option')
      expect(options?.length).toBe(2)
      expect(options?.[1].textContent).to.include('USB Mic')
    })

    it('selects a microphone and closes the menu', async () => {
      vi.mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValue([
        { deviceId: 'mic-1', kind: 'audioinput', label: 'Built-in Mic', groupId: 'g1' } as MediaDeviceInfo,
        { deviceId: 'mic-2', kind: 'audioinput', label: 'USB Mic', groupId: 'g2' } as MediaDeviceInfo,
      ])
      await createRecorder({ 'api-key': 'key-1' })
      await element.refreshAudioInputs()
      await element.toggleDeviceMenu()
      await element.updateComplete

      element.selectAudioInput('mic-2')
      await element.updateComplete
      expect(element._selectedDeviceId).toBe('mic-2')
      expect(element._deviceMenuOpen).toBe(false)
    })

    it('passes the selected deviceId into getUserMedia', async () => {
      vi.mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValue([
        { deviceId: 'mic-1', kind: 'audioinput', label: 'Built-in Mic', groupId: 'g1' } as MediaDeviceInfo,
        { deviceId: 'mic-2', kind: 'audioinput', label: 'USB Mic', groupId: 'g2' } as MediaDeviceInfo,
      ])
      await createRecorder({ 'api-key': 'key-1', countdown: '0' })
      await element.refreshAudioInputs()
      element.selectAudioInput('mic-2')
      await element.startRecording()
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: { deviceId: { exact: 'mic-2' } },
      })
    })
  })

  describe('Cleanup', () => {
    it('clears the session timer on disconnect', async () => {
      mockGetUploadSession.mockResolvedValue(structuredClone(mockSessionData))
      await createRecorder({ 'upload-session-id': 'up-sess-1' })
      element.disconnectedCallback()
      expect(mockClear).toHaveBeenCalled()
    })
  })
})
