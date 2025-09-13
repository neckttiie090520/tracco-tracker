import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useTaskSubmissions } from '../../hooks/useSubmissions'
import { submissionService } from '../../services/submissions'
import { useAuth } from '../../hooks/useAuth'
import { LuckyDrawSlot } from './LuckyDrawSlot'
import { Avatar } from '../common/Avatar'

interface TaskSubmissionsModalProps {
  task: any
  onClose: () => void
  initialShowLuckyDraw?: boolean
}

export function TaskSubmissionsModal({ task, onClose, initialShowLuckyDraw = false }: TaskSubmissionsModalProps) {
  const { user } = useAuth()
  console.log('TaskSubmissionsModal - task object:', task)
  console.log('TaskSubmissionsModal - task.id:', task?.id)
  const { submissions, loading, error, refetch } = useTaskSubmissions(task?.id)
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  const [selectedSubmissionDetail, setSelectedSubmissionDetail] = useState<any>(null)
  const [selectedSubmissionItems, setSelectedSubmissionItems] = useState<any>(null)
  const [luckyWinner, setLuckyWinner] = useState<string | null>(null)
  const [hideLuckyBanner, setHideLuckyBanner] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [showLuckyDraw, setShowLuckyDraw] = useState<boolean>(initialShowLuckyDraw)

  const [reviewData, setReviewData] = useState({
    feedback: '',
    grade: ''
  })
  
  // Submissions view controls
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'reviewed' | 'draft'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest')
  const [compact, setCompact] = useState(false)
  const [contentOnly, setContentOnly] = useState(false)
  const [refreshingList, setRefreshingList] = useState(false)

  // Prevent background scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const quickStats = useMemo(() => {
    // Use all submissions for raw stats, but filter by submission mode for accurate counts
    const relevantSubmissions = (submissions || []).filter((s: any) => {
      if (task.submission_mode === 'group') {
        return s.group_id // Only group submissions
      } else {
        return !s.group_id // Only individual submissions  
      }
    })
    
    const counts = { total: relevantSubmissions.length, submitted: 0, reviewed: 0, draft: 0 }
    relevantSubmissions.forEach((s: any) => {
      if (s.status === 'submitted') counts.submitted += 1
      else if (s.status === 'reviewed') counts.reviewed += 1
      else counts.draft += 1
    })
    return counts
  }, [submissions, task.submission_mode])

  const filtered = useMemo(() => {
    let list = submissions || []
    
    // Filter by submission mode - only show submissions that match the task's submission mode
    if (task.submission_mode === 'group') {
      // For group tasks, only show group submissions (submissions with group_id)
      list = list.filter((s: any) => s.group_id)
    } else {
      // For individual tasks, only show individual submissions (submissions without group_id)
      list = list.filter((s: any) => !s.group_id)
    }
    
    if (contentOnly) list = list.filter((s: any) => s.notes || s.submission_url || s.file_url)
    if (statusFilter !== 'all') list = list.filter((s: any) => s.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((s: any) =>
        (s.user?.name || '').toLowerCase().includes(q) ||
        (s.user?.email || '').toLowerCase().includes(q) ||
        (s.notes || '').toLowerCase().includes(q)
      )
    }
    if (sortBy === 'name') {
      list = [...list].sort((a: any, b: any) => (a.user?.name || '').localeCompare(b.user?.name || ''))
    } else if (sortBy === 'oldest') {
      list = [...list].sort((a: any, b: any) => new Date(a.submitted_at || 0).getTime() - new Date(b.submitted_at || 0).getTime())
    } else {
      list = [...list].sort((a: any, b: any) => new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime())
    }
    return list
  }, [submissions, search, statusFilter, sortBy, contentOnly, task.submission_mode])

  // Compute eligible names for Lucky Draw after filtered is defined
  const eligibleNames = useMemo(() => {
    if (!filtered) return [] as string[]
    const list = filtered
      .filter((s: any) => s?.status && s.status !== 'draft')
      .map((s: any) => {
        if (s.is_group_submission && s.group?.name) {
          return s.group.name
        }
        return s?.user?.name || s?.user?.email || 'Unknown'
      })
    return Array.from(new Set(list))
  }, [filtered])

  const openWinnerDetail = (winnerNameOrEmail: string) => {
    if (!submissions || !winnerNameOrEmail) return
    const match = submissions.find((s: any) => {
      // Check group name for group submissions
      if (s.is_group_submission && s.group?.name) {
        return s.group.name === winnerNameOrEmail
      }
      // Check user name/email for individual submissions
      const name = s?.user?.name || ''
      const email = s?.user?.email || ''
      return name === winnerNameOrEmail || email === winnerNameOrEmail
    })
    if (match) {
      // Use the new card format for better UX
      setSelectedSubmissionItems(match)
      // Set the winner display name based on submission type
      const display = match.is_group_submission && match.group?.name 
        ? match.group.name 
        : (match?.user?.name || match?.user?.email || winnerNameOrEmail)
      setLuckyWinner(display)
      // Reset banner visibility when a new winner is selected
      setHideLuckyBanner(false)
    }
  }

  useEffect(() => {
    if (!task) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedSubmissionDetail) {
          setSelectedSubmissionDetail(null)
        } else if (selectedSubmission) {
          setSelectedSubmission(null)
        } else {
          onClose()
        }
      }
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && e.target === modalRef.current) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [task, selectedSubmission, selectedSubmissionDetail, onClose])

  useEffect(() => {
    setShowLuckyDraw(initialShowLuckyDraw)
  }, [initialShowLuckyDraw, task?.id])

  const handleReviewSubmission = async (submission: any) => {
    setSelectedSubmission(submission)
    setReviewData({
      feedback: submission.feedback || '',
      grade: submission.grade || ''
    })
  }

  const handleSaveReview = async () => {
    if (!selectedSubmission || !user) return
    try {
      setReviewLoading(true)
      setReviewError(null)
      await submissionService.reviewSubmission(selectedSubmission.id, {
        feedback: reviewData.feedback || undefined,
        grade: reviewData.grade || undefined,
        reviewedBy: user.id
      })
      setSelectedSubmission(null)
      refetch()
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to save review')
    } finally {
      setReviewLoading(false)
    }
  }

  const exportSubmissions = () => {
    if (!submissions || submissions.length === 0) return
    const csvData = submissions.map(sub => ({
      'Student Name': sub.user?.name || 'Unknown',
      'Student Email': sub.user?.email || 'Unknown',
      'Status': sub.status,
      'Notes': sub.notes || '',
      'URL': sub.submission_url || '',
      'Grade': sub.grade || '',
      'Feedback': sub.feedback || '',
      'Submitted At': sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '',
      'Updated At': sub.updated_at ? new Date(sub.updated_at).toLocaleString() : ''
    }))
    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${task.title}_submissions.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const refreshAll = async () => {
    try {
      setRefreshingList(true)
      await refetch()
    } finally {
      setRefreshingList(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800'
      case 'reviewed':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!task) return null

  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm overscroll-contain"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[80vh] flex flex-col transform transition-all duration-200 scale-100 opacity-100 overflow-hidden">
        <div className="p-6 flex-shrink-0 border-b border-gray-200 rounded-t-lg">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{task.title} - Submissions</h2>
              <p className="text-gray-600 mt-1">
                {task.workshop?.title} • {submissions?.length || 0} submission{submissions?.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={refreshAll}
                className="text-sm border px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
                title="Refresh"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12a7.5 7.5 0 0112.9-5.3L20 4v4.5M19.5 12a7.5 7.5 0 01-12.9 5.3L4 20v-4.5" />
                </svg>
                {refreshingList ? 'Refreshing…' : 'Refresh'}
              </button>
              {eligibleNames.length > 0 && (
                <button
                  onClick={() => setShowLuckyDraw((v) => !v)}
                  className="text-sm bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 animate-pulse"
                >
                  <svg className="w-5 h-5 mr-2 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  ✨ Lucky Draw
                </button>
              )}
              {submissions && submissions.length > 0 && (
                <button
                  onClick={exportSubmissions}
                  className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md font-medium flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600">Loading submissions...</span>
            </div>
          )}

          <div className="p-6">
            {!loading && !error && showLuckyDraw && (
              <div className="mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-400 rounded-xl blur-lg opacity-20 animate-pulse"></div>
                <div className="relative bg-white border-4 border-transparent bg-clip-padding rounded-xl shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-400 p-1 rounded-xl">
                    <div className="bg-white rounded-lg p-4">
                      <LuckyDrawSlot
                        names={eligibleNames}
                        reelId={`reel-${task?.id || 'task'}`}
                        onWinner={(name) => {
                          console.log('Lucky winner:', name)
                          openWinnerDetail(name)
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!loading && !error && (
              <div className="mb-4 bg-white border rounded-md p-3">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex-1 min-w-[220px]">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search name, email, or notes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      title="Filter by status"
                    >
                      <option value="all">All</option>
                      <option value="submitted">Submitted</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      title="Sort order"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="name">Name</option>
                    </select>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" className="rounded" checked={contentOnly} onChange={(e) => setContentOnly(e.target.checked)} />
                    Only with content
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" className="rounded" checked={compact} onChange={(e) => setCompact(e.target.checked)} />
                    Compact rows
                  </label>
                  <div className="ml-auto flex gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">All: {quickStats.total}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">Submitted: {quickStats.submitted}</span>
                    <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">Reviewed: {quickStats.reviewed}</span>
                    <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">Draft: {quickStats.draft}</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <div className="text-red-600 mb-4">
                  <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Submissions</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={refetch}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && (
              <div>
                {filtered && filtered.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Submissions Yet</h3>
                    <p className="text-gray-600">No items match your search or filters.</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Student
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Submission
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Grade
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Submitted
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filtered?.map((submission) => (
                          <tr key={submission.id} className={`hover:bg-gray-50 ${compact ? 'text-sm' : ''}`} onDoubleClick={() => setSelectedSubmissionItems(submission)}>
                            <td className={`px-6 ${compact ? 'py-2' : 'py-4'}`}>
                              {submission.is_group_submission && submission.group ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                                    </svg>
                                    <span className="font-semibold text-blue-800">{submission.group.name}</span>
                                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                                      {submission.group_members?.length || 0} คน
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Avatar
                                      username={submission.user?.email}
                                      name={submission.user?.name}
                                      avatarSeed={submission.user?.avatar_seed}
                                      size={20}
                                      saturation={submission.user?.avatar_saturation}
                                      lightness={submission.user?.avatar_lightness}
                                    />
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9.5H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd"/>
                                      </svg>
                                      ผู้ส่ง: {submission.user?.name}
                                    </span>
                                  </div>
                                  {submission.group_members && submission.group_members.length > 0 && (
                                    <details className="text-xs text-gray-600">
                                      <summary className="cursor-pointer hover:text-gray-800 select-none">
                                        สมาชิก ({submission.group_members.length} คน)
                                      </summary>
                                      <div className="mt-1 pl-3 space-y-0.5">
                                        {submission.group_members.map((member: any, idx: number) => (
                                          <div key={idx} className="flex items-center gap-2">
                                            <Avatar
                                              username={member.email}
                                              name={member.name}
                                              avatarSeed={member.avatar_seed}
                                              size={16}
                                              saturation={member.avatar_saturation}
                                              lightness={member.avatar_lightness}
                                            />
                                            <span className={member.email === submission.user?.email ? 'font-semibold text-green-700' : ''}>
                                              {member.name}
                                              {member.email === submission.user?.email && ' (ผู้ส่ง)'}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </details>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center space-x-3">
                                  <Avatar
                                    username={submission.user?.email}
                                    name={submission.user?.name}
                                    avatarSeed={submission.user?.avatar_seed}
                                    size={compact ? 32 : 40}
                                    saturation={submission.user?.avatar_saturation}
                                    lightness={submission.user?.avatar_lightness}
                                  />
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {submission.user?.name || 'Unknown User'}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {submission.user?.email || 'No email'}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className={`px-6 ${compact ? 'py-2' : 'py-4'} whitespace-nowrap`}>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(submission.status)}`}>
                                {submission.status}
                              </span>
                            </td>
                            <td className={`px-6 ${compact ? 'py-2' : 'py-4'}`}>
                              {(() => {
                                const itemCount = 
                                  (submission.notes ? 1 : 0) +
                                  (submission.links?.length || 0) +
                                  (submission.submission_url && !submission.links ? 1 : 0) +
                                  (submission.file_url ? 1 : 0);
                                
                                if (itemCount === 0) {
                                  return <span className="text-xs text-gray-400 italic">No content</span>;
                                }
                                
                                return (
                                  <button
                                    onClick={() => {
                                      console.log('Items button clicked, submission:', submission)
                                      setSelectedSubmissionItems(submission)
                                    }}
                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                                    title="View all submission items"
                                  >
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                    Items
                                    <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                                      {itemCount}
                                    </span>
                                  </button>
                                );
                              })()}
                            </td>
                            <td className={`px-6 ${compact ? 'py-2' : 'py-4'} whitespace-nowrap`}>
                              <div className="text-sm text-gray-900">
                                {submission.grade || 'Not graded'}
                              </div>
                              {submission.feedback && (
                                <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                                  {submission.feedback}
                                </div>
                              )}
                            </td>
                            <td className={`px-6 ${compact ? 'py-2' : 'py-4'} whitespace-nowrap text-sm text-gray-500`}>
                              {formatDate(submission.submitted_at)}
                            </td>
                            <td className={`px-6 ${compact ? 'py-2' : 'py-4'} whitespace-nowrap text-sm font-medium relative`}>
                              <div className="flex items-center justify-center">
                                <div className="relative group">
                                  <button
                                    className="text-gray-500 hover:text-gray-700 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                                    title="Actions"
                                  >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                                    </svg>
                                  </button>
                                  <div className="absolute right-0 top-full z-50 w-48 py-1 mt-1 bg-white rounded-md shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right"
                                       style={{ transform: 'translateX(-50%)' }}>
                                    <button
                                      onClick={() => setSelectedSubmissionItems(submission)}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                    >
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      View Details
                                    </button>
                                    <button
                                      onClick={() => handleReviewSubmission(submission)}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-900 transition-colors"
                                    >
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                      </svg>
                                      {submission.status === 'reviewed' ? 'Edit Review' : 'Add Review'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[10000]">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 pb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Review Submission - {selectedSubmission.user?.name}
                </h3>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {reviewError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {reviewError}
                </div>
              )}

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Student Submission</h4>
                {selectedSubmission.notes && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700">Notes:</p>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{selectedSubmission.notes}</p>
                  </div>
                )}
                {selectedSubmission.submission_url && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700">URL:</p>
                    <a
                      href={selectedSubmission.submission_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 break-all"
                    >
                      {selectedSubmission.submission_url}
                    </a>
                  </div>
                )}
                {selectedSubmission.file_url && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">File:</p>
                    <a
                      href={selectedSubmission.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View Submitted File
                    </a>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">
                    Grade (Optional)
                  </label>
                  <input
                    type="text"
                    id="grade"
                    value={reviewData.grade}
                    onChange={(e) => setReviewData(prev => ({ ...prev, grade: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., A, B+, 95/100, Pass, etc."
                    disabled={reviewLoading}
                  />
                </div>
                <div>
                  <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-1">
                    Feedback
                  </label>
                  <textarea
                    id="feedback"
                    value={reviewData.feedback}
                    onChange={(e) => setReviewData(prev => ({ ...prev, feedback: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Provide feedback to the student..."
                    disabled={reviewLoading}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                <button
                  onClick={() => setSelectedSubmission(null)}
                  disabled={reviewLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveReview}
                  disabled={reviewLoading}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {reviewLoading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  )}
                  {reviewLoading ? 'Saving...' : 'Save Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedSubmissionItems && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ zIndex: 10001 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedSubmissionItems(null)
              setLuckyWinner(null)
              setHideLuckyBanner(false)
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            {/* Lucky Winner Header */}
            {luckyWinner && !hideLuckyBanner && (
              (selectedSubmissionItems.is_group_submission && selectedSubmissionItems.group?.name === luckyWinner) ||
              (selectedSubmissionItems.user?.name === luckyWinner || selectedSubmissionItems.user?.email === luckyWinner)
            ) && (
              <div className="relative rounded-t-lg">
                <div className="bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-400 px-6 py-6 text-center relative rounded-t-lg">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/20 via-pink-200/20 to-purple-300/20"></div>
                  <div className="absolute -top-1 -left-1 w-12 h-12 bg-yellow-200 rounded-full opacity-30 animate-pulse"></div>
                  <div className="absolute -bottom-1 -right-1 w-14 h-14 bg-pink-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
                  <div className="absolute top-1/2 left-1/4 w-6 h-6 bg-purple-200 rounded-full opacity-25 animate-bounce"></div>
                  
                  {/* Hide Banner Button */}
                  <button
                    onClick={() => setHideLuckyBanner(true)}
                    className="absolute top-3 right-3 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all duration-200 group"
                    title="ซ่อน Lucky Draw banner"
                  >
                    <svg className="w-4 h-4 text-white group-hover:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  <div className="relative">
                    <div className="flex justify-center items-center gap-2 mb-3">
                      <div className="text-xl animate-bounce">🎉</div>
                      <svg className="w-6 h-6 text-yellow-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                      </svg>
                      <div className="text-xl animate-bounce delay-300">🎊</div>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white mb-2 drop-shadow-lg">
                        🏆 LUCKY DRAW WINNER! 🏆
                      </h2>
                      
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 border border-white/30 mt-2">
                        {selectedSubmissionItems.is_group_submission && selectedSubmissionItems.group ? (
                          <div className="flex flex-col items-center text-center">
                            <div className="inline-flex items-center px-3 py-1 bg-blue-500/80 text-white rounded-full text-xs font-medium mb-3">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              GROUP WINNER
                            </div>
                            <Avatar
                              username={selectedSubmissionItems.user?.email}
                              name={selectedSubmissionItems.user?.name}
                              avatarSeed={selectedSubmissionItems.user?.avatar_seed}
                              size={64}
                              saturation={selectedSubmissionItems.user?.avatar_saturation}
                              lightness={selectedSubmissionItems.user?.avatar_lightness}
                              className="ring-4 ring-white/50 mb-3"
                            />
                            <div className="text-2xl md:text-3xl font-black text-white drop-shadow-2xl mb-2 leading-tight">
                              {selectedSubmissionItems.group.name}
                            </div>
                            <div className="text-lg text-white/95 font-semibold">
                              Team Leader: {selectedSubmissionItems.user?.name || luckyWinner}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-center">
                            <div className="inline-flex items-center px-3 py-1 bg-green-500/80 text-white rounded-full text-xs font-medium mb-3">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              INDIVIDUAL WINNER
                            </div>
                            <Avatar
                              username={selectedSubmissionItems.user?.email}
                              name={selectedSubmissionItems.user?.name}
                              avatarSeed={selectedSubmissionItems.user?.avatar_seed}
                              size={64}
                              saturation={selectedSubmissionItems.user?.avatar_saturation}
                              lightness={selectedSubmissionItems.user?.avatar_lightness}
                              className="ring-4 ring-white/50 mb-3"
                            />
                            <div className="text-2xl md:text-3xl font-black text-white drop-shadow-2xl leading-tight">
                              {selectedSubmissionItems.user?.name || luckyWinner}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Regular Header */}
            <div className={`px-6 py-4 border-b border-gray-200 flex-shrink-0 ${luckyWinner && (
              (selectedSubmissionItems.is_group_submission && selectedSubmissionItems.group?.name === luckyWinner) ||
              (selectedSubmissionItems.user?.name === luckyWinner || selectedSubmissionItems.user?.email === luckyWinner)
            ) ? 'bg-gradient-to-r from-yellow-50 to-pink-50' : 'bg-gradient-to-r from-blue-50 to-indigo-50'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Submission Details</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedSubmissionItems.is_group_submission && selectedSubmissionItems.group
                      ? `${selectedSubmissionItems.group.name} (Group)`
                      : selectedSubmissionItems.user?.name || 'Unknown Student'
                    } • {task?.title || 'Task'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Show Lucky Banner Button - only show if luckyWinner exists and banner is hidden */}
                  {luckyWinner && hideLuckyBanner && (
                    (selectedSubmissionItems.is_group_submission && selectedSubmissionItems.group?.name === luckyWinner) ||
                    (selectedSubmissionItems.user?.name === luckyWinner || selectedSubmissionItems.user?.email === luckyWinner)
                  ) && (
                    <button
                      onClick={() => setHideLuckyBanner(false)}
                      className="px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-pink-400 hover:from-yellow-500 hover:to-pink-500 text-white text-sm rounded-lg font-medium transition-all duration-200 flex items-center gap-1.5"
                      title="แสดง Lucky Draw banner"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      🏆 Winner
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedSubmissionItems(null)
                      setLuckyWinner(null)
                      setHideLuckyBanner(false)
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto pb-8">
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  {selectedSubmissionItems.is_group_submission ? 'Group Information' : 'Student Information'}
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {selectedSubmissionItems.is_group_submission && selectedSubmissionItems.group ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                        </svg>
                        <span className="font-semibold text-blue-800 text-base">{selectedSubmissionItems.group.name}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {selectedSubmissionItems.group_members?.length || 0} สมาชิก
                        </span>
                      </div>
                      
                      <div className="border-l-4 border-green-500 pl-3 py-2 bg-green-50 rounded-r">
                        <div className="text-xs font-medium text-green-700 uppercase tracking-wider mb-2">ผู้ส่งงาน</div>
                        <div className="flex items-center space-x-3">
                          <Avatar
                            username={selectedSubmissionItems.user?.email}
                            name={selectedSubmissionItems.user?.name}
                            avatarSeed={selectedSubmissionItems.user?.avatar_seed}
                            size={32}
                            saturation={selectedSubmissionItems.user?.avatar_saturation}
                            lightness={selectedSubmissionItems.user?.avatar_lightness}
                          />
                          <div>
                            <div className="text-sm text-gray-900 font-medium">
                              {selectedSubmissionItems.user?.name || 'Unknown User'}
                            </div>
                            <div className="text-xs text-gray-600">
                              {selectedSubmissionItems.user?.email || 'No email'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {selectedSubmissionItems.group_members && selectedSubmissionItems.group_members.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">สมาชิกทั้งหมด</div>
                          <div className="space-y-1">
                            {selectedSubmissionItems.group_members.map((member: any, idx: number) => {
                              const isSubmitter = member?.email === selectedSubmissionItems.user?.email
                              return (
                                <div key={idx} className={`flex items-center gap-3 p-2 rounded text-sm ${
                                  isSubmitter
                                    ? 'bg-green-100 border border-green-300' 
                                    : 'bg-white border border-gray-200'
                                }`}>
                                  <Avatar
                                    username={member?.email}
                                    name={member?.name}
                                    avatarSeed={member?.avatar_seed}
                                    size={24}
                                    saturation={member?.avatar_saturation}
                                    lightness={member?.avatar_lightness}
                                  />
                                  <span className={isSubmitter ? 'font-semibold text-green-800' : 'text-gray-700'}>
                                    {member?.name || 'Unknown'}
                                    {isSubmitter && ' (ผู้ส่ง)'}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Student Information</p>
                      <div className="flex items-center space-x-3">
                        <Avatar
                          username={selectedSubmissionItems.user?.email}
                          name={selectedSubmissionItems.user?.name}
                          avatarSeed={selectedSubmissionItems.user?.avatar_seed}
                          size={40}
                          saturation={selectedSubmissionItems.user?.avatar_saturation}
                          lightness={selectedSubmissionItems.user?.avatar_lightness}
                        />
                        <div>
                          <div className="text-sm text-gray-900">
                            {selectedSubmissionItems.user?.name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {selectedSubmissionItems.user?.email || 'No email'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Status</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedSubmissionItems.status)}`}>
                    {selectedSubmissionItems.status}
                  </span>
                  {selectedSubmissionItems.submitted_at && (
                    <p className="text-sm text-gray-600 mt-2">
                      Submitted: {formatDate(selectedSubmissionItems.submitted_at)}
                    </p>
                  )}
                </div>
              </div>

              {((selectedSubmissionItems.links && selectedSubmissionItems.links.length > 0) || selectedSubmissionItems.submission_url) && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                    Links ({(selectedSubmissionItems.links?.length || 0) + (selectedSubmissionItems.submission_url && !selectedSubmissionItems.links ? 1 : 0)})
                  </h3>
                  <div className="space-y-2">
                    {selectedSubmissionItems.links && selectedSubmissionItems.links.map((link: any, index: number) => {
                      const linkUrl = typeof link === 'string' ? link : link.url || link;
                      const linkNote = typeof link === 'object' ? link.note : '';
                      
                      // Extract domain for better display
                      let displayUrl = linkUrl;
                      let domain = '';
                      try {
                        const urlObj = new URL(linkUrl);
                        domain = urlObj.hostname.replace('www.', '');
                        displayUrl = linkUrl.length > 60 ? linkUrl.substring(0, 60) + '...' : linkUrl;
                      } catch {
                        displayUrl = linkUrl.length > 60 ? linkUrl.substring(0, 60) + '...' : linkUrl;
                      }

                      return (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-semibold text-gray-800">Link {index + 1}</span>
                                {domain && (
                                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                    {domain}
                                  </span>
                                )}
                              </div>
                              <div className="group cursor-pointer" onClick={() => window.open(linkUrl, '_blank')}>
                                <p className="text-sm text-blue-600 group-hover:text-blue-700 group-hover:underline transition-colors" title={linkUrl}>
                                  {displayUrl}
                                </p>
                              </div>
                              {linkNote && (
                                <p className="text-xs text-gray-500 mt-2 px-3 py-2 bg-gray-50 rounded-md">
                                  <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m-7 4h10a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  {linkNote}
                                </p>
                              )}
                            </div>
                            <div className="flex-shrink-0 flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(linkUrl);
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                title="Copy link"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                              <a
                                href={linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Open in new tab"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {(!selectedSubmissionItems.links || selectedSubmissionItems.links.length === 0) && selectedSubmissionItems.submission_url && (
                      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-semibold text-gray-800">Submission Link</span>
                              {(() => {
                                try {
                                  const urlObj = new URL(selectedSubmissionItems.submission_url);
                                  const domain = urlObj.hostname.replace('www.', '');
                                  return (
                                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                      {domain}
                                    </span>
                                  );
                                } catch {
                                  return null;
                                }
                              })()}
                            </div>
                            <div className="group cursor-pointer" onClick={() => window.open(selectedSubmissionItems.submission_url, '_blank')}>
                              <p className="text-sm text-blue-600 group-hover:text-blue-700 group-hover:underline transition-colors" title={selectedSubmissionItems.submission_url}>
                                {selectedSubmissionItems.submission_url.length > 60
                                  ? selectedSubmissionItems.submission_url.substring(0, 60) + '...'
                                  : selectedSubmissionItems.submission_url}
                              </p>
                            </div>
                          </div>
                          <div className="flex-shrink-0 flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(selectedSubmissionItems.submission_url);
                              }}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                              title="Copy link"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <a
                              href={selectedSubmissionItems.submission_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Open in new tab"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedSubmissionItems.notes && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Notes</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedSubmissionItems.notes}</p>
                  </div>
                </div>
              )}

              {selectedSubmissionItems.file_url && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">File Attachment</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <a
                      href={selectedSubmissionItems.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download File
                    </a>
                  </div>
                </div>
              )}

              {(selectedSubmissionItems.grade || selectedSubmissionItems.feedback) && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Review</h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    {selectedSubmissionItems.grade && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</p>
                        <p className="text-lg font-semibold text-green-700 mt-1">{selectedSubmissionItems.grade}</p>
                      </div>
                    )}
                    {selectedSubmissionItems.feedback && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Feedback</p>
                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{selectedSubmissionItems.feedback}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSelectedSubmissionItems(null)
                    setLuckyWinner(null)
                    setHideLuckyBanner(false)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedSubmissionDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[10000]">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 pb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Submission Details - {selectedSubmissionDetail.user?.name}
                </h3>
                <button
                  onClick={() => { setSelectedSubmissionDetail(null); setLuckyWinner(null) }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {luckyWinner && (selectedSubmissionDetail.user?.name === luckyWinner || selectedSubmissionDetail.user?.email === luckyWinner) && (
                <div className="mb-6 p-5 rounded-xl border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 via-pink-50 to-red-50">
                  <div className="flex items-center">
                    <svg className="w-8 h-8 text-yellow-500 mr-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.036a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.036a1 1 0 00-1.175 0l-2.802 2.036c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-yellow-700 font-semibold">Lucky Draw Winner</div>
                      <div className="text-2xl md:text-3xl font-extrabold text-pink-700 mt-1">{luckyWinner}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Student Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Name:</p>
                    <p className="text-sm text-gray-600">{selectedSubmissionDetail.user?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email:</p>
                    <p className="text-sm text-gray-600">{selectedSubmissionDetail.user?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status:</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedSubmissionDetail.status)}`}>
                      {selectedSubmissionDetail.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Submitted:</p>
                    <p className="text-sm text-gray-600">{formatDate(selectedSubmissionDetail.submitted_at)}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-4">Submission Content</h4>
                
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Notes:</p>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {selectedSubmissionDetail.notes ? selectedSubmissionDetail.notes : 'No notes provided'}
                    </p>
                  </div>
                </div>

                {selectedSubmissionDetail.submission_url && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">URL Submission:</p>
                    <div className="bg-white p-3 rounded border">
                      <a
                        href={selectedSubmissionDetail.submission_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 break-all flex items-center"
                      >
                        {selectedSubmissionDetail.submission_url}
                        <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                )}

                {selectedSubmissionDetail.file_url && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">File Submission:</p>
                    <div className="bg-white p-3 rounded border">
                      <a
                        href={selectedSubmissionDetail.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Submitted File
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {selectedSubmissionDetail.status === 'reviewed' && (
                <div className="mb-6 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-4">Review Information</h4>
                  
                  {selectedSubmissionDetail.grade && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Grade:</p>
                      <div className="bg-white p-3 rounded border">
                        <p className="text-lg font-semibold text-green-600">{selectedSubmissionDetail.grade}</p>
                      </div>
                    </div>
                  )}

                  {selectedSubmissionDetail.feedback && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Feedback:</p>
                      <div className="bg-white p-3 rounded border">
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedSubmissionDetail.feedback}</p>
                      </div>
                    </div>
                  )}

                  {selectedSubmissionDetail.reviewed_at && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Reviewed At:</p>
                      <p className="text-sm text-gray-600">{formatDate(selectedSubmissionDetail.reviewed_at)}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => { setSelectedSubmissionDetail(null); setLuckyWinner(null) }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setSelectedSubmissionDetail(null)
                    handleReviewSubmission(selectedSubmissionDetail)
                  }}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  {selectedSubmissionDetail.status === 'reviewed' ? 'Edit Review' : 'Add Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}