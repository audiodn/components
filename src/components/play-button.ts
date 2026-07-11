import { LitElement, html, css, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { iconPlay, iconPause, iconRetry } from '../lib/constants.ts'
import { t, type Locale } from '../lib/i18n.ts'
import type { TemplateResult } from 'lit'

declare global {
  interface HTMLElementTagNameMap {
    'audiodn-play-button': AudioDnPlayButton;
  }
}

@customElement('audiodn-play-button')
export class AudioDnPlayButton extends LitElement {
  @property({ type: String, attribute: 'state', reflect: true })
  state: string = 'paused'

  @property({ type: Boolean, attribute: 'buffering', reflect: true })
  buffering: boolean = false

  @property({ type: String, attribute: 'locale' })
  locale: Locale = 'en'

  static styles = styles()

  render () {
    return template.call(this)
  }

  getIconForState () {
    return {
      playing: iconPause,
      paused: iconPlay,
      error: iconRetry,
    }[this.state] ?? iconPlay
  }

  getLabel () {
    if (this.state === 'error') return t(this.locale, 'playButton.retry')
    if (this.buffering) return t(this.locale, 'playButton.loading')
    return this.state === 'playing'
      ? t(this.locale, 'playButton.pause')
      : t(this.locale, 'playButton.play')
  }

  handleEvent () {
    this.dispatchEvent(new CustomEvent('adni-click'))
  }
}

function template (this: AudioDnPlayButton): TemplateResult {
  const showSpinner = this.buffering && this.state !== 'error'

  return html`<button
    @click=${this}
    aria-label=${this.getLabel()}
    aria-pressed=${this.state === 'playing'}
    aria-busy=${showSpinner ? 'true' : 'false'}
  >
    ${showSpinner ? html`<span class="spinner" aria-hidden="true"></span>` : nothing}
    ${this.getIconForState()}
  </button>`
}

function styles () {
  return css`
    button {
      /* Visual circle size (falls back to the size-scale value); the button
         itself stays at a 44px minimum tap target for accessibility. */
      --_pb-size: var(--adn-playbutton-width, var(--_playbutton-size));

      -webkit-appearance: none;
      appearance: none;
      border: none;
      background: transparent;
      min-width: var(--adn-playbutton-touch, 44px);
      min-height: var(--adn-playbutton-touch, 44px);
      color: var(--adn-playbutton-color, var(--_color-accent-alt));
      padding: var(--adn-playbutton-padding, 0);
      display: grid;
      place-content: center;
      position: relative;
      cursor: pointer;

      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: var(--_pb-size);
        height: var(--adn-playbutton-height, var(--_pb-size));
        transform: translate(-50%, -50%);
        border: var(--adn-playbutton-border, unset);
        border-radius: var(--adn-playbutton-radius, 50%);
        background: var(--adn-playbutton-bg, var(--_color-accent));
        box-shadow: var(--adn-playbutton-box-shadow);
        transition: var(--adn-playbutton-transition, var(--_transition));
      }

      &:hover::before {
        transform: translate(-50%, -50%) var(--adn-playbutton-transform, scale(1.06));
      }

      &:focus-visible {
        outline: none;
      }

      &:focus-visible::before {
        outline: 2px solid var(--adn-playbutton-color, var(--_color-accent-alt));
        outline-offset: 2px;
      }
    }

    /* Error state: neutral/muted circle so it reads as "unavailable, tap to retry". */
    :host([state="error"]) button::before {
      background: var(--adn-playbutton-bg-error, var(--_bg-light, #444));
    }

    :host([state="error"]) button {
      color: var(--adn-playbutton-color-error, var(--_color-font, #fff));
    }

    svg {
      width: var(--adn-playbutton-width-icon, calc(var(--_pb-size) * 0.55));
      place-self: center;
      position: relative;
      z-index: 1;
    }

    /* Buffering: fade the icon and overlay a spinning ring on the circle. */
    :host([buffering]:not([state="error"])) svg {
      opacity: 0.35;
    }

    .spinner {
      position: absolute;
      top: 50%;
      left: 50%;
      width: calc(var(--_pb-size) * 0.72);
      height: calc(var(--_pb-size) * 0.72);
      transform: translate(-50%, -50%);
      border-radius: 50%;
      border: 2px solid transparent;
      border-top-color: var(--adn-playbutton-color, var(--_color-accent-alt));
      z-index: 2;
      animation: pb-spin 0.7s linear infinite;
    }

    @keyframes pb-spin {
      to { transform: translate(-50%, -50%) rotate(360deg); }
    }

    @media (prefers-reduced-motion: reduce) {
      .spinner { animation-duration: 1.4s; }
    }
  `
}
