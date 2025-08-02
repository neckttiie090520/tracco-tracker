import React, { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { batchOperationsService } from '../../services/batchOperationsService'
import { workshopService } from '../../services/workshops'
import { useAuth } from '../../hooks/useAuth'
import {
  BatchUpdateWorkshopsRequest,
  BatchOperationType,
  BatchUpdateCondition
} from '../../types/BatchOperationsTypes'
import BatchOperationProgress from './BatchOperationProgress'

interface BatchUpdateWorkshopsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const BatchUpdateWorkshopsModal: React.FC<BatchUpdateWorkshopsModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [operationId, setOperationId] = useState<string | null>(null)
  
  const [workshops, setWorkshops] = useState<any[]>([])
  const [selectedWorkshops, setSelectedWorkshops] = useState<string[]>([])
  const [updates, setUpdates] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    max_participants: '',
    is_active: true
  })
  const [conditions, setConditions] = useState<WorkshopUpdateCondition[]>([])
  const [notifyParticipants, setNotifyParticipants] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadWorkshops()
    }
  }, [isOpen])

  const loadWorkshops = async () => {
    try {
      setLoading(true)
      const workshopsData = await workshopService.getWorkshops()
      setWorkshops(workshopsData)
    } catch (error) {
      console.error('Failed to load workshops:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = async () => {
    try {
      setLoading(true)
      
      // Filter out empty updates
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key, value]) => {
          if (key === 'is_active') return true
          return value !== '' && value !== null && value !== undefined
        })
      )

      const params: BatchUpdateWorkshopsParams = {
        operationType: 'batch_update_workshops' as const,
        workshopIds: selectedWorkshops,
        updates: filteredUpdates,
        updateConditions: conditions.length > 0 ? conditions : undefined,
        notifyParticipants,
        cascadeToTasks: false
      }

      const opId = await batchOperationsService.createOperation(
        'batch_update_workshops',
        params,
        user?.id || ''
      )

      setOperationId(opId)
      setStep(3)

      await batchOperationsService.executeOperation(opId)
      
      setTimeout(() => {
        onSuccess()
      }, 2000)

    } catch (error) {
      console.error('Failed to execute batch update:', error)
      alert('Failed to start batch update operation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderSelectionStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Select Workshops to Update</h3>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={selectedWorkshops.length === workshops.length}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedWorkshops(workshops.map(w => w.id))
              } else {
                setSelectedWorkshops([])
              }
            }}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 text-sm font-medium text-gray-700">
            Select All ({workshops.length})
          </label>
        </div>
        
        {workshops.map((workshop) => (
          <div key={workshop.id} className="flex items-center p-3 border border-gray-200 rounded-lg">
            <input
              type="checkbox"
              checked={selectedWorkshops.includes(workshop.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedWorkshops([...selectedWorkshops, workshop.id])
                } else {
                  setSelectedWorkshops(selectedWorkshops.filter(id => id !== workshop.id))
                }
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div className="ml-3 flex-1">
              <h4 className="font-medium text-gray-900">{workshop.title}</h4>
              <p className="text-sm text-gray-600">
                {workshop.start_time && new Date(workshop.start_time).toLocaleDateString()} • 
                Max {workshop.max_participants} participants
              </p>
            </div>
          </div>
        ))}
      </div>

      {selectedWorkshops.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-medium">
            {selectedWorkshops.length} workshops selected for update
          </p>
        </div>
      )}
    </div>
  )

  const renderConfigurationStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Configure Updates</h3>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          Only fill in the fields you want to update. Empty fields will not be changed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={updates.title}
            onChange={(e) => setUpdates({ ...updates, title: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Leave empty to keep current title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Participants
          </label>
          <input
            type="number"
            value={updates.max_participants}
            onChange={(e) => setUpdates({ ...updates, max_participants: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Leave empty to keep current limit"
            min="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Time
          </label>
          <input
            type="datetime-local"
            value={updates.start_time}
            onChange={(e) => setUpdates({ ...updates, start_time: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Time
          </label>
          <input
            type="datetime-local"
            value={updates.end_time}
            onChange={(e) => setUpdates({ ...updates, end_time: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={updates.description}
          onChange={(e) => setUpdates({ ...updates, description: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Leave empty to keep current description"
        />
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center">
          <input
            id="is-active"
            type="checkbox"
            checked={updates.is_active}
            onChange={(e) => setUpdates({ ...updates, is_active: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is-active" className="ml-2 text-sm text-gray-700">
            Workshop is active
          </label>
        </div>

        <div className="flex items-center">
          <input
            id="notify-participants"
            type="checkbox"
            checked={notifyParticipants}
            onChange={(e) => setNotifyParticipants(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="notify-participants" className="ml-2 text-sm text-gray-700">
            Notify participants of changes
          </label>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• {selectedWorkshops.length} workshops will be updated</p>
          <p>• Fields to update: {Object.entries(updates).filter(([key, value]) => {
            if (key === 'is_active') return true
            return value !== '' && value !== null && value !== undefined
          }).map(([key]) => key.replace('_', ' ')).join(', ') || 'None'}</p>
          {notifyParticipants && <p>• Participants will be notified via email</p>}
        </div>
      </div>
    </div>
  )

  const renderExecutionStep = () => {
    if (!operationId) return null

    const progress = batchOperationsService.getOperationProgress(operationId)
    
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Updating Workshops</h3>
        
        {progress ? (
          <BatchOperationProgress progress={progress} showDetails={true} />
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">Initializing update operation...</span>
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
              Batch Update Workshops
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
            {step === 1 && renderSelectionStep()}
            {step === 2 && renderConfigurationStep()}
            {step === 3 && renderExecutionStep()}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <div>
              <span className="text-sm text-gray-500">
                Step {step} of 3
              </span>
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
                  disabled={selectedWorkshops.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              )}
              
              {step === 2 && (
                <button
                  onClick={handleExecute}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Workshops'}
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

export default BatchUpdateWorkshopsModal