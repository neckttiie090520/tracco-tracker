import React from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useAdmin } from '../../hooks/useAdmin'
import { AdminNavigation } from './AdminNavigation'

export function DebugRandomizer() {
  const { user } = useAuth()
  const { isAdmin, loading, userProfile } = useAdmin()

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminNavigation />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Debug Randomizer</h1>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
            
            <div className="space-y-4">
              <div>
                <strong>Auth User:</strong>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-sm">
                  {JSON.stringify({ id: user?.id, email: user?.email }, null, 2)}
                </pre>
              </div>
              
              <div>
                <strong>Admin Status:</strong>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-sm">
                  {JSON.stringify({ isAdmin, loading }, null, 2)}
                </pre>
              </div>
              
              <div>
                <strong>User Profile:</strong>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-sm">
                  {JSON.stringify(userProfile, null, 2)}
                </pre>
              </div>
              
              <div className="mt-6">
                <p className="text-lg">
                  {loading ? (
                    '⏳ Loading...'
                  ) : isAdmin ? (
                    '✅ User has admin access'
                  ) : (
                    '❌ User does not have admin access'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}