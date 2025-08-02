import { createClient } from '@supabase/supabase-js'
import { env, validateEnv } from '../utils/env'

// Validate environment variables on module load
validateEnv()

const supabaseUrl = env.SUPABASE_URL
const supabaseAnonKey = env.SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Expose supabase client to window for debugging
if (typeof window !== 'undefined') {
  window.supabase = supabase
}