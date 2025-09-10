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
import { TaskGroupsModal } from '../../components/admin/TaskGroupsModal'

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
  const [viewingGroups, setViewingGroups] = useState<any>(null)
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('current') // Start with "In Use" instead of "All"
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

  const handleArchiveTask = async (task: any) => {
    try {
      await updateTask(task.id, { is_archived: true, archived_at: new Date().toISOString(), is_active: false })
    } catch (error) {
      console.error('Failed to archive task:', error)
    }
  }

  const handleRestoreTask = async (task: any) => {
    try {
      await updateTask(task.id, { is_archived: false, archived_at: null })
    } catch (error) {
      console.error('Failed to restore task:', error)
    }
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
        (statusFilter === 'current' && !task.is_archived) ||
        (statusFilter === 'archived' && task.is_archived)

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
    setStatusFilter('current') // Reset to default "In Use"
    setWorkshopFilter('all')
  }

  const hasActiveFilters = searchTerm || statusFilter !== 'current' || workshopFilter !== 'all'

  const createSampleTasks = async (workshopId: string) => {
    const sampleTasks = [
      {
        title: 'à¸ªà¸£à¹‰à¸²à¸‡à¹‚à¸¡à¹€à¸”à¸¥à¸ˆà¸³à¹à¸™à¸à¸ à¸²à¸žà¸”à¹‰à¸§à¸¢ AI',
        description: 'à¸ªà¸£à¹‰à¸²à¸‡à¹‚à¸¡à¹€à¸”à¸¥ AI à¸ªà¸³à¸«à¸£à¸±à¸šà¸ˆà¸³à¹à¸™à¸à¸›à¸£à¸°à¹€à¸ à¸—à¸ à¸²à¸ž à¹‚à¸”à¸¢à¹ƒà¸Šà¹‰ TensorFlow à¸«à¸£à¸·à¸­ PyTorch à¹ƒà¸«à¹‰à¸ªà¸²à¸¡à¸²à¸£à¸–à¸ˆà¸³à¹à¸™à¸à¸ à¸²à¸žà¹„à¸”à¹‰à¸­à¸¢à¹ˆà¸²à¸‡à¸™à¹‰à¸­à¸¢ 5 à¸›à¸£à¸°à¹€à¸ à¸— à¸žà¸£à¹‰à¸­à¸¡à¸—à¸±à¹‰à¸‡à¸­à¸˜à¸´à¸šà¸²à¸¢à¸§à¸´à¸˜à¸µà¸à¸²à¸£à¸—à¸³à¸‡à¸²à¸™à¹à¸¥à¸°à¹à¸ªà¸”à¸‡à¸œà¸¥à¸¥à¸±à¸žà¸˜à¹Œ',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        workshop_id: workshopId,
        order_index: 1,
        is_active: true
      },
      {
        title: 'à¸§à¸´à¹€à¸„à¸£à¸²à¸°à¸«à¹Œà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸”à¹‰à¸§à¸¢ Machine Learning',
        description: 'à¹ƒà¸Šà¹‰à¹€à¸—à¸„à¸™à¸´à¸„ Machine Learning à¹ƒà¸™à¸à¸²à¸£à¸§à¸´à¹€à¸„à¸£à¸²à¸°à¸«à¹Œà¸Šà¸¸à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¹ˆà¸à¸³à¸«à¸™à¸”à¹ƒà¸«à¹‰ à¸ªà¸£à¹‰à¸²à¸‡à¸£à¸²à¸¢à¸‡à¸²à¸™à¸œà¸¥à¸à¸²à¸£à¸§à¸´à¹€à¸„à¸£à¸²à¸°à¸«à¹Œ à¹à¸¥à¸°à¸™à¸³à¹€à¸ªà¸™à¸­ insights à¸—à¸µà¹ˆà¹„à¸”à¹‰',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        workshop_id: workshopId,
        order_index: 2,
        is_active: true
      },
      {
        title: 'à¸žà¸±à¸’à¸™à¸² Chatbot à¸”à¹‰à¸§à¸¢ AI',
        description: 'à¸ªà¸£à¹‰à¸²à¸‡ Chatbot à¸—à¸µà¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸•à¸­à¸šà¸„à¸³à¸–à¸²à¸¡à¸žà¸·à¹‰à¸™à¸à¸²à¸™à¹€à¸à¸µà¹ˆà¸¢à¸§à¸à¸±à¸šà¸«à¸±à¸§à¸‚à¹‰à¸­à¸—à¸µà¹ˆà¹€à¸£à¸µà¸¢à¸™à¸£à¸¹à¹‰à¹ƒà¸™à¸„à¸­à¸£à¹Œà¸ªà¸™à¸µà¹‰ à¹‚à¸”à¸¢à¹ƒà¸Šà¹‰ NLP à¹à¸¥à¸° AI technologies',
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
      alert('à¸ªà¸£à¹‰à¸²à¸‡ sample tasks à¸ªà¸³à¹€à¸£à¹‡à¸ˆ!')
    } catch (error) {
      console.error('Error creating sample tasks:', error)
      alert('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¸ªà¸£à¹‰à¸²à¸‡ sample tasks')
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
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 bg-white border-b border-gray-200 flex-shrink-0">
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
          {/* Quick Status Tabs */}
        {tasks.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-2 mb-4">
            {(() => {
              const counts = tasks.reduce(
                (acc, t: any) => {
                  if (t.is_archived) acc.archived++
                  else acc.current++
                  acc.all++
                  return acc
                },
                { current: 0, archived: 0, all: 0 }
              )
              const Tab = ({ value, label, count }: { value: string; label: string; count: number }) => (
                <button
                  onClick={() => setStatusFilter(value)}
                  className={`px-3 py-1.5 text-sm rounded-md mr-2 border ${
                    statusFilter === value
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  {label} <span className="ml-1 text-xs text-gray-500">({count})</span>
                </button>
              )
              return (
                <div className="flex flex-wrap items-center">
                  <Tab value="all" label="All" count={counts.all} />
                  <Tab value="current" label="In Use" count={counts.current} />
                  <Tab value="archived" label="Archived" count={counts.archived} />
                </div>
              )
            })()}
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <SearchAndFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search tasks by title or description..."
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            statusOptions={[
              { value: 'all', label: 'All' },
              { value: 'current', label: 'In Use' },
              { value: 'archived', label: 'Archived' },
            ]}
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
            {/* Table Header with Refresh Button */}
            <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedItems.length === filteredTasks.length && filteredTasks.length > 0}
                  onChange={selectedItems.length === filteredTasks.length ? handleDeselectAll : handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                />
                <span className="text-sm font-medium text-gray-500">
                  Select All
                </span>
              </div>
              <button
                onClick={refetch}
                className="border px-3 py-1.5 rounded-md text-gray-700 hover:bg-gray-50 flex items-center text-sm"
                title="Refresh"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12a7.5 7.5 0 0112.9-5.3L20 4v4.5M19.5 12a7.5 7.5 0 01-12.9 5.3L4 20v-4.5" />
                </svg>
                Refresh
              </button>
            </div>
            
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
              <div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {/* Checkbox header now in top bar */}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Task / Workshop
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submissions
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
                          {/* Row checkbox (aligns with first header column) */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(task.id)}
                              onChange={() => handleItemSelect(task.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          {/* Task / Workshop first, submissions column follows below */}

                          {/* Task / Workshop with due date + status toggle */}
                          <td className="px-6 py-4 align-top">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-semibold text-gray-900">
                                  {task.title}
                                </div>
                                {/* Task Type Badge */}
                                {task.submission_mode === 'group' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                                    </svg>
                                    กลุ่ม
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                                    </svg>
                                    เดี่ยว
                                  </span>
                                )}
                              </div>
                              {task.description && (
                                <div className="text-xs text-gray-600 truncate max-w-md">
                                  {task.description.length > 80 ? `${task.description.substring(0, 80)}...` : task.description}
                                </div>
                              )}
                              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center flex-wrap gap-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700">Order {task.order_index}</span>
                                  {task.workshop?.title && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700">{task.workshop.title}</span>
                                  )}
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded ${isOverdue ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                    {formatDate(task.due_date)}{isOverdue && <span className="ml-1">(Overdue)</span>}
                                  </span>
                                </div>
                                <div className="ml-3">
                                  <button
                                    onClick={() => handleUpdateTask(task.id, { is_active: !task.is_active })}
                                    aria-pressed={task.is_active}
                                    title={task.is_active ? 'Click to hide this task' : 'Click to show this task'}
                                    className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full transition-colors shadow-sm border ${task.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'}`}
                                  >
                                    {task.is_active ? (
                                      <>
                                        <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
                                        Show
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd"/><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/></svg>
                                        Hide
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                          {/* Submissions cell (after Task/Workshop) */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setViewingSubmissions(task)}
                                className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md border border-blue-200 transition-colors"
                                title="View all submissions"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                  <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V9l-5-6H4z" />
                                </svg>
                                <span>View</span>
                                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded bg-white text-blue-700 border border-blue-200">{submissionCount}</span>
                              </button>
                              {/* Lucky Draw quick action removed per request */}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setEditingTask(task)}
                                className="text-green-700 hover:text-green-900 text-xs bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-md transition-colors font-medium"
                                title="Edit task"
                              >
                                Edit
                              </button>
                              
                              <div className="relative group">
                                <button
                                  className="text-gray-500 hover:text-gray-700 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                                  title="More actions"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                                  </svg>
                                </button>
                                
                                {/* Dropdown Menu */}
                                <div className="absolute right-0 z-10 w-48 py-1 mt-1 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                  {task.submission_mode === 'group' && (
                                    <button
                                      onClick={() => setViewingGroups(task)}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-900 transition-colors"
                                    >
                                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                                      </svg>
                                      Manage Groups
                                    </button>
                                  )}
                                  
                                  {task.is_archived ? (
                                    <button
                                      onClick={() => handleRestoreTask(task)}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-800 transition-colors"
                                    >
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                      Restore Task
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleArchiveTask(task)}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-800 transition-colors"
                                    >
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4m0 0l4-4m-4 4V3m-1 17v-8a4 4 0 014-4h0a4 4 0 014 4v8" />
                                      </svg>
                                      Archive Task
                                    </button>
                                  )}
                                  
                                  <div className="border-t border-gray-100 my-1"></div>
                                  
                                  <button
                                    onClick={() => handleDeleteTask(task)}
                                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-800 transition-colors"
                                  >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete Task
                                  </button>
                                </div>
                              </div>
                            </div>
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
      <TaskSubmissionsModal task={viewingSubmissions} onClose={() => setViewingSubmissions(null)} initialShowLuckyDraw={(window as any).__openLuckyDrawForTask === viewingSubmissions?.id} />

      {/* Task Groups Modal */}
      {viewingGroups && (
        <TaskGroupsModal task={viewingGroups} onClose={() => setViewingGroups(null)} />
      )}

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
        </div>
      </div>
    </div>
  )
}

