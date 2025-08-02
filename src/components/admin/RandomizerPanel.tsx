import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase'
import { SlotMachine } from './SlotMachine'

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

interface RandomizerPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function RandomizerPanel({ isOpen, onClose }: RandomizerPanelProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [participants, setParticipants] = useState<SessionParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingParticipants, setLoadingParticipants] = useState(false)

  // Fetch sessions
  useEffect(() => {
    if (isOpen) {
      fetchSessions()
    }
  }, [isOpen])

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎰</span>
            <h2 className="text-2xl font-bold text-gray-900">Lucky Draw Randomizer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : (
            <>
              {/* Session Selection */}
              <div className="mb-8">
                <label className="block text-gray-700 text-sm font-medium mb-3">
                  เลือก Session ที่จะสุ่ม
                </label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">เลือก Session</option>
                  {sessions.map(session => (
                    <option key={session.id} value={session.id}>
                      {session.title} ({new Date(session.start_date).toLocaleDateString('th-TH')})
                    </option>
                  ))}
                </select>
                
                {selectedSession && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      {loadingParticipants ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                          กำลังโหลดข้อมูลผู้เข้าร่วม...
                        </span>
                      ) : (
                        <span className="font-semibold text-gray-900">
                          ผู้เข้าร่วมทั้งหมด: {participants.length} คน
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Slot Machine */}
              {selectedSession && participants.length > 0 && (
                <div className="flex justify-center">
                  <SlotMachine
                    participants={participants}
                    sessionTitle={sessions.find(s => s.id === selectedSession)?.title || ''}
                  />
                </div>
              )}

              {/* Empty State */}
              {!selectedSession && (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🎲</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    เริ่ม Lucky Draw กันเลย!
                  </h3>
                  <p className="text-gray-600">
                    เลือก Session ที่ต้องการสุ่มผู้โชคดี
                  </p>
                </div>
              )}

              {selectedSession && participants.length === 0 && !loadingParticipants && (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">😔</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    ไม่มีผู้เข้าร่วมใน Session นี้
                  </h3>
                  <p className="text-gray-600">
                    กรุณาเลือก Session อื่นที่มีผู้ลงทะเบียนแล้ว
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}