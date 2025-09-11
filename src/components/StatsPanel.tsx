import React from 'react'
import { TrendingUp, Users, FileText, MessageSquare } from 'lucide-react'
import { useDashboardData } from '@/services/optimizedApi'

const StatsPanel: React.FC = () => {
  const { data, isLoading } = useDashboardData()
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i}>
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  const stats = [
    {
      label: 'Total Posts',
      value: data?.stats?.totalPosts || 0,
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Active Users',
      value: data?.stats?.activeUsers || 0,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Comments',
      value: data?.stats?.recentComments || 0,
      icon: MessageSquare,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50'
    },
    {
      label: 'Growth',
      value: '+12%',
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50'
    }
  ]
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-lg font-semibold">{stat.value}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default StatsPanel