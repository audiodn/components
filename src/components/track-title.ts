import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { t, type Locale } from '../lib/i18n.ts'
import type { TemplateResult, CSSResult } from 'lit'

declare global {
  interface HTMLElementTagNameMap {
    'audiodn-track-title': AudioDnTrackTitle;
  }
}

@customElement('audiodn-track-title')
export class AudioDnTrackTitle extends LitElement {
  @property({ type: String, attribute: 'title' })
  title = ''

  @property({ type: String, attribute: 'subtitle' })
  subtitle = ''

  @property({ type: String, attribute: 'locale' })
  locale: Locale = 'en'

  static styles = styles()

  render (): TemplateResult {
    return template.call(this)
  }
}

function template (this: AudioDnTrackTitle): TemplateResult {
  return html`
    <div class="track-title" title=${this.title} aria-label="${this.title || t(this.locale, 'trackTitle.none')}">${this.title || html`&nbsp;`}</div>
    <div class="track-subtitle" title=${this.subtitle} aria-label=${this.subtitle}>${this.subtitle || html`&nbsp;`}</div>
  `
}

function styles (): CSSResult {
  return css`
    :host {
      display: grid;
      overflow: hidden;
      min-width: 0;

      background: var(--adn-tracktitle-bg);
      border: var(--adn-tracktitle-border);
      border-radius: var(--adn-tracktitle-radius);
      box-shadow: var(--adn-tracktitle-box-shadow);
      width: var(--adn-tracktitle-width, 100%);
      gap: var(--adn-tracktitle-gap, 2px);
      padding: var(--adn-tracktitle-padding);
    }

    .track-title,
    .track-subtitle {
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .track-title {
      color: var(--adn-tracktitle-color-fg);
      font-size: var(--adn-tracktitle-font-size, var(--adn-text-large));
    }

    .track-subtitle {
      font-size: var(--adn-tracktitle-font-size-subtitle, var(--_text-small));
      color: var(--adn-tracktitle-color-fg-subtitle, var(--_color-font-muted));
    }
  `
}
