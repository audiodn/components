import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  supportsSinkId,
  enumerateAudioInputs,
  enumerateAudioOutputs,
  getPreferredAudioInputId,
  setPreferredAudioInputId,
  getPreferredAudioOutputId,
  setPreferredAudioOutputId,
  applySinkId,
} from '../../src/lib/media-devices'

type SinkProto = { setSinkId?: (id: string) => Promise<void> }

const devices = [
  { deviceId: 'mic-1', kind: 'audioinput', label: 'Built-in Mic', groupId: 'g1' },
  { deviceId: 'mic-2', kind: 'audioinput', label: 'USB Mic', groupId: 'g2' },
  { deviceId: 'spk-1', kind: 'audiooutput', label: 'Speakers', groupId: 'g3' },
] as MediaDeviceInfo[]

describe('media-devices', () => {
  const store = new Map<string, string>()

  beforeEach(() => {
    store.clear()
    vi.mocked(sessionStorage.getItem).mockImplementation((k: string) =>
      store.has(k) ? (store.get(k) as string) : null
    )
    vi.mocked(sessionStorage.setItem).mockImplementation((k: string, v: string) => {
      store.set(k, String(v))
    })
    vi.mocked(sessionStorage.removeItem).mockImplementation((k: string) => {
      store.delete(k)
    })
    vi.mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValue(devices)
  })

  afterEach(() => {
    delete (HTMLMediaElement.prototype as SinkProto).setSinkId
    vi.clearAllMocks()
  })

  describe('supportsSinkId', () => {
    it('is true when the media element exposes setSinkId', () => {
      ;(HTMLMediaElement.prototype as SinkProto).setSinkId = vi.fn().mockResolvedValue(undefined)
      expect(supportsSinkId()).toBe(true)
    })

    it('is false when setSinkId is unavailable', () => {
      delete (HTMLMediaElement.prototype as SinkProto).setSinkId
      expect(supportsSinkId()).toBe(false)
    })
  })

  describe('enumeration', () => {
    it('returns only audioinput devices', async () => {
      const inputs = await enumerateAudioInputs()
      expect(inputs).toEqual([
        { deviceId: 'mic-1', label: 'Built-in Mic' },
        { deviceId: 'mic-2', label: 'USB Mic' },
      ])
    })

    it('returns only audiooutput devices', async () => {
      const outputs = await enumerateAudioOutputs()
      expect(outputs).toEqual([{ deviceId: 'spk-1', label: 'Speakers' }])
    })

    it('returns an empty list when enumeration throws', async () => {
      vi.mocked(navigator.mediaDevices.enumerateDevices).mockRejectedValue(new Error('denied'))
      expect(await enumerateAudioOutputs()).toEqual([])
    })
  })

  describe('preferences', () => {
    it('round-trips the input device id', () => {
      expect(getPreferredAudioInputId()).toBe('')
      setPreferredAudioInputId('mic-2')
      expect(getPreferredAudioInputId()).toBe('mic-2')
    })

    it('round-trips the output device id', () => {
      expect(getPreferredAudioOutputId()).toBe('')
      setPreferredAudioOutputId('spk-1')
      expect(getPreferredAudioOutputId()).toBe('spk-1')
    })
  })

  describe('applySinkId', () => {
    beforeEach(() => {
      ;(HTMLMediaElement.prototype as SinkProto).setSinkId = vi.fn().mockResolvedValue(undefined)
    })

    it('routes the element to the given device', async () => {
      const setSinkId = vi.fn().mockResolvedValue(undefined)
      const el = { setSinkId } as unknown as HTMLMediaElement
      await applySinkId(el, 'spk-1')
      expect(setSinkId).toHaveBeenCalledWith('spk-1')
    })

    it('is a no-op when no device is given', async () => {
      const setSinkId = vi.fn().mockResolvedValue(undefined)
      const el = { setSinkId } as unknown as HTMLMediaElement
      await applySinkId(el, '')
      expect(setSinkId).not.toHaveBeenCalled()
    })

    it('is a no-op when setSinkId is unsupported', async () => {
      delete (HTMLMediaElement.prototype as SinkProto).setSinkId
      const setSinkId = vi.fn().mockResolvedValue(undefined)
      const el = { setSinkId } as unknown as HTMLMediaElement
      await applySinkId(el, 'spk-1')
      expect(setSinkId).not.toHaveBeenCalled()
    })

    it('swallows failures when the device is gone', async () => {
      const el = {
        setSinkId: vi.fn().mockRejectedValue(new Error('device lost')),
      } as unknown as HTMLMediaElement
      await expect(applySinkId(el, 'spk-1')).resolves.toBeUndefined()
    })
  })
})
