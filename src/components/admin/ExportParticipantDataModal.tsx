import React, { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { batchOperationsService } from '../../services/batchOperationsService'
import { workshopService } from '../../services/workshops'
import { useAuth } from '../../hooks/useAuth'
import {
  ExportParticipantDataRequest,
  BatchOperationType,
  ExportField
} from '../../types/BatchOperationsTypes'
import BatchOperationProgress from './BatchOperationProgress'

interface ExportParticipantDataModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const ExportParticipantDataModal: React.FC<ExportParticipantDataModalProps> = ({
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
  const [selectedFaculties, setSelectedFaculties] = useState<string[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'json'>('csv')
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [groupBy, setGroupBy] = useState<'workshop' | 'department' | 'faculty' | undefined>(undefined)
  const [includeSubmissions, setIncludeSubmissions] = useState(false)
  const [includeTaskProgress, setIncludeTaskProgress] = useState(false)

  const availableFields: ExportField[] = [
    { field: 'user.name', displayName: 'Name', includeInSummary: true },
    { field: 'user.email', displayName: 'Email', includeInSummary: true },
    { field: 'user.faculty', displayName: 'Faculty', includeInSummary: false },
    { field: 'user.department', displayName: 'Department', includeInSummary: false },
    { field: 'workshop.title', displayName: 'Workshop Title', includeInSummary: true },
    { field: 'workshop.start_time', displayName: 'Workshop Date', format: 'date', includeInSummary: false },
    { field: 'registered_at', displayName: 'Registration Date', format: 'date', includeInSummary: false },
    { field: 'workshop.instructor.name', displayName: 'Instructor', includeInSummary: false },
    { field: 'workshop.max_participants', displayName: 'Workshop Capacity', includeInSummary: false }
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
      // Set default fields
      setSelectedFields(['user.name', 'user.email', 'workshop.title', 'registered_at'])
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

  const handleExport = async () => {
    try {
      setLoading(true)
      
      const criteria: ParticipantCriteria = {
        workshopIds: selectedWorkshops.length > 0 ? selectedWorkshops : undefined,
        faculties: selectedFaculties.length > 0 ? selectedFaculties : undefined,
        departments: selectedDepartments.length > 0 ? selectedDepartments : undefined,
        registrationDateRange: dateRange.startDate && dateRange.endDate ? {
          startDate: new Date(dateRange.startDate),
          endDate: new Date(dateRange.endDate)
        } : undefined,
        includeInactive: false
      }

      const includeFields = availableFields.filter(field => 
        selectedFields.includes(field.field)
      )

      const params: ExportParticipantDataParams = {
        operationType: 'export_participant_data' as const,
        exportCriteria: criteria,
        exportFormat,
        includeFields,
        groupBy,
        includeSubmissions,
        includeTaskProgress
      }

      const opId = await batchOperationsService.createOperation(
        'export_participant_data',
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
      console.error('Failed to start export:', error)
      alert('Failed to start export operation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderFiltersStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Export Filters</h3>
      
      {/* Workshop Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Workshops (Optional)
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
          <div className="col-span-full mb-2">
            <div className="flex items-center">
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
                Select All
              </label>
            </div>
          </div>
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
              <label htmlFor={`workshop-${workshop.id}`} className="ml-2 text-xs text-gray-700">
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
          Filter by Faculty (Optional)
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
          Filter by Department (Optional)
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
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderOptionsStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Export Options</h3>
      
      {/* Format Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Export Format
        </label>
        <div className="grid grid-cols-3 gap-4">
          {(['csv', 'excel', 'json'] as const).map((format) => (
            <div
              key={format}
              className={`border-2 border-dashed rounded-lg p-3 cursor-pointer transition-colors ${
                exportFormat === format
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => setExportFormat(format)}
            >
              <div className="text-center">
                <DocumentArrowDownIcon className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                <h4 className="font-medium text-gray-900 uppercase">{format}</h4>
                <p className="text-xs text-gray-600">
                  {format === 'csv' && 'Comma-separated values'}
                  {format === 'excel' && 'Excel spreadsheet'}
                  {format === 'json' && 'JSON data format'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Field Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fields to Include
        </label>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
          {availableFields.map((field) => (
            <div key={field.field} className="flex items-center">
              <input
                id={`field-${field.field}`}
                type="checkbox"
                checked={selectedFields.includes(field.field)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFields([...selectedFields, field.field])
                  } else {
                    setSelectedFields(selectedFields.filter(f => f !== field.field))
                  }
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor={`field-${field.field}`} className="ml-2 text-sm text-gray-700">
                {field.displayName}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Group By */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Group Results By (Optional)
        </label>
        <select
          value={groupBy || ''}
          onChange={(e) => setGroupBy(e.target.value as any || undefined)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">No Grouping</option>
          <option value="workshop">Workshop</option>
          <option value="faculty">Faculty</option>
          <option value="department">Department</option>
        </select>
      </div>

      {/* Additional Options */}
      <div className="space-y-3">
        <div className="flex items-center">
          <input
            id="include-submissions"
            type="checkbox"
            checked={includeSubmissions}
            onChange={(e) => setIncludeSubmissions(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="include-submissions" className="ml-2 text-sm text-gray-700">
            Include submission data
          </label>
        </div>

        <div className="flex items-center">
          <input
            id="include-task-progress"
            type="checkbox"
            checked={includeTaskProgress}
            onChange={(e) => setIncludeTaskProgress(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="include-task-progress" className="ml-2 text-sm text-gray-700">
            Include task progress
          </label>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Export Preview</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• Format: {exportFormat.toUpperCase()}</p>
          <p>• Fields: {selectedFields.length} selected</p>
          {selectedWorkshops.length > 0 && <p>• Workshops: {selectedWorkshops.length} selected</p>}
          {selectedFaculties.length > 0 && <p>• Faculties: {selectedFaculties.join(', ')}</p>}
          {selectedDepartments.length > 0 && <p>• Departments: {selectedDepartments.join(', ')}</p>}
          {groupBy && <p>• Grouped by: {groupBy}</p>}
          {includeSubmissions && <p>• Including submission data</p>}
          {includeTaskProgress && <p>• Including task progress</p>}
        </div>
      </div>
    </div>
  )

  const renderExecutionStep = () => {
    if (!operationId) return null

    const progress = batchOperationsService.getOperationProgress(operationId)
    
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Exporting Data</h3>
        
        {progress ? (
          <BatchOperationProgress progress={progress} showDetails={true} />
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">Preparing export...</span>
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
              Export Participant Data
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
            {step === 1 && renderFiltersStep()}
            {step === 2 && renderOptionsStep()}
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Next
                </button>
              )}
              
              {step === 2 && (
                <button
                  onClick={handleExport}
                  disabled={loading || selectedFields.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Exporting...' : 'Start Export'}
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

export default ExportParticipantDataModal