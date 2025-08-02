import React from 'react'

interface ProgressRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  showLabel?: boolean
  color?: 'primary' | 'success' | 'warning' | 'error'
}

const colorClasses = {
  primary: 'text-blue-600',
  success: 'text-green-600',
  warning: 'text-amber-600',
  error: 'text-red-600'
}

export function ProgressRing({ 
  progress, 
  size = 120, 
  strokeWidth = 8,
  showLabel = true,
  color = 'primary' 
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        className={`transform -rotate-90 ${colorClasses[color]}`}
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          className="text-gray-200"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className="transition-all duration-500 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <span className="text-2xl font-bold text-gray-800">{progress}%</span>
            <span className="block text-xs text-gray-600 mt-1">เสร็จสิ้น</span>
          </div>
        </div>
      )}
    </div>
  )
}