import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { fixture, html } from '@open-wc/testing'
import { AudioDnSettingsMenu } from '../../src/components/settings-menu'

const mockDownload = vi.fn()

vi.mock('../../src/lib/api', () => ({
  getPlaySessionTrackVariantDownload: (...args: unknown[]) => mockDownload(...args),
}))

describe('AudioDnSettingsMenu', () => {
  let element: AudioDnSettingsMenu

  const baseVariant: any = {
    id: 'v-hq',
    props: {
      codec: 'mp3',
      bitrate: 320,
    },
    size: 5_000_000,
    variant: {
      index: 'hq',
    },
  }

  const secondVariant: any = {
    id: 'v-lq',
    props: {
      codec: 'mp3',
      bitrate: 128,
    },
    size: 2_000_000,
    variant: {
      index: 'lq',
    },
  }

  beforeEach(async () => {
    mockDownload.mockReset()
    element = await fixture(html`
      <audiodn-settings-menu
        play-session-id="sess-123"
        track-id="track-1"
        .variants=${[baseVariant]}
        .variant=${baseVariant}
        download
      ></audiodn-settings-menu>
    `) as AudioDnSettingsMenu
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Download button', () => {
    it('renders a download button when download is enabled', async () => {
      await element.updateComplete

      const buttons = element.shadowRoot?.querySelectorAll('li button[name=download]') ?? []
      expect(buttons.length).toBe(1)

      const ariaLabel = (buttons[0] as HTMLButtonElement).getAttribute('aria-label') ?? ''
      expect(ariaLabel).toContain('Download')
    })

    it('does not render a download button when download is disabled', async () => {
      const el = await fixture(html`
        <audiodn-settings-menu
          play-session-id="sess-123"
          track-id="track-1"
          .variants=${[baseVariant]}
          .variant=${baseVariant}
        ></audiodn-settings-menu>
      `) as AudioDnSettingsMenu

      await el.updateComplete
      const buttons = el.shadowRoot?.querySelectorAll('li button[name=download]') ?? []
      expect(buttons.length).toBe(0)
    })

    it('fetches a signed URL and triggers the download on success', async () => {
      let clickedHref: string | null = null
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        clickedHref = this.href
      })

      mockDownload.mockResolvedValue({
        ok: true,
        play_session_id: 'sess-123',
        track_id: 'track-1',
        download: { variant: 'hq', url: 'https://cdn.test/dl/track-one-hq.mp3' },
      })

      const errorSpy = vi.fn()
      element.addEventListener('adni-download-error', errorSpy)

      await element.handleDownload('hq')

      expect(mockDownload).toHaveBeenCalledWith('sess-123', 'track-1', 'hq', 'en')
      expect(clickedHref).toBe('https://cdn.test/dl/track-one-hq.mp3')
      expect(errorSpy).not.toHaveBeenCalled()
    })

    it('dispatches adni-download-error when the download is refused', async () => {
      mockDownload.mockRejectedValue(new Error('Download is not allowed for this play session'))

      const errorSpy = vi.fn()
      element.addEventListener('adni-download-error', errorSpy)

      await element.handleDownload('hq')

      expect(errorSpy).toHaveBeenCalledTimes(1)
      const event = errorSpy.mock.calls[0][0] as CustomEvent
      expect(event.detail.variant).toBe('hq')
      expect(event.bubbles).toBe(true)
      expect(event.composed).toBe(true)
    })
  })

  describe('Cog visibility', () => {
    const mount = (props: { variants: any[], download?: boolean }) => fixture(html`
      <audiodn-settings-menu
        play-session-id="sess-123"
        track-id="track-1"
        .variants=${props.variants}
        .variant=${props.variants[0]}
        ?download=${props.download ?? false}
      ></audiodn-settings-menu>
    `) as Promise<AudioDnSettingsMenu>

    it('hides the cog when there is a single variant and no download', async () => {
      const el = await mount({ variants: [baseVariant], download: false })
      await el.updateComplete

      expect(el.hasMenu).toBe(false)
      expect(el.hasAttribute('hidden')).toBe(true)
      expect(el.shadowRoot?.querySelector('[name=toggle]')).toBeNull()
    })

    it('hides the cog when there are no variants', async () => {
      const el = await mount({ variants: [], download: true })
      await el.updateComplete

      expect(el.hasMenu).toBe(false)
      expect(el.hasAttribute('hidden')).toBe(true)
    })

    it('shows the cog for a single variant when download is enabled', async () => {
      const el = await mount({ variants: [baseVariant], download: true })
      await el.updateComplete

      expect(el.hasMenu).toBe(true)
      expect(el.hasAttribute('hidden')).toBe(false)
      expect(el.shadowRoot?.querySelector('[name=toggle]')).not.toBeNull()
    })

    it('shows the cog when there is more than one variant, even without download', async () => {
      const el = await mount({ variants: [baseVariant, secondVariant], download: false })
      await el.updateComplete

      expect(el.hasMenu).toBe(true)
      expect(el.hasAttribute('hidden')).toBe(false)
      expect(el.shadowRoot?.querySelector('[name=toggle]')).not.toBeNull()
    })

    it('ignores sparse holes when counting variants', async () => {
      const sparse: any[] = []
      sparse[2] = baseVariant

      const el = await mount({ variants: sparse, download: false })
      await el.updateComplete

      expect(el.hasMenu).toBe(false)
      expect(el.hasAttribute('hidden')).toBe(true)
    })
  })
})
