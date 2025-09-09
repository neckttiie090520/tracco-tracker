interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class SimpleCacheService {
  private cache = new Map<string, CacheEntry<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes default

  // Set cache with optional TTL
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    })
  }

  // Get from cache if valid
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  // Check if key exists and is valid
  has(key: string): boolean {
    const data = this.get(key)
    return data !== null
  }

  // Invalidate specific key
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  // Invalidate keys matching pattern
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern)
    const keysToDelete: string[] = []
    
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  // Clear all cache
  clear(): void {
    this.cache.clear()
  }

  // Get cache stats
  getStats() {
    const now = Date.now()
    const stats = {
      totalEntries: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: now - entry.timestamp,
        ttl: entry.ttl,
        expired: now - entry.timestamp > entry.ttl
      }))
    }
    return stats
  }
}

// Create singleton instance
export const cacheService = new SimpleCacheService()

import React from 'react'

// Helper hook for cached queries
export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number
    staleWhileRevalidate?: boolean
  } = {}
): {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
} {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Check cache first
      const cached = cacheService.get<T>(key)
      if (cached) {
        setData(cached)
        setLoading(false)
        
        // If staleWhileRevalidate, fetch in background
        if (options.staleWhileRevalidate) {
          fetcher().then(fresh => {
            cacheService.set(key, fresh, options.ttl)
            setData(fresh)
          }).catch(console.error)
        }
        return
      }

      // Fetch fresh data
      const fresh = await fetcher()
      cacheService.set(key, fresh, options.ttl)
      setData(fresh)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [key, options.ttl, options.staleWhileRevalidate])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const refetch = React.useCallback(async () => {
    cacheService.invalidate(key)
    await fetchData()
  }, [key, fetchData])

  return { data, loading, error, refetch }
}

// Cache keys for different entities
export const CACHE_KEYS = {
  workshops: 'workshops',
  workshop: (id: string) => `workshop:${id}`,
  users: 'users',
  user: (id: string) => `user:${id}`,
  userProfile: (id: string) => `userProfile:${id}`,
  sessions: 'sessions',
  session: (id: string) => `session:${id}`,
  tasks: (workshopId: string) => `tasks:${workshopId}`,
  submissions: (taskId: string) => `submissions:${taskId}`,
  registrations: (workshopId: string) => `registrations:${workshopId}`,
}