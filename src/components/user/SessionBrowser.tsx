import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

interface Session {
  id: string
  title: string
  description?: string
  start_date?: string
  end_date?: string
  max_participants: number
  is_active: boolean
  is_published: boolean
  created_at: string
}

interface SessionWithStats {
  session: Session
  participant_count: number
  workshop_count: number
  is_registered: boolean
  registration_status?: string
}

interface RegistrationModalProps {
  session: Session | null
  onClose: () => void
  onRegister: (sessionId: string) => Promise<void>
  loading: boolean
}

function RegistrationModal({ session, onClose, onRegister, loading }: RegistrationModalProps) {
  if (!session) return null

  const handleRegister = () => {
    onRegister(session.id)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🎓</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            ลงทะเบียน Session
          </h3>
          <h4 className="text-lg font-semibold text-blue-600 mb-4">
            {session.title}
          </h4>
          
          {session.description && (
            <p className="text-gray-600 mb-4 text-sm">
              {session.description}
            </p>
          )}
          
          <div className="text-sm text-gray-500 mb-6">
            {session.start_date && (
              <p><strong>วันที่เริ่ม:</strong> {new Date(session.start_date).toLocaleString('th-TH')}</p>
            )}
            {session.end_date && (
              <p><strong>วันที่สิ้นสุด:</strong> {new Date(session.end_date).toLocaleString('th-TH')}</p>
            )}
            <p><strong>จำนวนที่รับ:</strong> {session.max_participants} คน</p>
          </div>
          
          <p className="text-gray-700 mb-6 font-medium">
            ลงทะเบียนแล้วเข้าเรียนได้เลย! 🚀
          </p>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleRegister}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-lg flex items-center space-x-2"
            >
              <span>✅</span>
              <span>{loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}</span>
            </button>
            <button
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-lg flex items-center space-x-2"
            >
              <span>❌</span>
              <span>ยกเลิก</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SessionBrowser() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [registrationLoading, setRegistrationLoading] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  useEffect(() => {
    if (user) {
      fetchSessions()
    }
  }, [user])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      
      // Get all active and published sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('is_active', true)
        .eq('is_published', true)
        .eq('registration_open', true)
        .order('created_at', { ascending: false })

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError)
        return
      }

      const sessionsWithStats: SessionWithStats[] = []

      for (const session of sessionsData || []) {
        // Get participant count
        const { count: participantCount } = await supabase
          .from('session_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', session.id)

        // Get workshop count
        const { count: workshopCount } = await supabase
          .from('session_workshops')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', session.id)

        // Check if user is registered
        let isRegistered = false
        if (user) {
          const { data: registration } = await supabase
            .from('session_registrations')
            .select('id')
            .eq('session_id', session.id)
            .eq('user_id', user.id)
            .single()

          isRegistered = !!registration
        }

        sessionsWithStats.push({
          session,
          participant_count: participantCount || 0,
          workshop_count: workshopCount || 0,
          is_registered: isRegistered
        })
      }

      setSessions(sessionsWithStats)
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (sessionId: string) => {
    if (!user) return

    try {
      setRegistrationLoading(true)
      
      const { error } = await supabase
        .from('session_registrations')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          registration_method: 'self_register',
          status: 'registered'
        })

      if (error) {
        console.error('Registration error:', error)
        alert('เกิดข้อผิดพลาดในการลงทะเบียน')
        return
      }

      alert('ลงทะเบียนสำเร็จ! 🎉')
      setSelectedSession(null)
      await fetchSessions()
    } catch (error) {
      console.error('Registration error:', error)
      alert('เกิดข้อผิดพลาดในการลงทะเบียน')
    } finally {
      setRegistrationLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด Sessions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🎓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Workshop Sessions</h2>
          <p className="text-gray-600 mb-4">
            เลือก Workshop ที่คุณสนใจเพื่อลงทะเบียนเข้าร่วม
          </p>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/sessions')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <span>🏫</span>
              <span>ดู Workshops ทั้งหมด</span>
            </button>
            <button
              onClick={fetchSessions}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <span>🔄</span>
              <span>รีเฟรช</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sessions Grid */}
      {sessions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map(({ session, participant_count, workshop_count, is_registered }) => (
            <div
              key={session.id}
              className={`bg-white rounded-xl shadow-lg p-6 transition-all hover:shadow-xl border-2 ${
                is_registered 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200 hover:border-blue-300 cursor-pointer'
              }`}
              onClick={() => !is_registered && setSelectedSession(session)}
            >
              {/* Status Badge */}
              <div className="flex justify-between items-start mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  is_registered
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-orange-100 text-orange-800 border border-orange-200'
                }`}>
                  {is_registered ? '✅ ลงทะเบียนแล้ว' : '📝 ยังไม่ได้ลงทะเบียน'}
                </span>
              </div>

              {/* Session Info */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {session.title}
                </h3>
                {session.description && (
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                    {session.description}
                  </p>
                )}
                {session.location && (
                  <p className="text-gray-500 text-sm">
                    📍 {session.location}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex justify-between text-sm text-gray-500 mb-4">
                <span>👥 {participant_count}/{session.max_participants}</span>
                <span>🏫 {workshop_count} Workshops</span>
              </div>

              {/* Actions */}
              <div className="text-center">
                {is_registered ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/sessions/${session.id}`)
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    เข้าสู่ Session
                  </button>
                ) : (
                  <div className="text-blue-600 font-semibold">
                    คลิกเพื่อลงทะเบียน
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-gray-400 text-4xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่มี Session</h3>
          <p className="text-gray-500">ยังไม่มี Session ที่เปิดให้ลงทะเบียน</p>
        </div>
      )}

      {/* Registration Modal */}
      <RegistrationModal
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        onRegister={handleRegister}
        loading={registrationLoading}
      />
    </div>
  )
}