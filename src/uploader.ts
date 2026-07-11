import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { createUploadSession, getUploadSession, getTrackUploadUrl, type UploadSessionData } from './lib/api.ts'
import { SessionExpiryTimer } from './lib/session.ts'
import { iconCloudUpload, iconAlert } from './lib/constants.ts'
import { globalReset, globalVariables } from './global-css.ts'
import { t, type Locale } from './lib/i18n.ts'
import './components/notification.ts'
import type { CSSResult } from 'lit'
import type { AudioDnNotification } from './components/notification.ts'

interface UploadingFile extends File {
  uploadProgress?: number;
  uploadError?: string;
  uploadUrl?: string;
  trackId?: string;
  xhr?: XMLHttpRequest;
  isComplete?: boolean;
  _removeTimeout?: ReturnType<typeof setTimeout>;
}

declare global {
  interface HTMLElementTagNameMap {
    'audiodn-uploader': AudiodnUploader
  }
}

const PROGRESS_THROTTLE_MS = 100

@customElement('audiodn-uploader')
export class AudiodnUploader extends LitElement {
  @property({ type: String, attribute: 'upload-session-id' })
  uploadSessionId?: string

  @property({ type: String, attribute: 'api-key' })
  apiKey?: string

  @property({ type: String, attribute: 'collection-id' })
  collectionId?: string

  @property({ type: String, attribute: 'accent-color' })
  accentColor: string = '#fe008a'

  @property({ type: String, attribute: 'locale', reflect: true })
  locale: Locale = 'en'

  @property({ type: Boolean, attribute: 'disabled' })
  disabled: boolean = false

  @property({ type: Object, attribute: false })
  sessionData?: UploadSessionData

  @property({ type: String, attribute: false })
  error?: string

  @state()
  files: UploadingFile[] = []

  @state()
  isLoading: boolean = true

  @state()
  isDragover: boolean = false

  private _progressTimers = new Map<UploadingFile, number>()
  private _removeTimeouts: ReturnType<typeof setTimeout>[] = []
  private _sessionTimer = new SessionExpiryTimer()

  static styles = styles({ globalReset, globalVariables })

  render () {
    return template.call(this)
  }

  private updateAccentColor () {
    this.style.setProperty('--_color-accent', this.accentColor)
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(this.accentColor)
    if (match) {
      this.style.setProperty('--_color-accent-rgb', `${parseInt(match[1]!, 16)}, ${parseInt(match[2]!, 16)}, ${parseInt(match[3]!, 16)}`)
    }
  }

  updated (changedProperties: Map<string, unknown>) {
    if (changedProperties.has('accentColor') && changedProperties.get('accentColor') !== undefined) {
      this.updateAccentColor()
    }
  }

  async connectedCallback () {
    super.connectedCallback()
    if (this.hasAttribute('accent-color')) {
      this.updateAccentColor()
    }
    await this.loadSession()
  }

  disconnectedCallback () {
    super.disconnectedCallback()
    this._sessionTimer.clear()
    for (const file of this.files) {
      if (file.xhr) {
        file.xhr.abort()
        file.xhr = undefined
      }
      if (file._removeTimeout) {
        clearTimeout(file._removeTimeout)
      }
    }
    for (const timeout of this._removeTimeouts) {
      clearTimeout(timeout)
    }
    this._removeTimeouts = []
    this._progressTimers.clear()
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
    this.isLoading = true
    this.loadSession()
  }

