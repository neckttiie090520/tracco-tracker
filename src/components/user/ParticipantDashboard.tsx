import React, { useState, useEffect, Fragment, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useAdmin } from '../../hooks/useAdmin'
import { useParticipantData } from '../../hooks/useAdminData'
import { ProgressRing } from '../ui/ProgressRing'
import { StatCard } from '../ui/StatCard'
import { StatusBadge } from '../ui/StatusBadge'
import { ProfileModal } from '../profile/ProfileModal'
import { motion, stagger, useAnimation } from 'framer-motion'
import { TypewriterText } from '../ui/TypewriterText'

interface Session {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string
  max_participants: number
  is_active: boolean
}

interface DashboardStats {
  totalWorkshops: number
  completedTasks: number
  totalTasks: number
  upcomingDeadlines: number
  activeSession: any
  recentActivities: any[]
  upcomingTasks: any[]
}

interface SessionRegistrationProps {
  onSessionRegistered: () => void
}

// Registered Sessions Section Component  
function RegisteredSessionsSection() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registeredSessions, setRegisteredSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRegisteredSessions()
  }, [])

  const fetchRegisteredSessions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('session_registrations')
        .select(`
          *,
          sessions (
            id,
            title,
            description,
            start_date,
            end_date,
            max_participants,
            is_active
          )
        `)
        .eq('user_id', user?.id)
        .eq('status', 'registered')

      if (error) throw error
      setRegisteredSessions(data || [])
    } catch (error) {
      console.error('Error fetching registered sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mb-8">
        <div className="animate-pulse">
          <div className="h-7 bg-gray-200 rounded-lg w-56 mb-6"></div>
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded-lg w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded-lg w-1/2"></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                    </div>
                    <div className="h-10 bg-gray-200 rounded-lg"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (registeredSessions.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">งานสัมมนาที่เข้าร่วม</h2>
      </div>
      <p className="text-gray-600 mb-8">งานสัมมนาที่คุณลงทะเบียนไว้แล้ว ({registeredSessions.length} งาน)</p>

      <div className="grid gap-6 md:grid-cols-2">
        {registeredSessions.map((registration, index) => {
          const session = registration.sessions
          if (!session) return null

          const startDate = new Date(session.start_date)
          const endDate = new Date(session.end_date)
          const registeredDate = new Date(registration.registered_at)
          const today = new Date()
          const isUpcoming = startDate > today
          const isOngoing = startDate <= today && endDate >= today
          const isPast = endDate < today

          return (
            <motion.div
              key={registration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-300 p-6 relative overflow-hidden"
            >
              {/* Status indicator */}
              <div className="absolute top-4 right-4">
                {isOngoing && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    กำลังดำเนินการ
                  </span>
                )}
                {isUpcoming && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    เร็วๆ นี้
                  </span>
                )}
                {isPast && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    เสร็จสิ้น
                  </span>
                )}
              </div>

              {/* Header */}
              <div className="mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight mb-2 pr-20">
                      {session.title}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Date and Time Information */}
              <div className="space-y-3 mb-6">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">วันที่จัด</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {startDate.toLocaleDateString('th-TH', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                      {startDate.getTime() !== endDate.getTime() && (
                        <p className="text-xs text-gray-600">
                          ถึง {endDate.toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">ลงทะเบียนเมื่อ</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {registeredDate.toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Workshop Info */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {session.max_participants} ที่นั่ง
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => navigate(`/sessions/${session.id}/feed`)}
                className={`w-full py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                  isOngoing 
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl' 
                    : isUpcoming 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                <span>
                  {isOngoing ? 'เข้าสู่งานสัมมนา' : isUpcoming ? 'ดูรายละเอียด' : 'ดูเนื้อหา'}
                </span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

// Session Registration Section Component
function SessionRegistrationSection({ onSessionRegistered }: SessionRegistrationProps) {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState<string | null>(null)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('is_active', true)
        .order('start_date', { ascending: true })

      if (error) throw error
      setSessions(data || [])
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
      onSessionRegistered()
    } catch (error) {
      console.error('Error registering:', error)
      alert('เกิดข้อผิดพลาดในการลงทะเบียน')
    } finally {
      setRegistering(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">กำลังโหลดงานสัมมนา...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
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
        <>
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">เลือกงานสัมมนา</h2>
            <p className="text-sm text-gray-600">งานสัมมนาที่เปิดให้ลงทะเบียน</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => {
              const startDate = new Date(session.start_date)
              const endDate = new Date(session.end_date)
              const isRegistering = registering === session.id

              return (
                <div 
                  key={session.id}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 max-w-sm mx-auto"
                >
                  {/* Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
                          {session.title}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {startDate.toLocaleDateString('th-TH', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                          {startDate.getTime() !== endDate.getTime() && 
                            ` - ${endDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {session.description && (
                      <p className="text-gray-700 text-sm mb-4 whitespace-pre-line leading-relaxed">
                        {session.description?.length > 120 
                          ? `${session.description.slice(0, 120)}...` 
                          : session.description
                        }
                      </p>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 text-xs rounded-lg font-medium">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {session.max_participants} ที่นั่ง
                      </span>
                      <span className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 text-xs rounded-lg font-medium">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        เปิดรับสมัคร
                      </span>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => registerForSession(session.id)}
                      disabled={isRegistering}
                      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    >
                      {isRegistering ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>กำลังลงทะเบียน...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>ลงทะเบียนเข้าร่วม</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export function ParticipantDashboard() {
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const navigate = useNavigate()
  const { stats, loading, error, refetch } = useParticipantData()
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null)
  const [showUpcomingTasks, setShowUpcomingTasks] = useState(false)

  // Update hasActiveSession based on stats
  useEffect(() => {
    setHasActiveSession(stats.totalWorkshops > 0)
  }, [stats.totalWorkshops])

  const progressPercentage = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
    : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        </div>
      </div>
    )
  }

  // Show session registration section if user hasn't registered for any session
  const showSessionRegistration = hasActiveSession === false

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold mb-4">
              {showSessionRegistration ? 'ยินดีต้อนรับ! 🎉' : `สวัสดี, ${user?.email?.split('@')[0]} 👋`}
            </h1>
            {showSessionRegistration ? (
              <div className="text-blue-100 text-lg space-y-2">
                <p className="mb-2 font-thai">เริ่มต้นการเรียนรู้ของคุณกับ</p>
                <div className="min-h-[4rem] flex items-center justify-center">
                  <TypewriterText 
                    examples={[
                      "การพัฒนาทักษะใหม่ๆ",
                      "เวิร์กช็อปที่น่าสนใจ", 
                      "ประสบการณ์ที่ไม่เหมือนใคร",
                      "ชุมชนนักเรียนรู้",
                      "โอกาสในการเติบโต"
                    ]}
                    className="text-cyan-200 font-semibold text-xl font-thai text-center"
                  />
                </div>
              </div>
            ) : (
              <div className="min-h-[3rem] flex items-center justify-center">
                <TypewriterText 
                  examples={
                    stats.activeSession ? [
                      "พัฒนาทักษะการสื่อสารอย่างมืออาชีพ",
                      "เรียนรู้เครื่องมือ AI ล้ำสมัย",
                      "สร้างเนื้อหาที่ดึงดูดใจ",
                      "ประยุกต์ใช้งานจริงในองค์กร",
                      "เชื่อมต่อกับผู้เชี่ยวชาญ"
                    ] : [
                      "ยินดีต้อนรับกลับมา!",
                      "เริ่มต้นเรียนรู้สิ่งใหม่กันเถอะ",
                      "ค้นพบโอกาสที่รอคุณอยู่",
                      "พร้อมพัฒนาตัวเองแล้วหรือยัง?"
                    ]
                  }
                  className="text-cyan-200 font-medium text-lg font-thai text-center"
                />
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Session Registration Section - Show if user hasn't registered */}
      {showSessionRegistration && (
        <div className="max-w-4xl mx-auto px-6 py-6">
          <SessionRegistrationSection onSessionRegistered={refetch} />
        </div>
      )}

      {/* Dashboard Content - Show only if user has registered for a session */}
      {!showSessionRegistration && (
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Stats Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <StatCard
                title="Workshops ที่เข้าร่วม"
                value={stats.totalWorkshops}
                icon="🏫"
                color="primary"
                subtitle="กิจกรรมทั้งหมด"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <StatCard
                title="งานที่ส่งแล้ว"
                value={`${stats.completedTasks}/${stats.totalTasks}`}
                icon="✅"
                color="success"
                subtitle="งานทั้งหมด"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div 
                onClick={() => stats.upcomingDeadlines > 0 && setShowUpcomingTasks(true)}
                className={stats.upcomingDeadlines > 0 ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
              >
                <StatCard
                  title="ใกล้ครบกำหนด"
                  value={stats.upcomingDeadlines}
                  icon="⏰"
                  color="warning"
                  subtitle={stats.upcomingDeadlines > 0 ? "ภายใน 7 วัน • คลิกดูรายละเอียด" : "ภายใน 7 วัน"}
                />
              </div>
            </motion.div>
          </motion.div>

          {/* Main content grid - Always show */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Actions */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.6 }}
                className="bg-white rounded-2xl shadow-lg p-6 mb-8"
              >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">การดำเนินการด่วน</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => navigate('/sessions')}
                      className="group card p-6 hover:shadow-lg transition-all duration-300 hover-lift"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <p className="text-lg font-semibold mb-1">ลงทะเบียน</p>
                          <p className="text-gray-500 text-sm">ลงทะเบียนงานสัมมนาใหม่</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowProfileModal(true)}
                      className="group card p-6 hover:shadow-lg transition-all duration-300 hover-lift"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <p className="text-lg font-semibold mb-1">โปรไฟล์</p>
                          <p className="text-gray-500 text-sm">จัดการข้อมูลส่วนตัว</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  </div>
                </motion.div>

              {/* Registered Sessions Section - Under Quick Actions */}
              <RegisteredSessionsSection />
            </div>

            {/* All Tasks */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-medium text-gray-900">งานทั้งหมด</h2>
                </div>
                
                {stats.allUserWorkshops && stats.allUserWorkshops.length > 0 ? (
                  <div className="space-y-2">
                    {stats.allUserWorkshops
                      .flatMap(workshop => 
                        workshop.tasks?.map(task => {
                          const submission = workshop.submissions?.find(s => s.task_id === task.id)
                          const isSubmitted = submission?.status === 'submitted'
                          const dueDate = task.due_date ? new Date(task.due_date) : null
                          const isOverdue = dueDate && dueDate < new Date() && !isSubmitted
                          const daysLeft = dueDate ? Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
                          
                          return {
                            ...task,
                            workshop_id: workshop.id,
                            workshop_title: workshop.title,
                            isSubmitted,
                            isOverdue,
                            dueDate,
                            daysLeft
                          }
                        }) || []
                      )
                      .sort((a, b) => {
                        // เรียงตาม: ยังไม่ส่ง -> ส่งแล้ว, วันที่ครบกำหนดใกล้ -> ไกล
                        if (a.isSubmitted !== b.isSubmitted) {
                          return a.isSubmitted ? 1 : -1
                        }
                        if (a.dueDate && b.dueDate) {
                          return a.dueDate.getTime() - b.dueDate.getTime()
                        }
                        return 0
                      })
                      .map((task, index) => (
                        <motion.button
                          key={task.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.8 + (index * 0.05) }}
                          onClick={() => navigate(`/workshops/${task.workshop_id}`)}
                          className="w-full text-left p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 mb-1">
                                {task.title}
                              </p>
                              <p className="text-xs text-gray-500 mb-1">
                                {task.workshop_title}
                              </p>
                              {task.dueDate && (
                                <p className={`text-xs ${
                                  task.isOverdue ? 'text-red-600' : 
                                  task.daysLeft !== null && task.daysLeft <= 7 ? 'text-amber-600' : 
                                  'text-gray-500'
                                }`}>
                                  {task.isOverdue ? 'เลยกำหนด' : 
                                   task.daysLeft !== null && task.daysLeft <= 7 ? `เหลือ ${task.daysLeft} วัน` :
                                   task.dueDate.toLocaleDateString('th-TH')}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {task.isSubmitted ? (
                                <span className="text-green-600 text-xs">✅ ส่งแล้ว</span>
                              ) : (
                                <span className="text-gray-400 text-xs">⏳ ยังไม่ส่ง</span>
                              )}
                              <svg
                                className="w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium">ยังไม่มีงานในระบบ</p>
                  </div>
                )}
            </motion.div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Upcoming Tasks Modal */}
      {showUpcomingTasks && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span>⏰</span>
                งานที่ใกล้ครบกำหนด
              </h2>
              <button
                onClick={() => setShowUpcomingTasks(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {stats.upcomingTasks && stats.upcomingTasks.length > 0 ? (
                <div className="space-y-3">
                  {stats.upcomingTasks.map(task => {
                    const dueDate = new Date(task.due_date)
                    const daysLeft = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    const isOverdue = daysLeft < 0
                    
                    return (
                      <button
                        key={task.id}
                        onClick={() => {
                          // หา workshop_id จาก task
                          const workshop = stats.allUserWorkshops?.find(w => 
                            w.tasks?.some(t => t.id === task.id)
                          )
                          if (workshop) {
                            setShowUpcomingTasks(false)
                            navigate(`/workshops/${workshop.id}`)
                          }
                        }}
                        className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 mb-1">
                              {task.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              {task.workshop_title}
                            </p>
                            <div className="flex items-center gap-4 text-xs">
                              <span className={`px-2 py-1 rounded-full font-medium ${
                                isOverdue 
                                  ? 'bg-red-100 text-red-700' 
                                  : daysLeft <= 3 
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {isOverdue 
                                  ? `เลยกำหนด ${Math.abs(daysLeft)} วัน`
                                  : daysLeft === 0 
                                  ? 'ครบกำหนดวันนี้'
                                  : `เหลือ ${daysLeft} วัน`
                                }
                              </span>
                              <span className="text-gray-500">
                                {dueDate.toLocaleDateString('th-TH', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                          <svg
                            className="w-5 h-5 text-gray-400 mt-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="text-gray-600">ไม่มีงานที่ใกล้ครบกำหนด</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-600 text-center">
                คลิกที่งานเพื่อไปหน้าส่งงาน
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
