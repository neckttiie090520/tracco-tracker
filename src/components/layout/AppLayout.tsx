import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useAdmin } from '../../hooks/useAdmin'
import { ProfileButton } from '../common/ProfileButton'

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
}

export function AppLayout({ children, title = 'Workshop Tracker' }: AppLayoutProps) {
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const isAdminPage = location.pathname.startsWith('/admin')

  const navigationItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/sessions', label: 'Sessions', icon: '📅' },
  ]

  const adminNavigationItems = isAdmin ? [
    { path: '/admin', label: 'Admin Panel', icon: '⚙️' },
  ] : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-8">
              <Link to="/dashboard" className="text-3xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                {title}
              </Link>
              
              {!isAdminPage && (
                <nav className="hidden md:flex space-x-2">
                  {[...navigationItems, ...adminNavigationItems].map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        location.pathname === item.path
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <span className="mr-2 text-base">{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}
                </nav>
              )}
              
              {/* Mobile menu button */}
              {!isAdminPage && (
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  aria-label="Toggle menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {user && (
                <ProfileButton 
                  showUserModeSwitch={isAdmin && isAdminPage}
                  compact={false}
                />
              )}
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {!isAdminPage && isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-1">
              {[...navigationItems, ...adminNavigationItems].map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Quick Actions FAB (for mobile) */}
      {!isAdminPage && (
        <div className="fixed bottom-6 right-6 md:hidden z-50">
          <div className="relative group">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}