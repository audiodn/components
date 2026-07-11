import { describe, it, expect } from 'vitest'
import { t, resolveLocale, catalogs, LOCALES, DEFAULT_LOCALE } from '../../src/lib/i18n'

describe('resolveLocale', () => {
  it('returns supported locales unchanged', () => {
    expect(resolveLocale('en')).toBe('en')
    expect(resolveLocale('fr')).toBe('fr')
    expect(resolveLocale('es')).toBe('es')
    expect(resolveLocale('de')).toBe('de')
  })

  it('is case-insensitive', () => {
    expect(resolveLocale('FR')).toBe('fr')
    expect(resolveLocale('De')).toBe('de')
  })

  it('strips region subtags', () => {
    expect(resolveLocale('fr-FR')).toBe('fr')
    expect(resolveLocale('es-419')).toBe('es')
    expect(resolveLocale('de-AT')).toBe('de')
  })

  it('falls back to the default locale for unknown or empty input', () => {
    expect(resolveLocale('it')).toBe(DEFAULT_LOCALE)
    expect(resolveLocale('')).toBe(DEFAULT_LOCALE)
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE)
    expect(resolveLocale(null)).toBe(DEFAULT_LOCALE)
  })

  it('defaults to English', () => {
    expect(DEFAULT_LOCALE).toBe('en')
  })
})

describe('t', () => {
  it('translates a static key per locale', () => {
    expect(t('en', 'action.retry')).toBe('Retry')
    expect(t('fr', 'action.retry')).toBe('Réessayer')
    expect(t('es', 'action.retry')).toBe('Reintentar')
    expect(t('de', 'action.retry')).toBe('Wiederholen')
  })

  it('interpolates named placeholders', () => {
    expect(t('en', 'uploader.notify.uploadSuccess', { filename: 'song.mp3' }))
      .toBe('song.mp3 uploaded successfully')
    expect(t('de', 'player.status.nowPlaying', { title: 'My Track' }))
      .toBe('Wird abgespielt: My Track')
  })

  it('interpolates numeric params and repeated placeholders', () => {
    expect(t('en', 'uploader.totalProgressText', { percent: 42 })).toBe('42% total')
  })

  it('passes through server error text via the {error} placeholder', () => {
    const serverError = 'Storage quota exceeded'
    expect(t('fr', 'uploader.notify.uploadFailedDetail', { filename: 'a.wav', error: serverError }))
      .toBe('a.wav : Storage quota exceeded')
  })

  it('falls back to English for an unsupported locale', () => {
    expect(t('it', 'action.retry')).toBe('Retry')
    expect(t(undefined, 'action.retry')).toBe('Retry')
  })

  it('resolves region subtags before lookup', () => {
    expect(t('fr-CA', 'volume.aria')).toBe('Volume')
    expect(t('de-CH', 'settings.aria')).toBe('Einstellungen')
  })

  it('has complete catalogs for every locale (no missing/empty keys)', () => {
    const englishKeys = Object.keys(catalogs.en).sort()

    for (const locale of LOCALES) {
      const localeKeys = Object.keys(catalogs[locale]).sort()
      expect(localeKeys).toEqual(englishKeys)

      for (const key of localeKeys) {
        const value = catalogs[locale][key as keyof typeof catalogs.en]
        expect(value.length).toBeGreaterThan(0)
      }
    }
  })
})
