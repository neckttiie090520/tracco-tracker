import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider'
import { RealtimeProvider } from './components/providers/RealtimeProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import { LoginPage } from './pages/LoginPage'
// Lazy load pages to reduce initial bundle size
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const WorkshopDetailPage = lazy(() => import('./pages/WorkshopDetailPage').then(m => ({ default: m.WorkshopDetailPage })))
const SessionsPage = lazy(() => import('./pages/SessionsPage').then(m => ({ default: m.SessionsPage })))
const SessionFeedPage = lazy(() => import('./pages/SessionFeedPage').then(m => ({ default: m.SessionFeedPage })))
const WorkshopFeedPage = lazy(() => import('./pages/WorkshopFeedPage').then(m => ({ default: m.WorkshopFeedPage })))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const WorkshopManagement = lazy(() => import('./pages/admin/WorkshopManagement').then(m => ({ default: m.WorkshopManagement })))
const ParticipantManagement = lazy(() => import('./pages/admin/ParticipantManagement').then(m => ({ default: m.ParticipantManagement })))
const TaskManagement = lazy(() => import('./pages/admin/TaskManagement').then(m => ({ default: m.TaskManagement })))
const RandomizerPage = lazy(() => import('./pages/admin/RandomizerPage').then(m => ({ default: m.RandomizerPage })))
const DebugRandomizer = lazy(() => import('./components/admin/DebugRandomizer').then(m => ({ default: m.DebugRandomizer })))
const BatchOperationsDashboard = lazy(() => import('./components/admin/BatchOperationsDashboard'))
const MaterialsTest = lazy(() => import('./pages/MaterialsTest').then(m => ({ default: m.MaterialsTest })))
const SessionManager = lazy(() => import('./components/admin/SessionManager').then(m => ({ default: m.SessionManager })))
const GroupSettingsPage = lazy(() => import('./pages/GroupSettingsPage'))
import { NotFoundPage } from './pages/NotFoundPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'

function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <BrowserRouter>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
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
  )
}

export default App