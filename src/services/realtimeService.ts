import React from 'react'
import { supabase } from './supabase'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { Database } from '../types/database'
import { realtimePool } from './realtimePool'

// Type definitions for real-time events
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE'

export interface RealtimeEvent<T = any> {
  eventType: RealtimeEventType
  new: T | null
  old: T | null
  table: string
  timestamp: string
}

export interface RealtimeSubscription {
  id: string
  channel: RealtimeChannel
  cleanup: () => void
}

export interface ConnectionStatus {
  connected: boolean
  reconnecting: boolean
  error: string | null
  lastConnected: Date | null
}

// Database table types
type WorkshopRow = Database['public']['Tables']['workshops']['Row']
type TaskRow = Database['public']['Tables']['tasks']['Row']
type SubmissionRow = Database['public']['Tables']['submissions']['Row']
type RegistrationRow = Database['public']['Tables']['workshop_registrations']['Row']
type UserRow = Database['public']['Tables']['users']['Row']

// Callback types for different events
export type WorkshopEventCallback = (event: RealtimeEvent<WorkshopRow>) => void
export type TaskEventCallback = (event: RealtimeEvent<TaskRow>) => void
export type SubmissionEventCallback = (event: RealtimeEvent<SubmissionRow>) => void
export type RegistrationEventCallback = (event: RealtimeEvent<RegistrationRow>) => void
export type UserEventCallback = (event: RealtimeEvent<UserRow>) => void

class RealtimeService {
  private subscriptions = new Map<string, RealtimeSubscription>()
  private connectionCallbacks = new Set<(status: ConnectionStatus) => void>()
  private connectionStatus: ConnectionStatus = {
    connected: false,
    reconnecting: false,
    error: null,
    lastConnected: null
  }

  constructor() {
    this.setupConnectionMonitoring()
  }

  private setupConnectionMonitoring() {
    // Monitor Supabase connection status
    supabase.channel('connection-monitor')
      .on('system', {}, (payload) => {
        if (payload.status === 'SUBSCRIBED') {
          this.updateConnectionStatus({
            connected: true,
            reconnecting: false,
            error: null,
            lastConnected: new Date()
          })
        }
      })
      .subscribe((status) => {
        if (status === 'CLOSED') {
          this.updateConnectionStatus({
            connected: false,
            reconnecting: false,
            error: 'Connection closed',
            lastConnected: this.connectionStatus.lastConnected
          })
        }
      })
  }

  private updateConnectionStatus(newStatus: Partial<ConnectionStatus>) {
    this.connectionStatus = { ...this.connectionStatus, ...newStatus }
    this.connectionCallbacks.forEach(callback => callback(this.connectionStatus))
  }