  async loadSession () {
    try {
      let sessionData = null
      if (this.uploadSessionId) {
        try {
          sessionData = await getUploadSession(this.uploadSessionId, this.locale)
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to initialize upload session: Could not fetch existing session'
          throw new Error(errorMessage)
        }
      } else if (this.apiKey) {
        try {
          sessionData = await createUploadSession(
            this.apiKey,
            this.collectionId,
            this.locale
          )
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to initialize upload session: Could not create new session'
          throw new Error(errorMessage)
        }
      } else {
        this.error = 'Either upload-session-id or api-key must be provided'
        return
      }

      if (!sessionData) {
        this.error = 'Failed to initialize upload session: No session data received'
        return
      }

      this.sessionData = sessionData
      this.scheduleSessionExpiry()

      const hasThemeOverride = getComputedStyle(this).getPropertyValue('--adn-color-accent').trim()
      if (this.sessionData.player_color && !this.hasAttribute('accent-color') && !hasThemeOverride) {
        this.accentColor = this.sessionData.player_color
        this.updateAccentColor()
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to initialize upload session: Unknown error occurred'
      // `this.error` may be a server message; show it verbatim (per spec) but
      // keep the actionable label localized.
      this.notify('error', this.error, {
        action: { label: t(this.locale, 'action.retry'), onClick: () => this.retryLoadSession() },
      })
      this.dispatchEvent(new CustomEvent('session-error', {
        detail: { error: this.error },
        bubbles: true,
        composed: true
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
        if (this.apiKey) this.refreshUploadSession()
      },
      onExpiry: () => {
        if (this.apiKey) {
          this.refreshUploadSession()
        } else {
          this.disabled = true
          this.dispatchEvent(new CustomEvent('adn-session-expired', {
            detail: { uploadSessionId: this.sessionData?.upload_session_id },
            bubbles: true,
            composed: true,
          }))
        }
      },
    })
  }

  private async refreshUploadSession () {
    if (!this.apiKey) return

    try {
      this.sessionData = await createUploadSession(this.apiKey, this.collectionId, this.locale)
      this.uploadSessionId = this.sessionData.upload_session_id
      this.scheduleSessionExpiry()

      this.dispatchEvent(new CustomEvent('adn-session-refreshed', {
        detail: { uploadSessionId: this.sessionData.upload_session_id },
        bubbles: true,
        composed: true,
      }))
    } catch (err) {
      console.error('Upload session refresh failed:', err)
      this.disabled = true
      this.notify('error', t(this.locale, 'uploader.notify.sessionExpired'), {
        action: { label: t(this.locale, 'action.reload'), onClick: () => this.retryLoadSession() },
      })
      this.dispatchEvent(new CustomEvent('adn-session-expired', {
        detail: { uploadSessionId: this.sessionData?.upload_session_id },
        bubbles: true,
        composed: true,
      }))
    }
  }

  handleDragOver (e: DragEvent) {
    if (this.disabled || this.isLoading) return
    e.preventDefault()
    e.stopPropagation()
    this.isDragover = true
  }

  handleDragLeave (e: DragEvent) {
    if (this.disabled || this.isLoading) return
    e.preventDefault()
    e.stopPropagation()
    this.isDragover = false
  }

  handleDrop (e: DragEvent) {
    if (this.disabled || this.isLoading) return
    e.preventDefault()
    e.stopPropagation()
    this.isDragover = false

    const files = e.dataTransfer?.files
    if (files) {
      this.handleFiles(files)
    }
  }

  handleFileSelect (e: Event) {
    if (this.disabled || this.isLoading) return
    const input = e.target as HTMLInputElement
    if (input.files) {
      this.handleFiles(input.files)
    }
    input.value = ''
  }

  formatFileSize (bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  private async uploadFile (file: UploadingFile) {
    if (!this.sessionData?.upload_session_id) {
      file.uploadError = 'No active upload session'
      this.requestUpdate()
      return
    }

    try {
      const uploadData = await getTrackUploadUrl(
        this.sessionData.upload_session_id,
        file.name,
        file.size,
        this.locale
      )

      if (!uploadData?.track_upload.upload_url) {
        file.uploadError = 'Failed to get upload URL'
        this.requestUpdate()
        return
      }

      file.uploadUrl = uploadData.track_upload.upload_url
      file.trackId = uploadData.track_id

      const xhr = new XMLHttpRequest()
      file.xhr = xhr
      xhr.open('PUT', file.uploadUrl!)

      let lastProgressUpdate = 0
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const now = Date.now()
          if (now - lastProgressUpdate >= PROGRESS_THROTTLE_MS || event.loaded === event.total) {
            lastProgressUpdate = now
            file.uploadProgress = (event.loaded / event.total) * 100
            this.requestUpdate()
          }
        }
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          file.uploadProgress = 100
          file.isComplete = true
          this.notify('success', t(this.locale, 'uploader.notify.uploadSuccess', { filename: file.name }))
          this.dispatchEvent(new CustomEvent('file-uploaded', {
            detail: { file, trackId: file.trackId },
            bubbles: true,
            composed: true
          }))

          const timeout = setTimeout(() => {
            this.files = this.files.filter(f => f !== file)
            this.requestUpdate()
          }, 8000)
          file._removeTimeout = timeout
          this._removeTimeouts.push(timeout)
        } else {
          file.uploadError = `Upload failed with status ${xhr.status}`
          this.notify('error', t(this.locale, 'uploader.notify.uploadFailed', { filename: file.name }), {
            action: { label: t(this.locale, 'action.retry'), onClick: () => this.retryUpload(file) },
          })
        }
        file.xhr = undefined
        this.requestUpdate()
      }

      xhr.onerror = () => {
        file.uploadError = 'Upload failed: network error'
        file.xhr = undefined
        this.notify('error', t(this.locale, 'uploader.notify.networkError', { filename: file.name }), {
          action: { label: t(this.locale, 'action.retry'), onClick: () => this.retryUpload(file) },
        })
        this.requestUpdate()
      }

      xhr.send(file)
    } catch (err) {
      file.uploadError = err instanceof Error ? err.message : 'Upload failed'
      file.xhr = undefined
      // `file.uploadError` can be a server message; pass it through untranslated.
      this.notify('error', t(this.locale, 'uploader.notify.uploadFailedDetail', { filename: file.name, error: file.uploadError }), {
        action: { label: t(this.locale, 'action.retry'), onClick: () => this.retryUpload(file) },
      })
      this.requestUpdate()
    }
  }

