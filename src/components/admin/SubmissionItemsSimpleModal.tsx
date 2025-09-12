import React, { useEffect, useRef } from 'react'

interface SubmissionItemsSimpleModalProps {
  submission: any
  task: any
  onClose: () => void
}

export function SubmissionItemsSimpleModal({ submission, task, onClose }: SubmissionItemsSimpleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Lock body scroll when modal opens
    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    
    return () => {
      // Restore body scroll when modal closes
      document.body.style.overflow = previousBodyOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  if (!submission) {
    return null
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
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

  // Extract data safely
  const isGroup = submission?.is_group_submission || false
  const groupData = submission?.group || null
  const userData = submission?.user || {}
  const groupMembers = submission?.group_members || []
  const links = submission?.links || []
  const notes = submission?.notes || ''
  const submissionUrl = submission?.submission_url || ''
  const fileUrl = submission?.file_url || ''
  const grade = submission?.grade || ''
  const feedback = submission?.feedback || ''
  const status = submission?.status || 'draft'

  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 backdrop-blur-sm overscroll-contain"
      style={{ zIndex: 10002 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Submission Details</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {isGroup && groupData
                    ? `${groupData.name} (Group)`
                    : userData?.name || 'Unknown Student'
                  } • {task?.title || 'Task'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 pb-8">
            {/* Student/Group Info */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                {isGroup ? 'Group Information' : 'Student Information'}
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {isGroup && groupData ? (
                  <div className="space-y-4">
                    {/* Group Header */}
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                      </svg>
                      <span className="font-semibold text-blue-800 text-base">{groupData.name}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {groupMembers.length} สมาชิก
                      </span>
                    </div>
                    
                    {/* Submitter Info */}
                    <div className="border-l-4 border-green-500 pl-3 py-2 bg-green-50 rounded-r">
                      <div className="text-xs font-medium text-green-700 uppercase tracking-wider mb-1">ผู้ส่งงาน</div>
                      <div className="text-sm text-gray-900 font-medium">{userData?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-600">{userData?.email || 'No email'}</div>
                    </div>
                    
                    {/* Members List */}
                    {groupMembers.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">สมาชิกทั้งหมด</div>
                        <div className="space-y-1">
                          {groupMembers.map((member: any, idx: number) => {
                            const isSubmitter = member?.email === userData?.email
                            return (
                              <div key={idx} className={`flex items-center gap-2 p-2 rounded text-sm ${
                                isSubmitter
                                  ? 'bg-green-100 border border-green-300' 
                                  : 'bg-white border border-gray-200'
                              }`}>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name</p>
                      <p className="text-sm text-gray-900 mt-1">{userData?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</p>
                      <p className="text-sm text-gray-900 mt-1">{userData?.email || 'N/A'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Status</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(status)}`}>
                  {status}
                </span>
                {submission?.submitted_at && (
                  <p className="text-sm text-gray-600 mt-2">
                    Submitted: {formatDate(submission.submitted_at)}
                  </p>
                )}
              </div>
            </div>

            {/* Links */}
            {(links.length > 0 || submissionUrl) && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Links ({links.length + (submissionUrl ? 1 : 0)})
                </h3>
                <div className="space-y-2">
                  {links.map((link: string, index: number) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700">Link {index + 1}</span>
                          <p className="text-sm text-blue-600 break-all mt-1">{link}</p>
                        </div>
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 p-2 text-gray-400 hover:text-blue-600 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  ))}
                  
                  {!links.length && submissionUrl && (
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700">Submission Link</span>
                          <p className="text-sm text-blue-600 break-all mt-1">{submissionUrl}</p>
                        </div>
                        <a
                          href={submissionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 p-2 text-gray-400 hover:text-blue-600 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {notes && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Notes</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
                </div>
              </div>
            )}

            {/* File */}
            {fileUrl && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">File Attachment</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <a
                    href={fileUrl}
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

            {/* Grade & Feedback */}
            {(grade || feedback) && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Review</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  {grade && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</p>
                      <p className="text-lg font-semibold text-green-700 mt-1">{grade}</p>
                    </div>
                  )}
                  {feedback && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Feedback</p>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!notes && !links.length && !submissionUrl && !fileUrl && (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500">No submission content available</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}