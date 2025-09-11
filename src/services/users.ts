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
    avatar_seed?: string
    avatar_saturation?: number
    avatar_lightness?: number
  }) {
    return this.updateUserProfile(userId, profileData)
  },

  // Generate avatar seed for user if not exists
  async generateAvatarSeedIfNeeded(userId: string) {
    try {
      const user = await this.getUserProfile(userId)
      
      // If user already has avatar_seed, don't generate new one
      if (user.avatar_seed) {
        return user.avatar_seed
      }
      
      // Generate new avatar_seed based on user data
      const seed = `${user.email || 'user'}_${Date.now()}`
      
      // Update user with new avatar_seed
      await this.updateUserProfile(userId, {
        avatar_seed: seed
      })
      
      console.log('✅ Generated avatar_seed for user:', userId)
      return seed
    } catch (error) {
      console.error('Error generating avatar seed:', error)
      return null
    }
  },

  // Batch generate avatar seeds for all users who don't have one
  async batchGenerateAvatarSeeds() {
    try {
      console.log('🔄 Starting batch avatar_seed generation...')
      
      // Get all users without avatar_seed
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, name, avatar_seed')
        .is('avatar_seed', null)
      
      if (error) {
        console.error('Error fetching users without avatar_seed:', error)
        throw error
      }
      
      if (!users || users.length === 0) {
        console.log('✅ All users already have avatar_seed')
        return { updated: 0, total: 0 }
      }
      
      console.log(`📝 Found ${users.length} users without avatar_seed`)
      
      let updated = 0
      const batchSize = 10 // Process in batches to avoid overwhelming the database
      
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize)
        
        // Process batch in parallel
        const promises = batch.map(async (user) => {
          try {
            const seed = `${user.email || 'user'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            const { error: updateError } = await supabase
              .from('users')
              .update({ avatar_seed: seed })
              .eq('id', user.id)
            
            if (updateError) {
              console.error(`❌ Failed to update avatar_seed for user ${user.id}:`, updateError)
              return false
            }
            
            console.log(`✅ Generated avatar_seed for user: ${user.name || user.email}`)
            return true
          } catch (error) {
            console.error(`❌ Error processing user ${user.id}:`, error)
            return false
          }
        })
        
        const results = await Promise.all(promises)
        updated += results.filter(Boolean).length
        
        // Small delay between batches
        if (i + batchSize < users.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      console.log(`🎉 Batch generation complete: ${updated}/${users.length} users updated`)
      return { updated, total: users.length }
    } catch (error) {
      console.error('❌ Error in batch avatar_seed generation:', error)
      throw error
    }
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

// Expose batch generation function globally for easy access in console
// Usage: window.batchGenerateAvatarSeeds()
if (typeof window !== 'undefined') {
  (window as any).batchGenerateAvatarSeeds = userService.batchGenerateAvatarSeeds.bind(userService)
}