import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { formatDuration, formatDurationTimestamp } from '../lib/util.ts'
import { t, type Locale } from '../lib/i18n.ts'
import type { TemplateResult, CSSResult } from 'lit'
import type { Track } from '../lib/track.ts'

declare global {
  interface HTMLElementTagNameMap {
    'audiodn-tracklist': AudioDnTracklist;
  }
}

@customElement('audiodn-tracklist')
export class AudioDnTracklist extends LitElement {
  @property({ type: Array })
  tracks: Track[] = []

  @property({ type: String, attribute: 'active-track-id', reflect: true })
  activeTrackId = ''

  @property({ type: String, attribute: 'locale' })
  locale: Locale = 'en'

  static styles = styles()

  render () {
    return template.call(this)
  }

  handleEvent (e: Event) {
    const target = e.currentTarget as HTMLElement
    if (!target) return

    this.dispatchEvent(new CustomEvent('adni-track-selected', {
      detail: target.getAttribute('track-id'),
    }))
  }

  protected handleKeydown (e: KeyboardEvent) {
    const items = Array.from(this.shadowRoot?.querySelectorAll('li') || [])
    const current = e.currentTarget as HTMLElement
    const index = items.indexOf(current as HTMLLIElement)

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      const next = items[index + 1] || items[0]
      next?.focus()
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const prev = items[index - 1] || items[items.length - 1]
      prev?.focus()
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      this.dispatchEvent(new CustomEvent('adni-track-selected', {
        detail: current.getAttribute('track-id'),
      }))
    }
  }
}

function template (this: AudioDnTracklist): TemplateResult {
  if (this.tracks.length <= 1) return html``

  return html`
    <ul role="listbox" aria-label=${t(this.locale, 'tracklist.aria')}>
      ${this.tracks.map((track, index) => {
        const title = track.playerTitle ?? track.fileName
        const subtitle = track.playerSubtitle
        const text = [title, subtitle].join(' - ')
        const active = track.id === this.activeTrackId

        return html`
          <li track-id=${track.id}
              ?active=${active}
              role="option"
              aria-selected="${active}"
              tabindex="${active ? '0' : '-1'}"
              @click=${this}
              @keydown=${(e: KeyboardEvent) => this.handleKeydown(e)}>
            <span class="tracklist-number" aria-hidden="true">${index + 1}</span>
            <div class="tracklist-text" title="${text}">${text}</div>
            <time duration="${formatDurationTimestamp(track.duration)}">${formatDuration(track.duration)}</time>
          </li>
        `
      })}
    </ul>
  `
}

function styles (): CSSResult {
  return css`
    :host {
      overflow-y: auto;
      max-height: var(--adn-tracklist-max-height, 300px);
      scrollbar-width: var(--adn-tracklist-width-scrollbar, var(--_width-slider));
      scrollbar-color: var(--_color-accent) transparent;
      background: var(--adn-tracklist-bg, var(--_bg));
      border: var(--adn-tracklist-border);
      border-radius: var(--adn-tracklist-radius);
      padding: var(--adn-tracklist-padding, 0);
      box-shadow: var(--adn-tracklist-box-shadow);
    }

    :host::-webkit-scrollbar {
      width: var(--adn-tracklist-width-scrollbar, var(--_width-slider));
      background-color: var(--adn-tracklist-color-slider, var(--_bg-light));
    }

    :host::-webkit-scrollbar-thumb {
      background-color: var(--adn-tracklist-color-thumb, var(--_color-accent));
      border-radius: var(--adn-tracklist-radius-thumb, 5px);
    }

    ul {
      list-style: none;
      display: grid;

      &:has(li) {
        padding: 0;
        margin: 0;
      }
    }

    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      border-inline-start: var(--adn-tracklist-size-highlight, var(--_width-highlight)) solid transparent;
      gap: 8px;
      cursor: pointer;
      padding: var(--adn-tracklist-padding-item, 8px 12px);
      min-width: 0;
      min-height: 44px;
      color: var(--adn-tracklist-color-font);
      transition: var(--adn-tracklist-transition, var(--_transition));
    }

    li:hover {
      background: var(--adn-tracklist-color-highlight, rgba(var(--_color-accent-rgb), 0.2));
    }

    li:focus-visible {
      outline: 2px solid var(--_color-accent);
      outline-offset: -2px;
    }

    li[active] {
      background: var(--adn-tracklist-color-highlight, rgba(var(--_color-accent-rgb), 0.2));
      border-color: var(--adn-tracklist-color-highlight-indicator, var(--_color-accent));
      cursor: auto;
    }

    .tracklist-number {
      flex-shrink: 0;
      box-sizing: border-box;
      min-width: var(--adn-tracklist-width-number, 2ch);
      text-align: right;
      padding-inline-end: var(--adn-tracklist-gap-number, 4px);
      font-variant-numeric: tabular-nums;
      font-size: var(--_text-small);
      font-weight: 600;
      color: var(--adn-tracklist-color-number, var(--_color-font-muted));
    }

    li[active] .tracklist-number,
    li:hover .tracklist-number {
      color: var(--adn-tracklist-color-number-active, var(--_color-accent));
    }

    .tracklist-text {
      flex: 1;
      min-width: 0;
      overflow-x: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `
}
