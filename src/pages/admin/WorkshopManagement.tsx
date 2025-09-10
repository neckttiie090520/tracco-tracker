import React, { useState, useMemo } from 'react'
import { useAdminWorkshops } from '../../hooks/useAdminData'
import { AdminNavigation } from '../../components/admin/AdminNavigation'
import { CreateWorkshopModal } from '../../components/admin/CreateWorkshopModal'
import { EditWorkshopModal } from '../../components/admin/EditWorkshopModal'
import { ConfirmDeleteModal } from '../../components/admin/ConfirmDeleteModal'
import { WorkshopMaterialsManager } from '../../components/admin/WorkshopMaterialsManager'
import { SearchAndFilter } from '../../components/admin/SearchAndFilter'
import { BulkActionBar } from '../../components/admin/BulkActionBar'
import { supabase } from '../../services/supabase'

export function WorkshopManagement() {
  const { workshops, loading, error, createWorkshop, updateWorkshop, deleteWorkshop, refetch } = useAdminWorkshops()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingWorkshop, setEditingWorkshop] = useState<any>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ workshop: any; show: boolean }>({ 
    workshop: null, 
    show: false 
  })
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [managingMaterials, setManagingMaterials] = useState<any>(null)
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('current') // Start with "In Use" instead of "All"
  const [sessionFilter, setSessionFilter] = useState('all')
  const [instructorFilter, setInstructorFilter] = useState('all')
  
  // Bulk Actions State
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  
  // Sessions for filter
  const [sessions, setSessions] = useState<any[]>([])

  const handleCreateWorkshop = async (workshopData: any, materials?: any[]) => {
    await createWorkshop(workshopData, materials)
  }

  const handleUpdateWorkshop = async (workshopId: string, updates: any) => {
    await updateWorkshop(workshopId, updates)
    setEditingWorkshop(null)
  }

  const handleArchiveWorkshop = async (workshop: any) => {
    try {
      await updateWorkshop(workshop.id, { is_archived: true, is_active: false, archived_at: new Date().toISOString() })
    } catch (error) {
      console.error('Failed to archive workshop:', error)
    }
  }

  const handleRestoreWorkshop = async (workshop: any) => {
    try {
      await updateWorkshop(workshop.id, { is_archived: false, archived_at: null })
    } catch (error) {
      console.error('Failed to restore workshop:', error)
    }
  }

  const handleDeleteWorkshop = (workshop: any) => {
    setDeleteConfirm({ workshop, show: true })
  }

  // Fetch sessions for filtering
  React.useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data } = await supabase
          .from('sessions')
          .select('id, title')
          .eq('is_active', true)
          .order('title')
        setSessions(data || [])
      } catch (error) {
        console.error('Error fetching sessions:', error)
      }
    }
    fetchSessions()
  }, [])

  const confirmDeleteWorkshop = async () => {
    if (!deleteConfirm.workshop) return
    
    try {
      setDeleteLoading(true)
      await deleteWorkshop(deleteConfirm.workshop.id)
      setDeleteConfirm({ workshop: null, show: false })
      setSelectedItems(prev => prev.filter(id => id !== deleteConfirm.workshop.id))
    } catch (error) {
      console.error('Failed to delete workshop:', error)
    } finally {
      setDeleteLoading(false)
    }
  }

  // Get unique instructors for filter
  const instructorOptions = useMemo(() => {
    const instructors = workshops
      .map(w => w.instructor?.name)
      .filter((name): name is string => !!name)
      .filter((name, index, arr) => arr.indexOf(name) === index)
      .sort()
    
    return instructors.map(name => ({ value: name, label: name }))
  }, [workshops])

  const sessionOptions = useMemo(() => {
    return sessions.map(session => ({ 
      value: session.id, 
      label: session.title 
    }))
  }, [sessions])

  // Filtering Logic
  const filteredWorkshops = useMemo(() => {
    return workshops.filter(workshop => {
      // Search filter
      const matchesSearch = !searchTerm || 
        workshop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (workshop.description && workshop.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (workshop.instructor?.name && workshop.instructor.name.toLowerCase().includes(searchTerm.toLowerCase()))

      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'current' && !workshop.is_archived) ||
        (statusFilter === 'archived' && workshop.is_archived)

      // Instructor filter
      const matchesInstructor = instructorFilter === 'all' ||
        workshop.instructor?.name === instructorFilter

      // Session filter (this would require additional data structure)
      const matchesSession = sessionFilter === 'all' // TODO: Implement session filtering

      return matchesSearch && matchesStatus && matchesInstructor && matchesSession
    })
  }, [workshops, searchTerm, statusFilter, instructorFilter, sessionFilter])

  // Bulk Actions
  const handleSelectAll = () => {
    setSelectedItems(filteredWorkshops.map(workshop => workshop.id))
  }

  const handleDeselectAll = () => {
    setSelectedItems([])
  }

  const handleBulkHide = async () => {
    setBulkLoading(true)
    try {
      await Promise.all(
        selectedItems.map(id => updateWorkshop(id, { is_active: false }))
      )
      setSelectedItems([])
      alert('Selected workshops have been hidden successfully')
    } catch (error) {
      console.error('Error hiding workshops:', error)
      alert('Failed to hide selected workshops')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkShow = async () => {
    setBulkLoading(true)
    try {
      await Promise.all(
        selectedItems.map(id => updateWorkshop(id, { is_active: true }))
      )
      setSelectedItems([])
      alert('Selected workshops have been shown successfully')
    } catch (error) {
      console.error('Error showing workshops:', error)
      alert('Failed to show selected workshops')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    setBulkLoading(true)
    try {
      await Promise.all(
        selectedItems.map(id => deleteWorkshop(id))
      )
      setSelectedItems([])
      alert('Selected workshops have been deleted successfully')
    } catch (error) {
      console.error('Error deleting workshops:', error)
      alert('Failed to delete selected workshops')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkArchive = async () => {
    setBulkLoading(true)
    try {
      await Promise.all(
        selectedItems.map(id => updateWorkshop(id, { is_archived: true, is_active: false, archived_at: new Date().toISOString() }))
      )
      setSelectedItems([])
      alert('Selected workshops have been archived successfully')
    } catch (error) {
      console.error('Error archiving workshops:', error)
      alert('Failed to archive selected workshops')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleItemSelect = (workshopId: string) => {
    setSelectedItems(prev => 
      prev.includes(workshopId)
        ? prev.filter(id => id !== workshopId)
        : [...prev, workshopId]
    )
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('current')
    setSessionFilter('all')
    setInstructorFilter('all')
  }

  const hasActiveFilters = searchTerm || statusFilter !== 'current' || sessionFilter !== 'all' || instructorFilter !== 'all'

  const handleToggleActive = async (workshop: any) => {
    try {
      await updateWorkshop(workshop.id, { is_active: !workshop.is_active })
    } catch (error) {
      alert('Failed to update workshop status. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminNavigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading workshops...</p>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Workshops</h2>
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
              <h1 className="text-2xl font-bold text-gray-900">Traco Workshop Management</h1>
              <p className="text-gray-600 mt-1">Create, edit, and manage workshops</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Workshop
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6" style={{maxHeight: '80vh', minHeight: '80vh'}}>

        {/* Quick Status Tabs */}
        {workshops.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-2 mb-4">
            {(() => {
              const counts = workshops.reduce(
                (acc, w: any) => {
                  if (w.is_archived) acc.archived++
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
            searchPlaceholder="Search workshops by title, description, or instructor..."
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            statusOptions={[
              { value: 'all', label: 'All' },
              { value: 'current', label: 'In Use' },
              { value: 'archived', label: 'Archived' },
            ]}
            sessionFilter={sessionFilter}
            onSessionFilterChange={setSessionFilter}
            sessionOptions={sessionOptions}
            instructorFilter={instructorFilter}
            onInstructorFilterChange={setInstructorFilter}
            instructorOptions={instructorOptions}
            onClearFilters={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

          {/* Workshops Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Bulk Action Bar */}
            {filteredWorkshops.length > 0 && (
              <BulkActionBar
                selectedItems={selectedItems}
                totalItems={filteredWorkshops.length}
                itemType="workshop"
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onBulkHide={handleBulkHide}
                onBulkShow={handleBulkShow}
                onBulkArchive={handleBulkArchive}
                onBulkDelete={handleBulkDelete}
                loading={bulkLoading}
              />
            )}

            {filteredWorkshops.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {workshops.length === 0 ? 'No Workshops Found' : 'No Workshops Found'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {workshops.length === 0 
                    ? 'Get started by creating your first workshop.'
                    : 'Try adjusting your search or filter criteria'
                  }
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  Create Workshop
                </button>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {/* Selection column - controlled by BulkActionBar */}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Workshop
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Instructor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participants
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
                    {filteredWorkshops.map((workshop) => {
                      const participantCount = workshop.registrations?.[0]?.count || 0
                      const taskCount = workshop.tasks?.[0]?.count || 0
                      
                      return (
                        <tr key={workshop.id} className={`hover:bg-gray-50 ${selectedItems.includes(workshop.id) ? 'bg-blue-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(workshop.id)}
                              onChange={() => handleItemSelect(workshop.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {workshop.title}
                              </div>
                              <div className="text-sm text-gray-500 truncate max-w-xs whitespace-pre-line">
                                {workshop.description}
                              </div>
                              {taskCount > 0 && (
                                <div className="text-xs text-blue-600 mt-1">
                                  {taskCount} task{taskCount !== 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {workshop.instructor?.name || 'Not assigned'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {workshop.instructor?.email || ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {participantCount}/{workshop.max_participants}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleActive(workshop)}
                              className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                workshop.is_active
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }`}
                            >
                              {workshop.is_active ? (
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
                              {workshop.is_active ? 'Show' : 'Hide'}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setEditingWorkshop(workshop)}
                                className="text-green-700 hover:text-green-900 text-xs bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-md transition-colors font-medium"
                                title="Edit workshop"
                              >
                                Edit
                              </button>
                              
                              <div className="relative group" style={{ zIndex: 9999 }}>
                                <button
                                  className="text-gray-500 hover:text-gray-700 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                                  title="More actions"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                  </svg>
                                </button>
                                
                                <div className="fixed z-[9999] w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200" style={{ transform: 'translate(-100%, 0)', marginTop: '2rem' }}>
                                  <a
                                    href={`/workshops/${workshop.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-800 transition-colors"
                                  >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    View Workshop
                                  </a>
                                  
                                  {workshop.is_archived ? (
                                    <button
                                      onClick={() => handleRestoreWorkshop(workshop)}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-800 transition-colors"
                                    >
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                      </svg>
                                      Restore Workshop
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleArchiveWorkshop(workshop)}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-800 transition-colors"
                                    >
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4m0 0l4-4m-4 4V3m-1 17v-8a4 4 0 014-4h0a4 4 0 014 4v8" />
                                      </svg>
                                      Archive Workshop
                                    </button>
                                  )}
                                  
                                  <div className="border-t border-gray-100 my-1"></div>
                                  
                                  <button
                                    onClick={() => handleDeleteWorkshop(workshop)}
                                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-800 transition-colors"
                                  >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete Workshop
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

      {/* Create Workshop Modal */}
      <CreateWorkshopModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onWorkshopCreated={handleCreateWorkshop}
      />

      {/* Edit Workshop Modal */}
      <EditWorkshopModal
        workshop={editingWorkshop}
        onClose={() => setEditingWorkshop(null)}
        onWorkshopUpdated={handleUpdateWorkshop}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteConfirm.show}
        title="Delete Workshop"
        message={`Are you sure you want to delete "${deleteConfirm.workshop?.title}"? This action cannot be undone and will remove all associated data.`}
        onConfirm={confirmDeleteWorkshop}
        onCancel={() => setDeleteConfirm({ workshop: null, show: false })}
        loading={deleteLoading}
      />

      {/* Materials Management Modal */}
      {managingMaterials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">จัดการเอกสาร Workshop</h2>
                <button
                  onClick={() => setManagingMaterials(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <WorkshopMaterialsManager
                workshopId={managingMaterials.id}
                workshopTitle={managingMaterials.title}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
