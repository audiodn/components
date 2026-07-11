import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { iconVolumeEmpty, iconVolumePartial, iconVolumeFull } from '../lib/constants.ts'
import { t, type Locale } from '../lib/i18n.ts'
import type { TemplateResult, CSSResult } from 'lit'

declare global {
  interface HTMLElementTagNameMap {
    'audiodn-volume-control': AudioDnVolumeControl;
  }
}

@customElement('audiodn-volume-control')
export class AudioDnVolumeControl extends LitElement {
  @property({ type: Number, attribute: 'volume', reflect: true })
  volume = 0.7

  @property({ type: String, attribute: 'locale' })
  locale: Locale = 'en'

  private _rafId: number | null = null

  static styles = styles()

  render () {
    return template.call(this)
  }

  disconnectedCallback () {
    super.disconnectedCallback()
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
  }

  updated () {
    this.shadowRoot
      ?.querySelector('input')
      ?.style.setProperty('--_width', `${Math.round(this.volume * 100)}%`)
  }

  handleEvent (e: Event) {
    if (this._rafId !== null) return
    const input = e.target as HTMLInputElement
    if (!input) return
    const value = input.value
    this._rafId = requestAnimationFrame(() => {
      this._rafId = null
      this.dispatchEvent(new CustomEvent('adni-volumechange', { detail: Number.parseFloat(value) }))
    })
  }
}

function template (this: AudioDnVolumeControl): TemplateResult {
  const icon = (() => {
    if (this.volume === 0) return iconVolumeEmpty
    if (this.volume === 1) return iconVolumeFull
    if (this.volume > 0 && this.volume < 1) return iconVolumePartial
  })()

  const pct = Math.round(this.volume * 100)

  return html`
    ${icon}

    <input
      type="range"
      @input=${this.handleEvent}
      .value=${this.volume}
      min="0"
      max="1"
      step="0.01"
      aria-label=${t(this.locale, 'volume.aria')}
      aria-valuetext="${pct}%"
      title="${pct}%"
    />
  `
}

function styles (): CSSResult {
  return css`
    :host {
      background: var(--adn-volumecontrol-bg);
      border: var(--adn-volumecontrol-border);
      border-radius: var(--adn-volumecontrol-radius);
      display: flex;
      align-items: center;
      place-content: center;
      gap: var(--adn-volumecontrol-gap, 4px);
      padding: var(--adn-volumecontrol-padding);
      box-shadow: var(--adn-volumecontrol-box-shadow);
    }

    svg {
      width: var(--adn-volumecontrol-size-icon, var(--_size-icon));
      height: auto;
      color: var(--adn-volumecontrol-color-icon, var(--_color-accent));
    }

    input {
      -webkit-appearance: none;
      appearance: none;
      height: var(--adn-volumecontrol-height-slider, var(--_height-slider));
      width: var(--adn-volumecontrol-width, 100%);
      border: var(--adn-volumecontrol-border-slider);
      border-radius: var(--adn-volumecontrol-radius-slider, var(--_height-slider));
      padding: var(--adn-volumecontrol-padding-slider, 10px 0);
      background: linear-gradient(to right, var(--adn-volumecontrol-color-highlight, var(--_color-accent)) var(--_width), var(--adn-volumecontrol-color-slider-bg, var(--_bg-light)) var(--_width));
      background-clip: content-box;
      outline: none;
    }

    input:focus-visible {
      outline: 2px solid var(--_color-accent);
      outline-offset: 2px;
    }

    input:hover {
      --__thumb-size: var(--adn-volumecontrol-size-thumb-hover, var(--_thumb-size-hover));
    }

    input::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: var(--__thumb-size, var(--adn-volumecontrol-size-thumb, var(--_thumb-size)));
      aspect-ratio: 1;
      background: var(--adn-volumecontrol-color-thumb, var(--_color-accent));
      border-radius: var(--adn-volumecontrol-radius-thumb, 50%);
      cursor: pointer;
      transition: var(--adn-volumecontrol-transition-thumb, var(--_transition));
      border: var(--adn-volumecontrol-border-thumb);
    }

    input::-moz-range-thumb {
      appearance: none;
      width: var(--__thumb-size, var(--adn-volumecontrol-size-thumb, var(--_thumb-size)));
      aspect-ratio: 1;
      background: var(--adn-volumecontrol-color-thumb, var(--_color-accent));
      border-radius: var(--adn-volumecontrol-radius-thumb, 50%);
      cursor: pointer;
      border: var(--adn-volumecontrol-border-thumb);
      transition: var(--adn-volumecontrol-transition-thumb, var(--_thumb-transition));
    }

    input::-webkit-slider-runnable-track {
      background: transparent;
    }

    input::-moz-range-track {
      background: transparent;
    }
  `
}
