import React from 'react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: string
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

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon = '📊',
  trend,
  color = 'primary' 
}: StatCardProps) {
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
          
          <div className="text-4xl ml-4">{icon}</div>
        </div>
      </div>
    </div>
  )
}