import { useState, useEffect, useCallback, useRef } from 'react'

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // time to live in milliseconds
}

interface CacheOptions {
  maxSize?: number // maximum number of items in cache
  defaultTTL?: number // default time to live in milliseconds
  persistToSessionStorage?: boolean
}

class DataCache {
  private cache = new Map<string, CacheItem<any>>()
  private maxSize: number
  private defaultTTL: number
  private persistToSessionStorage: boolean

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 50
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000 // 5 minutes
    this.persistToSessionStorage = options.persistToSessionStorage || true
    
    if (this.persistToSessionStorage) {
      this.loadFromSessionStorage()
    }
  }

  private loadFromSessionStorage() {
    try {
      const cached = sessionStorage.getItem('dataCache')
      if (cached) {
        const items = JSON.parse(cached)
        Object.entries(items).forEach(([key, item]) => {
          this.cache.set(key, item as CacheItem<any>)
        })
      }
    } catch (error) {
      console.warn('Failed to load cache from sessionStorage:', error)
    }
  }

  private saveToSessionStorage() {
    if (!this.persistToSessionStorage) return
    
    try {
      const items: Record<string, CacheItem<any>> = {}
      this.cache.forEach((value, key) => {
        items[key] = value
      })
      sessionStorage.setItem('dataCache', JSON.stringify(items))
    } catch (error) {
      console.warn('Failed to save cache to sessionStorage:', error)
    }
  }

  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() - item.timestamp > item.ttl
  }

  private evictOldest() {
    let oldestKey = ''
    let oldestTimestamp = Infinity
    
    this.cache.forEach((item, key) => {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp
        oldestKey = key
      }
    })
    
    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  set<T>(key: string, data: T, ttl?: number): void {
    // Remove expired items first
    this.cache.forEach((item, k) => {
      if (this.isExpired(item)) {
        this.cache.delete(k)
      }
    })

    // Evict oldest if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    })

    this.saveToSessionStorage()
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) return null
    
    if (this.isExpired(item)) {
      this.cache.delete(key)
      this.saveToSessionStorage()
      return null
    }

    // Update timestamp to implement LRU
    item.timestamp = Date.now()
    return item.data as T
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false
    
    if (this.isExpired(item)) {
      this.cache.delete(key)
      this.saveToSessionStorage()
      return false
    }
    
    return true
  }

  delete(key: string): boolean {
    const result = this.cache.delete(key)
    if (result) {
      this.saveToSessionStorage()
    }
    return result
  }

  clear(): void {
    this.cache.clear()
    if (this.persistToSessionStorage) {
      sessionStorage.removeItem('dataCache')
    }
  }

  size(): number {
    return this.cache.size
  }
}

// Global cache instance
const globalCache = new DataCache({
  maxSize: 100,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  persistToSessionStorage: true
})

export function useDataCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    ttl?: number
    dependencies?: any[]
    enableCache?: boolean
  } = {}
) {
  const { ttl, dependencies = [], enableCache = true } = options
  const [data, setData] = useState<T | null>(() => 
    enableCache ? globalCache.get<T>(key) : null
  )
  const [loading, setLoading] = useState(!data)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Check cache first if not forcing refresh
    if (enableCache && !forceRefresh && globalCache.has(key)) {
      const cachedData = globalCache.get<T>(key)
      if (cachedData) {
        setData(cachedData)
        setLoading(false)
        return cachedData
      }
    }

    try {
      setLoading(true)
      setError(null)
      const result = await fetchFn()
      
      if (enableCache) {
        globalCache.set(key, result, ttl)
      }
      
      setData(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [key, fetchFn, ttl, enableCache])

  const invalidate = useCallback(() => {
    if (enableCache) {
      globalCache.delete(key)
    }
    setData(null)
  }, [key, enableCache])

  useEffect(() => {
    fetchData()
  }, [fetchData, ...dependencies])

  return {
    data,
    loading,
    error,
    refetch: () => fetchData(true),
    fetchData,
    invalidate,
    isCached: enableCache && globalCache.has(key)
  }
}

// Hook for managing cache globally
export function useGlobalCache() {
  return {
    clear: () => globalCache.clear(),
    size: () => globalCache.size(),
    delete: (key: string) => globalCache.delete(key),
    has: (key: string) => globalCache.has(key)
  }
}