import { useState, useEffect, useCallback, useRef } from 'react'
import { adminService } from '../services/admin'
import { taskService } from '../services/tasks'
import { supabase } from '../services/supabase'
import { useAuth } from './useAuth'

export function useDashboardStats() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await adminService.getDashboardStats()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}

export function useAdminWorkshops() {
  const [workshops, setWorkshops] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkshops = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await adminService.getAllWorkshopsForAdmin()
      setWorkshops(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workshops')
    } finally {
      setLoading(false)
    }
  }

  const createWorkshop = async (workshopData: any, materials?: any[]) => {
    try {
      await adminService.createWorkshop(workshopData, materials)
      await fetchWorkshops() // Refresh the list
    } catch (error) {
      console.error('Error creating workshop:', error)
      throw error
    }
  }

  const updateWorkshop = async (workshopId: string, updates: any) => {
    try {
      await adminService.updateWorkshop(workshopId, updates)
      await fetchWorkshops() // Refresh the list
    } catch (error) {
      console.error('Error updating workshop:', error)
      throw error
    }
  }

  const deleteWorkshop = async (workshopId: string) => {
    try {
      await adminService.deleteWorkshop(workshopId)
      await fetchWorkshops() // Refresh the list
    } catch (error) {
      console.error('Error deleting workshop:', error)
      throw error
    }
  }

  useEffect(() => {
    fetchWorkshops()
  }, [])

  return {
    workshops,
    loading,
    error,
    createWorkshop,
    updateWorkshop,
    deleteWorkshop,
    refetch: fetchWorkshops
  }
}

