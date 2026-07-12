import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { iconSetting, iconDownload } from '../lib/constants.ts'
import { getPlaySessionTrackVariantDownload } from '../lib/api.ts'
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

  // Number of real variants (activeTrackVariants can be sparse, so ignore holes).
  private get variantCount (): number {
    return this.variants.filter(Boolean).length
  }

  // The cog is only useful when it has something behind it: more than one
  // variant to switch between, or a downloadable variant. With a single variant
  // and no download there's nothing to choose, so the menu hides itself (see the
  // :host([hidden]) rule) and the volume control takes over the space.
  get hasMenu (): boolean {
    if (!this.playSessionId) return false
    const canSwitchVariant = this.variantCount > 1
    const canDownload = this.download && this.variantCount > 0
    return canSwitchVariant || canDownload
  }

  render () {
    return template.call(this)
  }

  // Fetch a fresh download URL and trigger the browser download. The endpoint is
  // the real gate: if the session isn't downloadable (API key said no) it 403s,
  // and we surface a graceful, localized message via `adni-download-error`
  // rather than a broken link. The presigned URL carries a
  // `Content-Disposition: attachment`, so the browser saves the file instead of
  // navigating away from the embedded player.
  async handleDownload (variantIndex: string) {
    if (!this.playSessionId || !this.trackId) return

    try {
      const result = await getPlaySessionTrackVariantDownload(
        this.playSessionId,
        this.trackId,
        variantIndex,
        this.locale
      )

      const url = result?.download?.url
      if (!url) throw new Error('Download URL missing')

      const anchor = document.createElement('a')
      anchor.href = url
      anchor.rel = 'noopener'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } catch (err) {
      this.dispatchEvent(new CustomEvent('adni-download-error', {
        detail: { variant: variantIndex, error: err },
        bubbles: true,
        composed: true,
      }))
    }
  }

  willUpdate () {
    // Reflect emptiness onto the host so it collapses out of the layout and the
    // parent player can adjust spacing (see audiodn-settings-menu[hidden] rules).
    const empty = !this.hasMenu
    this.toggleAttribute('hidden', empty)
    if (empty && this.isOpen) this.isOpen = false
  }

  updated (changedProperties: Map<string, unknown>) {
    if (changedProperties.has('isOpen')) {
      this.syncPopover()
    }
  }

  disconnectedCallback () {
    super.disconnectedCallback()
    this.removeDismissListeners()
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

  // The popover lives in the browser's top layer, so it floats above the player
  // (and any `overflow: hidden` ancestors) like a normal dropdown menu instead
  // of being clipped inside the compact player body.
  private get popoverEl (): PopoverElement | null {
    return (this.shadowRoot?.querySelector('ul') as PopoverElement | null) ?? null
  }

  private syncPopover () {
    const ul = this.popoverEl
    if (!ul) return

    const supported = typeof ul.showPopover === 'function'

    if (this.isOpen) {
      if (supported) {
        if (!ul.matches(':popover-open')) {
          try { ul.showPopover() } catch { /* not connected / already open */ }
        }
      } else {
        ul.setAttribute('data-open', '')
      }
      this.positionMenu()
      this.addDismissListeners()
    } else {
      if (supported) {
        if (ul.matches(':popover-open')) {
          try { ul.hidePopover() } catch { /* already closed */ }
        }
      } else {
        ul.removeAttribute('data-open')
      }
      this.removeDismissListeners()
    }
  }

  // Position the popover relative to the cog: open downward when it fits,
  // otherwise flip upward. Right-aligned to the cog and clamped to the viewport.
  private positionMenu () {
    if (typeof window === 'undefined') return
    const ul = this.popoverEl
    const toggle = this.shadowRoot?.querySelector<HTMLElement>('[name=toggle]')
    if (!ul || !toggle || typeof ul.showPopover !== 'function') return
    if (!ul.matches(':popover-open')) return

    const GAP = 6
    const MARGIN = 8
    const vw = window.innerWidth
    const vh = window.innerHeight
    const t = toggle.getBoundingClientRect()

    // If the cog has scrolled out of view, there's nothing to anchor to.
    if (t.bottom < 0 || t.top > vh) {
      this.isOpen = false
      return
    }

    // Measure the natural size with no height cap so the flip decision is honest.
    ul.style.maxHeight = ''
    const menuW = ul.offsetWidth
    const menuH = ul.offsetHeight

    const spaceBelow = vh - t.bottom - GAP - MARGIN
    const spaceAbove = t.top - GAP - MARGIN

    let openDown: boolean
    if (menuH <= spaceBelow) openDown = true
    else if (menuH <= spaceAbove) openDown = false
    else openDown = spaceBelow >= spaceAbove

    let top: number
    let maxH: number
    if (openDown) {
      top = t.bottom + GAP
      maxH = spaceBelow
    } else {
      maxH = spaceAbove
      top = t.top - GAP - Math.min(menuH, maxH)
    }

    let left = t.right - menuW
    left = Math.max(MARGIN, Math.min(left, vw - menuW - MARGIN))

    ul.style.position = 'fixed'
    ul.style.inset = 'auto'
    ul.style.margin = '0'
    ul.style.left = `${Math.round(left)}px`
    ul.style.top = `${Math.round(top)}px`
    ul.style.maxHeight = `${Math.round(Math.max(0, maxH))}px`
    ul.dataset.dir = openDown ? 'down' : 'up'
  }

  private readonly reposition = () => this.positionMenu()

  private readonly onDocumentPointerDown = (event: Event) => {
    if (!event.composedPath().includes(this)) this.isOpen = false
  }

  private listening = false

  private addDismissListeners () {
    if (this.listening || typeof window === 'undefined') return
    this.listening = true
    document.addEventListener('pointerdown', this.onDocumentPointerDown, true)
    window.addEventListener('scroll', this.reposition, { capture: true, passive: true })
    window.addEventListener('resize', this.reposition)
  }

  private removeDismissListeners () {
    if (!this.listening || typeof window === 'undefined') return
    this.listening = false
    document.removeEventListener('pointerdown', this.onDocumentPointerDown, true)
    window.removeEventListener('scroll', this.reposition, true)
    window.removeEventListener('resize', this.reposition)
  }
}

