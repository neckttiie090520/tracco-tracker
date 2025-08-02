import { supabase } from './supabase'
import { Database } from '../types/database'

type User = Database['public']['Tables']['users']['Row']
type UserInsert = Database['public']['Tables']['users']['Insert']

export const userService = {
  // Get or create user profile
  async getOrCreateUserProfile(authUser: any) {
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (existingUser && !fetchError) {
      return existingUser
    }

    // If user doesn't exist, return null and let trigger handle creation
    // Don't create here to avoid overriding existing role
    console.log('User not found in database, should be created by trigger')
    return null
  },

  // Get user profile by ID
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      throw error
    }

    return data
  },

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<UserInsert>) {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      throw error
    }

    return data
  },

  // Update profile (alias for updateUserProfile)
  async updateProfile(userId: string, profileData: {
    name?: string
    faculty?: string
    department?: string
    bio?: string
    avatar_saturation?: number
    avatar_lightness?: number
  }) {
    return this.updateUserProfile(userId, profileData)
  },

  // Check if user is admin
  async isUserAdmin(userId: string) {
    try {
      const user = await this.getUserProfile(userId)
      return user.role === 'admin'
    } catch (error) {
      console.error('Error checking admin status:', error)
      return false
    }
  },

  // Get all users (admin only)
  async getAllUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all users:', error)
      throw error
    }

    return data
  },

  // Update user role (admin only)
  async updateUserRole(userId: string, role: 'admin' | 'participant') {
    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user role:', error)
      throw error
    }

    return data
  }
}