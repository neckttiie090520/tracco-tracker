import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldExclamationIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center">
        {/* Icon */}
        <div className="w-24 h-24 mx-auto mb-8 text-red-500">
          <ShieldExclamationIcon className="w-full h-full" />
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Access Denied
        </h1>
        <p className="text-gray-600 mb-8">
          You don't have permission to access this page. 
          Please check your account permissions or contact an administrator.
        </p>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Go to Dashboard
            <ArrowRightIcon className="w-5 h-5 ml-2" />
          </Link>
          
          <div className="flex justify-center">
            <Link
              to="/login"
              className="text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
            >
              Sign in with different account
            </Link>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact support or try logging in again.
          </p>
        </div>
      </div>
    </div>
  )
}