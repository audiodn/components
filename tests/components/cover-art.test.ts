import { describe, expect, it, beforeEach } from 'vitest'
import { fixture, html } from '@open-wc/testing'
import '../../src/components/cover-art.ts'
import type { AudioDnCoverArt } from '../../src/components/cover-art.ts'

describe('AudioDnCoverArt', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders a placeholder when coverImage is missing', async () => {
    const el = await fixture<AudioDnCoverArt>(html`<audiodn-cover-art size="large"></audiodn-cover-art>`)
    await el.updateComplete
    expect(el.shadowRoot?.querySelector('img')).toBeNull()
    expect(el.shadowRoot?.querySelector('.placeholder')).to.exist
  })

  it('renders a placeholder for nullish Cloudflare URLs', async () => {
    const el = await fixture<AudioDnCoverArt>(html`
      <audiodn-cover-art
        size="large"
        .coverImage=${{
          large: { url: 'https://imagedelivery.net/hash/null/large', width: 800, height: 800, type: 'large' },
        }}
      ></audiodn-cover-art>
    `)
    await el.updateComplete
    expect(el.shadowRoot?.querySelector('img')).toBeNull()
    expect(el.shadowRoot?.querySelector('.placeholder')).to.exist
  })

  it('renders an image when a usable URL is present', async () => {
    const el = await fixture<AudioDnCoverArt>(html`
      <audiodn-cover-art
        size="regular"
        .coverImage=${{
          regular: { url: 'https://cdn.test/cover.jpg', width: 400, height: 400, type: 'regular' },
        }}
      ></audiodn-cover-art>
    `)
    await el.updateComplete
    const img = el.shadowRoot?.querySelector('img')
    expect(img).to.exist
    expect(img?.getAttribute('src')).toBe('https://cdn.test/cover.jpg')
  })

  it('falls back to another size when the requested size is missing', async () => {
    const el = await fixture<AudioDnCoverArt>(html`
      <audiodn-cover-art
        size="regular"
        .coverImage=${{
          large: { url: 'https://cdn.test/large.jpg', width: 800, height: 800, type: 'large' },
        }}
      ></audiodn-cover-art>
    `)
    await el.updateComplete
    expect(el.shadowRoot?.querySelector('img')?.getAttribute('src')).toBe('https://cdn.test/large.jpg')
  })
})
