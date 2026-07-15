import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { srraf } from './lib/srraf.ts'
import { formatDuration } from './lib/util.ts'
import { t, type Locale } from './lib/i18n.ts'
import type { TemplateResult, CSSResult } from 'lit'

declare global {
  interface HTMLElementTagNameMap {
    'audiodn-waveform': AudioDnWaveform;
  }
}

@customElement('audiodn-waveform')
export class AudioDnWaveform extends LitElement {
  @property({ type: Array })
  levels: number[] = []

  @property({ type: Number })
  height = 120

  @property({ type: String, attribute: 'line-color' })
  lineColor = '#888888'

  @property({ type: Number, attribute: 'line-width' })
  lineWidth = 2

  @property({ type: Number })
  gap = 3

  @property({ type: String })
  variant = 'vertical'

  @property({ type: String, attribute: 'locale' })
  locale: Locale = 'en'

  @property({ type: Number, attribute: 'scale-strength' })
  scaleStrength = 0.4

  // Max lean of the reflection in degrees (reached at 0% / 100% progress).
  @property({ type: Number, attribute: 'reflection-angle' })
  reflectionAngle = 45

  // Reflection height as a fraction of the main waveform height.
  @property({ type: Number, attribute: 'reflection-size' })
  reflectionSize = 0.25

  // Opacity of the reflection at the baseline (fades to 0 downward).
  @property({ type: Number, attribute: 'reflection-opacity' })
  reflectionOpacity = 0.55

  @property({ type: Number, attribute: 'highlight-from' })
  highlightFrom = 0

  @property({ type: Number, attribute: 'highlight-width' })
  highlightWidth = 1

  @property()
  min: number = 0

  @property()
  max: number = 1

  @property({ type: Number })
  duration: number = 0

  @property({ type: Number })
  progress: number = 0

  @state()
  private data: Float32Array = new Float32Array()

  @state()
  protected hoverPosition: number | null = null

  private containerWidth = 0
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private _srrafHandle: ReturnType<typeof srraf> | null = null
  private _drawScheduled = false
  private _hoverRafId: number | null = null
  private _cachedRect: DOMRect | null = null

  static styles = styles()

  connectedCallback () {
    super.connectedCallback()

    this.updateLineColor()

    this._srrafHandle = srraf(({ vw, pvw }: { vw: number, pvw: number }) => {
      if (vw !== pvw) {
        this._cachedRect = null
        this.computeWaveformWidth()
        this.scheduleDraw()
      }
    })
  }

  disconnectedCallback () {
    super.disconnectedCallback()
    this._srrafHandle?.destroy()
    this._srrafHandle = null
    if (this._hoverRafId !== null) {
      cancelAnimationFrame(this._hoverRafId)
      this._hoverRafId = null
    }
  }

  willUpdate (changedProperties: Map<string, string | number | Float32Array>) {
    this.style.setProperty('--_playheadPosition', this.progress * 100 + '%')
    this.style.setProperty('--_playheadVisible', this.progress > 0 ? '1' : '0')
    this.style.setProperty('--_hoverPosition', this.hoverPosition !== null ? this.hoverPosition * 100 + '%' : '0%')
    this.style.setProperty('--_hoverVisible', this.hoverPosition !== null ? '1' : '0')
    this.style.setProperty('--_highlightFrom', `${this.highlightFrom}px`)
    this.style.setProperty('--_maskWidth', `${Math.floor(this.containerWidth * this.highlightWidth)}px`)

    this.updateLineColor()

    if (this.levels && changedProperties.has('levels')) {
      this.processData()
    }
  }

  render () {
    return template.call(this)
  }

