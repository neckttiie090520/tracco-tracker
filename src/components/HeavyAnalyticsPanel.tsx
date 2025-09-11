import React from 'react'
import { TrendingUp, BarChart3, PieChart, Activity } from 'lucide-react'

interface AnalyticsProps {
  data: any
}

const HeavyAnalyticsPanel: React.FC<AnalyticsProps> = ({ data }) => {
  const performanceMetrics = React.useMemo(() => {
    const totalItems = (data?.posts?.length || 0) + (data?.users?.length || 0)
    const publishedRatio = data?.posts?.filter((p: any) => p.status === 'published').length / (data?.posts?.length || 1)
    const engagement = data?.comments?.length / (data?.posts?.length || 1)
    
    return {
      totalItems,
      publishedRatio: (publishedRatio * 100).toFixed(1),
      engagement: engagement.toFixed(2),
      growthRate: '+23.5%'
    }
  }, [data])
  
  return (
    <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <PieChart className="w-6 h-6" />
        Advanced Analytics
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-blue-900">
              {performanceMetrics.totalItems}
            </span>
          </div>
          <p className="text-sm text-blue-700">Total Content Items</p>
          <div className="mt-2 h-1 bg-blue-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-green-900">
              {performanceMetrics.publishedRatio}%
            </span>
          </div>
          <p className="text-sm text-green-700">Published Rate</p>
          <div className="mt-2 h-1 bg-green-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-600 rounded-full" style={{ width: `${performanceMetrics.publishedRatio}%` }}></div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold text-purple-900">
              {performanceMetrics.engagement}
            </span>
          </div>
          <p className="text-sm text-purple-700">Engagement Rate</p>
          <div className="mt-2 h-1 bg-purple-200 rounded-full overflow-hidden">
            <div className="h-full bg-purple-600 rounded-full" style={{ width: '60%' }}></div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <PieChart className="w-8 h-8 text-orange-600" />
            <span className="text-2xl font-bold text-orange-900">
              {performanceMetrics.growthRate}
            </span>
          </div>
          <p className="text-sm text-orange-700">Monthly Growth</p>
          <div className="mt-2 h-1 bg-orange-200 rounded-full overflow-hidden">
            <div className="h-full bg-orange-600 rounded-full" style={{ width: '85%' }}></div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t">
        <h3 className="text-lg font-semibold mb-4">Content Distribution</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="inline-block p-3 bg-blue-100 rounded-full mb-2">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold">{data?.posts?.filter((p: any) => p.status === 'draft').length || 0}</p>
            <p className="text-sm text-gray-600">Drafts</p>
          </div>
          <div className="text-center">
            <div className="inline-block p-3 bg-green-100 rounded-full mb-2">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold">{data?.posts?.filter((p: any) => p.status === 'published').length || 0}</p>
            <p className="text-sm text-gray-600">Published</p>
          </div>
          <div className="text-center">
            <div className="inline-block p-3 bg-gray-100 rounded-full mb-2">
              <FileText className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-2xl font-bold">{data?.posts?.filter((p: any) => p.status === 'archived').length || 0}</p>
            <p className="text-sm text-gray-600">Archived</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HeavyAnalyticsPanel

import { FileText } from 'lucide-react'