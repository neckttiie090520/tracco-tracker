import React from 'react'
import { BiBarChartAlt2, BiCheckCircle, BiClock, BiAlarmExclamation, BiBuilding } from 'react-icons/bi'
import { FaChartLine, FaTasks, FaUsers, FaClock, FaExclamationTriangle } from 'react-icons/fa'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: string | React.ComponentType<any>
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: 'primary' | 'success' | 'warning' | 'error'
}

const colorClasses = {
  primary: 'from-blue-500 to-purple-600',
  success: 'from-green-500 to-teal-600',
  warning: 'from-amber-500 to-orange-600',
  error: 'from-red-500 to-pink-600'
}

const getDefaultIcon = (color: string) => {
  switch (color) {
    case 'success': return FaTasks
    case 'warning': return FaClock
    case 'error': return FaExclamationTriangle
    default: return BiBarChartAlt2
  }
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon,
  trend,
  color = 'primary' 
}: StatCardProps) {
  const IconComponent = icon && typeof icon !== 'string' ? icon : getDefaultIcon(color)
  const iconColorClass = {
    primary: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-amber-600',
    error: 'text-red-600'
  }[color]

  return (
    <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover-lift">
      {/* Gradient Background */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses[color]} opacity-10 rounded-full -translate-y-16 translate-x-16`} />
      
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-600 font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
            
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
            
            {trend && (
              <div className="flex items-center mt-3">
                <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-gray-500 ml-2">จากเดือนที่แล้ว</span>
              </div>
            )}
          </div>
          
          <div className={`ml-4 ${iconColorClass}`}>
            {typeof icon === 'string' ? (
              <span className="text-4xl">{icon}</span>
            ) : (
              <div className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-xl">
                <IconComponent className="w-6 h-6" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}