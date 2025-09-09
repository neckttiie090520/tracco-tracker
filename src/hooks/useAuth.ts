import { useState, useEffect, createContext, useContext } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { authService } from '../services/auth'
import { supabase } from '../services/supabase'
import { sessionManager, setupActivityListeners } from '../services/sessionManager'
import { isSessionManagementEnabled } from '../config/sessionConfig'

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
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    authService.getCurrentSession().then((session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Initialize session manager if user is authenticated and enabled
      if (session?.user && isSessionManagementEnabled()) {
        setupActivityListeners()
        sessionManager.init({
          onWarning: () => {
            // You can add a warning notification here
            console.log('Session will expire soon')
          },
          onTimeout: () => {
            // Session timeout handled by sessionManager
            console.log('Session expired due to inactivity or timeout')
          }
        })
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      // Set loading false first to prevent infinite loading
      setLoading(false)
      
      // Create user record in database if signed in (async, don't wait)
      if (event === 'SIGNED_IN' && session?.user) {
        createUserIfNotExists(session.user).catch(err => 
          console.error('Failed to create user profile:', err)
        )
        
        // Initialize session manager if enabled
        if (isSessionManagementEnabled()) {
          setupActivityListeners()
          sessionManager.init({
            onWarning: () => {
              console.log('Session will expire soon')
            },
            onTimeout: () => {
              console.log('Session expired due to inactivity or timeout')
            }
          })
        }
      } else if (event === 'SIGNED_OUT') {
        // Stop session manager
        sessionManager.stop()
      }
    })

    return () => {
      subscription.unsubscribe()
      sessionManager.stop()
    }
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
    session,
    loading,
    signInWithGoogle,
    signOut,
  }
}

export { AuthContext }