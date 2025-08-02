import { useState, useEffect, useCallback, useRef } from 'react'
import { taskService } from '../services/tasks'
import { realtimeService, RealtimeEvent, RealtimeSubscription } from '../services/realtimeService'
import { Database } from '../types/database'
import { useAuth } from './useAuth'

type Task = Database['public']['Tables']['tasks']['Row']
type Submission = Database['public']['Tables']['submissions']['Row']

interface TaskWithSubmissions extends Task {
  submissions?: Submission[]
  submission_count?: number
  user_submission?: Submission
  user_submitted?: boolean
}

interface UseRealtimeTasksOptions {
  includeSubmissions?: boolean
  includeUserSubmission?: boolean
  activeOnly?: boolean
}

export function useRealtimeTasks(
  workshopId?: string, 
  options: UseRealtimeTasksOptions = {}
) {
  const { user } = useAuth()
  const {
    includeSubmissions = false,
    includeUserSubmission = true,
    activeOnly = true
  } = options

  const [tasks, setTasks] = useState<TaskWithSubmissions[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const subscriptionsRef = useRef<RealtimeSubscription[]>([])

  // Fetch tasks data
  const fetchTasks = useCallback(async () => {
    if (!workshopId) {
      setTasks([])
      setLoading(false)
      return
    }

    try {
      setError(null)
      const data = await taskService.getWorkshopTasks(workshopId)
      
      if (!data) {
        setTasks([])
        return
      }

      let filteredTasks = activeOnly ? data.filter(task => task.is_active) : data

      // Enhance tasks with submission data
      const enhancedTasks = await Promise.all(
        filteredTasks.map(async (task) => {
          const enhanced: TaskWithSubmissions = { ...task }

          try {
            if (includeSubmissions) {
              const submissions = await taskService.getTaskSubmissions(task.id)
              enhanced.submissions = submissions || []
              enhanced.submission_count = submissions?.length || 0
            }

            if (includeUserSubmission && user) {
              const userSubmission = await taskService.getUserTaskSubmission(user.id, task.id)
              enhanced.user_submission = userSubmission || undefined
              enhanced.user_submitted = !!userSubmission
            }
          } catch (error) {
            console.warn(`Failed to enhance task ${task.id}:`, error)
          }

          return enhanced
        })
      )

      setTasks(enhancedTasks.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)))
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }, [workshopId, user, includeSubmissions, includeUserSubmission, activeOnly])

  // Handle task changes
  const handleTaskChange = useCallback((event: RealtimeEvent<Task>) => {
    console.log('Task realtime event:', event)

    if (workshopId && event.new?.workshop_id !== workshopId && event.old?.workshop_id !== workshopId) {
      return // Not for our workshop
    }

    setTasks(current => {
      switch (event.eventType) {
        case 'INSERT':
          if (event.new && (!activeOnly || event.new.is_active)) {
            const newTask: TaskWithSubmissions = {
              ...event.new,
              submissions: [],
              submission_count: 0,
              user_submitted: false
            }
            const updated = [...current, newTask]
            return updated.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
          }
          return current

        case 'UPDATE':
          if (event.new) {
            // Filter out if it's now inactive and we only want active
            if (activeOnly && !event.new.is_active) {
              return current.filter(task => task.id !== event.new!.id)
            }
            
            const updated = current.map(task =>
              task.id === event.new!.id
                ? { ...task, ...event.new! }
                : task
            )
            return updated.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
          }
          return current

        case 'DELETE':
          if (event.old) {
            return current.filter(task => task.id !== event.old!.id)
          }
          return current

        default:
          return current
      }
    })

    setLastUpdated(new Date())
  }, [workshopId, activeOnly])

  // Handle submission changes
  const handleSubmissionChange = useCallback((event: RealtimeEvent<Submission>) => {
    console.log('Submission realtime event:', event)

    setTasks(current => {
      return current.map(task => {
        // Check if this submission affects this task
        const affectsTask = 
          (event.new?.task_id === task.id) || 
          (event.old?.task_id === task.id)

        if (!affectsTask) return task

        let updatedTask = { ...task }

        switch (event.eventType) {
          case 'INSERT':
            if (event.new) {
              if (task.submissions) {
                updatedTask.submissions = [...task.submissions, event.new]
              }
              updatedTask.submission_count = (task.submission_count || 0) + 1
              
              if (event.new.user_id === user?.id) {
                updatedTask.user_submission = event.new
                updatedTask.user_submitted = true
              }
            }
            break

          case 'UPDATE':
            if (event.new) {
              if (task.submissions) {
                updatedTask.submissions = task.submissions.map(sub =>
                  sub.id === event.new!.id ? event.new! : sub
                )
              }
              
              if (event.new.user_id === user?.id) {
                updatedTask.user_submission = event.new
                updatedTask.user_submitted = event.new.status === 'submitted'
              }
            }
            break

          case 'DELETE':
            if (event.old) {
              if (task.submissions) {
                updatedTask.submissions = task.submissions.filter(sub => sub.id !== event.old!.id)
              }
              updatedTask.submission_count = Math.max((task.submission_count || 0) - 1, 0)
              
              if (event.old.user_id === user?.id) {
                updatedTask.user_submission = undefined
                updatedTask.user_submitted = false
              }
            }
            break
        }

        return updatedTask
      })
    })

    setLastUpdated(new Date())
  }, [user?.id])

  // Setup real-time subscriptions
  useEffect(() => {
    if (!workshopId || (loading && tasks.length === 0)) return

    console.log('Setting up task realtime subscriptions for workshop:', workshopId)

    // Subscribe to task changes for this workshop
    const taskSub = realtimeService.subscribeToWorkshopTasks(workshopId, handleTaskChange)
    subscriptionsRef.current.push(taskSub)

    // Subscribe to submission changes if needed
    if (includeSubmissions || includeUserSubmission) {
      const submissionSub = realtimeService.subscribeToWorkshopSubmissions(
        workshopId,
        handleSubmissionChange
      )
      subscriptionsRef.current.push(submissionSub)
    }

    return () => {
      console.log('Cleaning up task realtime subscriptions')
      subscriptionsRef.current.forEach(sub => sub.cleanup())
      subscriptionsRef.current = []
    }
  }, [
    workshopId, 
    handleTaskChange, 
    handleSubmissionChange, 
    includeSubmissions, 
    includeUserSubmission,
    loading,
    tasks.length
  ])

  // Initial fetch
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Manual refresh
  const refetch = useCallback(() => {
    setLoading(true)
    return fetchTasks()
  }, [fetchTasks])

  // Get specific task
  const getTask = useCallback((taskId: string) => {
    return tasks.find(t => t.id === taskId)
  }, [tasks])

  // Get user's completed tasks
  const getCompletedTasks = useCallback(() => {
    return tasks.filter(t => t.user_submitted)
  }, [tasks])

  // Get pending tasks for user
  const getPendingTasks = useCallback(() => {
    return tasks.filter(t => !t.user_submitted)
  }, [tasks])

  return {
    tasks,
    loading,
    error,
    lastUpdated,
    refetch,
    getTask,
    getCompletedTasks,
    getPendingTasks,
    totalTasks: tasks.length,
    completedTasksCount: tasks.filter(t => t.user_submitted).length,
    pendingTasksCount: tasks.filter(t => !t.user_submitted).length
  }
}

