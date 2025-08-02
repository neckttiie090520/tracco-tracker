import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zamluhrkxjoazssxctmd.supabase.co'
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphbWx1aHJreGpvYXpzc3hjdG1kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzg5MDIzMCwiZXhwIjoyMDY5NDY2MjMwfQ.MU0aQ0CQsoV2XGtsvBdyLx2TMDeskmiwZhOvTImQOU4'

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase admin environment variables')
}

// Create admin client with service role key (bypasses RLS)
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Admin-only operations that bypass RLS
export const adminOperations = {
  async createWorkshop(workshopData: any) {
    console.log('🔥 Using ADMIN CLIENT for workshop creation')
    console.log('Admin client URL:', supabaseUrl)
    console.log('Service key length:', supabaseServiceKey?.length)
    
    const { data, error } = await adminClient
      .from('workshops')
      .insert(workshopData)
      .select('*')
      .single()

    if (error) {
      console.error('Admin create workshop error:', error)
      throw error
    }

    console.log('✅ Admin create workshop success:', data)
    return data
  },

  async updateWorkshop(workshopId: string, updates: any) {
    const { data, error } = await adminClient
      .from('workshops')
      .update(updates)
      .eq('id', workshopId)
      .select('*')

    if (error) {
      console.error('Admin update workshop error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error(`Workshop with ID ${workshopId} not found`)
    }

    return data[0]
  },

  async deleteWorkshop(workshopId: string) {
    const { error } = await adminClient
      .from('workshops')
      .delete()
      .eq('id', workshopId)

    if (error) {
      console.error('Admin delete workshop error:', error)
      throw error
    }
  },

  async getAllWorkshops() {
    const { data, error } = await adminClient
      .from('workshops')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Admin get workshops error:', error)
      throw error
    }

    return data
  },

  // Material operations
  async createMaterial(materialData: any) {
    const { data, error } = await adminClient
      .from('workshop_materials')
      .insert(materialData)
      .select('*')
      .single()

    if (error) {
      console.error('Admin create material error:', error)
      throw error
    }

    return data
  },

  async updateMaterial(materialId: string, updates: any) {
    const { data, error } = await adminClient
      .from('workshop_materials')
      .update(updates)
      .eq('id', materialId)
      .select('*')

    if (error) {
      console.error('Admin update material error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error(`Material with ID ${materialId} not found`)
    }

    return data[0]
  },

  async deleteMaterial(materialId: string) {
    const { error } = await adminClient
      .from('workshop_materials')
      .update({ is_active: false })
      .eq('id', materialId)

    if (error) {
      console.error('Admin delete material error:', error)
      throw error
    }
  },

  async getMaterialsByWorkshop(workshopId: string) {
    const { data, error } = await adminClient
      .from('workshop_materials')
      .select('*')
      .eq('workshop_id', workshopId)
      .eq('is_active', true)
      .order('order_index')

    if (error) {
      console.error('Admin get materials error:', error)
      throw error
    }

    return data
  },

  // Session Materials Operations
  async createSessionMaterial(materialData: any) {
    const { data, error } = await adminClient
      .from('session_materials')
      .insert(materialData)
      .select('*')
      .single()

    if (error) {
      console.error('Admin create session material error:', error)
      throw error
    }

    return data
  },

  async updateSessionMaterial(materialId: string, updates: any) {
    const { data, error } = await adminClient
      .from('session_materials')
      .update(updates)
      .eq('id', materialId)
      .select('*')

    if (error) {
      console.error('Admin update session material error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error(`Session material with ID ${materialId} not found`)
    }

    return data[0]
  },

  async deleteSessionMaterial(materialId: string) {
    const { error } = await adminClient
      .from('session_materials')
      .update({ is_active: false })
      .eq('id', materialId)

    if (error) {
      console.error('Admin delete session material error:', error)
      throw error
    }
  },

  async getMaterialsBySession(sessionId: string) {
    const { data, error } = await adminClient
      .from('session_materials')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .order('order_index')

    if (error) {
      console.error('Admin get session materials error:', error)
      throw error
    }

    return data
  },

  // Participant management operations
  async getWorkshopParticipants(workshopId: string) {
    const { data, error } = await adminClient
      .from('workshop_registrations')
      .select(`
        *,
        user:users(*),
        workshop:workshops(*)
      `)
      .eq('workshop_id', workshopId)
      .order('registered_at', { ascending: true })

    if (error) {
      console.error('Admin get workshop participants error:', error)
      throw error
    }

    return data
  },

  async getAllParticipants() {
    // Get all users with participant role
    const { data: users, error: usersError } = await adminClient
      .from('users')
      .select('*')
      .eq('role', 'participant')
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Admin get all participants error:', usersError)
      throw usersError
    }

    if (!users || users.length === 0) {
      return []
    }

    // Get their registrations (if any)
    const { data: registrations, error: regError } = await adminClient
      .from('workshop_registrations')
      .select(`
        *,
        workshop:workshops(*)
      `)
      .in('user_id', users.map(u => u.id))

    if (regError) {
      console.error('Admin get registrations error:', regError)
      // Don't throw error, just continue without registrations
    }

    // Combine users with their registrations
    const result = users.map(user => {
      const userRegistrations = registrations?.filter(reg => reg.user_id === user.id) || []
      
      if (userRegistrations.length > 0) {
        // Return multiple entries for users with multiple registrations
        return userRegistrations.map(registration => ({
          id: registration.id,
          user_id: user.id,
          workshop_id: registration.workshop_id,
          registered_at: registration.registered_at,
          status: registration.status,
          user: user,
          workshop: registration.workshop
        }))
      } else {
        // Return single entry for users without registrations
        return [{
          id: `user-${user.id}`,
          user_id: user.id,
          workshop_id: null,
          registered_at: user.created_at,
          status: 'no_registration',
          user: user,
          workshop: null
        }]
      }
    }).flat()

    return result
  },

  // Task operations
  async createTask(taskData: any) {
    const { data, error } = await adminClient
      .from('tasks')
      .insert({
        ...taskData,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        workshop:workshops!tasks_workshop_id_fkey(id, title)
      `)
      .single()

    if (error) {
      console.error('Admin create task error:', error)
      throw error
    }

    return data
  },

  async updateTask(taskId: string, updates: any) {
    // Remove any fields that don't exist in the tasks table
    const { materials, ...validUpdates } = updates
    
    const { data, error } = await adminClient
      .from('tasks')
      .update({
        ...validUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select(`
        *,
        workshop:workshops!tasks_workshop_id_fkey(id, title)
      `)

    if (error) {
      console.error('Admin update task error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error(`Task with ID ${taskId} not found`)
    }

    return data[0]
  },

  async deleteTask(taskId: string) {
    // First delete all submissions for this task
    const { error: submissionsError } = await adminClient
      .from('submissions')
      .delete()
      .eq('task_id', taskId)
    
    if (submissionsError) {
      console.error('Error deleting task submissions:', submissionsError)
      throw submissionsError
    }

    // Then delete the task itself (hard delete)
    const { data, error } = await adminClient
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('Admin delete task error:', error)
      throw error
    }

    return data
  },

  async getAllTasks() {
    const { data, error } = await adminClient
      .from('tasks')
      .select(`
        *,
        workshop:workshops!tasks_workshop_id_fkey(id, title),
        submissions:submissions(id)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Admin get all tasks error:', error)
      throw error
    }

    // Transform data to include submission count
    const tasksWithCounts = data?.map(task => ({
      ...task,
      submissions: [{
        count: task.submissions?.length || 0
      }]
    })) || []

    // Fetch materials separately for each task
    for (const task of tasksWithCounts) {
      try {
        const { data: materials } = await adminClient
          .from('task_materials')
          .select('*')
          .eq('task_id', task.id)
          .eq('is_active', true)
          .order('order_index')
        
        task.materials = materials || []
      } catch (error) {
        console.log(`No materials found for task ${task.id}`)
        task.materials = []
      }
    }

    return tasksWithCounts
  },

  // Get all submissions for a task (admin only)
  async getTaskSubmissions(taskId: string) {
    console.log('Admin getTaskSubmissions called with taskId:', taskId)
    
    const { data, error } = await adminClient
      .from('submissions')
      .select('*')
      .eq('task_id', taskId)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Admin get task submissions error:', error)
      throw error
    }

    console.log('Admin raw submissions data:', data)
    console.log('Admin number of submissions found:', data?.length || 0)

    // Fetch user details separately
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(s => s.user_id))]
      const { data: users } = await adminClient
        .from('users')
        .select('id, name, email')
        .in('id', userIds)

      console.log('Admin users fetched:', users)

      // Map users to submissions
      const result = data.map(submission => ({
        ...submission,
        user: users?.find(u => u.id === submission.user_id) || null
      }))
      
      console.log('Admin final result with users:', result)
      return result
    }

    console.log('Admin no submissions found, returning empty array')
    return data || []
  },

  // Public endpoint for users to get workshop tasks
  async getWorkshopTasks(workshopId: string) {
    const { data, error } = await adminClient
      .from('tasks')
      .select(`
        *,
        workshop:workshops!tasks_workshop_id_fkey(id, title),
        submissions:submissions!left(id, user_id, status, submitted_at, updated_at)
      `)
      .eq('workshop_id', workshopId)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Admin get workshop tasks error:', error)
      throw error
    }

    const tasks = data || []

    // Fetch materials separately for each task
    for (const task of tasks) {
      try {
        const { data: materials } = await adminClient
          .from('task_materials')
          .select('*')
          .eq('task_id', task.id)
          .eq('is_active', true)
          .order('order_index')
        
        task.materials = materials || []
      } catch (error) {
        console.log(`No materials found for task ${task.id}`)
        task.materials = []
      }
    }

    return tasks
  }
}

export const supabaseAdmin = {
  client: adminClient,
  adminOperations
}