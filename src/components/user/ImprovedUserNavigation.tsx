import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useAdmin } from '../../hooks/useAdmin'
import { ProfileButton } from '../common/ProfileButton'

interface UserNavigationProps {
  showBackButton?: boolean
  backTo?: string
  backLabel?: string
  title?: string
}

export function ImprovedUserNavigation({ 
  showBackButton = false, 
  backTo = '/dashboard', 
  backLabel = 'กลับ',
  title = 'Workshop Tracker'
}: UserNavigationProps) {
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const location = useLocation()

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/sessions', label: 'Sessions', icon: '📅' },
    { path: '/materials', label: 'เอกสาร', icon: '📚' },
    { path: '/my-tasks', label: 'งานของฉัน', icon: '📝' }
  ]

  return (
    <header className="bg-white shadow-lg border-b border-gray-100 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 rounded-full blur-3xl"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Left side - Brand and navigation */}
          <div className="flex items-center space-x-8">
            {/* Brand */}
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <span className="text-white text-xl font-bold">W</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {title}
                  </h1>
                  <p className="text-xs text-gray-500">Learning Management</p>
                </div>
              </Link>
            </div>
            
            {/* Main Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path === '/dashboard' && location.pathname === '/')
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                      transition-all duration-200 hover-lift
                      ${isActive 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Back Button */}
            {showBackButton && (
              <div className="hidden md:flex items-center">
                <div className="w-px h-6 bg-gray-300 mx-4"></div>
                <Link
                  to={backTo}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium px-3 py-2 rounded-lg hover:bg-blue-50 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>{backLabel}</span>
                </Link>
              </div>
            )}
          </div>

          {/* Right side - User profile */}
          <div className="flex items-center gap-4">
            {/* Admin Panel Button - Only visible to admins */}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden md:flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-xl font-semibold hover:from-red-600 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <span className="text-lg">⚡</span>
                <span>Admin Panel</span>
              </Link>
            )}

            {/* Quick Stats (Optional) */}
            <div className="hidden lg:flex items-center gap-4 text-sm">
              <div className="bg-gray-50 px-3 py-2 rounded-lg">
                <span className="text-gray-600">สวัสดี, </span>
                <span className="font-semibold text-gray-900">
                  {user?.email?.split('@')[0]}
                </span>
              </div>
            </div>

            {/* Profile Button */}
            {user && (
              <ProfileButton 
                dropdownDirection="down" 
                showUserModeSwitch={false}
                compact={false}
              />
            )}

            {/* Mobile Menu Button */}
            <button className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden border-t border-gray-100 py-3">
          <nav className="flex items-center justify-around">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path === '/dashboard' && location.pathname === '/')
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium
                    transition-all duration-200 min-w-0 flex-1
                    ${isActive 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </header>
  )
}