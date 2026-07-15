import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fixture, html } from '@open-wc/testing'
import { AudioDnWaveform } from '../src/waveform'

describe('audiodn-waveform', () => {
  let element: AudioDnWaveform

  beforeEach(async () => {
    element = await fixture<AudioDnWaveform>(html`
      <audiodn-waveform variant="wavy" height="100" style="display:block;width:200px"></audiodn-waveform>
    `)
    const canvas = element.shadowRoot?.querySelector('canvas')
    expect(canvas).toBeTruthy()
    Object.defineProperty(canvas!, 'clientWidth', { configurable: true, value: 200 })
    // getRect is used as a fallback when clientWidth is 0
    Object.defineProperty(element, 'getRect', {
      configurable: true,
      value: () => ({ width: 200, height: 100, top: 0, left: 0, right: 200, bottom: 100 }),
    })
  })

  afterEach(() => {
    element.remove()
  })

  it('renders without throwing when levels are empty', async () => {
    element.levels = []
    await element.updateComplete
    expect(() => (element as any).draw()).not.toThrow()
  })

  it('wavy variant continues drawing after a zero sample', async () => {
    // Min is 0 so the zero sample stays 0 after normalization. With the old
    // `return` bug, stroke() would stop at the zero and never draw later bars.
    element.levels = [0.5, 0, 0.8, 0.6, 0.4, 0.9, 0.3, 0.7]
    await element.updateComplete
    ;(element as any).draw()

    const ctx = (element as any).ctx as { stroke: ReturnType<typeof vi.fn> }
    expect(ctx).toBeTruthy()
    expect(ctx.stroke).toHaveBeenCalled()
    // More than one segment must paint past the zero sample
    expect(ctx.stroke.mock.calls.length).toBeGreaterThan(1)
  })

  it('accepts the reflection and vertical variants', async () => {
    for (const variant of ['vertical', 'reflection'] as const) {
      element.variant = variant
      element.levels = [0.2, 0.5, 0.9, 0.4]
      await element.updateComplete
      expect(() => (element as any).draw()).not.toThrow()
    }
  })
})