  firstUpdated () {
    this.canvas = this.renderRoot.querySelector('canvas')
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d')
    }
  }

  updated (): void {
    this.style.setProperty('--_pre-progress', `${this.min * 100}%`)

    if (this.max < 1) {
      this.style.setProperty('--_width', `${this.max * 100}%`)
    } else {
      this.style.setProperty('--_width', `${this.progress * 100}%`)
    }

    this.computeWaveformWidth()
    this.scheduleDraw()
  }

  private getRect (): DOMRect {
    if (!this._cachedRect) {
      this._cachedRect = this.getBoundingClientRect()
    }
    return this._cachedRect
  }

  handleEvent (e: MouseEvent) {
    const target = e.currentTarget as HTMLElement

    if (e.type === 'mouseenter') {
      target.style.setProperty('--_transitionSpeed', '0')
      return
    }

    if (e.type === 'mouseleave') {
      target.style.setProperty('--_transitionSpeed', '100ms')
      this.hoverPosition = null
      return
    }

    const container = this.getRect()
    const offsetX = e.clientX - container.left

    if (offsetX < 0 || offsetX > this.containerWidth) {
      this.hoverPosition = null
      return
    }

    const percent = Math.max(0, Math.min(1, offsetX / this.containerWidth))

    if (e.type === 'mousemove') {
      if (this._hoverRafId !== null) return
      this._hoverRafId = requestAnimationFrame(() => {
        this._hoverRafId = null
        this.hoverPosition = percent
      })
    }

    if (e.type === 'click') {
      this.dispatchEvent(
        new CustomEvent('adni-seek', {
          detail: { percent },
          bubbles: true,
        })
      )
    }
  }

  protected handleTouch (e: TouchEvent) {
    if (!e.touches.length && e.type !== 'touchend') return

    if (e.type === 'touchstart' || e.type === 'touchmove') {
      e.preventDefault()
      const touch = e.touches[0]
      if (!touch) return
      const container = this.getRect()
      const offsetX = touch.clientX - container.left
      const percent = Math.max(0, Math.min(1, offsetX / this.containerWidth))
      this.hoverPosition = percent
    }

    if (e.type === 'touchend') {
      if (this.hoverPosition !== null) {
        this.dispatchEvent(
          new CustomEvent('adni-seek', {
            detail: { percent: this.hoverPosition },
            bubbles: true,
          })
        )
      }
      this.hoverPosition = null
    }
  }

  private computeWaveformWidth () {
    this._cachedRect = null
    this.containerWidth = this.getRect().width
  }

  private processData () {
    const { levels, scaleStrength } = this

    if (!levels || levels.length === 0) {
      this.data = new Float32Array()
      return
    }

    const min = Math.min(...levels)
    const max = Math.max(...levels)
    const range = max - min
    let scaled = range === 0 ? levels.map(() => 0.5) : levels.map((v) => (v - min) / range)
    let avg = scaled.reduce((a, b) => a + b, 0) / levels.length
    let count = 0
    while (avg > 1 - scaleStrength && count < 10) {
      scaled = scaled.map((v) => v * v)
      avg = scaled.reduce((a, b) => a + b, 0) / levels.length
      count += 1
    }
    this.data = new Float32Array(scaled)
  }

  // Normalize any CSS color to rgba() with the given alpha (via the canvas'
  // own color parsing) so the reflection gradient can fade to transparent.
  private colorToRgba (color: string, alpha: number): string {
    const ctx = this.ctx
    if (!ctx) return `rgba(136, 136, 136, ${alpha})`

    ctx.fillStyle = '#000'
    ctx.fillStyle = color
    const normalized = ctx.fillStyle

    if (normalized.startsWith('#')) {
      let hex = normalized.slice(1)
      if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('')
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }

    const match = normalized.match(/rgba?\(([^)]+)\)/)
    if (match && match[1]) {
      const [r, g, b] = match[1].split(',').map(s => s.trim())
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }

    return `rgba(136, 136, 136, ${alpha})`
  }

  private updateLineColor () {
    const style = getComputedStyle(this)
    const customColor = style.getPropertyValue('--adn-waveform-color-fg')
    const customAccent = style.getPropertyValue('--adn-color-accent')
    this.lineColor = customColor || customAccent || style.getPropertyValue('--_color-accent')
  }

  private scheduleDraw () {
    if (this._drawScheduled) return
    this._drawScheduled = true
    requestAnimationFrame(() => {
      this._drawScheduled = false
      this.draw()
    })
  }

  private draw = () => {
    if (!this.canvas || !this.ctx) return
    const { lineWidth, gap, height, variant } = this
    const ctx = this.ctx

    const dpr = Math.max(1, window.devicePixelRatio || 1)

    // Size the backing store to the canvas' real displayed width in *device*
    // pixels. Use the canvas' own client width (not the host rect, which
    // includes padding) times DPR so the browser never rescales the bitmap —
    // that rescaling is what smears thin 1px bars into uneven, anti-aliased
    // gray instead of a flat, solid color.
    const cssWidth = this.canvas.clientWidth || this.getRect().width
    const deviceWidth = Math.max(1, Math.round(cssWidth * dpr))
    const deviceHeight = Math.max(1, Math.round(height * dpr))

    this.canvas.width = deviceWidth
    this.canvas.height = deviceHeight

    const lineSpace = lineWidth + gap
    const numLines =
      Math.floor(
        (cssWidth - lineWidth - (variant === 'wavy' ? lineSpace : 0)) / lineSpace
      ) + 1

    const lineData = []
    for (let i = 0; i < numLines; i++) {
      const index = Math.round((i / numLines) * this.data.length)
      lineData.push(this.data[index])
    }

    // Resizing the canvas above already reset the context to an identity
    // transform, so vertical/reflection bars are drawn directly in device px.
    ctx.clearRect(0, 0, deviceWidth, deviceHeight)
    ctx.fillStyle = this.lineColor
    ctx.strokeStyle = this.lineColor

    // Bar width and stride snapped to whole device pixels so every bar is a
    // solid, evenly-shaded block at any DPR.
    const barWidth = Math.max(1, Math.round(lineWidth * dpr))
    const step = lineSpace * dpr

    if (variant === 'vertical') {
      lineData.forEach((value, index) => {
        if (!value) return

        const x = Math.round(index * step)
        const barHeight = Math.round(value * deviceHeight)
        const y = Math.round((deviceHeight - barHeight) / 2)

        ctx.fillRect(x, y, barWidth, barHeight)
      })
    } else if (variant === 'reflection') {
      // Flat-bottom bars on top, a shorter faded reflection beneath whose
      // lean sweeps right→left as progress goes 0→1.
      const ratio = Math.max(0, this.reflectionSize)
      const mainHeight = Math.round(deviceHeight / (1 + ratio))
      const reflectionHeight = deviceHeight - mainHeight
      const baselineY = mainHeight

      const clampedProgress = Math.max(0, Math.min(1, this.progress))
      const angleRad = (0.5 - clampedProgress) * 2 * (this.reflectionAngle * Math.PI / 180)
      const skew = Math.tan(angleRad)

      // Main bars: crisp filled blocks anchored to the baseline, growing up.
      ctx.fillStyle = this.lineColor
      lineData.forEach((value, index) => {
        if (!value) return
        const x = Math.round(index * step)
        const barHeight = Math.round(value * mainHeight)
        ctx.fillRect(x, baselineY - barHeight, barWidth, barHeight)
      })

      // Reflection: faded, quickly-decaying, leaning by the progress angle.
      // Diagonal by nature, so it's drawn as a stroke.
      const grad = ctx.createLinearGradient(0, baselineY, 0, baselineY + reflectionHeight)
      grad.addColorStop(0, this.colorToRgba(this.lineColor, this.reflectionOpacity))
      grad.addColorStop(0.75, this.colorToRgba(this.lineColor, this.reflectionOpacity * 0.5))
      grad.addColorStop(1, this.colorToRgba(this.lineColor, 0))
      ctx.strokeStyle = grad
      ctx.lineWidth = barWidth

      lineData.forEach((value, index) => {
        if (!value) return
        const x = Math.round(index * step) + barWidth / 2
        const barHeight = value * reflectionHeight
        ctx.beginPath()
        ctx.moveTo(x, baselineY)
        ctx.lineTo(x + skew * barHeight, baselineY + barHeight)
        ctx.stroke()
      })
    } else if (variant === 'wavy') {
      // Curves anti-alias by nature; draw in CSS-pixel space scaled by DPR so
      // the strokes stay sharp without rescaling artifacts. The canvas resize
      // above left an identity transform, so scaling by DPR here is enough.
      ctx.scale(dpr, dpr)
      ctx.lineWidth = this.lineWidth
      ctx.save()

      const centerY = height / 2
      ctx.translate(0, centerY)

      const segmentWidth = cssWidth / lineData.length
      for (const [i, entry] of lineData.entries()) {
        if (!entry) continue

        const x = i * lineSpace + Math.ceil(lineWidth / 2) + 0.5
        let lineHeight = entry * (centerY - this.lineWidth * 2)
        if (lineHeight < 0) {
          lineHeight = 0
        } else if (lineHeight > centerY - this.lineWidth * 2) {
          lineHeight = centerY - this.lineWidth * 2
        }
        const y = (i + 1) % 2 ? lineHeight : -lineHeight

        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, y)
        ctx.arc(
          x + segmentWidth / 2,
          y,
          Math.min(segmentWidth / 2, Math.min(segmentWidth / 2, lineHeight)),
          Math.PI,
          0,
          Boolean((i + 1) % 2)
        )
        ctx.lineTo(x + segmentWidth, 0)
        ctx.stroke()
      }

      ctx.restore()
    }
  }
}

