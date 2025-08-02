import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  className?: string
}

export function LoadingSpinner({ 
  size = 'md', 
  message, 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="text-center">
        <div
          className={`${sizeClasses[size]} border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto`}
        />
        {message && (
          <p className="text-gray-600 mt-2 text-sm">{message}</p>
        )}
      </div>
    </div>
  )
}