import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useWorkshop } from '../hooks/useWorkshops'
import { MaterialService } from '../services/materials'
import { UserNavigation } from '../components/user/UserNavigation'
import { BackButton } from '../components/common/BackButton'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ProgressRing } from '../components/ui/ProgressRing'
import { supabase } from '../services/supabase'
import { adminOperations } from '../services/supabaseAdmin'
import { useAuth } from '../hooks/useAuth'
import type { WorkshopMaterial } from '../types/materials'
import { formatDateShort, formatDateTimeShort } from '../utils/date'

interface Task {
  id: string
  title: string
  description: string
  due_date: string
  task_type: string
  points: number
}

interface TaskSubmission {
  id: string
  task_id: string
  status: string
  submitted_at: string
  submission_url?: string
  notes?: string
  file_url?: string
}

export function WorkshopDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { workshop, loading, error } = useWorkshop(id!)
  const [materials, setMaterials] = useState<WorkshopMaterial[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'materials' | 'tasks'>('overview')
  const [loadingData, setLoadingData] = useState(true)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [submissionForm, setSubmissionForm] = useState({
    submission_url: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchWorkshopData = async () => {
      if (!workshop?.id || !user) return
      
      try {
        setLoadingData(true)
        
        // Fetch materials
        const workshopMaterials = await MaterialService.getWorkshopMaterials(workshop.id)
        setMaterials(workshopMaterials)
        
        // Fetch tasks using admin operations (bypasses RLS)
        let tasksData = []
        try {
          tasksData = await adminOperations.getWorkshopTasks(workshop.id)
          setTasks(tasksData || [])
        } catch (error) {
          console.error('Error fetching tasks:', error)
          setTasks([])
        }
        
        // Fetch user submissions
        if (tasksData && user) {
          const taskIds = tasksData.map(t => t.id)
          const { data: submissionsData } = await supabase
            .from('submissions')
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

  const handleSubmitTask = async (taskId: string) => {
    if (!user || !submissionForm.submission_url.trim()) return
    
    try {
      setSubmitting(true)
      console.log('WorkshopDetailPage: Submitting task:', taskId, 'for user:', user.id)
      
      // Check if submission already exists
      const existingSubmission = submissions.find(s => s.task_id === taskId)
      
      if (existingSubmission) {
        console.log('WorkshopDetailPage: Updating existing submission:', existingSubmission.id)
        // Update existing submission
        const { error } = await supabase
          .from('submissions')
          .update({
            submission_url: submissionForm.submission_url,
            notes: submissionForm.notes,
            status: 'submitted',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubmission.id)
          
        if (error) {
          console.error('WorkshopDetailPage: Update submission error:', error)
          throw error
        }
        console.log('WorkshopDetailPage: Submission updated successfully')
      } else {
        console.log('WorkshopDetailPage: Creating new submission')
        // Create new submission
        const { data, error } = await supabase
          .from('submissions')
          .insert({
            task_id: taskId,
            user_id: user.id,
            submission_url: submissionForm.submission_url,
            notes: submissionForm.notes,
            status: 'submitted'
          })
          .select()
          
        if (error) {
          console.error('WorkshopDetailPage: Create submission error:', error)
          throw error
        }
        console.log('WorkshopDetailPage: New submission created:', data)
      }
      
      // Reset form and refresh data
      setSubmissionForm({ submission_url: '', notes: '' })
      setActiveTaskId(null)
      
      // Refresh submissions
      console.log('WorkshopDetailPage: Refreshing submissions...')
      const { data: updatedSubmissions, error: refreshError } = await supabase
        .from('submissions')
        .select('*')
        .in('task_id', tasks.map(t => t.id))
        .eq('user_id', user.id)
        
      if (refreshError) {
        console.error('WorkshopDetailPage: Error refreshing submissions:', refreshError)
      } else {
        console.log('WorkshopDetailPage: Submissions refreshed:', updatedSubmissions?.length || 0)
      }
      
      setSubmissions(updatedSubmissions || [])
      alert('ส่งงานเรียบร้อยแล้ว!')
      
    } catch (error) {
      console.error('WorkshopDetailPage: Error submitting task:', error)
      alert(`เกิดข้อผิดพลาดในการส่งงาน: ${error.message || error}`)
    } finally {
      setSubmitting(false)
    }
  }

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
              to="/sessions"
              className="btn btn-primary px-6 py-3 font-semibold"
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
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
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
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {workshop.instructor}
                        </p>
                      </div>
                    )}
                    
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                      <p className="text-blue-100 text-sm mb-1">วันที่</p>
                      <p className="font-semibold flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDateShort(workshop.workshop_date, 'CE')}
                      </p>
                    </div>
                    
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                      <p className="text-blue-100 text-sm mb-1">เวลา</p>
                      <p className="font-semibold flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {workshop.start_time} - {workshop.end_time}
                      </p>
                    </div>
                    
                    {workshop.location && (
                      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                        <p className="text-blue-100 text-sm mb-1">สถานที่</p>
                        <p className="font-semibold flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
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
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                สถิติของคุณ
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">งานที่รอส่ง</p>
                      <p className="text-sm text-gray-600">อย่าลืมส่งนะ</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-amber-600">{tasks.length - completedTasks}</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
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
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                ผู้เข้าร่วม Workshop
              </h3>
              
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v7" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9" />
                  </svg>
                </div>
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
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
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
                      <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
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
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
                  </svg>
                </div>
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
                const dueDate = task.due_date ? new Date(task.due_date) : null
                const isOverdue = !isSubmitted && dueDate && dueDate < new Date()
                
                return (
                  <div 
                    key={task.id}
                    className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover-lift relative ${
                      isSubmitted ? 'ring-2 ring-green-400' : isOverdue ? 'ring-2 ring-red-400' : ''
                    }`}
                  >
                    <div className="p-6 pb-16">
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
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-gray-600">กำหนดส่ง:</span>
                                <span className="font-medium">{formatDateShort(task.due_date, 'CE')}</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                <span className="text-gray-600">คะแนน:</span>
                                <span className="font-medium">{task.points} คะแนน</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                <span className="text-gray-600">ประเภท:</span>
                                <span className="font-medium">{task.task_type}</span>
                              </div>
                              
                              {/* Submission Mode Badge */}
                              <div className="flex items-center gap-2">
                                {(task as any).submission_mode === 'group' ? (
                                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center gap-1 font-medium">
                                    <span>👥</span>
                                    <span>ส่งแบบกลุ่ม</span>
                                  </span>
                                ) : (
                                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-1 font-medium">
                                    <span>👤</span>
                                    <span>ส่งเดี่ยว</span>
                                  </span>
                                )}
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
                      
                      {/* Submission Section - Enhanced multi-link UI only */}
                      {!isSubmitted ? (
                        <>
                          {!isOverdue && activeTaskId !== task.id && (
                            <button
                              onClick={() => setActiveTaskId(task.id)}
                              className="absolute bottom-4 right-4 btn btn-primary px-4 py-2 font-medium"
                            >
                              ส่งงาน
                            </button>
                          )}
                          
                          {isOverdue && (
                            <div className="bg-red-50 rounded-xl p-4 mt-4 border border-red-200">
                              <p className="text-red-800 font-medium flex items-center gap-2">
                                <span>⚠️</span>
                                เลยกำหนดส่งแล้ว
                              </p>
                            </div>
                          )}
                        </>
                      ) : null}
                      
                      {/* Submission Form */}
                      {/* งานที่ส่ง (Enhanced multi-link submissions with detailed UI) */}
                      {isSubmitted && submission && (
                        <div className="mt-4">
                          {(() => {
                            // รองรับทั้ง link objects และ string arrays
                            const linkData = (submission as any)?.links || []
                            const linkObjects = Array.isArray(linkData) 
                              ? linkData.map((item: any) => typeof item === 'string' ? { url: item, note: '', submitted_at: submission.submitted_at } : item)
                              : (submission?.submission_url ? [{ url: submission.submission_url, note: '', submitted_at: submission.submitted_at }] : [])
                            
                            if (!linkObjects || linkObjects.length === 0) return null
                            
                            // Helper function to get link type icon
                            const getLinkIcon = (url: string) => {
                              if (url.includes('drive.google.com') || url.includes('docs.google.com')) return '📄'
                              if (url.includes('youtube.com') || url.includes('youtu.be')) return '🎥'
                              if (url.includes('github.com') || url.includes('gitlab.com')) return '💻'
                              if (url.includes('canva.com')) return '🎨'
                              if (url.includes('figma.com')) return '🔧'
                              if (url.includes('notion.so')) return '📝'
                              if (url.includes('slides.com') || url.includes('slideshare.net')) return '📊'
                              return '🔗'
                            }
                            
                            // Helper function to get domain name
                            const getDomainName = (url: string) => {
                              try {
                                return new URL(url).hostname.replace('www.', '')
                              } catch {
                                return 'ลิงก์'
                              }
                            }
                            
                            const submittedTime = new Date(submission.submitted_at || submission.updated_at || '').toLocaleString('th-TH', {
                              year: 'numeric',
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                            
                            return (
                              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-green-600 text-lg">✅</span>
                                    <div>
                                      <h4 className="text-sm font-semibold text-green-800">งานที่ส่งแล้ว</h4>
                                      <p className="text-xs text-green-600">ส่งแล้ว {linkObjects.length} รายการ</p>
                                    </div>
                                  </div>
                                  <button
                                    className="btn btn-primary px-3 py-1 text-xs"
                                    aria-label="เพิ่มลิงก์"
                                    onClick={async () => {
                                      const url = prompt('เพิ่มลิงก์ URL')?.trim()
                                      if (!url) return
                                      const note = prompt('หมายเหตุ (ไม่บังคับ)')?.trim() || ''
                                      const newLink = { url, note, submitted_at: new Date().toISOString() }
                                      const newLinks = [...linkObjects, newLink]
                                      try {
                                        await supabase
                                          .from('submissions')
                                          .update({ links: newLinks, status: 'submitted', updated_at: new Date().toISOString() })
                                          .eq('id', submission.id)
                                        const { data: refreshed } = await supabase
                                          .from('submissions')
                                          .select('*')
                                          .eq('id', submission.id)
                                          .single()
                                        setSubmissions(prev => prev.map(s => s.id === submission.id ? { ...s, ...refreshed } : s))
                                      } catch (e) { console.error('add link failed', e) }
                                    }}
                                  >เพิ่มลิงก์</button>
                                </div>
                                
                                <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-md inline-block">
                                  📅 ส่งครั้งแรก: {submittedTime}
                                </div>
                                
                                <div className="space-y-2">
                                  {linkObjects.map((linkObj: any, idx: number) => {
                                    const linkSubmittedTime = linkObj.submitted_at 
                                      ? new Date(linkObj.submitted_at).toLocaleString('th-TH', {
                                          month: 'short',
                                          day: 'numeric', 
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })
                                      : submittedTime
                                    
                                    return (
                                      <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex items-start gap-2 flex-1 min-w-0">
                                            <span className="text-lg mt-0.5">{getLinkIcon(linkObj.url)}</span>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-1">
                                                <a 
                                                  href={linkObj.url} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer" 
                                                  className="text-sm font-medium text-blue-700 hover:underline truncate"
                                                  title={linkObj.url}
                                                >
                                                  {getDomainName(linkObj.url)}
                                                </a>
                                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                  {linkSubmittedTime}
                                                </span>
                                              </div>
                                              <p className="text-xs text-gray-600 truncate" title={linkObj.url}>
                                                {linkObj.url}
                                              </p>
                                              {linkObj.note && (
                                                <p className="text-xs text-gray-600 mt-1 italic">
                                                  💬 {linkObj.note}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-1">
                                            <a 
                                              href={linkObj.url} 
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              className="text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium"
                                            >
                                              เปิด
                                            </a>
                                            <button
                                              className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                                              onClick={async () => {
                                                const newUrl = prompt('แทนที่ด้วย URL ใหม่', linkObj.url)?.trim()
                                                if (!newUrl || newUrl === linkObj.url) return
                                                const newNote = prompt('หมายเหตุใหม่', linkObj.note || '')?.trim() || ''
                                                const updatedLink = { ...linkObj, url: newUrl, note: newNote, submitted_at: new Date().toISOString() }
                                                const newLinks = linkObjects.map((obj: any, i: number) => i === idx ? updatedLink : obj)
                                                try {
                                                  await supabase
                                                    .from('submissions')
                                                    .update({ links: newLinks, status: 'submitted', updated_at: new Date().toISOString() })
                                                    .eq('id', submission.id)
                                                  const { data: refreshed } = await supabase
                                                    .from('submissions')
                                                    .select('*')
                                                    .eq('id', submission.id)
                                                    .single()
                                                  setSubmissions(prev => prev.map(s => s.id === submission.id ? { ...s, ...refreshed } : s))
                                                } catch (e) { console.error('replace link failed', e) }
                                              }}
                                            >
                                              แก้ไข
                                            </button>
                                            <button
                                              className="text-xs px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700"
                                              onClick={async () => {
                                                if (!confirm(`ลบลิงก์ "${getDomainName(linkObj.url)}" นี้?`)) return
                                                const newLinks = linkObjects.filter((_: any, i: number) => i !== idx)
                                                try {
                                                  if (newLinks.length === 0) {
                                                    // ถ้าลบลิงก์สุดท้าย ให้ลบงานที่ส่งทิ้งไปด้วย
                                                    if (confirm('นี่เป็นลิงก์สุดท้าย หากลบแล้วงานที่ส่งจะถูกลบทิ้งด้วย ต้องการดำเนินการต่อ?')) {
                                                      await supabase
                                                        .from('submissions')
                                                        .delete()
                                                        .eq('id', submission.id)
                                                      setSubmissions(prev => prev.filter(s => s.id !== submission.id))
                                                    }
                                                  } else {
                                                    await supabase
                                                      .from('submissions')
                                                      .update({ links: newLinks, status: 'submitted', updated_at: new Date().toISOString() })
                                                      .eq('id', submission.id)
                                                    const { data: refreshed } = await supabase
                                                      .from('submissions')
                                                      .select('*')
                                                      .eq('id', submission.id)
                                                      .single()
                                                    setSubmissions(prev => prev.map(s => s.id === submission.id ? { ...s, ...refreshed } : s))
                                                  }
                                                } catch (e) { console.error('remove link failed', e) }
                                              }}
                                            >
                                              ลบ
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      )}

                      {activeTaskId === task.id && !isSubmitted && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <h4 className="font-medium text-gray-900 mb-3">ส่งงาน</h4>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                URL งานที่ส่ง (ลิงก์แรก) <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="url"
                                value={submissionForm.submission_url}
                                onChange={(e) => setSubmissionForm({...submissionForm, submission_url: e.target.value})}
                                placeholder="https://example.com/my-work"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                required
                              />
                              <p className="text-xs text-gray-500 mt-1">💡 หลังส่งแล้ว สามารถเพิ่มลิงก์เพิ่มเติมได้</p>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                หมายเหตุ (ถ้ามี)
                              </label>
                              <textarea
                                value={submissionForm.notes}
                                onChange={(e) => setSubmissionForm({...submissionForm, notes: e.target.value})}
                                placeholder="รายละเอียดเพิ่มเติม..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </div>
                            
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleSubmitTask(task.id)}
                                disabled={!submissionForm.submission_url.trim() || submitting}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                              >
                                {submitting ? 'กำลังส่ง...' : 'ส่งงาน'}
                              </button>
                              <button
                                onClick={() => {
                                  setActiveTaskId(null)
                                  setSubmissionForm({ submission_url: '', notes: '' })
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
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
