import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../services/supabase'
import { adminOperations } from '../services/supabaseAdmin'
import { useDebouncedCallback } from '../utils/debounce'
import { UserNavigation } from '../components/user/UserNavigation'
import { BackButton } from '../components/common/BackButton'
import { StatusBadge } from '../components/ui/StatusBadge'
import { WorkshopMaterialsList, WorkshopMaterialDisplay } from '../components/materials/WorkshopMaterialDisplay'
import TaskMaterialDisplay from '../components/tasks/TaskMaterialDisplay'
import { MaterialService } from '../services/materials'
import { Avatar } from '../components/common/Avatar'
import type { WorkshopMaterial } from '../types/materials'
import { groupService } from '../services/groups'
import { submissionService } from '../services/submissions'
import { formatDateShort, formatDateTimeShort } from '../utils/date'
import { GroupManagementCard } from '../components/groups/GroupManagementCard'
import { JoinGroupCard } from '../components/groups/JoinGroupCard'
import { Copy } from 'lucide-react'

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
  const navigate = useNavigate()
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
  // Draft links for new submissions (per task)
  const [draftLinks, setDraftLinks] = useState<Record<string, string[]>>({})
  // Inline add-link inputs per task (for submitted cards)
  const [addLinkInput, setAddLinkInput] = useState<Record<string, string>>({})
  const [addLinkNoteInput, setAddLinkNoteInput] = useState<Record<string, string>>({})
  // Edit-mode link list per task (array of {url, note})
  const [editLinksMap, setEditLinksMap] = useState<Record<string, { url: string; note?: string }[]>>({})
  // Show group management modal for submitted tasks
  const [showGroupManagementFor, setShowGroupManagementFor] = useState<string | null>(null)
  const [success, setSuccess] = useState('')

  const normalizeLinkObjects = (raw: any): { url: string; note?: string }[] => {
    if (!raw) return []
    const arr = Array.isArray(raw) ? raw : []
    return arr.map((v: any) =>
      typeof v === 'string'
        ? { url: v }
        : (v && typeof v === 'object' && typeof v.url === 'string')
          ? { url: v.url, note: typeof v.note === 'string' ? v.note : undefined }
          : null
    ).filter(Boolean) as { url: string; note?: string }[]
  }

  const copyPartyCode = (partyCode: string) => {
    navigator.clipboard.writeText(partyCode)
    setSuccess('คัดลอกรหัสกลุ่มแล้ว')
    setTimeout(() => setSuccess(''), 3000)
  }

  useEffect(() => {
    if (id && user) {
      fetchWorkshopData()
    }
  }, [id, user])

  const refreshTasksData = async () => {
    try {
      setLoading(true)
      
      // Refresh only submissions and group data (tasks don't change frequently)
      const taskIds = tasks.map(t => t.id).filter(Boolean)
      
      let submissionsData = []
      if (taskIds.length > 0) {
        const { data: subData, error: subError } = await supabase
          .from('submissions')
          .select('id, task_id, user_id, submission_url, links, notes, status, submitted_at')
          .eq('user_id', user?.id)
          .in('task_id', taskIds)
        
        if (subError) {
          console.error('Submissions refresh error:', subError)
        }
        submissionsData = subData || []
      }

      setSubmissions(submissionsData || [])

      // Refresh group info for group-mode tasks (optimized parallel)
      if (user && tasks && tasks.length > 0) {
        const groupTasks = tasks.filter(t => (t as any).submission_mode === 'group')
        
        if (groupTasks.length > 0) {
          try {
            const groupPromises = groupTasks.map(async (t) => {
              try {
                const g = await groupService.getUserGroupForTask(t.id, user.id)
                if (!g) return { taskId: t.id, group: null, members: [], submission: null }

                // Load with timeout to prevent hanging
                const loadWithTimeout = async (promise: Promise<any>, timeoutMs: number = 3000) => {
                  const timeout = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
                  )
                  try {
                    return await Promise.race([promise, timeout])
                  } catch (error) {
                    console.warn('Operation timed out or failed:', error)
                    return null
                  }
                }

                const [mem, gs] = await Promise.all([
                  loadWithTimeout(groupService.listMembers(g.id), 3000).then(m => m || []),
                  loadWithTimeout(submissionService.getGroupTaskSubmission(t.id, g.id), 3000)
                ])

                return {
                  taskId: t.id,
                  group: g,
                  members: mem || [],
                  submission: gs || null
                }
              } catch (e) {
                console.warn('Group refresh failed for task', t.id, e)
                return { taskId: t.id, group: null, members: [], submission: null }
              }
            })

            const groupResults = await Promise.all(groupPromises)
            
            const newTaskGroups: Record<string, any | null> = {}
            const newGroupMembers: Record<string, any[]> = {}
            const newGroupSubs: Record<string, any | null> = {}

            groupResults.forEach(result => {
              newTaskGroups[result.taskId] = result.group
              if (result.group) {
                newGroupMembers[result.group.id] = result.members
                newGroupSubs[result.group.id] = result.submission
              }
            })

            setTaskGroups(prev => ({ ...prev, ...newTaskGroups }))
            setGroupMembers(prev => ({ ...prev, ...newGroupMembers }))
            setGroupSubmissions(prev => ({ ...prev, ...newGroupSubs }))
          } catch (e) {
            console.error('Group refresh failed:', e)
          }
        }
      }

    } catch (error) {
      console.error('Error refreshing tasks data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWorkshopData = async () => {
    try {
      setLoading(true)

      // Start all main data fetching in parallel
      const [workshopResult, materialsResult, tasksResult] = await Promise.allSettled([
        // Fetch workshop details
        supabase.from('workshops').select('*').eq('id', id).single(),
        
        // Fetch materials
        MaterialService.getWorkshopMaterials(id),
        
        // Fetch tasks
        adminOperations.getWorkshopTasks(id)
      ])

      // Handle workshop data
      if (workshopResult.status === 'fulfilled' && workshopResult.value.data) {
        const workshopData = workshopResult.value.data
        setWorkshop(workshopData)

        // Fetch instructor profile if needed (parallel with other operations)
        if (workshopData?.instructor) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workshopData.instructor)
          
          if (isUUID) {
            // Don't await this - let it load in background
            supabase
              .from('users')
              .select('*')
              .eq('id', workshopData.instructor)
              .maybeSingle()
              .then(({ data: userData }) => {
                if (userData) {
                  setInstructorProfile({
                    name: userData.name || userData.email?.split('@')[0] || 'ไม่ระบุชื่อ',
                    email: userData.email,
                    avatar_seed: userData.avatar_seed,
                    avatar_saturation: userData.avatar_saturation,
                    avatar_lightness: userData.avatar_lightness
                  })
                } else {
                  setInstructorProfile({
                    name: `User ${workshopData.instructor.slice(0, 8)}...`,
                    email: null,
                    avatar_seed: workshopData.instructor,
                    avatar_saturation: 50,
                    avatar_lightness: 50
                  })
                }
              })
              .catch(() => {
                setInstructorProfile({
                  name: `User ${workshopData.instructor.slice(0, 8)}...`,
                  email: null,
                  avatar_seed: workshopData.instructor,
                  avatar_saturation: 50,
                  avatar_lightness: 50
                })
              })
          } else {
            setInstructorProfile(null)
          }
        }
      } else {
        throw workshopResult.status === 'rejected' ? workshopResult.reason : new Error('Workshop not found')
      }

      // Handle materials
      if (materialsResult.status === 'fulfilled') {
        setMaterials(materialsResult.value || [])
      } else {
        console.error('Materials error:', materialsResult.reason)
        setMaterials([])
      }

      // Handle tasks and submissions
      let tasksData = []
      if (tasksResult.status === 'fulfilled') {
        tasksData = tasksResult.value || []
        console.log('Tasks fetched successfully:', tasksData.length)
        const visibleTasks = tasksData.filter((t: any) => !t.is_archived)
        setTasks(visibleTasks)
      } else {
        console.error('Tasks query error:', tasksResult.reason)
        setTasks([])
      }

      // Fetch submissions with minimal data needed for display
      const taskIds = tasksData.map(t => t.id).filter(Boolean)
      let submissionsData = []
      
      if (taskIds.length > 0) {
        const { data: subData, error: subError } = await supabase
          .from('submissions')
          .select('id, task_id, user_id, submission_url, links, notes, status, submitted_at')
          .eq('user_id', user?.id)
          .in('task_id', taskIds)
        
        if (subError) {
          console.error('Submissions query error:', subError)
        }
        submissionsData = subData || []
      }

      setSubmissions(submissionsData || [])

      // Load group info for group-mode tasks (optimized parallel loading)
      if (user && tasksData && tasksData.length > 0) {
        const groupTasks = tasksData.filter(t => (t as any).submission_mode === 'group')
        
        if (groupTasks.length > 0) {
          try {
            // Load all group data in parallel (no cleanup to avoid slowdown)
            const groupPromises = groupTasks.map(async (t) => {
              try {
                const g = await groupService.getUserGroupForTask(t.id, user.id)
                if (!g) return { taskId: t.id, group: null, members: [], submission: null }

                // Load members and submission in parallel for this group with timeout
                const loadWithTimeout = async (promise: Promise<any>, timeoutMs: number = 3000) => {
                  const timeout = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
                  )
                  try {
                    return await Promise.race([promise, timeout])
                  } catch (error) {
                    console.warn('Operation timed out or failed:', error)
                    return null
                  }
                }
                
                const [mem, gs] = await Promise.all([
                  loadWithTimeout(groupService.listMembers(g.id), 3000).then(m => m || []),
                  loadWithTimeout(submissionService.getGroupTaskSubmission(t.id, g.id), 3000)
                ])

                return {
                  taskId: t.id,
                  group: g,
                  members: mem || [],
                  submission: gs || null
                }
              } catch (e) {
                console.warn('Group load failed for task', t.id, e)
                return { taskId: t.id, group: null, members: [], submission: null }
              }
            })

            const groupResults = await Promise.all(groupPromises)
            
            // Update state in batch
            const newTaskGroups: Record<string, any | null> = {}
            const newGroupMembers: Record<string, any[]> = {}
            const newGroupSubs: Record<string, any | null> = {}

            groupResults.forEach(result => {
              newTaskGroups[result.taskId] = result.group
              if (result.group) {
                newGroupMembers[result.group.id] = result.members
                newGroupSubs[result.group.id] = result.submission
              }
            })

            setTaskGroups(prev => ({ ...prev, ...newTaskGroups }))
            setGroupMembers(prev => ({ ...prev, ...newGroupMembers }))
            setGroupSubmissions(prev => ({ ...prev, ...newGroupSubs }))
          } catch (e) {
            console.error('Group loading failed:', e)
          }
        }
      }

    } catch (error) {
      console.error('Error fetching workshop data:', error)
      alert('Error: ' + JSON.stringify(error))
    } finally {
      setLoading(false)
    }
  }

  const handleTaskSubmission = async (taskId: string) => {
    if (!user || !(submissionUrl.trim() || (draftLinks[taskId]?.length || 0) > 0)) return

    try {
      console.log('Submitting task:', taskId, 'for user:', user.id)
      
      const existingSubmission = submissions.find(s => s.task_id === taskId)
      const currentTask = tasks.find(t => t.id === taskId)
      
      const linksArr = [
        ...(draftLinks[taskId] || []),
        ...(submissionUrl.trim() ? [submissionUrl.trim()] : [])
      ]
      const submissionData = {
        task_id: taskId,
        user_id: user.id,
        submission_url: submissionUrl,
        links: linksArr.length > 0 ? linksArr : null,
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
      setDraftLinks(prev => ({ ...prev, [taskId]: [] }))
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
              className="btn btn-primary px-6 py-3 font-semibold"
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
      
      {success && (
        <div className="fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50">
          {success}
        </div>
      )}
      
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="mb-4">
          <BackButton />
        </div>
        {/* Main Material Display - make it clear this is workshop materials */}
        {mainMaterial ? (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-100 text-rose-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v12m6-6H6"/></svg>
              </span>
              <h3 className="text-sm font-semibold text-gray-700">เอกสารประกอบของ Workshop นี้</h3>
            </div>
            {/* Material Display: embed hero only if embed mode */}
            {mainMaterial.display_mode === 'embed' && (mainMaterial as any).embed_url ? (
              <div className="aspect-video w-full mb-6 rounded-2xl overflow-hidden">
                <WorkshopMaterialDisplay material={mainMaterial} className="w-full h-full" />
              </div>
            ) : (
              <div className="mb-6">
                <WorkshopMaterialDisplay material={mainMaterial} />
              </div>
            )}
            
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
                  <span>{formatDateShort(workshop.workshop_date, 'CE')}</span>
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
                      {formatDateShort(workshop.workshop_date, 'CE')}
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
        <div className="hidden bg-white rounded-lg shadow-sm mb-6 border border-gray-200">
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

        {/* Combined Content */}
        {
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
        }

        {
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
            

            {/* Tasks Section */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📝</span>
                งานที่ต้องส่ง ({tasks.length} งาน)
              </h2>
              <div className="flex justify-end mb-2">
                <button
                  onClick={refreshTasksData}
                  className="inline-flex items-center gap-2 text-sm px-3 py-1.5 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  title="รีเฟรชข้อมูลงาน"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.49 9A9 9 0 1115.8 3.8L17 5M17 1v4h-4" />
                  </svg>
                  รีเฟรช
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
                          <div key={task.id} className="bg-gray-100 border border-gray-200 rounded-lg shadow-sm relative">
                        {/* Task Header */}
                        <div className="p-3 bg-blue-600 text-white rounded-t-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="text-sm font-medium mb-1">{task.title}</h3>
                              {task.description && (
                                <p className="text-white/80 text-xs mb-2">{task.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="bg-white/20 px-2 py-1 rounded text-xs">
                                  📅 {formatDateShort(dueDate, 'CE')}
                                </span>
                                
                                {/* Submission Mode Badge */}
                                {(task as any).submission_mode === 'group' ? (
                                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs flex items-center gap-1 font-medium">
                                    <span>👥</span>
                                    <span>ส่งแบบกลุ่ม</span>
                                    {(() => {
                                      const g = taskGroups[task.id]
                                      const members = g ? (groupMembers[g.id] || []) : []
                                      if (members.length > 0) {
                                        return <span className="text-purple-600">• {members.length} คน</span>
                                      }
                                      return null
                                    })()}
                                  </span>
                                ) : (
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs flex items-center gap-1 font-medium">
                                    <span>👤</span>
                                    <span>ส่งเดี่ยว</span>
                                  </span>
                                )}
                                
                                <StatusBadge 
                                  status={isSubmitted ? 'completed' : isOverdue ? 'overdue' : 'pending'}
                                  size="sm"
                                  showIcon={true}
                                />
                              </div>
                              {/* Prominent actions */}
                              <div className="mt-2 flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    // Initialize multi-link editing with all existing links
                                    const effective = (task as any).submission_mode === 'group' ? gSub : submission
                                    const existingLinks = normalizeLinkObjects(effective?.links?.length ? effective.links : (effective?.submission_url ? [effective.submission_url] : []))
                                    setEditLinksMap(prev => ({ ...prev, [task.id]: existingLinks }))
                                    
                                    setSubmissionUrl('')
                                    setSubmissionNotes('')
                                    setEditingTaskId(task.id)
                                  }}
                                  className="px-3 py-1 rounded border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 text-xs"
                                >
                                  แก้ไข
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!user) return
                                    const ok = confirm('ยืนยันการยกเลิก/ลบงานที่ส่ง?')
                                    if (!ok) return
                                    try {
                                      if ((task as any).submission_mode === 'group') {
                                        const g = taskGroups[task.id]
                                        if (g) {
                                          await submissionService.deleteGroupTaskSubmission(task.id, g.id)
                                          setGroupSubmissions(prev => ({ ...prev, [g.id]: null }))
                                        }
                                      } else {
                                        await submissionService.deleteUserTaskSubmission(user.id, task.id)
                                        setSubmissions(prev => prev.filter(s => s.task_id !== task.id))
                                      }
                                      setEditingTaskId(null)
                                      setSubmissionUrl('')
                                      setSubmissionNotes('')
                                    } catch (e) {
                                      console.error('Delete submission failed', e)
                                    }
                                  }}
                                  className="px-3 py-1 rounded border border-red-200 text-red-700 bg-white hover:bg-red-50 text-xs"
                                >
                                  ลบงานที่ส่ง
                                </button>
                              </div>
                            </div>
                            {/* per-card refresh removed */}
                            <div className="text-lg ml-2">
                              {isSubmitted ? '✅' : isOverdue ? '⚠️' : '📝'}
                            </div>
                          </div>
                        </div>

                        {/* Group Members Display (only for group tasks) */}
                        {(task as any).submission_mode === 'group' && (() => {
                          const g = taskGroups[task.id]
                          const members = g ? (groupMembers[g.id] || []) : []
                          
                          if (members.length === 0) return null

                          const displayMembers = members.slice(0, 3) // Show first 3 members
                          const remainingCount = Math.max(0, members.length - 3)
                          const owner = members.find(m => m.role === 'owner')
                          
                          return (
                            <div className="px-3 py-2 bg-purple-50 border-t border-purple-100">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-purple-700 font-medium">สมาชิกในกลุ่ม:</span>
                                  <div className="flex items-center gap-1">
                                    {displayMembers.map((member, idx) => (
                                      <div key={member.user_id} className="flex items-center">
                                        <div className="w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center text-xs font-medium text-purple-800">
                                          {member.user?.name?.charAt(0) || member.user_id.charAt(0).toUpperCase()}
                                        </div>
                                        {member.role === 'owner' && (
                                          <span className="text-xs text-purple-600 ml-1">👑</span>
                                        )}
                                      </div>
                                    ))}
                                    {remainingCount > 0 && (
                                      <span className="text-xs text-purple-600 ml-1">+{remainingCount}</span>
                                    )}
                                  </div>
                                </div>
                                {g && (
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 text-xs text-purple-600">
                                      รหัสกลุ่ม: <span className="font-mono font-semibold">{g.party_code}</span>
                                      <button
                                        onClick={() => copyPartyCode(g.party_code)}
                                        className="p-1 rounded hover:bg-purple-100 transition-colors"
                                        title="คัดลอกรหัสกลุ่ม"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </button>
                                    </div>
                                    <button
                                      onClick={() => setShowGroupManagementFor(task.id)}
                                      className="text-xs px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-700 text-white font-medium"
                                    >
                                      ตั้งค่ากลุ่ม
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })()}

                        {/* Task Content */}
                        <div className="p-3 pb-12">
                          {/* Submitted Task Display */}
                          {isSubmitted && editingTaskId !== task.id && (
                            <div className="mt-3">
                              <div className="p-3 border rounded-lg bg-green-50 border-green-200">
                                <div className="flex items-center space-x-2">
                                  <span className="text-green-600 text-sm">✅</span>
                                  <div>
                                    <div className="font-medium text-sm text-green-800">ส่งงานเรียบร้อยแล้ว</div>
                                    <div className="text-xs text-green-600">{new Date(submission?.submitted_at || '').toLocaleDateString('th-TH')}</div>
                                    <div className="text-xs text-green-600 mt-1">ดูรายละเอียดได้ที่หน้างาน</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Group Management Modal/Card (for submitted tasks) */}
                          {showGroupManagementFor === task.id && (task as any).submission_mode === 'group' && taskGroups[task.id] && (
                            <div className="mt-3">
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex justify-end mb-2">
                                  <button
                                    onClick={() => setShowGroupManagementFor(null)}
                                    className="text-gray-500 hover:text-gray-700"
                                  >
                                    <i className="bx bx-x text-xl"></i>
                                  </button>
                                </div>
                                <GroupManagementCard
                                  group={taskGroups[task.id]}
                                  taskId={task.id}
                                  onGroupUpdated={async (group) => {
                                    setTaskGroups(prev => ({ ...prev, [task.id]: group }))
                                    if (group) {
                                      const mem = await groupService.listMembers(group.id)
                                      setGroupMembers(prev => ({ ...prev, [group.id]: mem || [] }))
                                    }
                                  }}
                                  onGroupDeleted={() => {
                                    setTaskGroups(prev => ({ ...prev, [task.id]: null }))
                                    setShowGroupManagementFor(null)
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Task Materials (if any) */}
                          {editingTaskId !== task.id && Array.isArray((task as any).materials) && (task as any).materials.length > 0 && (
                            <div className="mt-3">
                              <TaskMaterialDisplay materials={(task as any).materials} />
                            </div>
                          )}

                          {/* Submitted Links (multi-link list) */}
                          {isSubmitted && editingTaskId !== task.id && (
                            <div className="mt-3 space-y-2">
                              {(() => {
                                const effective: any = (task as any).submission_mode === 'group' ? gSub : submission
                                const linkObjs: { url: string; note?: string }[] = normalizeLinkObjects(effective?.links?.length ? effective.links : (effective?.submission_url ? [effective.submission_url] : []))
                                const submittedTime = new Date(effective?.submitted_at || effective?.updated_at || '').toLocaleString('th-TH')
                                if (!linkObjs || linkObjs.length === 0) return null
                                // Helper functions
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
                                
                                const getDomainName = (url: string) => {
                                  try {
                                    return new URL(url).hostname.replace('www.', '')
                                  } catch {
                                    return 'ลิงก์'
                                  }
                                }
                                
                                const submittedTimeFormatted = new Date(effective?.submitted_at || effective?.updated_at || '').toLocaleString('th-TH', {
                                  year: 'numeric',
                                  month: 'long', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                                
                                return (
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-green-600 text-sm">✅</span>
                                        <div>
                                          <h4 className="text-sm font-semibold text-green-800">งานที่ส่งแล้ว</h4>
                                          <p className="text-xs text-green-600">ส่งแล้ว {linkObjs.length} รายการ</p>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          className="btn btn-primary px-3 py-1 text-xs"
                                          onClick={() => {
                                            setAddLinkInput(prev => ({ ...prev, [task.id]: '' }))
                                            setAddLinkNoteInput(prev => ({ ...prev, [task.id]: '' }))
                                          }}
                                        >เพิ่มลิงก์</button>
                                        
                                      </div>
                                    </div>
                                    
                                    <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded inline-block">
                                      📅 ส่งครั้งแรก: {submittedTimeFormatted}
                                    </div>
                                    
                                    {addLinkInput[task.id] !== undefined && (
                                      <div className="flex gap-2 items-start bg-blue-50 p-2 rounded-lg">
                                        <input
                                          type="url"
                                          value={addLinkInput[task.id] || ''}
                                          onChange={(e) => setAddLinkInput(prev => ({ ...prev, [task.id]: e.target.value }))}
                                          placeholder="วางลิงก์ที่นี่"
                                          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                                        />
                                        <input
                                          type="text"
                                          value={addLinkNoteInput[task.id] || ''}
                                          onChange={(e) => setAddLinkNoteInput(prev => ({ ...prev, [task.id]: e.target.value }))}
                                          placeholder="หมายเหตุ (ถ้ามี)"
                                          className="w-40 px-3 py-2 border border-gray-300 rounded text-sm"
                                        />
                                        <button
                                          className="px-3 py-2 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                                          onClick={async () => {
                                            const url = (addLinkInput[task.id] || '').trim()
                                            const note = (addLinkNoteInput[task.id] || '').trim()
                                            if (!url) return
                                            const newLink = { url, note: note || '', submitted_at: new Date().toISOString() }
                                            const newLinks = [...linkObjs, newLink]
                                            try {
                                              if ((task as any).submission_mode === 'group' && g) {
                                                await submissionService.upsertGroupSubmission({ task_id: task.id, user_id: user!.id, group_id: g.id, links: newLinks, status: 'submitted', updated_at: new Date().toISOString() } as any)
                                                const refreshed = await submissionService.getGroupTaskSubmission(task.id, g.id)
                                                setGroupSubmissions(prev => ({ ...prev, [g.id]: refreshed }))
                                              } else if (effective?.id) {
                                                await supabase.from('submissions').update({ links: newLinks, status: 'submitted', updated_at: new Date().toISOString() }).eq('id', effective.id)
                                                await fetchWorkshopData()
                                              }
                                              setAddLinkInput(prev => ({ ...prev, [task.id]: '' }))
                                              setAddLinkNoteInput(prev => ({ ...prev, [task.id]: '' }))
                                            } catch (e) { console.error('add link inline failed', e) }
                                          }}
                                        >บันทึก</button>
                                        <button
                                          className="px-3 py-2 text-xs rounded bg-gray-500 text-white hover:bg-gray-600"
                                          onClick={() => {
                                            setAddLinkInput(prev => {
                                              const newState = { ...prev }
                                              delete newState[task.id]
                                              return newState
                                            })
                                            setAddLinkNoteInput(prev => {
                                              const newState = { ...prev }
                                              delete newState[task.id]
                                              return newState
                                            })
                                          }}
                                        >ยกเลิก</button>
                                      </div>
                                    )}
                                    
                                    <div className="space-y-2">
                                      {linkObjs.map((item, idx) => {
                                        const linkSubmittedTime = item.submitted_at 
                                          ? new Date(item.submitted_at).toLocaleString('th-TH', {
                                              month: 'short',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })
                                          : submittedTimeFormatted
                                        
                                        return (
                                          <div key={idx} className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                                <span className="text-sm mt-0.5">{getLinkIcon(item.url)}</span>
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <a 
                                                      href={item.url} 
                                                      target="_blank" 
                                                      rel="noopener noreferrer" 
                                                      className="text-sm font-medium text-blue-700 hover:underline truncate"
                                                      title={item.url}
                                                    >
                                                      {getDomainName(item.url)}
                                                    </a>
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                                                      {linkSubmittedTime}
                                                    </span>
                                                  </div>
                                                  <p className="text-xs text-gray-600 truncate" title={item.url}>
                                                    {item.url}
                                                  </p>
                                                  {item.note && (
                                                    <p className="text-xs text-gray-600 mt-1 italic">
                                                      💬 {item.note}
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                              
                                              <div className="flex items-center gap-1">
                                                <a 
                                                  href={item.url} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer" 
                                                  className="text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium"
                                                >
                                                  เปิด
                                                </a>
                                                <button 
                                                  className="text-xs px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700" 
                                                  onClick={async ()=>{
                                                    if(!confirm(`ลบลิงก์ "${getDomainName(item.url)}" นี้?`)) return; 
                                                    const newLinks = linkObjs.filter((_,i)=>i!==idx);
                                                    try {
                                                      if (newLinks.length === 0) {
                                                        if (!confirm('นี่เป็นลิงก์สุดท้าย หากลบแล้วงานที่ส่งจะถูกลบทิ้งด้วย ต้องการดำเนินการต่อ?')) return;
                                                        if ((task as any).submission_mode==='group' && g) {
                                                          await submissionService.deleteGroupTaskSubmission(task.id, g.id)
                                                          setGroupSubmissions(prev => ({ ...prev, [g.id]: null }))
                                                        } else if (effective?.id) {
                                                          await submissionService.deleteUserTaskSubmission(user!.id, task.id)
                                                        }
                                                        await fetchWorkshopData()
                                                      } else {
                                                        if ((task as any).submission_mode==='group' && g) {
                                                          await submissionService.upsertGroupSubmission({ task_id: task.id, user_id: user!.id, group_id: g.id, links:newLinks, status:'submitted', updated_at:new Date().toISOString() } as any)
                                                          const refreshed = await submissionService.getGroupTaskSubmission(task.id, g.id)
                                                          setGroupSubmissions(prev=>({ ...prev, [g.id]: refreshed }))
                                                        } else if (effective?.id) {
                                                          await supabase.from('submissions').update({ links:newLinks, updated_at:new Date().toISOString() }).eq('id', effective.id)
                                                          await fetchWorkshopData()
                                                        }
                                                      }
                                                    } catch(e){ console.error('remove link failed', e) }
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

                          {/* Edit Form for Submitted Tasks */}
{isSubmitted && editingTaskId === task.id && (
  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
    <div className="mb-2 inline-flex items-center gap-2 text-xs text-blue-800 bg-blue-50 border border-blue-200 px-2 py-1 rounded">
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span>ลิงก์ที่ส่ง</span>
    </div>
    {(() => {
      const effective: any = (task as any).submission_mode === 'group' ? gSub : submission
      const current = editLinksMap[task.id] ?? normalizeLinkObjects(effective?.links?.length ? effective.links : (effective?.submission_url ? [effective.submission_url] : []))
      if (!editLinksMap[task.id]) setEditLinksMap(prev => ({ ...prev, [task.id]: current }))
      const list = editLinksMap[task.id] || []
      return (
        <div className="space-y-3">
          {list.map((it, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <input type="url" value={it.url} onChange={(e)=> setEditLinksMap(prev=>{ const arr=[...(prev[task.id]||[])]; arr[idx]={...arr[idx], url:e.target.value}; return { ...prev, [task.id]: arr } })} placeholder={`ลิงก์ ${idx+1}`} className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm" />
              <input type="text" value={it.note || ''} onChange={(e)=> setEditLinksMap(prev=>{ const arr=[...(prev[task.id]||[])]; arr[idx]={...arr[idx], note:e.target.value}; return { ...prev, [task.id]: arr } })} placeholder="หมายเหตุ" className="w-60 px-3 py-2 border border-gray-300 rounded text-sm" />
              <button className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100" onClick={()=> setEditLinksMap(prev=>({ ...prev, [task.id]: (prev[task.id]||[]).filter((_,i)=>i!==idx) }))}>ลบ</button>
            </div>
          ))}
          <div className="flex gap-2 items-start">
            <input type="url" value={submissionUrl} onChange={(e)=> setSubmissionUrl(e.target.value)} placeholder="วางลิงก์ที่นี่" className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm" />
            <input type="text" value={submissionNotes} onChange={(e)=> setSubmissionNotes(e.target.value)} placeholder="หมายเหตุ (ถ้ามี)" className="w-60 px-3 py-2 border border-gray-300 rounded text-sm" />
            <button className="text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200" onClick={()=>{ const url=submissionUrl.trim(); if(!url) return; setEditLinksMap(prev=>({ ...prev, [task.id]: [ ...(prev[task.id]||[]), submissionNotes.trim()? {url, note:submissionNotes.trim()} : {url} ] })); setSubmissionUrl(''); setSubmissionNotes('') }}>เพิ่มลิงก์</button>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary px-4 py-2 text-sm font-medium" onClick={async ()=>{
              const toSave=(editLinksMap[task.id]||[]).filter(it=>it.url && it.url.trim())
              try{
                if (toSave.length===0){
                  if ((task as any).submission_mode==='group' && g){ await submissionService.deleteGroupTaskSubmission(task.id, g.id); setGroupSubmissions(prev=>({ ...prev, [g.id]: null })) }
                  else { await submissionService.deleteUserTaskSubmission(user!.id, task.id) }
                } else {
                  if ((task as any).submission_mode==='group' && g){ await submissionService.upsertGroupSubmission({ task_id: task.id, user_id: user!.id, group_id: g.id, links: toSave, status:'submitted', updated_at:new Date().toISOString() } as any) }
                  else { await supabase.from('submissions').upsert({ task_id: task.id, user_id: user!.id, links: toSave, status:'submitted', updated_at:new Date().toISOString() } as any, { onConflict: 'task_id,user_id' }) }
                }
                await fetchWorkshopData(); setEditingTaskId(null)
              }catch(e){ console.error('save links failed', e)}
            }}>ส่งงาน</button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm" onClick={()=>{ setEditingTaskId(null); setSubmissionUrl(''); setSubmissionNotes(''); setEditLinksMap(prev=>({ ...prev, [task.id]: [] })) }}>ยกเลิก</button>
          </div>
        </div>
      )
    })()}
  </div>
)}
{/* Materials below when editing */}
                          {editingTaskId === task.id && Array.isArray((task as any).materials) && (task as any).materials.length > 0 && (
                            <div className="mt-3">
                              <TaskMaterialDisplay materials={(task as any).materials} />
                            </div>
                          )}
                        
                          {/* Submit Button for Unsubmitted Tasks */}
                          {!isSubmitted && editingTaskId !== task.id && (
                            <button
                              onClick={() => setEditingTaskId(task.id)}
                              className="absolute bottom-3 right-3 btn btn-primary px-3 py-1 text-sm font-medium"
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
                                    <div className="grid gap-4 md:grid-cols-2">
                                      <GroupManagementCard
                                        taskId={task.id}
                                        onGroupUpdated={async (group) => {
                                          if (!user) return
                                          setTaskGroups(prev => ({ ...prev, [task.id]: group }))
                                          if (group) {
                                            const mem = await groupService.listMembers(group.id)
                                            setGroupMembers(prev => ({ ...prev, [group.id]: mem || [] }))
                                          }
                                        }}
                                        onGroupDeleted={() => {
                                          setTaskGroups(prev => ({ ...prev, [task.id]: null }))
                                        }}
                                      />
                                      <JoinGroupCard
                                        taskId={task.id}
                                        onJoined={async (group) => {
                                          if (!user) return
                                          setTaskGroups(prev => ({ ...prev, [task.id]: group }))
                                          if (group) {
                                            const mem = await groupService.listMembers(group.id)
                                            setGroupMembers(prev => ({ ...prev, [group.id]: mem || [] }))
                                          }
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <GroupManagementCard
                                      group={taskGroups[task.id]}
                                      taskId={task.id}
                                      onGroupUpdated={async (group) => {
                                        setTaskGroups(prev => ({ ...prev, [task.id]: group }))
                                        if (group) {
                                          const mem = await groupService.listMembers(group.id)
                                          setGroupMembers(prev => ({ ...prev, [group.id]: mem || [] }))
                                        }
                                      }}
                                      onGroupDeleted={() => {
                                        setTaskGroups(prev => ({ ...prev, [task.id]: null }))
                                      }}
                                    />
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
                                    className="btn btn-primary px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
        }

      </div>
    </div>
  )
}

