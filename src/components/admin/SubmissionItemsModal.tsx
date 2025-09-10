import React from 'react'
import { createPortal } from 'react-dom'

interface SubmissionItemsModalProps {
  submission: any
  task: any
  onClose: () => void
}

export function SubmissionItemsModal({ submission, task, onClose }: SubmissionItemsModalProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10001] backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Submission Details</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {submission.is_group_submission && submission.group 
                    ? `${submission.group.name} (Group)`
                    : submission.user?.name || 'Unknown Student'
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
          <div className="flex-1 overflow-y-auto p-6">
            {/* Student/Group Info */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Student Information</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {submission.is_group_submission && submission.group ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                      </svg>
                      <span className="font-semibold text-blue-800">{submission.group.name}</span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><span className="font-medium">Members:</span> {submission.group_members?.map(m => m.name).join(', ') || 'N/A'}</p>
                      <p><span className="font-medium">Submitted by:</span> {submission.user?.name} ({submission.user?.email})</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name</p>
                      <p className="text-sm text-gray-900 mt-1">{submission.user?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</p>
                      <p className="text-sm text-gray-900 mt-1">{submission.user?.email || 'N/A'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submission Status & Time */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Status & Timeline</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</p>
                    <div className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(submission.status)}`}>
                        {submission.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted At</p>
                    <p className="text-sm text-gray-900 mt-1">{formatDate(submission.submitted_at)}</p>
                  </div>
                  {submission.updated_at && submission.updated_at !== submission.submitted_at && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</p>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(submission.updated_at)}</p>
                    </div>
                  )}
                  {submission.reviewed_at && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Reviewed At</p>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(submission.reviewed_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Links Section */}
            {(submission.links?.length > 0 || submission.submission_url) && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Links ({(submission.links?.length || 0) + (submission.submission_url ? 1 : 0)})
                </h3>
                <div className="space-y-2">
                  {/* Multiple links */}
                  {Array.isArray(submission.links) && submission.links.map((link: string, index: number) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-700">Link {index + 1}</span>
                            <span className="text-xs text-gray-500">
                              {submission.link_timestamps?.[index] && formatDate(submission.link_timestamps[index])}
                            </span>
                          </div>
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 break-all block"
                          >
                            {link}
                          </a>
                        </div>
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Open link"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  ))}
                  
                  {/* Single submission URL (fallback) */}
                  {!Array.isArray(submission.links) && submission.submission_url && (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-700">Submission Link</span>
                          </div>
                          <a
                            href={submission.submission_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 break-all block"
                          >
                            {submission.submission_url}
                          </a>
                        </div>
                        <a
                          href={submission.submission_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Open link"
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

            {/* Notes Section */}
            {submission.notes && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Notes</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.notes}</p>
                </div>
              </div>
            )}

            {/* File Attachment */}
            {submission.file_url && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">File Attachment</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <a
                    href={submission.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md transition-colors"
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
            {(submission.grade || submission.feedback) && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Review</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  {submission.grade && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</p>
                      <p className="text-lg font-semibold text-green-700 mt-1">{submission.grade}</p>
                    </div>
                  )}
                  {submission.feedback && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Feedback</p>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{submission.feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!submission.notes && !submission.links?.length && !submission.submission_url && !submission.file_url && (
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

  return createPortal(modalContent, document.body)
}