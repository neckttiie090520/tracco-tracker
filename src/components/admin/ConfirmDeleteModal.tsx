import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmDeleteModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  loading = false 
}: ConfirmDeleteModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Handle escape key and focus management
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onCancel()
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && e.target === modalRef.current && !loading) {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)
    
    // Focus the cancel button by default (safer for delete operations)
    const cancelButton = modalRef.current?.querySelector('button:first-of-type') as HTMLButtonElement
    if (cancelButton) {
      cancelButton.focus()
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, loading, onCancel])

  if (!isOpen) return null

  const modalContent = (
    <div 
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all duration-200 scale-100 opacity-100">
        <div className="p-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3 w-0 flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {title}
              </h3>
              <p className="text-sm text-gray-600">
                {message}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Deleting...
                </div>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}