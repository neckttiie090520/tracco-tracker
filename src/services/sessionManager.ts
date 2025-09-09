import { supabase } from './supabase'
import { authService } from './auth'
import { sessionConfig } from '../config/sessionConfig'

interface SessionConfig {
  maxIdleTime: number // milliseconds
  sessionTimeout: number // milliseconds
  warningTime: number // milliseconds before timeout to show warning
}

// Use configuration from config file
const defaultConfig: SessionConfig = {
  maxIdleTime: sessionConfig.maxIdleTime,
  sessionTimeout: sessionConfig.sessionTimeout,
  warningTime: sessionConfig.warningTime,
}

export class SessionManager {
  private config: SessionConfig
  private lastActivityTime: number
  private sessionStartTime: number
  private idleTimer: NodeJS.Timeout | null = null
  private sessionTimer: NodeJS.Timeout | null = null
  private warningTimer: NodeJS.Timeout | null = null
  private warningCallback?: () => void
  private timeoutCallback?: () => void
  private isActive: boolean = false

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
    this.lastActivityTime = Date.now()
    this.sessionStartTime = Date.now()
  }

  // Initialize session monitoring
  async init(options: {
    onWarning?: () => void
    onTimeout?: () => void
  } = {}) {
    // Check if user is authenticated
    const session = await authService.getCurrentSession()
    if (!session) return

    this.warningCallback = options.onWarning
    this.timeoutCallback = options.onTimeout
    this.isActive = true
    
    // Reset timers
    this.sessionStartTime = Date.now()
    this.lastActivityTime = Date.now()
    
    // Start monitoring
    this.startIdleMonitoring()
    this.startSessionMonitoring()
    
    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        this.stop()
      }
    })
  }

  // Track user activity
  trackActivity() {
    if (!this.isActive) return
    
    this.lastActivityTime = Date.now()
    
    // Reset idle timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.startIdleMonitoring()
    }
  }

  // Start monitoring idle time
  private startIdleMonitoring() {
    if (!this.isActive) return

    this.idleTimer = setTimeout(() => {
      this.handleTimeout('idle')
    }, this.config.maxIdleTime)
  }

  // Start monitoring total session time
  private startSessionMonitoring() {
    if (!this.isActive) return

    const remainingTime = this.config.sessionTimeout - (Date.now() - this.sessionStartTime)
    
    if (remainingTime <= 0) {
      this.handleTimeout('session')
      return
    }

    // Set warning timer
    const warningTime = remainingTime - this.config.warningTime
    if (warningTime > 0) {
      this.warningTimer = setTimeout(() => {
        if (this.warningCallback) {
          this.warningCallback()
        }
      }, warningTime)
    }

    // Set session timeout timer
    this.sessionTimer = setTimeout(() => {
      this.handleTimeout('session')
    }, remainingTime)
  }

  // Handle timeout
  private async handleTimeout(reason: 'idle' | 'session') {
    if (!this.isActive) return

    this.stop()
    
    // Call timeout callback if provided
    if (this.timeoutCallback) {
      this.timeoutCallback()
    }
    
    // Sign out user
    try {
      await authService.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Stop all monitoring
  stop() {
    this.isActive = false
    
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
    
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer)
      this.sessionTimer = null
    }
    
    if (this.warningTimer) {
      clearTimeout(this.warningTimer)
      this.warningTimer = null
    }
  }

  // Get remaining session time
  getRemainingSessionTime(): number {
    if (!this.isActive) return 0
    
    const elapsed = Date.now() - this.sessionStartTime
    const remaining = this.config.sessionTimeout - elapsed
    
    return Math.max(0, remaining)
  }

  // Get idle time
  getIdleTime(): number {
    if (!this.isActive) return 0
    
    return Date.now() - this.lastActivityTime
  }

  // Check if session is about to expire
  isSessionExpiringSoon(): boolean {
    return this.getRemainingSessionTime() <= this.config.warningTime
  }

  // Update configuration
  updateConfig(config: Partial<SessionConfig>) {
    this.config = { ...this.config, ...config }
    
    // Restart monitoring with new config
    if (this.isActive) {
      this.stop()
      this.init({
        onWarning: this.warningCallback,
        onTimeout: this.timeoutCallback,
      })
    }
  }
}

// Create singleton instance
export const sessionManager = new SessionManager()

// Activity events to monitor
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keypress',
  'scroll',
  'touchstart',
  'click',
  'keydown',
]

// Setup global activity listeners
let activityListenersSetup = false

export function setupActivityListeners() {
  if (activityListenersSetup) return
  
  ACTIVITY_EVENTS.forEach(event => {
    document.addEventListener(event, () => {
      sessionManager.trackActivity()
    }, { passive: true })
  })
  
  activityListenersSetup = true
}