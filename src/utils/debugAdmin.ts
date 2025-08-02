import { supabase } from '../services/supabase'

// Debug function to make current user admin
export async function makeCurrentUserAdmin() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No user logged in')
      return false
    }

    console.log('Current user:', user.id, user.email)

    // Update user role to admin
    const { data, error } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', user.id)
      .select()

    if (error) {
      console.error('Error updating user role:', error)
      return false
    }

    console.log('User role updated to admin:', data)
    return true
  } catch (error) {
    console.error('Error making user admin:', error)
    return false
  }
}

// Check current user's role
export async function checkCurrentUserRole() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No user logged in')
      return null
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, name')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user role:', error)
      return null
    }

    console.log('Current user data:', data)
    return data
  } catch (error) {
    console.error('Error checking user role:', error)
    return null
  }
}

// Add these to window for debug access
declare global {
  interface Window {
    makeCurrentUserAdmin: () => Promise<boolean>
    checkCurrentUserRole: () => Promise<any>
  }
}

if (typeof window !== 'undefined') {
  window.makeCurrentUserAdmin = makeCurrentUserAdmin
  window.checkCurrentUserRole = checkCurrentUserRole
}