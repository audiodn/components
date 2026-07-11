import type { PlaySession } from './session.ts'

export interface Track {
  id: string
  coverImagePrefix: string
  index: string
  duration: number
  info: null | Record<string, unknown>
  organizationIndex: null | string
  order: number
  metadata: null | Record<string, unknown>
  playerTitle: string
  playerSubtitle: string
  playerColor: string
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

export interface TrackData {
  ok: boolean
  playSessionId: string
  trackId: string
  playSession: PlaySession
  track: Track
  levels: TrackLevels
  variants: TrackVariant[]
  coverImage: {
    icon: CoverImageSize
    large: CoverImageSize
    regular: CoverImageSize
    small: CoverImageSize
  }
}

export type CoverImage = {
  icon: CoverImageSize
  large: CoverImageSize
  regular: CoverImageSize
  small: CoverImageSize
}

export type CoverImageSize = {
  height: number
  type: string
  url: string
  width: number
}
