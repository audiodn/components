/***
use the audio() element in html / js to create a base player

the player needs receive the commands to pause, play, load, unload audio files.

  is volume attached to the element? I assume so
  - yes it is, the volume property is a setter and getter

  what are the methods available on the audio element
  - load()	Re-loads the audio/video element
  - play()	Starts playing the audio/video
  - pause()	Pauses the currently playing audio/video

  what are the properties of the element?
  - audioTracks	Returns an AudioTrackList object representing available audio tracks
  - autoplay	Sets or returns whether the audio/video should start playing as soon as it is loaded
  - buffered	Returns a TimeRanges object representing the buffered parts of the audio/video
  - controller	Returns the MediaController object representing the current media controller of the audio/video
  - controls	Sets or returns whether the audio/video should display controls (like play/pause etc.)
  - crossOrigin	Sets or returns the CORS settings of the audio/video
  - currentSrc	Returns the URL of the current audio/video
  - currentTime	Sets or returns the current playback position in the audio/video (in seconds)
  - defaultMuted	Sets or returns whether the audio/video should be muted by default
  - defaultPlaybackRate	Sets or returns the default speed of the audio/video playback
  - duration	Returns the length of the current audio/video (in seconds)
  - ended	Returns whether the playback of the audio/video has ended or not
  - error	Returns a MediaError object representing the error state of the audio/video
  - loop	Sets or returns whether the audio/video should start over again when finished
  - mediaGroup	Sets or returns the group the audio/video belongs to (used to link multiple audio/video elements)
  - muted	Sets or returns whether the audio/video is muted or not
  - networkState	Returns the current network state of the audio/video
  - paused	Returns whether the audio/video is paused or not
  - playbackRate	Sets or returns the speed of the audio/video playback
  - played	Returns a TimeRanges object representing the played parts of the audio/video
  - preload	Sets or returns whether the audio/video should be loaded when the page loads
  - readyState	Returns the current ready state of the audio/video
  - seekable	Returns a TimeRanges object representing the seekable parts of the audio/video
  - seeking	Returns whether the user is currently seeking in the audio/video
  - src	Sets or returns the current source of the audio/video element
  - startDate	Returns a Date object representing the current time offset
  - textTracks	Returns a TextTrackList object representing the available text tracks
  - volume	Sets or returns the volume of the audio/video

the audio element emits specific events we may need to handle

  what are the events the element emits and where will we use them
  - abort	Fires when the loading of an audio/video is aborted
  - canplay	Fires when the browser can start playing the audio/video
  - canplaythrough	Fires when the browser can play through the audio/video without stopping for buffering
  - durationchange	Fires when the duration of the audio/video is changed
  - emptied	Fires when the current playlist is empty
  - ended	Fires when the current playlist is ended
  - error	Fires when an error occurred during the loading of an audio/video
  - loadeddata	Fires when the browser has loaded the current frame of the audio/video
  - loadedmetadata	Fires when the browser has loaded meta data for the audio/video
  - loadstart	Fires when the browser starts looking for the audio/video
  - pause	Fires when the audio/video has been paused
  - play	Fires when the audio/video has been started or is no longer paused
  - playing	Fires when the audio/video is playing after having been paused or stopped for buffering
  - progress	Fires when the browser is downloading the audio/video
  - ratechange	Fires when the playing speed of the audio/video is changed
  - seeked	Fires when the user is finished moving/skipping to a new position in the audio/video
  - seeking	Fires when the user starts moving/skipping to a new position in the audio/video
  - stalled	Fires when the browser is trying to get media data, but data is not available
  - suspend	Fires when the browser is intentionally not getting media data
  - timeupdate	Fires when the current playback position has changed
  - volumechange	Fires when the volume has been changed
  - waiting	Fires when the video stops because it needs to buffer the next frame

there could be multiple instances of the main player component on the page, we should ensure that only one audio element is playing at the same time
this is implemented by having the audio element tell the host player it has started playing, then having the host player emit a global level event which all host players listen to
****/

export interface audioEventHandler {
  (event: Event): void
}

// returns a new audio element for usage?
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
