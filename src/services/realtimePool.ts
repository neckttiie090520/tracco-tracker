import { supabase } from './supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

interface PooledChannel {
  channel: RealtimeChannel
  subscribers: Set<string>
  lastActivity: number
}

class RealtimeConnectionPool {
  private channels = new Map<string, PooledChannel>()
  private maxChannels = 50 // Limit concurrent channels
  private channelTimeout = 5 * 60 * 1000 // 5 minutes inactive timeout
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Start cleanup interval
    this.startCleanupInterval()
  }

  private startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveChannels()
    }, 60 * 1000) // Check every minute
  }

  private cleanupInactiveChannels() {
    const now = Date.now()
    const channelsToRemove: string[] = []

    this.channels.forEach((pooledChannel, key) => {
      // Remove channels with no subscribers or inactive for too long
      if (pooledChannel.subscribers.size === 0 || 
          now - pooledChannel.lastActivity > this.channelTimeout) {
        channelsToRemove.push(key)
      }
    })

    channelsToRemove.forEach(key => {
      const pooledChannel = this.channels.get(key)
      if (pooledChannel) {
        pooledChannel.channel.unsubscribe()
        this.channels.delete(key)
        console.log(`Cleaned up inactive channel: ${key}`)
      }
    })
  }

  getChannel(channelName: string, subscriberId: string): RealtimeChannel | null {
    // Check if we've reached the limit
    if (!this.channels.has(channelName) && this.channels.size >= this.maxChannels) {
      console.warn('Reached maximum channel limit')
      // Try to cleanup first
      this.cleanupInactiveChannels()
      
      // Still at limit? Return null
      if (this.channels.size >= this.maxChannels) {
        return null
      }
    }

    let pooledChannel = this.channels.get(channelName)
    
    if (!pooledChannel) {
      // Create new channel
      const channel = supabase.channel(channelName)
      pooledChannel = {
        channel,
        subscribers: new Set([subscriberId]),
        lastActivity: Date.now()
      }
      this.channels.set(channelName, pooledChannel)
    } else {
      // Add subscriber to existing channel
      pooledChannel.subscribers.add(subscriberId)
      pooledChannel.lastActivity = Date.now()
    }

    return pooledChannel.channel
  }

  releaseChannel(channelName: string, subscriberId: string) {
    const pooledChannel = this.channels.get(channelName)
    if (pooledChannel) {
      pooledChannel.subscribers.delete(subscriberId)
      pooledChannel.lastActivity = Date.now()
      
      // Don't immediately remove - let cleanup interval handle it
      // This prevents rapid subscribe/unsubscribe cycles
    }
  }

  getStats() {
    const stats = {
      totalChannels: this.channels.size,
      channels: Array.from(this.channels.entries()).map(([name, pooled]) => ({
        name,
        subscribers: pooled.subscribers.size,
        lastActivity: new Date(pooled.lastActivity).toISOString()
      }))
    }
    return stats
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    // Cleanup all channels
    this.channels.forEach(pooledChannel => {
      pooledChannel.channel.unsubscribe()
    })
    this.channels.clear()
  }
}

// Export singleton instance
export const realtimePool = new RealtimeConnectionPool()

// Helper function to create shared channel subscriptions
export function useSharedChannel(
  channelName: string,
  subscriberId: string,
  setupCallback: (channel: RealtimeChannel) => void
) {
  const channel = realtimePool.getChannel(channelName, subscriberId)
  
  if (channel) {
    setupCallback(channel)
  }
  
  return () => {
    realtimePool.releaseChannel(channelName, subscriberId)
  }
}