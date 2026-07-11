import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { iconSetting, iconDownload } from '../lib/constants.ts'
import { apiURL } from '../lib/api.ts'
import { formatBytes } from '../lib/util.ts'
import { t, type Locale } from '../lib/i18n.ts'
import type { CSSResult, TemplateResult } from 'lit'
import type { TrackVariant } from '../lib/track.ts'

@customElement('audiodn-settings-menu')
export class AudioDnSettingsMenu extends LitElement {
  @property({ type: Array })
  variants: TrackVariant[] = []

  @property({ type: Object })
  variant?: TrackVariant

  @property({ type: String, attribute: 'locale' })
  locale: Locale = 'en'

  @property({ type: String, attribute: 'play-session-id', reflect: true })
  playSessionId?: string

  @property({ type: String, attribute: 'track-id', reflect: true })
  trackId?: string

  @property({ type: Boolean, attribute: 'download', reflect: true })
  download: boolean = false

  @state()
  protected isOpen = false

  static styles = styles()

  render () {
    return template.call(this)
  }

  updated (changedProperties: Map<string, unknown>) {
    if (changedProperties.has('isOpen') && this.isOpen) {
      this.setMaxHeightStyleProperty()
    }
  }

  handleEvent (event: Event) {
    const target = event.currentTarget as HTMLElement

    if (event.type === 'click' && target.getAttribute('name') === 'toggle') {
      this.isOpen = !this.isOpen
    }

    if (event.type === 'click' && target.getAttribute('name') === 'variant') {
      const el = event.currentTarget as HTMLElement
      const detail = el.getAttribute('index')
      this.dispatchEvent(new CustomEvent('adni-selectvariant', { detail }))
    }
  }

  protected handleKeydown (e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      this.isOpen = false
      this.shadowRoot?.querySelector<HTMLElement>('[name=toggle]')?.focus()
      return
    }

    if (!this.isOpen) return

    const items = Array.from(this.shadowRoot?.querySelectorAll<HTMLElement>('li button, li a') || [])
    const currentIndex = items.indexOf(e.target as HTMLElement)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = items[currentIndex + 1] || items[0]
      next?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = items[currentIndex - 1] || items[items.length - 1]
      prev?.focus()
    }
  }

  private setMaxHeightStyleProperty () {
    if (!this.shadowRoot) return

    const toggle = this.shadowRoot.querySelector('[name=toggle]')
    if (!toggle) return

    const container = this.closest('.player-body')
    if (!container) return

    const maxHeight = toggle.getBoundingClientRect().top - container.getBoundingClientRect().top
    this.style.setProperty('--_max-height', `${maxHeight}px`)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'audiodn-settings-menu': AudioDnSettingsMenu
  }
}

function template (this: AudioDnSettingsMenu): TemplateResult {
  if (!this.playSessionId) return html``

  const downloadUrl = (v: TrackVariant) => {
    return `${apiURL}/v1/play/${this.playSessionId}/${this.trackId}/${v.variant.index}/download`
  }

  return html`
    <button name=toggle
            @click=${this}
            aria-haspopup="true"
            aria-expanded="${this.isOpen}"
            aria-label=${t(this.locale, 'settings.aria')}
            @keydown=${(e: KeyboardEvent) => this.handleKeydown(e)}>
      ${iconSetting}
    </button>

    <ul role="menu" ?open=${this.isOpen} @keydown=${(e: KeyboardEvent) => this.handleKeydown(e)}>
      ${this.variants.map((v: TrackVariant): TemplateResult => {
        if (!this.variant) return html``
        const encoding = `${v.props.codec.toUpperCase()} ${v.props.bitrate}`
        const sizeStr = v.size != null && v.size > 0 ? ` · ${formatBytes(v.size, 2)}` : ''
        const name = (v.variant.index || '').toUpperCase()
        const buttonText = `${name} — ${encoding}${sizeStr}`

        return html`
          <li role="menuitem" ?active=${v.id === this.variant.id}>
            <button @click=${this} name="variant" index=${v.variant.index} ?disabled=${v.id === this.variant.id}>${buttonText}</button>
            ${this.download && html`<a href="${downloadUrl(v)}" target="_blank" rel="noopener noreferrer" aria-label=${t(this.locale, 'settings.download', { label: buttonText })}>${iconDownload}</a>`}
          </li>
        `
      })}
    </ul>
  `
}

