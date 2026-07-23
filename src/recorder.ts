import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import {
  createUploadSessionWithTrack,
  getUploadSession,
  getTrackUploadUrl,
  type UploadSessionData,
} from './lib/api.ts'
import { SessionExpiryTimer } from './lib/session.ts'
import {
  iconMic,
  iconStop,
  iconTrash,
  iconCheck,
  iconPlay,
  iconPause,
  iconAlert,
  iconMoreVertical,
} from './lib/constants.ts'
import { globalReset, globalVariables, themePalette } from './global-css.ts'
import { accentForTheme, isDark as isColorDark, parseHex } from './lib/color.ts'
import { t, type Locale } from './lib/i18n.ts'
import './components/notification.ts'
import './waveform.ts'
import type { CSSResult } from 'lit'
import type { AudioDnNotification } from './components/notification.ts'

export type Theme = 'auto' | 'dark' | 'light'
export type RecorderVariant = 'panel'
export type RecorderMode = 'idle' | 'countdown' | 'recording' | 'preview' | 'uploading' | 'done'

const PROGRESS_THROTTLE_MS = 100
const DONE_RESET_MS = 2000
const WAVEFORM_BARS = 64
const DEFAULT_COUNTDOWN = 3
const COUNTDOWN_TICK_MS = 500
/** Upper bound so a misconfigured attribute can't stall the UI. */
const MAX_COUNTDOWN = 10
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/

const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
] as const

declare global {
  interface HTMLElementTagNameMap {
    'audiodn-recorder': AudiodnRecorder
  }
}

@customElement('audiodn-recorder')
export class AudiodnRecorder extends LitElement {
  @property({ type: String, attribute: 'upload-session-id' })
  uploadSessionId?: string

  @property({ type: String, attribute: 'api-key' })
  apiKey?: string

  @property({ type: String, attribute: 'collection-id' })
  collectionId?: string

  @property({ type: String, attribute: 'accent-color' })
  accentColor: string = '#fe008a'

  @property({ type: String, attribute: 'theme', reflect: true })
  theme: Theme = 'auto'

  @property({ type: String, attribute: 'locale', reflect: true })
  locale: Locale = 'en'

  @property({ type: Boolean, attribute: 'disabled' })
  disabled: boolean = false

  /** Max recording length in seconds. `0` = unlimited. */
  @property({ type: Number, attribute: 'max-duration' })
  maxDuration: number = 0

  /**
   * Pre-record countdown length (e.g. `3` → 3‑2‑1).
   * `0` skips the countdown and starts recording immediately.
   */
  @property({ type: Number, attribute: 'countdown' })
  countdown: number = DEFAULT_COUNTDOWN

  /**
   * When true, the host is set to `display: none` after a successful upload.
   * Hosts can clear the inline style (or remove/re-add the element) to show it again.
   */
  @property({ type: Boolean, attribute: 'auto-hide' })
  autoHide: boolean = false

  @property({ type: String, attribute: 'variant', reflect: true })
  variant: RecorderVariant = 'panel'

  @property({ type: Object, attribute: false })
  sessionData?: UploadSessionData

  @property({ type: String, attribute: false })
  error?: string

  @state()
  mode: RecorderMode = 'idle'

  @state()
  isLoading: boolean = false

  @state()
  isPaused: boolean = false

  @state()
  elapsedSeconds: number = 0

  @state()
  countdownValue: number = 0

  @state()
  durationSeconds: number = 0

  @state()
  previewProgress: number = 0

  @state()
  isPreviewPlaying: boolean = false

  @state()
  uploadProgress: number = 0

  @state()
  levels: number[] = []

  @state()
  private _blob: Blob | null = null

  @state()
  private _objectUrl: string | null = null

  @state()
  private _mimeType: string = 'audio/webm'

  @state()
  private _fileName: string = ''

  /** Available `audioinput` devices (empty until enumerated). */
  @state()
  _audioInputs: Array<{ deviceId: string; label: string }> = []

  /** Selected mic `deviceId`; empty means browser default. */
  @state()
  _selectedDeviceId: string = ''

  @state()
  _deviceMenuOpen: boolean = false

  private _mediaStream: MediaStream | null = null
  private _mediaRecorder: MediaRecorder | null = null
  private _chunks: Blob[] = []
  private _elapsedTimer?: ReturnType<typeof setInterval>
  private _countdownTimer?: ReturnType<typeof setInterval>
  private _recordStartedAt = 0
  private _pausedAccumMs = 0
  private _pauseStartedAt = 0
  private _previewAudio: HTMLAudioElement | null = null
  private _xhr?: XMLHttpRequest
  private _doneTimer?: ReturnType<typeof setTimeout>
  private _maxDurationTimer?: ReturnType<typeof setTimeout>
  private _sessionTimer = new SessionExpiryTimer()
  private _schemeQuery?: MediaQueryList
  private _onSchemeChange = () => {
    if (this.theme === 'auto') this.applyAccent()
  }
  private _onDeviceChange = () => {
    void this.refreshAudioInputs()
  }
  private _onDocPointerDown = (e: Event) => {
    if (!this._deviceMenuOpen) return
    const path = typeof e.composedPath === 'function' ? e.composedPath() : []
    const root = this.shadowRoot
    const device = root?.querySelector('.recorder-device')
    const menu = root?.querySelector('.recorder-device-menu')
    if ((device && path.includes(device)) || (menu && path.includes(menu))) return
    this.closeDeviceMenu()
  }
  private _onRepositionDeviceMenu = () => {
    this.positionDeviceMenu()
  }

  // Live input waveform while recording
  private _liveAudioCtx: AudioContext | null = null
  private _liveAnalyser: AnalyserNode | null = null
  private _liveSource: MediaStreamAudioSourceNode | null = null
  private _liveRafId: number | null = null
  private _liveLevelsBuf: number[] = []

  static styles = styles({ globalReset, globalVariables })

  render () {
    return template.call(this)
  }

  private getEffectiveTheme (): 'light' | 'dark' {
    if (this.theme === 'light' || this.theme === 'dark') return this.theme
    if (!this._schemeQuery) return 'dark'
    return this._schemeQuery.matches ? 'dark' : 'light'
  }

