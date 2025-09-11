import { useState, useEffect, useCallback, useRef } from 'react'

interface VisibilityState {
  isVisible: boolean
  wasHidden: boolean
  hiddenTime: number
}

interface UseDocumentVisibilityOptions {
  onVisible?: () => void
  onHidden?: () => void
  refreshThreshold?: number // milliseconds - auto refresh if hidden longer than this
  enableAutoRefresh?: boolean
}

export function useDocumentVisibility(options: UseDocumentVisibilityOptions = {}) {
  const {
    onVisible,
    onHidden,
    refreshThreshold = 30000, // 30 seconds default
    enableAutoRefresh = true
  } = options

  const [state, setState] = useState<VisibilityState>({
    isVisible: !document.hidden,
    wasHidden: false,
    hiddenTime: 0
  })

  const hiddenTimestamp = useRef<number>(0)
  const refreshCallbacks = useRef<Set<() => void>>(new Set())

  const handleVisibilityChange = useCallback(() => {
    const isVisible = !document.hidden
    const now = Date.now()

    if (isVisible) {
      const hiddenDuration = hiddenTimestamp.current ? now - hiddenTimestamp.current : 0
      const shouldAutoRefresh = enableAutoRefresh && hiddenDuration > refreshThreshold

      setState(prev => ({
        isVisible: true,
        wasHidden: prev.wasHidden || !prev.isVisible,
        hiddenTime: hiddenDuration
      }))

      // Auto-refresh data if tab was hidden for too long
      if (shouldAutoRefresh && refreshCallbacks.current.size > 0) {
        refreshCallbacks.current.forEach(callback => callback())
      }

      onVisible?.()
      hiddenTimestamp.current = 0
    } else {
      setState(prev => ({
        ...prev,
        isVisible: false
      }))
      
      hiddenTimestamp.current = now
      onHidden?.()
    }
  }, [onVisible, onHidden, refreshThreshold, enableAutoRefresh])

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [handleVisibilityChange])

  // Register refresh callback
  const registerRefreshCallback = useCallback((callback: () => void) => {
    refreshCallbacks.current.add(callback)
    return () => {
      refreshCallbacks.current.delete(callback)
    }
  }, [])

  // Manual refresh trigger
  const triggerRefresh = useCallback(() => {
    refreshCallbacks.current.forEach(callback => callback())
  }, [])

  return {
    isVisible: state.isVisible,
    wasHidden: state.wasHidden,
    hiddenTime: state.hiddenTime,
    registerRefreshCallback,
    triggerRefresh
  }
}

// Higher-order hook for data fetching with visibility awareness
export function useVisibilityAwareFetch<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = [],
  options: {
    refreshOnVisible?: boolean
    pauseWhenHidden?: boolean
    refreshThreshold?: number
  } = {}
) {
  const {
    refreshOnVisible = true,
    pauseWhenHidden = true,
    refreshThreshold = 30000
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const { isVisible, registerRefreshCallback } = useDocumentVisibility({
    refreshThreshold,
    enableAutoRefresh: refreshOnVisible
  })

  const fetchData = useCallback(async () => {
    if (pauseWhenHidden && !isVisible) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await fetchFn()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [fetchFn, isVisible, pauseWhenHidden])

  useEffect(() => {
    fetchData()
  }, [...dependencies, fetchData])

  useEffect(() => {
    if (refreshOnVisible) {
      return registerRefreshCallback(fetchData)
    }
  }, [refreshOnVisible, registerRefreshCallback, fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    isVisible
  }
}