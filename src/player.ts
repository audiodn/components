/* global sessionStorage */
import './components/cover-art.ts'
import './components/track-title.ts'
import './components/play-button.ts'
import './components/play-time.ts'
import './components/volume-control.ts'
import './components/progress.ts'
import './waveform.ts'
import './components/tracklist.ts'
import './components/settings-menu.ts'
import './components/notification.ts'
import { globalReset, globalVariables, themePalette } from './global-css.ts'

import { LitElement, html, css, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { createStorage } from './lib/storage.ts'
import { fetchSession, SessionExpiryTimer } from './lib/session.ts'
import { getPlaySessionTrack, ApiError } from './lib/api.ts'
import { createAudioInstance } from './lib/audio.ts'
import { isDark as isColorDark, parseHex } from './lib/color.ts'
import { t, type Locale } from './lib/i18n.ts'

import type { CSSResult } from 'lit'
import type { SessionData, PlaySession, PlaySessionTrack, FetchSession } from './lib/session.ts'
import type { BrowserStorage, storage } from './lib/storage.ts'
import type { Track, TrackVariant, TrackLevels, CoverImage } from './lib/track.ts'
import type { audioEventHandler } from './lib/audio.ts'
import type { AudioDnNotification } from './components/notification.ts'

export type Theme = 'auto' | 'dark' | 'light'

// A single slick loader is shown for at most this long while the session loads.
// It disappears as soon as the session is ready (often sooner), or when this
// timer elapses — whichever comes first.
const LOADER_DURATION_MS = 1000

@customElement('audiodn-player')
export class AudioDnPlayer extends LitElement {
  @property({ type: Object })
  playSession?: PlaySession

  @property({ type: String, attribute: 'play-session-id' })
  playSessionId?: string

  @property({ type: String, attribute: 'api-key', reflect: true })
  apiKey?: string

  @property({ type: String, attribute: 'scope', reflect: true })
  scope: string = ''

  @property({ type: String, attribute: 'id', reflect: true })
  id: string = ''

  @property({ type: String, attribute: 'variants' })
  variants: string = ''

  @property({ type: String, attribute: 'size', reflect: true })
  size: string = 'large'

  @property({ type: String, attribute: 'theme', reflect: true })
  theme: Theme = 'auto'

  @property({ type: String, attribute: 'locale', reflect: true })
  locale: Locale = 'en'

  @property({ type: Number, attribute: 'volume', reflect: true })
  volume: number = 0.7

  @property({ type: Boolean, attribute: 'autoplay', reflect: true })
  autoplay: boolean = false

  // Client-side download default. The API key's is_downloadable is the real,
  // server-enforced gate: the session stores (key AND this), so setting this to
  // true can never enable downloads the key forbids. When the key forbids it the
  // download endpoint returns 403 and we surface a localized notification.
  @property({ type: Boolean, attribute: 'downloadable', reflect: true })
  downloadable: boolean = false

  @property({ type: Number, attribute: 'session-ttl' })
  sessionTtl?: number

  @property({ type: String, attribute: 'waveform-variant' })
  waveformVariant: string = 'vertical'

  @property({ type: Number, attribute: 'waveform-height' })
  waveformHeight: number = 120

  @property({ type: Number, attribute: 'waveform-line-width' })
  waveformLineWidth: number = 2

  @property({ type: String, attribute: 'waveform-line-color' })
  waveformLineColor: string = '#888888'

  @property({ type: Number, attribute: 'waveform-gap' })
  waveformGap: number = 3

  @property({ type: Number, attribute: 'waveform-scale-strength' })
  waveformScaleStrength: number = 0.4

  @state()
  sessionData?: SessionData

  @state()
  tracks: Track[] = []

  @state()
  activeTrack?: Track

  @state()
  activeColorIsDark: boolean = false

  @state()
  activeLevels?: TrackLevels

  @state()
  activeVariant?: TrackVariant

  @state()
  activeColor?: string

  @state()
  activeCoverImage?: CoverImage

  @state()
  state: string = 'paused'

  @state()
  currentTime: number = 0

  @state()
  progressMinimum: number = 0

  @state()
  progressMaximum: number = 1

  audio: HTMLAudioElement = createAudioInstance(this.handleEvent.bind(this) as audioEventHandler)

  storage: storage = createStorage(sessionStorage as BrowserStorage)

  @state()
  activeTrackVariants: TrackVariant[] = []

  @state()
  selectedVariantIndex?: string

  @state()
  isLoading: boolean = true

  @state()
  showLoader: boolean = true

  @state()
  isBuffering: boolean = false

  @state()
  hasError: boolean = false

  private _audioRetryCount = 0
  private _audioMaxRetries = 2
  private _trackCache = new Map<string, import('./lib/session.ts').PlaySessionTrack>()
  private _sessionTimer = new SessionExpiryTimer()
  private _loaderTimer?: ReturnType<typeof setTimeout>
  private _schemeQuery?: MediaQueryList
  private _onSchemeChange = () => {
    // Only the `auto` theme tracks the OS setting; re-apply the accent so it
    // uses the correct light/dark variant for the newly-preferred scheme.
    if (this.theme === 'auto') this.applyAccent()
  }

  static styles = styles({ globalReset, globalVariables })

  async connectedCallback (this: AudioDnPlayer) {
    super.connectedCallback()

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this._schemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
      this._schemeQuery.addEventListener('change', this._onSchemeChange)
    }

    await this.loadSession()

    this.volume = this.getVolumeFromStorage()
    this.audio.volume = this.volume
    document.addEventListener('adn-volumechange', this)
    document.addEventListener('adn-playchange', this)
  }

  protected updated (changedProperties: Map<string, unknown>) {
    // When the theme attribute changes, re-resolve the accent to the matching
    // light/dark variant for the active track.
    if (changedProperties.has('theme') && this.activeTrack) {
      this.applyAccent()
    }
  }

  private getEffectiveTheme (): 'light' | 'dark' {
    if (this.theme === 'light' || this.theme === 'dark') return this.theme
    // Fall back to `dark` when the OS preference can't be read (e.g. SSR, older
    // environments); this matches the base CSS palette.
    if (!this._schemeQuery) return 'dark'
    return this._schemeQuery.matches ? 'dark' : 'light'
  }

  private async loadSession () {
    this.isLoading = true
    this.hasError = false
    this.startLoader()

    try {
      this.sessionData = await fetchSession(this as unknown as FetchSession)
      this.tracks = this.sessionData.tracks
      this.scheduleSessionExpiry()

      if (this.tracks[0]) {
        if (this.sessionData.firstTrack) {
          this._trackCache.set(this.tracks[0].id, this.sessionData.firstTrack)
          this.applyTrackData(this.tracks[0], this.sessionData.firstTrack)
          this.prefetchAdjacentTracks(this.tracks[0])
          if (this.autoplay) this.startPlayback()
        } else {
          await this.selectTrack(this.tracks[0])
          if (this.autoplay) this.startPlayback()
        }
      }
    } catch (err) {
      console.error(err)
      this.hasError = true
      this.notify('error', t(this.locale, 'player.notify.loadFailed'), {
        action: { label: t(this.locale, 'action.retry'), onClick: () => this.loadSession() },
      })
    } finally {
      this.isLoading = false
      this.dismissLoader()
    }
  }

  // Show the loader and arm a max-duration timer. If loading takes longer than
  // LOADER_DURATION_MS the loader clears anyway and the player renders.
  private startLoader () {
    this.showLoader = true
    if (this._loaderTimer) clearTimeout(this._loaderTimer)
    this._loaderTimer = setTimeout(() => {
      this.showLoader = false
      this._loaderTimer = undefined
    }, LOADER_DURATION_MS)
  }

  // Hide the loader immediately (loading finished before the timer elapsed).
  private dismissLoader () {
    if (this._loaderTimer) {
      clearTimeout(this._loaderTimer)
      this._loaderTimer = undefined
    }
    this.showLoader = false
  }

  disconnectedCallback () {
    super.disconnectedCallback()
    this._sessionTimer.clear()
    this._schemeQuery?.removeEventListener('change', this._onSchemeChange)
    this._schemeQuery = undefined
    if (this._loaderTimer) {
      clearTimeout(this._loaderTimer)
      this._loaderTimer = undefined
    }
    document.removeEventListener('adn-volumechange', this)
    document.removeEventListener('adn-playchange', this)
    this.audio.pause()
    this.audio.src = ''
  }

  private scheduleSessionExpiry () {
    if (!this.sessionData?.expiresAt) return

    this._sessionTimer.schedule(this.sessionData.expiresAt, {
      onWarning: () => {
        if (this.apiKey) this.refreshSession()
      },
      onExpiry: () => {
        if (this.apiKey) {
          this.refreshSession()
        } else {
          this.audio.pause()
          this.state = 'paused'
          this.dispatchEvent(new CustomEvent('adn-session-expired', {
            detail: { playSessionId: this.sessionData?.playSessionId },
            bubbles: true,
            composed: true,
          }))
        }
      },
    })
  }

  private async refreshSession () {
    if (!this.apiKey) return

    try {
      this.sessionData = await fetchSession({
        playSessionId: '',
        id: this.id,
        apiKey: this.apiKey,
        scope: this.scope,
        variants: this.getVariants(),
        sessionTtl: this.sessionTtl,
        locale: this.locale,
        downloadable: this.downloadable,
      })
      this._trackCache.clear()
      this.scheduleSessionExpiry()

      this.dispatchEvent(new CustomEvent('adn-session-refreshed', {
        detail: { playSessionId: this.sessionData.playSessionId },
        bubbles: true,
        composed: true,
      }))
    } catch (err) {
      console.error('Session refresh failed:', err)
      this.notify('error', t(this.locale, 'player.notify.sessionExpired'), {
        action: { label: t(this.locale, 'action.reload'), onClick: () => this.loadSession() },
      })
      this.dispatchEvent(new CustomEvent('adn-session-expired', {
        detail: { playSessionId: this.sessionData?.playSessionId },
        bubbles: true,
        composed: true,
      }))
    }
  }

  private isSessionExpiredError (err: unknown): boolean {
    return err instanceof ApiError && (err.status === 401 || err.status === 403 || err.status === 410)
  }

  private async refreshSessionAndRetry (retry: () => Promise<void>) {
    if (!this.apiKey) {
      this.notify('error', t(this.locale, 'player.notify.sessionExpired'), {
        action: { label: t(this.locale, 'action.reload'), onClick: () => this.loadSession() },
      })
      return
    }

    try {
      await this.refreshSession()
      await retry()
    } catch {
      this.notify('error', t(this.locale, 'player.notify.sessionExpired'), {
        action: { label: t(this.locale, 'action.reload'), onClick: () => this.loadSession() },
      })
    }
  }

  render () {
    return template.call(this)
  }

  private notify (
    type: 'error' | 'success' | 'info' | 'warning',
    message: string,
    options?: { action?: { label: string, onClick: () => void }, duration?: number }
  ) {
    const el = this.shadowRoot?.querySelector<AudioDnNotification>('audiodn-notification')
    el?.add(type, message, options)
  }

  async selectTrack (track: Track) {
    if (!this.sessionData?.playSessionId) {
      this.notify('error', t(this.locale, 'player.notify.noSession'))
      return
    }

    this.playSession = this.sessionData.playSession

    try {
      const cached = this._trackCache.get(track.id)
      const results = cached || await getPlaySessionTrack(this.sessionData.playSessionId, track.id, this.locale)

      if (!cached) {
        this._trackCache.set(track.id, results)
      }

      this.applyTrackData(track, results)
      this.prefetchAdjacentTracks(track)
    } catch (err) {
      if (this.isSessionExpiredError(err)) {
        await this.refreshSessionAndRetry(() => this.selectTrack(track))
        return
      }
      console.error(err)
      this.isBuffering = false
      this.hasError = true
      this.notify('error', t(this.locale, 'player.notify.trackLoadFailed'), {
        action: { label: t(this.locale, 'action.retry'), onClick: () => this.selectTrack(track) },
      })
    }
  }

  private applyTrackData (track: Track, results: PlaySessionTrack) {
    if (!this.sessionData?.playSessionId) return

    this.playSession = this.sessionData.playSession
    this.activeTrack = track
    this.activeLevels = results.levels
    this.activeCoverImage = results.coverImage
    this.activeTrackVariants = this.sortVariants(results.variants || [])

    this.applyAccent()

    const variant = this.findVariant(this.activeTrackVariants)
    if (!variant) return

    this.selectVariant(variant)
  }

  // Resolve the accent for the active track using the theme-aware color
  // variant: `playerColorDark` on a dark background, `playerColorLight` on a
  // light one (falling back to the base `playerColor`). The foreground drawn on
  // the accent (`--_color-accent-alt`, e.g. the play button icon) is chosen from
  // the luminance of the resolved accent so it always reads.
  private applyAccent () {
    const track = this.activeTrack
    if (!track) return

    const effectiveTheme = this.getEffectiveTheme()
    const variant = effectiveTheme === 'light' ? track.playerColorLight : track.playerColorDark
    const accent = variant || track.playerColor

    this.activeColor = accent
    this.activeColorIsDark = isColorDark(accent)

    const rgb = parseHex(accent)
    if (rgb) {
      this.style.setProperty('--_color-accent-rgb', `var(--adn-color-accent-rgb, ${rgb.r}, ${rgb.g}, ${rgb.b})`)
    }

    this.style.setProperty('--_color-accent', `var(--adn-color-accent, ${accent})`)
    this.style.setProperty('--_color-accent-alt', this.activeColorIsDark
      ? 'var(--adn-color-accent-alt, var(--adn-color-accent-dark, var(--_color-accent-dark)))'
      : 'var(--adn-color-accent-alt, var(--adn-color-accent-light, var(--_color-accent-light)))'
    )
  }

  private prefetchAdjacentTracks (currentTrack: Track) {
    if (!this.sessionData?.playSessionId || this.tracks.length <= 1) return

    const currentIndex = this.tracks.findIndex(t => t.id === currentTrack.id)
    const nextIndex = currentIndex + 1 < this.tracks.length ? currentIndex + 1 : 0
    const nextTrack = this.tracks[nextIndex]

    if (nextTrack && !this._trackCache.has(nextTrack.id)) {
      getPlaySessionTrack(this.sessionData.playSessionId, nextTrack.id, this.locale)
        .then(results => { this._trackCache.set(nextTrack.id, results) })
        .catch(err => {
          if (this.isSessionExpiredError(err) && this.apiKey) {
            this.refreshSession()
          }
        })
    }
  }

  sortVariants (variants: TrackVariant[]): TrackVariant[] {
    const attributeOrder = this.getVariants()
    const order = [] as TrackVariant[]

    for (const v of variants) {
      const idx = v.variant.index
      order[attributeOrder.indexOf(idx)] = v
    }

    return order
  }

  selectVariant (variant: TrackVariant, options?: { loadAudio?: boolean }) {
    if (!this.activeTrack) return

    if (variant.isPreview) {
      this.progressMinimum = this.activeTrack.duration > 0
        ? variant.preview.offsetStart / this.activeTrack.duration
        : 0
      this.progressMaximum = this.activeTrack.duration > 0
        ? variant.preview.offsetEnd / this.activeTrack.duration
        : 1
    } else {
      this.progressMinimum = 0
      this.progressMaximum = 1
    }

    const previousUrl = this.activeVariant?.url
    this.activeVariant = variant
    this.currentTime = this.calculateCurrentTime(0, true)
    this._audioRetryCount = 0
    this.hasError = false

    // Signed URLs are prepared at session load; only assign `src` (which starts
    // the GET) when playback is requested — or when a caller explicitly opts in
    // (autoplay, track switch while playing, retry).
    if (previousUrl && previousUrl !== variant.url) this.clearAudioSource()
    if (options?.loadAudio) this.ensureAudioSource()
  }

  private clearAudioSource () {
    this.audio.pause()
    this.audio.removeAttribute('src')
    this.audio.load()
  }

  private ensureAudioSource (): boolean {
    if (!this.activeVariant?.url) return false
    if (this.audio.getAttribute('src') !== this.activeVariant.url) {
      this.audio.src = this.activeVariant.url
    }
    return true
  }

  private startPlayback () {
    if (!this.ensureAudioSource()) return
    const result = this.audio.play()
    if (result && typeof result.catch === 'function') {
      result.catch((err: unknown) => console.error('Playback failed:', err))
    }
  }

  findVariant (variants: TrackVariant[], idx?: string) {
    let index
    if (idx) {
      index = idx
    } else if (this.selectedVariantIndex) {
      index = this.selectedVariantIndex
    } else {
      index = this.getVariants()[0]
    }

    const variant = variants.find(v => v.variant.index === index)
    if (!variant && variants[0]) {
      this.selectedVariantIndex = variants[0].variant.index
      return variants[0]
    }

    this.selectedVariantIndex = index
    return variant
  }

  handlePlayButtonClick (): void {
    if (this.hasError) {
      this.retryAudio()
      return
    }
    this.handleUIPlayPause()
  }

  handleUIPlayPause (): void {
    if (this.state === 'playing') {
      this.audio.pause()
    } else {
      this.startPlayback()
    }
  }

  retryAudio (): void {
    if (!this.activeVariant) {
      if (this.tracks[0]) {
        this.selectTrack(this.tracks[0])
          .then(() => this.startPlayback())
          .catch((err: unknown) => console.error('Track load failed:', err))
      }
      return
    }

    this.hasError = false
    this._audioRetryCount = 0
    this.isBuffering = true
    this.clearAudioSource()
    this.ensureAudioSource()
    this.audio.load()
    this.startPlayback()
  }

  handleUISelectTrack (event: CustomEvent): void {
    if (!this.tracks?.length) return

    const trackId = event.detail
    const track = this.tracks.find((track) => track.id === trackId)
    if (!track) return

    this.hasError = false
    this.isBuffering = true
    this.selectTrack(track)
      .then(() => this.startPlayback())
      .catch((err: unknown) => console.error('Track load failed:', err))
  }

  handleUISeek (event: CustomEvent): void {
    if (!this.activeTrack) return

    const percent = event.detail
    const newTime = Math.round(percent * this.activeTrack.duration)
    const nextTime = this.calculateCurrentTime(newTime, false)

    if (!this.ensureAudioSource()) return

    this.audio.currentTime = nextTime
    this.currentTime = newTime
    this.startPlayback()
  }

  handleUISelectVariant (event: CustomEvent): void {
    if (!this.audio) return

    const index = event.detail
    const variant = this.findVariant(this.activeTrackVariants, index)
    if (!variant) return

    const wasPlaying = this.state === 'playing'
    this.selectVariant(variant, { loadAudio: wasPlaying })
    if (wasPlaying) this.startPlayback()
  }

  // The cog attempts the download and, if the server (key-derived session) says
  // the track isn't downloadable, dispatches this so the player can show a
  // graceful, localized message instead of a broken/blocked download.
  handleDownloadError (): void {
    this.notify('error', t(this.locale, 'settings.notDownloadable'))
  }

  handleUIChangeVolume (event: CustomEvent): void {
    this.audio.volume = this.volume = event.detail
    this.storage.set('volume', event.detail, false)

    document.dispatchEvent(
      new CustomEvent('adn-volumechange', {
        detail: {
          origin: this,
          data: this.audio.volume
        }
      })
    )
  }

  protected handleKeydown (e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      this.handleUIPlayPause()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      if (this.activeTrack) {
        const seekTo = Math.min(this.currentTime + 5, this.activeTrack.duration)
        const nextTime = this.calculateCurrentTime(seekTo, false)
        this.audio.currentTime = nextTime
        this.currentTime = seekTo
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const seekTo = Math.max(this.currentTime - 5, 0)
      const nextTime = this.calculateCurrentTime(seekTo, false)
      this.audio.currentTime = nextTime
      this.currentTime = seekTo
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const newVol = Math.min(1, this.volume + 0.05)
      this.audio.volume = this.volume = newVol
      this.storage.set('volume', newVol, false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newVol = Math.max(0, this.volume - 0.05)
      this.audio.volume = this.volume = newVol
      this.storage.set('volume', newVol, false)
    }
  }

  calculateCurrentTime (desiredTime: number = 0, rawTime: boolean) {
    if (!this.activeVariant) {
      return 0
    }

    if (!this.activeVariant.isPreview) {
      return desiredTime
    }

    const offset = this.activeVariant.preview.offsetStart
    if (rawTime) {
      return desiredTime + offset
    } else {
      return Math.max(0, desiredTime - offset)
    }
  }

  handleEvent (event: Event | CustomEvent) {
    switch (event.type) {
      case 'timeupdate':
        this.currentTime = this.calculateCurrentTime(this.audio.currentTime, true)
        break

      case 'pause':
        this.state = 'paused'
        document.dispatchEvent(
          new CustomEvent('adn-playchange', {
            detail: { origin: this, action: 'pause' }
          })
        )
        break

      case 'play':
        this.state = 'playing'
        this.hasError = false
        document.dispatchEvent(
          new CustomEvent('adn-playchange', {
            detail: { origin: this, action: 'play' }
          })
        )
        break

      case 'waiting':
      case 'stalled':
        this.isBuffering = true
        break

      case 'canplay':
      case 'playing':
        this.isBuffering = false
        this.hasError = false
        break

      case 'error':
        this.isBuffering = false
        if (this._audioRetryCount < this._audioMaxRetries && this.activeVariant) {
          this._audioRetryCount++
          this.isBuffering = true
          const delay = 1000 * Math.pow(2, this._audioRetryCount - 1)
          setTimeout(() => {
            if (this.activeVariant) {
              this.clearAudioSource()
              this.ensureAudioSource()
              this.audio.load()
            }
          }, delay)
        } else {
          this.hasError = true
          this.state = 'paused'
          this.notify('error', t(this.locale, 'player.notify.playFailed'), {
            action: { label: t(this.locale, 'action.retry'), onClick: () => this.retryAudio() },
          })
        }
        break

      case 'adn-volumechange': {
        const volEvent = event as CustomEvent
        if (volEvent.detail.origin === this) return
        this.volume = this.getVolumeFromStorage()
        this.audio.volume = this.volume
        break
      }

      case 'adn-playchange': {
        const playEvent = event as CustomEvent
        if (playEvent.detail.origin === this) return
        if (playEvent.detail.action === 'play' && this.state === 'playing') {
          this.audio.pause()
        }
        break
      }
    }
  }

  getVolumeFromStorage (): number {
    const volume = this.storage.get('volume') || 0.7

    if (typeof volume === 'object') return 0.7
    if (typeof volume === 'string') return Number.parseFloat(volume)

    return volume
  }

  getVariants () {
    return this.variants
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'audiodn-player': AudioDnPlayer;
  }
}

function template (this: AudioDnPlayer) {
  return html`
    <audiodn-notification .locale=${this.locale}></audiodn-notification>

    ${this.showLoader ? loaderTemplate.call(this) : mainTemplate.call(this)}
  `
}

function loaderTemplate (this: AudioDnPlayer) {
  return html`
    <div class="player-loading" role="status" aria-label=${t(this.locale, 'player.aria.loading')}>
      <span class="player-loader" aria-hidden="true"></span>
      <span class="sr-only">${t(this.locale, 'player.loadingText')}</span>
    </div>
  `
}

function mainTemplate (this: AudioDnPlayer) {
  const buttonState = this.hasError ? 'error' : this.state

  return html`
    <div class="player-main"
         role="region"
         aria-label=${t(this.locale, 'player.aria.region')}
         tabindex="0"
         @keydown=${(e: KeyboardEvent) => this.handleKeydown(e)}>
      <audiodn-cover-art .coverImage=${this.activeCoverImage} .size=${this.size} .locale=${this.locale}></audiodn-cover-art>

      <div class="player-body">
        <div class="player-row-info">
          <audiodn-play-button @adni-click=${this.handlePlayButtonClick} .state=${buttonState} .buffering=${this.isBuffering} .isDark=${this.activeColorIsDark} .locale=${this.locale}></audiodn-play-button>
          <audiodn-track-title .title=${this.activeTrack?.playerTitle} .subtitle=${this.activeTrack?.playerSubtitle} .locale=${this.locale}></audiodn-track-title>
        </div>

        <audiodn-progress @adni-seek=${this.handleUISeek} .size=${this.size} .levels=${this.activeLevels} .currentTime=${this.currentTime} .duration=${this.activeTrack?.duration} .min=${this.progressMinimum} .max=${this.progressMaximum} .waveformVariant=${this.waveformVariant} .waveformHeight=${this.waveformHeight} .waveformLineWidth=${this.waveformLineWidth} .waveformLineColor=${this.waveformLineColor} .waveformGap=${this.waveformGap} .waveformScaleStrength=${this.waveformScaleStrength} .locale=${this.locale}></audiodn-progress>

        <div class="player-row-controls">
          <audiodn-play-time .elapsed=${this.currentTime} .duration=${this.activeTrack?.duration} .locale=${this.locale}></audiodn-play-time>
          <audiodn-volume-control .volume=${this.volume} @adni-volumechange=${this.handleUIChangeVolume} .locale=${this.locale}></audiodn-volume-control>
          <audiodn-settings-menu .variants=${this.activeTrackVariants} .variant=${this.activeVariant} .trackId=${this.activeTrack?.id} .playSessionId=${this.playSession?.id} .download=${this.downloadable} @adni-selectvariant=${this.handleUISelectVariant} @adni-download-error=${this.handleDownloadError} .locale=${this.locale}></audiodn-settings-menu>
        </div>
      </div>
    </div>

    <div aria-live="polite" class="sr-only">${statusMessage.call(this)}</div>

    ${this.tracks.length > 1
? html`
      <audiodn-tracklist @adni-track-selected=${this.handleUISelectTrack} .tracks=${this.tracks} .activeTrackId=${this.activeTrack?.id} .locale=${this.locale}></audiodn-tracklist>
    `
: nothing}
  `
}

function statusMessage (this: AudioDnPlayer): string {
  if (this.hasError) return t(this.locale, 'player.status.playbackError')
  if (this.isBuffering) return t(this.locale, 'player.status.buffering')
  if (this.state === 'playing' && this.activeTrack) {
    return t(this.locale, 'player.status.nowPlaying', { title: this.activeTrack.playerTitle })
  }
  return ''
}

function styles ({
  globalReset,
  globalVariables
}: {
  globalReset: CSSResult,
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
      --_color-accent: var(--adn-color-accent, #c13c5b);
      --_color-accent-rgb: var(--adn-color-accent-rgb, rgb(193 60 91));
      --_color-accent-dark: var(--adn-color-accent-dark, #fff);
      --_color-accent-light: var(--adn-color-accent-light, #000);
      --_transition: all var(--adn-animation-speed, 300ms) ease-in-out;
      --_size-icon: var(--adn-icon-size, var(--step-1));
      --_height-slider: var(--adn-height-slider, 4px);
      --_width-slider: var(--adn-width-slider, 4px);
      --_width-highlight: var(--adn-width-highlight, 4px);

      --_thumb-size: var(--adn-thumb-size, var(--step--2));
      --_thumb-size-hover: var(--adn-thumb-size-hover, var(--step--1));

      --_coverart-size: var(--adn-coverart-size, 200px);
      --_playbutton-size: var(--adn-playbutton-size, 32px);

      --_text-small: var(--adn-text-small, var(--step--1));
      --_text-regular: var(--adn-text-regular, var(--step-0));
      --_text-large: var(--adn-text-large, var(--step-1));

      --_row-info: var(--adn-row-info, 52px);
      --_row-progress: var(--adn-row-progress, 112px);
      --_row-controls: var(--adn-row-controls, 36px);
      --_gap: var(--adn-gap, 8px);

      -webkit-font-smoothing: antialiased;
      font-family: sans-serif;
      font-synthesis: none;
      -moz-osx-font-smoothing: grayscale;
      -webkit-text-size-adjust: none;
      -moz-text-size-adjust: none;
      text-size-adjust: none;
      background: var(--_bg);
      color: var(--_color-font);
      font-size: var(--_text-regular);
      width: 100%;
      box-sizing: border-box;
      display: grid;
      border: var(--adn-main-border);
      border-radius: var(--adn-radius);
      box-shadow: var(--adn-box-shadow);
      overflow: hidden;
      padding: var(--adn-padding, 0);
      gap: 0;
      position: relative;
    }

    :host([size="small"]) {
      --_coverart-size: 80px;
      --_playbutton-size: 34px;
      --_row-info: 44px;
      --_row-controls: 36px;
      --_gap: var(--adn-gap, var(--space-3xs));
      --_text-small: var(--step--1);
      --_text-regular: var(--step--1);
      --_text-large: var(--step--1);
      --_size-icon: var(--step--1);
      --adn-volumecontrol-padding-slider: 2px 0;
      --adn-settingsmenu-min-touch: 0;
    }

    :host([size="regular"]) {
      --_coverart-size: 120px;
      --_playbutton-size: 36px;
      --_row-info: 44px;
      --_row-progress: 44px;
      --_row-controls: 32px;
      --_gap: var(--adn-gap, var(--space-2xs));
      --_size-icon: var(--step--1);
      --_text-small: var(--step--2);
      --_text-regular: var(--step--1);
      --_text-large: var(--step-0);
      --adn-volumecontrol-padding-slider: 2px 0;
      --adn-settingsmenu-min-touch: 0;
    }

    :host([size="large"]) {
      --_coverart-size: 200px;
      --_playbutton-size: 42px;
      --_row-info: 52px;
      --_row-progress: 112px;
      --_row-controls: 36px;
      --_gap: var(--adn-gap, var(--space-xs));
      --_text-small: var(--step--1);
      --_text-regular: var(--step-0);
      --_text-large: var(--step-1);
      --adn-volumecontrol-padding-slider: 4px 0;
      --adn-settingsmenu-min-touch: 0;
    }

    /* ── Player main layout ── */

    .player-main {
      display: flex;
      align-items: stretch;

      > :first-child {
        flex-shrink: 0;
      }

      > :last-child {
        flex-basis: 0;
        flex-grow: 1;
        min-width: 0;
      }
    }

    .player-main:focus-visible {
      outline: 2px solid var(--_color-accent);
      outline-offset: -2px;
    }

    /* ── Player body (right of cover art) ── */

    .player-body {
      display: flex;
      flex-direction: column;
      position: relative;
      height: var(--_coverart-size);
      overflow: hidden;
    }

    /* ── Row: info (play button + track title) ── */

    .player-row-info {
      height: var(--_row-info);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: var(--_gap);
      padding-inline: var(--_gap);
      line-height: 1.15;
      white-space: nowrap;
      overflow: hidden;

      audiodn-track-title {
        min-width: 0;
      }
    }

    /* ── Row: progress / waveform ── */

    audiodn-progress {
      height: var(--_row-progress);
      flex-shrink: 0;
      min-height: 0;
      padding-inline: var(--_gap);
    }

    /* ── Row: controls (play-time, volume, settings) ── */

    .player-row-controls {
      height: var(--_row-controls);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: var(--_gap);
      padding-inline: var(--_gap);
      white-space: nowrap;
      overflow: hidden;

      audiodn-play-time {
        flex-shrink: 0;
      }

      audiodn-volume-control {
        flex: 0 1 var(--adn-volume-max-width, 160px);
        min-width: 40px;
        margin-left: auto;
      }

      audiodn-settings-menu {
        flex-shrink: 0;
      }
    }

    /* ── Small: 2-row grid layout ── */

    :host([size="small"]) {
      .player-body {
        display: grid;
        grid-template-columns: auto auto 1fr auto auto;
        grid-template-rows: var(--_row-info) var(--_row-controls);
      }

      .player-row-info {
        grid-row: 1;
        grid-column: 1 / -1;
        height: auto;
      }

      audiodn-progress {
        grid-row: 2;
        grid-column: 3;
        height: auto;
        align-self: center;
        padding-inline: var(--_gap);
      }

      .player-row-controls {
        display: contents;
      }

      audiodn-play-time {
        grid-row: 2;
        grid-column: 1;
        align-self: center;
        padding-left: var(--_gap);
      }

      audiodn-volume-control {
        grid-row: 2;
        grid-column: 4;
        align-self: center;
        margin-left: 0;
      }

      audiodn-settings-menu {
        grid-row: 2;
        grid-column: 5;
        align-self: center;
        padding-right: var(--_gap);
      }

      /* When the settings cog hides itself, its cell no longer supplies the
         right-edge gap, so hand that padding to the volume control instead. */
      .player-row-controls:has(audiodn-settings-menu[hidden]) audiodn-volume-control {
        padding-right: var(--_gap);
      }
    }

    /* ── Utilities ── */

    /* A single slick spinner sized to the loaded player so there's no layout jump. */
    .player-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: var(--_coverart-size);
      background: var(--_bg);
    }

    .player-loader {
      width: var(--adn-loader-size, 40px);
      height: var(--adn-loader-size, 40px);
      border-radius: 50%;
      border: var(--adn-loader-thickness, 3px) solid color-mix(in srgb, var(--_color-font) 18%, transparent);
      border-top-color: var(--_color-accent);
      animation: adn-loader-spin 0.8s linear infinite;
    }

    /* Reveal the loaded player with a soft fade so the loader swap feels smooth. */
    .player-main {
      animation: adn-fade-in var(--adn-animation-speed, 300ms) ease-in-out;
    }

    @keyframes adn-loader-spin {
      to { transform: rotate(360deg); }
    }

    @keyframes adn-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @media (prefers-reduced-motion: reduce) {
      .player-loader { animation-duration: 1.6s; }
      .player-main { animation: none; }
    }

    audiodn-notification {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 10;
    }

    audiodn-tracklist {
      margin-top: var(--adn-tracklist-gap, 1rem);
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
  `
}
