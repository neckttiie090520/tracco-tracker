import { supabase } from './supabase'
import { Database } from '../types/database'

type Task = Database['public']['Tables']['tasks']['Row']
type TaskInsert = Database['public']['Tables']['tasks']['Insert']
type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export const taskService = {
  // Get all tasks for a workshop
  async getWorkshopTasks(workshopId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        workshop:workshops!tasks_workshop_id_fkey(id, title),
        submissions:submissions(
          count
        )
      `)
      .eq('workshop_id', workshopId)
      .eq('is_active', true)
      .eq('is_archived', false)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error fetching workshop tasks:', error)
      throw error
    }

    return data
  },

  // Get all tasks (admin only)
  async getAllTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        workshop:workshops!tasks_workshop_id_fkey(id, title),
        submissions:submissions(
          count
        )
      `)
      .eq('is_active', true)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all tasks:', error)
      throw error
    }

    return data
  },

  // Get task by ID with details
  async getTaskById(taskId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        workshop:workshops!tasks_workshop_id_fkey(id, title, description),
        submissions:submissions(
          id, user_id, status, submitted_at, updated_at,
          user:users(id, name, email)
        )
      `)
      .eq('id', taskId)
      .eq('is_active', true)
      .eq('is_archived', false)
      .single()

    if (error) {
      console.error('Error fetching task:', error)
      throw error
    }

    return data
  },

  // Get user's tasks (for a specific workshop or all workshops)
  async getUserTasks(userId: string, workshopId?: string) {
    let query = supabase
      .from('tasks')
      .select(`
        *,
        workshop:workshops!tasks_workshop_id_fkey(id, title),
        submissions:submissions!left(id, status, submitted_at, updated_at)
      `)
      .eq('is_active', true)
      .eq('is_archived', false)

    // Filter by workshop if specified, otherwise get all tasks
    if (workshopId) {
      query = query.eq('workshop_id', workshopId)
    }
    // No registration filtering - all authenticated users can see all tasks

    // Filter submissions to only show the current user's submission
    const { data, error } = await query
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error fetching user tasks:', error)
      throw error
    }

    // Filter submissions to only include the current user's submission
    return data?.map(task => ({
      ...task,
      submissions: task.submissions?.filter((sub: any) => sub.user_id === userId) || []
    })) || []
  },

  // Create new task (admin only)
  async createTask(taskData: TaskInsert) {
    const { data, error } = await supabase
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
      console.error('Error creating task:', error)
      throw error
    }

    return data
  },

  // Update task (admin only)
  async updateTask(taskId: string, updates: Partial<TaskUpdate>) {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select(`
        *,
        workshop:workshops!tasks_workshop_id_fkey(id, title)
      `)
      .single()

    if (error) {
      console.error('Error updating task:', error)
      throw error
    }

    return data
  },

  // Delete task (admin only) - soft delete by setting is_active to false
  async deleteTask(taskId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('Error deleting task:', error)
      throw error
    }

    return data
  },

  // Reorder tasks within a workshop
  async reorderTasks(workshopId: string, taskIds: string[]) {
    const updates = taskIds.map((taskId, index) => ({
      id: taskId,
      order_index: index + 1,
      updated_at: new Date().toISOString()
    }))

    const { data, error } = await supabase
      .from('tasks')
      .upsert(updates)
      .select()

    if (error) {
      console.error('Error reordering tasks:', error)
      throw error
    }

    return data
  },

  // Get task statistics (admin only)
  async getTaskStatistics(taskId: string) {
    const { data, error } = await supabase
      .from('submissions')
      .select('status')
      .eq('task_id', taskId)

    if (error) {
      console.error('Error fetching task statistics:', error)
      throw error
    }

    const stats = {
      total: data.length,
      submitted: data.filter(s => s.status === 'submitted').length,
      draft: data.filter(s => s.status === 'draft').length,
      reviewed: data.filter(s => s.status === 'reviewed').length
    }

    return stats
  },

  // Duplicate task to another workshop (admin only)
  async duplicateTask(taskId: string, targetWorkshopId: string) {
    // Get the original task
    const { data: originalTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (fetchError) {
      console.error('Error fetching task to duplicate:', fetchError)
      throw fetchError
    }

    // Create new task with similar data
    const { data: newTask, error: createError } = await supabase
      .from('tasks')
      .insert({
        workshop_id: targetWorkshopId,
        title: `${originalTask.title} (Copy)`,
        description: originalTask.description,
        due_date: originalTask.due_date,
        order_index: originalTask.order_index,
        is_active: true
      })
      .select(`
        *,
        workshop:workshops!tasks_workshop_id_fkey(id, title)
      `)
      .single()

    if (createError) {
      console.error('Error duplicating task:', createError)
      throw createError
    }

    return newTask
  },

  // Get tasks with submission counts for admin dashboard
  async getTasksWithSubmissionCounts() {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        workshop:workshops!tasks_workshop_id_fkey(id, title),
        submission_stats:submissions(count)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tasks with submission counts:', error)
      throw error
    }

    return data
  },

  // Get all submissions for a specific task (admin only)
  async getTaskSubmissions(taskId: string) {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        user:users!submissions_user_id_fkey(id, name, email)
      `)
      .eq('task_id', taskId)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error fetching task submissions:', error)
      throw error
    }

    return data
  },

  // Get user's submission for a specific task
  async getUserTaskSubmission(userId: string, taskId: string) {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user task submission:', error)
      throw error
    }

    return data
  }
}
