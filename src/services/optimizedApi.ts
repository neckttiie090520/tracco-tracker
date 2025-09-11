import { supabase } from '@/lib/supabase'
import { queryKeys, CACHE_CONFIG } from '@/lib/queryClient'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'

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

interface User {
  id: string
  name: string
  email: string
  avatar_url: string
  role: string
  created_at: string
}

interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
}

interface DashboardData {
  posts: Post[]
  users: User[]
  comments: Comment[]
  stats: {
    totalPosts: number
    activeUsers: number
    recentComments: number
  }
}

export const optimizedApi = {
  async fetchPostsAndUsers() {
    const [postsResult, usersResult] = await Promise.all([
      supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .limit(50)
    ])
    
    if (postsResult.error) throw postsResult.error
    if (usersResult.error) throw usersResult.error
    
    return {
      posts: postsResult.data as Post[],
      users: usersResult.data as User[]
    }
  },
  
  async fetchDashboardData(): Promise<DashboardData> {
    const [posts, users, comments, stats] = await Promise.all([
      supabase
        .from('posts')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(10)
        .then(res => {
          if (res.error) throw res.error
          return res.data as Post[]
        }),
      
      supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .order('last_login', { ascending: false })
        .limit(20)
        .then(res => {
          if (res.error) throw res.error
          return res.data as User[]
        }),
      
      supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15)
        .then(res => {
          if (res.error) throw res.error
          return res.data as Comment[]
        }),
      
      supabase
        .rpc('get_dashboard_stats')
        .then(res => {
          if (res.error) throw res.error
          return res.data as {
            totalPosts: number
            activeUsers: number
            recentComments: number
          }
        })
    ])
    
    return { posts, users, comments, stats }
  },
  
  async batchFetchPosts(postIds: string[]): Promise<Post[]> {
    if (postIds.length === 0) return []
    
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .in('id', postIds)
    
    if (error) throw error
    return data as Post[]
  },
  
  async batchFetchUsers(userIds: string[]): Promise<User[]> {
    if (userIds.length === 0) return []
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('id', userIds)
    
    if (error) throw error
    return data as User[]
  },
  
  async fetchWithRelations(postId: string) {
    const [post, author, comments] = await Promise.all([
      supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single()
        .then(res => {
          if (res.error) throw res.error
          return res.data as Post
        }),
      
      supabase
        .from('users')
        .select('*')
        .eq('id', postId)
        .single()
        .then(res => {
          if (res.error && res.error.code !== 'PGRST116') throw res.error
          return res.data as User | null
        }),
      
      supabase
        .from('comments')
        .select('*, user:users(*)')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .then(res => {
          if (res.error) throw res.error
          return res.data
        })
    ])
    
    return { post, author, comments }
  }
}

export function usePostsAndUsers() {
  return useQuery({
    queryKey: ['posts-and-users'],
    queryFn: optimizedApi.fetchPostsAndUsers,
    staleTime: CACHE_CONFIG.MEDIUM.staleTime,
    gcTime: CACHE_CONFIG.MEDIUM.gcTime,
  })
}

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard-data'],
    queryFn: optimizedApi.fetchDashboardData,
    staleTime: CACHE_CONFIG.DYNAMIC.staleTime,
    gcTime: CACHE_CONFIG.DYNAMIC.gcTime,
  })
}

export function useBatchPosts(postIds: string[]) {
  return useQuery({
    queryKey: ['batch-posts', postIds],
    queryFn: () => optimizedApi.batchFetchPosts(postIds),
    enabled: postIds.length > 0,
    staleTime: CACHE_CONFIG.STABLE.staleTime,
    gcTime: CACHE_CONFIG.STABLE.gcTime,
  })
}

export function useParallelQueries(postIds: string[]) {
  const queries = useQueries({
    queries: postIds.map(id => ({
      queryKey: ['post', id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('id', id)
          .single()
        
        if (error) throw error
        return data as Post
      },
      staleTime: CACHE_CONFIG.STABLE.staleTime,
    }))
  })
  
  return {
    posts: queries.map(q => q.data).filter(Boolean),
    isLoading: queries.some(q => q.isLoading),
    isError: queries.some(q => q.isError),
    errors: queries.filter(q => q.error).map(q => q.error)
  }
}

class BatchQueue<T> {
  private queue: Array<{
    key: string
    resolve: (value: T) => void
    reject: (error: any) => void
  }> = []
  private timer: NodeJS.Timeout | null = null
  private batchSize: number
  private delay: number
  private fetcher: (keys: string[]) => Promise<Record<string, T>>
  
  constructor(
    fetcher: (keys: string[]) => Promise<Record<string, T>>,
    batchSize = 10,
    delay = 50
  ) {
    this.fetcher = fetcher
    this.batchSize = batchSize
    this.delay = delay
  }
  
  async get(key: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject })
      
      if (this.queue.length >= this.batchSize) {
        this.flush()
      } else {
        this.scheduleFlush()
      }
    })
  }
  
  private scheduleFlush() {
    if (this.timer) return
    
    this.timer = setTimeout(() => {
      this.flush()
    }, this.delay)
  }
  
  private async flush() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    
    if (this.queue.length === 0) return
    
    const batch = this.queue.splice(0, this.batchSize)
    const keys = batch.map(item => item.key)
    
    try {
      const results = await this.fetcher(keys)
      
      batch.forEach(({ key, resolve, reject }) => {
        if (key in results) {
          resolve(results[key])
        } else {
          reject(new Error(`No data found for key: ${key}`))
        }
      })
    } catch (error) {
      batch.forEach(({ reject }) => reject(error))
    }
  }
}

export const postBatchQueue = new BatchQueue<Post>(
  async (postIds: string[]) => {
    const posts = await optimizedApi.batchFetchPosts(postIds)
    return posts.reduce((acc, post) => {
      acc[post.id] = post
      return acc
    }, {} as Record<string, Post>)
  }
)

export const userBatchQueue = new BatchQueue<User>(
  async (userIds: string[]) => {
    const users = await optimizedApi.batchFetchUsers(userIds)
    return users.reduce((acc, user) => {
      acc[user.id] = user
      return acc
    }, {} as Record<string, User>)
  }
)