import { describe, expect, it } from 'vitest'
import { isUsableCoverImageSize, normalizeCoverImage } from '../../src/lib/track.ts'

describe('normalizeCoverImage', () => {
  it('returns undefined for null/empty payloads', () => {
    expect(normalizeCoverImage(null)).toBeUndefined()
    expect(normalizeCoverImage(undefined)).toBeUndefined()
    expect(normalizeCoverImage({})).toBeUndefined()
  })

  it('strips sizes with empty or nullish Cloudflare URLs', () => {
    expect(normalizeCoverImage({
      large: { url: 'https://imagedelivery.net/hash/null/large', width: 800, height: 800, type: 'large' },
      regular: { url: '', width: 400, height: 400, type: 'regular' },
    })).toBeUndefined()
  })

  it('keeps usable sizes', () => {
    const result = normalizeCoverImage({
      large: {
        url: 'https://imagedelivery.net/hash/abc/large',
        width: 800,
        height: 800,
        type: 'large',
      },
      small: { url: '   ', width: 200, height: 200, type: 'small' },
    })
    expect(result).toEqual({
      large: {
        url: 'https://imagedelivery.net/hash/abc/large',
        width: 800,
        height: 800,
        type: 'large',
      },
    })
  })
})

describe('isUsableCoverImageSize', () => {
  it('rejects undefined and nullish ids in the path', () => {
    expect(isUsableCoverImageSize(undefined)).toBe(false)
    expect(isUsableCoverImageSize({ url: 'https://x/undefined/icon' })).toBe(false)
    expect(isUsableCoverImageSize({ url: 'https://x/abc/icon' })).toBe(true)
  })
})
