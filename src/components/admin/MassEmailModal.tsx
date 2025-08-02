import React, { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon, EnvelopeIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { batchOperationsService } from '../../services/batchOperationsService'
import { workshopService } from '../../services/workshops'
import { useAuth } from '../../hooks/useAuth'
import {
  MassEmailRequest,
  EmailRecipientFilter,
  EmailRecipient
} from '../../types/BatchOperationsTypes'
import BatchOperationProgress from './BatchOperationProgress'

interface MassEmailModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const MassEmailModal: React.FC<MassEmailModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth()
  const [step, setStep] = useState(1) // 1: Recipients, 2: Email Content, 3: Review & Send, 4: Execution
  const [loading, setLoading] = useState(false)
  const [operationId, setOperationId] = useState<string | null>(null)
  
  // Data
  const [workshops, setWorkshops] = useState<any[]>([])
  const [previewParticipants, setPreviewParticipants] = useState<any[]>([])
  const [participantCount, setParticipantCount] = useState(0)
  
  // Recipients Configuration
  const [criteria, setCriteria] = useState<EmailRecipientFilter>({
    type: 'all',
    workshopIds: [],
    userIds: []
  })
  
  // Email Configuration
  const [emailConfig, setEmailConfig] = useState({
    templateType: 'custom',
    subject: '',
    customContent: '',
    variables: {},
    attachments: []
  })
  
  const [selectedWorkshops, setSelectedWorkshops] = useState<string[]>([])
  const [selectedFaculties, setSelectedFaculties] = useState<string[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })

  // Email Templates
  const emailTemplates = [
    {
      id: 'custom',
      name: 'Custom Email',
      description: 'Create a custom email message'
    },
    {
      id: 'workshop_reminder',
      name: 'Workshop Reminder',
      description: 'Remind participants about upcoming workshops',
      defaultSubject: 'Workshop Reminder: {{workshop.title}}'
    },
    {
      id: 'workshop_update',
      name: 'Workshop Update',
      description: 'Notify about workshop changes',
      defaultSubject: 'Workshop Update: {{workshop.title}}'
    },
    {
      id: 'general_announcement',
      name: 'General Announcement',
      description: 'Send general announcements to participants',
      defaultSubject: 'Important Announcement'
    }
  ]

  const faculties = [
    'Engineering', 'Medicine', 'Science', 'Business', 'Arts', 'Education'
  ]

  const departments = [
    'Computer Science', 'Electrical Engineering', 'Mechanical Engineering',
    'Biology', 'Chemistry', 'Physics', 'Mathematics', 'Economics', 'Marketing'
  ]

  useEffect(() => {
    if (isOpen) {
      loadWorkshops()
    }
  }, [isOpen])

  useEffect(() => {
    updateCriteria()
  }, [selectedWorkshops, selectedFaculties, selectedDepartments, dateRange])

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

  const updateCriteria = () => {
    const newCriteria: ParticipantCriteria = {
      workshopIds: selectedWorkshops.length > 0 ? selectedWorkshops : undefined,
      faculties: selectedFaculties.length > 0 ? selectedFaculties : undefined,
      departments: selectedDepartments.length > 0 ? selectedDepartments : undefined,
      registrationDateRange: dateRange.startDate && dateRange.endDate ? {
        startDate: new Date(dateRange.startDate),
        endDate: new Date(dateRange.endDate)
      } : undefined,
      includeInactive: false
    }
    
    setCriteria(newCriteria)
  }

  const previewRecipients = async () => {
    try {
      setLoading(true)
      // This would call the service to get participant count and preview
      // For now, we'll simulate the response
      const participants = await getParticipantsByCriteria(criteria)
      setPreviewParticipants(participants.slice(0, 10)) // Show first 10 for preview
      setParticipantCount(participants.length)
    } catch (error) {
      console.error('Failed to preview recipients:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mock function - in real implementation, this would be in the service
  const getParticipantsByCriteria = async (criteria: ParticipantCriteria) => {
    // Mock data for demonstration
    return Array.from({ length: Math.floor(Math.random() * 100) + 10 }, (_, i) => ({
      id: `user_${i}`,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      faculty: faculties[Math.floor(Math.random() * faculties.length)],
      department: departments[Math.floor(Math.random() * departments.length)]
    }))
  }

  const handleTemplateChange = (templateId: string) => {
    const template = emailTemplates.find(t => t.id === templateId)
    setEmailConfig({
      ...emailConfig,
      templateType: templateId,
      subject: template?.defaultSubject || '',
      customContent: templateId === 'custom' ? emailConfig.customContent : ''
    })
  }

  const handleSendEmail = async () => {
    try {
      setLoading(true)
      
      const params: MassEmailParticipantsParams = {
        operationType: 'mass_email_participants' as const,
        recipientCriteria: criteria,
        emailTemplate: emailConfig,
        trackOpens: true,
        trackClicks: true
      }

      const opId = await batchOperationsService.createOperation(
        'mass_email_participants',
        params,
        user?.id || ''
      )

      setOperationId(opId)
      setStep(4)

      // Execute the operation
      await batchOperationsService.executeOperation(opId)
      
      // Operation completed successfully
      setTimeout(() => {
        onSuccess()
      }, 2000)

    } catch (error) {
      console.error('Failed to send mass email:', error)
      alert('Failed to start mass email operation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderRecipientsStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Select Recipients</h3>
      
      {/* Workshop Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Workshops
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
          {workshops.map((workshop) => (
            <div key={workshop.id} className="flex items-center">
              <input
                id={`workshop-${workshop.id}`}
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
              <label htmlFor={`workshop-${workshop.id}`} className="ml-2 text-sm text-gray-700">
                {workshop.title}
              </label>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Leave empty to include all workshops
        </p>
      </div>

      {/* Faculty Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Faculty
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {faculties.map((faculty) => (
            <div key={faculty} className="flex items-center">
              <input
                id={`faculty-${faculty}`}
                type="checkbox"
                checked={selectedFaculties.includes(faculty)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFaculties([...selectedFaculties, faculty])
                  } else {
                    setSelectedFaculties(selectedFaculties.filter(f => f !== faculty))
                  }
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor={`faculty-${faculty}`} className="ml-2 text-sm text-gray-700">
                {faculty}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Department Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Department
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {departments.map((department) => (
            <div key={department} className="flex items-center">
              <input
                id={`dept-${department}`}
                type="checkbox"
                checked={selectedDepartments.includes(department)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedDepartments([...selectedDepartments, department])
                  } else {
                    setSelectedDepartments(selectedDepartments.filter(d => d !== department))
                  }
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor={`dept-${department}`} className="ml-2 text-sm text-gray-700">
                {department}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Registration Date Range (Optional)
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Preview Button */}
      <div className="flex justify-center">
        <button
          onClick={previewRecipients}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <UserGroupIcon className="h-4 w-4 mr-2" />
          {loading ? 'Loading...' : 'Preview Recipients'}
        </button>
      </div>

      {/* Recipient Count */}
      {participantCount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <UserGroupIcon className="h-5 w-5 text-green-600 mr-2" />
            <span className="font-medium text-green-800">
              {participantCount} recipients found
            </span>
          </div>
          
          {previewParticipants.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-green-800 mb-2">Preview (first 10):</p>
              <div className="space-y-1">
                {previewParticipants.map((participant) => (
                  <div key={participant.id} className="text-sm text-green-700">
                    {participant.name} ({participant.email}) - {participant.faculty}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderEmailContentStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Email Content</h3>
      
      {/* Template Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Template
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {emailTemplates.map((template) => (
            <div
              key={template.id}
              className={`border-2 border-dashed rounded-lg p-3 cursor-pointer transition-colors ${
                emailConfig.templateType === template.id
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => handleTemplateChange(template.id)}
            >
              <h4 className="font-medium text-gray-900">{template.name}</h4>
              <p className="text-sm text-gray-600 whitespace-pre-line">{template.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Subject Line */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subject Line *
        </label>
        <input
          type="text"
          value={emailConfig.subject}
          onChange={(e) => setEmailConfig({ ...emailConfig, subject: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter email subject"
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          You can use variables like {'{{user.name}}'} and {'{{workshop.title}}'}
        </p>
      </div>

      {/* Custom Content */}
      {emailConfig.templateType === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Content *
          </label>
          <textarea
            value={emailConfig.customContent}
            onChange={(e) => setEmailConfig({ ...emailConfig, customContent: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={8}
            placeholder="Enter your email content here..."
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Support for HTML formatting and variables like {'{{user.name}}'}, {'{{workshop.title}}'}, etc.
          </p>
        </div>
      )}

      {/* Variables */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Available Variables</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <div className="text-gray-600">{'{{user.name}}'}</div>
          <div className="text-gray-600">{'{{user.email}}'}</div>
          <div className="text-gray-600">{'{{user.faculty}}'}</div>
          <div className="text-gray-600">{'{{user.department}}'}</div>
          <div className="text-gray-600">{'{{workshop.title}}'}</div>
          <div className="text-gray-600">{'{{workshop.date}}'}</div>
        </div>
      </div>
    </div>
  )

  const renderReviewStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Review & Send</h3>
      
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
        <div>
          <h4 className="font-medium text-gray-900">Recipients</h4>
          <p className="text-sm text-gray-600">{participantCount} participants will receive this email</p>
          
          <div className="mt-2 text-sm text-gray-600">
            <p>Filters applied:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              {selectedWorkshops.length > 0 && (
                <li>Workshops: {selectedWorkshops.length} selected</li>
              )}
              {selectedFaculties.length > 0 && (
                <li>Faculties: {selectedFaculties.join(', ')}</li>
              )}
              {selectedDepartments.length > 0 && (
                <li>Departments: {selectedDepartments.join(', ')}</li>
              )}
              {dateRange.startDate && dateRange.endDate && (
                <li>Registration date: {dateRange.startDate} to {dateRange.endDate}</li>
              )}
            </ul>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900">Email Details</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p><span className="font-medium">Template:</span> {emailTemplates.find(t => t.id === emailConfig.templateType)?.name}</p>
            <p><span className="font-medium">Subject:</span> {emailConfig.subject}</p>
            {emailConfig.templateType === 'custom' && (
              <p><span className="font-medium">Content length:</span> {emailConfig.customContent?.length || 0} characters</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <EnvelopeIcon className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-yellow-800">Before you send</h4>
            <div className="text-sm text-yellow-700 mt-1">
              <ul className="list-disc list-inside space-y-1">
                <li>Double-check your recipient filters to ensure you're sending to the right people</li>
                <li>Review your email content for typos and formatting</li>
                <li>This action cannot be undone once started</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderExecutionStep = () => {
    if (!operationId) return null

    const progress = batchOperationsService.getOperationProgress(operationId)
    
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Sending Emails</h3>
        
        {progress ? (
          <BatchOperationProgress progress={progress} showDetails={true} />
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">Initializing email sending...</span>
          </div>
        )}
      </div>
    )
  }

  const canProceedFromStep1 = participantCount > 0
  const canProceedFromStep2 = emailConfig.subject && (emailConfig.templateType !== 'custom' || emailConfig.customContent)

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-4xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Mass Email Participants
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
                {[1, 2, 3, 4].map((stepNumber) => (
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
            {step === 1 && renderRecipientsStep()}
            {step === 2 && renderEmailContentStep()}
            {step === 3 && renderReviewStep()}
            {step === 4 && renderExecutionStep()}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <div>
              <span className="text-sm text-gray-500">
                Step {step} of 4
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              {step > 1 && step < 4 && (
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
                  disabled={!canProceedFromStep1}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              )}
              
              {step === 2 && (
                <button
                  onClick={() => setStep(3)}
                  disabled={!canProceedFromStep2}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Review
                </button>
              )}
              
              {step === 3 && (
                <button
                  onClick={handleSendEmail}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Emails'}
                </button>
              )}
              
              {step === 4 && (
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

export default MassEmailModal