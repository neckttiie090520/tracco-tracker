import React from 'react'
import { Link } from 'react-router-dom'
import { useRealtimeWorkshop } from '../../hooks/useRealtimeWorkshops'
import { LiveBadge, StatusDot } from '../common/LiveBadge'

interface RealtimeWorkshopCardProps {
  workshopId: string
  showLiveIndicators?: boolean
  showParticipantCount?: boolean
  className?: string
}

export function RealtimeWorkshopCard({ 
  workshopId, 
  showLiveIndicators = true,
  showParticipantCount = true,
  className = '' 
}: RealtimeWorkshopCardProps) {
  const { workshop, loading, error, lastUpdated } = useRealtimeWorkshop(workshopId)

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md overflow-hidden animate-pulse ${className}`}>
        <div className="p-6">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !workshop) {
    return (
      <div className={`bg-white rounded-lg shadow-md overflow-hidden border-red-200 ${className}`}>
        <div className="p-6">
          <div className="text-center text-red-600">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm">Failed to load workshop</p>
          </div>
        </div>
      </div>
    )
  }

  const participantCount = workshop.participant_count || 0
  const maxParticipants = workshop.max_participants || 150
  const participantPercentage = Math.round((participantCount / maxParticipants) * 100)
  const isFull = participantCount >= maxParticipants
  const isNearlyFull = participantPercentage >= 80

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBA'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 ${className}`}>
      <div className="p-6">
        {/* Header with Status Indicators */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-xl font-bold text-gray-900 line-clamp-2">
                {workshop.title}
              </h3>
              
              {showLiveIndicators && (
                <div className="flex items-center space-x-1">
                  <StatusDot 
                    status={workshop.is_active ? 'online' : 'offline'} 
                    size="sm"
                    pulse={workshop.is_active}
                  />
                  
                  {/* Recently updated indicator */}
                  {lastUpdated && Date.now() - lastUpdated.getTime() < 60000 && (
                    <LiveBadge
                      count={0}
                      variant="info"
                      size="sm"
                      pulse={true}
                      showZero={false}
                      className="animate-pulse"
                    >
                      NEW
                    </LiveBadge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-col items-end space-y-1">
            {isFull && (
              <LiveBadge variant="error" size="sm">
                Full
              </LiveBadge>
            )}
            
            {!isFull && isNearlyFull && (
              <LiveBadge variant="warning" size="sm">
                Nearly Full
              </LiveBadge>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3 whitespace-pre-line">
          {workshop.description || 'No description available.'}
        </p>

        {/* Workshop Details */}
        <div className="space-y-2 mb-4">
          {/* Instructor */}
          <div className="flex items-center text-sm text-gray-500">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {workshop.instructor || 'TBA'}
          </div>

          {/* Date and Time */}
          {workshop.start_time && (
            <div className="flex items-center text-sm text-gray-500">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(workshop.start_time)}
            </div>
          )}

          {/* Participant Count with Live Updates */}
          {showParticipantCount && (
            <div className="flex items-center text-sm text-gray-500">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="flex items-center space-x-2">
                <span>
                  {participantCount}/{maxParticipants} participants
                </span>
                <LiveBadge
                  count={participantCount}
                  maxCount={999}
                  variant={isFull ? 'error' : isNearlyFull ? 'warning' : 'success'}
                  size="sm"
                  className="ml-1"
                />
              </span>
            </div>
          )}

          {/* Progress Bar */}
          {showParticipantCount && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  isFull ? 'bg-red-500' : 
                  isNearlyFull ? 'bg-yellow-500' : 
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(participantPercentage, 100)}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Link
            to={`/workshops/${workshop.id}`}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
          >
            View Details →
          </Link>

          <div className="text-sm text-gray-500">
            {participantCount} participants
          </div>
        </div>

        {/* Last Updated Indicator */}
        {showLiveIndicators && lastUpdated && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Grid component for displaying multiple workshop cards
interface RealtimeWorkshopGridProps {
  workshopIds: string[]
  showLiveIndicators?: boolean
  showParticipantCount?: boolean
  emptyMessage?: string
  className?: string
}

export function RealtimeWorkshopGrid({
  workshopIds,
  showLiveIndicators = true,
  showParticipantCount = true,
  emptyMessage = "No workshops available.",
  className = ''
}: RealtimeWorkshopGridProps) {
  if (workshopIds.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {workshopIds.map((workshopId) => (
        <RealtimeWorkshopCard
          key={workshopId}
          workshopId={workshopId}
          showLiveIndicators={showLiveIndicators}
          showParticipantCount={showParticipantCount}
        />
      ))}
    </div>
  )
}