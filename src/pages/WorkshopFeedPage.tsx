import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../services/supabase'
import { adminOperations } from '../services/supabaseAdmin'
import { useDebouncedCallback } from '../utils/debounce'
import { UserNavigation } from '../components/user/UserNavigation'
import { BackButton } from '../components/common/BackButton'
import { StatusBadge } from '../components/ui/StatusBadge'
import { WorkshopMaterialsList, WorkshopMaterialDisplay } from '../components/materials/WorkshopMaterialDisplay'
import { MaterialService } from '../services/materials'
import { Avatar } from '../components/common/Avatar'
import type { WorkshopMaterial } from '../types/materials'
import { groupService } from '../services/groups'
import { submissionService } from '../services/submissions'

interface Workshop {
  id: string
  title: string
  description: string
  instructor: string
  start_time: string
  end_time: string
  workshop_date: string
  location?: string
  max_participants: number
  phase?: number
}

interface Task {
  id: string
  title: string
  description: string
  due_date: string
  order_index: number
  is_active: boolean
}

interface TaskSubmission {
  id: string
  task_id: string
  user_id: string
  submission_url?: string
  notes?: string
  status: 'draft' | 'submitted' | 'reviewed'
  submitted_at: string
}

export function WorkshopFeedPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [workshop, setWorkshop] = useState<Workshop | null>(null)
  const [materials, setMaterials] = useState<WorkshopMaterial[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [submissionUrl, setSubmissionUrl] = useState('')
  const [submissionNotes, setSubmissionNotes] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'materials' | 'tasks'>('overview')
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [instructorProfile, setInstructorProfile] = useState<any>(null)
  // Group task state
  const [taskGroups, setTaskGroups] = useState<Record<string, any | null>>({})
  const [groupMembers, setGroupMembers] = useState<Record<string, any[]>>({})
  const [groupSubmissions, setGroupSubmissions] = useState<Record<string, any | null>>({})

  useEffect(() => {
    if (id && user) {
      fetchWorkshopData()
    }
  }, [id, user])

  const fetchWorkshopData = async () => {
    try {
      setLoading(true)

      // Fetch workshop details
      const { data: workshopData, error: workshopError } = await supabase
        .from('workshops')
        .select('*')
        .eq('id', id)
        .single()

      if (workshopError) throw workshopError
      setWorkshop(workshopData)

      // Fetch instructor profile if instructor field contains UUID
      if (workshopData?.instructor) {
        // Check if instructor is a UUID (contains hyphens and is 36 characters long)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workshopData.instructor)
        
        if (isUUID) {
          try {
            // Get user info from users table (using maybeSingle to avoid 404)
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('id', workshopData.instructor)
              .maybeSingle()
            
            if (userError) {
              console.log('User query error:', userError)
            } else if (userData) {
              setInstructorProfile({
                name: userData.name || userData.email?.split('@')[0] || 'ไม่ระบุชื่อ',
                email: userData.email,
                avatar_seed: userData.avatar_seed,
                avatar_saturation: userData.avatar_saturation,
                avatar_lightness: userData.avatar_lightness
              })
            } else {
              // If user doesn't exist, show UUID as fallback
              setInstructorProfile({
                name: `User ${workshopData.instructor.slice(0, 8)}...`,
                email: null,
                avatar_seed: workshopData.instructor,
                avatar_saturation: 50,
                avatar_lightness: 50
              })
            }
          } catch (error) {
            console.log('Error fetching instructor data:', error)
            // Fallback: show UUID with generated avatar
            setInstructorProfile({
              name: `User ${workshopData.instructor.slice(0, 8)}...`,
              email: null,
              avatar_seed: workshopData.instructor,
              avatar_saturation: 50,
              avatar_lightness: 50
            })
          }
        } else {
          // If it's not a UUID, it's probably already a name
          setInstructorProfile(null)
        }
      }

      // Fetch workshop materials using the existing service
      try {
        const materialsData = await MaterialService.getWorkshopMaterials(id)
        setMaterials(materialsData || [])
      } catch (materialError) {
        console.error('Materials error:', materialError)
        setMaterials([])
      }

      // Get tasks using admin operations (this bypasses RLS for reading)
      let tasksData = []
      try {
        tasksData = await adminOperations.getWorkshopTasks(id)
        console.log('Tasks fetched successfully:', tasksData?.length || 0)
        // Exclude archived tasks from end-user feed
        const visibleTasks = (tasksData || []).filter((t: any) => !t.is_archived)
        setTasks(visibleTasks)
      } catch (tasksError) {
        console.error('Tasks query error:', tasksError)
        setTasks([])
      }

      // Fetch user's submissions
      const finalTasksForSubmissions = tasksData || []
      
      const taskIds = finalTasksForSubmissions.map(t => t.id).filter(Boolean)
      
      let submissionsData = []
      if (taskIds.length > 0) {
        const { data: subData, error: subError } = await supabase
          .from('submissions')
          .select('*')
          .eq('user_id', user?.id)
          .in('task_id', taskIds)
        
        if (subError) {
          console.error('Submissions query error:', subError)
        }
        submissionsData = subData || []
      }

      setSubmissions(submissionsData || [])

      // Load group info for group-mode tasks
      if (user && tasksData && tasksData.length > 0) {
        const newTaskGroups: Record<string, any | null> = {}
        const newGroupMembers: Record<string, any[]> = {}
        const newGroupSubs: Record<string, any | null> = {}
        for (const t of tasksData) {
          if ((t as any).submission_mode === 'group') {
            try {
              const g = await groupService.getUserGroupForTask(t.id, user.id)
              newTaskGroups[t.id] = g
              if (g) {
                const mem = await groupService.listMembers(g.id)
                newGroupMembers[g.id] = mem || []
                const gs = await submissionService.getGroupTaskSubmission(t.id, g.id)
                newGroupSubs[g.id] = gs || null
              }
            } catch (e) {
              console.warn('Group load failed for task', t.id, e)
            }
          }
        }
        setTaskGroups(prev => ({ ...prev, ...newTaskGroups }))
        setGroupMembers(prev => ({ ...prev, ...newGroupMembers }))
        setGroupSubmissions(prev => ({ ...prev, ...newGroupSubs }))
      }

    } catch (error) {
      console.error('Error fetching workshop data:', error)
      alert('Error: ' + JSON.stringify(error))
    } finally {
      setLoading(false)
    }
  }

  const handleTaskSubmission = async (taskId: string) => {
    if (!user || !submissionUrl.trim()) return

    try {
      console.log('Submitting task:', taskId, 'for user:', user.id)
      
      const existingSubmission = submissions.find(s => s.task_id === taskId)
      const currentTask = tasks.find(t => t.id === taskId)
      
      const submissionData = {
        task_id: taskId,
        user_id: user.id,
        submission_url: submissionUrl,
        notes: submissionNotes,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      }
      
      if ((currentTask as any)?.submission_mode === 'group') {
        const g = taskGroups[taskId]
        if (!g) {
          alert('กรุณาสร้างหรือเข้าร่วมกลุ่มก่อนส่งงาน')
          return
        }
        const saved = await submissionService.upsertGroupSubmission({
          ...submissionData,
          group_id: g.id,
          updated_at: new Date().toISOString()
        } as any)
        setGroupSubmissions(prev => ({ ...prev, [g.id]: saved }))
      } else if (existingSubmission) {
        console.log('Updating existing submission:', existingSubmission.id)
        // Update existing submission
        const { error } = await supabase
          .from('submissions')
          .update({
            submission_url: submissionUrl,
            notes: submissionNotes,
            status: 'submitted',
            submitted_at: new Date().toISOString()
          })
          .eq('id', existingSubmission.id)
        
        if (error) {
          console.error('Update submission error:', error)
          throw error
        }
        console.log('Submission updated successfully')
      } else {
        console.log('Creating new submission')
        // Create new submission
        const { data, error } = await supabase
          .from('submissions')
          .insert(submissionData)
          .select()
        
        if (error) {
          console.error('Create submission error:', error)
          throw error
        }
        console.log('New submission created:', data)
      }

      // Refresh submissions
      await fetchWorkshopData()
      setSubmissionUrl('')
      setSubmissionNotes('')
      setEditingTaskId(null)
      alert('ส่งงานเรียบร้อยแล้ว!')
      
    } catch (error) {
      console.error('Error submitting task:', error)
      alert(`เกิดข้อผิดพลาดในการส่งงาน: ${error.message || error}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!workshop) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavigation />
        <div className="max-w-4xl mx-auto px-8 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">ไม่พบ Workshop</h2>
            <p className="text-gray-600 mb-6">Workshop ที่คุณค้นหาไม่มีอยู่ในระบบ</p>
            <Link
              to="/sessions"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              กลับไปหน้า Workshops
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Generate workshop color based on id
  const colorIndex = workshop.id.charCodeAt(0) % 4
  const gradients = [
    'bg-indigo-600',
    'bg-gray-800',
    'bg-gray-700',
    'bg-indigo-700'
  ]
  const gradient = gradients[colorIndex]
  
  // Get the main material (first material with embed display mode, or first material if none)
  const mainMaterial = materials.find(m => m.display_mode === 'embed') || materials[0]
  const secondaryMaterials = materials.filter(m => m.id !== mainMaterial?.id)
  
  const descriptionPreview = workshop.description?.slice(0, 150) || ''
  const hasLongDescription = (workshop.description?.length || 0) > 150

  // Helper function to render instructor
  const renderInstructor = () => {
    if (!workshop.instructor) return null
    
    // Check if instructor is UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workshop.instructor)
    
    if (isUUID) {
      // For UUID, use the same pattern as ProfileButton
      const displayName = instructorProfile?.name || instructorProfile?.email || `User ${workshop.instructor.slice(0, 8)}...`
      
      return (
        <div className="flex items-center gap-3">
          <Avatar
            username={instructorProfile?.email || workshop.instructor}
            name={instructorProfile?.name || instructorProfile?.email || displayName}
            avatarSeed={instructorProfile?.avatar_seed}
            size={20}
            saturation={instructorProfile?.avatar_saturation}
            lightness={instructorProfile?.avatar_lightness}
          />
          <span className="text-gray-900 text-sm font-medium">{displayName}</span>
        </div>
      )
    } else {
      // It's already a name, not UUID
      return (
        <div className="flex items-center gap-3">
          <Avatar
            username={workshop.instructor}
            name={workshop.instructor}
            size={20}
          />
          <span className="text-gray-900 text-sm font-medium">{workshop.instructor}</span>
        </div>
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavigation />
      
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="mb-4">
          <BackButton />
        </div>
        {/* Main Material Display - YouTube Style */}
        {mainMaterial ? (
          <div className="mb-8">
            {/* Material Embed */}
            <div className="aspect-video w-full mb-6 rounded-2xl overflow-hidden">
              <WorkshopMaterialDisplay 
                material={mainMaterial} 
                className="w-full h-full"
              />
            </div>
            
            {/* Workshop Title and Info - Like YouTube video title */}
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                {workshop.title}
              </h1>
              
              {/* Workshop Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium">
                    <span>🏫</span>
                    <span>Phase {workshop.phase || '1'}</span>
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span>📅</span>
                  <span>
                    {new Date(workshop.workshop_date).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span>⏰</span>
                  <span>{workshop.start_time} - {workshop.end_time}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span>👥</span>
                  <span>{workshop.max_participants} ที่นั่ง</span>
                </div>

                {workshop.instructor && (
                  <div className="flex items-center gap-2">
                    <span>👨‍🏫</span>
                    <span className="flex items-center gap-2">
                      วิทยากร: {renderInstructor()}
                    </span>
                  </div>
                )}
                
                {workshop.location && (
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span>{workshop.location}</span>
                  </div>
                )}
              </div>
              
              {/* Collapsible Description */}
              {workshop.description && (
                <div className="bg-gray-100 rounded-xl p-4">
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {showFullDescription ? workshop.description : descriptionPreview}
                    {!showFullDescription && hasLongDescription && '...'}
                  </p>
                  {hasLongDescription && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="mt-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors"
                    >
                      {showFullDescription ? 'ย่อลง' : 'แสดงเพิ่มเติม'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Clean Workshop Header */
          <div className="bg-white rounded-lg mb-6 shadow-sm border border-gray-200">
            <div className="px-6 py-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="text-3xl">🎓</div>
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 bg-gray-100 rounded px-3 py-1 mb-2">
                    <span className="text-sm">✨</span>
                    <span className="text-gray-700 text-sm font-medium">Phase {workshop.phase || '1'}</span>
                  </div>
                  <h1 className="text-2xl font-bold mb-2 text-gray-900">{workshop.title}</h1>
                  <p className="text-gray-600 text-sm">เรียนรู้และพัฒนาไปกับเราในโลกของ AI</p>
                </div>
              </div>
              
              {workshop.description && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                    {showFullDescription ? workshop.description : descriptionPreview}
                    {!showFullDescription && hasLongDescription && '...'}
                  </p>
                  {hasLongDescription && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="mt-2 text-blue-600 hover:text-blue-700 text-sm underline"
                    >
                      {showFullDescription ? 'ย่อลง' : 'แสดงเพิ่มเติม'}
                    </button>
                  )}
                </div>
              )}
              
              {/* Clean Information Grid */}
              <div className="bg-gray-50 rounded-lg p-4">
                {/* Instructor */}
                {workshop.instructor && (
                  <div className="mb-4">
                    <div className="text-gray-500 text-xs font-medium mb-1">
                      วิทยากร
                    </div>
                    <div className="flex items-center gap-2">
                      {renderInstructor()}
                    </div>
                  </div>
                )}
                
                {/* Date & Time Section */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-gray-500 text-xs font-medium mb-1">
                      วันที่
                    </div>
                    <div className="text-gray-900 text-sm font-medium">
                      {new Date(workshop.workshop_date).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-gray-500 text-xs font-medium mb-1">
                      เวลา
                    </div>
                    <div className="text-gray-900 text-sm font-medium">
                      {workshop.start_time} - {workshop.end_time}
                    </div>
                  </div>
                </div>
                
                {/* Location */}
                {workshop.location && (
                  <div className="mb-4">
                    <div className="text-gray-500 text-xs font-medium mb-1">
                      สถานที่
                    </div>
                    <div className="text-gray-900 text-sm font-medium">
                      {workshop.location}
                    </div>
                  </div>
                )}
                
                {/* Participants */}
                <div>
                  <div className="text-gray-500 text-xs font-medium mb-1">
                    ผู้เข้าร่วม
                  </div>
                  <div className="text-gray-900 text-sm font-medium">
                    {workshop.current_participants}/{workshop.max_participants} คน
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        )}

        {/* Simple Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6 border border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-3 px-4 text-center text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>📊</span>
                <span>สถิติ Workshop</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`flex-1 py-3 px-4 text-center text-sm font-medium transition-colors ${
                activeTab === 'materials'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>📝</span>
                <span>เอกสารและงาน ({materials.length + (mainMaterial ? -1 : 0)} เอกสาร, {tasks.length} งาน)</span>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Simple Workshop Stats */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">สถิติ Workshop</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">📚</div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{materials.length}</p>
                      <p className="text-gray-600 text-sm">เอกสารประกอบ</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">📝</div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
                      <p className="text-gray-600 text-sm">งานที่ต้องส่ง</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">✅</div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {submissions.filter(s => s.status === 'submitted').length}
                      </p>
                      <p className="text-gray-600 text-sm">งานที่ส่งแล้ว</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'materials' && (
          <div className="space-y-8">
            {/* Secondary Materials Section */}
            {secondaryMaterials.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <span className="mr-3">📚</span>
                  เอกสารประกอบเพิ่มเติม
                </h2>
                <WorkshopMaterialsList materials={secondaryMaterials} />
              </div>
            )}
            
            {/* Main Material (if exists, show as additional section) */}
            {mainMaterial && (
              <div className="bg-gray-50 rounded-2xl p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="mr-3">🎯</span>
                  เอกสารหลัก
                </h2>
                <div className="bg-white rounded-xl p-4">
                  <WorkshopMaterialDisplay material={mainMaterial} />
                </div>
              </div>
            )}

            {/* Tasks Section */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📝</span>
                งานที่ต้องส่ง ({tasks.length} งาน)
              </h2>
              <div className="flex justify-end mb-2">
                <button
                  onClick={fetchWorkshopData}
                  className="inline-flex items-center gap-2 text-sm px-3 py-1.5 border rounded-md text-gray-700 hover:bg-gray-50"
                  title="รีเฟรชหน้า"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0014-7V9m0-4a9 9 0 00-14 7v3" />
                  </svg>
                  รีเฟรชหน้า
                </button>
              </div>
              
              {tasks.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-3xl mb-3">📝</div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">รอการมอบหมายงาน</h3>
                  <p className="text-gray-600 text-xs mb-4">วิทยากรยังไม่ได้สร้างงานสำหรับ Workshop นี้</p>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 max-w-md mx-auto">
                    <div className="flex items-start gap-2">
                      <div className="text-blue-600 text-sm">💡</div>
                      <div className="text-left">
                        <p className="text-blue-900 font-medium text-xs mb-1">สำหรับผู้เข้าร่วม:</p>
                        <ul className="text-blue-800 text-xs space-y-1 list-disc list-inside">
                          <li>งานจะปรากฏขึ้นเมื่อวิทยากรสร้างในระบบ</li>
                          <li>คุณจะได้รับการแจ้งเตือนเมื่อมีงานใหม่</li>
                          <li>สามารถส่งงานผ่าน URL หรือไฟล์แนบ</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => {
                    const submission = submissions.find(s => s.task_id === task.id)
                    const g = taskGroups[task.id]
                    const gSub = g ? groupSubmissions[g.id] : null
                    const isSubmitted = (task as any).submission_mode === 'group' ? (gSub?.status === 'submitted') : (submission?.status === 'submitted')
                    const dueDate = new Date(task.due_date)
                    const isOverdue = dueDate < new Date() && !isSubmitted
                    
                    return (
                      <div key={task.id} className="bg-white border border-gray-200 rounded-lg shadow-sm relative">
                        {/* Task Header */}
                        <div className="p-3 bg-gray-800 text-white">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="text-sm font-medium mb-1">{task.title}</h3>
                              {task.description && (
                                <p className="text-white/80 text-xs mb-2">{task.description}</p>
                              )}
                              <div className="flex items-center gap-2 text-xs">
                                <span className="bg-white/20 px-2 py-1 rounded text-xs">
                                  📅 {dueDate.toLocaleDateString('th-TH')}
                                </span>
                                <StatusBadge 
                                  status={isSubmitted ? 'completed' : isOverdue ? 'overdue' : 'pending'}
                                  size="sm"
                                  showIcon={true}
                                />
                              </div>
                            </div>
                            {/* per-card refresh removed */}
                            <div className="text-lg ml-2">
                              {isSubmitted ? '✅' : isOverdue ? '⚠️' : '📝'}
                            </div>
                          </div>
                        </div>

                        {/* Task Content */}
                        <div className="p-3 pb-12">
                          {/* Submitted Task Display */}
                          {isSubmitted && editingTaskId !== task.id && (
                            <div className="mt-3">
                              {submission?.submission_url && (
                                <a 
                                  href={submission.submission_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-2 p-3 border rounded-lg transition-all duration-200 group bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                                >
                                  <div className="flex items-center space-x-2 flex-1">
                                    <span className="text-green-600 text-sm">✅</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm truncate">งานที่ส่ง</div>
                                      <div className="text-xs opacity-75">{new Date(submission?.submitted_at || '').toLocaleDateString('th-TH')}</div>
                                    </div>
                                  </div>
                                  <svg
                                    className="w-4 h-4 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                    />
                                  </svg>
                                </a>
                              )}
                              
                              {submission?.notes && (
                                <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                                  {submission.notes}
                                </div>
                              )}
                              
                              {/* Edit Submission Button */}
                              <div className="mt-2 flex justify-end">
                                <button
                                  onClick={() => {
                                    setSubmissionUrl(submission?.submission_url || '')
                                    setSubmissionNotes(submission?.notes || '')
                                    setEditingTaskId(task.id)
                                  }}
                                  className="text-gray-600 hover:text-gray-800 text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                                >
                                  แก้ไข
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Edit Form for Submitted Tasks */}
                          {isSubmitted && editingTaskId === task.id && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="space-y-3">
                                <input
                                  type="url"
                                  value={submissionUrl}
                                  onChange={(e) => setSubmissionUrl(e.target.value)}
                                  placeholder="https://example.com/my-work"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                                  required
                                />
                                
                                <textarea
                                  value={submissionNotes}
                                  onChange={(e) => setSubmissionNotes(e.target.value)}
                                  placeholder="หมายเหตุ..."
                                  rows={2}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm resize-none"
                                />
                                
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleTaskSubmission(task.id)}
                                    disabled={!submissionUrl.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                                  >
                                    บันทึก
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingTaskId(null)
                                      setSubmissionUrl('')
                                      setSubmissionNotes('')
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                                  >
                                    ยกเลิก
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        
                          {/* Submit Button for Unsubmitted Tasks */}
                          {!isSubmitted && editingTaskId !== task.id && (
                            <button
                              onClick={() => setEditingTaskId(task.id)}
                              className="absolute bottom-3 right-3 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                            >
                              ส่งงาน
                            </button>
                          )}
                          
                          {/* Submission Form for Unsubmitted Tasks */}
                          {!isSubmitted && editingTaskId === task.id && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              {(task as any).submission_mode === 'group' && (
                                <div className="mb-3">
                                  {!taskGroups[task.id] ? (
                                    <div className="grid gap-3 md:grid-cols-2">
                                      <div className="border rounded p-3">
                                        <div className="font-medium mb-2">สร้างกลุ่ม</div>
                                        <GroupCreateInline taskId={task.id} onDone={async () => {
                                          if (!user) return;
                                          const g = await groupService.getUserGroupForTask(task.id, user.id);
                                          setTaskGroups(prev => ({ ...prev, [task.id]: g }));
                                          if (g) {
                                            const mem = await groupService.listMembers(g.id);
                                            setGroupMembers(prev => ({ ...prev, [g.id]: mem || [] }));
                                          }
                                        }} />
                                      </div>
                                      <div className="border rounded p-3">
                                        <div className="font-medium mb-2">เข้าร่วมด้วยรหัส</div>
                                        <GroupJoinInline onDone={async () => {
                                          if (!user) return;
                                          const g = await groupService.getUserGroupForTask(task.id, user.id);
                                          setTaskGroups(prev => ({ ...prev, [task.id]: g }));
                                          if (g) {
                                            const mem = await groupService.listMembers(g.id);
                                            setGroupMembers(prev => ({ ...prev, [g.id]: mem || [] }));
                                          }
                                        }} />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-3 bg-white rounded border">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="text-sm">กลุ่ม: <span className="font-medium">{taskGroups[task.id]?.name}</span></div>
                                          <div className="text-xs text-gray-600">รหัส: <span className="font-mono tracking-widest">{taskGroups[task.id]?.party_code}</span></div>
                                        </div>
                                        <button onClick={() => navigator.clipboard.writeText(taskGroups[task.id]?.party_code)} className="text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50">คัดลอกรหัส</button>
                                      </div>
                                      {taskGroups[task.id] && groupMembers[taskGroups[task.id]?.id || '']?.length > 0 && (
                                        <div className="mt-2">
                                          <div className="text-xs text-gray-600 mb-1">Members</div>
                                          <div className="flex flex-wrap gap-2">
                                            {groupMembers[taskGroups[task.id]?.id || ''].map((m: any) => (
                                              <span key={m.user_id} className="inline-flex items-center gap-1 bg-gray-100 border px-2 py-1 rounded text-xs">
                                                {m.user?.name || m.user_id.slice(0,6)}
                                                {(taskGroups[task.id]?.owner_id === user?.id || m.user_id === user?.id) && (
                                                  <button
                                                    onClick={async () => {
                                                      try {
                                                        await groupService.removeMember(taskGroups[task.id]!.id, m.user_id)
                                                        const mem = await groupService.listMembers(taskGroups[task.id]!.id)
                                                        setGroupMembers(prev => ({ ...prev, [taskGroups[task.id]!.id]: mem || [] }))
                                                        // if user removed self, clear local group
                                                        if (m.user_id === user?.id) {
                                                          setTaskGroups(prev => ({ ...prev, [task.id]: null }))
                                                        }
                                                      } catch (e) {
                                                        console.error('remove member failed', e)
                                                      }
                                                    }}
                                                    className="text-gray-500 hover:text-gray-700"
                                                    title={m.user_id === user?.id ? 'Leave group' : 'Remove member'}
                                                  >
                                                    ×
                                                  </button>
                                                )}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="space-y-3">
                                <input
                                  type="url"
                                  value={submissionUrl}
                                  onChange={(e) => setSubmissionUrl(e.target.value)}
                                  placeholder="https://drive.google.com/... หรือ https://docs.google.com/..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                                />
                                
                                <textarea
                                  value={submissionNotes}
                                  onChange={(e) => setSubmissionNotes(e.target.value)}
                                  rows={2}
                                  placeholder="หมายเหตุ..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm resize-none"
                                />
                                
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleTaskSubmission(task.id)}
                                    disabled={!submissionUrl.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                                  >
                                    ส่งงาน
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingTaskId(null)
                                      setSubmissionUrl('')
                                      setSubmissionNotes('')
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
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
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function GroupCreateInline({ taskId, onDone }: { taskId: string; onDone: () => void }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Member search state
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [selectedUsers, setSelectedUsers] = useState<any[]>([])

  useEffect(() => {
    let active = true
    const run = async () => {
      if (!query.trim()) { setSuggestions([]); return }
      try {
        const res = await groupService.searchUsers(query, 8)
        if (active) setSuggestions(res || [])
      } catch (e) {
        console.warn('search users failed', e)
      }
    }
    const t = setTimeout(run, 200)
    return () => { active = false; clearTimeout(t) }
  }, [query])

  const addSelected = (u: any) => {
    if (!u) return
    if (selectedUsers.find(x => x.id === u.id)) return
    setSelectedUsers(prev => [...prev, u])
    setQuery('')
    setSuggestions([])
  }

  // Per-card refresh removed per request

  const removeSelected = (id: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== id))
  }

  return (
    <div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border px-3 py-2 rounded mb-2"
        placeholder="ชื่อกลุ่ม"
      />

      <div className="mb-2">
        <div className="text-xs text-gray-600 mb-1">เพิ่มสมาชิก (พิมพ์ชื่อหรืออีเมล)</div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border px-3 py-2 rounded"
          placeholder="เช่น student@domain.com"
        />
        {suggestions.length > 0 && (
          <div className="border rounded mt-1 bg-white max-h-40 overflow-auto text-sm">
            {suggestions.map(s => (
              <button key={s.id} onClick={() => addSelected(s)} className="w-full text-left px-3 py-2 hover:bg-gray-50">
                <div className="font-medium">{s.name || s.email}</div>
                <div className="text-xs text-gray-500">{s.email}</div>
              </button>
            ))}
          </div>
        )}
        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedUsers.map(u => (
              <span key={u.id} className="inline-flex items-center gap-1 bg-gray-100 border px-2 py-1 rounded text-xs">
                {u.name || u.email}
                <button onClick={() => removeSelected(u.id)} className="text-gray-500 hover:text-gray-700">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && <div className="text-red-600 text-xs mb-2">{error}</div>}
      <button
        onClick={async () => {
          if (!user) return
          try {
            setLoading(true)
            setError(null)
            const group = await groupService.createGroup(taskId, name.trim() || 'My Group', user.id)
            const memberIds = selectedUsers.map(u => u.id).filter((id: string) => id && id !== user.id)
            if (memberIds.length > 0) {
              await groupService.addMembers(group.id, memberIds)
            }
            await onDone()
          } catch (e: any) {
            setError(e?.message || 'สร้างกลุ่มไม่สำเร็จ')
          } finally {
            setLoading(false)
          }
        }}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
      >
        {loading ? 'กำลังสร้าง...' : 'สร้างกลุ่ม'}
      </button>
    </div>
  )
}

function GroupJoinInline({ onDone }: { onDone: () => void }) {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        className="w-full border px-3 py-2 rounded mb-2 tracking-widest"
        placeholder="ABC123"
      />
      {error && <div className="text-red-600 text-xs mb-2">{error}</div>}
      <button
        onClick={async () => {
          if (!user) return
          try {
            setLoading(true)
            setError(null)
            await groupService.joinByCode(code.trim(), user.id)
            await onDone()
          } catch (e: any) {
            setError(e?.message || 'รหัสไม่ถูกต้อง')
          } finally {
            setLoading(false)
          }
        }}
        disabled={loading}
        className="bg-gray-800 hover:bg-black text-white px-3 py-2 rounded text-sm"
      >
        {loading ? 'กำลังเข้าร่วม...' : 'เข้าร่วม'}
      </button>
    </div>
  )
}
