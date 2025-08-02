import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export interface ToastData {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  persistent?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastProps {
  toast: ToastData
  onClose: (id: string) => void
}

function Toast({ toast, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!toast.persistent && toast.duration !== 0) {
      const duration = toast.duration || getDefaultDuration(toast.type)
      const timer = setTimeout(() => {
        handleClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [toast.persistent, toast.duration, toast.type])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onClose(toast.id)
    }, 300) // Match animation duration
  }

  const getDefaultDuration = (type: ToastData['type']) => {
    switch (type) {
      case 'success': return 4000
      case 'info': return 5000
      case 'warning': return 6000
      case 'error': return 8000
      default: return 5000
    }
  }

  const getIconAndColors = (type: ToastData['type']) => {
    switch (type) {
      case 'success':
        return {
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-400',
          titleColor: 'text-green-800',
          messageColor: 'text-green-700'
        }
      case 'error':
        return {
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ),
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-400',
          titleColor: 'text-red-800',
          messageColor: 'text-red-700'
        }
      case 'warning':
        return {
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ),
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-400',
          titleColor: 'text-yellow-800',
          messageColor: 'text-yellow-700'
        }
      case 'info':
      default:
        return {
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          ),
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-400',
          titleColor: 'text-blue-800',
          messageColor: 'text-blue-700'
        }
    }
  }

  const { icon, bgColor, borderColor, iconColor, titleColor, messageColor } = getIconAndColors(toast.type)

  return (
    <div
      className={`
        relative max-w-sm w-full ${bgColor} border ${borderColor} rounded-lg shadow-lg pointer-events-auto
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
        }
      `}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className={`flex-shrink-0 ${iconColor}`}>
            {icon}
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className={`text-sm font-medium ${titleColor}`}>
              {toast.title}
            </p>
            {toast.message && (
              <p className={`mt-1 text-sm ${messageColor}`}>
                {toast.message}
              </p>
            )}
            {toast.action && (
              <div className="mt-3">
                <button
                  onClick={toast.action.onClick}
                  className={`text-sm font-medium ${titleColor} hover:${titleColor} underline`}
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleClose}
              className={`inline-flex ${titleColor} hover:${titleColor} focus:outline-none focus:${titleColor}`}
            >
              <span className="sr-only">Close</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastData[]
  onClose: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

export function ToastContainer({ 
  toasts, 
  onClose, 
  position = 'top-right' 
}: ToastContainerProps) {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4'
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2'
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2'
      default:
        return 'top-4 right-4'
    }
  }

  if (toasts.length === 0) return null

  return createPortal(
    <div 
      className={`fixed z-50 ${getPositionClasses()}`}
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="space-y-3">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onClose={onClose}
          />
        ))}
      </div>
    </div>,
    document.body
  )
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = (toast: Omit<ToastData, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: ToastData = { ...toast, id }
    
    setToasts(current => [...current, newToast])
    return id
  }

  const removeToast = (id: string) => {
    setToasts(current => current.filter(toast => toast.id !== id))
  }

  const clearAllToasts = () => {
    setToasts([])
  }

  // Convenience methods
  const showSuccess = (title: string, message?: string, options?: Partial<ToastData>) => {
    return addToast({ type: 'success', title, message, ...options })
  }

  const showError = (title: string, message?: string, options?: Partial<ToastData>) => {
    return addToast({ type: 'error', title, message, ...options })
  }

  const showWarning = (title: string, message?: string, options?: Partial<ToastData>) => {
    return addToast({ type: 'warning', title, message, ...options })
  }

  const showInfo = (title: string, message?: string, options?: Partial<ToastData>) => {
    return addToast({ type: 'info', title, message, ...options })
  }

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}