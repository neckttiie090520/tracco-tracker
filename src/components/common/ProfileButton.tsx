import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useUserProfile } from '../../hooks/useUserProfile'
import { Avatar } from './Avatar'
import { ProfileModal } from '../profile/ProfileModal'

interface ProfileButtonProps {
  dropdownDirection?: 'auto' | 'up' | 'down'
  showUserModeSwitch?: boolean
  compact?: boolean
}

export function ProfileButton({ 
  dropdownDirection = 'auto',
  showUserModeSwitch = false,
  compact = false
}: ProfileButtonProps) {
  const { user, signOut } = useAuth()
  const { profile: userProfile } = useUserProfile(user)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [dropdownUp, setDropdownUp] = useState(false)
  const [dropdownLeft, setDropdownLeft] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Determine dropdown direction and positioning
  const determineDropdownPosition = () => {
    if (!buttonRef.current) return { up: false, left: false }
    
    const buttonRect = buttonRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const dropdownWidth = 280 // Estimated dropdown width
    
    // Vertical positioning
    let up = false
    if (dropdownDirection === 'up') {
      up = true
    } else if (dropdownDirection === 'down') {
      up = false
    } else {
      // Auto detection
      const spaceBelow = viewportHeight - buttonRect.bottom
      const spaceAbove = buttonRect.top
      up = spaceBelow < 300 && spaceAbove > spaceBelow
    }
    
    // Horizontal positioning - check for left overflow
    let left = false
    const spaceOnRight = viewportWidth - buttonRect.left
    const spaceOnLeft = buttonRect.right
    
    // If dropdown would extend beyond left edge, position it to the right
    if (buttonRect.left < dropdownWidth / 2) {
      left = true
    }
    
    return { up, left }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  const handleSignOut = async () => {
    try {
      await signOut()
      setShowDropdown(false)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const openProfile = () => {
    setShowProfileModal(true)
    setShowDropdown(false)
  }

  const handleButtonClick = () => {
    if (!showDropdown) {
      // Determine position before showing dropdown
      const position = determineDropdownPosition()
      setDropdownUp(position.up)
      setDropdownLeft(position.left)
    }
    setShowDropdown(!showDropdown)
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          ref={buttonRef}
          onClick={handleButtonClick}
          className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors w-full"
        >
          <Avatar
            username={user.email}
            name={userProfile?.name || user.email?.split('@')[0] || 'User'}
            avatarSeed={userProfile?.avatar_seed}
            size={compact ? 28 : 32}
            saturation={userProfile?.avatar_saturation}
            lightness={userProfile?.avatar_lightness}
          />
          {!compact && (
            <div className="hidden md:block text-left flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userProfile?.name || user.email?.split('@')[0]}
              </p>
            </div>
          )}
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className={`absolute w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 ${
            dropdownUp ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${
            dropdownLeft ? 'left-0' : 'right-0'
          }`}>
            {/* Profile Info Header */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <Avatar
                  username={user.email}
                  name={userProfile?.name || user.email?.split('@')[0] || 'User'}
                  avatarSeed={userProfile?.avatar_seed}
                  size={44}
                  saturation={userProfile?.avatar_saturation}
                  lightness={userProfile?.avatar_lightness}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {userProfile?.name || user.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.email}
                  </p>
                  {userProfile?.faculty && (
                    <p className="text-xs text-gray-400 truncate mt-1">
                      {userProfile.faculty}
                      {userProfile.department && ` • ${userProfile.department}`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              {/* Edit Profile */}
              <button
                onClick={openProfile}
                className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span className="mr-3 text-base"></span>
                Edit Profile
              </button>
              
              
              {/* User Mode Switch (only show in admin context) */}
              {showUserModeSwitch && (
                <Link
                  to="/dashboard"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <span className="mr-3 text-base"></span>
                  Switch to User View
                </Link>
              )}
              
              <div className="border-t border-gray-100 my-1"></div>
              
              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <span className="mr-3 text-base"></span>
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </>
  )
}