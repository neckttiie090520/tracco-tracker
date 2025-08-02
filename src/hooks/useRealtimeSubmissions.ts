import { useState, useEffect, useCallback, useRef } from 'react'
import { submissionService } from '../services/submissions'
import { realtimeService, RealtimeEvent, RealtimeSubscription } from '../services/realtimeService'
import { supabase } from '../services/supabase'
import { Database } from '../types/database'
import { useAuth } from './useAuth'

type Submission = Database['public']['Tables']['submissions']['Row']

interface SubmissionWithUser extends Submission {
  user?: {
    id: string
    name: string
    email: string
  }
  task?: {
    id: string
    title: string
    workshop_id: string
  }
}

interface UseRealtimeSubmissionsOptions {
  includeUserInfo?: boolean
  includeTaskInfo?: boolean
  statusFilter?: Submission['status'][]
}

// Hook for user's own submissions
export function useRealtimeUserSubmissions(
  workshopId?: string,
  options: UseRealtimeSubmissionsOptions = {}
) {
  const { user } = useAuth()
  const { includeUserInfo = false, includeTaskInfo = true, statusFilter } = options

  const [submissions, setSubmissions] = useState<SubmissionWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const subscriptionRef = useRef<RealtimeSubscription>()

  // Fetch user submissions
  const fetchSubmissions = useCallback(async () => {
    if (!user) {
      setSubmissions([])
      setLoading(false)
      return
    }

    try {
      setError(null)
      const data = await submissionService.getUserSubmissions(user.id, workshopId)
      
      if (!data) {
        setSubmissions([])
        return
      }

      let filteredData = statusFilter 
        ? data.filter(sub => statusFilter.includes(sub.status))
        : data

      setSubmissions(filteredData)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch submissions')
    } finally {
      setLoading(false)
    }
  }, [user, workshopId, statusFilter])

  // Handle submission changes
  const handleSubmissionChange = useCallback((event: RealtimeEvent<Submission>) => {
    console.log('User submission realtime event:', event)

    // Only handle events for current user
    if (event.new?.user_id !== user?.id && event.old?.user_id !== user?.id) {
      return
    }

    setSubmissions(current => {
      switch (event.eventType) {
        case 'INSERT':
          if (event.new && (!statusFilter || statusFilter.includes(event.new.status))) {
            return [...current, event.new as SubmissionWithUser]
          }
          return current

        case 'UPDATE':
          if (event.new) {
            // Check if submission should be filtered out
            if (statusFilter && !statusFilter.includes(event.new.status)) {
              return current.filter(sub => sub.id !== event.new!.id)
            }
            
            return current.map(sub =>
              sub.id === event.new!.id
                ? { ...sub, ...event.new! }
                : sub
            )
          }
          return current

        case 'DELETE':
          if (event.old) {
            return current.filter(sub => sub.id !== event.old!.id)
          }
          return current

        default:
          return current
      }
    })

    setLastUpdated(new Date())
  }, [user?.id, statusFilter])

  // Setup real-time subscription
  useEffect(() => {
    if (!user || loading) return

    console.log('Setting up user submission realtime subscription')
    
    subscriptionRef.current = realtimeService.subscribeToUserSubmissions(
      user.id,
      handleSubmissionChange
    )

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.cleanup()
      }
    }
  }, [user, handleSubmissionChange, loading])

  // Initial fetch
  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  return {
    submissions,
    loading,
    error,
    lastUpdated,
    refetch: fetchSubmissions,
    totalSubmissions: submissions.length,
    submittedCount: submissions.filter(s => s.status === 'submitted').length,
    reviewedCount: submissions.filter(s => s.status === 'reviewed').length,
    draftCount: submissions.filter(s => s.status === 'draft').length
  }
}

