/**
 * Environment variable validation and utilities
 */

export const env = {
  // Supabase configuration
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  
  // App configuration
  NODE_ENV: import.meta.env.NODE_ENV,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
} as const

/**
 * Validate required environment variables
 */
export function validateEnv() {
  const errors: string[] = []
  
  if (!env.SUPABASE_URL) {
    errors.push('VITE_SUPABASE_URL is required')
  }
  
  if (!env.SUPABASE_ANON_KEY) {
    errors.push('VITE_SUPABASE_ANON_KEY is required')
  }
  
  // URL validation
  if (env.SUPABASE_URL && !env.SUPABASE_URL.startsWith('https://')) {
    errors.push('VITE_SUPABASE_URL must be a valid HTTPS URL')
  }
  
  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`)
  }
}

/**
 * Check if we're in development mode
 */
export const isDev = env.DEV

/**
 * Check if we're in production mode  
 */
export const isProd = env.PROD