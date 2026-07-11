import { describe, it, expect } from 'vitest'
import {
  iconPlay,
  iconPause,
  iconSetting,
  iconVolumeEmpty,
  iconVolumePartial,
  iconVolumeFull,
  iconDownload,
  iconCloudUpload
} from '../../src/lib/constants'

describe('Constants', () => {
  describe('Play/Pause Icons', () => {
    it('should have play icon defined', () => {
      expect(iconPlay).toBeDefined()
      expect(typeof iconPlay).toBe('object')
      expect(iconPlay.strings[0]).toContain('<svg')
      expect(iconPlay.strings[0]).toContain('viewBox="0 0 24 24"')
      expect(iconPlay.strings[0]).toContain('fill="currentColor"')
    })

    it('should have pause icon defined', () => {
      expect(iconPause).toBeDefined()
      expect(typeof iconPause).toBe('object')
      expect(iconPause.strings[0]).toContain('<svg')
      expect(iconPause.strings[0]).toContain('viewBox="0 0 24 24"')
      expect(iconPause.strings[0]).toContain('fill="currentColor"')
    })

    it('should have different content for play and pause icons', () => {
      expect(iconPlay.strings[0]).not.toEqual(iconPause.strings[0])
    })
  })

  describe('Volume Icons', () => {
    it('should have volume empty icon defined', () => {
      expect(iconVolumeEmpty).toBeDefined()
      expect(typeof iconVolumeEmpty).toBe('object')
      expect(iconVolumeEmpty.strings[0]).toContain('<svg')
      expect(iconVolumeEmpty.strings[0]).toContain('viewBox="0 0 512 512"')
      expect(iconVolumeEmpty.strings[0]).toContain('fill="currentColor"')
    })

    it('should have volume partial icon defined', () => {
      expect(iconVolumePartial).toBeDefined()
      expect(typeof iconVolumePartial).toBe('object')
      expect(iconVolumePartial.strings[0]).toContain('<svg')
      expect(iconVolumePartial.strings[0]).toContain('viewBox="0 0 512 512"')
      expect(iconVolumePartial.strings[0]).toContain('fill="currentColor"')
    })

    it('should have volume full icon defined', () => {
      expect(iconVolumeFull).toBeDefined()
      expect(typeof iconVolumeFull).toBe('object')
      expect(iconVolumeFull.strings[0]).toContain('<svg')
      expect(iconVolumeFull.strings[0]).toContain('viewBox="0 0 512 512"')
      expect(iconVolumeFull.strings[0]).toContain('fill="currentColor"')
    })

    it('should have different content for volume icons', () => {
      expect(iconVolumeEmpty.strings[0]).not.toEqual(iconVolumePartial.strings[0])
      expect(iconVolumePartial.strings[0]).not.toEqual(iconVolumeFull.strings[0])
      expect(iconVolumeEmpty.strings[0]).not.toEqual(iconVolumeFull.strings[0])
    })
  })

  describe('Settings Icon', () => {
    it('should have settings icon defined', () => {
      expect(iconSetting).toBeDefined()
      expect(typeof iconSetting).toBe('object')
      expect(iconSetting.strings[0]).toContain('<svg')
      expect(iconSetting.strings[0]).toContain('viewBox="0 0 512 512"')
      expect(iconSetting.strings[0]).toContain('fill="currentColor"')
    })
  })

  describe('Download Icons', () => {
    it('should have download icon defined', () => {
      expect(iconDownload).toBeDefined()
      expect(typeof iconDownload).toBe('object')
      expect(iconDownload.strings[0]).toContain('<svg')
      expect(iconDownload.strings[0]).toContain('viewBox="0 0 512 512"')
      expect(iconDownload.strings[0]).toContain('fill="currentColor"')
    })

    it('should have cloud upload icon defined', () => {
      expect(iconCloudUpload).toBeDefined()
      expect(typeof iconCloudUpload).toBe('object')
      expect(iconCloudUpload.strings[0]).toContain('<svg')
      expect(iconCloudUpload.strings[0]).toContain('viewBox="0 0 512 512"')
      expect(iconCloudUpload.strings[0]).toContain('fill="currentColor"')
    })
  })

  describe('SVG Structure', () => {
    it('should have valid SVG structure for all icons', () => {
      const icons = [
        iconPlay,
        iconPause,
        iconSetting,
        iconVolumeEmpty,
        iconVolumePartial,
        iconVolumeFull,
        iconDownload,
        iconCloudUpload
      ]

      icons.forEach(icon => {
        expect(icon.strings[0]).toContain('xmlns="http://www.w3.org/2000/svg"')
        expect(icon.strings[0]).toContain('fill="currentColor"')
        expect(icon.strings[0]).toMatch(/<path[^>]*>/)
      })
    })

    it('should have consistent viewBox attributes', () => {
      // Play and pause icons should have 24x24 viewBox
      expect(iconPlay.strings[0]).toContain('viewBox="0 0 24 24"')
      expect(iconPause.strings[0]).toContain('viewBox="0 0 24 24"')

      // Other icons should have 512x512 viewBox
      const icons512 = [
        iconSetting,
        iconVolumeEmpty,
        iconVolumePartial,
        iconVolumeFull,
        iconDownload,
        iconCloudUpload
      ]

      icons512.forEach(icon => {
        expect(icon.strings[0]).toContain('viewBox="0 0 512 512"')
      })
    })
  })

  describe('Icon Uniqueness', () => {
    it('should have unique content for each icon', () => {
      const icons = [
        iconPlay,
        iconPause,
        iconSetting,
        iconVolumeEmpty,
        iconVolumePartial,
        iconVolumeFull,
        iconDownload,
        iconCloudUpload
      ]

      const iconStrings = icons.map(icon => icon.strings[0])

      // Check that all icons have unique content
      for (let i = 0; i < iconStrings.length; i++) {
        for (let j = i + 1; j < iconStrings.length; j++) {
          expect(iconStrings[i]).not.toEqual(iconStrings[j])
        }
      }
    })
  })
})
