import React, { useState, useEffect, useRef, useMemo } from 'react'
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
  const { submissions, loading, error, refetch } = useTaskSubmissions(task?.id)
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  const [selectedSubmissionDetail, setSelectedSubmissionDetail] = useState<any>(null)
  const [selectedSubmissionItems, setSelectedSubmissionItems] = useState<any>(null)
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

  if (!task) return null

  return (
    <>
      <div 
        ref={modalRef}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm"
      >
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">{task.title} - Submissions</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="text-center py-8">
              <h3 className="text-lg text-gray-600">Task Submissions Modal</h3>
              <p className="text-sm text-gray-500 mt-2">Modal is working properly</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}