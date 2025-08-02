import React, { createContext, useContext, useEffect, useRef } from 'react'
import { realtimeService } from '../../services/realtimeService'
import { useAuth } from '../../hooks/useAuth'

interface RealtimeContextValue {
  isInitialized: boolean
}

const RealtimeContext = createContext<RealtimeContextValue>({
  isInitialized: false
})

export function useRealtime() {
  return useContext(RealtimeContext)
}

interface RealtimeProviderProps {
  children: React.ReactNode
}

export function RealtimeProvider({ 
  children
}: RealtimeProviderProps) {
  const { user, isAuthenticated } = useAuth()
  const initializationRef = useRef(false)

  // Initialize real-time services when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user && !initializationRef.current) {
      console.log('🚀 Initializing real-time services for user:', user.email)
      
      // Mark as initialized to prevent multiple initializations
      initializationRef.current = true

      // Optional: You can add any global real-time setup here
      // For example, subscribing to system-wide notifications
      
      return () => {
        console.log('🧹 Cleaning up real-time services')
        realtimeService.cleanup()
        initializationRef.current = false
      }
    }
  }, [isAuthenticated, user])

  // Cleanup on unmount or when user logs out
  useEffect(() => {
    return () => {
      if (initializationRef.current) {
        realtimeService.cleanup()
      }
    }
  }, [])

  const contextValue: RealtimeContextValue = {
    isInitialized: initializationRef.current && isAuthenticated
  }

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  )
}

// HOC for components that need real-time functionality
export function withRealtime<P extends object>(
  Component: React.ComponentType<P>
) {
  return function RealtimeComponent(props: P) {
    const { isInitialized } = useRealtime()
    
    if (!isInitialized) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Connecting to real-time services...</p>
          </div>
        </div>
      )
    }
    
    return <Component {...props} />
  }
}

// Hook for components that need to wait for real-time initialization
export function useRealtimeReady() {
  const { isInitialized } = useRealtime()
  const [ready, setReady] = React.useState(false)

  useEffect(() => {
    if (isInitialized) {
      // Add a small delay to ensure all subscriptions are set up
      const timer = setTimeout(() => {
        setReady(true)
      }, 100)
      
      return () => clearTimeout(timer)
    } else {
      setReady(false)
    }
  }, [isInitialized])

  return ready
}