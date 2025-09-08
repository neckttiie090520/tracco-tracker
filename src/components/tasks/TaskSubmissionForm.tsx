import React, { useEffect, useMemo, useState } from 'react'
import { useTaskSubmission } from '../../hooks/useSubmissions'
import { UrlSubmissionDisplay } from './UrlSubmissionDisplay'
import { TaskMaterialDisplay } from './TaskMaterialDisplay'
import { ImprovedTaskSubmissionModal } from './ImprovedTaskSubmissionModal'
import type { TaskMaterial } from '../../types/materials'
import { groupService } from '../../services/groups'
import { submissionService } from '../../services/submissions'
import { useAuth } from '../../hooks/useAuth'

interface TaskSubmissionFormProps {
  taskId: string
  task: any & {
    materials?: TaskMaterial[]
  }
  workshopId?: string
}

export function TaskSubmissionForm({ taskId, task, workshopId }: TaskSubmissionFormProps) {
  const { user } = useAuth()
  const { submission, loading, uploading, submitTask, updateSubmission, refetch } = useTaskSubmission(taskId)
  const [formData, setFormData] = useState({
    notes: submission?.notes || '',
    submission_url: submission?.submission_url || '',
    file: null as File | null
  })
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [group, setGroup] = useState<any | null>(null)
  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [groupSubmission, setGroupSubmission] = useState<any | null>(null)
  const isGroupTask = useMemo(() => task?.submission_mode === 'group', [task?.submission_mode])
  const [refreshingCard, setRefreshingCard] = useState(false)

  const refreshSubmissionCard = async () => {
    if (!user) return
    setRefreshingCard(true)
    try {
      if (isGroupTask) {
        let g = group
        if (!g) {
          g = await groupService.getUserGroupForTask(taskId, user.id)
          setGroup(g)
        }
        if (g) {
          const members = await groupService.listMembers(g.id)
          setGroupMembers(members || [])
          const gs = await submissionService.getGroupTaskSubmission(taskId, g.id)
          setGroupSubmission(gs)
        }
      } else {
        await refetch()
      }
    } finally {
      setRefreshingCard(false)
    }
  }

  useEffect(() => {
    const initGroup = async () => {
      if (!isGroupTask || !user) return
      try {
        const g = await groupService.getUserGroupForTask(taskId, user.id)
        setGroup(g)
        if (g) {
          const members = await groupService.listMembers(g.id)
          setGroupMembers(members || [])
          const gs = await submissionService.getGroupTaskSubmission(taskId, g.id)
          setGroupSubmission(gs)
        } else {
          setGroupMembers([])
          setGroupSubmission(null)
        }
      } catch (e) {
        console.error('Init group failed:', e)
      }
    }
    initGroup()
  }, [isGroupTask, taskId, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setError(null)
      
      if (isGroupTask) {
        if (!user) throw new Error('User not found')
        if (!group) throw new Error('Please create or join a group before submitting')

        // Upload file if any
        let fileUrl: string | null = null
        if (formData.file) {
          const fileResult = await submissionService.uploadFile(formData.file, user.id, taskId)
          fileUrl = fileResult.publicUrl
        }

        const saved = await submissionService.upsertGroupSubmission({
          task_id: taskId,
          user_id: user.id,
          group_id: group.id,
          notes: formData.notes || null,
          submission_url: formData.submission_url || null,
          file_url: fileUrl || undefined,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any)
        setGroupSubmission(saved)
      } else {
        if (submission) {
          await updateSubmission(formData)
        } else {
          await submitTask(formData)
        }
      }
      
      // Reset file input and URL
      setFormData(prev => ({ ...prev, file: null, submission_url: '' }))
      
      // Reset file input element
      const fileInput = document.getElementById('file-upload') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
      // Close modal on success
      setShowModal(false)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit task')
    }
  }

  const handleFileChange = (file: File | null) => {
    setFormData(prev => ({ ...prev, file }))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded mb-4"></div>
        <div className="h-10 bg-gray-200 rounded w-32"></div>
      </div>
    )
  }

  const isSubmitted = submission && submission.status === 'submitted'

  return (
    <div className="space-y-6">
      {/* Task Header - Show ONLY in main task list, not duplicated here */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center text-red-800">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Additional Task Details */}
      {task.description && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">รายละเอียดงาน</h4>
              <p className="text-blue-800 text-sm leading-relaxed whitespace-pre-line">{task.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Task Materials */}
      {task.materials && task.materials.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <TaskMaterialDisplay materials={task.materials} />
        </div>
      )}

      {/* Group: Create/Join and status (for group tasks) */}
      {isGroupTask && (
        <div className="bg-white rounded-xl shadow-md border-2 border-blue-200 overflow-hidden">
          <div className="bg-blue-50 px-6 py-3 border-b border-blue-200 font-medium text-blue-900">Group for this task</div>
          <div className="p-6">
            {!group ? (
              <div className="grid gap-4 md:grid-cols-2">
                <CreateGroupInline taskId={taskId} onCreated={async () => {
                  if (!user) return
                  const g = await groupService.getUserGroupForTask(taskId, user.id)
                  setGroup(g)
                  if (g) {
                    const members = await groupService.listMembers(g.id)
                    setGroupMembers(members || [])
                  }
                }} />
                <JoinGroupInline onJoined={async () => {
                  if (!user) return
                  const g = await groupService.getUserGroupForTask(taskId, user.id)
                  setGroup(g)
                  if (g) {
                    const members = await groupService.listMembers(g.id)
                    setGroupMembers(members || [])
                  }
                }} />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-gray-800"><span className="font-medium">Group:</span> {group.name}</div>
                    <div className="text-sm text-gray-600">Code: <span className="font-mono tracking-widest">{group.party_code}</span></div>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(group.party_code)}
                    className="text-xs text-blue-700 bg-white border border-blue-200 px-2 py-1 rounded hover:bg-blue-50"
                  >Copy Code</button>
                </div>
                {groupMembers.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Members</div>
                    <div className="flex flex-wrap gap-2">
                      {groupMembers.map((m) => (
                        <div key={m.user_id} className="px-2 py-1 bg-gray-100 rounded text-sm">
                          {m.user?.name || m.user_id.slice(0, 6)} {m.role === 'owner' ? '(owner)' : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {groupSubmission?.status === 'submitted' && (
                  <div className="text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 inline-flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-7.364 7.364a1 1 0 01-1.414 0L3.293 9.536a1 1 0 111.414-1.414l3.222 3.222 6.657-6.657a1 1 0 011.414 0z"/></svg>
                    Submitted by your group
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Card 1: Submitted Work - Only show if there's a submission */}
      {submission && (
        <div className="bg-white rounded-xl shadow-md border-2 border-green-200 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-900">✅ งานที่ส่งแล้ว</h3>
                  <p className="text-sm text-green-700">
                    {submission.updated_at
                      ? `แก้ไขล่าสุด: ${new Date(submission.updated_at).toLocaleString('th-TH')}`
                      : `ส่งเมื่อ: ${new Date(submission.submitted_at).toLocaleString('th-TH')}`
                    }
                  </p>
                </div>
              </div>
              <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                ส่งสำเร็จ
              </div>
            </div>
          </div>
          
          {/* Card Content */}
          <div className="p-6 space-y-4">
            <div className="flex justify-end">
              <button onClick={refreshSubmissionCard} className="inline-flex items-center gap-2 text-xs px-3 py-1.5 border rounded-md text-gray-700 hover:bg-gray-50">
                {refreshingCard ? (<span className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full inline-block animate-spin"/>) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0014-7V9m0-4a9 9 0 00-14 7v3" />
                  </svg>)}
                Refresh
              </button>
            </div>
            {submission.notes && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center mb-2">
                  <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium text-gray-700">หมายเหตุ</span>
                </div>
                <p className="text-gray-800 leading-relaxed whitespace-pre-line">{submission.notes}</p>
              </div>
            )}

            {submission.submission_url && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center mb-3">
                  <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span className="font-medium text-blue-700">URL งานที่ส่ง</span>
                </div>
                <UrlSubmissionDisplay url={submission.submission_url} isSubmitted={true} />
              </div>
            )}

            {submission.file_url && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center mb-3">
                  <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium text-purple-700">ไฟล์งานที่ส่ง</span>
                </div>
                <a
                  href={submission.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  ดาวน์โหลดไฟล์
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden relative">
        <div className="p-6">
          <button
            onClick={() => setShowModal(true)}
            className="absolute bottom-4 right-4 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
          >
            <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center mr-2">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={submission ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M12 19l9 2-9-18-9 18 9-2zm0 0v-8"} />
              </svg>
            </div>
            <span className="text-sm">
              {submission ? 'แก้ไข' : 'ส่งงาน'}
            </span>
          </button>
          <div className="pr-32 pb-4">
            <div className="text-lg font-bold text-gray-800 mb-2">
              {submission ? 'งานที่ส่งแล้ว' : 'พร้อมส่งงาน'}
            </div>
            <div className="text-sm text-gray-600">
              {submission ? 'คุณสามารถแก้ไขหรือเพิ่มเติมงานที่ส่งแล้ว' : 'กรอกข้อมูลเพื่อส่งงานของคุณ'}
            </div>
          </div>
        </div>
      </div>

      {/* Task Submission Modal */}
      <ImprovedTaskSubmissionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        submission={groupSubmission || submission}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        uploading={uploading}
        onFileChange={handleFileChange}
        taskTitle={task.title}
      />
    </div>
  )
}

function CreateGroupInline({ taskId, onCreated }: { taskId: string; onCreated: () => void }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="border rounded-lg p-4">
      <h4 className="font-medium mb-2">Create a Group</h4>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border px-3 py-2 rounded mb-2"
        placeholder="Group name"
      />
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      <button
        onClick={async () => {
          if (!user) return
          try {
            setLoading(true)
            setError(null)
            await groupService.createGroup(taskId, name.trim() || 'My Group', user.id)
            await onCreated()
          } catch (e: any) {
            setError(e?.message || 'Failed to create group')
          } finally {
            setLoading(false)
          }
        }}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded"
      >
        {loading ? 'Creating...' : 'Create'}
      </button>
    </div>
  )
}

function JoinGroupInline({ onJoined }: { onJoined: () => void }) {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="border rounded-lg p-4">
      <h4 className="font-medium mb-2">Join with Party Code</h4>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        className="w-full border px-3 py-2 rounded mb-2 tracking-widest"
        placeholder="ABC123"
      />
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      <button
        onClick={async () => {
          if (!user) return
          try {
            setLoading(true)
            setError(null)
            await groupService.joinByCode(code.trim(), user.id)
            await onJoined()
          } catch (e: any) {
            setError(e?.message || 'Invalid code')
          } finally {
            setLoading(false)
          }
        }}
        disabled={loading}
        className="bg-gray-800 hover:bg-black text-white px-3 py-2 rounded"
      >
        {loading ? 'Joining...' : 'Join Group'}
      </button>
    </div>
  )
}
