import React, { useState } from 'react'
import { adminService } from '../../services/admin'
import { useAuth } from '../../hooks/useAuth'
import { TaskSubmissionForm } from '../tasks/TaskSubmissionForm'

interface WorkshopTaskListProps {
  workshopId: string
  workshopTitle: string
}

interface Task {
  id: string
  title: string
  description?: string
  due_date?: string
  order_index: number
  submissions?: any[]
}

export function WorkshopTaskList({ workshopId, workshopTitle }: WorkshopTaskListProps) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

  const fetchTasks = React.useCallback(async () => {
    if (!user || !workshopId) return

    try {
      setLoading(true)
      setError(null)
      console.log('🔍 Fetching workshop tasks for workshop:', workshopId)
      const data = await adminService.getWorkshopTasks(workshopId)
      console.log('📝 Workshop tasks fetched:', data?.length || 0, 'tasks')
      console.log('📋 Tasks data:', data)
      
      // Filter submissions to only show current user's submissions
      const tasksWithUserSubmissions = data?.map(task => ({
        ...task,
        submissions: task.submissions?.filter((sub: any) => sub.user_id === user.id) || []
      })) || []
      
      setTasks(tasksWithUserSubmissions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }, [user, workshopId])

  React.useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleTaskExpand = (taskId: string) => {
    setExpandedTask(expandedTask === taskId ? null : taskId)
  }

  const getTaskStatus = (task: Task) => {
    const userSubmission = task.submissions?.[0]
    if (!userSubmission) return { status: 'not_started', color: 'bg-gray-100 text-gray-800', label: 'Not Started' }
    
    switch (userSubmission.status) {
      case 'submitted':
        return { status: 'submitted', color: 'bg-blue-100 text-blue-800', label: 'Submitted' }
      case 'reviewed':
        return { status: 'reviewed', color: 'bg-green-100 text-green-800', label: 'Reviewed' }
      case 'draft':
        return { status: 'draft', color: 'bg-yellow-100 text-yellow-800', label: 'In Progress' }
      default:
        return { status: 'not_started', color: 'bg-gray-100 text-gray-800', label: 'Not Started' }
    }
  }

  const isTaskOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return null
    const date = new Date(dueDate)
    const now = new Date()
    const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 0) {
      return `Overdue by ${Math.abs(Math.floor(diffInHours / 24))} day${Math.abs(Math.floor(diffInHours / 24)) !== 1 ? 's' : ''}`
    } else if (diffInHours < 24) {
      return `Due in ${Math.floor(diffInHours)} hour${Math.floor(diffInHours) !== 1 ? 's' : ''}`
    } else if (diffInHours < 168) { // 7 days
      return `Due in ${Math.floor(diffInHours / 24)} day${Math.floor(diffInHours / 24) !== 1 ? 's' : ''}`
    } else {
      return `Due ${date.toLocaleDateString()}`
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Tasks</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchTasks}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Workshop Tasks</h2>
          <span className="text-sm text-gray-500">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {tasks.length === 0 ? (
          <div className="p-6 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tasks Yet</h3>
            <p className="text-gray-600">
              The instructor hasn't created any tasks for this workshop yet.
            </p>
          </div>
        ) : (
          tasks.map((task) => {
            const taskStatus = getTaskStatus(task)
            const isOverdue = isTaskOverdue(task.due_date)
            const dueDateDisplay = formatDueDate(task.due_date)
            const isExpanded = expandedTask === task.id

            return (
              <div key={task.id} className="border-l-4 border-l-transparent hover:border-l-blue-400 transition-colors">
                <div className="p-6">
                  <div 
                    className="flex justify-between items-start cursor-pointer"
                    onClick={() => handleTaskExpand(task.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors">
                          {task.title}
                        </h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${taskStatus.color}`}>
                          {taskStatus.label}
                        </span>
                        <span className="text-sm text-gray-500">
                          #{task.order_index}
                        </span>
                      </div>
                      
                      {task.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2 whitespace-pre-line">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        {dueDateDisplay && (
                          <div className={`flex items-center ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {dueDateDisplay}
                          </div>
                        )}
                        
                      </div>
                    </div>
                    
                    <div className="ml-4 flex-shrink-0">
                      <button className="text-gray-400 hover:text-gray-600">
                        <svg 
                          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Task Content */}
                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t border-gray-200">

                      {/* Task Submission Form */}
                      <TaskSubmissionForm
                        taskId={task.id}
                        task={task}
                        workshopId={workshopId}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}