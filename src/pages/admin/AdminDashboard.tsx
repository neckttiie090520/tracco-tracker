import React, { useState, useEffect } from 'react'
import { useAdminTasks } from '../../hooks/useAdminData'
import { AdminNavigation } from '../../components/admin/AdminNavigation'
import { supabase } from '../../services/supabase'

interface Session {
  id: string
  title: string
  description: string
  total_participants: number
  total_workshops: number
  total_tasks: number
  total_submissions: number
  completion_percentage: number
  is_active: boolean
  workshops?: { id: string }[]
}


export function AdminDashboard() {
  const { tasks, workshops, loading, error, refetch } = useAdminTasks()
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  
  // Pagination state
  const [currentIndividualPage, setCurrentIndividualPage] = useState(1)
  const [currentGroupPage, setCurrentGroupPage] = useState(1)
  const [tasksPerPage] = useState(24) // Show more tasks per page for compact overview
  
  // Shared view mode for both Individual and Group tasks
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table')

  // Calculate task statistics
  const taskStats = React.useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        totalTasks: 0,
        tasksWithSubmissions: 0,
        tasksDueThisWeek: 0,
        overdueTasks: 0,
        totalSubmissions: 0
      }
    }

    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    let tasksWithSubmissions = 0
    let tasksDueThisWeek = 0
    let overdueTasks = 0
    let completedTasks = 0

    tasks.forEach(task => {
      // Count tasks with submissions (using the same pattern as TaskManagement)
      const submissionCount = task.submissions?.[0]?.count || 0
      if (submissionCount > 0) {
        tasksWithSubmissions++
        
        // For completed tasks, we'll count the total submissions
        // Since we don't have status breakdown in the count, we'll use the total count
        completedTasks += submissionCount
      }
      
      // Count tasks due this week
      if (task.due_date) {
        const dueDate = new Date(task.due_date)
        if (dueDate >= now && dueDate <= weekFromNow) {
          tasksDueThisWeek++
        }
        
        // Count overdue tasks
        if (dueDate < now) {
          overdueTasks++
        }
      }
    })

    return {
      totalTasks: tasks.length,
      tasksWithSubmissions,
      tasksDueThisWeek,
      overdueTasks,
      totalSubmissions: completedTasks
    }
  }, [tasks])

  useEffect(() => {
    // Only fetch sessions after tasks data is loaded
    if (!loading && tasks.length >= 0) {
      fetchSessions()
    }
  }, [loading, tasks, tasks?.length]) // Added tasks.length as dependency

  const fetchSessions = async () => {
    console.log('🔄 fetchSessions called, tasks:', tasks?.length)
    try {
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select(`
          id,
          title,
          description,
          is_active,
          created_at
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      const sessionsWithStats: Session[] = []
      
      for (const session of sessionsData || []) {
        // Get participant count (excluding admin users)
        const { count: participantCount } = await supabase
          .from('session_registrations')
          .select('*, users!inner(role)', { count: 'exact', head: true })
          .eq('session_id', session.id)
          .eq('users.role', 'participant')

        // Get workshop count
        const { count: workshopCount } = await supabase
          .from('session_workshops')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id)

        // Get total tasks using global task data (bypass session workshop linking issue)
        let totalTasks = 0
        let sessionWorkshops: any[] = []
        
        try {
          // First get workshop IDs for this session
          const { data: workshops } = await supabase
            .from('session_workshops')
            .select('workshop_id')
            .eq('session_id', session.id)
          
          sessionWorkshops = workshops || []
          
          if (sessionWorkshops.length > 0 && tasks.length > 0) {
            const workshopIds = sessionWorkshops.map(sw => sw.workshop_id)
            // Filter global tasks by workshop IDs (include ALL tasks - active, inactive, archived)
            const sessionTasks = tasks.filter(task => 
              workshopIds.includes(task.workshop_id)
            )
            totalTasks = sessionTasks.length
          }
        } catch (error) {
          console.error('Error fetching tasks for session:', error)
        }


        // Calculate completion percentage
        let completionPercentage = 0
        let actualSubmissions = 0
        
        if (totalTasks > 0 && participantCount > 0) {
          // Get workshop IDs again for submissions query  
          const workshopIds = sessionWorkshops?.map(sw => sw.workshop_id) || []
          
          if (workshopIds.length > 0) {
            // Get ALL task IDs for this session (including inactive/archived tasks)
            const allSessionTasks = tasks.filter(task => 
              workshopIds.includes(task.workshop_id)
            )
            const allTaskIds = allSessionTasks.map(task => task.id)
            
            if (allTaskIds.length > 0) {
              // Count submissions for ALL tasks in session-workshop chain
              const { count: submissionsCount } = await supabase
                .from('submissions')
                .select('*', { count: 'exact', head: true })
                .in('task_id', allTaskIds)
              
              actualSubmissions = submissionsCount || 0
              console.log(`📊 Session ${session.title}: ${actualSubmissions} submissions from ${allTaskIds.length} tasks`)
            }
            
            // Calculate completion based on all tasks in session
            const totalPossibleSubmissions = totalTasks * participantCount
            completionPercentage = totalPossibleSubmissions > 0 
              ? Math.min(100, Math.round(actualSubmissions / totalPossibleSubmissions * 100))
              : 0
          }
        }


        sessionsWithStats.push({
          id: session.id,
          title: session.title,
          description: session.description || '',
          total_participants: participantCount || 0,
          total_workshops: workshopCount || 0,
          total_tasks: totalTasks, // Show ALL tasks in session-workshop chain
          total_submissions: actualSubmissions,
          completion_percentage: completionPercentage,
          is_active: session.is_active,
          workshops: sessionWorkshops.map(sw => ({ id: sw.workshop_id })) // Add workshops data
        })
      }

      setSessions(sessionsWithStats)
      
      // Auto-select first session
      if (sessionsWithStats.length > 0 && !selectedSession) {
        setSelectedSession(sessionsWithStats[0])
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setDashboardLoading(false)
    }
  }



  if (loading || dashboardLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminNavigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminNavigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={refetch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminNavigation />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Traco Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Overview of workshop activities and system metrics
            </p>
          </div>

          {/* Live Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Workshops</p>
                  <p className="text-2xl font-semibold text-gray-900">{workshops?.length || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Participants</p>
                  <p className="text-2xl font-semibold text-gray-900">{sessions.reduce((sum, s) => sum + s.total_participants, 0)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                  <p className="text-2xl font-semibold text-gray-900">{taskStats.totalTasks}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Submissions</p>
                  <p className="text-2xl font-semibold text-gray-900">{taskStats.totalSubmissions}</p>
                </div>
              </div>
            </div>

          </div>


          {/* Tasks Progress Dashboard */}
          {selectedSession && (
            <div className="space-y-6">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm p-6 border border-blue-100">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Tasks Progress Overview</h3>
                    <div className="flex flex-wrap items-center gap-4">
                      <select 
                        value={selectedSession.id} 
                        onChange={(e) => {
                          const session = sessions.find(s => s.id === e.target.value)
                          if (session) setSelectedSession(session)
                        }}
                        className="text-sm border-2 border-blue-200 rounded-lg px-4 py-2 bg-white hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                      >
                        {sessions.map(session => (
                          <option key={session.id} value={session.id}>
                            {session.title}
                          </option>
                        ))}
                      </select>
                      <span className="text-sm text-blue-600 font-medium bg-white px-3 py-1 rounded-full border border-blue-200">
                        📊 Real-time tracking
                      </span>
                    </div>
                  </div>
                  
                  {/* Overall Progress Card */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 min-w-[200px]">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-1">
                        {(() => {
                          if (!selectedSession) return 0
                          
                          // Calculate overall progress from actual task submission data
                          const sessionTasks = tasks.filter(task => {
                            const taskWorkshop = workshops.find(w => w.id === task.workshop_id)
                            return selectedSession.workshops?.some(sw => sw.id === taskWorkshop?.id)
                          })
                          
                          const totalSubmissions = sessionTasks.reduce((sum, task) => {
                            return sum + (task.submissions?.[0]?.count || 0)
                          }, 0)
                          
                          const totalPossible = sessionTasks.length * selectedSession.total_participants
                          
                          return totalPossible > 0 ? Math.min(100, Math.round((totalSubmissions / totalPossible) * 100)) : 0
                        })()}%
                      </div>
                      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Overall Progress</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000"
                          style={{ 
                            width: `${(() => {
                              if (!selectedSession) return 0
                              const sessionTasks = tasks.filter(task => {
                                const taskWorkshop = workshops.find(w => w.id === task.workshop_id)
                                return selectedSession.workshops?.some(sw => sw.id === taskWorkshop?.id)
                              })
                              const totalSubmissions = sessionTasks.reduce((sum, task) => {
                                return sum + (task.submissions?.[0]?.count || 0)
                              }, 0)
                              const totalPossible = sessionTasks.length * selectedSession.total_participants
                              return totalPossible > 0 ? Math.min(100, Math.round((totalSubmissions / totalPossible) * 100)) : 0
                            })()}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Global View Controls */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">Task View Controls</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">View Mode:</span>
                    <button
                      onClick={() => setViewMode('card')}
                      className={`px-4 py-2 text-sm rounded-md transition-colors ${
                        viewMode === 'card' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Cards
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`px-4 py-2 text-sm rounded-md transition-colors ${
                        viewMode === 'table' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Table
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  This view mode applies to both Individual Tasks and Group Tasks sections below
                </p>
              </div>
              
              {/* Session Statistics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{selectedSession.total_participants}</div>
                      <div className="text-sm font-medium text-gray-600">Participants</div>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{selectedSession.total_workshops}</div>
                      <div className="text-sm font-medium text-gray-600">Workshops</div>
                    </div>
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{selectedSession.total_tasks}</div>
                      <div className="text-sm font-medium text-gray-600">Total Tasks</div>
                    </div>
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {(selectedSession.total_submissions && selectedSession.total_submissions > 1) ? selectedSession.total_submissions : taskStats.totalSubmissions || 0}
                      </div>
                      <div className="text-sm font-medium text-gray-600">Submissions</div>
                    </div>
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-8">
                {/* Individual Tasks Section */}
                {(() => {
                  if (!selectedSession || !tasks) return null
                  
                  const sessionWorkshops = workshops.filter(w => 
                    selectedSession.workshops?.some(sw => sw.id === w.id)
                  )
                  
                  const individualTasks = tasks.filter(task => 
                    task.submission_mode === 'individual' && 
                    sessionWorkshops.some(w => w.id === task.workshop_id)
                  )
                  
                  if (individualTasks.length === 0) return null
                  
                  const totalIndividualSubmissions = individualTasks.reduce((sum, task) => {
                    return sum + (task.submissions?.[0]?.count || 0)
                  }, 0)
                  
                  const totalPossible = individualTasks.length * selectedSession.total_participants
                  const percentage = totalPossible > 0 ? Math.min(100, Math.round((totalIndividualSubmissions / totalPossible) * 100)) : 0
                  
                  return (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-gray-800">Individual Tasks</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                            </svg>
                            เดี่ยว
                          </span>
                        </div>
                        <span className="text-sm font-medium text-blue-600">
                          {totalIndividualSubmissions}/{totalPossible} ({percentage}%)
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      

                      {/* Task Display */}
                      {(() => {
                        // Calculate pagination
                        const startIndex = (currentIndividualPage - 1) * tasksPerPage
                        const endIndex = startIndex + tasksPerPage
                        const paginatedTasks = individualTasks.slice(startIndex, endIndex)
                        const totalPages = Math.ceil(individualTasks.length / tasksPerPage)

                        if (viewMode === 'table') {
                          return (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Task
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Workshop
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Progress
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Submissions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {paginatedTasks.map(task => {
                                    const taskSubmissions = task.submissions?.[0]?.count || 0
                                    const taskProgress = selectedSession.total_participants > 0 
                                      ? Math.min(100, Math.round((taskSubmissions / selectedSession.total_participants) * 100))
                                      : 0
                                    const workshop = workshops.find(w => w.id === task.workshop_id)
                                    
                                    return (
                                      <tr key={task.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 whitespace-nowrap">
                                          <div className="text-sm font-medium text-gray-900">{task.title}</div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                          <div className="text-sm text-gray-600">{workshop?.title}</div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                                              <div
                                                className="bg-blue-600 h-2 rounded-full"
                                                style={{ width: `${taskProgress}%` }}
                                              />
                                            </div>
                                            <span className="text-sm text-gray-900">{taskProgress}%</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                          <span className="text-blue-600">
                                            {taskSubmissions}/{selectedSession.total_participants}
                                          </span>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )
                        } else {
                          return (
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                              {paginatedTasks.map(task => {
                                const taskSubmissions = task.submissions?.[0]?.count || 0
                                const taskProgress = selectedSession.total_participants > 0 
                                  ? Math.min(100, Math.round((taskSubmissions / selectedSession.total_participants) * 100))
                                  : 0
                                const workshop = workshops.find(w => w.id === task.workshop_id)
                                
                                return (
                                  <div key={task.id} className="bg-blue-50 border border-blue-200 rounded-md p-2 aspect-square flex flex-col justify-between hover:bg-blue-100 transition-colors text-center">
                                    {/* Task type badge - compact */}
                                    <div className="flex justify-center mb-1">
                                      <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        เดี่ยว
                                      </span>
                                    </div>

                                    {/* Task title - compact */}
                                    <div className="flex-1 flex items-center justify-center">
                                      <h4 className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">{task.title}</h4>
                                    </div>

                                    {/* Progress info - minimal */}
                                    <div className="space-y-1">
                                      <div className="text-xs font-medium text-blue-600">
                                        {taskSubmissions}/{selectedSession.total_participants}
                                      </div>
                                      <div className="w-full bg-blue-200 rounded-full h-1">
                                        <div
                                          className="bg-blue-600 h-1 rounded-full transition-all duration-500"
                                          style={{ width: `${taskProgress}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        }
                      })()}

                      {/* Pagination */}
                      {(() => {
                        const totalPages = Math.ceil(individualTasks.length / tasksPerPage)
                        if (totalPages <= 1) return null
                        
                        return (
                          <div className="flex items-center justify-between mt-6">
                            <div className="text-sm text-gray-700">
                              Showing {Math.min((currentIndividualPage - 1) * tasksPerPage + 1, individualTasks.length)} to {Math.min(currentIndividualPage * tasksPerPage, individualTasks.length)} of {individualTasks.length} tasks
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setCurrentIndividualPage(Math.max(1, currentIndividualPage - 1))}
                                disabled={currentIndividualPage === 1}
                                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Previous
                              </button>
                              
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                  key={page}
                                  onClick={() => setCurrentIndividualPage(page)}
                                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                                    currentIndividualPage === page
                                      ? 'bg-blue-600 text-white'
                                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {page}
                                </button>
                              ))}
                              
                              <button
                                onClick={() => setCurrentIndividualPage(Math.min(totalPages, currentIndividualPage + 1))}
                                disabled={currentIndividualPage === totalPages}
                                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )
                })()}

                {/* Group Tasks Section */}
                {(() => {
                  if (!selectedSession || !tasks) return null
                  
                  const sessionWorkshops = workshops.filter(w => 
                    selectedSession.workshops?.some(sw => sw.id === w.id)
                  )
                  
                  const groupTasks = tasks.filter(task => 
                    task.submission_mode === 'group' && 
                    sessionWorkshops.some(w => w.id === task.workshop_id)
                  )
                  
                  if (groupTasks.length === 0) return null
                  
                  const totalGroupSubmissions = groupTasks.reduce((sum, task) => {
                    return sum + (task.submissions?.[0]?.count || 0)
                  }, 0)
                  
                  const totalGroups = groupTasks.reduce((sum, task) => {
                    return sum + (task.task_groups?.length || 0)
                  }, 0)
                  
                  const percentage = totalGroups > 0 ? Math.min(100, Math.round((totalGroupSubmissions / totalGroups) * 100)) : 0
                  
                  return (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-gray-800">Group Tasks</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                            </svg>
                            กลุ่ม
                          </span>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          {totalGroupSubmissions}/{totalGroups} ({percentage}%)
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                        <div
                          className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-1000"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      

                      {/* Task Display */}
                      {(() => {
                        // Calculate pagination
                        const startIndex = (currentGroupPage - 1) * tasksPerPage
                        const endIndex = startIndex + tasksPerPage
                        const paginatedTasks = groupTasks.slice(startIndex, endIndex)
                        const totalPages = Math.ceil(groupTasks.length / tasksPerPage)

                        if (viewMode === 'table') {
                          return (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Task
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Workshop
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Progress
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Groups
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {paginatedTasks.map(task => {
                                    const uniqueGroupSubmissions = task.submissions?.[0]?.count || 0
                                    const totalTaskGroups = task.task_groups?.length || 0
                                    const taskProgress = totalTaskGroups > 0 ? Math.min(100, Math.round((uniqueGroupSubmissions / totalTaskGroups) * 100)) : 0
                                    const workshop = workshops.find(w => w.id === task.workshop_id)
                                    
                                    return (
                                      <tr key={task.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 whitespace-nowrap">
                                          <div className="text-sm font-medium text-gray-900">{task.title}</div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                          <div className="text-sm text-gray-600">{workshop?.title}</div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                                              <div
                                                className="bg-green-600 h-2 rounded-full"
                                                style={{ width: `${taskProgress}%` }}
                                              />
                                            </div>
                                            <span className="text-sm text-gray-900">{taskProgress}%</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                          <span className="text-green-600">
                                            {uniqueGroupSubmissions}/{totalTaskGroups}
                                          </span>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )
                        } else {
                          return (
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                              {paginatedTasks.map(task => {
                                const uniqueGroupSubmissions = task.submissions?.[0]?.count || 0
                                const totalTaskGroups = task.task_groups?.length || 0
                                const taskProgress = totalTaskGroups > 0 ? Math.min(100, Math.round((uniqueGroupSubmissions / totalTaskGroups) * 100)) : 0
                                const workshop = workshops.find(w => w.id === task.workshop_id)
                                
                                return (
                                  <div key={task.id} className="bg-green-50 border border-green-200 rounded-md p-2 aspect-square flex flex-col justify-between hover:bg-green-100 transition-colors text-center">
                                    {/* Task type badge - compact */}
                                    <div className="flex justify-center mb-1">
                                      <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                        กลุ่ม
                                      </span>
                                    </div>

                                    {/* Task title - compact */}
                                    <div className="flex-1 flex items-center justify-center">
                                      <h4 className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">{task.title}</h4>
                                    </div>

                                    {/* Progress info - minimal */}
                                    <div className="space-y-1">
                                      <div className="text-xs font-medium text-green-600">
                                        {uniqueGroupSubmissions}/{totalTaskGroups}
                                      </div>
                                      <div className="w-full bg-green-200 rounded-full h-1">
                                        <div
                                          className="bg-green-600 h-1 rounded-full transition-all duration-500"
                                          style={{ width: `${taskProgress}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        }
                      })()}

                      {/* Pagination */}
                      {(() => {
                        const totalPages = Math.ceil(groupTasks.length / tasksPerPage)
                        if (totalPages <= 1) return null
                        
                        return (
                          <div className="flex items-center justify-between mt-6">
                            <div className="text-sm text-gray-700">
                              Showing {Math.min((currentGroupPage - 1) * tasksPerPage + 1, groupTasks.length)} to {Math.min(currentGroupPage * tasksPerPage, groupTasks.length)} of {groupTasks.length} tasks
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setCurrentGroupPage(Math.max(1, currentGroupPage - 1))}
                                disabled={currentGroupPage === 1}
                                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Previous
                              </button>
                              
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                  key={page}
                                  onClick={() => setCurrentGroupPage(page)}
                                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                                    currentGroupPage === page
                                      ? 'bg-green-600 text-white'
                                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {page}
                                </button>
                              ))}
                              
                              <button
                                onClick={() => setCurrentGroupPage(Math.min(totalPages, currentGroupPage + 1))}
                                disabled={currentGroupPage === totalPages}
                                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}