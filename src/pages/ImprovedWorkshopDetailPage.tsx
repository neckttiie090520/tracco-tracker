import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useWorkshop } from '../hooks/useWorkshops'
import { MaterialService } from '../services/materials'
import { UserNavigation } from '../components/user/UserNavigation'
import { BackButton } from '../components/common/BackButton'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ProgressRing } from '../components/ui/ProgressRing'
import { supabase } from '../services/supabase'
import { useAuth } from '../hooks/useAuth'
import type { WorkshopMaterial } from '../types/materials'

interface Task {
  id: string
  title: string
  description: string
  due_date: string
  task_type: string
  points: number
}

interface TaskSubmission {
  task_id: string
  status: string
  submitted_at: string
  url_submission?: string
}

export function ImprovedWorkshopDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { workshop, loading, error } = useWorkshop(id!)
  const [materials, setMaterials] = useState<WorkshopMaterial[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'materials' | 'tasks'>('overview')
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    const fetchWorkshopData = async () => {
      if (!workshop?.id || !user) return
      
      try {
        setLoadingData(true)
        
        // Fetch materials
        const workshopMaterials = await MaterialService.getWorkshopMaterials(workshop.id)
        setMaterials(workshopMaterials)
        
        // Fetch tasks
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .eq('workshop_id', workshop.id)
          .order('due_date', { ascending: true })
        
        setTasks(tasksData || [])
        
        // Fetch user submissions
        if (tasksData && user) {
          const taskIds = tasksData.map(t => t.id)
          const { data: submissionsData } = await supabase
            .from('task_submissions')
            .select('*')
            .in('task_id', taskIds)
            .eq('user_id', user.id)
          
          setSubmissions(submissionsData || [])
        }
      } catch (error) {
        console.error('Error fetching workshop data:', error)
      } finally {
        setLoadingData(false)
      }
    }

    fetchWorkshopData()
  }, [workshop?.id, user])

  const completedTasks = submissions.filter(s => s.status === 'submitted').length
  const progressPercentage = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">กำลังโหลดข้อมูล Workshop...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !workshop) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavigation />
        <div className="max-w-4xl mx-auto px-8 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">ไม่พบ Workshop</h2>
            <p className="text-gray-600 mb-6">{error || 'Workshop ที่คุณกำลังมองหาไม่มีอยู่'}</p>
            <Link
              to="/workshops"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              กลับไปหน้า Workshops
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavigation />
      
      {/* Back Button */}
      <div className="max-w-6xl mx-auto px-8 pt-6">
        <BackButton />
      </div>
      
      {/* Hero Section */}
      <div className="bg-indigo-600 text-white">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Workshop Info */}
            <div className="lg:col-span-2">
              <div className="flex items-start gap-6">
                <div className="text-6xl">🏫</div>
                <div className="flex-1">
                  <h1 className="text-4xl font-bold mb-4">{workshop.title}</h1>
                  <p className="text-blue-100 text-lg mb-6">
                    {workshop.description}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {workshop.instructor && (
                      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                        <p className="text-blue-100 text-sm mb-1">วิทยากร</p>
                        <p className="font-semibold flex items-center gap-2">
                          <span>👨‍🏫</span>
                          {workshop.instructor}
                        </p>
                      </div>
                    )}
                    
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                      <p className="text-blue-100 text-sm mb-1">วันที่</p>
                      <p className="font-semibold flex items-center gap-2">
                        <span>📅</span>
                        {new Date(workshop.workshop_date).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                      <p className="text-blue-100 text-sm mb-1">เวลา</p>
                      <p className="font-semibold flex items-center gap-2">
                        <span>⏰</span>
                        {workshop.start_time} - {workshop.end_time}
                      </p>
                    </div>
                    
                    {workshop.location && (
                      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                        <p className="text-blue-100 text-sm mb-1">สถานที่</p>
                        <p className="font-semibold flex items-center gap-2">
                          <span>📍</span>
                          {workshop.location}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Progress Widget */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
              <h3 className="text-xl font-semibold mb-4">ความคืบหน้า</h3>
              <ProgressRing progress={progressPercentage} size={150} color="success" />
              <p className="mt-4 text-lg">
                ส่งงานแล้ว {completedTasks} จาก {tasks.length} งาน
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-lg p-2 mb-8">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-6 rounded-xl font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="text-xl">📊</span>
                <span>ภาพรวม</span>
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('materials')}
              className={`py-4 px-6 rounded-xl font-semibold transition-all ${
                activeTab === 'materials'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="text-xl">📚</span>
                <span>เอกสาร ({materials.length})</span>
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-4 px-6 rounded-xl font-semibold transition-all ${
                activeTab === 'tasks'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="text-xl">📝</span>
                <span>งาน ({tasks.length})</span>
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Stats Cards */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="mr-3">📈</span>
                สถิติของคุณ
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">✅</span>
                    <div>
                      <p className="font-semibold text-gray-900">งานที่ส่งแล้ว</p>
                      <p className="text-sm text-gray-600">ทำได้ดีมาก!</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-green-600">{completedTasks}</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">⏳</span>
                    <div>
                      <p className="font-semibold text-gray-900">งานที่รอส่ง</p>
                      <p className="text-sm text-gray-600">อย่าลืมส่งนะ</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-amber-600">{tasks.length - completedTasks}</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🎯</span>
                    <div>
                      <p className="font-semibold text-gray-900">อัตราความสำเร็จ</p>
                      <p className="text-sm text-gray-600">Keep going!</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-purple-600">{progressPercentage}%</span>
                </div>
              </div>
            </div>

            {/* Participants */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="mr-3">👥</span>
                ผู้เข้าร่วม Workshop
              </h3>
              
              <div className="text-center py-8">
                <div className="text-5xl mb-4">🎓</div>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  {workshop.current_participants}/{workshop.max_participants}
                </p>
                <p className="text-gray-600">คนเข้าร่วม Workshop นี้</p>
                
                <div className="mt-6">
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${(workshop.current_participants / workshop.max_participants) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="mr-3">📚</span>
              เอกสารประกอบการเรียน
            </h3>
            
            {loadingData ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                <p className="text-gray-600">กำลังโหลดเอกสาร...</p>
              </div>
            ) : materials.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {materials.map((material) => (
                  <div 
                    key={material.id}
                    className="group bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-all duration-300 hover-lift"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">📄</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {material.title}
                        </h4>
                        {material.description && (
                          <p className="text-sm text-gray-600 mb-3">{material.description}</p>
                        )}
                        <a
                          href={material.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <span>ดาวน์โหลด</span>
                          <span>↓</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-600">ยังไม่มีเอกสารสำหรับ Workshop นี้</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {loadingData ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                <p className="text-gray-600">กำลังโหลดรายการงาน...</p>
              </div>
            ) : tasks.length > 0 ? (
              tasks.map((task) => {
                const submission = submissions.find(s => s.task_id === task.id)
                const isSubmitted = submission?.status === 'submitted'
                const dueDate = new Date(task.due_date)
                const isOverdue = !isSubmitted && dueDate < new Date()
                
                return (
                  <div 
                    key={task.id}
                    className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover-lift ${
                      isSubmitted ? 'ring-2 ring-green-400' : isOverdue ? 'ring-2 ring-red-400' : ''
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className="text-4xl">
                            {isSubmitted ? '✅' : isOverdue ? '⚠️' : '📝'}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{task.title}</h3>
                            <p className="text-gray-600 mb-4">{task.description}</p>
                            
                            <div className="flex flex-wrap gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <span>📅</span>
                                <span className="text-gray-600">กำหนดส่ง:</span>
                                <span className="font-medium">
                                  {dueDate.toLocaleDateString('th-TH', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <span>🏆</span>
                                <span className="text-gray-600">คะแนน:</span>
                                <span className="font-medium">{task.points} คะแนน</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <span>📋</span>
                                <span className="text-gray-600">ประเภท:</span>
                                <span className="font-medium">{task.task_type}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <StatusBadge 
                          status={isSubmitted ? 'completed' : isOverdue ? 'overdue' : 'pending'}
                          size="lg"
                          animate={!isSubmitted && !isOverdue}
                        />
                      </div>
                      
                      {isSubmitted && submission && (
                        <div className="bg-gray-100 rounded-xl p-4 mt-4">
                          <p className="text-gray-800 font-medium flex items-center gap-2">
                            <span>✅</span>
                            ส่งงานเรียบร้อยแล้ว
                          </p>
                          <p className="text-sm text-green-600 mt-1">
                            ส่งเมื่อ: {new Date(submission.submitted_at).toLocaleString('th-TH')}
                          </p>
                        </div>
                      )}
                      
                      {!isSubmitted && (
                        <div className="mt-6 flex justify-end">
                          <button
                            onClick={() => navigate(`/tasks/${task.id}/submit`)}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                              isOverdue
                                ? 'bg-gray-600 hover:bg-gray-700 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                          >
                            {isOverdue ? 'ส่งงาน (เลยกำหนด)' : 'ส่งงาน'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  ยังไม่มีงานสำหรับ Workshop นี้
                </h3>
                <p className="text-gray-600">กลับมาตรวจสอบอีกครั้งในภายหลัง</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}