  cancelUpload (file: UploadingFile) {
    if (file.xhr) {
      file.xhr.abort()
      file.uploadError = 'Upload cancelled'
      file.xhr = undefined
      this.requestUpdate()
    }
  }

  removeFile (file: UploadingFile) {
    if (file.xhr) {
      file.xhr.abort()
      file.xhr = undefined
    }
    if (file._removeTimeout) {
      clearTimeout(file._removeTimeout)
    }
    this.files = this.files.filter(f => f !== file)
  }

  retryUpload (file: UploadingFile) {
    file.uploadError = undefined
    file.uploadProgress = 0
    file.isComplete = false
    this.requestUpdate()
    this.uploadFile(file)
  }

  private handleFiles (files: FileList) {
    const audioFiles = Array.from(files).filter(file => {
      return file.type.startsWith('audio/')
    })

    if (audioFiles.length === 0) {
      this.notify('warning', t(this.locale, 'uploader.notify.noAudioFiles'))
      return
    }

    const newFiles = audioFiles.map(file => {
      const uploadingFile = file as UploadingFile
      uploadingFile.uploadProgress = 0
      return uploadingFile
    })

    this.files = [...this.files, ...newFiles]

    newFiles.forEach(file => this.uploadFile(file))

    this.dispatchEvent(new CustomEvent('files-selected', {
      detail: { files: audioFiles },
      bubbles: true,
      composed: true
    }))
  }

  protected get totalProgress (): number {
    if (this.files.length === 0) return 0
    const activeFiles = this.files.filter(f => !f.uploadError || f.isComplete)
    if (activeFiles.length === 0) return 0
    const total = activeFiles.reduce((sum, f) => sum + (f.uploadProgress || 0), 0)
    return Math.round(total / activeFiles.length)
  }

  protected handleUploadZoneKeydown (e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      this.shadowRoot?.querySelector('input')?.click()
    }
  }
}