// Hook for a specific task with real-time updates
export function useRealtimeTask(taskId: string, options: UseRealtimeTasksOptions = {}) {
  const [task, setTask] = useState<TaskWithSubmissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const subscriptionsRef = useRef<RealtimeSubscription[]>([])
  const { user } = useAuth()
  const { includeSubmissions = true, includeUserSubmission = true } = options

  // Fetch task data
  const fetchTask = useCallback(async () => {
    if (!taskId) return

    try {
      setError(null)
      const taskData = await taskService.getTaskById(taskId)
      
      if (!taskData) {
        setTask(null)
        return
      }

      const enhanced: TaskWithSubmissions = { ...taskData }

      if (includeSubmissions) {
        const submissions = await taskService.getTaskSubmissions(taskId)
        enhanced.submissions = submissions || []
        enhanced.submission_count = submissions?.length || 0
      }

      if (includeUserSubmission && user) {
        const userSubmission = await taskService.getUserTaskSubmission(user.id, taskId)
        enhanced.user_submission = userSubmission || undefined
        enhanced.user_submitted = !!userSubmission
      }

      setTask(enhanced)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch task')
    } finally {
      setLoading(false)
    }
  }, [taskId, user, includeSubmissions, includeUserSubmission])

  // Handle task changes
  const handleTaskChange = useCallback((event: RealtimeEvent<Task>) => {
    if (event.new?.id === taskId || event.old?.id === taskId) {
      switch (event.eventType) {
        case 'UPDATE':
          if (event.new) {
            setTask(current => current ? { ...current, ...event.new! } : null)
          }
          break
        case 'DELETE':
          setTask(null)
          break
      }
    }
  }, [taskId])

  // Handle submission changes
  const handleSubmissionChange = useCallback((event: RealtimeEvent<Submission>) => {
    const affectsTask = 
      (event.new?.task_id === taskId) || 
      (event.old?.task_id === taskId)

    if (affectsTask) {
      setTask(current => {
        if (!current) return null

        let updated = { ...current }

        switch (event.eventType) {
          case 'INSERT':
            if (event.new) {
              if (current.submissions) {
                updated.submissions = [...current.submissions, event.new]
              }
              updated.submission_count = (current.submission_count || 0) + 1
              
              if (event.new.user_id === user?.id) {
                updated.user_submission = event.new
                updated.user_submitted = true
              }
            }
            break

          case 'UPDATE':
            if (event.new) {
              if (current.submissions) {
                updated.submissions = current.submissions.map(sub =>
                  sub.id === event.new!.id ? event.new! : sub
                )
              }
              
              if (event.new.user_id === user?.id) {
                updated.user_submission = event.new
              }
            }
            break

          case 'DELETE':
            if (event.old) {
              if (current.submissions) {
                updated.submissions = current.submissions.filter(sub => sub.id !== event.old!.id)
              }
              updated.submission_count = Math.max((current.submission_count || 0) - 1, 0)
              
              if (event.old.user_id === user?.id) {
                updated.user_submission = undefined
                updated.user_submitted = false
              }
            }
            break
        }

        return updated
      })
    }
  }, [taskId, user?.id])

  useEffect(() => {
    fetchTask()
  }, [fetchTask])

  useEffect(() => {
    if (!taskId) return

    // Subscribe to all task changes (we'll filter in the handler)
    const taskSub = realtimeService.subscribeToAllTasks(handleTaskChange)
    subscriptionsRef.current.push(taskSub)

    // Subscribe to submission changes for this task
    if (includeSubmissions || includeUserSubmission) {
      const submissionSub = realtimeService.subscribeToTaskSubmissions(
        taskId,
        handleSubmissionChange
      )
      subscriptionsRef.current.push(submissionSub)
    }

    return () => {
      subscriptionsRef.current.forEach(sub => sub.cleanup())
      subscriptionsRef.current = []
    }
  }, [taskId, handleTaskChange, handleSubmissionChange, includeSubmissions, includeUserSubmission])

  return {
    task,
    loading,
    error,
    refetch: fetchTask
  }
}