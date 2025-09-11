import React from 'react'
import { Activity, Clock } from 'lucide-react'
import { useDashboardData } from '@/services/optimizedApi'

const ActivityFeed: React.FC = () => {
  const { data, isLoading } = useDashboardData()
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-2 h-2 bg-gray-200 rounded-full mt-2"></div>
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-2 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  const activities = [
    ...(data?.comments || []).map(comment => ({
      id: `comment-${comment.id}`,
      type: 'comment',
      message: `New comment on post`,
      time: new Date(comment.created_at),
      color: 'bg-blue-500'
    })),
    ...(data?.posts || []).slice(0, 3).map(post => ({
      id: `post-${post.id}`,
      type: 'post',
      message: `"${post.title}" was ${post.status}`,
      time: new Date(post.created_at),
      color: post.status === 'published' ? 'bg-green-500' : 'bg-yellow-500'
    })),
    ...(data?.users || []).slice(0, 2).map(user => ({
      id: `user-${user.id}`,
      type: 'user',
      message: `${user.name} joined`,
      time: new Date(user.created_at),
      color: 'bg-purple-500'
    }))
  ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 8)
  
  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recent Activity
        </h2>
      </div>
      <div className="p-4">
        <div className="space-y-4">
          {activities.map(activity => (
            <div key={activity.id} className="flex gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className={`w-2 h-2 rounded-full ${activity.color}`}></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{activity.message}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(activity.time)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ActivityFeed