  private applyAccent () {
    const effectiveTheme = this.getEffectiveTheme()
    const accent = accentForTheme(this.accentColor, effectiveTheme) || this.accentColor

    this.style.setProperty('--_color-accent', accent)

    const rgb = parseHex(accent)
    if (rgb) {
      this.style.setProperty('--_color-accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`)
    }

    this.style.setProperty(
      '--_color-accent-alt',
      `var(--adn-color-accent-alt, ${isColorDark(accent) ? '#fff' : '#1c1c1e'})`
    )
  }

  updated (changedProperties: Map<string, unknown>) {
    if (
      (changedProperties.has('accentColor') && changedProperties.get('accentColor') !== undefined) ||
      changedProperties.has('theme')
    ) {
      this.applyAccent()
    }
  }

  async connectedCallback () {
    super.connectedCallback()
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this._schemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
      this._schemeQuery.addEventListener('change', this._onSchemeChange)
    }
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', this._onDeviceChange)
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('pointerdown', this._onDocPointerDown, true)
    }
    if (this.hasAttribute('accent-color')) {
      this.applyAccent()
    }
    void this.refreshAudioInputs()
    await this.loadSession()
  }

  disconnectedCallback () {
    super.disconnectedCallback()
    this._sessionTimer.clear()
    this._schemeQuery?.removeEventListener('change', this._onSchemeChange)
    this._schemeQuery = undefined
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.removeEventListener) {
      navigator.mediaDevices.removeEventListener('devicechange', this._onDeviceChange)
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('pointerdown', this._onDocPointerDown, true)
    }
    this._deviceMenuOpen = false
    this.removeAttribute('data-menu-open')
    this.unbindDeviceMenuPositioning()
    this.stopLiveLevels()
    this.clearCountdownTimer()
    this.teardownRecording(false)
    this.teardownPreview()
    if (this._xhr) {
      this._xhr.abort()
      this._xhr = undefined
    }
    if (this._doneTimer) {
      clearTimeout(this._doneTimer)
      this._doneTimer = undefined
    }
  }

  /** Prefer finite HTMLAudioElement.duration; fall back to recorded elapsed (WebM often reports Infinity). */
  effectiveDuration (): number {
    const d = this._previewAudio?.duration
    if (d && isFinite(d) && d > 0) return d
    return this.durationSeconds > 0 ? this.durationSeconds : 0
  }

  private notify (
    type: 'error' | 'success' | 'info' | 'warning',
    message: string,
    options?: { action?: { label: string, onClick: () => void }, duration?: number }
  ) {
    const el = this.shadowRoot?.querySelector<AudioDnNotification>('audiodn-notification')
    el?.add(type, message, options)
  }

  retryLoadSession () {
    this.error = undefined
    this.disabled = false
    this.loadSession()
  }

  /**
   * For `upload-session-id`: fetch and validate the existing session.
   * For `api-key`: credentials are checked only — the session (+ track) is
   * created on send via `createUploadSessionWithTrack`.
   */
  async loadSession () {
    if (!this.uploadSessionId && !this.apiKey) {
      this.error = 'Either upload-session-id or api-key must be provided'
      this.isLoading = false
      return
    }

    // api-key path: defer session creation until upload.
    if (!this.uploadSessionId && this.apiKey) {
      this.isLoading = false
      this.error = undefined
      return
    }

    this.isLoading = true
    try {
      const sessionData = await getUploadSession(this.uploadSessionId!, this.locale)
      if (!sessionData) {
        this.error = 'Failed to initialize upload session: No session data received'
        return
      }

      this.sessionData = sessionData
      this.scheduleSessionExpiry()

      const hasThemeOverride = getComputedStyle(this).getPropertyValue('--adn-color-accent').trim()
      if (this.sessionData.player_color && !this.hasAttribute('accent-color') && !hasThemeOverride) {
        this.accentColor = this.sessionData.player_color
        this.applyAccent()
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to initialize upload session: Unknown error occurred'
      this.notify('error', this.error, {
        action: { label: t(this.locale, 'action.retry'), onClick: () => this.retryLoadSession() },
      })
      this.dispatchEvent(new CustomEvent('session-error', {
        detail: { error: this.error },
        bubbles: true,
        composed: true,
      }))
    } finally {
      this.isLoading = false
    }
  }

  private scheduleSessionExpiry () {
    const expiresAt = this.sessionData?.expires_at
    if (!expiresAt) return

    this._sessionTimer.schedule(new Date(expiresAt), {
      onWarning: () => {
        // Session-id path cannot refresh; warn only.
      },
      onExpiry: () => {
        this.disabled = true
        this.notify('error', t(this.locale, 'recorder.notify.sessionExpired'))
        this.dispatchEvent(new CustomEvent('adn-session-expired', {
          detail: { uploadSessionId: this.sessionData?.upload_session_id },
          bubbles: true,
          composed: true,
        }))
      },
    })
  }

  // -------------------------------------------------------------------------
  // Recording
  // -------------------------------------------------------------------------

  private pickMimeType (): string {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
      return ''
    }
    for (const mime of PREFERRED_MIME_TYPES) {
      if (MediaRecorder.isTypeSupported(mime)) return mime
    }
    return ''
  }

  private extensionForMime (mime: string): string {
    const base = mime.split(';')[0]?.trim().toLowerCase() ?? ''
    if (base === 'audio/webm') return 'webm'
    if (base === 'audio/ogg') return 'ogg'
    if (base === 'audio/mp4') return 'm4a'
    if (base === 'audio/mpeg') return 'mp3'
    if (base === 'audio/wav' || base === 'audio/wave') return 'wav'
    return 'webm'
  }

  /** UTC timestamp filename, e.g. `voice-2026-07-21T23-51-00Z.webm`. */
  generateFileName (mime: string): string {
    const iso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-')
    return `voice-${iso}.${this.extensionForMime(mime)}`
  }

  /** Acquires mic permission + a `MediaRecorder`, wired up but not yet started. */
  private async acquireRecorder (): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.notify('error', t(this.locale, 'recorder.notify.micUnavailable'))
      return false
    }

    const audioConstraint: boolean | MediaTrackConstraints = this._selectedDeviceId
      ? { deviceId: { exact: this._selectedDeviceId } }
      : true

    try {
      this._mediaStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint })
    } catch (err) {
      // Selected device may have been unplugged — retry with the browser default.
      if (this._selectedDeviceId) {
        this._selectedDeviceId = ''
        try {
          this._mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch (retryErr) {
          this.reportMicError(retryErr)
          return false
        }
      } else {
        this.reportMicError(err)
        return false
      }
    }

    const trackDeviceId = this._mediaStream.getAudioTracks?.()[0]?.getSettings?.()?.deviceId
    if (trackDeviceId) this._selectedDeviceId = trackDeviceId
    void this.refreshAudioInputs()

    const mime = this.pickMimeType()
    this._mimeType = mime || 'audio/webm'
    this._chunks = []

    try {
      this._mediaRecorder = mime
        ? new MediaRecorder(this._mediaStream, { mimeType: mime })
        : new MediaRecorder(this._mediaStream)
      if (this._mediaRecorder.mimeType) {
        this._mimeType = this._mediaRecorder.mimeType
      }
    } catch {
      this.stopMediaStream()
      this.notify('error', t(this.locale, 'recorder.notify.micUnavailable'))
      return false
    }

    this._mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) this._chunks.push(e.data)
    }

    this._mediaRecorder.onstop = () => {
      this.onRecorderStopped()
    }

    return true
  }

  private reportMicError (err: unknown) {
    const name = err instanceof DOMException ? err.name : ''
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      this.notify('error', t(this.locale, 'recorder.notify.micDenied'))
    } else {
      this.notify('error', t(this.locale, 'recorder.notify.micUnavailable'))
    }
  }

  /** Refresh the list of `audioinput` devices. Menu shows only when length > 1. */
  async refreshAudioInputs () {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const inputs = devices
        .filter((d) => d.kind === 'audioinput' && d.deviceId)
        .map((d) => ({ deviceId: d.deviceId, label: d.label || '' }))
      this._audioInputs = inputs
      if (inputs.length <= 1) this.closeDeviceMenu()
      if (this._selectedDeviceId && !inputs.some((d) => d.deviceId === this._selectedDeviceId)) {
        this._selectedDeviceId = ''
      }
    } catch {
      // Enumeration can fail on locked-down environments; leave the list as-is.
    }
  }

  /** True when more than one mic is available and we are idle (picker is interactive). */
  showDevicePicker (): boolean {
    return this._audioInputs.length > 1 && this.mode === 'idle' && !this.disabled
  }

  deviceLabel (device: { deviceId: string; label: string }, index: number): string {
    if (device.label.trim()) return device.label
    return t(this.locale, 'recorder.device.unnamed', { n: String(index + 1) })
  }

  async toggleDeviceMenu (e?: Event) {
    e?.stopPropagation()
    e?.preventDefault()
    if (!this.showDevicePicker()) return
    if (this._deviceMenuOpen) {
      this.closeDeviceMenu()
      return
    }
    this._deviceMenuOpen = true
    this.setAttribute('data-menu-open', '')
    await this.updateComplete
    // Let layout settle before measuring, then promote to the top layer when available.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    this.showDeviceMenuPopover()
    this.positionDeviceMenu()
    this.bindDeviceMenuPositioning()
  }

  selectAudioInput (deviceId: string) {
    this._selectedDeviceId = deviceId
    this.closeDeviceMenu()
  }

  closeDeviceMenu () {
    if (!this._deviceMenuOpen) return
    this._deviceMenuOpen = false
    this.removeAttribute('data-menu-open')
    this.unbindDeviceMenuPositioning()
    const menu = this.shadowRoot?.querySelector<HTMLElement>('.recorder-device-menu')
    if (menu && typeof (menu as HTMLElement & { hidePopover?: () => void }).hidePopover === 'function') {
      try {
        ;(menu as HTMLElement & { hidePopover: () => void }).hidePopover()
      } catch {
        // Already closed / not open as a popover.
      }
    }
  }

  /**
   * Pin the open menu in the viewport (and prefer the Popover top layer) so it is
   * not clipped by `:host { overflow: hidden }` or ancestor overflow.
   */
  positionDeviceMenu () {
    const button = this.shadowRoot?.querySelector<HTMLElement>('.recorder-device-button')
    const menu = this.shadowRoot?.querySelector<HTMLElement>('.recorder-device-menu')
    if (!button || !menu) return

    menu.style.top = '0px'
    menu.style.left = '0px'
    menu.style.bottom = 'auto'
    menu.style.right = 'auto'

    const rect = button.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()
    const gap = 8
    const spaceAbove = rect.top
    const top = spaceAbove >= menuRect.height + gap
      ? rect.top - menuRect.height - gap
      : rect.bottom + gap

    let left = rect.left + rect.width / 2 - menuRect.width / 2
    const maxLeft = Math.max(8, window.innerWidth - menuRect.width - 8)
    if (left > maxLeft) left = maxLeft
    if (left < 8) left = 8

    menu.style.top = `${Math.max(8, top)}px`
    menu.style.left = `${left}px`
  }

  private bindDeviceMenuPositioning () {
    if (typeof window === 'undefined') return
    window.addEventListener('scroll', this._onRepositionDeviceMenu, true)
    window.addEventListener('resize', this._onRepositionDeviceMenu)
  }

  private unbindDeviceMenuPositioning () {
    if (typeof window === 'undefined') return
    window.removeEventListener('scroll', this._onRepositionDeviceMenu, true)
    window.removeEventListener('resize', this._onRepositionDeviceMenu)
  }

  private showDeviceMenuPopover () {
    const menu = this.shadowRoot?.querySelector<HTMLElement>('.recorder-device-menu')
    if (!menu) return
    const popoverMenu = menu as HTMLElement & { showPopover?: () => void }
    if (typeof popoverMenu.showPopover === 'function') {
      try {
        popoverMenu.showPopover()
      } catch {
        // Ignore if already open.
      }
    }
  }

  /** Starts the already-acquired `MediaRecorder` and enters `recording` mode. */
  private beginActiveRecording () {
    if (!this._mediaRecorder) return
    this._mediaRecorder.start(250)
    this._recordStartedAt = Date.now()
    this._pausedAccumMs = 0
    this._pauseStartedAt = 0
    this.isPaused = false
    this.elapsedSeconds = 0
    this.mode = 'recording'
    this.startElapsedTimer()
    this.armMaxDuration()
    this.startLiveLevels()

    this.dispatchEvent(new CustomEvent('recording-started', {
      bubbles: true,
      composed: true,
    }))
  }

  /** Starts recording immediately, with no countdown. */
  async startRecording () {
    if (this.disabled || this.isLoading || this.error) return
    if (this.mode === 'recording') return

    const ready = await this.acquireRecorder()
    if (!ready) return

    this.beginActiveRecording()
  }

  /** Resolved, clamped countdown length from the `countdown` attribute. */
  effectiveCountdown (): number {
    const n = Math.floor(Number(this.countdown))
    if (!Number.isFinite(n) || n < 0) return DEFAULT_COUNTDOWN
    return Math.min(n, MAX_COUNTDOWN)
  }

  /** Requests mic access, then runs a short visual countdown before recording actually begins. */
  async startCountdown () {
    if (this.disabled || this.isLoading || this.error) return
    if (this.mode !== 'idle') return

    const ready = await this.acquireRecorder()
    if (!ready) return
    // The click that triggered this may have raced a mode change (e.g. disabled mid-flight).
    if (this.mode !== 'idle') {
      this.stopMediaStream()
      this._mediaRecorder = null
      return
    }

    const ticks = this.effectiveCountdown()
    if (ticks <= 0) {
      this.beginActiveRecording()
      return
    }

    this.countdownValue = ticks
    this.mode = 'countdown'
    this.clearCountdownTimer()
    this._countdownTimer = setInterval(() => this.tickCountdown(), COUNTDOWN_TICK_MS)
  }

  private tickCountdown () {
    if (this.mode !== 'countdown') {
      this.clearCountdownTimer()
      return
    }
    this.countdownValue -= 1
    if (this.countdownValue <= 0) {
      this.clearCountdownTimer()
      this.beginActiveRecording()
    }
  }

  /** Cancels an in-progress countdown, releasing the already-acquired mic stream. */
  cancelCountdown () {
    if (this.mode !== 'countdown') return
    this.clearCountdownTimer()
    if (this._mediaRecorder) {
      this._mediaRecorder.onstop = null
      this._mediaRecorder = null
    }
    this.stopMediaStream()
    this._chunks = []
    this.countdownValue = 0
    this.mode = 'idle'

    this.dispatchEvent(new CustomEvent('recording-discarded', {
      bubbles: true,
      composed: true,
    }))
  }

  private clearCountdownTimer () {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer)
      this._countdownTimer = undefined
    }
  }

  private startLiveLevels () {
    this.stopLiveLevels()
    if (!this._mediaStream) {
      this.levels = fallbackLevels()
      return
    }

    try {
      const AudioCtx = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) {
        this.levels = fallbackLevels()
        return
      }
      const ctx = new AudioCtx()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.65
      const source = ctx.createMediaStreamSource(this._mediaStream)
      source.connect(analyser)
      this._liveAudioCtx = ctx
      this._liveAnalyser = analyser
      this._liveSource = source
      this._liveLevelsBuf = Array.from({ length: WAVEFORM_BARS }, () => 0.08)
      this.levels = [...this._liveLevelsBuf]
      this.tickLiveLevels()
    } catch {
      this.levels = fallbackLevels()
    }
  }

  private tickLiveLevels = () => {
    if (!this._liveAnalyser || this.mode !== 'recording') return

    const data = new Uint8Array(this._liveAnalyser.fftSize)
    this._liveAnalyser.getByteTimeDomainData(data)

    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const v = ((data[i] ?? 128) - 128) / 128
      sum += v * v
    }
    const rms = Math.sqrt(sum / data.length)
    // Emphasize quieter speech a bit for a livelier bar.
    const amp = Math.min(1, Math.pow(rms * 2.4, 0.7))

    this._liveLevelsBuf.push(this.isPaused ? 0.04 : Math.max(0.06, amp))
    if (this._liveLevelsBuf.length > WAVEFORM_BARS) {
      this._liveLevelsBuf.shift()
    }
    this.levels = [...this._liveLevelsBuf]
    this._liveRafId = requestAnimationFrame(this.tickLiveLevels)
  }

  private stopLiveLevels () {
    if (this._liveRafId !== null) {
      cancelAnimationFrame(this._liveRafId)
      this._liveRafId = null
    }
    try {
      this._liveSource?.disconnect()
    } catch { /* ignore */ }
    this._liveSource = null
    this._liveAnalyser = null
    if (this._liveAudioCtx) {
      this._liveAudioCtx.close().catch(() => undefined)
      this._liveAudioCtx = null
    }
  }

  private startElapsedTimer () {
    this.clearElapsedTimer()
    this._elapsedTimer = setInterval(() => {
      if (this.isPaused) return
      const elapsedMs = Date.now() - this._recordStartedAt - this._pausedAccumMs
      this.elapsedSeconds = Math.max(0, elapsedMs / 1000)
    }, 200)
  }

  private clearElapsedTimer () {
    if (this._elapsedTimer) {
      clearInterval(this._elapsedTimer)
      this._elapsedTimer = undefined
    }
  }

  private armMaxDuration () {
    this.clearMaxDurationTimer()
    if (!this.maxDuration || this.maxDuration <= 0) return
    this._maxDurationTimer = setTimeout(() => {
      this.notify('info', t(this.locale, 'recorder.notify.maxDuration'))
      this.stopRecording()
    }, this.maxDuration * 1000)
  }

  private clearMaxDurationTimer () {
    if (this._maxDurationTimer) {
      clearTimeout(this._maxDurationTimer)
      this._maxDurationTimer = undefined
    }
  }

  pauseRecording () {
    if (this.mode !== 'recording' || !this._mediaRecorder) return
    if (this._mediaRecorder.state !== 'recording') return
    try {
      this._mediaRecorder.pause()
    } catch {
      return
    }
    this.isPaused = true
    this._pauseStartedAt = Date.now()
    this.clearMaxDurationTimer()
  }

  resumeRecording () {
    if (this.mode !== 'recording' || !this._mediaRecorder) return
    if (this._mediaRecorder.state !== 'paused') return
    try {
      this._mediaRecorder.resume()
    } catch {
      return
    }
    if (this._pauseStartedAt) {
      this._pausedAccumMs += Date.now() - this._pauseStartedAt
      this._pauseStartedAt = 0
    }
    this.isPaused = false
    // Re-arm remaining max-duration budget.
    if (this.maxDuration > 0) {
      const remaining = Math.max(0, this.maxDuration - this.elapsedSeconds)
      this.clearMaxDurationTimer()
      if (remaining > 0) {
        this._maxDurationTimer = setTimeout(() => {
          this.notify('info', t(this.locale, 'recorder.notify.maxDuration'))
          this.stopRecording()
        }, remaining * 1000)
      } else {
        this.stopRecording()
      }
    }
  }

  togglePause () {
    if (this.isPaused) this.resumeRecording()
    else this.pauseRecording()
  }

  stopRecording () {
    if (this.mode !== 'recording' || !this._mediaRecorder) return
    this.clearElapsedTimer()
    this.clearMaxDurationTimer()
    const state = this._mediaRecorder.state
    if (state === 'recording' || state === 'paused') {
      try {
        this._mediaRecorder.stop()
      } catch {
        this.onRecorderStopped()
      }
    } else {
      this.onRecorderStopped()
    }
  }

  private onRecorderStopped () {
    this.clearElapsedTimer()
    this.clearMaxDurationTimer()
    this.stopLiveLevels()
    this.stopMediaStream()

    const mime = this._mimeType || 'audio/webm'
    const blob = new Blob(this._chunks, { type: mime })
    this._chunks = []
    this._mediaRecorder = null

    if (blob.size === 0) {
      this.mode = 'idle'
      this.elapsedSeconds = 0
      this.isPaused = false
      this.levels = []
      return
    }

    this._blob = blob
    this._fileName = this.generateFileName(mime)
    this.durationSeconds = this.elapsedSeconds
    this.teardownPreview()
    this._objectUrl = URL.createObjectURL(blob)
    this.setupPreviewAudio(this._objectUrl)
    this.mode = 'preview'
    this.isPaused = false
    this.previewProgress = 0
    this.isPreviewPlaying = false

    this.computeLevels(blob).catch(() => undefined)

    this.dispatchEvent(new CustomEvent('recording-stopped', {
      detail: { blob, duration: this.durationSeconds },
      bubbles: true,
      composed: true,
    }))
  }

  private stopMediaStream () {
    if (this._mediaStream) {
      for (const track of this._mediaStream.getTracks()) {
        track.stop()
      }
      this._mediaStream = null
    }
  }

  /** Discard in-progress recording or previewed clip and return to idle. */
  discardRecording () {
    if (this.mode === 'countdown') {
      this.clearCountdownTimer()
      this.countdownValue = 0
    }

    if (this.mode === 'recording' || this.mode === 'countdown') {
      this.clearElapsedTimer()
      this.clearMaxDurationTimer()
      this.stopLiveLevels()
      if (this._mediaRecorder) {
        this._mediaRecorder.onstop = null
        try {
          if (this._mediaRecorder.state !== 'inactive') this._mediaRecorder.stop()
        } catch { /* ignore */ }
        this._mediaRecorder = null
      }
      this.stopMediaStream()
      this._chunks = []
    }

    this.teardownPreview()
    this._blob = null
    this._fileName = ''
    this.elapsedSeconds = 0
    this.durationSeconds = 0
    this.previewProgress = 0
    this.levels = []
    this.uploadProgress = 0
    this.mode = 'idle'
    this.isPaused = false

    this.dispatchEvent(new CustomEvent('recording-discarded', {
      bubbles: true,
      composed: true,
    }))
  }

  private teardownRecording (emitDiscard: boolean) {
    this.clearElapsedTimer()
    this.clearMaxDurationTimer()
    this.clearCountdownTimer()
    this.stopLiveLevels()
    if (this._mediaRecorder) {
      this._mediaRecorder.onstop = null
      try {
        if (this._mediaRecorder.state !== 'inactive') this._mediaRecorder.stop()
      } catch { /* ignore */ }
      this._mediaRecorder = null
    }
    this.stopMediaStream()
    this._chunks = []
    if (emitDiscard && (this.mode === 'recording' || this.mode === 'preview')) {
      this.dispatchEvent(new CustomEvent('recording-discarded', {
        bubbles: true,
        composed: true,
      }))
    }
  }

  // -------------------------------------------------------------------------
  // Preview playback + waveform levels
  // -------------------------------------------------------------------------

  private setupPreviewAudio (url: string) {
    this.teardownPreviewAudioOnly()
    const audio = new Audio(url)
    audio.preload = 'metadata'
    audio.addEventListener('timeupdate', this.onPreviewTimeUpdate)
    audio.addEventListener('ended', this.onPreviewEnded)
    audio.addEventListener('loadedmetadata', this.onPreviewLoadedMetadata)
    this._previewAudio = audio
  }

  private onPreviewTimeUpdate = () => {
    if (!this._previewAudio) return
    const dur = this.effectiveDuration()
    if (dur > 0) {
      this.previewProgress = Math.min(1, Math.max(0, this._previewAudio.currentTime / dur))
      // Prefer finite media duration when it becomes available later.
      const mediaDur = this._previewAudio.duration
      if (mediaDur && isFinite(mediaDur) && mediaDur > 0) {
        this.durationSeconds = mediaDur
      }
    }
  }

  private onPreviewEnded = () => {
    this.isPreviewPlaying = false
    this.previewProgress = 0
    if (this._previewAudio) this._previewAudio.currentTime = 0
  }

  private onPreviewLoadedMetadata = () => {
    if (!this._previewAudio) return
    const dur = this._previewAudio.duration
    if (dur && isFinite(dur) && dur > 0) {
      this.durationSeconds = dur
    }
  }

  private teardownPreviewAudioOnly () {
    if (this._previewAudio) {
      this._previewAudio.pause()
      this._previewAudio.removeEventListener('timeupdate', this.onPreviewTimeUpdate)
      this._previewAudio.removeEventListener('ended', this.onPreviewEnded)
      this._previewAudio.removeEventListener('loadedmetadata', this.onPreviewLoadedMetadata)
      this._previewAudio.src = ''
      this._previewAudio = null
    }
    this.isPreviewPlaying = false
  }

  private teardownPreview () {
    this.teardownPreviewAudioOnly()
    if (this._objectUrl) {
      URL.revokeObjectURL(this._objectUrl)
      this._objectUrl = null
    }
  }

  async togglePreviewPlayback () {
    if (!this._previewAudio || this.mode !== 'preview') return
    if (this.isPreviewPlaying) {
      this._previewAudio.pause()
      this.isPreviewPlaying = false
    } else {
      try {
        await this._previewAudio.play()
        this.isPreviewPlaying = true
      } catch {
        this.isPreviewPlaying = false
      }
    }
  }

  handlePreviewSeek (e: CustomEvent<{ percent: number }>) {
    if (!this._previewAudio || this.mode !== 'preview') return
    const percent = e.detail?.percent
    if (typeof percent !== 'number' || !isFinite(percent)) return
    const dur = this.effectiveDuration()
    if (!(dur > 0)) return
    this._previewAudio.currentTime = percent * dur
    this.previewProgress = Math.min(1, Math.max(0, percent))
  }

  private async computeLevels (blob: Blob) {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) {
        this.levels = fallbackLevels()
        return
      }
      const ctx = new AudioCtx()
      const buffer = await blob.arrayBuffer()
      const decoded = await ctx.decodeAudioData(buffer.slice(0))
      const channel = decoded.getChannelData(0)
      const bars = WAVEFORM_BARS
      const block = Math.max(1, Math.floor(channel.length / bars))
      const peaks: number[] = []
      for (let i = 0; i < bars; i++) {
        const start = i * block
        let sum = 0
        let count = 0
        for (let j = start; j < start + block && j < channel.length; j++) {
          sum += Math.abs(channel[j] ?? 0)
          count++
        }
        peaks.push(count ? sum / count : 0)
      }
      // Normalize to 0–1
      const max = Math.max(...peaks, 1e-6)
      this.levels = peaks.map(v => v / max)
      await ctx.close().catch(() => undefined)
    } catch {
      this.levels = fallbackLevels()
    }
  }

  // -------------------------------------------------------------------------
  // Upload
  // -------------------------------------------------------------------------

  async sendRecording () {
    if (this.mode !== 'preview' || !this._blob || this.disabled) return

    this.teardownPreviewAudioOnly()
    this.mode = 'uploading'
    this.uploadProgress = 0

    const fileName = this._fileName || this.generateFileName(this._mimeType)
    this._fileName = fileName

    try {
      let uploadUrl: string
      let trackId: string

      if (this.apiKey && !this.uploadSessionId) {
        const trackOpts: { player_color?: string } = {}
        if (HEX_COLOR_RE.test(this.accentColor)) {
          trackOpts.player_color = this.accentColor
        }
        const result = await createUploadSessionWithTrack(
          this.apiKey,
          this.collectionId,
          fileName,
          trackOpts,
          this.locale
        )
        this.sessionData = result
        this.uploadSessionId = result.upload_session_id
        uploadUrl = result.track_upload.upload_url
        trackId = result.track_id
        this.scheduleSessionExpiry()
        this.dispatchEvent(new CustomEvent('adn-session-refreshed', {
          detail: { uploadSessionId: result.upload_session_id },
          bubbles: true,
          composed: true,
        }))
      } else if (this.sessionData?.upload_session_id || this.uploadSessionId) {
        const sessionId = this.sessionData?.upload_session_id || this.uploadSessionId!
        const uploadData = await getTrackUploadUrl(
          sessionId,
          fileName,
          this._blob.size,
          this.locale
        )
        if (!uploadData?.track_upload?.upload_url) {
          throw new Error('Failed to get upload URL')
        }
        uploadUrl = uploadData.track_upload.upload_url
        trackId = uploadData.track_id
      } else {
        throw new Error('Either upload-session-id or api-key must be provided')
      }

      await this.putBlob(uploadUrl, this._blob, trackId, fileName)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      // Quietly return to preview when the user cancelled; cancelUpload already
      // restored preview audio / mode.
      if (message === 'Upload cancelled') {
        if (this.mode === 'uploading') {
          this.mode = 'preview'
          this.uploadProgress = 0
          if (this._objectUrl) this.setupPreviewAudio(this._objectUrl)
        }
        return
      }
      this.notify('error', t(this.locale, 'recorder.notify.uploadFailedDetail', { error: message }), {
        action: { label: t(this.locale, 'action.retry'), onClick: () => this.sendRecording() },
      })
      this.mode = 'preview'
      this.uploadProgress = 0
      if (this._objectUrl) this.setupPreviewAudio(this._objectUrl)
    }
  }

  private putBlob (uploadUrl: string, blob: Blob, trackId: string, fileName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      this._xhr = xhr
      xhr.open('PUT', uploadUrl)

      let lastProgressUpdate = 0
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return
        const now = Date.now()
        if (now - lastProgressUpdate >= PROGRESS_THROTTLE_MS || event.loaded === event.total) {
          lastProgressUpdate = now
          this.uploadProgress = (event.loaded / event.total) * 100
          this.dispatchEvent(new CustomEvent('upload-progress', {
            detail: { percent: this.uploadProgress },
            bubbles: true,
            composed: true,
          }))
        }
      }

      xhr.onload = () => {
        this._xhr = undefined
        if (xhr.status === 200 || xhr.status === 201 || xhr.status === 204) {
          this.uploadProgress = 100
          this.notify('success', t(this.locale, 'recorder.notify.uploadSuccess'))
          this.dispatchEvent(new CustomEvent('file-uploaded', {
            detail: { trackId, fileName, blob },
            bubbles: true,
            composed: true,
          }))
          this.enterDone()
          resolve()
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      }

      xhr.onerror = () => {
        this._xhr = undefined
        reject(new Error('network error'))
      }

      xhr.onabort = () => {
        this._xhr = undefined
        reject(new Error('Upload cancelled'))
      }

      xhr.send(blob)
    })
  }

  cancelUpload () {
    if (this._xhr) {
      this._xhr.abort()
      this._xhr = undefined
    }
    this.uploadProgress = 0
    this.mode = 'preview'
    if (this._objectUrl) this.setupPreviewAudio(this._objectUrl)
  }

  private enterDone () {
    this.mode = 'done'
    this.teardownPreview()
    this._blob = null
    if (this.autoHide) {
      this.style.display = 'none'
    }
    if (this._doneTimer) clearTimeout(this._doneTimer)
    this._doneTimer = setTimeout(() => {
      this._doneTimer = undefined
      this.resetToIdle()
    }, DONE_RESET_MS)
  }

  private resetToIdle () {
    this.teardownPreview()
    this._blob = null
    this._fileName = ''
    this.elapsedSeconds = 0
    this.durationSeconds = 0
    this.previewProgress = 0
    this.uploadProgress = 0
    this.levels = []
    this.mode = 'idle'
    this.isPaused = false
  }

  // -------------------------------------------------------------------------
  // Click handlers
  // -------------------------------------------------------------------------

  handleMicClick () {
    if (this.disabled || this.isLoading || this.error) return
    this.closeDeviceMenu()
    if (this.mode === 'idle') this.startCountdown().catch(() => undefined)
    else if (this.mode === 'countdown') this.cancelCountdown()
    else if (this.mode === 'recording') this.stopRecording()
  }

  formatHms (seconds: number): string {
    const total = Math.max(0, Math.floor(seconds))
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}`
  }

  formatMmSs (seconds: number): string {
    const total = Math.max(0, Math.floor(seconds))
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${pad2(m)}:${pad2(s)}`
  }
}

function pad2 (n: number): string {
  return String(n).padStart(2, '0')
}

function fallbackLevels (): number[] {
  return Array.from({ length: WAVEFORM_BARS }, (_, i) => {
    const t = i / WAVEFORM_BARS
    return 0.25 + 0.5 * Math.abs(Math.sin(t * Math.PI * 4))
  })
}

function template (this: AudiodnRecorder) {
  return html`
    <audiodn-notification .locale=${this.locale}></audiodn-notification>

    ${this.error
      ? html`
          <div class="recorder-shell recorder-error-state" role="alert">
            <div class="recorder-error-icon">${iconAlert}</div>
            <div class="recorder-error-text">${this.error}</div>
            <button class="recorder-text-button" @click=${() => this.retryLoadSession()}>
              ${t(this.locale, 'recorder.error.tryAgain')}
            </button>
          </div>
        `
      : this.isLoading
        ? html`
            <div class="recorder-shell recorder-loading" role="status" aria-label=${t(this.locale, 'recorder.aria.loading')}>
              <span class="recorder-loader" aria-hidden="true"></span>
              <span class="sr-only">${t(this.locale, 'recorder.loadingText')}</span>
            </div>
          `
        : html`
            <div class="recorder-shell recorder-panel"
                 role="region"
                 aria-label=${t(this.locale, 'recorder.aria.region')}>
              ${this.mode === 'idle' || this.mode === 'countdown' || this.mode === 'recording'
                ? idleOrRecording.call(this)
                : ''}
              ${this.mode === 'preview' ? previewMode.call(this) : ''}
              ${this.mode === 'uploading' ? uploadingMode.call(this) : ''}
              ${this.mode === 'done' ? doneMode.call(this) : ''}
            </div>
          `
    }
  `
}