type PopoverElement = HTMLElement & {
  showPopover?: () => void
  hidePopover?: () => void
}

declare global {
  interface HTMLElementTagNameMap {
    'audiodn-settings-menu': AudioDnSettingsMenu
  }
}

function template (this: AudioDnSettingsMenu): TemplateResult {
  if (!this.hasMenu) return html``

  return html`
    <button name=toggle
            @click=${this}
            aria-haspopup="true"
            aria-expanded="${this.isOpen}"
            aria-label=${t(this.locale, 'settings.aria')}
            @keydown=${(e: KeyboardEvent) => this.handleKeydown(e)}>
      ${iconSetting}
    </button>

    <ul role="menu" popover="manual" @keydown=${(e: KeyboardEvent) => this.handleKeydown(e)}>
      ${this.variants.map((v: TrackVariant): TemplateResult => {
        if (!this.variant) return html``
        const encoding = `${v.props.codec.toUpperCase()} ${v.props.bitrate}`
        const sizeStr = v.size != null && v.size > 0 ? ` · ${formatBytes(v.size, 2)}` : ''
        const name = (v.variant.index || '').toUpperCase()
        const buttonText = `${name} — ${encoding}${sizeStr}`

        return html`
          <li role="menuitem" ?active=${v.id === this.variant.id}>
            <button @click=${this} name="variant" index=${v.variant.index} ?disabled=${v.id === this.variant.id}>${buttonText}</button>
            ${this.download ? html`<button type="button" name="download" @click=${() => this.handleDownload(v.variant.index)} aria-label=${t(this.locale, 'settings.download', { label: buttonText })}>${iconDownload}</button>` : ''}
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

    :host([hidden]) {
      display: none;
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

    /* The menu is a top-layer popover (see syncPopover / positionMenu). It is
       display:none until opened; the UA promotes it to the top layer where it
       floats above the player instead of being clipped by it. JS sets its
       fixed left/top/max-height inline. */
    ul {
      list-style: none;
      padding: var(--adn-settingsmenu-padding-popover);
      margin: 0;
      display: none;
      overflow-y: auto;
      min-width: var(--adn-settingsmenu-min-width-popover, 12rem);
      max-width: calc(100vw - 16px);
      background: var(--adn-settingsmenu-bg-popover, var(--_bg));
      border-radius: var(--adn-settingsmenu-radius-popover, var(--adn-radius, 8px));
      /* Default border + shadow so the popover reads as a distinct floating
         surface in any theme. The border is derived from the font color, so it
         stays subtle and visible whether the surface is dark or light (without
         them, a light-theme popover blends into a light page). */
      border: var(--adn-settingsmenu-border-popover, 1px solid color-mix(in srgb, var(--_color-font) 20%, transparent));
      box-shadow: var(--adn-settingsmenu-box-shadow-popover, 0 8px 28px rgba(0, 0, 0, 0.35));
      opacity: 0;
      transform: translateY(-6px);
      transition:
        opacity 140ms ease,
        transform 140ms ease,
        overlay 140ms ease allow-discrete,
        display 140ms ease allow-discrete;
    }

    ul[data-dir="up"] {
      transform: translateY(6px);
    }

    ul:popover-open {
      display: grid;
      opacity: 1;
      transform: none;
    }

    @starting-style {
      ul:popover-open {
        opacity: 0;
        transform: translateY(-6px);
      }

      ul[data-dir="up"]:popover-open {
        transform: translateY(6px);
      }
    }

    /* Fallback for browsers without the Popover API: render in-flow above the
       cog. It may be clipped by the player, but the menu stays functional. */
    ul[data-open] {
      display: grid;
      position: absolute;
      right: 0;
      bottom: calc(100% + 6px);
      opacity: 1;
      transform: none;
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
      /* The label sits on the popover's neutral surface, so it must track the
         theme font color (not --_color-accent-alt, which is the on-accent
         foreground and can resolve to black/white independently of the
         surface). The accent is used for the active/hover highlight below. */
      color: var(--adn-settingsmenu-color-item, var(--_color-font));
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
