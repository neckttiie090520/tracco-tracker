import { supabase } from './supabase'

export const authService = {
  // Google OAuth login
  async signInWithGoogle() {
    // Use current origin for redirect
    const redirectUrl = `${window.location.origin}/dashboard`;
      
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    
    if (error) {
      console.error('Google sign in error:', error)
      throw error
    }
    
    return data
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign out error:', error)
      throw error
    }
    
    // Clear localStorage and redirect
    localStorage.clear()
    window.location.href = '/login'
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Get user error:', error)
      return null
    }
    return user
  },

  // Get current session
  async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Get session error:', error)
      return null
    }
    return session
  },

  // Listen to auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  },
}