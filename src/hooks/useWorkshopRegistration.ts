import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from './useAuth'

interface Registration {
  id: string
  workshop_id: string
  user_id: string
  registered_at: string
  status: string
}

export function useWorkshopRegistration(workshopId: string) {
  const { user } = useAuth()
  const [registration, setRegistration] = useState<Registration | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!workshopId || !user) {
      setLoading(false)
      return
    }

    const fetchRegistration = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('workshop_registrations')
          .select('*')
          .eq('workshop_id', workshopId)
          .eq('user_id', user.id)
          .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError
        }

        setRegistration(data || null)
      } catch (err) {
        console.error('Error fetching workshop registration:', err)
        setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล')
      } finally {
        setLoading(false)
      }
    }

    fetchRegistration()
  }, [workshopId, user])

  const isRegistered = !!registration

  const register = async () => {
    if (!user || !workshopId || isRegistered) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: registerError } = await supabase
        .from('workshop_registrations')
        .insert({
          workshop_id: workshopId,
          user_id: user.id,
          status: 'registered'
        })
        .select()
        .single()

      if (registerError) {
        throw registerError
      }

      setRegistration(data)
    } catch (err) {
      console.error('Error registering for workshop:', err)
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลงทะเบียน')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const unregister = async () => {
    if (!user || !workshopId || !isRegistered) return

    try {
      setLoading(true)
      setError(null)

      const { error: deleteError } = await supabase
        .from('workshop_registrations')
        .delete()
        .eq('workshop_id', workshopId)
        .eq('user_id', user.id)

      if (deleteError) {
        throw deleteError
      }

      setRegistration(null)
    } catch (err) {
      console.error('Error unregistering from workshop:', err)
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการยกเลิกลงทะเบียน')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    registration,
    isRegistered,
    loading,
    error,
    register,
    unregister
  }
}