function idleOrRecording (this: AudiodnRecorder) {
  const recording = this.mode === 'recording'
  const counting = this.mode === 'countdown'
  const showDevices = this.showDevicePicker()
  return html`
    <div class="recorder-stage ${recording ? 'is-recording' : ''} ${counting ? 'is-counting' : ''}">
      <div class="recorder-mic-row">
        <div class="recorder-mic-row-side" aria-hidden="true"></div>
        <button
          class="recorder-mic-button ${recording ? 'is-recording' : ''} ${counting ? 'is-counting' : ''}"
          ?disabled=${this.disabled}
          aria-label=${recording
            ? t(this.locale, 'recorder.aria.stop')
            : counting
              ? t(this.locale, 'recorder.aria.cancelCountdown')
              : t(this.locale, 'recorder.aria.start')}
          @click=${() => this.handleMicClick()}
        >
          <span class="recorder-mic-halo" aria-hidden="true"></span>
          ${counting
            ? html`<span class="recorder-countdown-number" aria-live="assertive">${this.countdownValue}</span>`
            : html`<span class="recorder-mic-icon">${recording ? iconStop : iconMic}</span>`}
        </button>
        <div class="recorder-mic-row-side recorder-mic-row-side--end">
          ${showDevices
            ? html`
                <div class="recorder-device ${this._deviceMenuOpen ? 'is-open' : ''}">
                  <button
                    type="button"
                    class="recorder-device-button"
                    aria-label=${t(this.locale, 'recorder.aria.selectMic')}
                    aria-haspopup="listbox"
                    aria-expanded=${this._deviceMenuOpen ? 'true' : 'false'}
                    ?disabled=${this.disabled}
                    @pointerdown=${(e: Event) => e.stopPropagation()}
                    @click=${(e: Event) => this.toggleDeviceMenu(e)}
                  >
                    <span class="recorder-device-icon">${iconMoreVertical}</span>
                  </button>
                  ${this._deviceMenuOpen
                    ? html`
                        <ul
                          class="recorder-device-menu"
                          role="listbox"
                          popover="manual"
                          aria-label=${t(this.locale, 'recorder.device.menuLabel')}
                        >
                          ${this._audioInputs.map((device, index) => {
                            const selected = device.deviceId === this._selectedDeviceId
                              || (!this._selectedDeviceId && index === 0)
                            return html`
                              <li role="option" aria-selected=${selected ? 'true' : 'false'}>
                                <button
                                  type="button"
                                  class="recorder-device-option ${selected ? 'is-selected' : ''}"
                                  @click=${() => this.selectAudioInput(device.deviceId)}
                                >
                                  <span class="recorder-device-option-label">${this.deviceLabel(device, index)}</span>
                                  ${selected
                                    ? html`<span class="recorder-device-option-check" aria-hidden="true">${iconCheck}</span>`
                                    : ''}
                                </button>
                              </li>
                            `
                          })}
                        </ul>
                      `
                    : ''}
                </div>
              `
            : ''}
        </div>
      </div>

      <div class="recorder-lower-slot">
        ${recording
          ? html`
              <div class="recorder-wave-box" aria-hidden="true">
                <audiodn-waveform
                  class="recorder-waveform"
                  .levels=${this.levels}
                  .progress=${0}
                  height="40"
                  line-width="2"
                  gap="2"
                  locale=${this.locale}
                ></audiodn-waveform>
              </div>
            `
          : html`
              <div class="recorder-hint">
                ${counting
                  ? t(this.locale, 'recorder.countdown.hint')
                  : t(this.locale, 'recorder.idle.hint')}
              </div>
            `}
      </div>
    </div>
  `
}

