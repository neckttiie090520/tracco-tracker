import { supabase } from './supabase'
import { Database } from '../types/database'

type Submission = Database['public']['Tables']['submissions']['Row']
type SubmissionInsert = Database['public']['Tables']['submissions']['Insert']

export const submissionService = {
  // Get user's submissions for a workshop
  async getUserSubmissions(userId: string, workshopId?: string) {
    let query = supabase
      .from('submissions')
      .select(`
        *,
        task:tasks!submissions_task_id_fkey(
          id, title, description, due_date, order_index,
          workshop:workshops!tasks_workshop_id_fkey(id, title)
        )
      `)
      .eq('user_id', userId)

    if (workshopId) {
      query = query.eq('task.workshop_id', workshopId)
    }

    const { data, error } = await query.order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching user submissions:', error)
      throw error
    }

    return data
  },

  // Get user's submission for a specific task
  async getUserTaskSubmission(userId: string, taskId: string) {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        task:tasks!submissions_task_id_fkey(
          id, title, description, due_date, order_index,
          workshop:workshops!tasks_workshop_id_fkey(id, title)
        )
      `)
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user task submission:', error)
      throw error
    }

    return data
  },

  // Create or update submission
  async upsertSubmission(submissionData: SubmissionInsert) {
    const { data, error } = await supabase
      .from('submissions')
      .upsert(submissionData, {
        onConflict: 'task_id,user_id'
      })
      .select(`
        *,
        task:tasks!submissions_task_id_fkey(
          id, title, description, due_date, order_index,
          workshop:workshops!tasks_workshop_id_fkey(id, title)
        )
      `)
      .single()

    if (error) {
      console.error('Error upserting submission:', error)
      throw error
    }

    return data
  },

  // Update submission with review (admin only)
  async reviewSubmission(submissionId: string, review: {
    feedback?: string
    grade?: string
    reviewedBy: string
  }) {
    const { data, error } = await supabase
      .from('submissions')
      .update({
        status: 'reviewed',
        feedback: review.feedback,
        grade: review.grade,
        reviewed_by: review.reviewedBy,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select(`
        *,
        task:tasks!submissions_task_id_fkey(id, title, description),
        user:users!submissions_user_id_fkey(id, name, email)
      `)
      .single()

    if (error) {
      console.error('Error reviewing submission:', error)
      throw error
    }

    return data
  },

  // Upload file to Supabase Storage
  async uploadFile(file: File, userId: string, taskId: string) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${taskId}/${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('workshop-files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Error uploading file:', error)
      throw error
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('workshop-files')
      .getPublicUrl(fileName)

    return {
      path: data.path,
      publicUrl
    }
  },

  // Delete file from Supabase Storage
  async deleteFile(filePath: string) {
    const { error } = await supabase.storage
      .from('workshop-files')
      .remove([filePath])

    if (error) {
      console.error('Error deleting file:', error)
      throw error
    }
  },

  // Get all submissions for a task (admin only)
  async getTaskSubmissions(taskId: string) {
    console.log('getTaskSubmissions called with taskId:', taskId)
    
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('task_id', taskId)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error fetching task submissions:', error)
      throw error
    }

    console.log('Raw submissions data:', data)
    console.log('Number of submissions found:', data?.length || 0)

    // Fetch user details separately
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(s => s.user_id))]
      const { data: users } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', userIds)

      console.log('Users fetched:', users)

      // Map users to submissions
      const result = data.map(submission => ({
        ...submission,
        user: users?.find(u => u.id === submission.user_id) || null
      }))
      
      console.log('Final result with users:', result)
      return result
    }

    console.log('No submissions found, returning empty array')
    return data || []
  },

  // Get all submissions for a workshop (admin only)
  async getWorkshopSubmissions(workshopId: string) {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        user:users!submissions_user_id_fkey(id, name, email),
        task:tasks!submissions_task_id_fkey(id, title, description, order_index)
      `)
      .eq('task.workshop_id', workshopId)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error fetching workshop submissions:', error)
      throw error
    }

    return data
  },

  // Get submission by ID
  async getSubmissionById(submissionId: string) {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        user:users!submissions_user_id_fkey(id, name, email),
        task:tasks!submissions_task_id_fkey(id, title, description, workshop_id)
      `)
      .eq('id', submissionId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching submission:', error)
      throw error
    }

    return data
  }
}