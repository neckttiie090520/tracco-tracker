// TanStack Query Client Configuration
// Optimized for Workshop Tracker performance

import { QueryClient } from '@tanstack/react-query'

// Cache time configurations based on data freshness needs
export const CACHE_CONFIG = {
  // Long-term stable data (rarely changes)
  STABLE: {
    staleTime: 10 * 60 * 1000,    // 10 minutes - consider fresh
    gcTime: 30 * 60 * 1000,      // 30 minutes - keep in memory
  },
  
  // Medium-term data (changes occasionally)
  MEDIUM: {
    staleTime: 5 * 60 * 1000,     // 5 minutes - consider fresh
    gcTime: 15 * 60 * 1000,      // 15 minutes - keep in memory
  },
  
  // Short-term data (changes frequently)
  DYNAMIC: {
    staleTime: 30 * 1000,        // 30 seconds - consider fresh
    gcTime: 2 * 60 * 1000,       // 2 minutes - keep in memory
  },
  
  // Real-time data (always fetch fresh)
  REALTIME: {
    staleTime: 0,                // Always consider stale
    gcTime: 30 * 1000,          // 30 seconds - minimal cache
  }
}

// Query Keys Factory - Centralized key management
export const queryKeys = {
  // Workshop related queries
  workshops: {
    all: ['workshops'] as const,
    lists: () => [...queryKeys.workshops.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.workshops.lists(), filters] as const,
    details: () => [...queryKeys.workshops.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.workshops.details(), id] as const,
    participants: (id: string) => [...queryKeys.workshops.detail(id), 'participants'] as const,
  },
  
  // Task related queries  
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (workshopId?: string) => [...queryKeys.tasks.lists(), workshopId] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
    submissions: (taskId: string) => [...queryKeys.tasks.detail(taskId), 'submissions'] as const,
  },
  
  // User related queries
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    dashboard: (id: string) => [...queryKeys.users.detail(id), 'dashboard'] as const,
  },
  
  // Dashboard queries
  dashboard: {
    all: ['dashboard'] as const,
    admin: () => [...queryKeys.dashboard.all, 'admin'] as const,
    participant: (userId: string) => [...queryKeys.dashboard.all, 'participant', userId] as const,
  },
  
  // Submission related queries
  submissions: {
    all: ['submissions'] as const,
    lists: () => [...queryKeys.submissions.all, 'list'] as const,
    byTask: (taskId: string) => [...queryKeys.submissions.lists(), 'task', taskId] as const,
    byUser: (userId: string) => [...queryKeys.submissions.lists(), 'user', userId] as const,
  }
}

// Create optimized Query Client
export const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Default cache configuration - Medium freshness
        staleTime: CACHE_CONFIG.MEDIUM.staleTime,
        gcTime: CACHE_CONFIG.MEDIUM.gcTime,
        
        // Retry configuration
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors (client errors)
          if (error?.status >= 400 && error?.status < 500) {
            return false
          }
          // Retry up to 2 times for other errors
          return failureCount < 2
        },
        
        // Refetch configuration
        refetchOnWindowFocus: false,  // Don't refetch on window focus
        refetchOnReconnect: true,     // Refetch when reconnecting
        refetchOnMount: true,         // Refetch on component mount if stale
      },
      
      mutations: {
        // Retry mutations once on failure
        retry: 1,
        
        // Mutation default options
        onError: (error) => {
          console.error('Mutation error:', error)
          // Could integrate with error reporting service here
        }
      }
    }
  })
}

// Prefetch strategies for common data combinations
export const prefetchStrategies = {
  // Prefetch dashboard data (admin)
  adminDashboard: async (queryClient: QueryClient) => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.dashboard.admin(),
        staleTime: CACHE_CONFIG.DYNAMIC.staleTime,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.workshops.lists(),
        staleTime: CACHE_CONFIG.MEDIUM.staleTime,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.tasks.lists(),
        staleTime: CACHE_CONFIG.MEDIUM.staleTime,
      })
    ])
  },
  
  // Prefetch workshop detail page data
  workshopDetail: async (queryClient: QueryClient, workshopId: string) => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.workshops.detail(workshopId),
        staleTime: CACHE_CONFIG.STABLE.staleTime,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.tasks.list(workshopId),
        staleTime: CACHE_CONFIG.MEDIUM.staleTime,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.workshops.participants(workshopId),
        staleTime: CACHE_CONFIG.DYNAMIC.staleTime,
      })
    ])
  }
}

// Cache invalidation strategies
export const invalidationStrategies = {
  // When workshop is updated
  workshop: (queryClient: QueryClient, workshopId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.workshops.detail(workshopId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.workshops.lists() })
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.admin() })
  },
  
  // When task is updated
  task: (queryClient: QueryClient, taskId: string, workshopId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) })
    if (workshopId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(workshopId) })
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.admin() })
  },
  
  // When submission is created/updated
  submission: (queryClient: QueryClient, taskId: string, userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.submissions(taskId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.submissions.byUser(userId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.users.dashboard(userId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.admin() })
  }
}

// Performance monitoring utilities
export const performanceMonitor = {
  // Log slow queries for optimization
  logSlowQueries: (threshold = 2000) => {
    return {
      onSuccess: (data: any, query: any) => {
        const duration = Date.now() - query.state.dataUpdatedAt
        if (duration > threshold) {
          console.warn(`Slow query detected:`, {
            queryKey: query.queryKey,
            duration: `${duration}ms`,
            dataSize: JSON.stringify(data).length
          })
        }
      }
    }
  },
  
  // Track cache hit rates
  trackCacheHits: () => {
    const stats = { hits: 0, misses: 0 }
    return {
      onSuccess: (data: any, query: any) => {
        if (query.state.isFetching) {
          stats.misses++
        } else {
          stats.hits++
        }
        
        if ((stats.hits + stats.misses) % 10 === 0) {
          const hitRate = (stats.hits / (stats.hits + stats.misses)) * 100
          console.log(`Cache hit rate: ${hitRate.toFixed(1)}%`)
        }
      }
    }
  }
}