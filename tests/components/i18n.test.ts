import { describe, it, expect, beforeEach } from 'vitest'
import { fixture, html } from '@open-wc/testing'
import { AudioDnPlayButton } from '../../src/components/play-button'
import { AudioDnTrackTitle } from '../../src/components/track-title'
import { AudioDnVolumeControl } from '../../src/components/volume-control'
import { AudioDnNotification } from '../../src/components/notification'
import { AudiodnUploader } from '../../src/uploader'

describe('i18n — play-button aria labels', () => {
  it('localizes the play/pause/retry/loading labels', async () => {
    const el: AudioDnPlayButton = await fixture(
      html`<audiodn-play-button locale="fr"></audiodn-play-button>`
    )

    expect(el.getLabel()).toBe('Lecture')

    el.state = 'playing'
    await el.updateComplete
    expect(el.getLabel()).toBe('Pause')

    el.state = 'error'
    await el.updateComplete
    expect(el.getLabel()).toBe('Réessayer')

    el.state = 'paused'
    el.buffering = true
    await el.updateComplete
    expect(el.getLabel()).toBe('Chargement')
  })

  it('renders the aria-label in the DOM per locale', async () => {
    const de: AudioDnPlayButton = await fixture(
      html`<audiodn-play-button locale="de"></audiodn-play-button>`
    )
    expect(de.shadowRoot?.querySelector('button')?.getAttribute('aria-label')).toBe('Abspielen')
  })

  it('falls back to English for an unsupported locale', async () => {
    const el: AudioDnPlayButton = await fixture(
      html`<audiodn-play-button locale="it"></audiodn-play-button>`
    )
    expect(el.getLabel()).toBe('Play')
  })
})

describe('i18n — track-title fallback', () => {
  it('localizes the empty-state aria label', async () => {
    const el: AudioDnTrackTitle = await fixture(
      html`<audiodn-track-title locale="es"></audiodn-track-title>`
    )
    await el.updateComplete
    const title = el.shadowRoot?.querySelector('.track-title')
    expect(title?.getAttribute('aria-label')).toBe('Ninguna pista seleccionada')
  })
})

describe('i18n — volume-control', () => {
  it('localizes the volume aria label', async () => {
    const el: AudioDnVolumeControl = await fixture(
      html`<audiodn-volume-control locale="de"></audiodn-volume-control>`
    )
    await el.updateComplete
    const input = el.shadowRoot?.querySelector('input')
    expect(input?.getAttribute('aria-label')).toBe('Lautstärke')
  })
})

describe('i18n — notification', () => {
  it('localizes the dismiss button but shows the message verbatim', async () => {
    const el: AudioDnNotification = await fixture(
      html`<audiodn-notification locale="fr"></audiodn-notification>`
    )
    // A server error message passed through in a non-matching language.
    const serverMessage = 'Storage quota exceeded (E_QUOTA)'
    el.add('error', serverMessage)
    await el.updateComplete

    const message = el.shadowRoot?.querySelector('.notification-message')
    expect(message?.textContent?.trim()).toBe(serverMessage)

    const dismiss = el.shadowRoot?.querySelector('.notification-dismiss')
    expect(dismiss?.getAttribute('aria-label')).toBe('Ignorer la notification')
  })
})

describe('i18n — uploader', () => {
  let el: AudiodnUploader

  beforeEach(async () => {
    // No api-key / session id: loadSession short-circuits without network.
    el = await fixture(html`<audiodn-uploader locale="fr"></audiodn-uploader>`)
    el.isLoading = false
    el.error = undefined
    await el.updateComplete
  })

  it('localizes the drop zone chrome', async () => {
    const heading = el.shadowRoot?.querySelector('.uploader-upload-title')
    expect(heading?.textContent?.trim()).toBe('Déposez des pistes audio dans la collection')

    const browse = el.shadowRoot?.querySelector('.uploader-browse-button')
    expect(browse?.textContent?.trim()).toBe('Parcourir les fichiers')

    const divider = el.shadowRoot?.querySelector('.uploader-divider span')
    expect(divider?.textContent?.trim()).toBe('ou')

    const region = el.shadowRoot?.querySelector('.uploader-upload-container')
    expect(region?.getAttribute('aria-label')).toBe('Zone de téléversement de fichiers')
  })

  it('shows server error text verbatim while localizing the retry button', async () => {
    const serverError = 'Collection is read-only (server said so)'
    el.error = serverError
    await el.updateComplete

    const text = el.shadowRoot?.querySelector('.uploader-error-text')
    expect(text?.textContent?.trim()).toBe(serverError)

    const button = el.shadowRoot?.querySelector('.uploader-error-state .uploader-browse-button')
    expect(button?.textContent?.trim()).toBe('Réessayer')
  })

  it('localizes the loading skeleton', async () => {
    el.isLoading = true
    el.error = undefined
    await el.updateComplete

    const skeleton = el.shadowRoot?.querySelector('.uploader-skeleton')
    expect(skeleton?.getAttribute('aria-label')).toBe('Chargement du téléverseur')
  })
})
