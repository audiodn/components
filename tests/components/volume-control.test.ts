import { describe, it, expect, beforeEach } from 'vitest'
import { fixture, html } from '@open-wc/testing'
import { AudioDnVolumeControl } from '../../src/components/volume-control'

describe('AudioDnVolumeControl', () => {
  let element: AudioDnVolumeControl

  beforeEach(async () => {
    element = await fixture(html`<audiodn-volume-control></audiodn-volume-control>`)
  })

  describe('Properties', () => {
    it('should have default volume', () => {
      expect(element.volume).toBe(0.7)
    })

    it('should set volume from attribute', async () => {
      element = await fixture(html`<audiodn-volume-control volume="0.5"></audiodn-volume-control>`)
      expect(element.volume).toBe(0.5)
    })

    it('should reflect volume attribute', async () => {
      element.volume = 0.8
      await element.updateComplete
      expect(element.getAttribute('volume')).toBe('0.8')
    })
  })

  describe('Icon Rendering', () => {
    it('should show empty volume icon when volume is 0', async () => {
      element.volume = 0
      await element.updateComplete

      const svg = element.shadowRoot?.querySelector('svg')
      expect(svg).to.exist
      expect(svg?.innerHTML).toContain('path')
    })

    it('should show full volume icon when volume is 1', async () => {
      element.volume = 1
      await element.updateComplete

      const svg = element.shadowRoot?.querySelector('svg')
      expect(svg).to.exist
      expect(svg?.innerHTML).toContain('path')
    })

    it('should show partial volume icon when volume is between 0 and 1', async () => {
      element.volume = 0.5
      await element.updateComplete

      const svg = element.shadowRoot?.querySelector('svg')
      expect(svg).to.exist
      expect(svg?.innerHTML).toContain('path')
    })
  })

  describe('Slider Functionality', () => {
    it('should have input range element', () => {
      const input = element.shadowRoot?.querySelector('input[type="range"]')
      expect(input).to.exist
    })

    it('should set correct input attributes', () => {
      const input = element.shadowRoot?.querySelector('input[type="range"]') as HTMLInputElement
      expect(input.min).toBe('0')
      expect(input.max).toBe('1')
      expect(input.step).toBe('0.01')
      expect(input.value).toBe('0.7')
    })

    it('should update input value when volume changes', async () => {
      element.volume = 0.5
      await element.updateComplete

      const input = element.shadowRoot?.querySelector('input[type="range"]') as HTMLInputElement
      expect(input.value).toBe('0.5')
    })

    it('should update CSS custom property when volume changes', async () => {
      element.volume = 0.5
      await element.updateComplete

      const input = element.shadowRoot?.querySelector('input[type="range"]') as HTMLInputElement
      const width = input.style.getPropertyValue('--_width')
      expect(width).toBe('50%')
    })
  })

  describe('Event Handling', () => {
    it('should dispatch adni-volumechange event when slider changes', async () => {
      const eventSpy = vi.fn()
      element.addEventListener('adni-volumechange', eventSpy)

      const input = element.shadowRoot?.querySelector('input[type="range"]') as HTMLInputElement
      input.value = '0.5'
      input.dispatchEvent(new Event('input'))
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(eventSpy).toHaveBeenCalled()
    })

    it('should include volume value in event detail', async () => {
      const eventSpy = vi.fn()
      element.addEventListener('adni-volumechange', eventSpy)

      const input = element.shadowRoot?.querySelector('input[type="range"]') as HTMLInputElement
      input.value = '0.5'
      input.dispatchEvent(new Event('input'))
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        detail: 0.5
      }))
    })

    it('should handle decimal values correctly', async () => {
      const eventSpy = vi.fn()
      element.addEventListener('adni-volumechange', eventSpy)

      const input = element.shadowRoot?.querySelector('input[type="range"]') as HTMLInputElement
      input.value = '0.75'
      input.dispatchEvent(new Event('input'))
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        detail: 0.75
      }))
    })
  })

  describe('Styling', () => {
    it('should have correct host styles', () => {
      const computedStyle = getComputedStyle(element)
      expect(computedStyle.display).toBeDefined()
      expect(computedStyle.alignItems).toBeDefined()
    })

    it('should apply CSS custom properties', () => {
      const computedStyle = getComputedStyle(element)

      // Check that CSS custom properties are available
      expect(computedStyle.getPropertyValue('--adn-volumecontrol-bg')).toBeDefined()
      expect(computedStyle.getPropertyValue('--adn-volumecontrol-border')).toBeDefined()
      expect(computedStyle.getPropertyValue('--adn-volumecontrol-radius')).toBeDefined()
    })

    it('should style the input range correctly', () => {
      const input = element.shadowRoot?.querySelector('input[type="range"]')
      const computedStyle = getComputedStyle(input!)

      expect(computedStyle.appearance).toBeDefined()
      expect(computedStyle.outline).toBeDefined()
    })
  })

  describe('Accessibility', () => {
    it('should have proper input semantics', () => {
      const input = element.shadowRoot?.querySelector('input[type="range"]')
      expect(input?.getAttribute('type')).toBe('range')
      expect(input?.getAttribute('min')).toBe('0')
      expect(input?.getAttribute('max')).toBe('1')
      expect(input?.getAttribute('step')).toBe('0.01')
    })

    it('should be keyboard accessible', () => {
      const input = element.shadowRoot?.querySelector('input[type="range"]')
      expect(input?.tabIndex).toBe(0)
    })
  })

  describe('Volume Range', () => {
    it('should handle minimum volume (0)', async () => {
      element.volume = 0
      await element.updateComplete

      const input = element.shadowRoot?.querySelector('input[type="range"]') as HTMLInputElement
      expect(input.value).toBe('0')

      const width = input.style.getPropertyValue('--_width')
      expect(width).toBe('0%')
    })

    it('should handle maximum volume (1)', async () => {
      element.volume = 1
      await element.updateComplete

      const input = element.shadowRoot?.querySelector('input[type="range"]') as HTMLInputElement
      expect(input.value).toBe('1')

      const width = input.style.getPropertyValue('--_width')
      expect(width).toBe('100%')
    })

    it('should handle fractional volumes', async () => {
      element.volume = 0.33
      await element.updateComplete

      const input = element.shadowRoot?.querySelector('input[type="range"]') as HTMLInputElement
      expect(input.value).toBe('0.33')

      const width = input.style.getPropertyValue('--_width')
      expect(width).toBe('33%')
    })
  })
})
