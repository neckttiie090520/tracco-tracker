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
        // Get participant count
        const { count: participantCount } = await supabase
          .from('session_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id)

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


          {/* Tasks Progress Chart */}
          {selectedSession && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Tasks Progress</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <select 
                      value={selectedSession.id} 
                      onChange={(e) => {
                        const session = sessions.find(s => s.id === e.target.value)
                        if (session) setSelectedSession(session)
                      }}
                      className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white"
                    >
                      {sessions.map(session => (
                        <option key={session.id} value={session.id}>
                          {session.title}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-gray-500">Real-time tasks completion tracking</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedSession?.completion_percentage || 0}%
                  </div>
                  <div className="text-xs text-gray-500">Overall Progress</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{selectedSession.total_participants}</div>
                  <div className="text-sm text-gray-600">Total Participants</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{selectedSession.total_workshops}</div>
                  <div className="text-sm text-gray-600">Workshops</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{selectedSession.total_tasks}</div>
                  <div className="text-sm text-gray-600">Total Tasks</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {(selectedSession.total_submissions && selectedSession.total_submissions > 1) ? selectedSession.total_submissions : taskStats.totalSubmissions || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Submissions</div>
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
                    return sum + (task.submissions?.filter(s => s.status === 'submitted' && !s.group_id).length || 0)
                  }, 0)
                  
                  const totalPossible = individualTasks.length * selectedSession.total_participants
                  const percentage = totalPossible > 0 ? Math.round((totalIndividualSubmissions / totalPossible) * 100) : 0
                  
                  return (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-gray-800">Individual Tasks</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
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
                      
                      {/* Individual Task Cards */}
                      <div className="grid gap-3">
                        {individualTasks.map(task => {
                          const taskSubmissions = task.submissions?.filter(s => s.status === 'submitted' && !s.group_id).length || 0
                          const taskProgress = selectedSession.total_participants > 0 
                            ? Math.round((taskSubmissions / selectedSession.total_participants) * 100) 
                            : 0
                          const workshop = workshops.find(w => w.id === task.workshop_id)
                          
                          return (
                            <div key={task.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <h4 className="text-sm font-semibold text-gray-900">{task.title}</h4>
                                  <p className="text-xs text-gray-600 mt-1">{workshop?.title}</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-medium text-blue-600">
                                    {taskSubmissions}/{selectedSession.total_participants}
                                  </span>
                                  <div className="text-xs text-gray-500">{taskProgress}%</div>
                                </div>
                              </div>
                              <div className="w-full bg-blue-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${taskProgress}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
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
                    const uniqueGroupSubmissions = new Set(
                      task.submissions?.filter(s => s.status === 'submitted' && s.group_id).map(s => s.group_id)
                    ).size
                    return sum + uniqueGroupSubmissions
                  }, 0)
                  
                  const totalGroups = groupTasks.reduce((sum, task) => {
                    return sum + (task.task_groups?.length || 0)
                  }, 0)
                  
                  const percentage = totalGroups > 0 ? Math.round((totalGroupSubmissions / totalGroups) * 100) : 0
                  
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
                      
                      {/* Group Task Cards */}
                      <div className="grid gap-3">
                        {groupTasks.map(task => {
                          const uniqueGroupSubmissions = new Set(
                            task.submissions?.filter(s => s.status === 'submitted' && s.group_id).map(s => s.group_id)
                          ).size
                          const totalTaskGroups = task.task_groups?.length || 0
                          const taskProgress = totalTaskGroups > 0 ? Math.round((uniqueGroupSubmissions / totalTaskGroups) * 100) : 0
                          const workshop = workshops.find(w => w.id === task.workshop_id)
                          
                          return (
                            <div key={task.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <h4 className="text-sm font-semibold text-gray-900">{task.title}</h4>
                                  <p className="text-xs text-gray-600 mt-1">{workshop?.title}</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-medium text-green-600">
                                    {uniqueGroupSubmissions}/{totalTaskGroups}
                                  </span>
                                  <div className="text-xs text-gray-500">{taskProgress}%</div>
                                </div>
                              </div>
                              <div className="w-full bg-green-200 rounded-full h-2">
                                <div
                                  className="bg-green-600 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${taskProgress}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
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