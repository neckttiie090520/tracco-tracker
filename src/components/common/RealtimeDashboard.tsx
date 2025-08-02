import React from 'react'
import { useRealtimeWorkshops } from '../../hooks/useRealtimeWorkshops'
import { useAuth } from '../../hooks/useAuth'
import { LiveCounter, StatusDot } from './LiveBadge'
import { ConnectionStatus, ConnectionIndicator } from './ConnectionStatus'

interface RealtimeDashboardProps {
  showConnectionStatus?: boolean
  showLiveStats?: boolean
  className?: string
}

export function RealtimeDashboard({
  showConnectionStatus = true,
  showLiveStats = true,
  className = ''
}: RealtimeDashboardProps) {
  const { user } = useAuth()
  const { workshops, loading: workshopsLoading } = useRealtimeWorkshops()

  // Calculate live statistics
  const stats = {
    totalWorkshops: workshops.length,
    activeWorkshops: workshops.filter(w => w.is_active).length,
    userRegistrations: workshops.filter(w => w.user_registered).length,
    totalParticipants: workshops.reduce((sum, w) => sum + (w.participant_count || 0), 0)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Connection Status */}
      {showConnectionStatus && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Connection Status</h3>
          <ConnectionStatus showLabel={true} />
        </div>
      )}

      {/* Live Statistics */}
      {showLiveStats && !workshopsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <LiveCounter
            label="Total Workshops"
            count={stats.totalWorkshops}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />
          
          <LiveCounter
            label="Active Workshops"
            count={stats.activeWorkshops}
            trend={stats.activeWorkshops > 0 ? 'up' : 'neutral'}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />

          {user?.role !== 'admin' && (
            <LiveCounter
              label="My Registrations"
              count={stats.userRegistrations}
              trend={stats.userRegistrations > 0 ? 'up' : 'neutral'}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
          )}

          {user?.role === 'admin' && (
            <LiveCounter
              label="Total Participants"
              count={stats.totalParticipants}
              trend={stats.totalParticipants > 0 ? 'up' : 'neutral'}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
          )}

        </div>
      )}


      {/* Workshop Status Overview */}
      {workshops.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Workshop Status</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workshops.slice(0, 6).map((workshop) => (
              <div key={workshop.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 truncate">
                    {workshop.title}
                  </h4>
                  <StatusDot 
                    status={workshop.is_active ? 'online' : 'offline'}
                    size="sm"
                  />
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Participants</span>
                  <div className="flex items-center space-x-1">
                    <span>{workshop.participant_count || 0}</span>
                    <span>/</span>
                    <span>{workshop.max_participants}</span>
                  </div>
                </div>
                
                {workshop.user_registered && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Registered
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

// Compact version for headers/sidebars
export function RealtimeIndicators({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <ConnectionIndicator />
    </div>
  )
}