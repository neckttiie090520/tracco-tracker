import { useState, useEffect, useCallback, useRef } from 'react'
import { workshopService } from '../services/workshops'
import { realtimeService, RealtimeEvent, RealtimeSubscription } from '../services/realtimeService'
import { Database } from '../types/database'
import { useAuth } from './useAuth'

type Workshop = Database['public']['Tables']['workshops']['Row']
type Registration = Database['public']['Tables']['workshop_registrations']['Row']

interface WorkshopWithParticipants extends Workshop {
  participant_count?: number
  user_registered?: boolean
  registrations?: Registration[]
}

interface UseRealtimeWorkshopsOptions {
  includeParticipantCount?: boolean
  includeUserRegistration?: boolean
  pollInterval?: number // Fallback polling interval in ms
}

export function useRealtimeWorkshops(options: UseRealtimeWorkshopsOptions = {}) {
  const { user } = useAuth()
  const {
    includeParticipantCount = true,
    includeUserRegistration = true,
    pollInterval = 30000 // 30 seconds fallback
  } = options

  const [workshops, setWorkshops] = useState<WorkshopWithParticipants[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const subscriptionsRef = useRef<RealtimeSubscription[]>([])
  const pollTimeoutRef = useRef<NodeJS.Timeout>()

  // Initial data fetch
  const fetchWorkshops = useCallback(async () => {
    try {
      setError(null)
      const data = await workshopService.getWorkshops()
      
      if (!data) {
        setWorkshops([])
        return
      }

      // Enhance workshops with participant counts and user registration status
      const enhancedWorkshops = await Promise.all(
        data.map(async (workshop) => {
          const enhanced: WorkshopWithParticipants = { ...workshop }

          try {
            if (includeParticipantCount) {
              const participants = await workshopService.getWorkshopParticipants(workshop.id)
              enhanced.participant_count = participants?.length || 0
              enhanced.registrations = participants || []
            }

            if (includeUserRegistration && user) {
              const isRegistered = await workshopService.isUserRegistered(workshop.id, user.id)
              enhanced.user_registered = isRegistered
            }
          } catch (error) {
            console.warn(`Failed to enhance workshop ${workshop.id}:`, error)
          }

          return enhanced
        })
      )

      setWorkshops(enhancedWorkshops)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workshops')
    } finally {
      setLoading(false)
    }
  }, [user, includeParticipantCount, includeUserRegistration])

  // Handle workshop changes
  const handleWorkshopChange = useCallback((event: RealtimeEvent<Workshop>) => {
    console.log('Workshop realtime event:', event)
    
    setWorkshops(current => {
      switch (event.eventType) {
        case 'INSERT':
          if (event.new) {
            const newWorkshop: WorkshopWithParticipants = {
              ...event.new,
              participant_count: 0,
              user_registered: false,
              registrations: []
            }
            return [...current, newWorkshop]
          }
          return current

        case 'UPDATE':
          if (event.new) {
            return current.map(workshop => 
              workshop.id === event.new!.id 
                ? { ...workshop, ...event.new! }
                : workshop
            )
          }
          return current

        case 'DELETE':
          if (event.old) {
            return current.filter(workshop => workshop.id !== event.old!.id)
          }
          return current

        default:
          return current
      }
    })
    
    setLastUpdated(new Date())
  }, [])

  // Handle registration changes
  const handleRegistrationChange = useCallback((event: RealtimeEvent<Registration>) => {
    console.log('Registration realtime event:', event)

    setWorkshops(current => {
      return current.map(workshop => {
        // Check if this registration affects this workshop
        const affectsWorkshop = 
          (event.new?.workshop_id === workshop.id) || 
          (event.old?.workshop_id === workshop.id)

        if (!affectsWorkshop) return workshop

        let updatedWorkshop = { ...workshop }

        switch (event.eventType) {
          case 'INSERT':
            if (event.new) {
              updatedWorkshop.participant_count = (workshop.participant_count || 0) + 1
              if (event.new.user_id === user?.id) {
                updatedWorkshop.user_registered = true
              }
              if (workshop.registrations) {
                updatedWorkshop.registrations = [...workshop.registrations, event.new]
              }
            }
            break

          case 'DELETE':
            if (event.old) {
              updatedWorkshop.participant_count = Math.max((workshop.participant_count || 0) - 1, 0)
              if (event.old.user_id === user?.id) {
                updatedWorkshop.user_registered = false
              }
              if (workshop.registrations) {
                updatedWorkshop.registrations = workshop.registrations.filter(
                  reg => reg.id !== event.old!.id
                )
              }
            }
            break
        }

        return updatedWorkshop
      })
    })

    setLastUpdated(new Date())
  }, [user?.id])

  // Setup real-time subscriptions
  useEffect(() => {
    if (!workshops.length && loading) return // Wait for initial data

    console.log('Setting up workshop realtime subscriptions')

    // Subscribe to workshop changes
    const workshopSub = realtimeService.subscribeToWorkshops(handleWorkshopChange)
    subscriptionsRef.current.push(workshopSub)

    // Subscribe to registration changes
    const registrationSub = realtimeService.subscribeToWorkshopRegistrations(
      undefined, // All workshops
      handleRegistrationChange
    )
    subscriptionsRef.current.push(registrationSub)

    return () => {
      console.log('Cleaning up workshop realtime subscriptions')
      subscriptionsRef.current.forEach(sub => sub.cleanup())
      subscriptionsRef.current = []
    }
  }, [handleWorkshopChange, handleRegistrationChange, workshops.length, loading])

  // Fallback polling when real-time is not available
  useEffect(() => {
    if (pollInterval > 0) {
      pollTimeoutRef.current = setInterval(() => {
        // Only poll if we haven't received real-time updates recently
        const timeSinceLastUpdate = Date.now() - lastUpdated.getTime()
        if (timeSinceLastUpdate > pollInterval * 2) {
          console.log('Fallback polling for workshops')
          fetchWorkshops()
        }
      }, pollInterval)

      return () => {
        if (pollTimeoutRef.current) {
          clearInterval(pollTimeoutRef.current)
        }
      }
    }
  }, [pollInterval, lastUpdated, fetchWorkshops])

  // Initial fetch
  useEffect(() => {
    fetchWorkshops()
  }, [fetchWorkshops])

  // Manual refresh function
  const refetch = useCallback(() => {
    setLoading(true)
    return fetchWorkshops()
  }, [fetchWorkshops])

  // Get specific workshop
  const getWorkshop = useCallback((id: string) => {
    return workshops.find(w => w.id === id)
  }, [workshops])

  // Get user's registered workshops
  const getUserWorkshops = useCallback(() => {
    return workshops.filter(w => w.user_registered)
  }, [workshops])

  return {
    workshops,
    loading,
    error,
    lastUpdated,
    refetch,
    getWorkshop,
    getUserWorkshops
  }
}

// Hook for a single workshop with real-time updates
export function useRealtimeWorkshop(workshopId: string, options: UseRealtimeWorkshopsOptions = {}) {
  const { workshops, loading, error, lastUpdated, refetch } = useRealtimeWorkshops(options)
  
  const workshop = workshops.find(w => w.id === workshopId)
  
  return {
    workshop,
    loading,
    error,
    lastUpdated,
    refetch
  }
}

// Hook for workshop participant count with real-time updates
export function useRealtimeWorkshopParticipants(workshopId: string) {
  const [participants, setParticipants] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const subscriptionRef = useRef<RealtimeSubscription>()

  // Fetch initial participants
  const fetchParticipants = useCallback(async () => {
    if (!workshopId) return
    
    try {
      setError(null)
      const data = await workshopService.getWorkshopParticipants(workshopId)
      setParticipants(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch participants')
    } finally {
      setLoading(false)
    }
  }, [workshopId])

  // Handle registration changes for this workshop
  const handleRegistrationChange = useCallback((event: RealtimeEvent<Registration>) => {
    setParticipants(current => {
      switch (event.eventType) {
        case 'INSERT':
          return event.new ? [...current, event.new] : current
        case 'DELETE':
          return event.old ? current.filter(p => p.id !== event.old!.id) : current
        default:
          return current
      }
    })
  }, [])

  useEffect(() => {
    fetchParticipants()
  }, [fetchParticipants])

  useEffect(() => {
    if (!workshopId) return

    // Subscribe to registration changes for this workshop
    subscriptionRef.current = realtimeService.subscribeToWorkshopRegistrations(
      workshopId,
      handleRegistrationChange
    )

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.cleanup()
      }
    }
  }, [workshopId, handleRegistrationChange])

  return {
    participants,
    participantCount: participants.length,
    loading,
    error,
    refetch: fetchParticipants
  }
}