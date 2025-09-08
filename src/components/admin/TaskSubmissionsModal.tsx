import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTaskSubmissions } from '../../hooks/useSubmissions'
import { submissionService } from '../../services/submissions'
import { useAuth } from '../../hooks/useAuth'
import { LuckyDrawSlot } from './LuckyDrawSlot'

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
  const [luckyWinner, setLuckyWinner] = useState<string | null>(null)
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

  const eligibleNames = useMemo(() => {
    if (!submissions) return [] as string[]
    // pick from users who have actually submitted (status submitted or reviewed)
    const list = submissions
      .filter((s: any) => s?.status && s.status !== 'draft')
      .map((s: any) => s?.user?.name || s?.user?.email || 'Unknown')
    // de-duplicate
    return Array.from(new Set(list))
  }, [submissions])

  // Quick stats
  const quickStats = useMemo(() => {
    const counts = { total: submissions?.length || 0, submitted: 0, reviewed: 0, draft: 0 }
    ;(submissions || []).forEach((s: any) => {
      if (s.status === 'submitted') counts.submitted += 1
      else if (s.status === 'reviewed') counts.reviewed += 1
      else counts.draft += 1
    })
    return counts
  }, [submissions])

  // Filter, search, sort
  const filtered = useMemo(() => {
    let list = submissions || []
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
  }, [submissions, search, statusFilter, sortBy, contentOnly])

  const openWinnerDetail = (winnerNameOrEmail: string) => {
    if (!submissions || !winnerNameOrEmail) return
    const match = submissions.find((s: any) => {
      const name = s?.user?.name || ''
      const email = s?.user?.email || ''
      return name === winnerNameOrEmail || email === winnerNameOrEmail
    })
    if (match) {
      setSelectedSubmissionDetail(match)
      const display = match?.user?.name || match?.user?.email || winnerNameOrEmail
      setLuckyWinner(display)
    }
  }

  // Handle escape key and focus management
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

  // Sync default Lucky Draw visibility when opened from quick action
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

  // Row-level refresh removed per request

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

  const modalContent = (
    <div 
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-200 scale-100 opacity-100">
        <div className="p-6">
          {/* Header */}
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
                  className="text-sm bg-pink-600 hover:bg-pink-700 text-white px-3 py-2 rounded-md font-medium flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Lucky Draw
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

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600">Loading submissions...</span>
            </div>
          )}

          {!loading && !error && showLuckyDraw && (
            <div className="mb-6">
              <LuckyDrawSlot
                names={eligibleNames}
                reelId={`reel-${task?.id || 'task'}`}
                onWinner={(name) => {
                  // optional: toast or console
                  console.log('Lucky winner:', name)
                  openWinnerDetail(name)
                }}
              />
            </div>
          )}

          {/* Controls Bar */}
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
            <>
              {filtered && filtered.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Submissions Yet</h3>
                  <p className="text-gray-600">No items match your search or filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filtered?.map((submission) => (
                        <tr key={submission.id} className={`hover:bg-gray-50 ${compact ? 'text-sm' : ''}`} onDoubleClick={() => setSelectedSubmissionDetail(submission)}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {submission.user?.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {submission.user?.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(submission.status)}`}>
                              {submission.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              {submission.notes && (
                                <button
                                  onClick={() => setSelectedSubmissionDetail(submission)}
                                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
                                  title="Click to view notes"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Notes
                                </button>
                              )}
                              {submission.submission_url && (
                                <a
                                  href={submission.submission_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-full transition-colors"
                                  title="Open submission URL"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  URL
                                </a>
                              )}
                              {submission.file_url && (
                                <a
                                  href={submission.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-full transition-colors"
                                  title="View submitted file"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  File
                                </a>
                              )}
                              {!submission.notes && !submission.submission_url && !submission.file_url && (
                                <span className="text-xs text-gray-400 italic">No content</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {submission.grade || 'Not graded'}
                            </div>
                            {submission.feedback && (
                              <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                                {submission.feedback}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(submission.submitted_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => setSelectedSubmissionDetail(submission)}
                              className="text-gray-700 hover:text-gray-900 text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors font-medium"
                              title="View submission details"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleReviewSubmission(submission)}
                              className="text-blue-600 hover:text-blue-900 text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors font-medium"
                            >
                              {submission.status === 'reviewed' ? 'Edit Review' : 'Review'}
                            </button>
                            {/* per-row refresh removed */}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[10000]">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
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

              {/* Submission Content */}
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

              {/* Review Form */}
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

      {/* Submission Detail Modal */}
      {selectedSubmissionDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[10000]">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
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

              {/* Student Info */}
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

              {/* Submission Content */}
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

              {/* Review Information */}
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

  return createPortal(modalContent, document.body)
}


