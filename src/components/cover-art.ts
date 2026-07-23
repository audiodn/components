import { LitElement, html, css, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { t, type Locale } from '../lib/i18n.ts'
import { isUsableCoverImageSize } from '../lib/track.ts'
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

  /** Set when the resolved image fails to load so we fall back to the placeholder. */
  @state()
  private loadFailed = false

  static styles = styles()

  protected updated (changed: Map<string, unknown>) {
    if (changed.has('coverImage') || changed.has('size')) {
      this.loadFailed = false
    }
  }

  private resolveSize (): CoverImageSize | undefined {
    const image = this.coverImage
    if (!image) return undefined

    const preferred = image[this.size as keyof CoverImage]
    if (isUsableCoverImageSize(preferred)) return preferred

    // Fall back through other sizes if the requested one is missing.
    for (const key of ['large', 'regular', 'small', 'icon'] as const) {
      const candidate = image[key]
      if (isUsableCoverImageSize(candidate)) return candidate
    }
    return undefined
  }

  private handleImageError = () => {
    this.loadFailed = true
  }

  render () {
    const data = this.resolveSize()
    if (!data || this.loadFailed) {
      return placeholderTemplate(this.locale)
    }

    return imageTemplate(data, this.locale, this.handleImageError)
  }
}

function placeholderTemplate (locale: Locale): TemplateResult {
  return html`
    <div class="placeholder" role="img" aria-label=${t(locale, 'coverArt.none')}>
      <svg class="placeholder-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/>
      </svg>
    </div>
  `
}

function imageTemplate (
  data: CoverImageSize,
  locale: Locale,
  onError: (e: Event) => void
): TemplateResult {
  return html`
    <img
      src=${data.url}
      width=${data.width || nothing}
      height=${data.height || nothing}
      alt=${t(locale, 'coverArt.alt')}
      loading="lazy"
      @error=${onError}
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
      flex-shrink: 0;
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
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--adn-coverart-bg-placeholder, var(--_bg-light, #333));
      color: var(--adn-coverart-color-placeholder, var(--_color-font-muted, #888));
      border-radius: inherit;
    }

    .placeholder-icon {
      width: 42%;
      height: 42%;
      opacity: 0.55;
    }
  `
}
