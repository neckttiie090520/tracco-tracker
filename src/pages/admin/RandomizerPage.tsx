import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useAdmin } from '../../hooks/useAdmin'
import { AdminNavigation } from '../../components/admin/AdminNavigation'
import { supabase } from '../../services/supabase'
import { NewSlotMachine } from '../../components/admin/NewSlotMachine'

interface Session {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string
  max_participants: number
  is_active: boolean
}

interface SessionParticipant {
  id: string
  name: string
  email: string
  faculty?: string
  department?: string
}

interface Workshop {
  id: string
  title: string
  description?: string
  instructor?: string
  session_id?: string
}

interface Task {
  id: string
  title: string
  description?: string
  workshop_id: string
  workshop?: Workshop
}

interface SubmissionParticipant extends SessionParticipant {
  submissionCount?: number
  latestSubmission?: string
}

type RandomizerMode = 'session' | 'workshop' | 'task'

export function RandomizerPage() {
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const navigate = useNavigate()
  const [mode, setMode] = useState<RandomizerMode>('session')
  const [sessions, setSessions] = useState<Session[]>([])
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('')
  const [selectedTask, setSelectedTask] = useState<string>('')
  const [participants, setParticipants] = useState<SessionParticipant[]>([])
  const [submissionParticipants, setSubmissionParticipants] = useState<SubmissionParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingParticipants, setLoadingParticipants] = useState(false)

  // Note: Admin check is handled by AdminRoute wrapper

  // Fetch initial data
  useEffect(() => {
    fetchSessions()
    fetchWorkshops()
  }, [])

  // Fetch participants based on mode and selection
  useEffect(() => {
    if (mode === 'session' && selectedSession) {
      fetchParticipants(selectedSession)
    } else if (mode === 'workshop' && selectedWorkshop) {
      fetchWorkshopRegistrants(selectedWorkshop)
    } else if (mode === 'task' && selectedTask) {
      fetchTaskSubmitters(selectedTask)
    } else {
      setParticipants([])
      setSubmissionParticipants([])
    }
  }, [mode, selectedSession, selectedWorkshop, selectedTask])

  // Fetch tasks when workshop is selected
  useEffect(() => {
    if (selectedWorkshop) {
      fetchTasks(selectedWorkshop)
    } else {
      setTasks([])
      setSelectedTask('')
    }
  }, [selectedWorkshop])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('is_active', true)
        .order('start_date', { ascending: false })

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWorkshops = async () => {
    try {
      const { data, error } = await supabase
        .from('workshops')
        .select('*')
        .eq('is_active', true)
        .order('title', { ascending: true })

      if (error) throw error
      setWorkshops(data || [])
    } catch (error) {
      console.error('Error fetching workshops:', error)
    }
  }

  const fetchTasks = async (workshopId: string) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          workshop:workshops!tasks_workshop_id_fkey(id, title)
        `)
        .eq('workshop_id', workshopId)
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const fetchParticipants = async (sessionId: string) => {
    try {
      setLoadingParticipants(true)
      const { data, error } = await supabase
        .from('session_registrations')
        .select(`
          *,
          users (
            id,
            name,
            email,
            faculty,
            department
          )
        `)
        .eq('session_id', sessionId)
        .eq('status', 'registered')

      if (error) throw error

      const participantData = data?.map(reg => ({
        id: reg.users.id,
        name: reg.users.name || reg.users.email.split('@')[0],
        email: reg.users.email,
        faculty: reg.users.faculty,
        department: reg.users.department
      })) || []

      setParticipants(participantData)
    } catch (error) {
      console.error('Error fetching participants:', error)
      setParticipants([])
    } finally {
      setLoadingParticipants(false)
    }
  }

  

  const fetchWorkshopRegistrants = async (workshopId: string) => {
    try {
      setLoadingParticipants(true)
      const { data, error } = await supabase
        .from('workshop_registrations')
        .select(`
            *,
            users (
              id,
              name,
              email,
              faculty,
              department
            )
          `)
        .eq('workshop_id', workshopId)

      if (error) throw error

      const participantData = data?.map(reg => ({
        id: reg.users.id,
        name: reg.users.name || reg.users.email.split('@')[0],
        email: reg.users.email,
        faculty: reg.users.faculty,
        department: reg.users.department
      })) || []

      setParticipants(participantData)
    } catch (error) {
      console.error('Error fetching workshop registrants:', error)
      setParticipants([])
    } finally {
      setLoadingParticipants(false)
    }
  }

  const fetchTaskSubmitters = async (taskId: string) => {
    try {
      setLoadingParticipants(true)
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          user_id,
          status,
          submitted_at,
          user:users!submissions_user_id_fkey(
            id,
            name,
            email,
            faculty,
            department
          )
        `)
        .eq('task_id', taskId)
        .eq('status', 'submitted')

      if (error) throw error

      const submitters = data?.map(submission => ({
        id: submission.user.id,
        name: submission.user.name || submission.user.email.split('@')[0],
        email: submission.user.email,
        faculty: submission.user.faculty,
        department: submission.user.department,
        submissionCount: 1,
        latestSubmission: submission.submitted_at
      })) || []

      setSubmissionParticipants(submitters)
    } catch (error) {
      console.error('Error fetching task submitters:', error)
      setSubmissionParticipants([])
    } finally {
      setLoadingParticipants(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminNavigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  // Get current title and participants based on mode
  const getCurrentTitle = () => {
    switch (mode) {
      case 'session':
        return sessions.find(s => s.id === selectedSession)?.title || ''
      case 'workshop':
        return workshops.find(w => w.id === selectedWorkshop)?.title || ''
      case 'task':
        return tasks.find(t => t.id === selectedTask)?.title || ''
      default:
        return ''
    }
  }

  const getCurrentParticipants = () => {
    if (mode === 'session' || mode === 'workshop') {
      return participants
    } else { // mode === 'task'
      return submissionParticipants
    }
  }

  const handleModeChange = (newMode: RandomizerMode) => {
    setMode(newMode)
    // Reset selections when changing mode
    setSelectedSession('')
    setSelectedWorkshop('')
    setSelectedTask('')
    setParticipants([])
    setSubmissionParticipants([])
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminNavigation />
      
      <div className="flex-1 overflow-auto">
        <div className="p-0 h-full">
          {/* Slot Machine - now takes full width and height */}
          <NewSlotMachine
            participants={getCurrentParticipants()}
            sessionTitle={getCurrentTitle()}
            sessions={sessions}
            workshops={workshops}
            tasks={tasks}
            selectedSession={selectedSession}
            selectedWorkshop={selectedWorkshop}
            selectedTask={selectedTask}
            mode={mode}
            onModeChange={handleModeChange}
            onSessionChange={setSelectedSession}
            onWorkshopChange={setSelectedWorkshop}
            onTaskChange={setSelectedTask}
            loadingParticipants={loadingParticipants}
          />
        </div>
      </div>
    </div>
  )
}