// Hook for task submissions (admin view)
export function useRealtimeTaskSubmissions(
  taskId: string,
  options: UseRealtimeSubmissionsOptions = {}
) {
  const { includeUserInfo = true } = options

  const [submissions, setSubmissions] = useState<SubmissionWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const subscriptionRef = useRef<RealtimeSubscription>()

  // Fetch task submissions
  const fetchSubmissions = useCallback(async () => {
    if (!taskId) {
      setSubmissions([])
      setLoading(false)
      return
    }

    try {
      setError(null)
      const data = await submissionService.getTaskSubmissions(taskId)
      setSubmissions(data || [])
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch task submissions')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  // Handle submission changes
  const handleSubmissionChange = useCallback((event: RealtimeEvent<Submission>) => {
    console.log('Task submission realtime event:', event)

    setSubmissions(current => {
      switch (event.eventType) {
        case 'INSERT':
          if (event.new) {
            return [...current, event.new as SubmissionWithUser]
          }
          return current

        case 'UPDATE':
          if (event.new) {
            return current.map(sub =>
              sub.id === event.new!.id
                ? { ...sub, ...event.new! }
                : sub
            )
          }
          return current

        case 'DELETE':
          if (event.old) {
            return current.filter(sub => sub.id !== event.old!.id)
          }
          return current

        default:
          return current
      }
    })

    setLastUpdated(new Date())
  }, [])

  // Setup real-time subscription
  useEffect(() => {
    if (!taskId || loading) return

    console.log('Setting up task submission realtime subscription for task:', taskId)
    
    subscriptionRef.current = realtimeService.subscribeToTaskSubmissions(
      taskId,
      handleSubmissionChange
    )

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.cleanup()
      }
    }
  }, [taskId, handleSubmissionChange, loading])

  // Initial fetch
  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  return {
    submissions,
    loading,
    error,
    lastUpdated,
    refetch: fetchSubmissions,
    totalSubmissions: submissions.length,
    submittedCount: submissions.filter(s => s.status === 'submitted').length,
    reviewedCount: submissions.filter(s => s.status === 'reviewed').length,
    draftCount: submissions.filter(s => s.status === 'draft').length,
    pendingReviewCount: submissions.filter(s => s.status === 'submitted').length
  }
}

// Hook for workshop submissions (admin view)
export function useRealtimeWorkshopSubmissions(
  workshopId: string,
  options: UseRealtimeSubmissionsOptions = {}
) {
  const { includeUserInfo = true, includeTaskInfo = true, statusFilter } = options

  const [submissions, setSubmissions] = useState<SubmissionWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const subscriptionRef = useRef<RealtimeSubscription>()

  // Fetch workshop submissions
  const fetchSubmissions = useCallback(async () => {
    if (!workshopId) {
      setSubmissions([])
      setLoading(false)
      return
    }

    try {
      setError(null)
      // Get all submissions for tasks in this workshop
      const { data, error: fetchError } = await supabase
        .from('submissions')
        .select(`
          *,
          user:users(id, name, email),
          task:tasks(id, title, workshop_id)
        `)
        .eq('task.workshop_id', workshopId)
        .order('submitted_at', { ascending: false })

      if (fetchError) throw fetchError

      let filteredData = statusFilter 
        ? (data || []).filter(sub => statusFilter.includes(sub.status))
        : (data || [])

      setSubmissions(filteredData)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workshop submissions')
    } finally {
      setLoading(false)
    }
  }, [workshopId, statusFilter])

  // Handle submission changes
  const handleSubmissionChange = useCallback((event: RealtimeEvent<Submission>) => {
    console.log('Workshop submission realtime event:', event)

    setSubmissions(current => {
      switch (event.eventType) {
        case 'INSERT':
          if (event.new && (!statusFilter || statusFilter.includes(event.new.status))) {
            return [event.new as SubmissionWithUser, ...current]
          }
          return current

        case 'UPDATE':
          if (event.new) {
            // Check if submission should be filtered out
            if (statusFilter && !statusFilter.includes(event.new.status)) {
              return current.filter(sub => sub.id !== event.new!.id)
            }
            
            return current.map(sub =>
              sub.id === event.new!.id
                ? { ...sub, ...event.new! }
                : sub
            )
          }
          return current

        case 'DELETE':
          if (event.old) {
            return current.filter(sub => sub.id !== event.old!.id)
          }
          return current

        default:
          return current
      }
    })

    setLastUpdated(new Date())
  }, [statusFilter])

  // Setup real-time subscription
  useEffect(() => {
    if (!workshopId || loading) return

    console.log('Setting up workshop submission realtime subscription for workshop:', workshopId)
    
    subscriptionRef.current = realtimeService.subscribeToWorkshopSubmissions(
      workshopId,
      handleSubmissionChange
    )

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.cleanup()
      }
    }
  }, [workshopId, handleSubmissionChange, loading])

  // Initial fetch
  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  return {
    submissions,
    loading,
    error,
    lastUpdated,
    refetch: fetchSubmissions,
    totalSubmissions: submissions.length,
    submittedCount: submissions.filter(s => s.status === 'submitted').length,
    reviewedCount: submissions.filter(s => s.status === 'reviewed').length,
    draftCount: submissions.filter(s => s.status === 'draft').length,
    pendingReviewCount: submissions.filter(s => s.status === 'submitted').length,
    getSubmissionsByTask: (taskId: string) => submissions.filter(s => s.task_id === taskId),
    getSubmissionsByUser: (userId: string) => submissions.filter(s => s.user_id === userId)
  }
}

// Hook for single submission with real-time updates
export function useRealtimeSubmission(submissionId: string) {
  const [submission, setSubmission] = useState<SubmissionWithUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const subscriptionRef = useRef<RealtimeSubscription>()

  // Fetch submission
  const fetchSubmission = useCallback(async () => {
    if (!submissionId) return

    try {
      setError(null)
      const data = await submissionService.getSubmissionById(submissionId)
      setSubmission(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch submission')
    } finally {
      setLoading(false)
    }
  }, [submissionId])

  // Handle submission changes
  const handleSubmissionChange = useCallback((event: RealtimeEvent<Submission>) => {
    if (event.new?.id === submissionId || event.old?.id === submissionId) {
      switch (event.eventType) {
        case 'UPDATE':
          if (event.new) {
            setSubmission(current => current ? { ...current, ...event.new! } : null)
          }
          break
        case 'DELETE':
          setSubmission(null)
          break
      }
    }
  }, [submissionId])

  useEffect(() => {
    fetchSubmission()
  }, [fetchSubmission])

  useEffect(() => {
    if (!submissionId) return

    // Subscribe to all submission changes (we'll filter in the handler)
    subscriptionRef.current = realtimeService.subscribeToUserSubmissions(
      'all', // We need a way to subscribe to all submissions for this case
      handleSubmissionChange
    )

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.cleanup()
      }
    }
  }, [submissionId, handleSubmissionChange])

  return {
    submission,
    loading,
    error,
    refetch: fetchSubmission
  }
}