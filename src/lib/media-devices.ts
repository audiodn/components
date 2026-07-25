/**
 * Shared audio input/output device helpers for the Player and Recorder.
 *
 * The selected microphone (input) and speaker (output) are page-wide
 * preferences: picking one in any player or recorder should apply to every
 * other instance and persist for the session. This mirrors how volume is
 * coordinated in the player — a `sessionStorage`-backed value plus a document
 * event that other instances listen to.
 *
 * Output routing relies on `HTMLMediaElement.setSinkId`, which is not available
 * in every browser (notably Safari). When it is missing we simply skip the
 * output UI and never claim to change the output device.
 */

import { createStorage } from './storage.ts'
import type { BrowserStorage } from './storage.ts'

export interface AudioDevice {
  deviceId: string
  label: string
}

/** Document events used to sync device selection across instances. */
export const INPUT_CHANGE_EVENT = 'adn-inputchange'
export const OUTPUT_CHANGE_EVENT = 'adn-outputchange'

const INPUT_STORAGE_KEY = 'audioInputDeviceId'
const OUTPUT_STORAGE_KEY = 'audioOutputDeviceId'

// A media element augmented with the optional Audio Output Devices API.
type SinkCapableMedia = HTMLMediaElement & {
  setSinkId?: (sinkId: string) => Promise<void>
}

function sessionStore () {
  if (typeof sessionStorage === 'undefined') return undefined
  return createStorage(sessionStorage as unknown as BrowserStorage)
}

/** True when the browser can route audio to a chosen output device. */
export function supportsSinkId (): boolean {
  return (
    typeof HTMLMediaElement !== 'undefined' &&
    typeof (HTMLMediaElement.prototype as SinkCapableMedia).setSinkId === 'function'
  )
}

async function enumerate (kind: MediaDeviceKind): Promise<AudioDevice[]> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return []
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices
      .filter((d) => d.kind === kind && d.deviceId)
      .map((d) => ({ deviceId: d.deviceId, label: d.label || '' }))
  } catch {
    // Enumeration can fail in locked-down environments; treat as no devices.
    return []
  }
}

export function enumerateAudioInputs (): Promise<AudioDevice[]> {
  return enumerate('audioinput')
}

export function enumerateAudioOutputs (): Promise<AudioDevice[]> {
  return enumerate('audiooutput')
}

export function getPreferredAudioInputId (): string {
  const value = sessionStore()?.get(INPUT_STORAGE_KEY)
  return typeof value === 'string' ? value : ''
}

export function setPreferredAudioInputId (deviceId: string): void {
  sessionStore()?.set(INPUT_STORAGE_KEY, deviceId, false)
}

export function getPreferredAudioOutputId (): string {
  const value = sessionStore()?.get(OUTPUT_STORAGE_KEY)
  return typeof value === 'string' ? value : ''
}

export function setPreferredAudioOutputId (deviceId: string): void {
  sessionStore()?.set(OUTPUT_STORAGE_KEY, deviceId, false)
}

/**
 * Route a media element to the preferred output device. No-op when the API is
 * unsupported or no device is selected. Failures (e.g. the device was
 * unplugged) are swallowed so playback stays on the current sink.
 */
export async function applySinkId (
  el: HTMLMediaElement | null | undefined,
  deviceId: string
): Promise<void> {
  if (!el || !deviceId || !supportsSinkId()) return
  const sinkEl = el as SinkCapableMedia
  if (typeof sinkEl.setSinkId !== 'function') return
  try {
    await sinkEl.setSinkId(deviceId)
  } catch {
    // Device may have vanished; keep the current output.
  }
}
