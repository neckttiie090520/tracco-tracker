// Example: Optimized Dashboard Component
// Demonstrates parallel fetching with React Query

import React from 'react'
import { useOptimizedUsersAndWorkshops, useOptimizedTaskManagement } from '../../hooks/useOptimizedQueries'

export function OptimizedDashboard() {
  // **EXAMPLE: Parallel fetch users + workshops simultaneously**
  // This replaces multiple useEffect calls with a single optimized hook
  const {
    users,
    workshops,
    isLoading,
    isError,
    error,
    refetchAll
  } = useOptimizedUsersAndWorkshops()

  // **EXAMPLE: Task Management parallel fetch**
  // Gets tasks, workshops, and dashboard stats in parallel
  const taskManagement = useOptimizedTaskManagement()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading dashboard data...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">Error loading dashboard</h3>
        <p className="text-red-600 text-sm mt-1">{error?.message}</p>
        <button
          onClick={() => refetchAll()}
          className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">📊 Performance Optimized Dashboard</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Users Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800">Total Users</h3>
            <p className="text-2xl font-bold text-blue-600">{users?.length || 0}</p>
            <p className="text-sm text-blue-600">
              Cached for {Math.floor((Date.now() - (users as any)?._cacheTime || 0) / 1000)}s
            </p>
          </div>

          {/* Workshops Summary */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-green-800">Active Workshops</h3>
            <p className="text-2xl font-bold text-green-600">{workshops?.length || 0}</p>
            <p className="text-sm text-green-600">
              Real-time updates enabled
            </p>
          </div>

          {/* Task Management Summary */}
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800">Total Tasks</h3>
            <p className="text-2xl font-bold text-purple-600">{taskManagement.tasks?.length || 0}</p>
            <p className="text-sm text-purple-600">
              {taskManagement.isLoading ? 'Loading...' : 'Data fresh'}
            </p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">⚡ Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Parallel Queries:</span>
              <span className="ml-2 text-green-600">✅ Users + Workshops fetched simultaneously</span>
            </div>
            <div>
              <span className="font-medium">Cache Strategy:</span>
              <span className="ml-2 text-blue-600">📦 10min stale time for stable data</span>
            </div>
            <div>
              <span className="font-medium">Data Freshness:</span>
              <span className="ml-2 text-purple-600">🔄 Real-time updates on mutations</span>
            </div>
            <div>
              <span className="font-medium">Memory Usage:</span>
              <span className="ml-2 text-orange-600">🗄️ Smart garbage collection</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => refetchAll()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            🔄 Refresh All Data
          </button>
          <button
            onClick={() => taskManagement.refetchAll()}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            📊 Refresh Tasks
          </button>
        </div>
      </div>

      {/* Users List Example */}
      {users && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">👥 Users (Cached)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {users.slice(0, 6).map((user: any) => (
              <div key={user.id} className="bg-gray-50 rounded p-3">
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-xs text-blue-600">{user.role}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workshops List Example */}
      {workshops && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">🏫 Workshops (Cached)</h3>
          <div className="space-y-3">
            {workshops.slice(0, 5).map((workshop: any) => (
              <div key={workshop.id} className="border rounded-lg p-4">
                <h4 className="font-semibold">{workshop.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{workshop.description}</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>👨‍🏫 {workshop.instructor_user?.name || 'No instructor'}</span>
                  <span>👥 Max: {workshop.max_participants}</span>
                  {workshop.start_time && (
                    <span>📅 {new Date(workshop.start_time).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper component to show cache status
export function CacheStatus({ queryKey, data }: { queryKey: string, data: any }) {
  return (
    <div className="text-xs text-gray-500 mt-1">
      <span className="font-medium">Cache:</span> {queryKey} 
      {data && <span className="ml-2">({JSON.stringify(data).length} bytes)</span>}
    </div>
  )
}