  // Connection status subscription
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void) {
    this.connectionCallbacks.add(callback)
    
    // Immediately call with current status
    callback(this.connectionStatus)
    
    return () => {
      this.connectionCallbacks.delete(callback)
    }
  }

  // Generic subscription method
  private createSubscription<T>(
    channelName: string,
    table: string,
    filter?: string,
    callback?: (event: RealtimeEvent<T>) => void
  ): RealtimeSubscription {
    // Use pooled channel instead of creating new one
    const subscriberId = `${channelName}-${Date.now()}`
    const channel = realtimePool.getChannel(channelName, subscriberId)
    
    if (!channel) {
      console.warn(`Failed to get channel: ${channelName}`)
      return {
        id: channelName,
        channel: supabase.channel(channelName), // Fallback
        cleanup: () => {}
      }
    }

    // Set up postgres changes listener
    let channelWithChanges = filter 
      ? channel.on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table,
          filter 
        } as any, (payload: RealtimePostgresChangesPayload<T>) => {
          this.handlePostgresChange(payload, callback)
        })
      : channel.on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table 
        } as any, (payload: RealtimePostgresChangesPayload<T>) => {
          this.handlePostgresChange(payload, callback)
        })

    channelWithChanges.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to ${table} changes`)
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Error subscribing to ${table}`)
        this.updateConnectionStatus({
          error: `Failed to subscribe to ${table}`,
          reconnecting: false
        })
      }
    })

    const subscription: RealtimeSubscription = {
      id: channelName,
      channel,
      cleanup: () => {
        // Release from pool instead of unsubscribing
        realtimePool.releaseChannel(channelName, subscriberId)
        this.subscriptions.delete(channelName)
        console.log(`🧹 Released subscription: ${channelName}`)
      }
    }

    this.subscriptions.set(channelName, subscription)
    return subscription
  }

  private handlePostgresChange<T>(
    payload: RealtimePostgresChangesPayload<T>,
    callback?: (event: RealtimeEvent<T>) => void
  ) {
    const event: RealtimeEvent<T> = {
      eventType: payload.eventType as RealtimeEventType,
      new: payload.new as T | null,
      old: payload.old as T | null,
      table: payload.table,
      timestamp: new Date().toISOString()
    }

    if (callback) {
      callback(event)
    }
  }

  // Workshop subscriptions
  subscribeToWorkshops(callback: WorkshopEventCallback): RealtimeSubscription {
    return this.createSubscription('workshops', 'workshops', undefined, callback)
  }

  subscribeToWorkshop(workshopId: string, callback: WorkshopEventCallback): RealtimeSubscription {
    return this.createSubscription(
      `workshop-${workshopId}`, 
      'workshops', 
      `id=eq.${workshopId}`,
      callback
    )
  }

  // Registration subscriptions
  subscribeToWorkshopRegistrations(workshopId?: string, callback?: RegistrationEventCallback): RealtimeSubscription {
    const channelName = workshopId ? `registrations-${workshopId}` : 'registrations'
    const filter = workshopId ? `workshop_id=eq.${workshopId}` : undefined
    
    return this.createSubscription(channelName, 'workshop_registrations', filter, callback)
  }

  subscribeToUserRegistrations(userId: string, callback: RegistrationEventCallback): RealtimeSubscription {
    return this.createSubscription(
      `user-registrations-${userId}`,
      'workshop_registrations',
      `user_id=eq.${userId}`,
      callback
    )
  }

  // Task subscriptions
  subscribeToWorkshopTasks(workshopId: string, callback: TaskEventCallback): RealtimeSubscription {
    return this.createSubscription(
      `tasks-${workshopId}`,
      'tasks',
      `workshop_id=eq.${workshopId}`,
      callback
    )
  }

  subscribeToAllTasks(callback: TaskEventCallback): RealtimeSubscription {
    return this.createSubscription('all-tasks', 'tasks', undefined, callback)
  }

  // Submission subscriptions
  subscribeToTaskSubmissions(taskId: string, callback: SubmissionEventCallback): RealtimeSubscription {
    return this.createSubscription(
      `submissions-${taskId}`,
      'submissions',
      `task_id=eq.${taskId}`,
      callback
    )
  }

  subscribeToUserSubmissions(userId: string, callback: SubmissionEventCallback): RealtimeSubscription {
    return this.createSubscription(
      `user-submissions-${userId}`,
      'submissions',
      `user_id=eq.${userId}`,
      callback
    )
  }

  subscribeToWorkshopSubmissions(workshopId: string, callback: SubmissionEventCallback): RealtimeSubscription {
    return this.createSubscription(
      `workshop-submissions-${workshopId}`,
      'submissions',
      `task_id.in.(select id from tasks where workshop_id = '${workshopId}')`,
      callback
    )
  }

  // User subscriptions
  subscribeToUsers(callback: UserEventCallback): RealtimeSubscription {
    return this.createSubscription('users', 'users', undefined, callback)
  }

  subscribeToUser(userId: string, callback: UserEventCallback): RealtimeSubscription {
    return this.createSubscription(
      `user-${userId}`,
      'users',
      `id=eq.${userId}`,
      callback
    )
  }

  // Utility methods
  getSubscription(id: string): RealtimeSubscription | undefined {
    return this.subscriptions.get(id)
  }

  unsubscribe(id: string): boolean {
    const subscription = this.subscriptions.get(id)
    if (subscription) {
      subscription.cleanup()
      return true
    }
    return false
  }

  // Clean up all subscriptions
  cleanup() {
    console.log(`🧹 Cleaning up ${this.subscriptions.size} subscriptions`)
    this.subscriptions.forEach(subscription => subscription.cleanup())
    this.subscriptions.clear()
    this.connectionCallbacks.clear()
  }

  // Get connection status
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus }
  }

  // Force reconnection
  async reconnect() {
    this.updateConnectionStatus({ reconnecting: true, error: null })
    
    try {
      // Unsubscribe and resubscribe all channels
      const subscriptionIds = Array.from(this.subscriptions.keys())
      
      for (const id of subscriptionIds) {
        const subscription = this.subscriptions.get(id)
        if (subscription) {
          await subscription.channel.unsubscribe()
          // Resubscribe logic would need to be implemented based on stored subscription data
        }
      }
      
      this.updateConnectionStatus({ 
        connected: true, 
        reconnecting: false, 
        error: null,
        lastConnected: new Date()
      })
    } catch (error) {
      this.updateConnectionStatus({ 
        connected: false, 
        reconnecting: false, 
        error: error instanceof Error ? error.message : 'Reconnection failed'
      })
    }
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService()

// Hook for connection status
export function useConnectionStatus() {
  const [status, setStatus] = React.useState<ConnectionStatus>(
    realtimeService.getConnectionStatus()
  )

  React.useEffect(() => {
    return realtimeService.onConnectionStatusChange(setStatus)
  }, [])

  return {
    ...status,
    reconnect: () => realtimeService.reconnect()
  }
}