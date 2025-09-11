import React, { useState, useCallback, useMemo, Suspense, lazy } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Filter, RefreshCw, Users, FileText, TrendingUp } from 'lucide-react'
import { debounce, throttle, useDebounce } from '@/utils/debounceThrottle'
import { optimizedApi, useDashboardData, usePostsAndUsers } from '@/services/optimizedApi'
import { CACHE_CONFIG } from '@/lib/queryClient'

const HeavyAnalyticsPanel = lazy(() => import('./HeavyAnalyticsPanel'))

interface FilterOptions {
  status: 'all' | 'draft' | 'published' | 'archived'
  userRole: 'all' | 'admin' | 'user' | 'moderator'
  dateRange: 'all' | 'today' | 'week' | 'month'
}

export const OptimizedPostsAndUsers: React.FC = () => {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    userRole: 'all',
    dateRange: 'all'
  })
  const [showAnalytics, setShowAnalytics] = useState(false)
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  
  const { data, isLoading, error, refetch, isFetching } = useDashboardData()
  
  const prefetchRelatedData = useCallback(async () => {
    if (data?.posts) {
      const userIds = [...new Set(data.posts.map(p => p.author_id))]
      
      await Promise.all([
        ...userIds.map(userId =>
          queryClient.prefetchQuery({
            queryKey: ['user', userId],
            queryFn: async () => {
              const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()
              if (error) throw error
              return data
            },
            staleTime: CACHE_CONFIG.STABLE.staleTime
          })
        )
      ])
    }
  }, [data, queryClient])
  
  React.useEffect(() => {
    prefetchRelatedData()
  }, [prefetchRelatedData])
  
  const handleSearchChange = useCallback(
    debounce((value: string) => {
      console.log('Searching for:', value)
    }, 300),
    []
  )
  
  const handleScroll = useCallback(
    throttle(() => {
      const scrollPosition = window.scrollY
      if (scrollPosition > 300 && !showAnalytics) {
        setShowAnalytics(true)
      }
    }, 200),
    [showAnalytics]
  )
  
  React.useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])
  
  const filteredPosts = useMemo(() => {
    if (!data?.posts) return []
    
    return data.posts.filter(post => {
      const matchesSearch = debouncedSearchTerm === '' || 
        post.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      
      const matchesStatus = filters.status === 'all' || post.status === filters.status
      
      const matchesDate = filters.dateRange === 'all' || (() => {
        const postDate = new Date(post.created_at)
        const now = new Date()
        
        switch (filters.dateRange) {
          case 'today':
            return postDate.toDateString() === now.toDateString()
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            return postDate >= weekAgo
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            return postDate >= monthAgo
          default:
            return true
        }
      })()
      
      return matchesSearch && matchesStatus && matchesDate
    })
  }, [data?.posts, debouncedSearchTerm, filters])
  
  const filteredUsers = useMemo(() => {
    if (!data?.users) return []
    
    return data.users.filter(user => {
      const matchesSearch = debouncedSearchTerm === '' ||
        user.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      
      const matchesRole = filters.userRole === 'all' || user.role === filters.userRole
      
      return matchesSearch && matchesRole
    })
  }, [data?.users, debouncedSearchTerm, filters])
  
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] }),
      queryClient.invalidateQueries({ queryKey: ['posts-and-users'] })
    ])
  }, [refetch, queryClient])
  
  const optimisticUpdate = useCallback(async (postId: string, updates: Partial<Post>) => {
    queryClient.setQueryData(['dashboard-data'], (oldData: any) => {
      if (!oldData) return oldData
      
      return {
        ...oldData,
        posts: oldData.posts.map((post: Post) =>
          post.id === postId ? { ...post, ...updates } : post
        )
      }
    })
    
    try {
      const { error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', postId)
      
      if (error) throw error
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
      console.error('Failed to update post:', error)
    }
  }, [queryClient])
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold">Error loading data</h3>
        <p className="text-red-600">{error.message}</p>
        <button onClick={handleRefresh} className="mt-4 px-4 py-2 bg-red-600 text-white rounded">
          Retry
        </button>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search posts and users..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  handleSearchChange(e.target.value)
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            
            <select
              value={filters.userRole}
              onChange={(e) => setFilters(prev => ({ ...prev, userRole: e.target.value as any }))}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
            </select>
            
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Posts</p>
              <p className="text-2xl font-bold">{data?.stats.totalPosts || 0}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold">{data?.stats.activeUsers || 0}</p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Recent Comments</p>
              <p className="text-2xl font-bold">{data?.stats.recentComments || 0}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Filtered Results</p>
              <p className="text-2xl font-bold">
                {filteredPosts.length + filteredUsers.length}
              </p>
            </div>
            <Filter className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Posts ({filteredPosts.length})
            </h2>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto">
            {filteredPosts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No posts found</p>
            ) : (
              <div className="space-y-3">
                {filteredPosts.map(post => (
                  <div key={post.id} className="p-3 border rounded-lg hover:bg-gray-50">
                    <h3 className="font-medium">{post.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{post.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        post.status === 'published' ? 'bg-green-100 text-green-800' :
                        post.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {post.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Users ({filteredUsers.length})
            </h2>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No users found</p>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                    <img
                      src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.name}`}
                      alt={user.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium">{user.name}</h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'moderator' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {showAnalytics && (
        <Suspense fallback={
          <div className="mt-6 bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        }>
          <HeavyAnalyticsPanel data={data} />
        </Suspense>
      )}
    </div>
  )
}

import { supabase } from '@/lib/supabase'

interface Post {
  id: string
  title: string
  content: string
  author_id: string
  created_at: string
  updated_at: string
  status: 'draft' | 'published' | 'archived'
  tags: string[]
}