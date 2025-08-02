import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuth } from '../hooks/useAuth'
import { UserNavigation } from '../components/user/UserNavigation'

interface Workshop {
  id: string
  title: string
  description: string | null
  instructor: string | null
  is_active: boolean
  created_at: string
  total_tasks: number
}

interface Session {
  id: string
  title: string
  description: string | null
  start_date: string | null
  end_date: string | null
}

export function SessionWorkshopsPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(true)
  const [isRegistered, setIsRegistered] = useState(false)

  useEffect(() => {
    if (user && sessionId) {
      fetchSessionData()
    }
  }, [user, sessionId])

  const fetchSessionData = async () => {
    if (!user || !sessionId) return

    try {
      setLoading(true)

      // Check if user is registered for this session
      const { data: registration } = await supabase
        .from('session_registrations')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single()

      if (!registration) {
        // User is not registered, redirect to dashboard
        navigate('/dashboard')
        return
      }

      setIsRegistered(true)

      // Get session info
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id, title, description, start_date, end_date')
        .eq('id', sessionId)
        .eq('is_published', true)
        .eq('is_active', true)
        .single()

      if (sessionError || !sessionData) {
        console.error('Session not found:', sessionError)
        navigate('/dashboard')
        return
      }

      setSession(sessionData)

      // Get workshops for this session
      const { data: workshopsData, error: workshopsError } = await supabase
        .from('session_workshop_progress')
        .select(`
          workshop_id,
          workshop_title,
          workshop_description,
          instructor,
          workshop_is_active,
          total_tasks
        `)
        .eq('session_id', sessionId)

      if (workshopsError) {
        console.error('Error fetching workshops:', workshopsError)
        return
      }

      const formattedWorkshops: Workshop[] = (workshopsData || []).map(w => ({
        id: w.workshop_id,
        title: w.workshop_title,
        description: w.workshop_description,
        instructor: w.instructor,
        is_active: w.workshop_is_active,
        created_at: '',
        total_tasks: w.total_tasks || 0
      }))

      setWorkshops(formattedWorkshops)
    } catch (error) {
      console.error('Error fetching session data:', error)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavigation 
          title="กำลังโหลด..." 
          showBackButton={true} 
          backTo="/dashboard" 
          backLabel="กลับหน้าหลัก"
        />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-lg text-gray-600">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!isRegistered || !session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavigation 
          title="ไม่มีสิทธิ์เข้าถึง" 
          showBackButton={true} 
          backTo="/dashboard" 
          backLabel="กลับหน้าหลัก"
        />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center">
              <div className="text-6xl mb-4">🚫</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">ไม่สามารถเข้าใช้งานได้</h2>
              <p className="text-gray-600 mb-6">คุณยังไม่ได้ลงทะเบียนคอร์สนี้</p>
              <Link
                to="/dashboard"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
              >
                🏠 กลับหน้าหลัก
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <UserNavigation 
        title={session.title}
        showBackButton={true} 
        backTo="/dashboard" 
        backLabel="กลับหน้าหลัก"
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Session Info */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <div className="flex items-center mb-4">
              <span className="text-4xl mr-3">🎓</span>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{session.title}</h2>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 mt-1">
                  ✅ คุณลงทะเบียนแล้ว
                </span>
              </div>
            </div>
            {session.description && (
              <p className="text-gray-600 mb-4">{session.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              {session.start_date && (
                <span className="flex items-center">
                  <span className="mr-1">📅</span>
                  เริ่ม: {new Date(session.start_date).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              )}
              {session.end_date && (
                <span className="flex items-center">
                  <span className="mr-1">🏁</span>
                  สิ้นสุด: {new Date(session.end_date).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Workshops */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <span className="mr-2">📚</span>
                วิชาเรียนในคอร์สนี้
              </h3>
            </div>
            
            {workshops.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-4xl mb-2">📭</div>
                <p className="text-gray-500">ยังไม่มีวิชาเรียนในคอร์สนี้</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {workshops.map((workshop) => (
                  <div 
                    key={workshop.id} 
                    className="p-6 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 border-transparent hover:border-green-500"
                    onClick={() => navigate(`/workshops/${workshop.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-2xl mr-3">📖</span>
                          <h4 className="text-lg font-medium text-gray-900">
                            {workshop.title}
                          </h4>
                        </div>
                        {workshop.description && (
                          <p className="text-gray-600 mb-2 ml-11">{workshop.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500 ml-11">
                          {workshop.instructor && (
                            <span className="flex items-center">
                              <span className="mr-1">👨‍🏫</span>
                              ผู้สอน: {workshop.instructor}
                            </span>
                          )}
                          <span className="flex items-center">
                            <span className="mr-1">📝</span>
                            {workshop.total_tasks} งาน
                          </span>
                        </div>
                      </div>
                      <div className="ml-6 flex-shrink-0">
                        <div className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center">
                          🚀 คลิกเพื่อเข้าเรียน
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}