function previewMode (this: AudiodnRecorder) {
  const dur = this.effectiveDuration()
  const current = this.formatMmSs(this.previewProgress * dur)
  const total = this.formatMmSs(dur)
  return html`
    <div class="recorder-stage recorder-preview">
      <div class="recorder-top recorder-controls">
        <button
          class="recorder-control-btn"
          aria-label=${t(this.locale, 'recorder.aria.discard')}
          @click=${() => this.discardRecording()}
        >${iconTrash}</button>
        <button
          class="recorder-control-btn"
          aria-label=${this.isPreviewPlaying
            ? t(this.locale, 'recorder.aria.pausePreview')
            : t(this.locale, 'recorder.aria.play')}
          @click=${() => this.togglePreviewPlayback()}
        >${this.isPreviewPlaying ? iconPause : iconPlay}</button>
        <button
          class="recorder-control-btn recorder-control-btn--primary recorder-control-btn--confirm"
          aria-label=${t(this.locale, 'recorder.aria.send')}
          @click=${() => this.sendRecording()}
        >${iconCheck}</button>
      </div>

      <div class="recorder-lower-slot">
        <div class="recorder-info">
          <div class="recorder-wave-box">
            <audiodn-waveform
              class="recorder-waveform"
              .levels=${this.levels}
              .progress=${this.previewProgress}
              .duration=${dur}
              height="40"
              line-width="2"
              gap="2"
              locale=${this.locale}
              @adni-seek=${(e: CustomEvent<{ percent: number }>) => this.handlePreviewSeek(e)}
            ></audiodn-waveform>
          </div>
          <div class="recorder-preview-time" aria-live="polite">
            ${t(this.locale, 'recorder.timer.preview', { current, total })}
          </div>
        </div>
      </div>
    </div>
  `
}

