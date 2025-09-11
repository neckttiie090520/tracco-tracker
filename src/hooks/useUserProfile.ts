import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { userService } from '../services/users'
import { Database } from '../types/database'
import { profileEvents } from '../utils/profileEvents'

type UserProfile = Database['public']['Tables']['users']['Row']

// Global cache to prevent duplicate requests
const profileCache = new Map<string, { data: UserProfile | null; timestamp: number; promise?: Promise<UserProfile | null> }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

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

    const userId = authUser.id
    const cached = profileCache.get(userId)
    const now = Date.now()

    // Return cached data if still fresh
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      setProfile(cached.data)
      setLoading(false)
      return
    }

    // Return existing promise if request is in flight
    if (cached?.promise) {
      try {
        const result = await cached.promise
        setProfile(result)
        setLoading(false)
        return
      } catch (err) {
        // Continue with new request if promise failed
      }
    }

    try {
      setLoading(true)
      setError(null)
      
      // Create new request promise
      const profilePromise = userService.getUserProfile(userId)
      
      // Cache the promise to prevent duplicate requests
      profileCache.set(userId, {
        data: null,
        timestamp: now,
        promise: profilePromise
      })
      
      const profileData = await profilePromise
      
      // Generate avatar_seed if not exists (for better avatar consistency)
      let finalProfile = profileData
      if (profileData && !profileData.avatar_seed) {
        try {
          const generatedSeed = await userService.generateAvatarSeedIfNeeded(userId)
          if (generatedSeed) {
            finalProfile = { ...profileData, avatar_seed: generatedSeed }
          }
        } catch (seedError) {
          console.warn('Could not generate avatar seed:', seedError)
          // Continue with profile without seed
        }
      }
      
      // Update cache with result
      profileCache.set(userId, {
        data: finalProfile,
        timestamp: now
      })
      
      setProfile(finalProfile)
    } catch (err) {
      console.error('Error fetching user profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
      setProfile(null)
      
      // Remove failed request from cache
      profileCache.delete(userId)
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