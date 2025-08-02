import React, { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon, DocumentArrowUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { batchOperationsService } from '../../services/batchOperationsService'
import { useAuth } from '../../hooks/useAuth'
import {
  ImportWorkshopDataRequest,
  BatchOperationType,
  FieldMapping,
  ImportOptions
} from '../../types/BatchOperationsTypes'
import BatchOperationProgress from './BatchOperationProgress'

interface ImportWorkshopDataModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const ImportWorkshopDataModal: React.FC<ImportWorkshopDataModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [operationId, setOperationId] = useState<string | null>(null)
  
  const [file, setFile] = useState<File | null>(null)
  const [fileData, setFileData] = useState<string | ArrayBuffer | null>(null)
  const [fileFormat, setFileFormat] = useState<'csv' | 'excel'>('csv')
  const [previewData, setPreviewData] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  
  const [mappingConfig, setMappingConfig] = useState<FieldMappingConfig>({
    mappings: [],
    headerRowIndex: 0,
    dataStartRowIndex: 1
  })
  
  const [importMode, setImportMode] = useState<'create_only' | 'update_only' | 'create_or_update'>('create_only')
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'overwrite' | 'create_new'>('skip')
  const [createMissingInstructors, setCreateMissingInstructors] = useState(false)

  const workshopFields = [
    { key: 'title', label: 'Title', required: true },
    { key: 'description', label: 'Description', required: false },
    { key: 'instructor', label: 'Instructor ID/Email', required: true },
    { key: 'start_time', label: 'Start Time', required: false },
    { key: 'end_time', label: 'End Time', required: false },
    { key: 'max_participants', label: 'Max Participants', required: false },
    { key: 'google_doc_url', label: 'Google Doc URL', required: false },
    { key: 'is_active', label: 'Active Status', required: false }
  ]

  const validationRules: ValidationRule[] = [
    {
      field: 'title',
      rule: 'required',
      errorMessage: 'Title is required'
    },
    {
      field: 'title',
      rule: 'min_length',
      parameters: 3,
      errorMessage: 'Title must be at least 3 characters'
    },
    {
      field: 'instructor',
      rule: 'required',
      errorMessage: 'Instructor is required'
    },
    {
      field: 'max_participants',
      rule: 'number',
      errorMessage: 'Max participants must be a number'
    }
  ]

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    
    // Determine format from file extension
    const extension = uploadedFile.name.split('.').pop()?.toLowerCase()
    if (extension === 'xlsx' || extension === 'xls') {
      setFileFormat('excel')
    } else {
      setFileFormat('csv')
    }

    // Read file
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result
      if (data) {
        setFileData(data)
        parseFilePreview(data, extension === 'xlsx' || extension === 'xls' ? 'excel' : 'csv')
      }
    }
    
    if (extension === 'xlsx' || extension === 'xls') {
      reader.readAsArrayBuffer(uploadedFile)
    } else {
      reader.readAsText(uploadedFile)
    }
  }

  const parseFilePreview = (data: string | ArrayBuffer, format: 'csv' | 'excel') => {
    // This is a simplified preview parser
    // In a real implementation, you'd use libraries like xlsx or csv-parser
    
    if (format === 'csv' && typeof data === 'string') {
      const lines = data.split('\n').slice(0, 6) // First 6 lines for preview
      const parsedData = lines.map(line => 
        line.split(',').map(cell => cell.replace(/^"|"$/g, '').trim())
      )
      
      if (parsedData.length > 0) {
        setHeaders(parsedData[0])
        setPreviewData(parsedData.slice(1))
        
        // Initialize mappings
        const initialMappings: FieldMapping[] = workshopFields.map(field => ({
          sourceField: '',
          targetField: field.key as any,
          required: field.required,
          transformation: undefined,
          defaultValue: undefined
        }))
        
        setMappingConfig({
          ...mappingConfig,
          mappings: initialMappings
        })
      }
    } else {
      // For Excel files, you'd use a library like xlsx to parse
      // For now, show a placeholder
      setHeaders(['Column A', 'Column B', 'Column C', 'Column D'])
      setPreviewData([
        ['Sample', 'Data', '1', '100'],
        ['More', 'Data', '2', '200']
      ])
    }
  }

  const updateMapping = (targetField: string, sourceField: string) => {
    const updatedMappings = mappingConfig.mappings.map(mapping =>
      mapping.targetField === targetField
        ? { ...mapping, sourceField }
        : mapping
    )
    
    setMappingConfig({
      ...mappingConfig,
      mappings: updatedMappings
    })
  }

  const handleImport = async () => {
    if (!fileData) return

    try {
      setLoading(true)
      
      const params: ImportWorkshopDataParams = {
        operationType: 'import_workshop_data' as const,
        fileData,
        fileFormat,
        mappingConfig,
        validationRules,
        importMode,
        duplicateHandling,
        createMissingInstructors
      }

      const opId = await batchOperationsService.createOperation(
        'import_workshop_data',
        params,
        user?.id || ''
      )

      setOperationId(opId)
      setStep(4)

      await batchOperationsService.executeOperation(opId)
      
      setTimeout(() => {
        onSuccess()
      }, 2000)

    } catch (error) {
      console.error('Failed to start import:', error)
      alert('Failed to start import operation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderFileUploadStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Upload File</h3>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
        <div className="text-center">
          <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-base font-medium text-blue-600 hover:text-blue-500">
                Upload a file
              </span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
              />
            </label>
            <p className="text-sm text-gray-500">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            CSV, XLSX files up to 10MB
          </p>
        </div>
      </div>

      {file && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <DocumentArrowUpIcon className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <p className="font-medium text-green-800">{file.name}</p>
              <p className="text-sm text-green-600">
                {(file.size / 1024 / 1024).toFixed(2)} MB • {fileFormat.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      )}

      {previewData.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-2">File Preview</h4>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((header, index) => (
                    <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell: string, cellIndex: number) => (
                      <td key={cellIndex} className="px-4 py-2 text-sm text-gray-900">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderMappingStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Field Mapping</h3>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          Map the columns from your file to workshop fields. Required fields must be mapped.
        </p>
      </div>

      <div className="space-y-4">
        {workshopFields.map((field) => (
          <div key={field.key} className="grid grid-cols-3 gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            </div>
            
            <div>
              <select
                value={mappingConfig.mappings.find(m => m.targetField === field.key)?.sourceField || ''}
                onChange={(e) => updateMapping(field.key, e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Column</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <input
                type="text"
                placeholder="Default value (optional)"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const updatedMappings = mappingConfig.mappings.map(mapping =>
                    mapping.targetField === field.key
                      ? { ...mapping, defaultValue: e.target.value || undefined }
                      : mapping
                  )
                  setMappingConfig({ ...mappingConfig, mappings: updatedMappings })
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderOptionsStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Import Options</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Import Mode
        </label>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'create_only', label: 'Create Only', desc: 'Only create new workshops' },
            { value: 'update_only', label: 'Update Only', desc: 'Only update existing workshops' },
            { value: 'create_or_update', label: 'Create or Update', desc: 'Create new or update existing' }
          ].map((mode) => (
            <div
              key={mode.value}
              className={`border-2 border-dashed rounded-lg p-3 cursor-pointer transition-colors ${
                importMode === mode.value
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => setImportMode(mode.value as any)}
            >
              <h4 className="font-medium text-gray-900">{mode.label}</h4>
              <p className="text-sm text-gray-600">{mode.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Duplicate Handling
        </label>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'skip', label: 'Skip', desc: 'Skip duplicate workshops' },
            { value: 'overwrite', label: 'Overwrite', desc: 'Overwrite existing workshops' },
            { value: 'create_new', label: 'Create New', desc: 'Create new with different ID' }
          ].map((handling) => (
            <div
              key={handling.value}
              className={`border-2 border-dashed rounded-lg p-3 cursor-pointer transition-colors ${
                duplicateHandling === handling.value
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => setDuplicateHandling(handling.value as any)}
            >
              <h4 className="font-medium text-gray-900">{handling.label}</h4>
              <p className="text-sm text-gray-600">{handling.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center">
        <input
          id="create-missing-instructors"
          type="checkbox"
          checked={createMissingInstructors}
          onChange={(e) => setCreateMissingInstructors(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="create-missing-instructors" className="ml-2 text-sm text-gray-700">
          Create missing instructors automatically
        </label>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800">Before Import</h4>
            <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside space-y-1">
              <li>Ensure all required fields are mapped correctly</li>
              <li>Verify date formats are consistent (YYYY-MM-DD HH:mm:ss)</li>
              <li>Check that instructor emails exist in the system</li>
              <li>Review duplicate handling strategy</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Import Summary</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• File: {file?.name}</p>
          <p>• Format: {fileFormat.toUpperCase()}</p>
          <p>• Import mode: {importMode.replace('_', ' ')}</p>
          <p>• Duplicate handling: {duplicateHandling}</p>
          <p>• Required fields mapped: {
            mappingConfig.mappings.filter(m => m.required && m.sourceField).length
          } / {mappingConfig.mappings.filter(m => m.required).length}</p>
        </div>
      </div>
    </div>
  )

  const renderExecutionStep = () => {
    if (!operationId) return null

    const progress = batchOperationsService.getOperationProgress(operationId)
    
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Importing Workshops</h3>
        
        {progress ? (
          <BatchOperationProgress progress={progress} showDetails={true} />
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">Processing import file...</span>
          </div>
        )}
      </div>
    )
  }

  const canProceedFromStep1 = file && fileData && previewData.length > 0
  const canProceedFromStep2 = mappingConfig.mappings
    .filter(m => m.required)
    .every(m => m.sourceField)

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-6xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Import Workshop Data
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
            {step === 1 && renderFileUploadStep()}
            {step === 2 && renderMappingStep()}
            {step === 3 && renderOptionsStep()}
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
                  Next
                </button>
              )}
              
              {step === 3 && (
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Importing...' : 'Start Import'}
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

export default ImportWorkshopDataModal