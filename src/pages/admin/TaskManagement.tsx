import React, { useState, useMemo } from 'react'
import { useAdminTasks } from '../../hooks/useAdminData'
import { AdminNavigation } from '../../components/admin/AdminNavigation'
import { CreateTaskModal } from '../../components/admin/CreateTaskModal'
import { EditTaskModal } from '../../components/admin/EditTaskModal'
import { TaskSubmissionsModal } from '../../components/admin/TaskSubmissionsModal'
import { ConfirmDeleteModal } from '../../components/admin/ConfirmDeleteModal'
import { SearchAndFilter } from '../../components/admin/SearchAndFilter'
import { BulkActionBar } from '../../components/admin/BulkActionBar'
import { supabase } from '../../services/supabase'

export function TaskManagement() {
  const { tasks, workshops, loading, error, createTask, updateTask, deleteTask, refetch } = useAdminTasks()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [viewingSubmissions, setViewingSubmissions] = useState<any>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ task: any; show: boolean }>({ 
    task: null, 
    show: false 
  })
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('all')
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [workshopFilter, setWorkshopFilter] = useState('all')
  
  // Bulk Actions State
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)

  const handleCreateTask = async (taskData: any) => {
    try {
      console.log('Creating task with data:', taskData)
      await createTask(taskData)
      console.log('Task created successfully!')
      
      // Force UI update by setting the modal to closed
      setShowCreateModal(false)
    } catch (error) {
      console.error('Failed to create task:', error)
      throw error // Re-throw so the modal can show the error
    }
  }

  const handleUpdateTask = async (taskId: string, updates: any) => {
    await updateTask(taskId, updates)
    setEditingTask(null)
  }

  const handleDeleteTask = (task: any) => {
    setDeleteConfirm({ task, show: true })
  }

  const confirmDeleteTask = async () => {
    if (!deleteConfirm.task) return
    
    try {
      setDeleteLoading(true)
      console.log('Attempting to delete task:', deleteConfirm.task.id)
      await deleteTask(deleteConfirm.task.id)
      console.log('Task deleted successfully')
      setDeleteConfirm({ task: null, show: false })
      setSelectedItems(prev => prev.filter(id => id !== deleteConfirm.task.id))
    } catch (error) {
      console.error('Failed to delete task:', error)
      alert(`Failed to delete task: ${error.message || error}`)
    } finally {
      setDeleteLoading(false)
    }
  }

  // Workshop options for filtering
  const workshopOptions = useMemo(() => {
    return workshops.map(workshop => ({ 
      value: workshop.id, 
      label: workshop.title 
    }))
  }, [workshops])

  // Filtering Logic
  const filteredTasks = useMemo(() => {
    let filtered = tasks

    // Workshop filter (keep existing logic)
    if (selectedWorkshop !== 'all') {
      filtered = filtered.filter(task => task.workshop_id === selectedWorkshop)
    }

    // Additional filters
    filtered = filtered.filter(task => {
      // Search filter
      const matchesSearch = !searchTerm || 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (task.workshop?.title && task.workshop.title.toLowerCase().includes(searchTerm.toLowerCase()))

      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && task.is_active) ||
        (statusFilter === 'inactive' && !task.is_active)

      // Workshop filter for search component
      const matchesWorkshop = workshopFilter === 'all' ||
        task.workshop_id === workshopFilter

      return matchesSearch && matchesStatus && matchesWorkshop
    })

    return filtered
  }, [tasks, selectedWorkshop, searchTerm, statusFilter, workshopFilter])

  // Bulk Actions
  const handleSelectAll = () => {
    setSelectedItems(filteredTasks.map(task => task.id))
  }

  const handleDeselectAll = () => {
    setSelectedItems([])
  }

  const handleBulkHide = async () => {
    setBulkLoading(true)
    try {
      await Promise.all(
        selectedItems.map(id => updateTask(id, { is_active: false }))
      )
      setSelectedItems([])
      alert('Selected tasks have been hidden successfully')
    } catch (error) {
      console.error('Error hiding tasks:', error)
      alert('Failed to hide selected tasks')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkShow = async () => {
    setBulkLoading(true)
    try {
      await Promise.all(
        selectedItems.map(id => updateTask(id, { is_active: true }))
      )
      setSelectedItems([])
      alert('Selected tasks have been shown successfully')
    } catch (error) {
      console.error('Error showing tasks:', error)
      alert('Failed to show selected tasks')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    setBulkLoading(true)
    try {
      await Promise.all(
        selectedItems.map(id => deleteTask(id))
      )
      setSelectedItems([])
      alert('Selected tasks have been deleted successfully')
    } catch (error) {
      console.error('Error deleting tasks:', error)
      alert('Failed to delete selected tasks')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleItemSelect = (taskId: string) => {
    setSelectedItems(prev => 
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setWorkshopFilter('all')
  }

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || workshopFilter !== 'all'

  const createSampleTasks = async (workshopId: string) => {
    const sampleTasks = [
      {
        title: 'สร้างโมเดลจำแนกภาพด้วย AI',
        description: 'สร้างโมเดล AI สำหรับจำแนกประเภทภาพ โดยใช้ TensorFlow หรือ PyTorch ให้สามารถจำแนกภาพได้อย่างน้อย 5 ประเภท พร้อมทั้งอธิบายวิธีการทำงานและแสดงผลลัพธ์',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        workshop_id: workshopId,
        order_index: 1,
        is_active: true
      },
      {
        title: 'วิเคราะห์ข้อมูลด้วย Machine Learning',
        description: 'ใช้เทคนิค Machine Learning ในการวิเคราะห์ชุดข้อมูลที่กำหนดให้ สร้างรายงานผลการวิเคราะห์ และนำเสนอ insights ที่ได้',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        workshop_id: workshopId,
        order_index: 2,
        is_active: true
      },
      {
        title: 'พัฒนา Chatbot ด้วย AI',
        description: 'สร้าง Chatbot ที่สามารถตอบคำถามพื้นฐานเกี่ยวกับหัวข้อที่เรียนรู้ในคอร์สนี้ โดยใช้ NLP และ AI technologies',
        due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        workshop_id: workshopId,
        order_index: 3,
        is_active: true
      }
    ]

    try {
      for (const task of sampleTasks) {
        await createTask(task)
      }
      alert('สร้าง sample tasks สำเร็จ!')
    } catch (error) {
      console.error('Error creating sample tasks:', error)
      alert('เกิดข้อผิดพลาดในการสร้าง sample tasks')
    }
  }

  // Use the new filteredTasks from useMemo above
  // const filteredTasks = selectedWorkshop === 'all' 
  //   ? tasks 
  //   : tasks.filter(task => task.workshop_id === selectedWorkshop)

  const getTaskStatusColor = (submissionCount: number, workshopParticipants: number = 0) => {
    if (workshopParticipants === 0) return 'bg-gray-100 text-gray-800'
    const percentage = (submissionCount / workshopParticipants) * 100
    if (percentage >= 80) return 'bg-green-100 text-green-800'
    if (percentage >= 50) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No due date'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminNavigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tasks...</p>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Tasks</h2>
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
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Traco Task Management</h1>
              <p className="text-gray-600 mt-1">Create, edit, and manage workshop tasks</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Workshop Filter */}
              <div className="flex items-center">
                <label htmlFor="workshop-filter" className="text-sm font-medium text-gray-700 mr-2">
                  Filter by workshop:
                </label>
                <select
                  id="workshop-filter"
                  value={selectedWorkshop}
                  onChange={(e) => setSelectedWorkshop(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Workshops</option>
                  {workshops.map((workshop) => (
                    <option key={workshop.id} value={workshop.id}>
                      {workshop.title}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedWorkshop !== 'all' && (
                <button
                  onClick={() => createSampleTasks(selectedWorkshop)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium flex items-center mr-2"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Add Sample Tasks
                </button>
              )}
              
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Task
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            <SearchAndFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search tasks by title or description..."
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              workshopFilter={workshopFilter}
              onWorkshopFilterChange={setWorkshopFilter}
              workshopOptions={workshopOptions}
              onClearFilters={handleClearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </div>

          {/* Tasks Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                  <p className="text-2xl font-semibold text-gray-900">{filteredTasks.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">With Submissions</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {filteredTasks.filter(task => task.submissions && task.submissions.length > 0).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Due This Week</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {filteredTasks.filter(task => {
                      if (!task.due_date) return false
                      const dueDate = new Date(task.due_date)
                      const today = new Date()
                      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
                      return dueDate >= today && dueDate <= nextWeek
                    }).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Overdue</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {filteredTasks.filter(task => {
                      if (!task.due_date) return false
                      return new Date(task.due_date) < new Date()
                    }).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tasks Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Bulk Action Bar */}
            {filteredTasks.length > 0 && (
              <BulkActionBar
                selectedItems={selectedItems}
                totalItems={filteredTasks.length}
                itemType="task"
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onBulkHide={handleBulkHide}
                onBulkShow={handleBulkShow}
                onBulkDelete={handleBulkDelete}
                loading={bulkLoading}
              />
            )}

            {filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {tasks.length === 0 ? 'No Tasks Found' : 'No Tasks Found'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {tasks.length === 0 
                    ? 'Get started by creating your first task.'
                    : 'Try adjusting your search or filter criteria'
                  }
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  Create Task
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedItems.length === filteredTasks.length && filteredTasks.length > 0}
                          onChange={selectedItems.length === filteredTasks.length ? handleDeselectAll : handleSelectAll}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Task
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Workshop
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submissions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTasks.map((task) => {
                      const submissionCount = task.submissions?.[0]?.count || 0
                      const isOverdue = task.due_date && new Date(task.due_date) < new Date()
                      
                      return (
                        <tr key={task.id} className={`hover:bg-gray-50 ${selectedItems.includes(task.id) ? 'bg-blue-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(task.id)}
                              onChange={() => handleItemSelect(task.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {task.title}
                              </div>
                              {task.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {task.description.length > 30 
                                    ? `${task.description.substring(0, 30)}...` 
                                    : task.description
                                  }
                                </div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
                                Order: {task.order_index}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {task.workshop?.title}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                              {formatDate(task.due_date)}
                            </div>
                            {isOverdue && (
                              <div className="text-xs text-red-500">Overdue</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => setViewingSubmissions(task)}
                              className="group inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium hover:bg-blue-50 px-2 py-1 rounded-md transition-all duration-200 cursor-pointer"
                              title="Click to view all submissions for this task"
                            >
                              <span className="mr-1.5">📂</span>
                              <span>View ({submissionCount} submission{submissionCount !== 1 ? 's' : ''})</span>
                              <svg className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleUpdateTask(task.id, { is_active: !task.is_active })}
                              className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                task.is_active 
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }`}
                            >
                              {task.is_active ? (
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                                </svg>
                              ) : (
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd"/>
                                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>
                                </svg>
                              )}
                              {task.is_active ? 'Show' : 'Hide'}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => setEditingTask(task)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTaskCreated={handleCreateTask}
        workshops={workshops}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onTaskUpdated={handleUpdateTask}
        workshops={workshops}
      />

      {/* Task Submissions Modal */}
      <TaskSubmissionsModal
        task={viewingSubmissions}
        onClose={() => setViewingSubmissions(null)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteConfirm.show}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleteConfirm.task?.title}"? This action cannot be undone and will remove all associated submissions.`}
        onConfirm={confirmDeleteTask}
        onCancel={() => setDeleteConfirm({ task: null, show: false })}
        loading={deleteLoading}
      />
    </div>
  )
}