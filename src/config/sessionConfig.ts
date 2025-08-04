// Session configuration with environment variable support
export const sessionConfig = {
  // Maximum idle time before auto-logout (default: 1 hour)
  maxIdleTime: parseInt(process.env.REACT_APP_SESSION_IDLE_TIME || '3600000'), // 60 * 60 * 1000
  
  // Total session timeout (default: 8 hours)
  sessionTimeout: parseInt(process.env.REACT_APP_SESSION_TIMEOUT || '28800000'), // 8 * 60 * 60 * 1000
  
  // Time before timeout to show warning (default: 5 minutes)
  warningTime: parseInt(process.env.REACT_APP_SESSION_WARNING_TIME || '300000'), // 5 * 60 * 1000
  
  // Enable/disable session management (default: enabled)
  enabled: process.env.REACT_APP_SESSION_MANAGEMENT_ENABLED !== 'false',
}

// Export helper to check if session management is enabled
export const isSessionManagementEnabled = () => sessionConfig.enabled