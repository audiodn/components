import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { t, type Locale } from '../lib/i18n.ts'
import type { TemplateResult, CSSResult } from 'lit'
import type { CoverImage, CoverImageSize } from '../lib/track.ts'

declare global {
  interface HTMLElementTagNameMap {
    'audiodn-cover-art': AudioDnCoverArt;
  }
}

@customElement('audiodn-cover-art')
export class AudioDnCoverArt extends LitElement {
  @property({ type: Object })
  coverImage?: CoverImage

  @property({ type: String, attribute: 'size', reflect: true })
  size: string = 'large'

  @property({ type: String, attribute: 'locale' })
  locale: Locale = 'en'

  static styles = styles()

  render () {
    const size = this.size
    const data = this.coverImage?.[size as keyof typeof this.coverImage]
    if (!data) {
      return html`<div class="placeholder" role="img" aria-label=${t(this.locale, 'coverArt.none')}></div>`
    }

    return template(data, this.locale)
  }
}

function template (data: CoverImageSize, locale: Locale): TemplateResult {
  return html`
    <img
      src=${data.url}
      width=${data.width}
      height=${data.height}
      alt=${t(locale, 'coverArt.alt')}
      loading="lazy"
    />
  `
}

function styles (): CSSResult {
  return css`
    :host {
      background: var(--adn-coverart-bg);
      color: var(--adn-coverart-color-font);
      border: var(--adn-coverart-border);
      border-radius: var(--adn-coverart-radius);
      box-shadow: var(--adn-coverart-box-shadow);
      padding: var(--adn-coverart-padding);
      width: var(--adn-coverart-width, var(--_coverart-size));
      height: var(--adn-coverart-height, var(--_coverart-size));

      display: block;
      overflow: hidden;
    }

    img {
      transition: var(--adn-coverart-transition, var(--_transition));
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      filter: var(--adn-coverart-filter);

      &:hover {
        transform: var(--adn-coverart-transform, scale(1.05));
      }
    }

    .placeholder {
      width: 100%;
      height: 100%;
      background: var(--adn-coverart-bg-placeholder, var(--_bg-light, #333));
      border-radius: inherit;
    }
  `
}
