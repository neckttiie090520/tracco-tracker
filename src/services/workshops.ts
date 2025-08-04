import { supabase } from './supabase'
import { Database } from '../types/database'
import { notificationManager } from './notificationManager'
import { cacheService, CACHE_KEYS } from './cacheService'

type Workshop = Database['public']['Tables']['workshops']['Row']
type WorkshopInsert = Database['public']['Tables']['workshops']['Insert']
type WorkshopRegistration = Database['public']['Tables']['workshop_registrations']['Row']

export const workshopService = {
  // Get all workshops (alias for compatibility)
  async getAllWorkshops() {
    return this.getWorkshops()
  },

  // Get all active workshops
  async getWorkshops() {
    // Check cache first
    const cacheKey = CACHE_KEYS.workshops
    const cached = cacheService.get<Workshop[]>(cacheKey)
    if (cached) {
      return cached
    }

    const { data, error } = await supabase
      .from('workshops')
      .select('*')
      .eq('is_active', true)
      .order('start_time', { ascending: true, nullsFirst: true })

    if (error) {
      console.error('Error fetching workshops:', error)
      throw error
    }

    // Fetch instructor names separately if workshops have instructors
    if (data && data.length > 0) {
      const instructorIds = [...new Set(data.map(w => w.instructor).filter(Boolean))]
      
      if (instructorIds.length > 0) {
        const { data: instructors } = await supabase
          .from('users')
          .select('id, name')
          .in('id', instructorIds)
        
        if (instructors) {
          const instructorMap = Object.fromEntries(
            instructors.map(i => [i.id, i])
          )
          
          data.forEach(workshop => {
            if (workshop.instructor && instructorMap[workshop.instructor]) {
              (workshop as any).instructor_user = { name: instructorMap[workshop.instructor].name }
            }
          })
        }
      }
    }

    // Cache the result
    if (data) {
      cacheService.set(cacheKey, data, 5 * 60 * 1000) // 5 minutes
    }

    return data
  },

  // Get workshop by ID with details
  async getWorkshopById(id: string) {
    // Check cache first
    const cacheKey = CACHE_KEYS.workshop(id)
    const cached = cacheService.get<Workshop>(cacheKey)
    if (cached) {
      return cached
    }

    const { data, error } = await supabase
      .from('workshops')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching workshop:', error)
      throw error
    }

    // Fetch instructor name if workshop has instructor
    if (data && data.instructor) {
      const { data: instructor } = await supabase
        .from('users')
        .select('id, name')
        .eq('id', data.instructor)
        .single()
      
      if (instructor) {
        (data as any).instructor_user = { name: instructor.name }
      }
    }

    // Cache the result
    if (data) {
      cacheService.set(cacheKey, data, 5 * 60 * 1000) // 5 minutes
    }

    return data
  },

  // Get user's registered workshops
  async getUserWorkshops(userId: string) {
    const { data, error } = await supabase
      .from('workshop_registrations')
      .select('*, workshops(*)')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching user workshops:', error)
      throw error
    }

    return data
  },

  // Register for a workshop
  async registerForWorkshop(workshopId: string, userId: string) {
    const { data, error } = await supabase
      .from('workshop_registrations')
      .insert({
        workshop_id: workshopId,
        user_id: userId
      })
      .select()

    if (error) {
      console.error('Error registering for workshop:', error)
      throw error
    }

    // Send registration confirmation email
    notificationManager.sendRegistrationConfirmation(workshopId, userId)
      .catch(err => console.error('Failed to send registration confirmation:', err));

    // Notify admins of new registration
    notificationManager.sendAdminNotification('new_registration', workshopId, { userId })
      .catch(err => console.error('Failed to send admin notification:', err));

    return data
  },

  // Unregister from a workshop
  async unregisterFromWorkshop(workshopId: string, userId: string) {
    const { error } = await supabase
      .from('workshop_registrations')
      .delete()
      .eq('workshop_id', workshopId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error unregistering from workshop:', error)
      throw error
    }

    // Notify admins of cancellation
    notificationManager.sendAdminNotification('cancellation', workshopId, { userId })
      .catch(err => console.error('Failed to send admin notification:', err));
  },

  // Check if user is registered for workshop
  async isUserRegistered(workshopId: string, userId: string) {
    const { data, error } = await supabase
      .from('workshop_registrations')
      .select('id')
      .eq('workshop_id', workshopId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking registration:', error)
      throw error
    }

    return !!data
  },

  // Get workshop participants (admin only)
  async getWorkshopParticipants(workshopId: string) {
    const { data, error } = await supabase
      .from('workshop_registrations')
      .select(`
        *,
        user:users(id, name, email, faculty, department)
      `)
      .eq('workshop_id', workshopId)
      .order('registered_at', { ascending: true })

    if (error) {
      console.error('Error fetching participants:', error)
      throw error
    }

    return data
  },

  // Create workshop (admin only)
  async createWorkshop(workshop: WorkshopInsert) {
    const { data, error } = await supabase
      .from('workshops')
      .insert(workshop)
      .select()
      .single()

    if (error) {
      console.error('Error creating workshop:', error)
      throw error
    }

    return data
  },

  // Update workshop (admin only)
  async updateWorkshop(id: string, updates: Partial<WorkshopInsert>) {
    const { data, error } = await supabase
      .from('workshops')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating workshop:', error)
      throw error
    }

    // Send update notifications to participants
    notificationManager.sendWorkshopUpdate(id)
      .catch(err => console.error('Failed to send workshop update notifications:', err));

    return data
  },

  // Cancel workshop (admin only)
  async cancelWorkshop(id: string) {
    const { data, error } = await supabase
      .from('workshops')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error cancelling workshop:', error)
      throw error
    }

    // Send cancellation notifications to participants
    notificationManager.sendWorkshopCancellation(id)
      .catch(err => console.error('Failed to send workshop cancellation notifications:', err));

    return data
  }
}