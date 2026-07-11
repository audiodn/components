import { LitElement, html, css, svg } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { t, type Locale } from '../lib/i18n.ts'
import type { CSSResult, TemplateResult } from 'lit'

type NotificationType = 'error' | 'success' | 'info' | 'warning'

interface NotificationAction {
  label: string
  onClick: () => void
}

interface NotificationOptions {
  action?: NotificationAction
  duration?: number
}

interface NotificationItem {
  id: number
  type: NotificationType
  message: string
  action?: NotificationAction
  dismissing?: boolean
  timeout?: ReturnType<typeof setTimeout>
}

declare global {
  interface HTMLElementTagNameMap {
    'audiodn-notification': AudioDnNotification
  }
}

const EXIT_MS = 180

const icons: Record<NotificationType, TemplateResult> = {
  error: svg`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`,
  warning: svg`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9.5 16.5H2.5L12 3z"/><path d="M12 10v4"/><path d="M12 17.5v.01"/></svg>`,
  info: svg`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8v.01"/></svg>`,
  success: svg`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>`,
}

@customElement('audiodn-notification')
export class AudioDnNotification extends LitElement {
  @property({ type: Number })
  duration: number = 5000

  @property({ type: String, attribute: 'locale' })
  locale: Locale = 'en'

  @state()
  private notifications: NotificationItem[] = []

  private nextId = 0

  static styles = styles()

  add (type: NotificationType, message: string, options: NotificationOptions = {}) {
    // Errors and warnings persist until dismissed / acted upon; transient
    // states (info/success) auto-dismiss. An explicit duration always wins.
    const duration = options.duration ?? (type === 'error' || type === 'warning' ? 0 : this.duration)

    // De-duplicate: repeated identical messages (e.g. retrying audio errors)
    // just refresh the existing toast instead of stacking copies.
    const existing = this.notifications.find(n => !n.dismissing && n.type === type && n.message === message)
    if (existing) {
      if (existing.timeout) clearTimeout(existing.timeout)
      existing.action = options.action
      if (duration > 0) existing.timeout = setTimeout(() => this.dismiss(existing.id), duration)
      this.notifications = [...this.notifications]
      return existing.id
    }

    const id = this.nextId++
    const item: NotificationItem = { id, type, message, action: options.action }

    if (duration > 0) {
      item.timeout = setTimeout(() => this.dismiss(id), duration)
    }

    // Cap the stack so a burst of notifications can't grow unbounded; the
    // player host clips overflow, and newest is shown first (see render).
    const next = [...this.notifications, item]
    this.notifications = next.length > 4 ? next.slice(next.length - 4) : next

    const eventName = type === 'error' ? 'adn-error' : type === 'success' ? 'adn-success' : `adn-${type}`
    this.dispatchEvent(new CustomEvent(eventName, {
      detail: { message },
      bubbles: true,
      composed: true
    }))

    return id
  }

  dismiss (id: number) {
    const item = this.notifications.find(n => n.id === id)
    if (!item || item.dismissing) return
    if (item.timeout) clearTimeout(item.timeout)

    item.dismissing = true
    this.notifications = [...this.notifications]

    setTimeout(() => {
      this.notifications = this.notifications.filter(n => n.id !== id)
    }, EXIT_MS)
  }

  clear () {
    for (const n of this.notifications) {
      if (n.timeout) clearTimeout(n.timeout)
    }
    this.notifications = []
  }

  private runAction (item: NotificationItem) {
    item.action?.onClick()
    this.dismiss(item.id)
  }

  disconnectedCallback () {
    super.disconnectedCallback()
    this.clear()
  }

  render () {
    if (this.notifications.length === 0) return html``

    return html`
      <div class="notification-stack">
        ${[...this.notifications].reverse().map(n => html`
          <div
            class="notification notification-${n.type} ${n.dismissing ? 'is-dismissing' : ''}"
            role=${n.type === 'error' || n.type === 'warning' ? 'alert' : 'status'}
            aria-live=${n.type === 'error' || n.type === 'warning' ? 'assertive' : 'polite'}
          >
            <span class="notification-icon">${icons[n.type]}</span>
            <span class="notification-message">${n.message}</span>
            ${n.action
? html`
              <button class="notification-action" @click=${() => this.runAction(n)}>${n.action.label}</button>
            `
: ''}
            <button class="notification-dismiss" @click=${() => this.dismiss(n.id)} aria-label=${t(this.locale, 'notification.dismiss')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>
        `)}
      </div>
    `
  }
}

function styles (): CSSResult {
  return css`
    .notification-stack {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: var(--adn-notification-gap, 6px);
      padding: var(--adn-notification-padding, 6px);
      pointer-events: none;
    }

    .notification {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: var(--adn-notification-radius, 8px);
      font-size: var(--adn-notification-font-size, var(--step--1, 0.833rem));
      font-family: var(--adn-font-family, sans-serif);
      line-height: 1.3;
      color: var(--_notif-fg, #fff);
      background: var(--_notif-bg);
      box-shadow: var(--adn-notification-box-shadow, 0 4px 14px rgba(0, 0, 0, 0.35));
      pointer-events: auto;
      animation: notif-in 200ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .notification.is-dismissing {
      animation: notif-out ${EXIT_MS}ms ease-in forwards;
      pointer-events: none;
    }

    .notification-error {
      --_notif-bg: var(--adn-notification-bg-error, #dc2626);
    }

    .notification-warning {
      --_notif-bg: var(--adn-notification-bg-warning, #d97706);
    }

    .notification-info {
      --_notif-bg: var(--adn-notification-bg-info, #2563eb);
    }

    .notification-success {
      --_notif-bg: var(--adn-notification-bg-success, #16a34a);
    }

    .notification-icon {
      display: inline-flex;
      flex-shrink: 0;
    }

    .notification-icon svg {
      width: 1.15em;
      height: 1.15em;
    }

    .notification-message {
      flex: 1;
      min-width: 0;
    }

    .notification-action {
      flex-shrink: 0;
      appearance: none;
      border: 1px solid currentColor;
      background: transparent;
      color: inherit;
      font: inherit;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 999px;
      cursor: pointer;
      opacity: 0.95;
      transition: background-color 120ms ease, opacity 120ms ease;
    }

    .notification-action:hover {
      background: rgba(255, 255, 255, 0.18);
      opacity: 1;
    }

    .notification-dismiss {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      appearance: none;
      border: none;
      background: transparent;
      color: inherit;
      cursor: pointer;
      padding: 2px;
      opacity: 0.7;
      transition: opacity 120ms ease;
    }

    .notification-dismiss svg {
      width: 1em;
      height: 1em;
    }

    .notification-dismiss:hover {
      opacity: 1;
    }

    @keyframes notif-in {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes notif-out {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-8px); }
    }

    @media (prefers-reduced-motion: reduce) {
      .notification,
      .notification.is-dismissing {
        animation-duration: 1ms;
      }
    }
  `
}
