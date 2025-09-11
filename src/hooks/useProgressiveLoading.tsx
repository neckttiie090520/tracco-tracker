import { useState, useEffect, useCallback, useRef } from 'react'

interface LoadingStage<T> {
  key: string
  priority: number // lower number = higher priority (loads first)
  loader: () => Promise<T>
  fallback?: T // fallback data while loading
}

interface ProgressiveLoadingState<T> {
  [key: string]: {
    data: T | null
    loading: boolean
    error: Error | null
    loaded: boolean
  }
}

export function useProgressiveLoading<T = any>(
  stages: LoadingStage<T>[],
  options: {
    enableParallelLoading?: boolean
    staggerDelay?: number // delay between stages in ms
    onStageComplete?: (stageKey: string, data: T) => void
    onAllStagesComplete?: (allData: Record<string, T>) => void
  } = {}
) {
  const {
    enableParallelLoading = false,
    staggerDelay = 100,
    onStageComplete,
    onAllStagesComplete
  } = options

  const [state, setState] = useState<ProgressiveLoadingState<T>>(() => {
    const initialState: ProgressiveLoadingState<T> = {}
    stages.forEach(stage => {
      initialState[stage.key] = {
        data: stage.fallback || null,
        loading: false,
        error: null,
        loaded: false
      }
    })
    return initialState
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const stagesRef = useRef(stages)
  stagesRef.current = stages

  const loadStage = useCallback(async (stage: LoadingStage<T>, signal?: AbortSignal) => {
    if (signal?.aborted) return

    setState(prev => ({
      ...prev,
      [stage.key]: {
        ...prev[stage.key],
        loading: true,
        error: null
      }
    }))

    try {
      const data = await stage.loader()
      
      if (signal?.aborted) return

      setState(prev => ({
        ...prev,
        [stage.key]: {
          data,
          loading: false,
          error: null,
          loaded: true
        }
      }))

      onStageComplete?.(stage.key, data)
    } catch (error) {
      if (signal?.aborted) return

      const err = error instanceof Error ? error : new Error('Loading failed')
      setState(prev => ({
        ...prev,
        [stage.key]: {
          ...prev[stage.key],
          loading: false,
          error: err
        }
      }))
    }
  }, [onStageComplete])

  const loadAllStages = useCallback(async () => {
    // Cancel any existing loading
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    const sortedStages = [...stagesRef.current].sort((a, b) => a.priority - b.priority)

    if (enableParallelLoading) {
      // Load all stages in parallel
      const promises = sortedStages.map(stage => loadStage(stage, signal))
      await Promise.allSettled(promises)
    } else {
      // Load stages sequentially with optional stagger delay
      for (const stage of sortedStages) {
        if (signal.aborted) break
        
        await loadStage(stage, signal)
        
        if (staggerDelay > 0 && !signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, staggerDelay))
        }
      }
    }

    // Check if all stages are complete
    setState(currentState => {
      const allLoaded = Object.values(currentState).every(stage => stage.loaded)
      if (allLoaded) {
        const allData: Record<string, T> = {}
        Object.entries(currentState).forEach(([key, stage]) => {
          if (stage.data !== null) {
            allData[key] = stage.data
          }
        })
        onAllStagesComplete?.(allData)
      }
      return currentState
    })
  }, [loadStage, enableParallelLoading, staggerDelay, onAllStagesComplete])

  const retryStage = useCallback(async (stageKey: string) => {
    const stage = stagesRef.current.find(s => s.key === stageKey)
    if (stage) {
      await loadStage(stage)
    }
  }, [loadStage])

  const retryAll = useCallback(() => {
    loadAllStages()
  }, [loadAllStages])

  useEffect(() => {
    loadAllStages()
    
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [loadAllStages])

  // Calculate overall progress
  const progress = {
    total: stages.length,
    loaded: Object.values(state).filter(stage => stage.loaded).length,
    loading: Object.values(state).some(stage => stage.loading),
    errors: Object.values(state).filter(stage => stage.error).length,
    percentage: stages.length > 0 ? 
      Math.round((Object.values(state).filter(stage => stage.loaded).length / stages.length) * 100) : 0
  }

  return {
    stages: state,
    progress,
    retryStage,
    retryAll,
    isComplete: progress.loaded === progress.total,
    hasErrors: progress.errors > 0
  }
}

// Utility component for progressive loading UI
export function ProgressiveLoadingIndicator({ 
  progress, 
  showPercentage = true,
  showDetails = false 
}: {
  progress: { loaded: number; total: number; percentage: number; loading: boolean }
  showPercentage?: boolean
  showDetails?: boolean
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <div className="w-16 bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      {showPercentage && (
        <span className="font-medium">{progress.percentage}%</span>
      )}
      {showDetails && (
        <span>({progress.loaded}/{progress.total})</span>
      )}
      {progress.loading && (
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  )
}