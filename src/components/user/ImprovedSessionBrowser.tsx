import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '../ui/StatusBadge'

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
  location?: string
}

interface SessionWithStats {
  session: Session
  participant_count: number
  workshop_count: number
  is_registered: boolean
  registration_status?: string
}

export function ImprovedSessionBrowser() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [registrationLoading, setRegistrationLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchSessions()
    }
  }, [user])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      
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
        const { count: participantCount } = await supabase
          .from('session_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', session.id)

        const { count: workshopCount } = await supabase
          .from('session_workshops')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', session.id)

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

      setSelectedSession(null)
      await fetchSessions()
      
      // Show success animation
      const successModal = document.createElement('div')
      successModal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn'
      successModal.innerHTML = `
        <div class="bg-white rounded-3xl p-8 text-center animate-bounce">
          <div class="text-6xl mb-4">🎉</div>
          <h3 class="text-2xl font-bold text-gray-900 mb-2">ลงทะเบียนสำเร็จ!</h3>
          <p class="text-gray-600">ยินดีต้อนรับเข้าสู่ Session</p>
        </div>
      `
      document.body.appendChild(successModal)
      setTimeout(() => successModal.remove(), 2000)
      
    } catch (error) {
      console.error('Registration error:', error)
      alert('เกิดข้อผิดพลาดในการลงทะเบียน')
    } finally {
      setRegistrationLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">กำลังโหลด Sessions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8">
      {/* Header Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          เลือก Session ที่คุณสนใจ 🎓
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          ลงทะเบียนเข้าร่วม Workshop Sessions เพื่อพัฒนาทักษะและเรียนรู้สิ่งใหม่ๆ
        </p>
      </div>

      {/* Sessions Grid */}
      {sessions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {sessions.map(({ session, participant_count, workshop_count, is_registered }) => (
            <div
              key={session.id}
              className={`
                relative bg-white rounded-2xl overflow-hidden
                transition-all duration-300 hover-lift
                ${is_registered 
                  ? 'ring-4 ring-green-400 shadow-green-200' 
                  : 'shadow-lg hover:shadow-2xl hover:ring-4 hover:ring-blue-200'
                }
              `}
            >
              {/* Card Header */}
              <div className={`
                p-6 ${is_registered 
                  ? 'bg-gradient-to-r from-green-500 to-teal-600' 
                  : 'bg-gradient-to-r from-blue-500 to-purple-600'
                }
              `}>
                <div className="flex items-start justify-between mb-4">
                  <div className="text-white">
                    <h3 className="text-2xl font-bold mb-2">{session.title}</h3>
                    {session.description && (
                      <p className="text-white/90 line-clamp-2">{session.description}</p>
                    )}
                  </div>
                  <div className="text-4xl">
                    {is_registered ? '✅' : '🎯'}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-white/90 text-sm">
                  <span className="flex items-center gap-1">
                    <span>👥</span>
                    <span>{participant_count}/{session.max_participants} คน</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span>🏫</span>
                    <span>{workshop_count} Workshops</span>
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6">
                {/* Date & Location */}
                <div className="space-y-3 mb-6">
                  {session.start_date && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <span className="text-xl">📅</span>
                      <div>
                        <p className="text-sm font-medium">วันที่เริ่ม</p>
                        <p className="text-gray-900">{new Date(session.start_date).toLocaleDateString('th-TH', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</p>
                      </div>
                    </div>
                  )}
                  
                  {session.location && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <span className="text-xl">📍</span>
                      <div>
                        <p className="text-sm font-medium">สถานที่</p>
                        <p className="text-gray-900">{session.location}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div className="mb-6 text-center">
                  <StatusBadge 
                    status={is_registered ? 'completed' : 'pending'}
                    size="lg"
                    showIcon={true}
                  />
                </div>

                {/* Action Button */}
                {is_registered ? (
                  <button
                    onClick={() => navigate(`/sessions/${session.id}`)}
                    className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all duration-300 hover-lift"
                  >
                    เข้าสู่ Session →
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedSession(session)}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all duration-300 hover-lift group"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span>ลงทะเบียนเลย</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                  </button>
                )}
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/20 to-transparent rounded-full -translate-y-12 translate-x-12" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-white/10 to-transparent rounded-full translate-y-16 -translate-x-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg p-16 text-center">
          <div className="text-6xl mb-6">📚</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            ยังไม่มี Session ที่เปิดรับลงทะเบียน
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            กรุณาตรวจสอบอีกครั้งในภายหลัง หรือติดต่อผู้ดูแลระบบ
          </p>
        </div>
      )}

      {/* Registration Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden animate-slideIn">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-8 text-white text-center">
              <div className="text-5xl mb-4">🎓</div>
              <h3 className="text-2xl font-bold mb-2">ยืนยันการลงทะเบียน</h3>
            </div>

            {/* Modal Body */}
            <div className="p-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4 text-center">
                {selectedSession.title}
              </h4>
              
              {selectedSession.description && (
                <p className="text-gray-600 mb-6 text-center">
                  {selectedSession.description}
                </p>
              )}

              <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
                {selectedSession.start_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">📅 วันที่เริ่ม</span>
                    <span className="font-medium">{new Date(selectedSession.start_date).toLocaleDateString('th-TH')}</span>
                  </div>
                )}
                {selectedSession.end_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">📅 วันที่สิ้นสุด</span>
                    <span className="font-medium">{new Date(selectedSession.end_date).toLocaleDateString('th-TH')}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">👥 จำนวนที่รับ</span>
                  <span className="font-medium">{selectedSession.max_participants} คน</span>
                </div>
              </div>

              <div className="text-center mb-6">
                <p className="text-lg font-medium text-green-600">
                  พร้อมเริ่มต้นการเรียนรู้แล้วใช่ไหม? 🚀
                </p>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedSession(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-xl font-semibold transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => handleRegister(selectedSession.id)}
                  disabled={registrationLoading}
                  className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg"
                >
                  {registrationLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      <span>กำลังลงทะเบียน...</span>
                    </span>
                  ) : (
                    'ยืนยันการลงทะเบียน'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}