import React from 'react'
import { 
  ArrowLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

const BatchOperationsDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => window.history.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Admin Dashboard
          </button>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Batch Operations Dashboard</h1>
          <p className="text-lg text-gray-600 mb-6">This feature is currently under development</p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-left">
                <h3 className="text-sm font-medium text-yellow-800 mb-1">
                  System Not Available
                </h3>
                <p className="text-sm text-yellow-700">
                  Batch operations functionality is not yet available for use. 
                  This feature will include bulk workshop creation, mass email notifications, 
                  and data import/export capabilities.
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-500 mb-6">
            <p>Expected features:</p>
            <ul className="mt-2 space-y-1">
              <li>• Bulk create workshops from templates</li>
              <li>• Mass email participants</li>
              <li>• Batch update workshop details</li>
              <li>• Export participant data</li>
              <li>• Import workshop data from CSV</li>
            </ul>
          </div>

          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default BatchOperationsDashboard