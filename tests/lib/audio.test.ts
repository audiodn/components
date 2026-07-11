import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAudioInstance } from '../../src/lib/audio'

describe('createAudioInstance', () => {
  let mockAudio: any
  let eventHandler: any

  beforeEach(() => {
    // Reset the mock
    vi.clearAllMocks()
    
    mockAudio = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      load: vi.fn(),
      currentTime: 0,
      duration: 0,
      volume: 1,
      muted: false,
      paused: true,
      ended: false,
      readyState: 0,
      networkState: 0,
      error: null,
      src: '',
      currentSrc: '',
      onplay: null,
      onpause: null,
      onload: null,
      oncanplay: null,
      ontimeupdate: null,
      onended: null,
      onerror: null,
      onvolumechange: null,
      onseeking: null,
      onseeked: null,
      onwaiting: null,
      onstalled: null,
      onprogress: null,
      onloadedmetadata: null,
      onloadeddata: null,
      oncanplaythrough: null,
      onabort: null,
      onemptied: null,
      ondurationchange: null,
      onratechange: null,
      onsuspend: null
    }

    // Mock the Audio constructor
    vi.mocked(window.Audio).mockImplementation(() => mockAudio)
    
    eventHandler = vi.fn()
  })

  it('should create an audio element', () => {
    const audio = createAudioInstance(eventHandler)
    expect(window.Audio).toHaveBeenCalled()
    expect(audio).toBe(mockAudio)
  })

  it('should add event listeners for all audio events', () => {
    createAudioInstance(eventHandler)
    
    // Check that addEventListener was called for all the on* properties
    const expectedEvents = [
      'play', 'pause', 'load', 'canplay', 'timeupdate', 'ended', 'error',
      'volumechange', 'seeking', 'seeked', 'waiting', 'stalled', 'progress',
      'loadedmetadata', 'loadeddata', 'canplaythrough', 'abort', 'emptied',
      'durationchange', 'ratechange', 'suspend'
    ]

    expectedEvents.forEach(event => {
      expect(mockAudio.addEventListener).toHaveBeenCalledWith(event, eventHandler)
    })
  })

  it('should return the audio element with all expected properties', () => {
    const audio = createAudioInstance(eventHandler)
    
    // Check that the audio element has the expected properties
    expect(audio).toHaveProperty('addEventListener')
    expect(audio).toHaveProperty('removeEventListener')
    expect(audio).toHaveProperty('play')
    expect(audio).toHaveProperty('pause')
    expect(audio).toHaveProperty('load')
    expect(audio).toHaveProperty('currentTime')
    expect(audio).toHaveProperty('duration')
    expect(audio).toHaveProperty('volume')
    expect(audio).toHaveProperty('muted')
    expect(audio).toHaveProperty('paused')
    expect(audio).toHaveProperty('ended')
    expect(audio).toHaveProperty('readyState')
    expect(audio).toHaveProperty('networkState')
    expect(audio).toHaveProperty('error')
    expect(audio).toHaveProperty('src')
    expect(audio).toHaveProperty('currentSrc')
  })

  it('should handle the event handler function correctly', () => {
    const customEventHandler = vi.fn()
    createAudioInstance(customEventHandler)
    
    // Verify the custom event handler is used
    expect(mockAudio.addEventListener).toHaveBeenCalledWith('play', customEventHandler)
    expect(mockAudio.addEventListener).toHaveBeenCalledWith('pause', customEventHandler)
  })

  it('should not add listeners for non-event properties', () => {
    createAudioInstance(eventHandler)
    
    // Properties that shouldn't have event listeners
    const nonEventProperties = ['currentTime', 'duration', 'volume', 'muted', 'paused']
    
    nonEventProperties.forEach(prop => {
      expect(mockAudio.addEventListener).not.toHaveBeenCalledWith(prop, eventHandler)
    })
  })
}) 