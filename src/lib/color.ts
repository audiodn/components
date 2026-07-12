// color
//
// Client-side companion to the API's player_color_variants. Derives
// theme-aware, contrast-safe accent colors so the accent always reads well on
// the player/uploader background. Only HSV brightness (V) is shifted; hue and
// saturation are preserved so the color keeps its identity.

export type Rgb = { r: number, g: number, b: number }
export type Hsv = { h: number, s: number, v: number }
export type EffectiveTheme = 'light' | 'dark'

// Reference backgrounds + contrast target (WCAG non-text minimum is 3:1).
// Aligned to the component palettes (light `#f4f4f5`, dark `#000`).
const LIGHT_BG: Rgb = { r: 244, g: 244, b: 245 }
const DARK_BG: Rgb = { r: 0, g: 0, b: 0 }
const MIN_CONTRAST = 3.0
const V_STEP = 0.02

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n))

export function parseHex (hex: string | null | undefined): Rgb | null {
  if (typeof hex !== 'string') return null
  let value = hex.trim().replace(/^#/, '')
  if (value.length === 3) {
    value = value.split('').map((c) => c + c).join('')
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null
  return {
    r: parseInt(value.substring(0, 2), 16),
    g: parseInt(value.substring(2, 4), 16),
    b: parseInt(value.substring(4, 6), 16),
  }
}

export function rgbToHex ({ r, g, b }: Rgb): string {
  const toHex = (n: number): string => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function rgbToHsv ({ r, g, b }: Rgb): Hsv {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min

  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }

  const s = max === 0 ? 0 : d / max
  return { h, s, v: max }
}

export function hsvToRgb ({ h, s, v }: Hsv): Rgb {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c

  let rn = 0
  let gn = 0
  let bn = 0
  if (h < 60) {
    rn = c; gn = x; bn = 0
  } else if (h < 120) {
    rn = x; gn = c; bn = 0
  } else if (h < 180) {
    rn = 0; gn = c; bn = x
  } else if (h < 240) {
    rn = 0; gn = x; bn = c
  } else if (h < 300) {
    rn = x; gn = 0; bn = c
  } else {
    rn = c; gn = 0; bn = x
  }

  return {
    r: (rn + m) * 255,
    g: (gn + m) * 255,
    b: (bn + m) * 255,
  }
}

// WCAG relative luminance (matches the formula used in the API's is-dark).
export function relativeLuminance ({ r, g, b }: Rgb): number {
  const channels = [r / 255, g / 255, b / 255].map((col) => {
    if (col <= 0.03928) return col / 12.92
    return Math.pow((col + 0.055) / 1.055, 2.4)
  })
  return (0.2126 * channels[0]!) + (0.7152 * channels[1]!) + (0.0722 * channels[2]!)
}

export function contrastRatio (a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}

// Whether a color is dark enough that light foreground text/icons read on it.
export function isDark (hex: string | null | undefined, tolerance = 0.179): boolean {
  const rgb = parseHex(hex)
  if (!rgb) return true
  return relativeLuminance(rgb) <= tolerance
}

// Shift V in `direction` (-1 darker, +1 brighter) until the color clears
// MIN_CONTRAST against `background`, or V hits its bound.
function adjustForContrast (hsv: Hsv, background: Rgb, direction: 1 | -1): Rgb {
  let { v } = hsv
  let rgb = hsvToRgb({ ...hsv, v })
  if (contrastRatio(rgb, background) >= MIN_CONTRAST) return rgb

  for (let i = 0; i < 60; i++) {
    v = clamp(v + direction * V_STEP, 0, 1)
    rgb = hsvToRgb({ ...hsv, v })
    if (contrastRatio(rgb, background) >= MIN_CONTRAST) break
    if (v === 0 || v === 1) break
  }
  return rgb
}

/**
 * Derive both contrast-safe variants for a hex color.
 *   - light: safe to draw on a LIGHT background (darkened if needed)
 *   - dark:  safe to draw on a DARK background (brightened if needed)
 */
export function colorVariants (hex: string | null | undefined): { light: string | null, dark: string | null } {
  const rgb = parseHex(hex)
  if (!rgb) return { light: null, dark: null }

  const hsv = rgbToHsv(rgb)
  return {
    light: rgbToHex(adjustForContrast(hsv, LIGHT_BG, -1)),
    dark: rgbToHex(adjustForContrast(hsv, DARK_BG, 1)),
  }
}

/**
 * Return `hex` tinted (V-shifted) only as much as needed to clear the minimum
 * contrast ratio against the given theme's background. Colors that already read
 * well are returned unchanged.
 */
export function accentForTheme (hex: string | null | undefined, theme: EffectiveTheme): string | null {
  const rgb = parseHex(hex)
  if (!rgb) return null

  const hsv = rgbToHsv(rgb)
  const background = theme === 'light' ? LIGHT_BG : DARK_BG
  const direction: 1 | -1 = theme === 'light' ? -1 : 1
  return rgbToHex(adjustForContrast(hsv, background, direction))
}
