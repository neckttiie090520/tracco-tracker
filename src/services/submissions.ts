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

  // Delete a user's submission for a specific task
  async deleteUserTaskSubmission(userId: string, taskId: string) {
    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('user_id', userId)
      .eq('task_id', taskId)

    if (error) {
      console.error('Error deleting user task submission:', error)
      throw error
    }
  },

  // Delete a group submission for a specific task
  async deleteGroupTaskSubmission(taskId: string, groupId: string) {
    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('task_id', taskId)
      .eq('group_id', groupId)

    if (error) {
      console.error('Error deleting group task submission:', error)
      throw error
    }
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
  async upsertSubmission(submissionData: SubmissionInsert & { links?: string[] }) {
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

  // Get a group's submission for a specific task
  async getGroupTaskSubmission(taskId: string, groupId: string) {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        task:tasks!submissions_task_id_fkey(
          id, title, description, due_date, order_index,
          workshop:workshops!tasks_workshop_id_fkey(id, title)
        )
      `)
      .eq('task_id', taskId)
      .eq('group_id', groupId)
      .maybeSingle()

    if (error && (error as any).code !== 'PGRST116') {
      console.error('Error fetching group task submission:', error)
      throw error
    }

    return data
  },

  // Upsert a submission for a group (one per group per task)
  async upsertGroupSubmission(submissionData: SubmissionInsert & { group_id: string, links?: string[] }) {
    // First, delete any existing submissions for this task_id and group_id to avoid conflicts
    const { error: deleteError } = await supabase
      .from('submissions')
      .delete()
      .eq('task_id', submissionData.task_id)
      .eq('group_id', submissionData.group_id)

    if (deleteError) {
      console.error('Error cleaning up existing group submission:', deleteError)
      // Don't throw here, just log - we can continue with insert
    }

    // Now insert the new group submission
    // For group submissions, create a deterministic UUID-like string based on group_id and task_id
    // Simple approach: use parts of group_id and task_id to create a valid UUID format
    const groupId = submissionData.group_id.replace(/-/g, '')
    const taskId = submissionData.task_id.replace(/-/g, '')
    // Create a pseudo-UUID by mixing group and task IDs: take first 16 chars of group + first 16 of task
    const mixed = (groupId + taskId).substring(0, 32)
    const groupUserId = `${mixed.substring(0,8)}-${mixed.substring(8,12)}-${mixed.substring(12,16)}-${mixed.substring(16,20)}-${mixed.substring(20,32)}`
    
    const { data, error } = await supabase
      .from('submissions')
      .insert({
        task_id: submissionData.task_id,
        user_id: groupUserId, // Use unique group-based user_id to avoid constraint conflicts
        group_id: submissionData.group_id,
        notes: submissionData.notes ?? null,
        submission_url: submissionData.submission_url ?? null,
        links: submissionData.links ?? null,
        file_url: submissionData.file_url ?? null,
        status: submissionData.status ?? 'submitted',
        submitted_at: submissionData.submitted_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString()
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
      console.error('Error inserting group submission:', error)
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

  // Helper to normalize links list (ensure submission_url is first entry)
  normalizeLinks(primaryUrl?: string | null, links?: string[] | null): string[] | undefined {
    const arr = [primaryUrl, ...(links || [])].filter((u): u is string => !!u && u.trim().length > 0)
    if (arr.length === 0) return undefined
    // de-duplicate while preserving order
    const seen = new Set<string>()
    const out: string[] = []
    for (const u of arr) { if (!seen.has(u)) { seen.add(u); out.push(u) } }
    return out
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
