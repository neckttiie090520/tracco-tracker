import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ProfileButton } from '../common/ProfileButton'
import { RealtimeIndicators } from '../common/RealtimeDashboard'

export function AdminNavigation() {
  const location = useLocation()
  const { user } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  // Navigation groups for better organization

  const isActive = (path: string) => {
    return location.pathname === path
  }

  const navGroups = [
    {
      label: 'Overview',
      items: [
        { path: '/admin', label: 'Dashboard', icon: '📊' },
      ]
    },
    {
      label: 'Session Management',
      items: [
        { path: '/admin/sessions', label: 'Sessions', icon: '🎓' },
      ]
    },
    {
      label: 'Content Management',
      items: [
        { path: '/admin/workshops', label: 'Workshops', icon: '🏫' },
        { path: '/admin/tasks', label: 'Tasks', icon: '📋' },
      ]
    },
    {
      label: 'User Management',
      items: [
        { path: '/admin/participants', label: 'Participants', icon: '👥' },
      ]
    },
    {
      label: 'Tools & Operations',
      items: [
        { path: '/admin/batch-operations', label: 'Batch Operations', icon: '⚡' },
        { path: '/admin/randomizer', label: 'Lucky Draw', icon: '🎰' },
      ]
    }
  ]

  return (
    <nav className={`bg-white shadow-sm border-r border-gray-200 min-h-screen flex flex-col transition-all duration-300 relative ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header with App Title */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          {!isCollapsed && (
            <>
              <div className="flex items-center space-x-2">
                <img 
                  src="/logo.png" 
                  alt="Traco Logo" 
                  className="h-6 w-6"
                />
                <Link to="/dashboard" className="text-xl font-bold text-gray-900">
                  Traco
                </Link>
              </div>
              <RealtimeIndicators />
            </>
          )}
          {isCollapsed && (
            <div className="w-full flex justify-center">
              <img 
                src="/logo.png" 
                alt="Traco Logo" 
                className="h-8 w-8"
              />
            </div>
          )}
        </div>
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
        )}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 p-4">
        <div className="space-y-6">
          {navGroups.map((group, groupIndex) => (
            <div key={group.label}>
              {/* Group Label - Hidden when collapsed */}
              {!isCollapsed && (
                <div className="mb-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3">
                    {group.label}
                  </h3>
                </div>
              )}
              
              {/* Group Items */}
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center rounded-md text-sm font-medium transition-colors relative group ${
                        isCollapsed ? 'justify-center p-2' : 'px-3 py-2'
                      } ${
                        isActive(item.path)
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                      title={isCollapsed ? item.label : ''}
                    >
                      <span className={isCollapsed ? 'text-lg' : 'mr-3'}>{item.icon}</span>
                      {!isCollapsed && item.label}
                      
                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                          {item.label}
                          <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
              
              {/* Divider (except for last group) - Hidden when collapsed */}
              {!isCollapsed && groupIndex < navGroups.length - 1 && (
                <div className="mt-4 border-b border-gray-200"></div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-200">
        {user && (
          <ProfileButton 
            dropdownDirection="up" 
            showUserModeSwitch={true}
            compact={isCollapsed}
          />
        )}
      </div>
      
      {/* Collapse/Expand Button - Fixed at center right edge */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-1/2 -translate-y-1/2 -right-3 bg-white border border-gray-300 rounded-full p-1.5 shadow-md hover:shadow-lg transition-all duration-200 z-10 hover:bg-gray-50"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg 
          className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </nav>
  )
}