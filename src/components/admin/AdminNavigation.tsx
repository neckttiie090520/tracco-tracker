import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ProfileButton } from '../common/ProfileButton'
import { RealtimeIndicators } from '../common/RealtimeDashboard'
import {
  LayoutDashboard,
  CalendarDays,
  Presentation,
  ListChecks,
  Users,
  Boxes,
  Dice3
} from 'lucide-react'

export function AdminNavigation() {
  const location = useLocation()
  const { user } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false) // desktop collapse
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const isActive = (path: string) => location.pathname === path

  type NavItem = { path: string; label: string; icon: React.ReactNode }
  const navGroups: { label: string; items: NavItem[] }[] = [
    { label: 'Overview', items: [{ path: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> }] },
    { label: 'Session Management', items: [{ path: '/admin/sessions', label: 'Sessions', icon: <CalendarDays className="w-4 h-4" /> }] },
    { label: 'Content Management', items: [
      { path: '/admin/workshops', label: 'Workshops', icon: <Presentation className="w-4 h-4" /> },
      { path: '/admin/tasks', label: 'Tasks', icon: <ListChecks className="w-4 h-4" /> },
    ] },
    { label: 'User Management', items: [{ path: '/admin/participants', label: 'Participants', icon: <Users className="w-4 h-4" /> }] },
    { label: 'Tools & Operations', items: [
      { path: '/admin/batch-operations', label: 'Batch Operations', icon: <Boxes className="w-4 h-4" /> },
      { path: '/admin/randomizer', label: 'Lucky Draw', icon: <Dice3 className="w-4 h-4" /> },
    ] },
  ]

  const NavContent = ({ condensed = false }: { condensed?: boolean }) => (
    <>
      {/* Header with App Title */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          {!condensed && (
            <>
              <div className="flex items-center space-x-2">
                <img src="/logo.png" alt="Traco Logo" className="h-6 w-6" />
                <Link to="/dashboard" className="text-xl font-bold text-gray-900">Traco</Link>
              </div>
              <RealtimeIndicators />
            </>
          )}
          {condensed && (
            <div className="w-full flex justify-center">
              <img src="/logo.png" alt="Traco Logo" className="h-8 w-8" />
            </div>
          )}
        </div>
        {!condensed && (
          <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
        )}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 p-4">
        <div className="space-y-6">
          {navGroups.map((group, groupIndex) => (
            <div key={group.label}>
              {!condensed && (
                <div className="mb-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3">{group.label}</h3>
                </div>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center rounded-md text-sm font-medium transition-colors relative group ${
                        condensed ? 'justify-center p-2' : 'px-3 py-2'
                      } ${isActive(item.path) ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                      title={condensed ? item.label : ''}
                      onClick={() => setIsMobileOpen(false)}
                    >
                      <span className={condensed ? 'text-lg' : 'mr-3'}>{item.icon}</span>
                      {!condensed && item.label}
                      {condensed && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                          {item.label}
                          <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
              {!condensed && groupIndex < navGroups.length - 1 && (
                <div className="mt-4 border-b border-gray-200"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-200">
        {user && (
          <ProfileButton dropdownDirection="up" showUserModeSwitch={true} compact={condensed} />
        )}
      </div>
    </>
  )

  return (
    <nav className={`relative ${isCollapsed ? 'w-16 md:w-16' : 'w-0 md:w-64'}`}>
      {/* Mobile: hamburger button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-md bg-white/90 border border-gray-200 shadow-sm"
        aria-label="Open admin menu"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Desktop sidebar */}
      <div className={`hidden md:flex relative bg-white shadow-sm border-r border-gray-200 h-screen flex-col transition-all duration-300 overflow-y-auto ${isCollapsed ? 'w-16' : 'w-64'}`}>
        <NavContent condensed={isCollapsed} />
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-1/2 -translate-y-1/2 -right-3 bg-white border border-gray-300 rounded-full p-1.5 shadow-md hover:shadow-lg transition-all duration-200 z-10 hover:bg-gray-50"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setIsMobileOpen(false)} />
          <div className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-40 transform transition-transform md:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="absolute top-3 right-3">
              <button onClick={() => setIsMobileOpen(false)} className="p-2 rounded-md hover:bg-gray-100" aria-label="Close menu">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-full flex flex-col">
              <NavContent condensed={false} />
            </div>
          </div>
        </>
      )}
    </nav>
  )
}
