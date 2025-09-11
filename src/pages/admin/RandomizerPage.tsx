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

export function RandomizerPage() {
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [participants, setParticipants] = useState<SessionParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingParticipants, setLoadingParticipants] = useState(false)

  // Note: Admin check is handled by AdminRoute wrapper

  // Fetch sessions
  useEffect(() => {
    fetchSessions()
  }, [])

  // Fetch participants when session is selected
  useEffect(() => {
    if (selectedSession) {
      fetchParticipants(selectedSession)
    } else {
      setParticipants([])
    }
  }, [selectedSession])

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
            department,
            role
          )
        `)
        .eq('session_id', sessionId)
        .eq('status', 'registered')

      if (error) throw error

      // Filter out admin users - only include participants
      const participantData = data?.filter(reg => reg.users.role === 'participant')
        .map(reg => ({
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

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminNavigation />
      
      <div className="flex-1 overflow-auto">
        <div className="p-0 h-full">
          {/* Slot Machine - now takes full width and height */}
          <NewSlotMachine
            participants={participants}
            sessionTitle={sessions.find(s => s.id === selectedSession)?.title || ''}
            sessions={sessions}
            selectedSession={selectedSession}
            onSessionChange={setSelectedSession}
            loadingParticipants={loadingParticipants}
          />
        </div>
      </div>
    </div>
  )
}