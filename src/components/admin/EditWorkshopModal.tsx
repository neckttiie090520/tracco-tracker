import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useUserProfile } from '../../hooks/useAdmin'
import { MaterialManager } from './MaterialManager'
import { MaterialService } from '../../services/materials'
import { userService } from '../../services/users'
import type { WorkshopMaterial } from '../../types/materials'

interface EditWorkshopModalProps {
  workshop: any | null
  onClose: () => void
  onWorkshopUpdated: (workshopId: string, updates: any) => void
}

export function EditWorkshopModal({ workshop, onClose, onWorkshopUpdated }: EditWorkshopModalProps) {
  const { profile: userProfile } = useUserProfile()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    max_participants: 150,
    instructor: ''
  })
  
  const [materials, setMaterials] = useState<WorkshopMaterial[]>([])
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [currentTab, setCurrentTab] = useState<'details' | 'materials'>('details')

  // Load users for instructor selection
  useEffect(() => {
    if (!workshop) return

    const loadUsers = async () => {
      try {
        setLoadingUsers(true)
        const allUsers = await userService.getAllUsers()
        // Filter to only show admin users
        const adminUsers = allUsers.filter(user => user.role === 'admin')
        setUsers(adminUsers)
      } catch (error) {
        console.error('Failed to load users:', error)
      } finally {
        setLoadingUsers(false)
      }
    }

    loadUsers()
  }, [workshop])

  // Initialize form with workshop data
  useEffect(() => {
    if (workshop) {
      setFormData({
        title: workshop.title || '',
        description: workshop.description || '',
        max_participants: workshop.max_participants || 150,
        instructor: workshop.instructor || ''
      })
      
      // Load existing materials
      loadMaterials(workshop.id)
    }
  }, [workshop])

  const loadMaterials = async (workshopId: string) => {
    try {
      setMaterialsLoading(true)
      const existingMaterials = await MaterialService.getWorkshopMaterials(workshopId)
      setMaterials(existingMaterials)
    } catch (error) {
      console.error('Error loading materials:', error)
    } finally {
      setMaterialsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile || !workshop) return

    try {
      setLoading(true)
      setError(null)

      const updates = {
        ...formData,
      }

      await onWorkshopUpdated(workshop.id, updates)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workshop')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'max_participants' ? parseInt(value) || 0 : value
    }))
  }

  // Handle escape key and focus management
  useEffect(() => {
    if (!workshop) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose()
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && e.target === modalRef.current && !loading) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)
    
    // Focus first input when modal opens
    const firstInput = modalRef.current?.querySelector('input[type="text"]') as HTMLInputElement
    if (firstInput) {
      firstInput.focus()
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [workshop, loading, onClose])

  if (!workshop) return null

  const modalContent = (
    <div 
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-200 scale-100 opacity-100">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Edit Workshop</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setCurrentTab('details')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                currentTab === 'details'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📝 Workshop Details
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab('materials')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                currentTab === 'materials'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📚 Materials {materials.length > 0 ? `(${materials.length})` : ''}
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Tab Content */}
          {currentTab === 'details' && (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Workshop Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                placeholder="Enter workshop title"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={loading}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                placeholder="Enter workshop description"
              />
            </div>

            <div>
              <label htmlFor="instructor" className="block text-sm font-medium text-gray-700 mb-1">
                Instructor *
              </label>
              {loadingUsers ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                  Loading users...
                </div>
              ) : (
                <select
                  id="instructor"
                  name="instructor"
                  value={formData.instructor}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                >
                  <option value="">Select instructor</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email}) 👑
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="max_participants" className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Participants
              </label>
              <input
                type="number"
                id="max_participants"
                name="max_participants"
                value={formData.max_participants}
                onChange={handleChange}
                min="1"
                max="500"
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>

              </div>
              
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.title.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  )}
                  {loading ? 'Updating...' : 'Update Workshop'}
                </button>
              </div>
            </form>
          )}

          {currentTab === 'materials' && (
            <div>
              {materialsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                  <span className="text-gray-600">Loading materials...</span>
                </div>
              ) : (
                <>
                  {materials.length === 0 && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-blue-900">Add Learning Materials</h3>
                          <p className="text-sm text-blue-700 mt-1">
                            Add materials like Google Docs, Canva presentations, YouTube videos, or any other links to help participants learn.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <MaterialManager
                    workshopId={workshop.id}
                    materials={materials}
                    onMaterialsChange={setMaterials}
                  />
                </>
              )}
              
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(new Event('submit') as any)}
                  disabled={loading || !formData.title.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  )}
                  {loading ? 'Updating...' : 'Update Workshop'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}