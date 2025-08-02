import React, { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { batchOperationsService } from '../../services/batchOperationsService'
import { adminService } from '../../services/admin'
import { useAuth } from '../../hooks/useAuth'
import {
  BulkCreateWorkshopsRequest,
  BatchOperationType,
  WorkshopTemplate,
  TaskTemplate
} from '../../types/BatchOperationsTypes'
import BatchOperationProgress from './BatchOperationProgress'

interface BulkCreateWorkshopsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const BulkCreateWorkshopsModal: React.FC<BulkCreateWorkshopsModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth()
  const [step, setStep] = useState(1) // 1: Template Selection, 2: Configuration, 3: Execution
  const [loading, setLoading] = useState(false)
  const [operationId, setOperationId] = useState<string | null>(null)
  
  // Template data
  const [templateCategories, setTemplateCategories] = useState<WorkshopTemplateCategory[]>([])
  const [selectedTemplates, setSelectedTemplates] = useState<WorkshopTemplate[]>([])
  const [customTemplate, setCustomTemplate] = useState<WorkshopTemplate>({
    id: '',
    name: '',
    title: '',
    description: '',
    duration: 120,
    maxParticipants: 30,
    defaultTasks: []
  })
  
  // Configuration
  const [instructorId, setInstructorId] = useState('')
  const [instructors, setInstructors] = useState<any[]>([])
  const [defaultValues, setDefaultValues] = useState({
    start_time: '',
    end_time: '',
    is_active: true
  })
  const [createTasks, setCreateTasks] = useState(false)
  const [notifyInstructors, setNotifyInstructors] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadInitialData()
    }
  }, [isOpen])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [categories, instructorsData] = await Promise.all([
        batchOperationsService.getWorkshopTemplates(),
        loadInstructors()
      ])
      
      setTemplateCategories(categories)
      setInstructors(instructorsData)
    } catch (error) {
      console.error('Failed to load initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadInstructors = async () => {
    // This would fetch instructors from your user service
    // For now, returning mock data
    return [
      { id: user?.id || '', name: user?.name || 'Current User', email: user?.email || '' }
    ]
  }

  const addCustomTemplate = () => {
    if (!customTemplate.name || !customTemplate.title) return
    
    const template: WorkshopTemplate = {
      ...customTemplate,
      id: `custom_${Date.now()}`
    }
    
    setSelectedTemplates([...selectedTemplates, template])
    setCustomTemplate({
      id: '',
      name: '',
      title: '',
      description: '',
      duration: 120,
      maxParticipants: 30,
      defaultTasks: []
    })
  }

  const removeTemplate = (templateId: string) => {
    setSelectedTemplates(selectedTemplates.filter(t => t.id !== templateId))
  }

  const addTaskToCustomTemplate = () => {
    const newTask: TaskTemplate = {
      title: '',
      description: '',
      orderIndex: customTemplate.defaultTasks?.length || 0,
      dueOffsetDays: 7
    }
    
    setCustomTemplate({
      ...customTemplate,
      defaultTasks: [...(customTemplate.defaultTasks || []), newTask]
    })
  }

  const updateTaskInCustomTemplate = (index: number, task: Partial<TaskTemplate>) => {
    const updatedTasks = [...(customTemplate.defaultTasks || [])]
    updatedTasks[index] = { ...updatedTasks[index], ...task }
    
    setCustomTemplate({
      ...customTemplate,
      defaultTasks: updatedTasks
    })
  }

  const removeTaskFromCustomTemplate = (index: number) => {
    const updatedTasks = [...(customTemplate.defaultTasks || [])]
    updatedTasks.splice(index, 1)
    
    setCustomTemplate({
      ...customTemplate,
      defaultTasks: updatedTasks
    })
  }

  const handleExecute = async () => {
    if (!instructorId || selectedTemplates.length === 0) return

    try {
      setLoading(true)
      
      const params: BulkCreateWorkshopsParams = {
        operationType: 'bulk_create_workshops' as BatchOperationType,
        templates: selectedTemplates,
        instructorId,
        defaultValues,
        notifyInstructors,
        createTasks,
        taskTemplates: createTasks ? selectedTemplates.flatMap(t => t.defaultTasks || []) : undefined
      }

      const opId = await batchOperationsService.createOperation(
        'bulk_create_workshops' as BatchOperationType,
        params,
        user?.id || ''
      )

      setOperationId(opId)
      setStep(3)

      // Execute the operation
      await batchOperationsService.executeOperation(opId)
      
      // Operation completed successfully
      setTimeout(() => {
        onSuccess()
      }, 2000)

    } catch (error) {
      console.error('Failed to execute bulk create:', error)
      alert('Failed to start bulk create operation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderTemplateSelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Workshop Templates</h3>
        
        {/* Predefined Templates */}
        {templateCategories.length > 0 && (
          <div className="space-y-4">
            {templateCategories.map((category) => (
              <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">{category.name}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {category.templates.map((template) => (
                    <div
                      key={template.id}
                      className={`border-2 border-dashed rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedTemplates.some(t => t.id === template.id)
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => {
                        if (selectedTemplates.some(t => t.id === template.id)) {
                          removeTemplate(template.id)
                        } else {
                          setSelectedTemplates([...selectedTemplates, template])
                        }
                      }}
                    >
                      <h5 className="font-medium text-gray-900">{template.name}</h5>
                      <p className="text-sm text-gray-600">{template.title}</p>
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>{template.duration} min</span>
                        <span>Max {template.maxParticipants}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Custom Template Creator */}
        <div className="border border-gray-200 rounded-lg p-4 mt-6">
          <h4 className="font-medium text-gray-900 mb-4">Create Custom Template</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={customTemplate.name}
                onChange={(e) => setCustomTemplate({ ...customTemplate, name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., React Workshop"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workshop Title
              </label>
              <input
                type="text"
                value={customTemplate.title}
                onChange={(e) => setCustomTemplate({ ...customTemplate, title: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Introduction to React Development"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={customTemplate.duration}
                onChange={(e) => setCustomTemplate({ ...customTemplate, duration: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="30"
                max="480"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Participants
              </label>
              <input
                type="number"
                value={customTemplate.maxParticipants}
                onChange={(e) => setCustomTemplate({ ...customTemplate, maxParticipants: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="200"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={customTemplate.description}
              onChange={(e) => setCustomTemplate({ ...customTemplate, description: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Workshop description..."
            />
          </div>

          {/* Default Tasks */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Default Tasks
              </label>
              <button
                type="button"
                onClick={addTaskToCustomTemplate}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Add Task
              </button>
            </div>
            
            {customTemplate.defaultTasks?.map((task, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={task.title}
                  onChange={(e) => updateTaskInCustomTemplate(index, { title: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Task title"
                />
                <input
                  type="number"
                  value={task.dueOffsetDays}
                  onChange={(e) => updateTaskInCustomTemplate(index, { dueOffsetDays: parseInt(e.target.value) || 0 })}
                  className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Days"
                  min="0"
                />
                <button
                  type="button"
                  onClick={() => removeTaskFromCustomTemplate(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addCustomTemplate}
            disabled={!customTemplate.name || !customTemplate.title}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add Custom Template
          </button>
        </div>

        {/* Selected Templates */}
        {selectedTemplates.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-2">Selected Templates ({selectedTemplates.length})</h4>
            <div className="space-y-2">
              {selectedTemplates.map((template) => (
                <div key={template.id} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div>
                    <span className="font-medium text-gray-900">{template.name}</span>
                    <span className="text-sm text-gray-600 ml-2">({template.title})</span>
                  </div>
                  <button
                    onClick={() => removeTemplate(template.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderConfiguration = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Configuration</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Instructor *
          </label>
          <select
            value={instructorId}
            onChange={(e) => setInstructorId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Instructor</option>
            {instructors.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.name} ({instructor.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Start Time
          </label>
          <input
            type="datetime-local"
            value={defaultValues.start_time}
            onChange={(e) => setDefaultValues({ ...defaultValues, start_time: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center">
          <input
            id="create-tasks"
            type="checkbox"
            checked={createTasks}
            onChange={(e) => setCreateTasks(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="create-tasks" className="ml-2 text-sm text-gray-700">
            Create default tasks for workshops
          </label>
        </div>

        <div className="flex items-center">
          <input
            id="notify-instructors"
            type="checkbox"
            checked={notifyInstructors}
            onChange={(e) => setNotifyInstructors(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="notify-instructors" className="ml-2 text-sm text-gray-700">
            Notify instructors about new workshops
          </label>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• {selectedTemplates.length} workshops will be created</p>
          <p>• Instructor: {instructors.find(i => i.id === instructorId)?.name || 'Not selected'}</p>
          {createTasks && <p>• Default tasks will be created for each workshop</p>}
          {notifyInstructors && <p>• Instructors will be notified via email</p>}
        </div>
      </div>
    </div>
  )

  const renderExecution = () => {
    if (!operationId) return null

    const progress = batchOperationsService.getOperationProgress(operationId)
    
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Creating Workshops</h3>
        
        {progress ? (
          <BatchOperationProgress progress={progress} showDetails={true} />
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">Initializing operation...</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-4xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Bulk Create Workshops
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-4">
                {[1, 2, 3].map((stepNumber) => (
                  <div
                    key={stepNumber}
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      step >= stepNumber
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {stepNumber}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            {step === 1 && renderTemplateSelection()}
            {step === 2 && renderConfiguration()}
            {step === 3 && renderExecution()}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <div>
              {step === 1 && (
                <span className="text-sm text-gray-500">
                  Step 1 of 3: Select templates
                </span>
              )}
              {step === 2 && (
                <span className="text-sm text-gray-500">
                  Step 2 of 3: Configure settings
                </span>
              )}
              {step === 3 && (
                <span className="text-sm text-gray-500">
                  Step 3 of 3: Execution
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {step > 1 && step < 3 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
              )}
              
              {step === 1 && (
                <button
                  onClick={() => setStep(2)}
                  disabled={selectedTemplates.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              )}
              
              {step === 2 && (
                <button
                  onClick={handleExecute}
                  disabled={!instructorId || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Workshops'}
                </button>
              )}
              
              {step === 3 && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

export default BulkCreateWorkshopsModal