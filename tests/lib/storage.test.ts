import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createStorage, Storage } from '../../src/lib/storage'

describe('Storage', () => {
  let mockStorage: any
  let storage: Storage

  beforeEach(() => {
    mockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    }
    storage = createStorage(mockStorage)
  })

  describe('get', () => {
    it('should return undefined for non-existent keys', () => {
      mockStorage.getItem.mockReturnValue(null)
      expect(storage.get('nonexistent')).toBeUndefined()
    })

    it('should return parsed data for existing keys', () => {
      const testData = { data: 'test value', expires: Date.now() + 10000 }
      mockStorage.getItem.mockReturnValue(JSON.stringify(testData))
      expect(storage.get('test')).toBe('test value')
    })

    it('should return undefined for expired data', () => {
      const expiredData = { data: 'test value', expires: Date.now() - 1000 }
      mockStorage.getItem.mockReturnValue(JSON.stringify(expiredData))
      expect(storage.get('expired')).toBeUndefined()
      expect(mockStorage.removeItem).toHaveBeenCalledWith('expired')
    })

    it('should handle malformed JSON', () => {
      mockStorage.getItem.mockReturnValue('invalid json')
      expect(() => storage.get('malformed')).toThrow()
    })
  })

  describe('set', () => {
    it('should store string data', () => {
      storage.set('test', 'value')
      expect(mockStorage.setItem).toHaveBeenCalledWith('test', expect.any(String))
      const storedData = JSON.parse(mockStorage.setItem.mock.calls[0][1])
      expect(storedData.data).toBe('value')
      expect(storedData.expires).toBeDefined()
    })

    it('should store object data', () => {
      const testObj = { key: 'value', number: 123 }
      storage.set('test', testObj)
      const storedData = JSON.parse(mockStorage.setItem.mock.calls[0][1])
      expect(storedData.data).toEqual(testObj)
    })

    it('should store number data', () => {
      storage.set('test', 42)
      const storedData = JSON.parse(mockStorage.setItem.mock.calls[0][1])
      expect(storedData.data).toBe(42)
    })

    it('should handle custom expiration time', () => {
      const futureTime = Date.now() + 5000
      storage.set('test', 'value', 5000)
      const storedData = JSON.parse(mockStorage.setItem.mock.calls[0][1])
      expect(storedData.expires).toBeCloseTo(futureTime, -2)
    })

    it('should handle immediate expiration', () => {
      storage.set('test', 'value', true)
      const storedData = JSON.parse(mockStorage.setItem.mock.calls[0][1])
      expect(storedData.expires).toBeCloseTo(Date.now(), -2)
    })

    it('should handle no expiration', () => {
      storage.set('test', 'value', false)
      const storedData = JSON.parse(mockStorage.setItem.mock.calls[0][1])
      expect(storedData.expires).toBeUndefined()
    })
  })

  describe('remove', () => {
    it('should remove items from storage', () => {
      storage.remove('test')
      expect(mockStorage.removeItem).toHaveBeenCalledWith('test')
    })
  })

  describe('integration', () => {
    it('should round-trip data correctly', () => {
      const testData = 'simple string data'
      
      // Mock the getItem to return what setItem would store
      mockStorage.setItem.mockImplementation((key, value) => {
        mockStorage.getItem.mockReturnValue(value)
      })
      
      storage.set('test', testData)
      const retrieved = storage.get('test')
      
      expect(retrieved).toEqual(testData)
    })
  })
}) 