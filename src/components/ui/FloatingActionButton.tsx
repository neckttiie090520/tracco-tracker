import React, { useState } from 'react'
import { Link } from 'react-router-dom'

interface FABAction {
  label: string
  icon: string
  path?: string
  onClick?: () => void
  color?: 'primary' | 'success' | 'warning' | 'error'
}

interface FloatingActionButtonProps {
  actions?: FABAction[]
  mainIcon?: string
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

const colorClasses = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white',
  warning: 'bg-amber-600 hover:bg-amber-700 text-white',
  error: 'bg-red-600 hover:bg-red-700 text-white'
}

const positionClasses = {
  'bottom-right': 'bottom-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'top-right': 'top-6 right-6',
  'top-left': 'top-6 left-6'
}

export function FloatingActionButton({ 
  actions = [],
  mainIcon = '➕',
  position = 'bottom-right'
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (actions.length === 0) return null

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* Action Items */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 space-y-3 animate-fadeIn">
          {actions.map((action, index) => (
            <div 
              key={index}
              className="flex items-center justify-end group"
              style={{ 
                animationDelay: `${index * 50}ms`,
                animation: 'slideIn 0.3s ease-out forwards'
              }}
            >
              {/* Label */}
              <div className="bg-black/80 text-white px-3 py-2 rounded-lg text-sm font-medium mr-3 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {action.label}
              </div>
              
              {/* Action Button */}
              {action.path ? (
                <Link
                  to={action.path}
                  className={`
                    w-12 h-12 rounded-full shadow-lg flex items-center justify-center
                    transform transition-all duration-200 hover:scale-110 hover:shadow-xl
                    ${colorClasses[action.color || 'primary']}
                  `}
                >
                  <span className="text-xl">{action.icon}</span>
                </Link>
              ) : (
                <button
                  onClick={action.onClick}
                  className={`
                    w-12 h-12 rounded-full shadow-lg flex items-center justify-center
                    transform transition-all duration-200 hover:scale-110 hover:shadow-xl
                    ${colorClasses[action.color || 'primary']}
                  `}
                >
                  <span className="text-xl">{action.icon}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 
          text-white rounded-full shadow-2xl
          flex items-center justify-center
          transform transition-all duration-300
          hover:scale-110 hover:shadow-2xl hover:from-blue-700 hover:to-purple-700
          ${isOpen ? 'rotate-45' : 'rotate-0'}
        `}
      >
        <span className="text-2xl">{mainIcon}</span>
      </button>
    </div>
  )
}