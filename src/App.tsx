import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider'
import { RealtimeProvider } from './components/providers/RealtimeProvider'
import { QueryProvider } from './providers/QueryProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'

import { AlertProvider } from './contexts/AlertContext'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'

// Lazy load pages with error handling
const createLazyComponent = (importFn: () => Promise<any>, componentName: string) => {
  return lazy(() => 
    importFn().catch((error) => {
      console.error(`Failed to load ${componentName}:`, error)
      return { default: () => <LazyLoadErrorFallback error={error} /> }
    })
  )
}

const DashboardPage = createLazyComponent(
  () => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })),
  'DashboardPage'
)
const WorkshopDetailPage = createLazyComponent(
  () => import('./pages/WorkshopDetailPage').then(m => ({ default: m.WorkshopDetailPage })),
  'WorkshopDetailPage'
)
const SessionsPage = createLazyComponent(
  () => import('./pages/SessionsPage').then(m => ({ default: m.SessionsPage })),
  'SessionsPage'
)
const SessionFeedPage = createLazyComponent(
  () => import('./pages/SessionFeedPage').then(m => ({ default: m.SessionFeedPage })),
  'SessionFeedPage'
)
const WorkshopFeedPage = createLazyComponent(
  () => import('./pages/WorkshopFeedPage').then(m => ({ default: m.WorkshopFeedPage })),
  'WorkshopFeedPage'
)
const AdminDashboard = createLazyComponent(
  () => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })),
  'AdminDashboard'
)
const WorkshopManagement = createLazyComponent(
  () => import('./pages/admin/WorkshopManagement').then(m => ({ default: m.WorkshopManagement })),
  'WorkshopManagement'
)
const ParticipantManagement = createLazyComponent(
  () => import('./pages/admin/ParticipantManagement').then(m => ({ default: m.ParticipantManagement })),
  'ParticipantManagement'
)
const TaskManagement = createLazyComponent(
  () => import('./pages/admin/TaskManagement').then(m => ({ default: m.TaskManagement })),
  'TaskManagement'
)
const RandomizerPage = createLazyComponent(
  () => import('./pages/admin/RandomizerPage').then(m => ({ default: m.RandomizerPage })),
  'RandomizerPage'
)
const BatchOperationsDashboard = createLazyComponent(
  () => import('./components/admin/BatchOperationsDashboard'),
  'BatchOperationsDashboard'
)
const MaterialsTest = createLazyComponent(
  () => import('./pages/MaterialsTest').then(m => ({ default: m.MaterialsTest })),
  'MaterialsTest'
)
const SessionManager = createLazyComponent(
  () => import('./components/admin/SessionManager').then(m => ({ default: m.SessionManager })),
  'SessionManager'
)
const GroupSettingsPage = createLazyComponent(
  () => import('./pages/GroupSettingsPage'),
  'GroupSettingsPage'
)

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; message?: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; message?: string }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {this.props.message || 'Something went wrong'}
            </h1>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Lazy Load Error Fallback
function LazyLoadErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Failed to load page
        </h1>
        <p className="text-gray-600 mb-4">{error?.message || 'Unknown error'}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Reload Page
        </button>
      </div>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary message="แอปพลิเคชันเกิดข้อผิดพลาด กรุณาโหลดหน้าใหม่">
      <QueryProvider>
        <AlertProvider>
          <AuthProvider>
            <RealtimeProvider>
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-gray-600">กำลังโหลด...</p>
                  </div>
                </div>
              }>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                  <Route path="/workshops/:id" element={<ProtectedRoute><WorkshopFeedPage /></ProtectedRoute>} />
                  <Route path="/sessions" element={<ProtectedRoute><SessionsPage /></ProtectedRoute>} />
                  <Route path="/sessions/:sessionId/feed" element={<ProtectedRoute><SessionFeedPage /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
                  <Route path="/admin/workshops" element={<ProtectedRoute><AdminRoute><WorkshopManagement /></AdminRoute></ProtectedRoute>} />
                  <Route path="/admin/participants" element={<ProtectedRoute><AdminRoute><ParticipantManagement /></AdminRoute></ProtectedRoute>} />
                  <Route path="/admin/batch-operations" element={<ProtectedRoute><AdminRoute><BatchOperationsDashboard /></AdminRoute></ProtectedRoute>} />
                  <Route path="/admin/tasks" element={<ProtectedRoute><AdminRoute><TaskManagement /></AdminRoute></ProtectedRoute>} />
                  <Route path="/admin/sessions" element={<ProtectedRoute><AdminRoute><SessionManager /></AdminRoute></ProtectedRoute>} />
                  <Route path="/admin/randomizer" element={<ProtectedRoute><AdminRoute><RandomizerPage /></AdminRoute></ProtectedRoute>} />
                  <Route path="/group-settings/:groupId" element={<ProtectedRoute><GroupSettingsPage /></ProtectedRoute>} />
                  <Route path="/materials-test" element={<ProtectedRoute><MaterialsTest /></ProtectedRoute>} />
                  <Route path="/unauthorized" element={<UnauthorizedPage />} />
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </RealtimeProvider>
          </AuthProvider>
        </AlertProvider>
      </QueryProvider>
    </ErrorBoundary>
  )
}

export default App