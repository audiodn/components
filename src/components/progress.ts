import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { formatDuration } from '../lib/util.ts'
import { t, type Locale } from '../lib/i18n.ts'
import type { TrackLevels } from '../lib/track.ts'
import type { TemplateResult, CSSResult } from 'lit'

declare global {
  interface HTMLElementTagNameMap {
    'audiodn-progress': AudioDnProgress;
  }
}

@customElement('audiodn-progress')
export class AudioDnProgress extends LitElement {
  @property({ type: Number, attribute: 'duration' })
  duration: number = 0

  @property({ type: Number, attribute: 'currentTime' })
  currentTime: number = 0

  @property()
  min: number = 0

  @property()
  max: number = 1

  @property({ type: String, attribute: 'size', reflect: true })
  size: string = 'large'

  @property({ type: Object })
  levels?: TrackLevels

  @property({ type: String })
  waveformVariant: string = 'vertical'

  @property({ type: Number })
  waveformHeight: number = 120

  @property({ type: Number })
  waveformLineWidth: number = 2

  @property({ type: String })
  waveformLineColor: string = '#888888'

  @property({ type: Number })
  waveformGap: number = 3

  @property({ type: Number })
  waveformScaleStrength: number = 0.4

  @property({ type: String, attribute: 'locale' })
  locale: Locale = 'en'

  @state()
  progress: number = 0

  static styles = styles()

  willUpdate () {
    this.progress = this.duration > 0 ? this.currentTime / this.duration : 0
  }

  render () {
    if (this.levels && this.size !== 'small') {
      return templateLevels.call(this)
    }

    return templateProgress.call(this)
  }

  updated () {
    const input = this.shadowRoot?.querySelector('input')
    if (!input) return

    input.style.setProperty('--_pre-progress', `${Math.round(this.min * 100)}%`)

    if (this.max < 1) {
      input.style.setProperty('--_width', `${Math.round(this.max * 100)}%`)
    } else {
      input.style.setProperty('--_width', `${Math.round(this.progress * 100)}%`)
    }
  }

  handleEvent (e: CustomEvent) {
    let value

    if (e?.detail) {
      value = e.detail.percent
    } else {
      const target = e?.target as HTMLInputElement
      value = target?.value
    }

    if (value <= this.min) {
      value = this.min
    }

    if (value >= this.max) {
      value = this.max
    }

    this.dispatchEvent(
      new CustomEvent('adni-seek', {
        detail: Number.parseFloat(value),
      })
    )
  }
}

function templateLevels (this: AudioDnProgress): TemplateResult {
  return html`
    <audiodn-waveform
      @adni-seek=${this}
      .locale=${this.locale}
      .levels=${this.levels?.levels}
      .highlightWidth=${this.progress}
      .min=${this.min}
      .max=${this.max}
      .progress=${this.progress}
      .duration=${this.duration}
      .variant=${this.waveformVariant}
      .height=${this.waveformHeight}
      .lineWidth=${this.waveformLineWidth}
      .lineColor=${this.waveformLineColor}
      .gap=${this.waveformGap}
      .scaleStrength=${this.waveformScaleStrength}
    ></audiodn-waveform>
  `
}

function templateProgress (this: AudioDnProgress): TemplateResult {
  return html`
    <input
      type="range"
      min=0
      max=1
      step="0.001"
      @change=${this}
      .value=${this.progress}
      aria-label=${t(this.locale, 'progress.aria.label')}
      aria-valuetext=${t(this.locale, 'progress.aria.valueText', {
        current: formatDuration(this.currentTime),
        total: formatDuration(this.duration),
      })}
    />
  `
}

function styles (): CSSResult {
  return css`
    :host {
      background: var(--adn-progress-bg);
      border: var(--adn-progress-border);
      border-radius: var(--adn-progress-radius);
      padding: var(--adn-progress-padding);
      place-content: center;
      align-items: center;
      display: flex;
      box-shadow: var(--adn-progress-box-shadow);
      overflow: hidden;
    }

    audiodn-waveform {
      max-height: 100%;
      max-width: 100%;
    }

    input {
      -webkit-appearance: none;
      appearance: none;

      height: var(--adn-progress-height, var(--_height-slider));
      width: var(--adn-progress-width, 100%);
      border: var(--adn-progress-border-slider);
      border-radius: var(--adn-progress-radius-slider, var(--_height-slider));
      padding: 10px var(--adn-progress-padding-input, 0);
      background: linear-gradient(to right,
        var(--adn-progress-color-slider, var(--_bg-light)) var(--_pre-progress),
        var(--adn-progress-color-highlight, var(--_color-accent)) var(--_pre-progress),
        var(--adn-progress-color-highlight, var(--_color-accent)) var(--_width),
        var(--adn-progress-color-slider, var(--_bg-light)) var(--_width)
      );
      background-clip: content-box;
      outline: none;
    }

    input:focus-visible {
      outline: 2px solid var(--_color-accent);
      outline-offset: 2px;
    }

    input:hover {
      --__thumb-size: var(--adn-progress-size-thumb-hover, var(--_thumb-size-hover));
    }

    input::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: var(--__thumb-size, var(--adn-progress-size-thumb, var(--_thumb-size)));
      aspect-ratio: 1;
      background: var(--adn-progress-color-thumb, var(--_color-accent));
      border-radius: var(--adn-progress-radius-thumb, 50%);
      cursor: pointer;
      transition: var(--adn-progress-transition-thumb, var(--_transition));
      border: var(--adn-progress-border-thumb);
    }

    input::-moz-range-thumb {
      appearance: none;
      width: var(--__thumb-size, var(--adn-progress-size-thumb, var(--_thumb-size)));
      aspect-ratio: 1;
      background: var(--adn-progress-color-thumb, var(--_color-accent));
      border-radius: var(--adn-progress-radius-thumb, 50%);
      cursor: pointer;
      border: var(--adn-progress-border-thumb);
      transition: var(--adn-progress-transition-thumb, var(--_thumb-transition));
    }

    input::-webkit-slider-runnable-track {
      background: transparent;
    }

    input::-moz-range-track {
      background: transparent;
    }
  `
}
