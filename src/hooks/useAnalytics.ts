import { useState, useEffect } from 'react'
import { analyticsService, AnalyticsData } from '../services/analytics'

export function useAnalytics(dateRange?: { start: string; end: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const analyticsData = await analyticsService.getAnalytics(dateRange)
      setData(analyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange?.start, dateRange?.end])

  // Real-time updates
  useEffect(() => {
    const unsubscribe = analyticsService.subscribeToAnalyticsUpdates((updates) => {
      if (data) {
        setData(prev => ({
          ...prev!,
          ...updates
        }))
      }
    })

    return unsubscribe
  }, [data])

  const exportData = (filename?: string) => {
    if (data) {
      analyticsService.exportAnalyticsCSV(data, filename)
    }
  }

  return {
    data,
    loading,
    error,
    refetch: fetchAnalytics,
    exportData
  }
}

export function useEngagementMetrics() {
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await analyticsService.getEngagementMetrics()
      setMetrics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch engagement metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics
  }
}