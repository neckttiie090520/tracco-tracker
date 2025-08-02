import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TaskMaterialManager } from './TaskMaterialManager'
import type { TaskMaterial } from '../../types/materials'

interface EditTaskModalProps {
  task: any
  onClose: () => void
  onTaskUpdated: (taskId: string, updates: any) => void
  workshops: any[]
}

export function EditTaskModal({ task, onClose, onTaskUpdated, workshops }: EditTaskModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    workshop_id: '',
    due_date: '',
    order_index: 1,
    is_active: true
  })
  
  const [materials, setMaterials] = useState<TaskMaterial[]>([])

  // Initialize form with task data
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        workshop_id: task.workshop_id || '',
        due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
        order_index: task.order_index || 1,
        is_active: task.is_active ?? true
      })
      
      // Initialize materials if task has them
      setMaterials(task.materials || [])
    }
  }, [task])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task) return

    try {
      setLoading(true)
      setError(null)

      const updates = {
        ...formData,
        order_index: parseInt(formData.order_index.toString()) || 1,
        due_date: formData.due_date || null,
        materials: materials // Include materials in updates
      }

      await onTaskUpdated(task.id, updates)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked
        : name === 'order_index' 
        ? parseInt(value) || 1 
        : value
    }))
  }

  // Handle escape key and focus management
  useEffect(() => {
    if (!task) return

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
  }, [task, loading, onClose])

  if (!task) return null

  const modalContent = (
    <div 
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-200 scale-100 opacity-100">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Edit Task</h2>
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

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="workshop_id" className="block text-sm font-medium text-gray-700 mb-1">
                Workshop *
              </label>
              <select
                id="workshop_id"
                name="workshop_id"
                value={formData.workshop_id}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              >
                <option value="">Select a workshop</option>
                {workshops.map((workshop) => (
                  <option key={workshop.id} value={workshop.id}>
                    {workshop.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Task Title *
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
                placeholder="Enter task title"
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
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                placeholder="Enter task description and instructions"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  id="due_date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                />
              </div>

              <div>
                <label htmlFor="order_index" className="block text-sm font-medium text-gray-700 mb-1">
                  Order
                </label>
                <input
                  type="number"
                  id="order_index"
                  name="order_index"
                  value={formData.order_index}
                  onChange={handleChange}
                  min="1"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Task order within the workshop (1 is first)
                </p>
              </div>
            </div>

            {/* Task Materials Section */}
            <div>
              <TaskMaterialManager
                taskId={task?.id || 'temp-task'}
                materials={materials}
                onMaterialsChange={setMaterials}
              />
            </div>

            {/* Task Status */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                disabled={loading}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Task is active (visible to participants)
              </label>
            </div>

            {/* Task Stats */}
            {task.submissions && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Task Statistics</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total Submissions</p>
                    <p className="font-semibold">{task.submissions?.[0]?.count || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p className="font-semibold">
                      {new Date(task.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last Updated</p>
                    <p className="font-semibold">
                      {new Date(task.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
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
                disabled={loading || !formData.title.trim() || !formData.workshop_id}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                )}
                {loading ? 'Updating...' : 'Update Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}