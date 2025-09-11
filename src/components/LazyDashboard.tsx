import React, { Suspense, lazy } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Loader2 } from 'lucide-react'

const PostList = lazy(() => import('./PostList'))
const UserList = lazy(() => import('./UserList'))
const StatsPanel = lazy(() => import('./StatsPanel'))
const ActivityFeed = lazy(() => import('./ActivityFeed'))

const DashboardCharts = lazy(() => 
  import('./DashboardCharts').then(module => ({
    default: module.DashboardCharts
  }))
)

const LoadingFallback = ({ text = 'Loading...' }: { text?: string }) => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
    <span className="text-gray-600">{text}</span>
  </div>
)

const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <h3 className="text-red-800 font-semibold mb-2">Something went wrong</h3>
    <p className="text-red-600 text-sm mb-3">{error.message}</p>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Try again
    </button>
  </div>
)

const LazySection: React.FC<{
  children: React.ReactNode
  fallback?: React.ReactNode
  errorFallback?: React.ComponentType<any>
}> = ({ children, fallback, errorFallback = ErrorFallback }) => {
  return (
    <ErrorBoundary FallbackComponent={errorFallback}>
      <Suspense fallback={fallback || <LoadingFallback />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

export const LazyDashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LazySection fallback={<LoadingFallback text="Loading posts..." />}>
            <PostList />
          </LazySection>
        </div>
        
        <div className="space-y-6">
          <LazySection fallback={<LoadingFallback text="Loading stats..." />}>
            <StatsPanel />
          </LazySection>
          
          <LazySection fallback={<LoadingFallback text="Loading users..." />}>
            <UserList />
          </LazySection>
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LazySection fallback={<LoadingFallback text="Loading charts..." />}>
          <DashboardCharts />
        </LazySection>
        
        <LazySection fallback={<LoadingFallback text="Loading activity..." />}>
          <ActivityFeed />
        </LazySection>
      </div>
    </div>
  )
}

export function useLazyImport<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  preload = false
) {
  const LazyComponent = lazy(importFn)
  
  React.useEffect(() => {
    if (preload) {
      importFn()
    }
  }, [preload])
  
  return LazyComponent
}

const PRELOAD_DELAY = 200

export function usePreloadOnHover() {
  const [shouldPreload, setShouldPreload] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout>()
  
  const handleMouseEnter = React.useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setShouldPreload(true)
    }, PRELOAD_DELAY)
  }, [])
  
  const handleMouseLeave = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])
  
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
  
  return {
    shouldPreload,
    handleMouseEnter,
    handleMouseLeave
  }
}

export const PreloadableSection: React.FC<{
  importFn: () => Promise<{ default: React.ComponentType<any> }>
  children?: (Component: React.ComponentType<any>) => React.ReactNode
}> = ({ importFn, children }) => {
  const { shouldPreload, handleMouseEnter, handleMouseLeave } = usePreloadOnHover()
  const LazyComponent = useLazyImport(importFn, shouldPreload)
  
  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <LazySection>
        {children ? children(LazyComponent) : <LazyComponent />}
      </LazySection>
    </div>
  )
}