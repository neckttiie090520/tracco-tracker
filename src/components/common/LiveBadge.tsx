import React, { useState, useEffect } from 'react'

interface LiveBadgeProps {
  count: number
  maxCount?: number
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
  showZero?: boolean
  className?: string
  children?: React.ReactNode
}

export function LiveBadge({
  count,
  maxCount = 99,
  variant = 'default',
  size = 'md',
  pulse = false,
  showZero = false,
  className = '',
  children
}: LiveBadgeProps) {
  const [animateChange, setAnimateChange] = useState(false)
  const [prevCount, setPrevCount] = useState(count)

  // Animate when count changes
  useEffect(() => {
    if (count !== prevCount) {
      setAnimateChange(true)
      setPrevCount(count)
      
      const timer = setTimeout(() => {
        setAnimateChange(false)
      }, 300)
      
      return () => clearTimeout(timer)
    }
  }, [count, prevCount])

  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-500 text-white'
      case 'warning':
        return 'bg-yellow-500 text-white'
      case 'error':
        return 'bg-red-500 text-white'
      case 'info':
        return 'bg-blue-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-1.5 py-0.5 min-w-[18px] h-4'
      case 'lg':
        return 'text-sm px-2.5 py-1 min-w-[28px] h-7'
      default:
        return 'text-xs px-2 py-1 min-w-[20px] h-5'
    }
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString()
  const shouldShow = count > 0 || showZero

  if (!shouldShow && !children) return null

  return (
    <span
      className={`
        inline-flex items-center justify-center font-medium rounded-full
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${animateChange ? 'animate-bounce' : ''}
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      {children || displayCount}
    </span>
  )
}

// Notification badge for icons/buttons
interface NotificationBadgeProps {
  count: number
  show?: boolean
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  className?: string
}

export function NotificationBadge({ 
  count, 
  show = true, 
  position = 'top-right',
  className = '' 
}: NotificationBadgeProps) {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return '-top-1 -right-1'
      case 'top-left':
        return '-top-1 -left-1'
      case 'bottom-right':
        return '-bottom-1 -right-1'
      case 'bottom-left':
        return '-bottom-1 -left-1'
      default:
        return '-top-1 -right-1'
    }
  }

  if (!show || count <= 0) return null

  return (
    <LiveBadge
      count={count}
      variant="error"
      size="sm"
      pulse={count > 0}
      className={`absolute ${getPositionClasses()} ${className}`}
    />
  )
}

// Live counter for dashboard stats
interface LiveCounterProps {
  label: string
  count: number
  trend?: 'up' | 'down' | 'neutral'
  changeAmount?: number
  icon?: React.ReactNode
  className?: string
}

export function LiveCounter({
  label,
  count,
  trend = 'neutral',
  changeAmount,
  icon,
  className = ''
}: LiveCounterProps) {
  const [animateCount, setAnimateCount] = useState(false)
  const [prevCount, setPrevCount] = useState(count)

  useEffect(() => {
    if (count !== prevCount) {
      setAnimateCount(true)
      setPrevCount(count)
      
      const timer = setTimeout(() => {
        setAnimateCount(false)
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [count, prevCount])

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        )
      case 'down':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        )
      default:
        return null
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {icon && <div className="text-gray-400">{icon}</div>}
          <p className="text-sm font-medium text-gray-600">{label}</p>
        </div>
        {getTrendIcon()}
      </div>
      
      <div className="mt-2 flex items-end space-x-2">
        <p className={`text-2xl font-semibold text-gray-900 ${animateCount ? 'animate-pulse' : ''}`}>
          {count.toLocaleString()}
        </p>
        
        {changeAmount !== undefined && changeAmount !== 0 && (
          <p className={`text-sm ${getTrendColor()}`}>
            {changeAmount > 0 ? '+' : ''}{changeAmount}
          </p>
        )}
      </div>
    </div>
  )
}

// Status indicator dot
interface StatusDotProps {
  status: 'online' | 'offline' | 'busy' | 'away'
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
  className?: string
}

export function StatusDot({ 
  status, 
  size = 'md', 
  pulse = false,
  className = '' 
}: StatusDotProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'offline':
        return 'bg-gray-400'
      case 'busy':
        return 'bg-red-500'
      case 'away':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2'
      case 'lg':
        return 'w-4 h-4'
      default:
        return 'w-3 h-3'
    }
  }

  return (
    <div className="relative inline-flex">
      <div
        className={`
          rounded-full ${getStatusColor()} ${getSizeClasses()}
          ${pulse ? 'animate-pulse' : ''}
          ${className}
        `}
      />
      {pulse && (
        <div
          className={`
            absolute rounded-full ${getStatusColor()} ${getSizeClasses()}
            animate-ping opacity-20
          `}
        />
      )}
    </div>
  )
}