function uploadingMode (this: AudiodnRecorder) {
  const pct = Math.round(this.uploadProgress)
  return html`
    <div class="recorder-stage recorder-uploading">
      <div class="recorder-top recorder-controls">
        <button
          class="recorder-control-btn recorder-control-btn--primary recorder-control-btn--cancel"
          aria-label=${t(this.locale, 'recorder.aria.cancelUpload')}
          @click=${() => this.cancelUpload()}
        >${iconStop}</button>
      </div>

      <div class="recorder-lower-slot">
        <div class="recorder-info">
          <div class="recorder-wave-box recorder-upload-box">
            <div
              class="recorder-progress"
              role="progressbar"
              aria-valuenow=${pct}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuetext="${pct}%"
              aria-label=${t(this.locale, 'recorder.aria.progress')}
            >
              <div class="recorder-progress-bar" style="width: ${pct}%"></div>
            </div>
          </div>
          <div class="recorder-preview-time recorder-upload-percent" aria-live="polite">
            ${pct}%
          </div>
        </div>
      </div>
    </div>
  `
}

function doneMode (this: AudiodnRecorder) {
  return html`
    <div class="recorder-stage recorder-done" role="status" aria-label=${t(this.locale, 'recorder.aria.done')}>
      <div class="recorder-check">${iconCheck}</div>
    </div>
  `
}

