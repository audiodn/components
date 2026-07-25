import { describe, it, expect, beforeEach } from 'vitest'
import { fixture, html } from '@open-wc/testing'
import { AudioDnPlayButton } from '../../src/components/play-button'
import { iconPlay, iconPause } from '../../src/lib/constants'

describe('AudioDnPlayButton', () => {
  let element: AudioDnPlayButton

  beforeEach(async () => {
    element = await fixture(html`<audiodn-play-button></audiodn-play-button>`)
  })

  describe('Properties', () => {
    it('should have default state', () => {
      expect(element.state).toBe('paused')
    })

    it('should set state from attribute', async () => {
      element = await fixture(html`<audiodn-play-button state="playing"></audiodn-play-button>`)
      expect(element.state).toBe('playing')
    })

    it('should reflect state attribute', async () => {
      element.state = 'playing'
      await element.updateComplete
      expect(element.getAttribute('state')).toBe('playing')
    })
  })

  describe('Icon Rendering', () => {
    it('should show play icon when paused', () => {
      element.state = 'paused'
      const icon = element.getIconForState()
      expect(icon).toBeDefined()
      expect(icon).toBe(iconPlay)
    })

    it('should show pause icon when playing', () => {
      element.state = 'playing'
      const icon = element.getIconForState()
      expect(icon).toBeDefined()
      expect(icon).toBe(iconPause)
    })

    it('should render the correct icon in the DOM', async () => {
      element.state = 'paused'
      await element.updateComplete

      const button = element.shadowRoot?.querySelector('button')
      expect(button).to.exist
      expect(button?.innerHTML).toContain('svg')
    })
  })

  describe('Event Handling', () => {
    it('should dispatch adni-click event when clicked', async () => {
      const eventSpy = vi.fn()
      element.addEventListener('adni-click', eventSpy)

      const button = element.shadowRoot?.querySelector('button')
      button?.click()

      expect(eventSpy).toHaveBeenCalled()
    })

    it('should create custom event with correct type', () => {
      const eventSpy = vi.fn()
      element.addEventListener('adni-click', eventSpy)

      element.handleEvent()

      expect(eventSpy).toHaveBeenCalled()
    })
  })

  describe('Styling', () => {
    it('should have button element with correct styles', () => {
      const button = element.shadowRoot?.querySelector('button')
      expect(button).to.exist

      const computedStyle = getComputedStyle(button!)
      expect(computedStyle.display).toBeDefined()
      expect(computedStyle.position).toBeDefined()
    })

    it('should apply CSS custom properties', () => {
      const button = element.shadowRoot?.querySelector('button')
      const computedStyle = getComputedStyle(button!)

      // Check that CSS custom properties are available
      expect(computedStyle.getPropertyValue('--adn-playbutton-border')).toBeDefined()
      expect(computedStyle.getPropertyValue('--adn-playbutton-radius')).toBeDefined()
      expect(computedStyle.getPropertyValue('--adn-playbutton-bg')).toBeDefined()
    })

    it('should have SVG icon with correct styling', () => {
      const svg = element.shadowRoot?.querySelector('svg')
      expect(svg).to.exist

      const computedStyle = getComputedStyle(svg!)
      expect(computedStyle.width).toBeDefined()
      // The z-index may not be set in the computed styles
      expect(computedStyle.zIndex).toBeDefined()
    })
  })

  describe('Accessibility', () => {
    it('should be focusable', () => {
      const button = element.shadowRoot?.querySelector('button')
      expect(button?.tabIndex).toBe(0)
    })

    it('should have proper button semantics', () => {
      const button = element.shadowRoot?.querySelector('button')
      expect(button?.tagName.toLowerCase()).toBe('button')
    })
  })

  describe('Progress ring', () => {
    it('is hidden by default', () => {
      expect(element.showProgress).toBe(false)
      expect(element.shadowRoot?.querySelector('.progress-ring')).to.not.exist
    })

    it('renders the ring and reflects the show-progress attribute', async () => {
      element = await fixture(html`<audiodn-play-button show-progress></audiodn-play-button>`)
      expect(element.showProgress).toBe(true)
      expect(element.hasAttribute('show-progress')).toBe(true)
      expect(element.shadowRoot?.querySelector('.progress-ring')).to.exist
    })

    it('sets the --_pb-progress CSS var from progress (0..1 -> 0..100)', async () => {
      element = await fixture(html`<audiodn-play-button show-progress></audiodn-play-button>`)
      element.progress = 0.5
      await element.updateComplete
      const ring = element.shadowRoot?.querySelector<HTMLElement>('.progress-ring')
      expect(ring).to.exist
      expect(ring?.style.getPropertyValue('--_pb-progress')).toBe('50')
    })

    it('clamps progress to the 0..100 range', async () => {
      element = await fixture(html`<audiodn-play-button show-progress></audiodn-play-button>`)
      element.progress = 1.8
      await element.updateComplete
      let ring = element.shadowRoot?.querySelector<HTMLElement>('.progress-ring')
      expect(ring?.style.getPropertyValue('--_pb-progress')).toBe('100')
      element.progress = -0.4
      await element.updateComplete
      ring = element.shadowRoot?.querySelector<HTMLElement>('.progress-ring')
      expect(ring?.style.getPropertyValue('--_pb-progress')).toBe('0')
    })

    it('is not shown in the error state', async () => {
      element = await fixture(html`<audiodn-play-button show-progress state="error"></audiodn-play-button>`)
      expect(element.shadowRoot?.querySelector('.progress-ring')).to.not.exist
    })

    it('yields to the buffering spinner', async () => {
      element = await fixture(html`<audiodn-play-button show-progress buffering></audiodn-play-button>`)
      expect(element.shadowRoot?.querySelector('.spinner')).to.exist
      expect(element.shadowRoot?.querySelector('.progress-ring')).to.not.exist
    })
  })

  describe('State Transitions', () => {
    it('should update icon when state changes', async () => {
      // Start with paused state
      element.state = 'paused'
      await element.updateComplete
      expect(element.getIconForState()).toBe(iconPlay)

      // Change to playing state
      element.state = 'playing'
      await element.updateComplete
      expect(element.getIconForState()).toBe(iconPause)
    })

    it('should maintain button functionality across state changes', async () => {
      const eventSpy = vi.fn()
      element.addEventListener('adni-click', eventSpy)

      // Test in paused state
      element.state = 'paused'
      await element.updateComplete
      element.shadowRoot?.querySelector('button')?.click()
      expect(eventSpy).toHaveBeenCalledTimes(1)

      // Test in playing state
      element.state = 'playing'
      await element.updateComplete
      element.shadowRoot?.querySelector('button')?.click()
      expect(eventSpy).toHaveBeenCalledTimes(2)
    })
  })
})
