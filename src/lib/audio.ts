/**
 * Thin factory around the native HTMLAudioElement.
 *
 * `createAudioInstance` returns a fresh `Audio()` with `preload = 'auto'` and
 * wires every native media event (canplay, timeupdate, ended, error, etc.) to a
 * single handler, so the host player component can react to playback state.
 *
 * Only one audio element should play at a time across all player instances on
 * the page. That coordination lives in the player: an element reports when it
 * starts, and the player broadcasts a global event that other players listen to
 * in order to pause themselves.
 */

export interface audioEventHandler {
  (event: Event): void
}

export function createAudioInstance (eventHandler: audioEventHandler): HTMLAudioElement {
  const el = new Audio()
  el.preload = 'auto'

  for (const key in el) {
    if (/^on/.test(key)) {
      const eventType = key.substring(2)
      el.addEventListener(eventType, eventHandler)
    }
  }

  return el
}
