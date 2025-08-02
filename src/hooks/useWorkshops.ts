import { useState, useEffect } from 'react'
import { workshopService } from '../services/workshops'
import { useAuth } from './useAuth'

export function useWorkshops() {
  const [workshops, setWorkshops] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkshops = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await workshopService.getWorkshops()
      setWorkshops(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workshops')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkshops()
  }, [])

  return {
    workshops,
    loading,
    error,
    refetch: fetchWorkshops
  }
}

export function useWorkshop(id: string) {
  const [workshop, setWorkshop] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkshop = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await workshopService.getWorkshopById(id)
      setWorkshop(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workshop')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchWorkshop()
    }
  }, [id])

  return {
    workshop,
    loading,
    error,
    refetch: fetchWorkshop
  }
}