function styles (): CSSResult {
  return css`
    :host {
      position: relative;
      padding: var(--adn-settingsmenu-padding);
      background: var(--adn-settingsmenu-bg);
      border: var(--adn-settingsmenu-border);
      border-radius: var(--adn-settingsmenu-radius);
      padding: var(--adn-settingsmenu-padding);
      justify-content: center;
      align-items: center;
      display: flex;
      box-shadow: var(--adn-settingsmenu-box-shadow);
    }

    [name=toggle] {
      --webkit-appearance: none;
      appearance: none;
      font-size: unset;
      background: none;
      height: auto;
      min-width: var(--adn-settingsmenu-min-touch, 44px);
      min-height: var(--adn-settingsmenu-min-touch, 44px);
      color: var(--adn-settingsmenur-color-icon, var(--_color-accent));
      background: var(--adn-settingsmenu-bg-toggle, transparent);
      justify-content: center;
      display: flex;
      align-items: center;
      cursor: pointer;
      border: none;
    }

    [name=toggle]:focus-visible {
      outline: 2px solid var(--_color-accent);
      outline-offset: 2px;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: none;
      position: absolute;
      right: 0;
      bottom: 100%;
      overflow-y: auto;
      max-height: var(--_max-height);
      background: var(--adn-settingsmenu-bg-popover, var(--_bg));
      border-radius: var(--adn-settingsmenu-radius-popover);
      border: var(--adn-settingsmenu-border-popover);
      padding: var(--adn-settingsmenu-padding-popover);
      box-shadow: var(--adn-settingsmenu-box-shadow-popover);
      transform-origin: bottom right;
      transform: scaleY(0);
      opacity: 0;
      transition: transform 150ms ease-out, opacity 150ms ease-out;

      &[open] {
        display: grid;
        transform: scaleY(1);
        opacity: 1;
      }
    }

    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      border-inline-start: var(--adn-settingsmenu-size-highlight, var(--_width-highlight)) solid transparent;
      gap: 8px;
      cursor: pointer;
      min-height: 44px;
      padding: var(--adn-settingsmenu-padding-item, 4px 8px);
    }

    li:hover {
      background: var(--adn-settingsmenu-color-highlight, rgba(var(--_color-accent-rgb), 0.2));
    }

    li[active] {
      background: var(--adn-settingsmenu-color-highlight, rgba(var(--_color-accent-rgb), 0.2));
      border-color: var(--adn-settingsmenu-color-highlight, var(--_color-accent));
    }

    button {
      -webkit-appearance: none;
      appearance: none;
      border: none;
      background: transparent;
      white-space: nowrap;
      font-size: var(--_text-regular);
      color: var(--adn-settingsmenu-color-item, var(--_color-accent-alt));
      padding: 0;

      &:not([disabled]) {
        cursor: pointer;
      }

      &:focus-visible {
        outline: 2px solid var(--_color-accent);
        outline-offset: 2px;
      }
    }

    a:focus-visible {
      outline: 2px solid var(--_color-accent);
      outline-offset: 2px;
    }

    @keyframes rotate {
      from {
        transform: rotate(0deg);
      }

      to {
        transform: rotate(360deg);
      }
    }

    svg {
      width: var(--adn-settingsmenu-size-width, var(--_size-icon));
      height: auto;

      [name=toggle] &:hover {
        animation: rotate 3s linear infinite;
        cursor: pointer;
      }
    }
  `
}
