import type { PlaySession } from './session.ts'

export interface Track {
  id: string
  coverImagePrefix: string | null
  index: string
  duration: number
  info: null | Record<string, unknown>
  organizationIndex: null | string
  order: number
  metadata: null | Record<string, unknown>
  playerTitle: string
  playerSubtitle: string
  playerColor: string
  playerColorLight: string | null
  playerColorDark: string | null
  fileName: string
  isDark: boolean
  theme: ImageColor[]
}

export type ImageColor = {
  hex: string
  hue: number
  red: number
  area: number
  blue: number
  green: number
  active: boolean
  intensity: number
  lightness: number
  saturation: number
}

export type TrackVariantPreview = {
  duration: number
  offsetEnd: number
  offsetStart: number
}

export interface TrackVariant {
  id: string
  url: string
  data: null | {
    duration: number
    extension: string
    captureEnd: number
    contentType: string
    captureStart: number
  }
  preview: TrackVariantPreview
  isPreview: boolean
  path: string
  size: number
  props: variantProp
  variant: {
    id: string;
    index: string;
    variantType: {
      id: string;
      title: string;
      viewerId: string;
    };
  };
  fileName: string
  isPublic: boolean
  contentType: string
}

export type variantProp = {
  codec: string
  bitrate: number
  isStereo: boolean
  isStripTags: boolean
  isStripCover: boolean
}

export interface TrackLevels {
  avg: number
  max: number
  min: number
  levels: number[]
  metric: string
  resample: number
  numSamples: number
}

export type CoverImageSize = {
  height: number
  type: string
  url: string
  width: number
}

export type CoverImage = {
  icon?: CoverImageSize
  large?: CoverImageSize
  regular?: CoverImageSize
  small?: CoverImageSize
}

export interface TrackData {
  ok: boolean
  playSessionId: string
  trackId: string
  playSession: PlaySession
  track: Track
  levels: TrackLevels
  variants: TrackVariant[]
  coverImage?: CoverImage
}

/** True when a cover size entry has a usable delivery URL. */
export function isUsableCoverImageSize (data: unknown): data is CoverImageSize {
  if (!data || typeof data !== 'object') return false
  const url = (data as CoverImageSize).url
  if (typeof url !== 'string' || !url.trim()) return false
  // API historically emitted Cloudflare URLs with a literal "null"/"undefined" id
  // when no cover existed — treat those as missing.
  if (/\/(null|undefined)(?:\/|$)/i.test(url)) return false
  return true
}

/**
 * Normalize an API cover_image payload into a sparse CoverImage, or undefined
 * when no usable size is present.
 */
export function normalizeCoverImage (raw: unknown): CoverImage | undefined {
  if (!raw || typeof raw !== 'object') return undefined

  const source = raw as Record<string, unknown>
  const out: CoverImage = {}
  let any = false

  for (const key of ['icon', 'small', 'regular', 'large'] as const) {
    const entry = source[key]
    if (!isUsableCoverImageSize(entry)) continue
    out[key] = {
      height: Number(entry.height) || 0,
      type: String(entry.type || ''),
      url: entry.url.trim(),
      width: Number(entry.width) || 0,
    }
    any = true
  }

  return any ? out : undefined
}
