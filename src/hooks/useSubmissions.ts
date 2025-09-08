import { useState, useEffect } from 'react'
import { submissionService } from '../services/submissions'
import { adminService } from '../services/admin'
import { useAuth } from './useAuth'

export function useUserSubmissions(workshopId?: string) {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubmissions = async () => {
    if (!user) {
      setSubmissions([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await submissionService.getUserSubmissions(user.id, workshopId)
      setSubmissions(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch submissions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmissions()
  }, [user, workshopId])

  return {
    submissions,
    loading,
    error,
    refetch: fetchSubmissions
  }
}

export function useTaskSubmission(taskId: string) {
  const { user } = useAuth()
  const [submission, setSubmission] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const fetchSubmission = async () => {
    if (!user || !taskId) {
      setSubmission(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await submissionService.getUserTaskSubmission(user.id, taskId)
      setSubmission(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch submission')
    } finally {
      setLoading(false)
    }
  }

  const submitTask = async (submissionData: {
    notes?: string
    submission_url?: string
    links?: string[]
    file?: File
  }) => {
    if (!user || !taskId) throw new Error('User or task not available')

    try {
      setUploading(true)
      setError(null)

      let fileUrl = null
      if (submissionData.file) {
        const fileResult = await submissionService.uploadFile(
          submissionData.file,
          user.id,
          taskId
        )
        fileUrl = fileResult.publicUrl
      }

      const upsertData = {
        task_id: taskId,
        user_id: user.id,
        notes: submissionData.notes || null,
        submission_url: submissionData.submission_url || null,
        links: submissionService.normalizeLinks(submissionData.submission_url || null, submissionData.links || []),
        file_url: fileUrl,
        status: 'submitted' as const,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const updatedSubmission = await submissionService.upsertSubmission(upsertData)
      setSubmission(updatedSubmission)
      return updatedSubmission
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit task')
      throw err
    } finally {
      setUploading(false)
    }
  }

  const updateSubmission = async (updates: {
    notes?: string
    submission_url?: string
    links?: string[]
    file?: File
  }) => {
    if (!user || !taskId) throw new Error('User or task not available')

    try {
      setUploading(true)
      setError(null)

      let fileUrl = submission?.file_url
      if (updates.file) {
        // Delete old file if exists
        if (submission?.file_url) {
          const oldPath = submission.file_url.split('/').pop()
          if (oldPath) {
            try {
              await submissionService.deleteFile(`${user.id}/${taskId}/${oldPath}`)
            } catch (error) {
              console.warn('Failed to delete old file:', error)
            }
          }
        }

        const fileResult = await submissionService.uploadFile(
          updates.file,
          user.id,
          taskId
        )
        fileUrl = fileResult.publicUrl
      }

      const upsertData = {
        task_id: taskId,
        user_id: user.id,
        notes: updates.notes !== undefined ? updates.notes : submission?.notes,
        submission_url: updates.submission_url !== undefined ? updates.submission_url : submission?.submission_url,
        links: submissionService.normalizeLinks(
          (updates.submission_url !== undefined ? updates.submission_url : submission?.submission_url) || null,
          updates.links || (submission?.links as any) || []
        ),
        file_url: fileUrl,
        status: 'submitted' as const,
        updated_at: new Date().toISOString()
      }

      const updatedSubmission = await submissionService.upsertSubmission(upsertData)
      setSubmission(updatedSubmission)
      return updatedSubmission
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update submission')
      throw err
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    fetchSubmission()
  }, [user, taskId])

  return {
    submission,
    loading,
    error,
    uploading,
    submitTask,
    updateSubmission,
    refetch: fetchSubmission
  }
}

export function useTaskSubmissions(taskId: string) {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubmissions = async () => {
    if (!taskId) {
      setSubmissions([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      console.log('Fetching submissions for task:', taskId)
      // Use adminService instead of submissionService for admin operations
      const data = await adminService.getTaskSubmissions(taskId)
      console.log('Task submissions fetched:', data)
      setSubmissions(data || [])
    } catch (err) {
      console.error('Error in useTaskSubmissions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch task submissions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmissions()
  }, [taskId])

  return {
    submissions,
    loading,
    error,
    refetch: fetchSubmissions
  }
}
