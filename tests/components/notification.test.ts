import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fixture, html } from '@open-wc/testing'
import { AudioDnNotification } from '../../src/components/notification'

describe('AudioDnNotification', () => {
  let element: AudioDnNotification

  beforeEach(async () => {
    element = await fixture(html`<audiodn-notification duration="5000"></audiodn-notification>`)
  })

  function items () {
    return element.shadowRoot?.querySelectorAll('.notification') ?? []
  }

  function messages () {
    return Array.from(element.shadowRoot?.querySelectorAll('.notification-message') ?? [])
      .map(n => n.textContent?.trim())
  }

  describe('Rendering & roles', () => {
    it('renders nothing when empty', () => {
      expect(element.shadowRoot?.querySelector('.notification-stack')).toBeNull()
    })

    it('renders the message and an assertive alert role for errors', async () => {
      element.add('error', 'Something broke')
      await element.updateComplete
      const item = element.shadowRoot?.querySelector('.notification')
      expect(item?.getAttribute('role')).toBe('alert')
      expect(item?.getAttribute('aria-live')).toBe('assertive')
      expect(item?.querySelector('.notification-message')?.textContent?.trim()).toBe('Something broke')
    })

    it('uses a polite status role for info/success', async () => {
      element.add('success', 'Saved')
      await element.updateComplete
      const item = element.shadowRoot?.querySelector('.notification')
      expect(item?.getAttribute('role')).toBe('status')
      expect(item?.getAttribute('aria-live')).toBe('polite')
    })

    it('shows newest notifications first', async () => {
      element.add('info', 'first')
      element.add('info', 'second')
      await element.updateComplete
      expect(messages()).toEqual(['second', 'first'])
    })
  })

  describe('Auto-dismiss', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('auto-dismisses transient info/success after the duration', async () => {
      element.add('success', 'Saved')
      await element.updateComplete
      expect(items().length).toBe(1)

      vi.advanceTimersByTime(5000) // duration
      vi.advanceTimersByTime(200) // exit animation
      await element.updateComplete
      expect(items().length).toBe(0)
    })

    it('keeps errors and warnings until dismissed', async () => {
      element.add('error', 'persistent')
      await element.updateComplete
      vi.advanceTimersByTime(60_000)
      await element.updateComplete
      expect(items().length).toBe(1)
    })

    it('honours an explicit duration override', async () => {
      element.add('error', 'temporary error', { duration: 1000 })
      await element.updateComplete
      expect(items().length).toBe(1)

      vi.advanceTimersByTime(1000)
      vi.advanceTimersByTime(200)
      await element.updateComplete
      expect(items().length).toBe(0)
    })
  })

  describe('De-duplication & capping', () => {
    it('refreshes an existing identical toast instead of stacking', async () => {
      element.add('error', 'same message')
      element.add('error', 'same message')
      await element.updateComplete
      expect(items().length).toBe(1)
    })

    it('caps the visible stack at 4', async () => {
      for (let i = 0; i < 7; i++) element.add('info', `msg ${i}`)
      await element.updateComplete
      expect(items().length).toBe(4)
      // Oldest are dropped; newest-first ordering keeps the last 4.
      expect(messages()).toEqual(['msg 6', 'msg 5', 'msg 4', 'msg 3'])
    })
  })

  describe('Actions', () => {
    it('runs the action callback and dismisses on click', async () => {
      const onClick = vi.fn()
      element.add('error', 'retryable', { action: { label: 'Retry', onClick } })
      await element.updateComplete

      const button = element.shadowRoot?.querySelector('.notification-action') as HTMLButtonElement
      expect(button?.textContent?.trim()).toBe('Retry')
      button.click()
      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('clear', () => {
    it('removes all notifications', async () => {
      element.add('error', 'a')
      element.add('error', 'b')
      await element.updateComplete
      expect(items().length).toBe(2)

      element.clear()
      await element.updateComplete
      expect(items().length).toBe(0)
    })
  })

  describe('Dismiss button', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('dismisses when the close button is clicked', async () => {
      element.add('error', 'closable')
      await element.updateComplete
      const dismiss = element.shadowRoot?.querySelector('.notification-dismiss') as HTMLButtonElement
      dismiss.click()
      vi.advanceTimersByTime(200)
      await element.updateComplete
      expect(items().length).toBe(0)
    })
  })
})
