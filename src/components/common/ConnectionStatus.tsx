import React from 'react'
import { useConnectionStatus } from '../../services/realtimeService'

interface ConnectionStatusProps {
  showLabel?: boolean
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline'
  className?: string
}

export function ConnectionStatus({ 
  showLabel = false, 
  position = 'inline',
  className = '' 
}: ConnectionStatusProps) {
  const { connected, reconnecting, error, lastConnected, reconnect } = useConnectionStatus()

  const getStatus = () => {
    if (reconnecting) return 'reconnecting'
    if (!connected) return 'disconnected'
    if (error) return 'error'
    return 'connected'
  }

  const getStatusColor = () => {
    switch (getStatus()) {
      case 'connected':
        return 'text-green-500'
      case 'reconnecting':
        return 'text-yellow-500'
      case 'disconnected':
        return 'text-red-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusIcon = () => {
    switch (getStatus()) {
      case 'connected':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'reconnecting':
        return (
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )
      case 'disconnected':
      case 'error':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (getStatus()) {
      case 'connected':
        return 'Connected'
      case 'reconnecting':
        return 'Reconnecting...'
      case 'disconnected':
        return 'Disconnected'
      case 'error':
        return 'Connection Error'
      default:
        return 'Unknown'
    }
  }

  const getPositionClasses = () => {
    if (position === 'inline') return ''
    
    const baseClasses = 'fixed z-50'
    switch (position) {
      case 'top-right':
        return `${baseClasses} top-4 right-4`
      case 'top-left':
        return `${baseClasses} top-4 left-4`
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`
      default:
        return ''
    }
  }

  const handleClick = () => {
    if (getStatus() === 'disconnected' || getStatus() === 'error') {
      reconnect()
    }
  }

  const isClickable = getStatus() === 'disconnected' || getStatus() === 'error'

  return (
    <div 
      className={`
        flex items-center space-x-2 ${getPositionClasses()} ${className}
        ${isClickable ? 'cursor-pointer hover:opacity-80' : ''}
      `}
      onClick={isClickable ? handleClick : undefined}
      title={
        getStatus() === 'connected' && lastConnected
          ? `Connected since ${lastConnected.toLocaleTimeString()}`
          : error || getStatusText()
      }
    >
      <div className={`${getStatusColor()}`}>
        {getStatusIcon()}
      </div>
      
      {showLabel && (
        <span className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      )}
      
      {/* Pulse animation for connected state */}
      {getStatus() === 'connected' && (
        <div className="relative">
          <div className="absolute -inset-1 bg-green-500 rounded-full opacity-20 animate-pulse"></div>
        </div>
      )}
    </div>
  )
}

// Compact version for headers/navbars
export function ConnectionIndicator({ className = '' }: { className?: string }) {
  return (
    <ConnectionStatus 
      showLabel={false} 
      position="inline" 
      className={`px-2 py-1 rounded-full bg-gray-100 ${className}`}
    />
  )
}

// Full status with reconnect button for settings/admin panels
export function ConnectionStatusPanel({ className = '' }: { className?: string }) {
  const { connected, reconnecting, error, lastConnected, reconnect } = useConnectionStatus()
  
  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ConnectionStatus showLabel={true} />
          {lastConnected && (
            <span className="text-xs text-gray-500">
              Last connected: {lastConnected.toLocaleString()}
            </span>
          )}
        </div>
        
        {(error || !connected) && !reconnecting && (
          <button
            onClick={reconnect}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            disabled={reconnecting}
          >
            Reconnect
          </button>
        )}
      </div>
      
      {error && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 rounded p-2">
          {error}
        </div>
      )}
    </div>
  )
}