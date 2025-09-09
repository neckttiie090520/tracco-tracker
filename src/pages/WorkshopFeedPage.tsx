﻿import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
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
import { Copy, XCircle, Users as UsersIcon, BadgeCheck } from 'lucide-react'
import { t } from '../i18n/th'

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
                name: userData.name || userData.email?.split('@')[0] || 'à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸à¸Šà¸·à¹ˆà¸­',
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
          alert('à¸à¸£à¸¸à¸“à¸²à¸ªà¸£à¹‰à¸²à¸‡à¸«à¸£à¸·à¸­à¹€à¸‚à¹‰à¸²à¸£à¹ˆà¸§à¸¡à¸à¸¥à¸¸à¹ˆà¸¡à¸à¹ˆà¸­à¸™à¸ªà¹ˆà¸‡à¸‡à¸²à¸™')
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
      alert('à¸ªà¹ˆà¸‡à¸‡à¸²à¸™à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§!')
      
    } catch (error) {
      console.error('Error submitting task:', error)
      alert(`à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¸ªà¹ˆà¸‡à¸‡à¸²à¸™: ${error.message || error}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">{t.loading}</p>
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
            <div className="text-red-500 text-5xl mb-4">!</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.notFoundTitle}</h2>
            <p className="text-gray-600 mb-6">{t.notFoundDesc}</p>
            <Link
              to="/sessions"
              className="btn btn-primary px-6 py-3 font-semibold"
            >{t.goSessions}</Link>
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
        {/* Main Material Display - make it clear this is workshop materials */}
        {mainMaterial ? (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-100 text-rose-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v12m6-6H6"/></svg>
              </span>
              <h3 className="text-sm font-semibold text-gray-700">à¹€à¸­à¸à¸ªà¸²à¸£à¸›à¸£à¸°à¸à¸­à¸šà¸‚à¸­à¸‡ Workshop à¸™à¸µà¹‰</h3>
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
                    <span>ðŸ«</span>
                    <span>Phase {workshop.phase || '1'}</span>
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span>ðŸ“…</span>
                  <span>{formatDateShort(workshop.workshop_date, 'CE')}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span>â°</span>
                  <span>{workshop.start_time} - {workshop.end_time}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span>ðŸ‘¥</span>
                  <span>{workshop.max_participants} à¸—à¸µà¹ˆà¸™à¸±à¹ˆà¸‡</span>
                </div>

                {workshop.instructor && (
                  <div className="flex items-center gap-2">
                    <span>ðŸ‘¨â€ðŸ«</span>
                    <span className="flex items-center gap-2">
                      à¸§à¸´à¸—à¸¢à¸²à¸à¸£: {renderInstructor()}
                    </span>
                  </div>
                )}
                
                {workshop.location && (
                  <div className="flex items-center gap-2">
                    <span>ðŸ“</span>
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
                      {showFullDescription ? 'à¸¢à¹ˆà¸­à¸¥à¸‡' : 'à¹à¸ªà¸”à¸‡à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡'}
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
                <div className="text-3xl">ðŸŽ“</div>
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 bg-gray-100 rounded px-3 py-1 mb-2">
                    <span className="text-sm">âœ¨</span>
                    <span className="text-gray-700 text-sm font-medium">Phase {workshop.phase || '1'}</span>
                  </div>
                  <h1 className="text-2xl font-bold mb-2 text-gray-900">{workshop.title}</h1>
                  <p className="text-gray-600 text-sm">à¹€à¸£à¸µà¸¢à¸™à¸£à¸¹à¹‰à¹à¸¥à¸°à¸žà¸±à¸’à¸™à¸²à¹„à¸›à¸à¸±à¸šà¹€à¸£à¸²à¹ƒà¸™à¹‚à¸¥à¸à¸‚à¸­à¸‡ AI</p>
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
                      {showFullDescription ? 'à¸¢à¹ˆà¸­à¸¥à¸‡' : 'à¹à¸ªà¸”à¸‡à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡'}
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
                      à¸§à¸´à¸—à¸¢à¸²à¸à¸£
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
                      à¸§à¸±à¸™à¸—à¸µà¹ˆ
                    </div>
                    <div className="text-gray-900 text-sm font-medium">
                      {formatDateShort(workshop.workshop_date, 'CE')}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-gray-500 text-xs font-medium mb-1">
                      à¹€à¸§à¸¥à¸²
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
                      à¸ªà¸–à¸²à¸™à¸—à¸µà¹ˆ
                    </div>
                    <div className="text-gray-900 text-sm font-medium">
                      {workshop.location}
                    </div>
                  </div>
                )}
                
                {/* Participants */}
                <div>
                  <div className="text-gray-500 text-xs font-medium mb-1">
                    à¸œà¸¹à¹‰à¹€à¸‚à¹‰à¸²à¸£à¹ˆà¸§à¸¡
                  </div>
                  <div className="text-gray-900 text-sm font-medium">
                    {workshop.current_participants}/{workshop.max_participants} à¸„à¸™
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
                <span>ðŸ“Š</span>
                <span>à¸ªà¸–à¸´à¸•à¸´ Workshop</span>
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
                <span>ðŸ“</span>
                <span>à¹€à¸­à¸à¸ªà¸²à¸£à¹à¸¥à¸°à¸‡à¸²à¸™ ({materials.length + (mainMaterial ? -1 : 0)} à¹€à¸­à¸à¸ªà¸²à¸£, {tasks.length} à¸‡à¸²à¸™)</span>
              </div>
            </button>
          </div>
        </div>

        {/* Combined Content */}
        {
          <div className="space-y-8">
            {/* Simple Workshop Stats */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.statsTitle}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">📚</div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{materials.length}</p>
                      <p className="text-gray-600 text-sm">{t.statsMaterials}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">📝</div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
                      <p className="text-gray-600 text-sm">{t.statsTasks}</p>
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
                      <p className="text-gray-600 text-sm">{t.statsSubmitted}</p>
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
                  <span className="mr-3">ðŸ“š</span>
                  à¹€à¸­à¸à¸ªà¸²à¸£à¸›à¸£à¸°à¸à¸­à¸šà¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡
                </h2>
                <WorkshopMaterialsList materials={secondaryMaterials} />
              </div>
            )}
            

            {/* Tasks Section */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📝</span>
                {t.tasksSectionTitle(tasks.length)}
              </h2>
              <div className="flex justify-end mb-2">
                <button
                  onClick={fetchWorkshopData}
                  className="inline-flex items-center gap-2 text-sm px-3 py-1.5 border rounded-md text-gray-700 hover:bg-gray-50"
                  title={t.refresh}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0014-7V9m0-4a9 9 0 00-14 7v3" />
                  </svg>
                  {t.refresh}
                </button>
              </div>
              
              {tasks.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-3xl mb-3">ðŸ“</div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">à¸£à¸­à¸à¸²à¸£à¸¡à¸­à¸šà¸«à¸¡à¸²à¸¢à¸‡à¸²à¸™</h3>
                  <p className="text-gray-600 text-xs mb-4">à¸§à¸´à¸—à¸¢à¸²à¸à¸£à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸ªà¸£à¹‰à¸²à¸‡à¸‡à¸²à¸™à¸ªà¸³à¸«à¸£à¸±à¸š Workshop à¸™à¸µà¹‰</p>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 max-w-md mx-auto">
                    <div className="flex items-start gap-2">
                      <div className="text-blue-600 text-sm">ðŸ’¡</div>
                      <div className="text-left">
                        <p className="text-blue-900 font-medium text-xs mb-1">à¸ªà¸³à¸«à¸£à¸±à¸šà¸œà¸¹à¹‰à¹€à¸‚à¹‰à¸²à¸£à¹ˆà¸§à¸¡:</p>
                        <ul className="text-blue-800 text-xs space-y-1 list-disc list-inside">
                          <li>à¸‡à¸²à¸™à¸ˆà¸°à¸›à¸£à¸²à¸à¸à¸‚à¸¶à¹‰à¸™à¹€à¸¡à¸·à¹ˆà¸­à¸§à¸´à¸—à¸¢à¸²à¸à¸£à¸ªà¸£à¹‰à¸²à¸‡à¹ƒà¸™à¸£à¸°à¸šà¸š</li>
                          <li>à¸„à¸¸à¸“à¸ˆà¸°à¹„à¸”à¹‰à¸£à¸±à¸šà¸à¸²à¸£à¹à¸ˆà¹‰à¸‡à¹€à¸•à¸·à¸­à¸™à¹€à¸¡à¸·à¹ˆà¸­à¸¡à¸µà¸‡à¸²à¸™à¹ƒà¸«à¸¡à¹ˆ</li>
                          <li>à¸ªà¸²à¸¡à¸²à¸£à¸–à¸ªà¹ˆà¸‡à¸‡à¸²à¸™à¸œà¹ˆà¸²à¸™ URL à¸«à¸£à¸·à¸­à¹„à¸Ÿà¸¥à¹Œà¹à¸™à¸š</li>
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
                              <div className="flex items-center gap-2 text-xs">
                                <span className="bg-white/20 px-2 py-1 rounded text-xs">
                                  ðŸ“… {formatDateShort(dueDate, 'CE')}
                                </span>
                                <StatusBadge 
                                  status={isSubmitted ? 'completed' : isOverdue ? 'overdue' : 'pending'}
                                  size="sm"
                                  showIcon={true}
                                />
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] border ${(task as any).submission_mode === 'group' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                                  {(task as any).submission_mode === 'group' ? 'à¸‡à¸²à¸™à¸à¸¥à¸¸à¹ˆà¸¡' : 'à¸‡à¸²à¸™à¹€à¸”à¸µà¹ˆà¸¢à¸§'}
                                </span>
                              </div>
                              {/* Prominent actions */}
                              <div className="mt-2 flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setSubmissionUrl(submission?.submission_url || '')
                                    setSubmissionNotes(submission?.notes || '')
                                    setEditingTaskId(task.id)
                                  }}
                                  className="px-3 py-1 rounded border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 text-xs"
                                >
                                  à¹à¸à¹‰à¹„à¸‚
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!user) return
                                    const ok = confirm('à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸¢à¸à¹€à¸¥à¸´à¸/à¸¥à¸šà¸‡à¸²à¸™à¸—à¸µà¹ˆà¸ªà¹ˆà¸‡?')
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
                                  à¸¥à¸šà¸‡à¸²à¸™à¸—à¸µà¹ˆà¸ªà¹ˆà¸‡
                                </button>
                              </div>
                            </div>
                            {/* per-card refresh removed */}
                            <div className="text-lg ml-2">
                              {isSubmitted ? 'âœ…' : isOverdue ? 'âš ï¸' : 'ðŸ“'}
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
                                  className="inline-flex items-center space-x-2 p-3 border rounded-lg transition-all duration-200 group bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                >
                                  <div className="flex items-center space-x-2 flex-1">
                                    <span className="text-green-600 text-sm">âœ…</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm truncate">à¸‡à¸²à¸™à¸—à¸µà¹ˆà¸ªà¹ˆà¸‡</div>
                                      <div className="text-xs opacity-75">{formatDateTimeShort(submission?.submitted_at || '', 'CE')}</div>
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
                              
                            </div>
                          )}

                          {/* Task Materials (if any) */}
                          {editingTaskId !== task.id && Array.isArray((task as any).materials) && (task as any).materials.length > 0 && (
                            <div className="mt-3">
                              <TaskMaterialDisplay materials={(task as any).materials} />
                            </div>
                          )}

                          {/* Edit Form for Submitted Tasks */}
                          {isSubmitted && editingTaskId === task.id && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="mb-2 inline-flex items-center gap-2 text-xs text-blue-800 bg-blue-50 border border-blue-200 px-2 py-1 rounded">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>à¸à¸³à¸¥à¸±à¸‡à¹à¸à¹‰à¹„à¸‚à¸‡à¸²à¸™à¸—à¸µà¹ˆà¸ªà¹ˆà¸‡</span>
                              </div>
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
                                  placeholder="à¸«à¸¡à¸²à¸¢à¹€à¸«à¸•à¸¸..."
                                  rows={2}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm resize-none"
                                />
                                
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleTaskSubmission(task.id)}
                                    disabled={!submissionUrl.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                                  >
                                    à¸šà¸±à¸™à¸—à¸¶à¸
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingTaskId(null)
                                      setSubmissionUrl('')
                                      setSubmissionNotes('')
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                                  >
                                    à¸¢à¸à¹€à¸¥à¸´à¸
                                  </button>
                                </div>
                              </div>
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
                              className="absolute bottom-3 right-3 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                            >
                              à¸ªà¹ˆà¸‡à¸‡à¸²à¸™
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
                                        <div className="font-medium mb-2">à¸ªà¸£à¹‰à¸²à¸‡à¸à¸¥à¸¸à¹ˆà¸¡</div>
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
                                        <div className="font-medium mb-2">à¹€à¸‚à¹‰à¸²à¸£à¹ˆà¸§à¸¡à¸”à¹‰à¸§à¸¢à¸£à¸«à¸±à¸ª</div>
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
                                          <div className="text-sm">{t.group}: <span className="font-medium">{taskGroups[task.id]?.name}</span></div>
                                          <div className="text-xs text-gray-600">{t.code}: <span className="font-mono tracking-widest">{taskGroups[task.id]?.party_code}</span></div>
                                        </div>
                                        <button onClick={() => navigator.clipboard.writeText(taskGroups[task.id]?.party_code)} className="text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50" title={t.copyCode}>{t.copyCode}</button>
                                      </div>
                                      {taskGroups[task.id] && groupMembers[taskGroups[task.id]?.id || ""]?.length > 0 && (
                                        <div className="mt-2">
                                          <div className="text-xs text-gray-600 mb-1">{t.members}</div>
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
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-red-600 border-red-300 hover:bg-red-50 text-xs"
                                                    title={m.user_id === user?.id ? 'Leave group' : 'Remove member'}
                                                  >
                                                    Ã—
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
                                  placeholder="https://drive.google.com/... à¸«à¸£à¸·à¸­ https://docs.google.com/..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                                />
                                
                                <textarea
                                  value={submissionNotes}
                                  onChange={(e) => setSubmissionNotes(e.target.value)}
                                  rows={2}
                                  placeholder="à¸«à¸¡à¸²à¸¢à¹€à¸«à¸•à¸¸..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm resize-none"
                                />
                                
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleTaskSubmission(task.id)}
                                    disabled={!submissionUrl.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                                  >
                                    à¸ªà¹ˆà¸‡à¸‡à¸²à¸™
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingTaskId(null)
                                      setSubmissionUrl('')
                                      setSubmissionNotes('')
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                                  >
                                    à¸¢à¸à¹€à¸¥à¸´à¸
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
        placeholder="à¸Šà¸·à¹ˆà¸­à¸à¸¥à¸¸à¹ˆà¸¡"
      />

      <div className="mb-2">
        <div className="text-xs text-gray-600 mb-1">à¹€à¸žà¸´à¹ˆà¸¡à¸ªà¸¡à¸²à¸Šà¸´à¸ (à¸žà¸´à¸¡à¸žà¹Œà¸Šà¸·à¹ˆà¸­à¸«à¸£à¸·à¸­à¸­à¸µà¹€à¸¡à¸¥)</div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border px-3 py-2 rounded"
          placeholder="à¹€à¸Šà¹ˆà¸™ student@domain.com"
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
                <button onClick={() => removeSelected(u.id)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-red-600 border-red-300 hover:bg-red-50 text-xs">Ã—</button>
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
            setError(e?.message || 'à¸ªà¸£à¹‰à¸²à¸‡à¸à¸¥à¸¸à¹ˆà¸¡à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ')
          } finally {
            setLoading(false)
          }
        }}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
      >
        {loading ? 'à¸à¸³à¸¥à¸±à¸‡à¸ªà¸£à¹‰à¸²à¸‡...' : 'à¸ªà¸£à¹‰à¸²à¸‡à¸à¸¥à¸¸à¹ˆà¸¡'}
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
            setError(e?.message || 'à¸£à¸«à¸±à¸ªà¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡')
          } finally {
            setLoading(false)
          }
        }}
        disabled={loading}
        className="bg-gray-800 hover:bg-black text-white px-3 py-2 rounded text-sm"
      >
        {loading ? 'à¸à¸³à¸¥à¸±à¸‡à¹€à¸‚à¹‰à¸²à¸£à¹ˆà¸§à¸¡...' : 'à¹€à¸‚à¹‰à¸²à¸£à¹ˆà¸§à¸¡'}
      </button>
    </div>
  )
}