function styles ({
  globalReset,
  globalVariables,
}: {
  globalReset: CSSResult
  globalVariables: CSSResult
}) {
  return css`
    ${globalReset}
    ${themePalette}

    :host {
      ${globalVariables}

      --_bg: var(--adn-bg, #000);
      --_bg-light: var(--adn-bg-light, #333);
      --_color-font: var(--adn-color-font, #fff);
      --_color-font-muted: var(--adn-color-font-muted, #bbb);
      --_color-accent: var(--adn-color-accent, #fe008a);
      --_color-accent-rgb: var(--adn-color-accent-rgb, 254, 0, 138);
      --_color-accent-alt: var(--adn-color-accent-alt, #fff);
      --_color-error: var(--adn-color-error, #dc2626);
      --_color-error-light: var(--adn-color-error-light, #fca5a5);
      --_color-highlight: var(--adn-color-highlight, rgba(255, 255, 255, 0.1));
      --_border-color: var(--adn-border-color, #555);
      --_radius: var(--adn-radius, 16px);
      --_transition: all var(--adn-animation-speed, 300ms) ease;
      --_transition-fast: all var(--adn-animation-speed-short, 150ms) ease;
      --_text-small: var(--adn-text-small, var(--step--1));
      --_text-regular: var(--adn-text-regular, var(--step-0));
      --_text-large: var(--adn-text-large, var(--step-1));
      --_control-shadow: var(--adn-box-shadow, 0 2px 10px rgba(0, 0, 0, 0.12));
      --_shell-min-height: clamp(180px, 34vw, 208px);

      -webkit-font-smoothing: antialiased;
      font-family: sans-serif;
      font-synthesis: none;
      -moz-osx-font-smoothing: grayscale;
      display: block;
      background: var(--_bg);
      color: var(--_color-font);
      padding: var(--adn-padding, var(--space-m));
      font-size: var(--_text-regular);
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
      border: var(--adn-main-border);
      border-radius: var(--_radius);
      box-shadow: var(--adn-box-shadow);
    }

    :host([data-menu-open]) {
      overflow: visible;
    }

    .recorder-shell {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: center;
      width: 100%;
      min-height: var(--_shell-min-height);
      box-sizing: border-box;
    }

    .recorder-error-state {
      align-items: center;
      gap: var(--space-s);
      padding: var(--space-s);
      text-align: center;
      border: 2px dashed color-mix(in srgb, var(--_color-error) 45%, var(--_border-color));
      border-radius: var(--_radius);
    }

    .recorder-error-icon {
      color: var(--_color-error);
      display: inline-flex;
    }

    .recorder-error-icon svg {
      width: 36px;
      height: 36px;
    }

    .recorder-error-text {
      color: var(--_color-error-light);
      font-size: var(--_text-small);
      max-width: 40ch;
      word-break: break-word;
    }

    .recorder-text-button {
      background: var(--_color-accent);
      color: var(--_color-accent-alt);
      border: none;
      padding: var(--space-xs) var(--space-s);
      border-radius: 999px;
      font-size: var(--_text-small);
      font-weight: 500;
      cursor: pointer;
      min-height: 44px;
    }

    .recorder-loading {
      align-items: center;
    }

    .recorder-loader {
      width: var(--adn-loader-size, 40px);
      height: var(--adn-loader-size, 40px);
      border-radius: 50%;
      border: var(--adn-loader-thickness, 3px) solid color-mix(in srgb, var(--_color-font) 18%, transparent);
      border-top-color: var(--_color-accent);
      animation: adn-loader-spin 0.8s linear infinite;
    }

    .recorder-stage {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-m);
      width: 100%;
      flex: 1;
      min-height: 0;
    }

    /* Shared top region: buttons live here in every mode so the primary
       control stays vertically anchored and switching modes is not jolting. */
    .recorder-top {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 88px;
    }

    .recorder-mic-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      width: 100%;
      min-height: 88px;
    }

    .recorder-mic-row-side {
      min-width: 0;
    }

    .recorder-mic-row-side--end {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .recorder-mic-button {
      position: relative;
      width: 88px;
      height: 88px;
      border-radius: 50%;
      border: none;
      background: var(--_color-accent);
      color: var(--_color-accent-alt);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--_control-shadow);
      transition: var(--_transition-fast);
      touch-action: none;
      justify-self: center;
    }

    .recorder-device {
      position: relative;
      z-index: 2;
    }

    .recorder-device-button {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid var(--_border-color, rgba(127, 127, 127, 0.35));
      background: var(--_bg-light);
      color: var(--_color-font, #eee);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      transition: var(--_transition-fast);
      padding: 0;
    }

    .recorder-device-button:hover:not(:disabled) {
      border-color: var(--_color-accent);
      color: var(--_color-accent);
    }

    .recorder-device-button:focus-visible {
      outline: 2px solid var(--_color-accent);
      outline-offset: 2px;
    }

    .recorder-device-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .recorder-device.is-open .recorder-device-button {
      border-color: var(--_color-accent);
      color: var(--_color-accent);
    }

    .recorder-device-icon {
      display: flex;
      width: 18px;
      height: 18px;
    }

    .recorder-device-icon svg {
      width: 100%;
      height: 100%;
    }

    .recorder-device-menu {
      position: fixed;
      inset: unset;
      margin: 0;
      z-index: 10000;
      min-width: 200px;
      max-width: min(280px, 70vw);
      padding: 6px;
      list-style: none;
      border-radius: 10px;
      border: 1px solid var(--_border-color, rgba(127, 127, 127, 0.35));
      background: var(--_bg-light);
      color: var(--_color-font);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
      max-height: 220px;
      overflow-y: auto;
    }

    .recorder-device-menu:popover-open {
      display: block;
    }

    .recorder-device-option {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border: none;
      background: transparent;
      color: var(--_color-font, #eee);
      text-align: left;
      font: inherit;
      font-size: 13px;
      line-height: 1.3;
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
    }

    .recorder-device-option:hover,
    .recorder-device-option.is-selected {
      background: color-mix(in srgb, var(--_color-accent) 16%, transparent);
    }

    .recorder-device-option-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .recorder-device-option-check {
      display: flex;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      color: var(--_color-accent);
    }

    .recorder-device-option-check svg {
      width: 100%;
      height: 100%;
    }

    .recorder-mic-button.is-recording {
      background: var(--_color-error, #dc2626);
      color: #fff;
    }

    .recorder-mic-button.is-recording .recorder-mic-halo {
      background: color-mix(in srgb, var(--_color-error, #dc2626) 22%, transparent);
      animation: adn-pulse 1.6s ease-in-out infinite;
    }

    .recorder-mic-button.is-counting .recorder-mic-halo {
      animation: adn-pulse 0.5s ease-in-out infinite;
    }

    .recorder-mic-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .recorder-mic-button:hover:not(:disabled) {
      transform: scale(1.03);
    }

    .recorder-mic-button:focus-visible {
      outline: 2px solid var(--_color-font);
      outline-offset: 3px;
    }

    .recorder-mic-halo {
      position: absolute;
      inset: -12px;
      border-radius: 50%;
      background: rgba(var(--_color-accent-rgb), 0.16);
      pointer-events: none;
      opacity: 1;
    }

    .recorder-mic-icon {
      position: relative;
      z-index: 1;
      display: inline-flex;
      width: 36px;
      height: 36px;
    }

    .recorder-mic-icon svg {
      width: 100%;
      height: 100%;
    }

    .recorder-countdown-number {
      position: relative;
      z-index: 1;
      font-size: 40px;
      font-weight: 700;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }

    .recorder-lower-slot {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 60px;
      box-sizing: border-box;
    }

    /* Shared bottom region: contextual info (hint, waveform+time, progress). */
    .recorder-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2xs);
      width: 100%;
    }

    .recorder-hint {
      font-size: var(--_text-small);
      color: var(--_color-font-muted);
      text-align: center;
      max-width: 28ch;
      line-height: 1.35;
    }

    .recorder-wave-box {
      width: 100%;
      border-radius: 12px;
      background: var(--_color-highlight);
      padding: var(--space-2xs) var(--space-s);
      box-sizing: border-box;
    }

    .recorder-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-m);
    }

    .recorder-control-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      background: var(--_bg-light);
      color: var(--_color-font-muted);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--_control-shadow);
      transition: var(--_transition-fast);
      padding: 0;
    }

    .recorder-control-btn svg {
      width: 20px;
      height: 20px;
    }

    .recorder-control-btn:hover {
      color: var(--_color-font);
    }

    .recorder-control-btn:focus-visible {
      outline: 2px solid var(--_color-accent);
      outline-offset: 2px;
    }

    .recorder-control-btn--primary {
      width: 60px;
      height: 60px;
      color: var(--_color-accent);
      background: color-mix(in srgb, var(--_bg-light) 85%, #fff);
    }

    .recorder-control-btn--primary svg {
      width: 26px;
      height: 26px;
    }

    .recorder-control-btn--confirm {
      background: var(--_color-accent);
      color: var(--_color-accent-alt);
    }

    .recorder-control-btn--confirm:hover {
      color: var(--_color-accent-alt);
      opacity: 0.92;
    }

    .recorder-control-btn--cancel {
      background: var(--_color-error);
      color: #fff;
    }

    .recorder-control-btn--cancel:hover {
      color: #fff;
      opacity: 0.92;
    }

    .recorder-preview-time {
      font-variant-numeric: tabular-nums;
      font-size: var(--step--2);
      color: var(--_color-font-muted);
      white-space: nowrap;
      text-align: center;
    }

    .recorder-waveform {
      width: 100%;
      min-width: 0;
      height: 40px;
      --adn-waveform-bg: transparent;
      --adn-waveform-color-fg: var(--_color-accent);
      --adn-waveform-color-playhead: var(--_color-font);
      --adn-color-accent: var(--_color-accent);
      background: transparent;
      border: none;
      padding: 0;
    }

    .recorder-progress {
      position: relative;
      width: 100%;
      height: 40px;
      background: var(--_bg-light);
      border-radius: 6px;
      overflow: hidden;
    }

    .recorder-upload-box {
      display: flex;
      align-items: center;
    }

    .recorder-progress-bar {
      height: 100%;
      background: var(--_color-accent);
      transition: width 200ms ease;
      opacity: 0.85;
    }

    .recorder-upload-percent {
      font-weight: 600;
    }

    .recorder-check {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: var(--_color-accent);
      color: var(--_color-accent-alt);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--_control-shadow);
    }

    .recorder-check svg {
      width: 40px;
      height: 40px;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    @keyframes adn-loader-spin {
      to { transform: rotate(360deg); }
    }

    @keyframes adn-pulse {
      0%, 100% { transform: scale(1); opacity: 0.55; }
      50% { transform: scale(1.08); opacity: 1; }
    }

    @media (prefers-reduced-motion: reduce) {
      .recorder-loader { animation-duration: 1.6s; }
      .recorder-mic-button:hover:not(:disabled) { transform: none; }
      .recorder-mic-button.is-recording .recorder-mic-halo { animation: none; }
      .recorder-mic-button.is-counting .recorder-mic-halo { animation: none; }
      .recorder-progress-bar { transition: none; }
    }
  `
}
