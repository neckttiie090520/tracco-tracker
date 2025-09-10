import { createClient } from '@supabase/supabase-js'
import { env, validateEnv } from '../utils/env'

// Validate environment variables on module load
validateEnv()

const supabaseUrl = env.SUPABASE_URL
const supabaseAnonKey = env.SUPABASE_ANON_KEY

// Create singleton instance to prevent multiple clients
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // Enable session detection from URL
      },
    })
  }
  return supabaseInstance
})()

// Expose supabase client to window for debugging
if (typeof window !== 'undefined') {
  window.supabase = supabase
}