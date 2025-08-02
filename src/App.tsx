import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider'
import { RealtimeProvider } from './components/providers/RealtimeProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { WorkshopDetailPage } from './pages/WorkshopDetailPage'
import { SessionsPage } from './pages/SessionsPage'
import { SessionFeedPage } from './pages/SessionFeedPage'
import { WorkshopFeedPage } from './pages/WorkshopFeedPage'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { WorkshopManagement } from './pages/admin/WorkshopManagement'
import { ParticipantManagement } from './pages/admin/ParticipantManagement'
import { TaskManagement } from './pages/admin/TaskManagement'
import { RandomizerPage } from './pages/admin/RandomizerPage'
import { DebugRandomizer } from './components/admin/DebugRandomizer'
import BatchOperationsDashboard from './components/admin/BatchOperationsDashboard'
import { MaterialsTest } from './pages/MaterialsTest'
import { SessionManager } from './components/admin/SessionManager'
import { NotFoundPage } from './pages/NotFoundPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'

function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </RealtimeProvider>
    </AuthProvider>
  )
}

export default App