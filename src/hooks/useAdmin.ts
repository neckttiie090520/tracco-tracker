import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { userService } from '../services/users'

export function useAdmin() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false)
        setUserProfile(null)
        setLoading(false)
        return
      }

      try {
        // Get user profile directly (without create to avoid overriding role)
        const profile = await userService.getUserProfile(user.id)
        setUserProfile(profile)
        setIsAdmin(profile?.role === 'admin')
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
        setUserProfile(null)
      } finally {
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [user])

  return {
    isAdmin,
    loading,
    userProfile
  }
}

export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const userProfile = await userService.getOrCreateUserProfile(user)
      setProfile(userProfile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: any) => {
    if (!user) throw new Error('User not authenticated')
    
    try {
      const updatedProfile = await userService.updateUserProfile(user.id, updates)
      setProfile(updatedProfile)
      return updatedProfile
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [user])

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch: fetchProfile
  }
}