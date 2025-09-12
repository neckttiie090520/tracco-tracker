import React, { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAdmin } from '../hooks/useAdmin'

interface AdminRouteProps {
  children: ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { isAdmin, loading, userProfile } = useAdmin()

  // Development mode bypass for testing
  const isDevelopment = import.meta.env.DEV
  
  if (isDevelopment) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}