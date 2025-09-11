import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-client-info': 'workshop-tracker'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

export const MAX_RETRIES = 3
export const RETRY_DELAY = 1000

export async function retryableQuery<T>(
  queryFn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  try {
    return await queryFn()
  } catch (error: any) {
    if (retries > 0 && error?.status >= 500) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      return retryableQuery(queryFn, retries - 1)
    }
    throw error
  }
}

export function createOptimizedQuery() {
  const pendingQueries = new Map<string, Promise<any>>()
  
  return async function optimizedQuery<T>(
    key: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    if (pendingQueries.has(key)) {
      return pendingQueries.get(key)!
    }
    
    const promise = queryFn().finally(() => {
      pendingQueries.delete(key)
    })
    
    pendingQueries.set(key, promise)
    return promise
  }
}

export const optimizedQuery = createOptimizedQuery()