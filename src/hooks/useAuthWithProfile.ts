import { useState, useEffect, createContext, useContext } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { authService } from '../services/auth'
import { userService } from '../services/users'
import { supabase } from '../services/supabase'
import { Database } from '../types/database'

type UserProfile = Database['public']['Tables']['users']['Row']

async function createUserIfNotExists(user: User) {
  try {
    // Use upsert instead of checking then inserting - faster and handles race conditions
    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name || user.email!.split('@')[0],
        role: 'participant', // Default role
        avatar_saturation: 95,
        avatar_lightness: 45,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: true
      })

    if (error) {
      console.error('Error upserting user:', error)
    }
  } catch (error) {
    console.error('Error in createUserIfNotExists:', error)
  }
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  session: Session | null
  loading: boolean
  profileLoading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: () => Promise<void>
}

const AuthWithProfileContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthWithProfileContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthWithProfileProvider')
  }
  return context
}

export function useAuthWithProfile() {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  const fetchUserProfile = async (userId: string) => {
    try {
      setProfileLoading(true)
      const profile = await userService.getUserProfile(userId)
      setUserProfile(profile)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUserProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }

  const updateProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id)
    }
  }

  useEffect(() => {
    // Get initial session
    authService.getCurrentSession().then(async (session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      }
      
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (event === 'SIGNED_OUT') {
        setUserProfile(null)
        setLoading(false)
        return
      }
      
      if (session?.user) {
        // Create user record in database if signed in
        if (event === 'SIGNED_IN') {
          await createUserIfNotExists(session.user)
        }
        
        // Fetch user profile
        await fetchUserProfile(session.user.id)
      } else {
        setUserProfile(null)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    try {
      await authService.signInWithGoogle()
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      await authService.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  return {
    user,
    userProfile,
    session,
    loading,
    profileLoading,
    signInWithGoogle,
    signOut,
    updateProfile,
  }
}

export { AuthWithProfileContext }