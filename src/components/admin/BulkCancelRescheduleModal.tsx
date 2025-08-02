import React, { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { batchOperationsService } from '../../services/batchOperationsService'
import { workshopService } from '../../services/workshops'
import { useAuth } from '../../hooks/useAuth'
import {
  BulkCancelRescheduleRequest,
  BatchOperationType
} from '../../types/BatchOperationsTypes'
import BatchOperationProgress from './BatchOperationProgress'

interface BulkCancelRescheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const BulkCancelRescheduleModal: React.FC<BulkCancelRescheduleModalProps> = ({
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
  const [action, setAction] = useState<'cancel' | 'reschedule'>('cancel')
  const [rescheduleData, setRescheduleData] = useState<RescheduleData>({
    newStartTime: '',
    newEndTime: '',
    newLocation: '',
    newInstructor: '',
    newMaxParticipants: undefined
  })
  const [reason, setReason] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [notifyParticipants, setNotifyParticipants] = useState(true)
  const [refundParticipants, setRefundParticipants] = useState(false)

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
      
      const params: BulkCancelRescheduleParams = {
        operationType: 'bulk_cancel_reschedule' as const,
        workshopIds: selectedWorkshops,
        action,
        rescheduleData: action === 'reschedule' ? rescheduleData : undefined,
        reason: reason || undefined,
        refundParticipants,
        notifyParticipants,
        customMessage: customMessage || undefined
      }

      const opId = await batchOperationsService.createOperation(
        'bulk_cancel_reschedule',
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
      console.error('Failed to execute bulk cancel/reschedule:', error)
      alert('Failed to start operation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderSelectionStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Select Workshops</h3>
      
      {/* Action Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Action to Perform
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div
            className={`border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors ${
              action === 'cancel'
                ? 'border-red-400 bg-red-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => setAction('cancel')}
          >
            <div className="flex items-center justify-center">
              <XMarkIcon className="h-8 w-8 text-red-500 mb-2" />
            </div>
            <h4 className="font-medium text-gray-900 text-center">Cancel Workshops</h4>
            <p className="text-sm text-gray-600 text-center">
              Permanently cancel selected workshops
            </p>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors ${
              action === 'reschedule'
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => setAction('reschedule')}
          >
            <div className="flex items-center justify-center">
              <div className="text-3xl mb-2">📅</div>
            </div>
            <h4 className="font-medium text-gray-900 text-center">Reschedule Workshops</h4>
            <p className="text-sm text-gray-600 text-center">
              Change workshop dates and times
            </p>
          </div>
        </div>
      </div>

      {/* Workshop Selection */}
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
                {workshop.registrations?.length || 0} registered
              </p>
            </div>
          </div>
        ))}
      </div>

      {selectedWorkshops.length > 0 && (
        <div className={`border rounded-lg p-4 ${
          action === 'cancel' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
        }`}>
          <p className={`font-medium ${
            action === 'cancel' ? 'text-red-800' : 'text-blue-800'
          }`}>
            {selectedWorkshops.length} workshops selected for {action}
          </p>
        </div>
      )}
    </div>
  )

  const renderConfigurationStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">
        {action === 'cancel' ? 'Cancellation' : 'Reschedule'} Configuration
      </h3>
      
      {action === 'cancel' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Warning</h4>
              <p className="text-sm text-red-700 mt-1">
                This action will permanently cancel the selected workshops. Participants will be notified automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      {action === 'reschedule' && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">New Schedule Details</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Start Time
              </label>
              <input
                type="datetime-local"
                value={rescheduleData.newStartTime}
                onChange={(e) => setRescheduleData({ ...rescheduleData, newStartTime: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New End Time
              </label>
              <input
                type="datetime-local"
                value={rescheduleData.newEndTime}
                onChange={(e) => setRescheduleData({ ...rescheduleData, newEndTime: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Location (Optional)
            </label>
            <input
              type="text"
              value={rescheduleData.newLocation}
              onChange={(e) => setRescheduleData({ ...rescheduleData, newLocation: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Leave empty to keep current location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Max Participants (Optional)
            </label>
            <input
              type="number"
              value={rescheduleData.newMaxParticipants || ''}
              onChange={(e) => setRescheduleData({ 
                ...rescheduleData, 
                newMaxParticipants: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Leave empty to keep current limit"
              min="1"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reason for {action === 'cancel' ? 'Cancellation' : 'Reschedule'}
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={`Enter reason for ${action}`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Custom Message to Participants (Optional)
        </label>
        <textarea
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Additional message to include in notifications"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center">
          <input
            id="notify-participants"
            type="checkbox"
            checked={notifyParticipants}
            onChange={(e) => setNotifyParticipants(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="notify-participants" className="ml-2 text-sm text-gray-700">
            Notify participants via email
          </label>
        </div>

        {action === 'cancel' && (
          <div className="flex items-center">
            <input
              id="refund-participants"
              type="checkbox"
              checked={refundParticipants}
              onChange={(e) => setRefundParticipants(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="refund-participants" className="ml-2 text-sm text-gray-700">
              Process refunds for paid workshops
            </label>
          </div>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• {selectedWorkshops.length} workshops will be {action === 'cancel' ? 'cancelled' : 'rescheduled'}</p>
          {action === 'reschedule' && rescheduleData.newStartTime && (
            <p>• New start time: {new Date(rescheduleData.newStartTime).toLocaleString()}</p>
          )}
          {reason && <p>• Reason: {reason}</p>}
          {notifyParticipants && <p>• Participants will be notified</p>}
          {refundParticipants && action === 'cancel' && <p>• Refunds will be processed</p>}
        </div>
      </div>
    </div>
  )

  const renderExecutionStep = () => {
    if (!operationId) return null

    const progress = batchOperationsService.getOperationProgress(operationId)
    
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">
          {action === 'cancel' ? 'Cancelling' : 'Rescheduling'} Workshops
        </h3>
        
        {progress ? (
          <BatchOperationProgress progress={progress} showDetails={true} />
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">
              Initializing {action} operation...
            </span>
          </div>
        )}
      </div>
    )
  }

  const canProceedFromStep2 = action === 'cancel' || 
    (action === 'reschedule' && rescheduleData.newStartTime && rescheduleData.newEndTime)

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-4xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Bulk Cancel/Reschedule Workshops
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
                  disabled={loading || !canProceedFromStep2}
                  className={`px-4 py-2 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed ${
                    action === 'cancel' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading ? `${action === 'cancel' ? 'Cancelling' : 'Rescheduling'}...` : 
                    `${action === 'cancel' ? 'Cancel' : 'Reschedule'} Workshops`}
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

export default BulkCancelRescheduleModal