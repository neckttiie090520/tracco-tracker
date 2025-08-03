import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useAdmin } from '../../hooks/useAdmin'
import { ProfileButton } from '../common/ProfileButton'

interface UserNavigationProps {
  showBackButton?: boolean
  backTo?: string
  backLabel?: string
  title?: string
}

export function UserNavigation({ 
  showBackButton = false, 
  backTo = '/dashboard', 
  backLabel = 'กลับ',
  title = 'Traco'
}: UserNavigationProps) {
  const { user } = useAuth()
  const { isAdmin } = useAdmin()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Left side - Title and navigation */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <img 
                src="/logo.png" 
                alt="Traco Logo" 
                className="h-8 w-8"
              />
              <Link to="/dashboard" className="hover:opacity-80 transition-opacity">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {title}
                  </h1>
                  <p className="text-xs text-gray-500">workshop-tracker-tools</p>
                </div>
              </Link>
            </div>
            
            {showBackButton && (
              <div className="flex items-center">
                <span className="text-gray-300 mx-3">|</span>
                <Link
                  to={backTo}
                  className="text-blue-600 hover:text-blue-800 flex items-center transition-colors font-medium"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {backLabel}
                </Link>
              </div>
            )}
          </div>

          {/* Right side - User profile dropdown */}
          <div className="flex items-center gap-4">
            {/* Admin Panel Button - Only visible to admins */}
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-pink-600 text-white px-2 py-1 rounded text-xs font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-200"
              >
                <span className="text-xs">⚡</span>
                <span>Admin</span>
              </Link>
            )}

            {user && (
              <ProfileButton 
                dropdownDirection="down" 
                showUserModeSwitch={false}
                compact={false}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}