export function useParticipants(workshopId?: string) {
  const [participants, setParticipants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchParticipants = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = workshopId 
        ? await adminService.getWorkshopParticipants(workshopId)
        : await adminService.getAllParticipants()
      setParticipants(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch participants')
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (participants.length > 0) {
      adminService.exportParticipantsCSV(participants)
    }
  }

  const getRandomParticipant = () => {
    return adminService.getRandomParticipant(participants)
  }

  useEffect(() => {
    fetchParticipants()
  }, [workshopId])

  return {
    participants,
    loading,
    error,
    exportCSV,
    getRandomParticipant,
    refetch: fetchParticipants
  }
}

export function useAdminTasks() {
  const [tasks, setTasks] = useState<any[]>([])
  const [workshops, setWorkshops] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      console.log('🔄 Fetching admin tasks data...')
      setLoading(true)
      setError(null)
      const [tasksData, workshopsData] = await Promise.all([
        adminService.getAllTasks(),
        adminService.getAllWorkshopsForAdmin()
      ])
      console.log('📝 Tasks fetched:', tasksData?.length || 0, 'tasks')
      console.log('🏫 Workshops fetched:', workshopsData?.length || 0, 'workshops')
      setTasks(tasksData || [])
      setWorkshops(workshopsData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks data')
    } finally {
      setLoading(false)
    }
  }

  const createTask = async (taskData: any) => {
    try {
      console.log('📋 useAdminTasks: Creating task with data:', taskData)
      await adminService.createTask(taskData)
      console.log('✅ useAdminTasks: Task created, refreshing data...')
      await fetchData() // Refresh the data
      console.log('🔄 useAdminTasks: Data refresh completed')
    } catch (error) {
      console.error('❌ useAdminTasks: Error creating task:', error)
      throw error
    }
  }

  const updateTask = async (taskId: string, updates: any) => {
    try {
      await adminService.updateTask(taskId, updates)
      await fetchData() // Refresh the data
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      await adminService.deleteTask(taskId)
      await fetchData() // Refresh the data
    } catch (error) {
      console.error('Error deleting task:', error)
      throw error
    }
  }

  const reorderTasks = async (workshopId: string, taskIds: string[]) => {
    try {
      await taskService.reorderTasks(workshopId, taskIds)
      await fetchData() // Refresh the data
    } catch (error) {
      console.error('Error reordering tasks:', error)
      throw error
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return {
    tasks,
    workshops,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks,
    refetch: fetchData
  }
}

// Hook สำหรับ Participant Dashboard
export function useParticipantData() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalWorkshops: 0,
    completedTasks: 0,
    totalTasks: 0,
    upcomingDeadlines: 0,
    activeSession: null,
    upcomingTasks: [],
    allUserWorkshops: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState(0)
  const lastFetchRef = useRef(0)
  
  // Cache duration: 15 minutes (increased to reduce frequent refreshes on tab switch)
  const CACHE_DURATION = 15 * 60 * 1000

  const fetchParticipantData = useCallback(async (forceRefresh = false) => {
    if (!user) {
      console.log('❌ No user, skipping fetch')
      return
    }

    // Check cache first
    const currentTime = Date.now()
    const cacheAge = lastFetchRef.current > 0 ? currentTime - lastFetchRef.current : 0
    const isCacheValid = lastFetchRef.current > 0 && cacheAge < CACHE_DURATION
    
    console.log(`🔍 Cache check:`, {
      forceRefresh,
      lastFetch: lastFetchRef.current > 0 ? new Date(lastFetchRef.current).toISOString() : 'never',
      cacheAge: `${Math.round(cacheAge / 1000)}s`,
      isCacheValid,
      CACHE_DURATION: `${CACHE_DURATION / 1000}s`
    })

    if (!forceRefresh && isCacheValid) {
      console.log('📦 Using cached participant data')
      return
    }

    try {
      console.log('🔄 Fetching participant data for:', user.id)
      setLoading(true)
      setError(null)

      // ใช้ adminService เหมือน TaskManagement เพื่อหลีกเลี่ยง RLS
      const [allTasks, allWorkshops] = await Promise.all([
        adminService.getAllTasks(),
        adminService.getAllWorkshopsForAdmin()
      ])

      console.log('📝 All tasks:', allTasks?.length || 0)
      console.log('🏫 All workshops:', allWorkshops?.length || 0)

      // ดึงการลงทะเบียนของ user
      const { data: sessionRegistrations } = await supabase
        .from('session_registrations')
        .select(`
          *,
          sessions (
            id,
            title,
            description
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'registered')

      const { data: workshopRegistrations } = await supabase
        .from('workshop_registrations')
        .select('workshop_id')
        .eq('user_id', user.id)

      console.log('📋 Session registrations:', sessionRegistrations?.length || 0)
      console.log('📋 Workshop registrations:', workshopRegistrations?.length || 0)

      // หา workshops ที่ user ลงทะเบียน
      let userWorkshopIds = new Set()
      let activeSession = null

      if (sessionRegistrations && sessionRegistrations.length > 0) {
        activeSession = sessionRegistrations[0].sessions
        
        // ดึง workshops จาก session
        const { data: sessionWorkshops } = await supabase
          .from('session_workshops')
          .select('workshop_id')
          .eq('session_id', sessionRegistrations[0].session_id)

        sessionWorkshops?.forEach(sw => userWorkshopIds.add(sw.workshop_id))
      }

      if (workshopRegistrations && workshopRegistrations.length > 0) {
        workshopRegistrations.forEach(wr => userWorkshopIds.add(wr.workshop_id))
      }

      console.log('🎯 User workshop IDs:', Array.from(userWorkshopIds))

      // Filter tasks สำหรับ workshops ที่ user ลงทะเบียน
      const userTasks = (allTasks || []).filter(task => 
        (task as any)?.is_active && !(task as any)?.is_archived && userWorkshopIds.has(task.workshop_id)
      ) || []

      console.log('📝 User tasks:', userTasks.length)

      // ดึง submissions ของ user
      const userTaskIds = userTasks.map(task => task.id)
      let submissions = []
      
      if (userTaskIds.length > 0) {
        const { data: submissionData } = await supabase
          .from('submissions')
          .select('*')
          .eq('user_id', user.id)
          .in('task_id', userTaskIds)

        submissions = submissionData || []
      }

      console.log('📤 User submissions:', submissions.length)

      // คำนวณสถิติ
      const completedTasks = submissions.filter(s => s.status === 'submitted').length
      const totalTasks = userTasks.length
      const totalWorkshops = new Set(
        Array.from(userWorkshopIds).filter((id: any) =>
          (allWorkshops || []).some((w: any) => w?.id === id && w?.is_active && !w?.is_archived)
        )
      ).size

      // คำนวณงานที่ใกล้ครบกำหนด (7 วัน)
      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const submissionsMap = new Map(submissions.map(s => [s.task_id, s]))

      console.log('📅 Date range check:')
      console.log('Now:', now.toISOString())
      console.log('Week from now:', weekFromNow.toISOString())
      console.log('📝 All user tasks with due dates:', userTasks.map(task => ({
        id: task.id,
        title: task.title,
        due_date: task.due_date,
        has_submission: submissionsMap.has(task.id),
        submission_status: submissionsMap.get(task.id)?.status
      })))

      const upcomingTasks = userTasks.filter(task => {
        console.log(`🔍 Checking task "${task.title}":`)
        console.log('  - due_date:', task.due_date)
        
        if (!task.due_date) {
          console.log('  ❌ No due date')
          return false
        }
        
        const submission = submissionsMap.get(task.id)
        console.log('  - submission:', submission?.status || 'none')
        
        if (submission?.status === 'submitted') {
          console.log('  ❌ Already submitted')
          return false
        }
        
        const dueDate = new Date(task.due_date)
        console.log('  - parsed due date:', dueDate.toISOString())
        console.log('  - is after now:', dueDate >= now)
        console.log('  - is within week:', dueDate <= weekFromNow)
        
        const isUpcoming = dueDate >= now && dueDate <= weekFromNow
        console.log('  - result:', isUpcoming ? '✅ UPCOMING' : '❌ Not upcoming')
        
        return isUpcoming
      }).map(task => {
        // เพิ่ม workshop title
        const workshop = (allWorkshops || []).find((w: any) => w?.id === task.workshop_id && w?.is_active && !w?.is_archived)
        return {
          ...task,
          workshop_title: workshop?.title || 'Unknown Workshop'
        }
      })

      console.log('⏰ Upcoming tasks:', upcomingTasks.length)

      // เพิ่มข้อมูล workshops และ tasks ทั้งหมดที่ user เข้าถึงได้
      const userWorkshopsWithTasks = (allWorkshops || [])
        .filter((workshop: any) => workshop?.is_active && !workshop?.is_archived)
        .filter((workshop: any) => userWorkshopIds.has(workshop.id))
        .map(workshop => {
          const workshopTasks = userTasks.filter(task => task.workshop_id === workshop.id)
          const workshopSubmissions = submissions.filter(s => 
            workshopTasks.some(task => task.id === s.task_id)
          )
          
          return {
            ...workshop,
            tasks: workshopTasks,
            taskCount: workshopTasks.length,
            completedCount: workshopSubmissions.filter(s => s.status === 'submitted').length,
            submissions: workshopSubmissions
          }
        }) || []

      setStats({
        totalWorkshops,
        completedTasks,
        totalTasks,
        upcomingDeadlines: upcomingTasks.length,
        activeSession,
        upcomingTasks: upcomingTasks.slice(0, 5), // เอาแค่ 5 งานแรก
        allUserWorkshops: userWorkshopsWithTasks // เพิ่มข้อมูลนี้
      })

      console.log('📊 Final stats:', {
        totalWorkshops,
        completedTasks,
        totalTasks,
        upcomingDeadlines: upcomingTasks.length
      })

      console.log('⏰ Upcoming tasks details:', upcomingTasks)
      
      // Set cache timestamp and save to sessionStorage
      const timestamp = Date.now()
      const newStats = {
        totalWorkshops,
        completedTasks,
        totalTasks,
        upcomingDeadlines: upcomingTasks.length,
        activeSession,
        upcomingTasks: upcomingTasks.slice(0, 5),
        allUserWorkshops: userWorkshopsWithTasks
      }
      
      setLastFetch(timestamp)
      lastFetchRef.current = timestamp
      saveToCache(newStats, timestamp)
      console.log('✅ Participant data fetch completed')

    } catch (err) {
      console.error('❌ Error fetching participant data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch participant data')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Initial fetch when user changes - try cache first
  useEffect(() => {
    if (user?.id) {
      const hasCachedData = loadCachedData()
      if (!hasCachedData) {
        fetchParticipantData()
      }
    }
  }, [user?.id, fetchParticipantData, loadCachedData])

  // Handle visibility change with throttling to prevent excessive refreshes
  useEffect(() => {
    let visibilityThrottle: NodeJS.Timeout | null = null
    
    const handleVisibilityChange = () => {
      console.log('👀 Visibility changed:', {
        hidden: document.hidden,
        userId: user?.id,
        lastFetch: lastFetchRef.current > 0 ? new Date(lastFetchRef.current).toISOString() : 'never'
      })
      
      // Clear any pending throttle
      if (visibilityThrottle) {
        clearTimeout(visibilityThrottle)
      }
      
      // Only process when tab becomes visible (not hidden)
      if (!document.hidden && user?.id) {
        // Throttle visibility refreshes to prevent rapid tab switching issues
        visibilityThrottle = setTimeout(() => {
          const currentTime = Date.now()
          const cacheAge = currentTime - lastFetchRef.current
          // More conservative refresh: only if cache is very stale (>= CACHE_DURATION)
          const shouldRefresh = lastFetchRef.current === 0 || cacheAge >= CACHE_DURATION
          
          console.log('🔄 Visibility check (throttled):', {
            cacheAge: `${Math.round(cacheAge / 1000)}s`,
            shouldRefresh,
            CACHE_DURATION: `${CACHE_DURATION / 1000}s`
          })
          
          if (shouldRefresh) {
            console.log('🚀 Triggering refresh from visibility change')
            fetchParticipantData()
          } else {
            console.log('📦 Cache still valid, skipping refresh')
          }
        }, 1000) // 1 second throttle
      }
    }

    console.log('📡 Setting up visibility listener with throttling', { userId: user?.id })
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      console.log('🧹 Cleaning up visibility listener')
      if (visibilityThrottle) {
        clearTimeout(visibilityThrottle)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.id, fetchParticipantData])

  return {
    stats,
    loading,
    error,
    refetch: (forceRefresh = false) => fetchParticipantData(forceRefresh),
    isCacheValid: lastFetchRef.current > 0 && (Date.now() - lastFetchRef.current) < CACHE_DURATION
  }
}
