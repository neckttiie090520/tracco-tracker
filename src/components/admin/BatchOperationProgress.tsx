import React from 'react'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ClockIcon 
} from '@heroicons/react/24/outline'
import { 
  BatchOperationProgress as BatchOperationProgressType,
  BatchOperation
} from '../../types/BatchOperationsTypes'

interface BatchOperationProgressProps {
  progress: BatchOperation
  showDetails?: boolean
  compact?: boolean
}

const BatchOperationProgress: React.FC<BatchOperationProgressProps> = ({ 
  progress, 
  showDetails = false,
  compact = false 
}) => {
  const getProgressPercentage = () => {
    if (progress.totalItems === 0) return 0
    return Math.round((progress.processedItems / progress.totalItems) * 100)
  }

  const getEstimatedTimeRemaining = () => {
    if (!progress.estimatedDuration) return null
    
    const remaining = progress.estimatedDuration * 1000 // convert to milliseconds
    
    if (remaining <= 0) return null
    
    const minutes = Math.ceil(remaining / (1000 * 60))
    if (minutes < 60) return `${minutes}m remaining`
    
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m remaining` : `${hours}h remaining`
  }

  const getStatusColor = () => {
    switch (progress.status) {
      case 'in_progress':
        return 'blue'
      case 'completed':
        return 'green'
      case 'failed':
        return 'red'
      case 'cancelled':
        return 'gray'
      case 'pending':
        return 'yellow'
      default:
        return 'gray'
    }
  }

  const getProgressBarColor = () => {
    if (progress.failedItems > 0 && progress.status !== 'completed') {
      return 'bg-red-500'
    }
    return 'bg-blue-500'
  }

  const formatDuration = () => {
    if (!progress.completedAt || !progress.startedAt) return null
    
    const duration = progress.completedAt.getTime() - progress.startedAt.getTime()
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
        <span className="text-sm text-gray-600">
          {progress.processedItems}/{progress.totalItems}
        </span>
        {progress.status === 'in_progress' && (
          <ClockIcon className="h-4 w-4 text-blue-500 animate-pulse" />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">
              Progress: {progress.processedItems} / {progress.totalItems}
            </span>
            <span className="text-sm text-gray-500">
              ({getProgressPercentage()}%)
            </span>
          </div>
          {progress.status === 'in_progress' && getEstimatedTimeRemaining() && (
            <span className="text-sm text-gray-500">
              {getEstimatedTimeRemaining()}
            </span>
          )}
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      {/* Current Item */}
      {progress.currentStep && progress.status === 'in_progress' && (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <ClockIcon className="h-4 w-4 animate-pulse" />
          <span>Currently processing: {progress.currentStep}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="flex items-center space-x-1">
          <CheckCircleIcon className="h-4 w-4 text-green-500" />
          <span className="text-gray-600">Success:</span>
          <span className="font-medium text-green-600">{progress.successItems}</span>
        </div>
        
        {progress.failedItems > 0 && (
          <div className="flex items-center space-x-1">
            <XCircleIcon className="h-4 w-4 text-red-500" />
            <span className="text-gray-600">Failed:</span>
            <span className="font-medium text-red-600">{progress.failedItems}</span>
          </div>
        )}
        
        {progress.errors.filter(e => e.severity === 'warning').length > 0 && (
          <div className="flex items-center space-x-1">
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
            <span className="text-gray-600">Warnings:</span>
            <span className="font-medium text-yellow-600">{progress.errors.filter(e => e.severity === 'warning').length}</span>
          </div>
        )}
      </div>

      {/* Timing Information */}
      <div className="flex justify-between text-sm text-gray-500">
        <span>Started: {progress.startedAt ? progress.startedAt.toLocaleString() : 'N/A'}</span>
        {progress.completedAt && (
          <span>
            Completed in {formatDuration()}
          </span>
        )}
      </div>

      {/* Detailed Information */}
      {showDetails && (
        <div className="border-t border-gray-200 pt-3 space-y-3">
          {/* Errors */}
          {progress.errors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-600 mb-2">Errors ({progress.errors.length})</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {progress.errors.slice(0, 5).map((error) => (
                  <div key={error.id} className="bg-red-50 border border-red-200 rounded p-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">
                          {error.itemIdentifier} (Item {error.itemIndex + 1})
                        </p>
                        <p className="text-sm text-red-600">{error.errorMessage}</p>
                      </div>
                      {error.retryable && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          Retryable
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {progress.errors.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... and {progress.errors.length - 5} more errors
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {progress.warnings.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-yellow-600 mb-2">Warnings ({progress.warnings.length})</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {progress.warnings.slice(0, 3).map((warning) => (
                  <div key={warning.id} className="bg-yellow-50 border border-yellow-200 rounded p-2">
                    <p className="text-sm font-medium text-yellow-800">
                      {warning.itemIdentifier} (Item {warning.itemIndex + 1})
                    </p>
                    <p className="text-sm text-yellow-600">{warning.warningMessage}</p>
                  </div>
                ))}
                {progress.warnings.length > 3 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... and {progress.warnings.length - 3} more warnings
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          {progress.metadata && Object.keys(progress.metadata).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Additional Information</h4>
              <div className="bg-gray-50 border border-gray-200 rounded p-2">
                {Object.entries(progress.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                    <span className="text-gray-900">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BatchOperationProgress