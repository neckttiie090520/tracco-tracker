import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { useUserProfile } from './useUserProfile'
import { Database } from '../types/database'

type UserProfile = Database['public']['Tables']['users']['Row']

// Hook for optimistic profile updates that immediately reflect changes in UI
export function useOptimisticProfile(authUser: User | null) {
  const { profile: serverProfile, loading, error, updateProfile: serverUpdateProfile } = useUserProfile(authUser)
  const [optimisticProfile, setOptimisticProfile] = useState<UserProfile | null>(null)
  const [hasOptimisticUpdates, setHasOptimisticUpdates] = useState(false)

  // Sync optimistic profile with server profile
  useEffect(() => {
    if (serverProfile) {
      // Only set optimistic profile if we don't have pending optimistic updates
      if (!hasOptimisticUpdates) {
        setOptimisticProfile(serverProfile)
      }
    }
  }, [serverProfile, hasOptimisticUpdates])

  // Return optimistic profile if available, otherwise server profile
  const currentProfile = optimisticProfile || serverProfile

  const updateProfile = async (updates: {
    name?: string
    faculty?: string
    department?: string
    bio?: string
    avatar_saturation?: number
    avatar_lightness?: number
  }) => {
    if (!authUser || !currentProfile) return

    // Optimistically update UI immediately
    const optimisticUpdate = {
      ...currentProfile,
      ...updates,
      updated_at: new Date().toISOString()
    }
    setOptimisticProfile(optimisticUpdate)
    setHasOptimisticUpdates(true)

    try {
      // Perform actual server update
      const updatedProfile = await serverUpdateProfile(updates)
      // Update optimistic state with server response
      setOptimisticProfile(updatedProfile)
      setHasOptimisticUpdates(false)
      return updatedProfile
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticProfile(serverProfile)
      setHasOptimisticUpdates(false)
      throw error
    }
  }

  // Function to reset optimistic state (useful for reverting unsaved changes)
  const resetOptimisticState = () => {
    setOptimisticProfile(serverProfile)
    setHasOptimisticUpdates(false)
  }

  return {
    profile: currentProfile,
    loading,
    error,
    updateProfile,
    resetOptimisticState,
    hasUnsavedChanges: hasOptimisticUpdates
  }
}