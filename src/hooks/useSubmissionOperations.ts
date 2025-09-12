// Enhanced Submission Operations Hook with Loading States
// Provides loading indicators for all CRUD operations before alert boxes

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submissionService } from '../services/submissions'
import { groupService } from '../services/groups'
import { queryKeys } from '../lib/queryClient'

interface SubmissionFormData {
  notes: string
  submission_url: string
  file: File | null
  additionalUrls?: Array<{ url: string; note: string }>
}

interface UseSubmissionOperationsOptions {
  taskId: string
  userId?: string
  groupId?: string
  onSuccess?: (operation: string, data: any) => void
  onError?: (operation: string, error: any) => void
}

export function useSubmissionOperations({
  taskId,
  userId,
  groupId,
  onSuccess,
  onError
}: UseSubmissionOperationsOptions) {
  const queryClient = useQueryClient()
  
  // Loading states for different operations
  const [loadingStates, setLoadingStates] = useState({
    submitting: false,
    updating: false,
    deleting: false,
    uploading: false,
    creating_group: false,
    joining_group: false,
    leaving_group: false
  })

  // Helper to update loading state
  const setLoadingState = (operation: keyof typeof loadingStates, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [operation]: loading }))
  }

  // Submit new submission mutation
  const submitMutation = useMutation({
    mutationFn: async (formData: SubmissionFormData) => {
      setLoadingState('submitting', true)
      
      try {
        // Upload file if provided
        let fileUrl: string | null = null
        if (formData.file && userId) {
          setLoadingState('uploading', true)
          const fileResult = await submissionService.uploadFile(formData.file, userId, taskId)
          fileUrl = fileResult.publicUrl
          setLoadingState('uploading', false)
        }

        // Prepare submission data
        const submissionData = {
          task_id: taskId,
          user_id: userId!,
          group_id: groupId || null,
          notes: formData.notes || null,
          submission_url: formData.submission_url || null,
          file_url: fileUrl,
          status: 'submitted' as const,
          submitted_at: new Date().toISOString(),
        }

        // Submit based on group or individual
        const result = groupId 
          ? await submissionService.upsertGroupSubmission(submissionData)
          : await submissionService.createSubmission(submissionData)

        return result
      } finally {
        setLoadingState('uploading', false)
        setLoadingState('submitting', false)
      }
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.submissions.byTask(taskId) })
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.submissions.byUser(userId) })
      }
      
      onSuccess?.('submit', data)
      
      // Success alert after loading is complete
      setTimeout(() => {
        alert('✅ ส่งงานสำเร็จแล้ว!')
      }, 100)
    },
    onError: (error) => {
      onError?.('submit', error)
      
      // Error alert after loading is complete
      setTimeout(() => {
        alert('❌ เกิดข้อผิดพลาดในการส่งงาน: ' + (error as Error).message)
      }, 100)
    }
  })

  // Update existing submission mutation
  const updateMutation = useMutation({
    mutationFn: async ({ submissionId, formData }: { submissionId: string; formData: SubmissionFormData }) => {
      setLoadingState('updating', true)
      
      try {
        // Upload new file if provided
        let fileUrl: string | undefined = undefined
        if (formData.file && userId) {
          setLoadingState('uploading', true)
          const fileResult = await submissionService.uploadFile(formData.file, userId, taskId)
          fileUrl = fileResult.publicUrl
          setLoadingState('uploading', false)
        }

        const updateData = {
          notes: formData.notes || null,
          submission_url: formData.submission_url || null,
          ...(fileUrl && { file_url: fileUrl }),
          updated_at: new Date().toISOString(),
        }

        const result = await submissionService.updateSubmission(submissionId, updateData)
        return result
      } finally {
        setLoadingState('uploading', false)
        setLoadingState('updating', false)
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.submissions.byTask(taskId) })
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.submissions.byUser(userId) })
      }
      
      onSuccess?.('update', data)
      
      // Success alert after loading is complete
      setTimeout(() => {
        alert('✅ อัปเดตงานสำเร็จแล้ว!')
      }, 100)
    },
    onError: (error) => {
      onError?.('update', error)
      
      // Error alert after loading is complete
      setTimeout(() => {
        alert('❌ เกิดข้อผิดพลาดในการอัปเดตงาน: ' + (error as Error).message)
      }, 100)
    }
  })

  // Delete submission mutation
  const deleteMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      setLoadingState('deleting', true)
      
      try {
        await submissionService.deleteSubmission(submissionId)
        return submissionId
      } finally {
        setLoadingState('deleting', false)
      }
    },
    onSuccess: (submissionId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.submissions.byTask(taskId) })
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.submissions.byUser(userId) })
      }
      
      onSuccess?.('delete', submissionId)
      
      // Success alert after loading is complete
      setTimeout(() => {
        alert('✅ ลบงานสำเร็จแล้ว!')
      }, 100)
    },
    onError: (error) => {
      onError?.('delete', error)
      
      // Error alert after loading is complete
      setTimeout(() => {
        alert('❌ เกิดข้อผิดพลาดในการลบงาน: ' + (error as Error).message)
      }, 100)
    }
  })

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async ({ groupName }: { groupName: string }) => {
      setLoadingState('creating_group', true)
      
      try {
        const result = await groupService.createGroup(taskId, groupName, userId!)
        return result
      } finally {
        setLoadingState('creating_group', false)
      }
    },
    onSuccess: (data) => {
      onSuccess?.('create_group', data)
      
      // Success alert after loading is complete
      setTimeout(() => {
        alert(`✅ สร้างกลุ่มสำเร็จแล้ว! รหัสกลุ่ม: ${data.party_code}`)
      }, 100)
    },
    onError: (error) => {
      onError?.('create_group', error)
      
      // Error alert after loading is complete
      setTimeout(() => {
        alert('❌ เกิดข้อผิดพลาดในการสร้างกลุ่ม: ' + (error as Error).message)
      }, 100)
    }
  })

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async ({ partyCode }: { partyCode: string }) => {
      setLoadingState('joining_group', true)
      
      try {
        const result = await groupService.joinByCode(partyCode, userId!)
        return result
      } finally {
        setLoadingState('joining_group', false)
      }
    },
    onSuccess: (data) => {
      onSuccess?.('join_group', data)
      
      // Success alert after loading is complete
      setTimeout(() => {
        alert('✅ เข้าร่วมกลุ่มสำเร็จแล้ว!')
      }, 100)
    },
    onError: (error) => {
      onError?.('join_group', error)
      
      // Error alert after loading is complete
      setTimeout(() => {
        alert('❌ เกิดข้อผิดพลาดในการเข้าร่วมกลุ่ม: ' + (error as Error).message)
      }, 100)
    }
  })

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: async ({ groupId }: { groupId: string }) => {
      setLoadingState('leaving_group', true)
      
      try {
        const result = await groupService.leaveGroup(groupId, userId!)
        return result
      } finally {
        setLoadingState('leaving_group', false)
      }
    },
    onSuccess: (data) => {
      onSuccess?.('leave_group', data)
      
      // Success alert after loading is complete
      setTimeout(() => {
        alert('✅ ออกจากกลุ่มสำเร็จแล้ว!')
      }, 100)
    },
    onError: (error) => {
      onError?.('leave_group', error)
      
      // Error alert after loading is complete
      setTimeout(() => {
        alert('❌ เกิดข้อผิดพลาดในการออกจากกลุ่ม: ' + (error as Error).message)
      }, 100)
    }
  })

  return {
    // Loading states - granular loading for each operation
    isSubmitting: loadingStates.submitting,
    isUpdating: loadingStates.updating,
    isDeleting: loadingStates.deleting,
    isUploading: loadingStates.uploading,
    isCreatingGroup: loadingStates.creating_group,
    isJoiningGroup: loadingStates.joining_group,
    isLeavingGroup: loadingStates.leaving_group,
    
    // Combined loading state for UI
    isLoading: Object.values(loadingStates).some(Boolean),
    
    // All loading states for debugging
    loadingStates,
    
    // Operations
    submitSubmission: (formData: SubmissionFormData) => submitMutation.mutate(formData),
    updateSubmission: (submissionId: string, formData: SubmissionFormData) => 
      updateMutation.mutate({ submissionId, formData }),
    deleteSubmission: (submissionId: string) => deleteMutation.mutate(submissionId),
    createGroup: (groupName: string) => createGroupMutation.mutate({ groupName }),
    joinGroup: (partyCode: string) => joinGroupMutation.mutate({ partyCode }),
    leaveGroup: (groupId: string) => leaveGroupMutation.mutate({ groupId }),
    
    // Mutation objects for advanced usage
    mutations: {
      submit: submitMutation,
      update: updateMutation,
      delete: deleteMutation,
      createGroup: createGroupMutation,
      joinGroup: joinGroupMutation,
      leaveGroup: leaveGroupMutation,
    }
  }
}