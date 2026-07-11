import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fixture } from '@open-wc/testing'
import { AudiodnUploader } from '../src/uploader'

const mockSessionData = {
  ok: true,
  upload_session_id: 'up-sess-1',
  upload_session: { id: 'up-sess-1' },
  player_color: '#123456',
  expires_at: new Date(Date.now() + 3600_000).toISOString(),
}

const mockCreateUploadSession = vi.fn()
const mockGetUploadSession = vi.fn()
const mockGetTrackUploadUrl = vi.fn()
const mockSchedule = vi.fn()
const mockClear = vi.fn()

vi.mock('../src/lib/api', () => ({
  createUploadSession: (...args: unknown[]) => mockCreateUploadSession(...args),
  getUploadSession: (...args: unknown[]) => mockGetUploadSession(...args),
  getTrackUploadUrl: (...args: unknown[]) => mockGetTrackUploadUrl(...args),
}))

vi.mock('../src/lib/session', () => ({
  SessionExpiryTimer: vi.fn().mockImplementation(() => ({
    schedule: mockSchedule,
    clear: mockClear,
  })),
}))

// A controllable XMLHttpRequest so upload success/failure can be driven by the
// tests rather than by a real network request.
class MockXHR {
  static instances: MockXHR[] = []
  status = 200
  upload: { onprogress: ((e: ProgressEvent) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  open = vi.fn()
  send = vi.fn()
  abort = vi.fn()
  constructor () {
    MockXHR.instances.push(this)
  }
}

const uploadUrlResponse = {
  ok: true,
  track_id: 'track-1',
  track_upload: { upload_url: 'https://cdn.test/put' },
}

function makeAudioFile (name = 'song.mp3'): File {
  return new File(['audio-bytes'], name, { type: 'audio/mpeg' })
}

function fileList (...files: File[]): FileList {
  const list: Record<number, File> = {}
  files.forEach((f, i) => { list[i] = f })
  return { ...list, length: files.length, item: (i: number) => files[i] ?? null } as unknown as FileList
}

describe('AudiodnUploader', () => {
  let element: AudiodnUploader

  beforeEach(() => {
    mockCreateUploadSession.mockReset()
    mockGetUploadSession.mockReset()
    mockGetTrackUploadUrl.mockReset()
    mockSchedule.mockReset()
    mockClear.mockReset()
    MockXHR.instances = []
    vi.stubGlobal('XMLHttpRequest', MockXHR as unknown as typeof XMLHttpRequest)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  async function createUploader (attrs: Record<string, string> = {}) {
    const el = document.createElement('audiodn-uploader')
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    element = await fixture(el) as unknown as AudiodnUploader
    await element.updateComplete
    return element
  }

  // The notification is a nested custom element with its own update cycle, so
  // wait for it before reading its rendered message.
  async function notificationMessage (): Promise<string | undefined> {
    const notif = element.shadowRoot?.querySelector('audiodn-notification') as
      (HTMLElement & { updateComplete: Promise<unknown> }) | null
    await notif?.updateComplete
    return notif?.shadowRoot?.querySelector('.notification-message')?.textContent?.trim()
  }

  describe('Session loading', () => {
    it('creates a session from an api-key', async () => {
      mockCreateUploadSession.mockResolvedValue(structuredClone(mockSessionData))
      await createUploader({ 'api-key': 'key-1', 'collection-id': 'col-1' })

      expect(mockCreateUploadSession).toHaveBeenCalledWith('key-1', 'col-1', 'en')
      expect(element.sessionData?.upload_session_id).toBe('up-sess-1')
      expect(element.isLoading).toBe(false)
      expect(element.error).toBeUndefined()
      expect(mockSchedule).toHaveBeenCalledTimes(1)
    })

    it('fetches an existing session from upload-session-id', async () => {
      mockGetUploadSession.mockResolvedValue(structuredClone(mockSessionData))
      await createUploader({ 'upload-session-id': 'up-sess-1' })

      expect(mockGetUploadSession).toHaveBeenCalledWith('up-sess-1', 'en')
      expect(element.sessionData?.upload_session_id).toBe('up-sess-1')
    })

    it('errors when neither api-key nor upload-session-id is provided', async () => {
      await createUploader()
      expect(element.error).toBe('Either upload-session-id or api-key must be provided')
      expect(element.isLoading).toBe(false)
    })

    it('surfaces a session creation failure with the server message and emits session-error', async () => {
      mockCreateUploadSession.mockRejectedValue(new Error('Server said no'))
      const errorSpy = vi.fn()
      const el = document.createElement('audiodn-uploader')
      el.setAttribute('api-key', 'key-1')
      el.addEventListener('session-error', errorSpy)
      element = await fixture(el) as unknown as AudiodnUploader
      await element.updateComplete

      expect(element.error).toBe('Server said no')
      expect(errorSpy).toHaveBeenCalled()
      expect(await notificationMessage()).toBe('Server said no')
    })

    it('retryLoadSession clears the error and reloads successfully', async () => {
      mockCreateUploadSession
        .mockRejectedValueOnce(new Error('temporary'))
        .mockResolvedValueOnce(structuredClone(mockSessionData))
      await createUploader({ 'api-key': 'key-1' })
      expect(element.error).toBe('temporary')

      element.retryLoadSession()
      await new Promise(resolve => setTimeout(resolve, 0))
      await element.updateComplete

      expect(element.error).toBeUndefined()
      expect(element.sessionData?.upload_session_id).toBe('up-sess-1')
    })
  })

  describe('File filtering', () => {
    beforeEach(async () => {
      mockCreateUploadSession.mockResolvedValue(structuredClone(mockSessionData))
      mockGetTrackUploadUrl.mockResolvedValue({ ...uploadUrlResponse })
      await createUploader({ 'api-key': 'key-1' })
    })

    it('ignores non-audio files and warns', async () => {
      const pdf = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
      ;(element as any).handleFiles(fileList(pdf))
      await element.updateComplete

      expect(element.files).toHaveLength(0)
      expect(await notificationMessage()).toBe('No audio files detected. Please select audio files.')
    })

    it('queues audio files and starts uploading them', async () => {
      const filesSpy = vi.fn()
      element.addEventListener('files-selected', filesSpy)

      ;(element as any).handleFiles(fileList(makeAudioFile()))
      await element.updateComplete

      expect(element.files).toHaveLength(1)
      expect(element.files[0].name).toBe('song.mp3')
      expect(mockGetTrackUploadUrl).toHaveBeenCalledWith('up-sess-1', 'song.mp3', expect.any(Number), 'en')
      expect(filesSpy).toHaveBeenCalled()
    })
  })

  describe('Upload flow', () => {
    beforeEach(async () => {
      mockCreateUploadSession.mockResolvedValue(structuredClone(mockSessionData))
      await createUploader({ 'api-key': 'key-1' })
    })

    it('marks a file complete and emits file-uploaded on success', async () => {
      mockGetTrackUploadUrl.mockResolvedValue({ ...uploadUrlResponse })
      const uploadedSpy = vi.fn()
      element.addEventListener('file-uploaded', uploadedSpy)

      const file = makeAudioFile()
      await (element as any).uploadFile(file)

      const xhr = MockXHR.instances[0]
      expect(xhr).toBeDefined()
      expect(xhr!.open).toHaveBeenCalledWith('PUT', 'https://cdn.test/put')
      expect(xhr!.send).toHaveBeenCalledWith(file)

      xhr!.status = 200
      xhr!.onload?.()

      expect((file as any).isComplete).toBe(true)
      expect((file as any).uploadProgress).toBe(100)
      expect(uploadedSpy).toHaveBeenCalled()
    })

    it('records an error and notifies on non-200 responses', async () => {
      mockGetTrackUploadUrl.mockResolvedValue({ ...uploadUrlResponse })
      const file = makeAudioFile('broken.mp3')
      await (element as any).uploadFile(file)

      const xhr = MockXHR.instances[0]!
      xhr.status = 500
      xhr.onload?.()

      expect((file as any).uploadError).toBe('Upload failed with status 500')
      expect(await notificationMessage()).toBe('broken.mp3: upload failed')
    })

    it('records a network error via xhr.onerror', async () => {
      mockGetTrackUploadUrl.mockResolvedValue({ ...uploadUrlResponse })
      const file = makeAudioFile('neterr.mp3')
      await (element as any).uploadFile(file)

      MockXHR.instances[0]!.onerror?.()
      expect((file as any).uploadError).toBe('Upload failed: network error')
      expect(await notificationMessage()).toBe('neterr.mp3: network error')
    })

    it('records progress from upload.onprogress', async () => {
      mockGetTrackUploadUrl.mockResolvedValue({ ...uploadUrlResponse })
      const file = makeAudioFile()
      await (element as any).uploadFile(file)

      MockXHR.instances[0]!.upload.onprogress?.(
        { lengthComputable: true, loaded: 50, total: 100 } as ProgressEvent
      )
      expect((file as any).uploadProgress).toBe(50)
    })

    it('errors when the upload URL cannot be obtained', async () => {
      mockGetTrackUploadUrl.mockResolvedValue({ ok: true, track_id: 't', track_upload: { upload_url: '' } })
      const file = makeAudioFile()
      await (element as any).uploadFile(file)
      expect((file as any).uploadError).toBe('Failed to get upload URL')
    })

    it('errors when there is no active session', async () => {
      element.sessionData = undefined
      const file = makeAudioFile()
      await (element as any).uploadFile(file)
      expect((file as any).uploadError).toBe('No active upload session')
    })

    it('passes through a thrown server error verbatim in the notification', async () => {
      mockGetTrackUploadUrl.mockRejectedValue(new Error('quota exceeded'))
      const file = makeAudioFile('big.mp3')
      await (element as any).uploadFile(file)

      expect((file as any).uploadError).toBe('quota exceeded')
      expect(await notificationMessage()).toBe('big.mp3: quota exceeded')
    })
  })

  describe('Cancel / remove / retry', () => {
    beforeEach(async () => {
      mockCreateUploadSession.mockResolvedValue(structuredClone(mockSessionData))
      await createUploader({ 'api-key': 'key-1' })
    })

    it('cancels an in-flight upload', () => {
      const file = makeAudioFile()
      const abort = vi.fn()
      ;(file as any).xhr = { abort }
      element.files = [file as any]

      element.cancelUpload(file as any)
      expect(abort).toHaveBeenCalled()
      expect((file as any).uploadError).toBe('Upload cancelled')
    })

    it('removes a file from the queue', () => {
      const file = makeAudioFile()
      element.files = [file as any]
      element.removeFile(file as any)
      expect(element.files).toHaveLength(0)
    })

    it('resets error state and re-uploads on retry', async () => {
      mockGetTrackUploadUrl.mockResolvedValue({ ...uploadUrlResponse })
      const file = makeAudioFile()
      ;(file as any).uploadError = 'boom'
      element.files = [file as any]

      element.retryUpload(file as any)
      expect((file as any).uploadError).toBeUndefined()
      expect((file as any).uploadProgress).toBe(0)
      await Promise.resolve()
      expect(mockGetTrackUploadUrl).toHaveBeenCalled()
    })
  })

  describe('formatFileSize', () => {
    beforeEach(async () => {
      mockCreateUploadSession.mockResolvedValue(structuredClone(mockSessionData))
      await createUploader({ 'api-key': 'key-1' })
    })

    it('formats byte sizes', () => {
      expect(element.formatFileSize(0)).toBe('0 Bytes')
      expect(element.formatFileSize(1024)).toBe('1 KB')
      expect(element.formatFileSize(1048576)).toBe('1 MB')
    })
  })

  describe('totalProgress', () => {
    beforeEach(async () => {
      mockCreateUploadSession.mockResolvedValue(structuredClone(mockSessionData))
      await createUploader({ 'api-key': 'key-1' })
    })

    it('averages progress across active files', () => {
      const a = makeAudioFile('a.mp3'); (a as any).uploadProgress = 40
      const b = makeAudioFile('b.mp3'); (b as any).uploadProgress = 60
      element.files = [a as any, b as any]
      expect((element as any).totalProgress).toBe(50)
    })

    it('excludes errored files from the average', () => {
      const a = makeAudioFile('a.mp3'); (a as any).uploadProgress = 100
      const b = makeAudioFile('b.mp3'); (b as any).uploadProgress = 0; (b as any).uploadError = 'x'
      element.files = [a as any, b as any]
      expect((element as any).totalProgress).toBe(100)
    })
  })

  describe('Rendering', () => {
    it('renders the drop zone once loaded', async () => {
      mockCreateUploadSession.mockResolvedValue(structuredClone(mockSessionData))
      await createUploader({ 'api-key': 'key-1' })

      expect(element.shadowRoot?.querySelector('.uploader-upload-container')).to.exist
      expect(element.shadowRoot?.querySelector('.uploader-upload-title')?.textContent?.trim())
        .toBe('Drop Audio Tracks To Collection')
    })

    it('renders the error state with the message verbatim', async () => {
      await createUploader()
      const text = element.shadowRoot?.querySelector('.uploader-error-text')
      expect(text?.textContent?.trim()).toBe('Either upload-session-id or api-key must be provided')
    })

    it('renders queued files with name and size', async () => {
      mockCreateUploadSession.mockResolvedValue(structuredClone(mockSessionData))
      await createUploader({ 'api-key': 'key-1' })
      element.files = [makeAudioFile('queued.mp3') as any]
      await element.updateComplete

      expect(element.shadowRoot?.querySelector('.uploader-file-name')?.textContent?.trim())
        .toBe('queued.mp3')
    })
  })

  describe('Cleanup', () => {
    it('clears the session timer and aborts uploads on disconnect', async () => {
      mockCreateUploadSession.mockResolvedValue(structuredClone(mockSessionData))
      await createUploader({ 'api-key': 'key-1' })
      const abort = vi.fn()
      const file = makeAudioFile(); (file as any).xhr = { abort }
      element.files = [file as any]

      element.disconnectedCallback()
      expect(mockClear).toHaveBeenCalled()
      expect(abort).toHaveBeenCalled()
    })
  })
})
