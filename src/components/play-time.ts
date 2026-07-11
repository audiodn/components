import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { formatDuration } from '../lib/util.ts'
import { t, type Locale } from '../lib/i18n.ts'
import type { TemplateResult } from 'lit'

declare global {
  interface HTMLElementTagNameMap {
    'audiodn-play-time': AudioDnPlayTime;
  }
}

@customElement('audiodn-play-time')
export class AudioDnPlayTime extends LitElement {
  @property({ type: Number })
  elapsed = 0

  @property({ type: Number })
  duration = 0

  @property({ type: String, attribute: 'locale' })
  locale: Locale = 'en'

  static styles = styles()

  render () {
    return template.call(this)
  }
}

function template (this: AudioDnPlayTime): TemplateResult {
  const ariaLabel = t(this.locale, 'playTime.aria', {
    elapsed: formatDuration(this.elapsed),
    total: formatDuration(this.duration),
  })

  return html`
    <span role="timer" aria-label=${ariaLabel}>
      <span>${formatDuration(this.elapsed)}</span> <span>/</span>
      <span>${formatDuration(this.duration)}</span>
    </span>
  `
}

function styles () {
  return css`
    :host {
      background: var(--adn-playtime-bg);
      color: var(--adn-playtime-color-font);
      border: var(--adn-playtime-border);
      border-radius: var(--adn-playtime-radius);
      box-shadow: var(--adn-playtime-box-shadow);
      width: var(--adn-playtime-width);
      height: var(--adn-playtime-height);
      padding: var(--adn-playtime-padding);
      gap: var(--adn-playtime-gap);
      font-size: var(--adn-playtime-font-size, var(--_text-small));
      display: flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
    }

    span:nth-of-type(1) > span:nth-of-type(1) {
      color: var(--adn-playtime-color-font-elapsed);
    }

    span:nth-of-type(1) > span:nth-of-type(2) {
      color: var(--adn-playtime-color-font-separator);
    }
  `
}
