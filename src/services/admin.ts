import { supabase } from './supabase'
import { adminOperations } from './supabaseAdmin'
import { Database } from '../types/database'
import { MaterialService } from './materials'
import { TaskMaterialService } from './taskMaterials'
import type { WorkshopMaterial } from '../types/materials'

type Workshop = Database['public']['Tables']['workshops']['Row']
type WorkshopInsert = Database['public']['Tables']['workshops']['Insert']

export const adminService = {
  // Get dashboard statistics
  async getDashboardStats() {
    try {
      const [
        { count: totalWorkshops },
        { count: totalParticipants },
        { count: activeWorkshops },
        { data: recentRegistrations }
      ] = await Promise.all([
        supabase.from('workshops').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'participant'),
        supabase.from('workshops').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase
          .from('workshop_registrations')
          .select('*, workshops(title), users(name, email)')
          .order('registered_at', { ascending: false })
          .limit(5)
      ])

      return {
        totalWorkshops: totalWorkshops || 0,
        totalParticipants: totalParticipants || 0,
        activeWorkshops: activeWorkshops || 0,
        recentRegistrations: recentRegistrations || []
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      throw error
    }
  },

  // Get all workshops for admin management
  async getAllWorkshopsForAdmin() {
    try {
      return await adminOperations.getAllWorkshops()
    } catch (error) {
      console.error('Error fetching admin workshops:', error)
      throw error
    }
  },

  // Create workshop (admin only)
  async createWorkshop(workshopData: WorkshopInsert, materials?: WorkshopMaterial[]) {
    console.log('🚀 Admin service createWorkshop called')
    try {
      // First, create the workshop
      const workshop = await adminOperations.createWorkshop(workshopData)
      console.log('✅ Workshop created:', workshop)
      
      // Then, create materials if provided
      if (materials && materials.length > 0) {
        console.log('📚 Creating materials for workshop:', workshop.id)
        for (const material of materials) {
          const materialData = {
            ...material,
            workshop_id: workshop.id,
          }
          delete materialData.id // Remove temporary ID
          await MaterialService.createMaterial(materialData)
        }
        console.log('✅ Materials created successfully')
      }
      
      return workshop
    } catch (error) {
      console.error('❌ Admin service create error:', error)
      throw error
    }
  },

  // Update workshop (admin only)
  async updateWorkshop(workshopId: string, updates: Partial<WorkshopInsert>) {
    try {
      return await adminOperations.updateWorkshop(workshopId, updates)
    } catch (error) {
      console.error('Error updating workshop:', error)
      throw error
    }
  },

  // Delete workshop (admin only)
  async deleteWorkshop(workshopId: string) {
    try {
      return await adminOperations.deleteWorkshop(workshopId)
    } catch (error) {
      console.error('Error deleting workshop:', error)
      throw error
    }
  },

  // Get workshop participants with details
  async getWorkshopParticipants(workshopId: string) {
    return await adminOperations.getWorkshopParticipants(workshopId)
  },

  // Get all participants across all workshops
  async getAllParticipants() {
    return await adminOperations.getAllParticipants()
  },

  // Export participants as CSV
  exportParticipantsCSV(participants: any[]) {
    const headers = ['Name', 'Email', 'Role', 'Faculty', 'Department', 'Workshop', 'Registration Date']
    const csvContent = [
      headers.join(','),
      ...participants.map(p => [
        p.user?.name || 'Unknown',
        p.user?.email || 'No email',
        p.user?.role || 'participant',
        p.user?.faculty || 'Not specified',
        p.user?.department || 'Not specified',
        p.workshop?.title || 'No workshop assigned',
        new Date(p.registered_at).toLocaleDateString()
      ].map(field => `"${field}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `workshop-participants-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  },

  // Random name picker
  getRandomParticipant(participants: any[]) {
    if (participants.length === 0) return null
    const randomIndex = Math.floor(Math.random() * participants.length)
    return participants[randomIndex]
  },

  // Task operations
  async createTask(taskData: any) {
    try {
      console.log('🚀 Admin service createTask called with:', taskData)
      
      // Extract materials from taskData
      const { materials, ...taskInfo } = taskData
      
      // First, create the task
      const task = await adminOperations.createTask(taskInfo)
      console.log('✅ Admin service task created successfully:', task)
      
      // Then, create materials if provided and not empty
      if (materials && Array.isArray(materials) && materials.length > 0) {
        console.log('📚 Creating materials for task:', task.id)
        console.log('📝 Number of materials to create:', materials.length)
        console.log('📋 Task materials to create:', materials)
        
        await TaskMaterialService.createMaterials(task.id, materials)
      } else {
        console.log('📭 No materials to create for task:', task.id)
      }
      
      return task
    } catch (error) {
      console.error('❌ Admin service task creation error:', error)
      throw error
    }
  },

  async updateTask(taskId: string, updates: any) {
    try {
      // Extract materials from updates
      const { materials, ...taskUpdates } = updates
      
      // Update the task without materials field
      const updatedTask = await adminOperations.updateTask(taskId, taskUpdates)
      
      // Handle materials separately
      if (materials !== undefined && Array.isArray(materials)) {
        console.log('📝 Task materials to update for task:', taskId)
        console.log('📋 Number of materials:', materials.length)
        if (materials.length > 0) {
          console.log('📚 Materials data:', materials)
        }
        await TaskMaterialService.updateMaterials(taskId, materials)
      }
      
      return updatedTask
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    }
  },

  async deleteTask(taskId: string) {
    try {
      console.log('adminService.deleteTask called with taskId:', taskId)
      const result = await adminOperations.deleteTask(taskId)
      console.log('adminOperations.deleteTask result:', result)
      return result
    } catch (error) {
      console.error('Error deleting task in adminService:', error)
      throw error
    }
  },

  async getAllTasks() {
    try {
      return await adminOperations.getAllTasks()
    } catch (error) {
      console.error('Error fetching all tasks:', error)
      throw error
    }
  },

  async getWorkshopTasks(workshopId: string) {
    try {
      return await adminOperations.getWorkshopTasks(workshopId)
    } catch (error) {
      console.error('Error fetching workshop tasks:', error)
      throw error
    }
  },

  async getTaskSubmissions(taskId: string) {
    try {
      return await adminOperations.getTaskSubmissions(taskId)
    } catch (error) {
      console.error('Error fetching task submissions:', error)
      throw error
    }
  }
}