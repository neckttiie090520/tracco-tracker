import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../services/supabase'
import { UserNavigation } from '../components/user/UserNavigation'
import { BackButton } from '../components/common/BackButton'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useNavigate } from 'react-router-dom'

interface Session {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string
  max_participants: number
  is_active: boolean
}

interface SessionWithRegistration extends Session {
  isRegistered: boolean
  registration?: {
    id: string
    status: string
    registered_at: string
  }
}

export function SessionsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionWithRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState<string | null>(null)
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (user) {
      fetchSessions()
    }
  }, [user])

  const fetchSessions = async () => {
    try {
      setLoading(true)

      // Fetch all active sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('is_archived', false)
        .eq('is_active', true)
        .order('start_date', { ascending: true })

      if (sessionsError) throw sessionsError

      // Fetch user's session registrations
      const { data: registrations, error: regError } = await supabase
        .from('session_registrations')
        .select('*')
        .eq('user_id', user?.id)

      if (regError) throw regError

      // Combine sessions with registration status
      const sessionsWithRegistration: SessionWithRegistration[] = (sessionsData || []).map(session => {
        const registration = registrations?.find(reg => reg.session_id === session.id)
        return {
          ...session,
          isRegistered: !!registration,
          registration
        }
      })

      setSessions(sessionsWithRegistration)
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const registerForSession = async (sessionId: string) => {
    if (!user) return

    try {
      setRegistering(sessionId)

      const { error } = await supabase
        .from('session_registrations')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          status: 'registered'
        })

      if (error) throw error

      // Refresh sessions data
      await fetchSessions()
      
      // Navigate to dashboard after successful registration
      navigate('/dashboard')
    } catch (error) {
      console.error('Error registering for session:', error)
      alert('เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง')
    } finally {
      setRegistering(null)
    }
  }

  const toggleDescription = (sessionId: string) => {
    setExpandedSessions(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">กำลังโหลดงานสัมมนา...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavigation />
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-4">
          <BackButton to="/dashboard" />
        </div>
        {/* Minimal Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            🎯 งานสัมมนาทั้งหมด
          </h1>
          <p className="text-sm text-gray-600">
            เลือกงานสัมมนาที่คุณต้องการเข้าร่วม
          </p>
        </div>
        {/* Minimal Stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-700 rounded-full">
              📊 ทั้งหมด {sessions.length}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full">
              ✅ ลงทะเบียนแล้ว {sessions.filter(s => s.isRegistered).length}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
              📝 เปิดรับสมัคร {sessions.filter(s => !s.isRegistered).length}
            </span>
          </div>
        </div>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-3">📅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ยังไม่มีงานสัมมนา
            </h3>
            <p className="text-sm text-gray-600">
              ยังไม่มีงานสัมมนาที่เปิดให้ลงทะเบียน
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sessions.map((session) => {
              const startDate = new Date(session.start_date)
              const endDate = new Date(session.end_date)
              const isRegistering = registering === session.id
              
              // Facebook-style read more - using shared state
              const showFullDescription = expandedSessions[session.id] || false
              const descriptionPreview = session.description?.slice(0, 120) || ''
              const hasLongDescription = (session.description?.length || 0) > 120

              return (
                <div 
                  key={session.id}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 max-w-sm"
                >
                  {/* Post Header */}
                  <div className="p-3 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">🎯</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 text-sm leading-tight">
                            {session.title}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {startDate.toLocaleDateString('th-TH', {
                              day: 'numeric',
                              month: 'short'
                            })} - {endDate.toLocaleDateString('th-TH', {
                              day: 'numeric',
                              month: 'short'
                            })}
                          </p>
                        </div>
                      </div>
                      
                      {session.isRegistered && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs">
                          ✅ ลงทะเบียนแล้ว
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="p-3">
                    {/* Facebook-style Description */}
                    {session.description && (
                      <div className="text-gray-700 text-sm mb-3 whitespace-pre-line leading-relaxed">
                        {showFullDescription ? session.description : descriptionPreview}
                        {!showFullDescription && hasLongDescription && '...'}
                        {hasLongDescription && (
                          <button
                            onClick={() => toggleDescription(session.id)}
                            className="ml-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                          >
                            {showFullDescription ? 'ย่อลง' : 'ดูเพิ่มเติม'}
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Session Meta Info */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                        👥 {session.max_participants} คน
                      </span>
                      {!session.isRegistered && (
                        <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                          📝 เปิดรับสมัคร
                        </span>
                      )}
                    </div>

                    {/* Action Button */}
                    {session.isRegistered ? (
                      <button
                        onClick={() => navigate('/session-feed')}
                        className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-md transition-colors"
                      >
                        เข้าสู่งานสัมมนา →
                      </button>
                    ) : (
                      <button
                        onClick={() => registerForSession(session.id)}
                        disabled={isRegistering}
                        className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isRegistering ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>กำลังลงทะเบียน...</span>
                          </>
                        ) : (
                          <>
                            <span>ลงทะเบียนเข้าร่วม</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
