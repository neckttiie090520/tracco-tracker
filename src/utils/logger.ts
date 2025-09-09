import { isProd } from './env'

/**
 * Log levels for different types of messages
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Simple logger that respects environment settings
 */
class Logger {
  private minLevel: LogLevel = isProd ? LogLevel.WARN : LogLevel.DEBUG

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level}]`
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`
    }
    return `${prefix} ${message}`
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel
  }

  debug(message: string, data?: any) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message, data))
    }
  }

  info(message: string, data?: any) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message, data))
    }
  }

  warn(message: string, data?: any) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, data))
    }
  }

  error(message: string, error?: Error | any) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message, error))
      
      // In production, you might want to send errors to a monitoring service
      if (isProd && error) {
        this.reportError(message, error)
      }
    }
  }

  private reportError(message: string, error: any) {
    // TODO: Integrate with error monitoring service (Sentry, LogRocket, etc.)
    // For now, just ensure errors are logged
    try {
      // Example: Send to external service
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   body: JSON.stringify({ message, error: error.stack, timestamp: Date.now() })
      // })
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel) {
    this.minLevel = level
  }
}

// Export singleton instance
export const logger = new Logger()

// Convenience exports
export const log = {
  debug: (message: string, data?: any) => logger.debug(message, data),
  info: (message: string, data?: any) => logger.info(message, data),
  warn: (message: string, data?: any) => logger.warn(message, data),
  error: (message: string, error?: Error | any) => logger.error(message, error),
}