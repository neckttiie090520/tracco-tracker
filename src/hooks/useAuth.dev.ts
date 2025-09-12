import { useState, useEffect, createContext, useContext } from 'react'
import { User, Session } from '@supabase/supabase-js'

// Mock development user for testing
const mockUser: User = {
  id: 'mock-admin-id',
  email: 'admin@test.com',
  user_metadata: { 
    full_name: 'Test Admin',
    role: 'admin' 
  },
  app_metadata: {},
  aud: 'authenticated',
  role: 'authenticated',
  email_confirmed_at: new Date().toISOString(),
  phone_confirmed_at: null,
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
} as User

const mockSession: Session = {
  user: mockUser,
  access_token: 'mock-token',
  refresh_token: 'mock-refresh-token',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  expires_in: 3600,
  token_type: 'bearer'
} as Session

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
    // Simulate loading time then set mock auth
    const timer = setTimeout(() => {
      setSession(mockSession)
      setUser(mockUser)
      setLoading(false)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  const signInWithGoogle = async () => {
    console.log('Mock sign in')
  }

  const signOut = async () => {
    console.log('Mock sign out')
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