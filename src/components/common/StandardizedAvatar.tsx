import React from 'react'
import { Avatar } from './Avatar'

/**
 * Standardized Avatar Component - Central source of truth for all avatar displays
 * 
 * This component reuses the exact same logic as Participant Management page
 * to ensure consistent avatar display across the entire system.
 * 
 * Based on src/pages/admin/ParticipantManagement.tsx implementation
 */

interface StandardizedAvatarProps {
  // User data - same structure as in ParticipantManagement
  user?: {
    id?: string
    name?: string
    email?: string
    avatar_seed?: string
    avatar_saturation?: number
    avatar_lightness?: number
  }
  
  // Fallback data for compatibility
  username?: string
  name?: string
  email?: string
  
  // Visual customization
  size?: number
  className?: string
  onClick?: () => void
  
  // Display settings
  showName?: boolean
  showEmail?: boolean
  nameClassName?: string
  emailClassName?: string
}

export function StandardizedAvatar({
  user,
  username,
  name,
  email,
  size = 40,
  className = '',
  onClick,
  showName = false,
  showEmail = false,
  nameClassName = 'text-sm font-medium text-gray-900',
  emailClassName = 'text-sm text-gray-500'
}: StandardizedAvatarProps) {
  // Use exact same logic as ParticipantManagement for data extraction
  const avatarUser = user || {
    name: name,
    email: email || username,
    avatar_seed: undefined,
    avatar_saturation: undefined,
    avatar_lightness: undefined
  }
  
  const displayName = avatarUser.name || avatarUser.email || username || 'Unknown User'
  const displayEmail = avatarUser.email || email || username || 'No email'
  
  if (!showName && !showEmail) {
    // Avatar only - same as ParticipantManagement lines 318-325
    return (
      <Avatar
        username={avatarUser.email || username}
        name={displayName}
        avatarSeed={avatarUser.avatar_seed}
        size={size}
        saturation={avatarUser.avatar_saturation}
        lightness={avatarUser.avatar_lightness}
        className={className}
        onClick={onClick}
      />
    )
  }
  
  // Avatar with text - same as ParticipantManagement lines 317-334
  return (
    <div className="flex items-center space-x-3">
      <Avatar
        username={avatarUser.email || username}
        name={displayName}
        avatarSeed={avatarUser.avatar_seed}
        size={size}
        saturation={avatarUser.avatar_saturation}
        lightness={avatarUser.avatar_lightness}
        className={className}
        onClick={onClick}
      />
      <div>
        {showName && (
          <div className={nameClassName}>
            {displayName}
          </div>
        )}
        {showEmail && (
          <div className={emailClassName}>
            {displayEmail}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Standardized Member Avatar - For group/member listings
 * 
 * This matches the exact display pattern used in ParticipantManagement
 * for member rows in tables.
 */
interface StandardizedMemberAvatarProps {
  member: {
    user_id?: string
    user?: {
      id?: string
      name?: string
      email?: string
      avatar_seed?: string
      avatar_saturation?: number
      avatar_lightness?: number
    }
  }
  
  // Fallback data
  name?: string
  email?: string
  
  size?: number
  className?: string
  onClick?: () => void
}

export function StandardizedMemberAvatar({
  member,
  name,
  email,
  size = 40,
  className = '',
  onClick
}: StandardizedMemberAvatarProps) {
  // Extract user data using same pattern as ParticipantManagement
  const userData = member.user || {
    name: name,
    email: email,
    avatar_seed: undefined,
    avatar_saturation: undefined,
    avatar_lightness: undefined
  }
  
  return (
    <StandardizedAvatar
      user={userData}
      size={size}
      className={className}
      onClick={onClick}
      showName={true}
      showEmail={true}
    />
  )
}

/**
 * Standardized Participant Avatar - Exact replica of ParticipantManagement pattern
 */
interface StandardizedParticipantAvatarProps {
  participant: {
    id: string
    user?: {
      name?: string
      email?: string
      avatar_seed?: string
      avatar_saturation?: number
      avatar_lightness?: number
    }
  }
  
  size?: number
  className?: string
  onClick?: () => void
}

export function StandardizedParticipantAvatar({
  participant,
  size = 40,
  className = '',
  onClick
}: StandardizedParticipantAvatarProps) {
  // This is the exact same pattern as ParticipantManagement line 318-334
  return (
    <div className="flex items-center space-x-3">
      <Avatar
        username={participant.user?.email}
        name={participant.user?.name}
        avatarSeed={participant.user?.avatar_seed}
        size={size}
        saturation={participant.user?.avatar_saturation}
        lightness={participant.user?.avatar_lightness}
        className={className}
        onClick={onClick}
      />
      <div>
        <div className="text-sm font-medium text-gray-900">
          {participant.user?.name || 'Unknown User'}
        </div>
        <div className="text-sm text-gray-500">
          {participant.user?.email || 'No email'}
        </div>
      </div>
    </div>
  )
}

export default StandardizedAvatar