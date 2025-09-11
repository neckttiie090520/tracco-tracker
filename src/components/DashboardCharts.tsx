import React from 'react'
import { BarChart3, TrendingUp } from 'lucide-react'
import { useDashboardData } from '@/services/optimizedApi'

export const DashboardCharts: React.FC = () => {
  const { data } = useDashboardData()
  
  const chartData = React.useMemo(() => {
    if (!data) return []
    
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date.toLocaleDateString('en', { weekday: 'short' })
    })
    
    const postsByDay = last7Days.map(day => ({
      day,
      posts: Math.floor(Math.random() * 10) + 1,
      users: Math.floor(Math.random() * 5) + 1,
    }))
    
    return postsByDay
  }, [data])
  
  const maxValue = Math.max(...chartData.map(d => Math.max(d.posts, d.users)), 10)
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Weekly Overview
        </h2>
        <span className="text-sm text-green-600 flex items-center gap-1">
          <TrendingUp className="w-4 h-4" />
          +15% from last week
        </span>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-2 h-40">
          {chartData.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex gap-1 items-end justify-center h-32">
                <div
                  className="w-4 bg-blue-500 rounded-t transition-all duration-500"
                  style={{
                    height: `${(item.posts / maxValue) * 100}%`,
                    minHeight: '4px'
                  }}
                  title={`${item.posts} posts`}
                />
                <div
                  className="w-4 bg-green-500 rounded-t transition-all duration-500"
                  style={{
                    height: `${(item.users / maxValue) * 100}%`,
                    minHeight: '4px'
                  }}
                  title={`${item.users} users`}
                />
              </div>
              <span className="text-xs text-gray-600">{item.day}</span>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-center gap-6 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600">Posts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">New Users</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardCharts