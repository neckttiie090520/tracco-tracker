import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface SubmissionItemsModalWrapperProps {
  submission: any
  task: any
  onClose: () => void
}

export function SubmissionItemsModalWrapper({ submission, task, onClose }: SubmissionItemsModalWrapperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted || !submission) {
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

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ zIndex: 10001 }}
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
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                {submission.is_group_submission ? 'Group Information' : 'Student Information'}
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {submission.is_group_submission && submission.group ? (
                  <div className="space-y-4">
                    {/* Group Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                        </svg>
                        <div>
                          <span className="font-semibold text-blue-800 text-base">{submission.group.name}</span>
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {submission.group_members?.length || 0} สมาชิก
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Submitter Info */}
                    <div className="border-l-4 border-green-500 pl-3 py-1 bg-green-50 rounded-r">
                      <div className="text-xs font-medium text-green-700 uppercase tracking-wider mb-1">ผู้ส่งงาน</div>
                      <div className="text-sm text-gray-900 font-medium">{submission.user?.name}</div>
                      <div className="text-xs text-gray-600">{submission.user?.email}</div>
                    </div>
                    
                    {/* Members List */}
                    {submission.group_members && submission.group_members.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">สมาชิกทั้งหมด</div>
                        <div className="grid grid-cols-2 gap-2">
                          {submission.group_members.map((member: any, idx: number) => (
                            <div key={idx} className={`flex items-center gap-2 p-2 rounded ${
                              member.email === submission.user?.email 
                                ? 'bg-green-100 border border-green-300' 
                                : 'bg-white border border-gray-200'
                            }`}>
                              <div className="flex-shrink-0">
                                {member.email === submission.user?.email ? (
                                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-xs font-medium truncate ${
                                  member.email === submission.user?.email ? 'text-green-800' : 'text-gray-900'
                                }`}>
                                  {member.name}
                                  {member.email === submission.user?.email && (
                                    <span className="ml-1 text-green-600">(ผู้ส่ง)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                          <p className="text-sm text-blue-600 break-all">{link}</p>
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
                          <p className="text-sm text-blue-600 break-all">{submission.submission_url}</p>
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