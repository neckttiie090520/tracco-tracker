import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  message?: string
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center bg-white p-8 rounded-2xl shadow-lg">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              เกิดข้อผิดพลาด
            </h2>
            <p className="text-gray-600 mb-6">
              {this.props.message || 'หน้านี้ประสบปัญหาทางเทคนิค กรุณาลองใหม่อีกครั้ง'}
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left text-sm bg-red-50 p-3 rounded mb-4">
                <summary className="cursor-pointer font-medium text-red-700">
                  รายละเอียดข้อผิดพลาด
                </summary>
                <pre className="mt-2 text-xs text-red-600 overflow-x-auto">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                รีโหลดหน้า
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                กลับหน้าหลัก
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Lazy loading error fallback component
export const LazyLoadErrorFallback: React.FC<{ error?: Error }> = ({ error }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-sm mx-auto text-center bg-white p-6 rounded-xl shadow-md">
        <div className="text-orange-500 text-3xl mb-3">🔄</div>
        <h3 className="font-semibold text-gray-900 mb-2">กำลังโหลดข้อมูล...</h3>
        <p className="text-gray-600 text-sm mb-4">
          หากใช้เวลานาน กรุณาลองรีโหลดหน้าใหม่
        </p>
        
        {error && process.env.NODE_ENV === 'development' && (
          <details className="text-left text-xs bg-orange-50 p-2 rounded mb-3">
            <summary className="cursor-pointer">รายละเอียดข้อผิดพลาด</summary>
            <pre className="mt-1 text-orange-700">{error.message}</pre>
          </details>
        )}
        
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
          >
            รีโหลด
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            หน้าหลัก
          </button>
        </div>
      </div>
    </div>
  )
}