function template (this: AudiodnUploader) {
  const totalFiles = this.files.filter(f => !f.uploadError).length
  const showTotalProgress = totalFiles > 1

  return html`
    <audiodn-notification .locale=${this.locale}></audiodn-notification>

    ${this.error
      ? html`
          <div class="uploader-error-state" role="alert">
            <div class="uploader-error-icon">${iconAlert}</div>
            <div class="uploader-error-text">${this.error}</div>
            <button class="uploader-browse-button" @click=${() => this.retryLoadSession()}>
              ${t(this.locale, 'uploader.error.tryAgain')}
            </button>
          </div>
        `
      : this.isLoading
        ? html`
            <div class="uploader-skeleton" role="status" aria-label=${t(this.locale, 'uploader.aria.loading')}>
              <div class="skel uploader-skel-icon"></div>
              <div class="skel uploader-skel-title"></div>
              <div class="skel uploader-skel-divider"></div>
              <div class="skel uploader-skel-button"></div>
              <span class="sr-only">${t(this.locale, 'uploader.loadingText')}</span>
            </div>
          `
        : html`
            <div class="uploader-upload-container ${this.disabled ? 'disabled' : ''} ${this.isDragover ? 'dragover' : ''}"
                 role="region"
                 aria-label=${t(this.locale, 'uploader.aria.fileArea')}
                 @dragover=${this.handleDragOver}
                 @dragleave=${this.handleDragLeave}
                 @drop=${this.handleDrop}>
              <div class="uploader-upload-icon">
                ${iconCloudUpload}
              </div>
              <div class="uploader-upload-title">${t(this.locale, 'uploader.dropHeading')}</div>
              <div class="uploader-divider">
                <span>${t(this.locale, 'uploader.or')}</span>
              </div>
              <button class="uploader-browse-button"
                      ?disabled=${this.disabled}
                      @click=${() => this.shadowRoot?.querySelector('input')?.click()}
                      @keydown=${(e: KeyboardEvent) => this.handleUploadZoneKeydown(e)}>
                ${t(this.locale, 'uploader.browseFiles')}
              </button>
              <input type="file"
                     multiple
                     accept="audio/*"
                     ?disabled=${this.disabled}
                     @change=${this.handleFileSelect}
                     aria-label=${t(this.locale, 'uploader.aria.selectFiles')}>
            </div>
          `
    }

    ${showTotalProgress
? html`
      <div class="uploader-total-progress" role="progressbar" aria-valuenow="${this.totalProgress}" aria-valuemin="0" aria-valuemax="100" aria-label=${t(this.locale, 'uploader.aria.totalProgress')}>
        <div class="uploader-total-progress-bar" style="width: ${this.totalProgress}%"></div>
        <span class="uploader-total-progress-text">${t(this.locale, 'uploader.totalProgressText', { percent: this.totalProgress })}</span>
      </div>
    `
: ''}

    ${this.files.length > 0
      ? html`
          <div class="uploader-file-list" role="list" aria-label=${t(this.locale, 'uploader.aria.queue')}>
            ${this.files.map(file => html`
              <div class="uploader-file-item ${file.isComplete ? 'uploader-file-item-complete' : ''}" role="listitem">
                <div class="uploader-file-icon">🎵</div>
                <div class="uploader-file-info">
                  <div class="uploader-file-name">${file.name}</div>
                  <div class="uploader-file-size">${this.formatFileSize(file.size)}</div>
                  ${file.uploadError
                    ? html`
                        <div class="uploader-file-error" role="alert">${file.uploadError}</div>
                      `
                    : ''}
                </div>
                ${!file.uploadError && !file.isComplete
                  ? html`
                      <div class="uploader-progress-donut" role="progressbar" aria-valuenow="${Math.round(file.uploadProgress || 0)}" aria-valuemin="0" aria-valuemax="100" aria-label=${t(this.locale, 'uploader.aria.fileProgress', { filename: file.name })}>
                        <svg viewBox="0 0 36 36" class="uploader-progress-circle">
                          <path
                            d="M18 2.0845
                              a 15.9155 15.9155 0 0 1 0 31.831
                              a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="var(--_border-color)"
                            stroke-width="3"
                          />
                          <path
                            d="M18 2.0845
                              a 15.9155 15.9155 0 0 1 0 31.831
                              a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="var(--_color-accent)"
                            stroke-width="3"
                            stroke-dasharray="${file.uploadProgress || 0}, 100"
                          />
                        </svg>
                        <span class="uploader-progress-text">${Math.round(file.uploadProgress || 0)}%</span>
                      </div>
                    `
                  : ''}
                ${file.uploadError && !file.isComplete
                  ? html`
                      <button class="uploader-retry-button" @click=${() => this.retryUpload(file)} aria-label=${t(this.locale, 'uploader.aria.retryFile', { filename: file.name })}>
                        <svg viewBox="0 0 24 24" width="16" height="16">
                          <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/>
                        </svg>
                      </button>
                    `
                  : ''}
                <button class="uploader-cancel-button" @click=${() => file.xhr ? this.cancelUpload(file) : this.removeFile(file)} aria-label=${file.xhr ? t(this.locale, 'uploader.aria.cancelUpload', { filename: file.name }) : t(this.locale, 'uploader.aria.removeFile', { filename: file.name })}>
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
                  </svg>
                </button>
              </div>
            `)}
          </div>
        `
      : ''}
  `
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

    :host {
      ${globalVariables}

      --_bg: var(--adn-bg, #000);
      --_bg-light: var(--adn-bg-light, #333);
      --_color-font: var(--adn-color-font, #fff);
      --_color-font-muted: var(--adn-color-font-muted, #bbb);
      --_color-accent: var(--adn-color-accent, #fe008a);
      --_color-accent-rgb: var(--adn-color-accent-rgb, 254, 0, 138);
      --_color-error: var(--adn-color-error, #dc2626);
      --_color-error-light: var(--adn-color-error-light, #fca5a5);
      --_color-highlight: var(--adn-color-highlight, rgba(255, 255, 255, 0.1));
      --_border-color: var(--adn-border-color, #555);
      --_radius: var(--adn-radius, 8px);
      --_transition: all var(--adn-animation-speed, 300ms) ease;
      --_transition-fast: all var(--adn-animation-speed-short, 150ms) ease;
      --_text-small: var(--adn-text-small, var(--step--1));
      --_text-regular: var(--adn-text-regular, var(--step-0));
      --_text-large: var(--adn-text-large, var(--step-1));

      -webkit-font-smoothing: antialiased;
      font-family: sans-serif;
      font-synthesis: none;
      -moz-osx-font-smoothing: grayscale;
      -webkit-text-size-adjust: none;
      -moz-text-size-adjust: none;
      text-size-adjust: none;
      display: block;
      background: var(--_bg);
      color: var(--_color-font);
      padding: var(--adn-padding, var(--space-s));
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

    .uploader-error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-s);
      padding: var(--space-l) var(--space-s);
      text-align: center;
      border: 2px dashed color-mix(in srgb, var(--_color-error) 45%, var(--_border-color));
      border-radius: var(--_radius);
    }

    .uploader-error-icon {
      color: var(--_color-error);
      display: inline-flex;
    }

    .uploader-error-icon svg {
      width: 36px;
      height: 36px;
    }

    .uploader-error-text {
      color: var(--_color-error-light);
      font-size: var(--_text-small);
      max-width: 40ch;
      word-break: break-word;
    }

    .uploader-upload-container {
      padding: var(--space-l);
      text-align: center;
      background: var(--_bg);
      transition: var(--_transition);
      cursor: pointer;
      border: 2px dashed var(--_border-color);
      border-radius: var(--_radius);
    }

    .uploader-upload-container.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    .uploader-upload-container:hover {
      background: var(--_bg-light);
      border-color: var(--_color-accent);
    }

    .uploader-upload-container.dragover {
      background: rgba(var(--_color-accent-rgb), 0.08);
      border-color: var(--_color-accent);
      border-style: solid;
    }

    .uploader-upload-icon {
      font-size: var(--step-3);
      color: var(--_color-accent);
      margin-bottom: var(--space-s);
      margin-inline: auto;
      width: 48px;
    }

    .uploader-upload-title {
      color: var(--_color-font);
      margin-bottom: var(--space-m);
      font-size: var(--_text-large);
      font-weight: 500;
    }

    .uploader-divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: var(--space-m) 0;
      color: var(--_color-font-muted);
    }

    .uploader-divider::before,
    .uploader-divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid var(--_border-color);
    }

    .uploader-divider span {
      padding: 0 var(--space-s);
      font-size: var(--_text-small);
    }

    .uploader-browse-button {
      background: var(--_color-accent);
      color: var(--adn-color-accent-alt, #fff);
      border: none;
      padding: var(--space-xs) var(--space-s);
      border-radius: 4px;
      font-size: var(--_text-small);
      font-weight: 500;
      cursor: pointer;
      min-height: 44px;
      min-width: 44px;
      transition: var(--_transition-fast);
    }

    .uploader-browse-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .uploader-browse-button:hover {
      opacity: 0.85;
    }

    .uploader-browse-button:focus-visible {
      outline: 2px solid var(--_color-font);
      outline-offset: 2px;
    }

    .uploader-total-progress {
      position: relative;
      height: 24px;
      background: var(--_bg-light);
      border-radius: 4px;
      margin-top: var(--space-xs);
      overflow: hidden;
    }

    .uploader-total-progress-bar {
      height: 100%;
      background: var(--_color-accent);
      transition: width 200ms ease;
      opacity: 0.3;
    }

    .uploader-total-progress-text {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--step--2);
      color: var(--_color-font);
    }

    .uploader-file-list {
      background: var(--_bg);
      border-top: 1px solid var(--_border-color);
      padding-top: var(--space-2xs);
      overflow: hidden;
    }

    .uploader-file-item {
      display: flex;
      align-items: center;
      padding: var(--space-xs) var(--space-s);
      border-bottom: 1px solid var(--_border-color);
      color: var(--_color-font);
      gap: var(--space-xs);
      transition: opacity 300ms ease, max-height 300ms ease;
      max-height: 100px;
    }

    .uploader-file-item-complete {
      opacity: 0.5;
    }

    .uploader-file-item:last-child {
      border-bottom: none;
    }

    .uploader-file-icon {
      color: var(--_color-accent);
      margin-right: var(--space-xs);
      flex-shrink: 0;
    }

    .uploader-file-info {
      flex: 1;
      min-width: 0;
    }

    .uploader-file-name {
      font-size: var(--_text-small);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .uploader-file-size {
      color: var(--_color-font-muted);
      font-size: var(--step--2);
    }

    .uploader-progress-donut {
      position: relative;
      width: 36px;
      height: 36px;
      flex-shrink: 0;
    }

    .uploader-progress-circle {
      transform: rotate(-90deg);
      width: 100%;
      height: 100%;
    }

    .uploader-progress-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: var(--step--3);
      color: var(--_color-font-muted);
    }

    .uploader-file-error {
      color: var(--_color-error-light);
      font-size: var(--step--2);
      margin-top: var(--space-2xs);
    }

    .uploader-cancel-button,
    .uploader-retry-button {
      background: none;
      border: none;
      color: var(--_color-font-muted);
      padding: 8px;
      cursor: pointer;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      transition: var(--_transition-fast);
      flex-shrink: 0;
    }

    .uploader-cancel-button:hover {
      background: var(--_color-highlight);
      color: var(--_color-error);
    }

    .uploader-retry-button:hover {
      background: var(--_color-highlight);
      color: var(--_color-accent);
    }

    .uploader-cancel-button:focus-visible,
    .uploader-retry-button:focus-visible {
      outline: 2px solid var(--_color-accent);
      outline-offset: 2px;
    }

    input[type="file"] {
      display: none;
    }

    /* Skeleton mirrors the drop zone so the layout doesn't jump on load. */
    .uploader-skeleton {
      --_skel-base: var(--adn-skeleton-bg, var(--_bg-light));
      --_skel-highlight: var(--adn-skeleton-highlight, rgba(255, 255, 255, 0.09));
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-m);
      padding: var(--space-l);
      border: 2px dashed var(--_border-color);
      border-radius: var(--_radius);
    }

    .skel {
      border-radius: 4px;
      background-color: var(--_skel-base);
      background-image: linear-gradient(90deg, transparent 25%, var(--_skel-highlight) 50%, transparent 75%);
      background-size: 300% 100%;
      background-repeat: no-repeat;
      animation: skel-shimmer 1.4s ease-in-out infinite;
    }

    .uploader-skel-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
    }

    .uploader-skel-title {
      width: min(60%, 260px);
      height: 1.1em;
    }

    .uploader-skel-divider {
      width: 40%;
      height: 0.7em;
    }

    .uploader-skel-button {
      width: 120px;
      height: 44px;
      border-radius: 4px;
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

    @keyframes skel-shimmer {
      from { background-position: 150% 0; }
      to { background-position: -150% 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      .skel { animation: none; }
    }
  `
}
