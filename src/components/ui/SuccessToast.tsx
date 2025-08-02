import React, { useEffect, useState } from 'react'

interface SuccessToastProps {
  isVisible: boolean
  message: string
  description?: string
  onClose: () => void
  duration?: number
}

export function SuccessToast({ 
  isVisible, 
  message, 
  description, 
  onClose, 
  duration = 3000 
}: SuccessToastProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setShow(true)
      const timer = setTimeout(() => {
        setShow(false)
        setTimeout(onClose, 300) // Wait for animation to complete
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onClose])

  if (!isVisible && !show) return null

  return (
    <div className={`
      fixed top-4 right-4 z-[10000] transform transition-all duration-300
      ${show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `}>
      <div className="bg-white rounded-2xl shadow-2xl border border-green-200 overflow-hidden max-w-sm">
        {/* Success bar */}
        <div className="h-1 bg-gradient-to-r from-green-500 to-teal-500" />
        
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🎉</span>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">
                {message}
              </p>
              {description && (
                <p className="text-gray-600 text-xs mt-1">
                  {description}
                </p>
              )}
            </div>
            
            {/* Close button */}
            <button
              onClick={() => {
                setShow(false)
                setTimeout(onClose, 300)
              }}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}