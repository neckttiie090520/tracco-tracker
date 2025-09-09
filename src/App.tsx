import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider'
import { RealtimeProvider } from './components/providers/RealtimeProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import { ErrorBoundary, LazyLoadErrorFallback } from './components/ErrorBoundary'
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

function App() {
  return (
    <ErrorBoundary message="แอปพลิเคชันประสบปัญหา กรุณารีโหลดหน้าเพื่อลองใหม่">
      <AuthProvider>
        <RealtimeProvider>
          <BrowserRouter future={{ v7_relativeSplatPath: true }}>
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
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workshops/:id"
            element={
              <ProtectedRoute>
                <WorkshopFeedPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sessions"
            element={
              <ProtectedRoute>
                <SessionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/session-feed"
            element={
              <ProtectedRoute>
                <SessionFeedPage />
              </ProtectedRoute>
            }
          />
          
          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/workshops"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <WorkshopManagement />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/participants"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <ParticipantManagement />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/batch-operations"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <BatchOperationsDashboard />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tasks"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <TaskManagement />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/sessions"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <SessionManager />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/randomizer"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <RandomizerPage />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          
          {/* Group Settings Route */}
          <Route
            path="/group-settings/:groupId"
            element={
              <ProtectedRoute>
                <GroupSettingsPage />
              </ProtectedRoute>
            }
          />
          
          {/* Test Route for Materials System */}
          <Route
            path="/materials-test"
            element={
              <ProtectedRoute>
                <MaterialsTest />
              </ProtectedRoute>
            }
          />
          
          {/* Error pages */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* 404 - Must be last */}
          <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </RealtimeProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App