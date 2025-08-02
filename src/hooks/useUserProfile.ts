import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { userService } from '../services/users'
import { Database } from '../types/database'
import { profileEvents } from '../utils/profileEvents'

type UserProfile = Database['public']['Tables']['users']['Row']

export function useUserProfile(authUser: User | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = async () => {
    if (!authUser) {
      setProfile(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const profileData = await userService.getUserProfile(authUser.id)
      setProfile(profileData)
    } catch (err) {
      console.error('Error fetching user profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: {
    name?: string
    faculty?: string
    department?: string
    bio?: string
    avatar_saturation?: number
    avatar_lightness?: number
  }) => {
    if (!authUser) throw new Error('No authenticated user')

    try {
      const updatedProfile = await userService.updateProfile(authUser.id, updates)
      setProfile(updatedProfile)
      return updatedProfile
    } catch (err) {
      console.error('Error updating profile:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [authUser?.id])

  // Listen for global profile updates
  useEffect(() => {
    const unsubscribe = profileEvents.subscribe(() => {
      fetchProfile()
    })
    
    return unsubscribe
  }, [authUser?.id])

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch: fetchProfile
  }
}