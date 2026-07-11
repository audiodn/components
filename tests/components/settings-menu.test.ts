import { describe, it, expect, beforeEach } from 'vitest'
import { fixture, html } from '@open-wc/testing'
import { AudioDnSettingsMenu } from '../../src/components/settings-menu'

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

  beforeEach(async () => {
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

  describe('Download links', () => {
    it('renders a download link when download is enabled', async () => {
      await element.updateComplete

      const links = element.shadowRoot?.querySelectorAll('li a') ?? []
      expect(links.length).toBe(1)

      const href = (links[0] as HTMLAnchorElement).getAttribute('href') ?? ''
      expect(href).toContain('/v1/play/sess-123/track-1/hq/download')

      const ariaLabel = (links[0] as HTMLAnchorElement).getAttribute('aria-label') ?? ''
      expect(ariaLabel).toContain('Download')
    })

    it('does not render download links when download is disabled', async () => {
      const el = await fixture(html`
        <audiodn-settings-menu
          play-session-id="sess-123"
          track-id="track-1"
          .variants=${[baseVariant]}
          .variant=${baseVariant}
        ></audiodn-settings-menu>
      `) as AudioDnSettingsMenu

      await el.updateComplete
      const links = el.shadowRoot?.querySelectorAll('li a') ?? []
      expect(links.length).toBe(0)
    })
  })
})