function template (this: AudioDnWaveform): TemplateResult {
  const hoverTime = this.hoverPosition !== null && this.duration > 0
    ? formatDuration(this.hoverPosition * this.duration)
    : null

  return html`
    <div class="waveform-container"
      @mouseenter=${this} @mouseleave=${this} @mousemove=${this}
      @touchstart=${(e: TouchEvent) => this.handleTouch(e)}
      @touchmove=${(e: TouchEvent) => this.handleTouch(e)}
      @touchend=${(e: TouchEvent) => this.handleTouch(e)}
    >
      <canvas @click=${this} role="img" aria-label=${t(this.locale, 'waveform.aria')}></canvas>
      <div class="playhead progress-playhead"></div>
      <div class="playhead hover-playhead"></div>
      ${hoverTime !== null
? html`
        <div class="hover-tooltip" style="left: ${this.hoverPosition! * 100}%">${hoverTime}</div>
      `
: ''}
    </div>
  `
}

function styles (): CSSResult {
  return css`
    :host {
      width: 100%;
      position: relative;
      display: flex;
      justify-content: center;
      height: 100%;
      box-sizing: border-box;
      background: var(--adn-waveform-bg);
      border: var(--adn-waveform-border);
      border-radius: var(--adn-waveform-radius);
      padding: var(--adn-waveform-padding);
    }

    .waveform-container {
      width: 100%;
      position: relative;
      --_transitionSpeed: 100ms;
      touch-action: none;
    }

    .click-overlay {
      position: absolute;
      inset: 0;
      height: 100%;
      cursor: pointer;
      z-index: 1000;
    }

    canvas {
      width: 100%;
      height: 100%;
      mask: linear-gradient(to right,
        rgba(255 255 255 / 0.5) var(--_pre-progress),
        rgba(255 255 255 / 1) var(--_pre-progress),
        rgba(255 255 255 / 1) var(--_width),
        rgba(255 255 255 / 0.5) var(--_width)
      );
    }

    .playhead {
      width: var(--adn-waveform-playhead-width, 1px);
      background: var(--adn-waveform-color-playhead, var(--_color-font));
      height: 100%;
      position: absolute;
      inset-block: 0;
      pointer-events: none;
    }

    .progress-playhead {
      left: var(--_playheadPosition);
      opacity: var(--_playheadVisible, 0);
    }

    .hover-playhead {
      left: var(--_hoverPosition);
      opacity: calc(0.5 * var(--_hoverVisible, 0));
    }

    .hover-tooltip {
      position: absolute;
      top: -24px;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 3px;
      pointer-events: none;
      white-space: nowrap;
      font-family: sans-serif;
    }
  `
}
