import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase'
import { AdminNavigation } from './AdminNavigation'
import { SessionMaterialsManager } from './SessionMaterialsManager'

interface Session {
  id: string
  title: string
  description?: string
  start_date?: string
  end_date?: string
  max_participants: number
  is_active: boolean
  is_published: boolean
  location?: string
  venue?: string
  created_at: string
}

interface SessionWithStats {
  session: Session
  participant_count: number
  workshop_count: number
}

interface Workshop {
  id: string
  title: string
  description?: string
  instructor?: string
  workshop_date?: string
  start_time?: string
  end_time?: string
  location?: string
  max_participants: number
}

interface AddWorkshopToSessionModalProps {
  isOpen: boolean
  session: Session | null
  onClose: () => void
  onWorkshopAdded: () => void
}

interface CreateSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSessionCreated: (sessionData: any) => Promise<void>
}

interface EditSessionModalProps {
  isOpen: boolean
  session: Session | null
  onClose: () => void
  onSessionUpdated: (sessionId: string, sessionData: any) => Promise<void>
}

function CreateSessionModal({ isOpen, onClose, onSessionCreated }: CreateSessionModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    max_participants: 50,
    is_active: true,
    is_published: true,
    location: '',
    venue: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSessionCreated(formData)
      setFormData({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        max_participants: 50,
        is_active: true,
        is_published: true,
        location: '',
        venue: ''
      })
      onClose()
    } catch (error) {
      console.error('Error creating session:', error)
      alert('Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Session</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Conference Room A"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Venue
            </label>
            <input
              type="text"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Main Building"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Participants
            </label>
            <input
              type="number"
              value={formData.max_participants}
              onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
            />
          </div>

          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Published</span>
            </label>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditSessionModal({ isOpen, session, onClose, onSessionUpdated }: EditSessionModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    max_participants: 50,
    is_active: true,
    is_published: true,
    location: '',
    venue: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) {
      setFormData({
        title: session.title || '',
        description: session.description || '',
        start_date: session.start_date ? new Date(session.start_date).toISOString().slice(0, 16) : '',
        end_date: session.end_date ? new Date(session.end_date).toISOString().slice(0, 16) : '',
        max_participants: session.max_participants || 50,
        is_active: session.is_active,
        is_published: session.is_published,
        location: session.location || '',
        venue: session.venue || ''
      })
    }
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    
    setLoading(true)

    try {
      await onSessionUpdated(session.id, formData)
      onClose()
    } catch (error) {
      console.error('Error updating session:', error)
      alert('Failed to update session')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !session) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Session</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Conference Room A"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Venue
            </label>
            <input
              type="text"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Main Building"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Participants
            </label>
            <input
              type="number"
              value={formData.max_participants}
              onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
            />
          </div>

          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Published</span>
            </label>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Updating...' : 'Update Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddWorkshopToSessionModal({ isOpen, session, onClose, onWorkshopAdded }: AddWorkshopToSessionModalProps) {
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [sessionWorkshops, setSessionWorkshops] = useState<string[]>([])
  const [selectedWorkshops, setSelectedWorkshops] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && session) {
      fetchWorkshops()
      fetchSessionWorkshops()
    }
  }, [isOpen, session])

  const fetchWorkshops = async () => {
    try {
      const { data, error } = await supabase
        .from('workshops')
        .select('*')
        .eq('is_active', true)
        .order('title')

      if (error) throw error
      setWorkshops(data || [])
    } catch (error) {
      console.error('Error fetching workshops:', error)
    }
  }

  const fetchSessionWorkshops = async () => {
    if (!session) return

    try {
      const { data, error } = await supabase
        .from('session_workshops')
        .select('workshop_id')
        .eq('session_id', session.id)

      if (error) throw error
      setSessionWorkshops(data?.map(sw => sw.workshop_id) || [])
    } catch (error) {
      console.error('Error fetching session workshops:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleWorkshopToggle = (workshopId: string) => {
    setSelectedWorkshops(prev => 
      prev.includes(workshopId)
        ? prev.filter(id => id !== workshopId)
        : [...prev, workshopId]
    )
  }

  const handleSubmit = async () => {
    if (!session || selectedWorkshops.length === 0) return

    try {
      setSubmitting(true)

      // Insert selected workshops
      const insertData = selectedWorkshops.map(workshopId => ({
        session_id: session.id,
        workshop_id: workshopId
      }))

      const { error } = await supabase
        .from('session_workshops')
        .insert(insertData)

      if (error) throw error

      onWorkshopAdded()
      setSelectedWorkshops([])
      onClose()
    } catch (error) {
      console.error('Error adding workshops to session:', error)
      alert('Failed to add workshops to session')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveWorkshop = async (workshopId: string) => {
    if (!session) return

    try {
      const { error } = await supabase
        .from('session_workshops')
        .delete()
        .eq('session_id', session.id)
        .eq('workshop_id', workshopId)

      if (error) throw error

      setSessionWorkshops(prev => prev.filter(id => id !== workshopId))
      onWorkshopAdded()
    } catch (error) {
      console.error('Error removing workshop from session:', error)
      alert('Failed to remove workshop from session')
    }
  }

  if (!isOpen || !session) return null

  const availableWorkshops = workshops.filter(w => !sessionWorkshops.includes(w.id))
  const currentWorkshops = workshops.filter(w => sessionWorkshops.includes(w.id))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Manage Workshops for: {session.title}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Workshops */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Current Workshops ({currentWorkshops.length})
              </h3>
              {currentWorkshops.length === 0 ? (
                <p className="text-gray-500 text-sm">No workshops assigned to this session</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentWorkshops.map(workshop => (
                    <div key={workshop.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{workshop.title}</h4>
                          {workshop.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{workshop.description}</p>
                          )}
                          {workshop.instructor && (
                            <p className="text-xs text-gray-500 mt-1">Instructor: {workshop.instructor}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveWorkshop(workshop.id)}
                          className="ml-2 text-red-600 hover:text-red-800"
                          title="Remove from session"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Workshops */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Available Workshops ({availableWorkshops.length})
              </h3>
              {availableWorkshops.length === 0 ? (
                <p className="text-gray-500 text-sm">All workshops are already assigned to this session</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {availableWorkshops.map(workshop => (
                    <div key={workshop.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          id={`workshop-${workshop.id}`}
                          checked={selectedWorkshops.includes(workshop.id)}
                          onChange={() => handleWorkshopToggle(workshop.id)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`workshop-${workshop.id}`} className="ml-3 flex-1 cursor-pointer">
                          <h4 className="font-medium text-gray-900">{workshop.title}</h4>
                          {workshop.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{workshop.description}</p>
                          )}
                          {workshop.instructor && (
                            <p className="text-xs text-gray-500 mt-1">Instructor: {workshop.instructor}</p>
                          )}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
          {selectedWorkshops.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {submitting ? 'Adding...' : `Add ${selectedWorkshops.length} Workshop(s)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function SessionManager() {
  const [sessions, setSessions] = useState<SessionWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddWorkshopModal, setShowAddWorkshopModal] = useState(false)
  const [showMaterialsModal, setShowMaterialsModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      
      // Get sessions from sessions table
      const { data: sessionsData, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching sessions:', error)
        return
      }

      const sessionsWithStats: SessionWithStats[] = []

      for (const session of sessionsData || []) {
        // Get participant count
        const { count: participantCount } = await supabase
          .from('session_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', session.id)

        // Get workshop count from session_workshops
        const { count: workshopCount } = await supabase
          .from('session_workshops')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', session.id)

        sessionsWithStats.push({
          session: {
            id: session.id,
            title: session.title,
            description: session.description,
            start_date: session.start_date,
            end_date: session.end_date,
            max_participants: session.max_participants,
            is_active: session.is_active,
            is_published: session.is_published,
            created_at: session.created_at
          },
          participant_count: participantCount || 0,
          workshop_count: workshopCount || 0
        })
      }

      setSessions(sessionsWithStats)
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSession = async (sessionData: any) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .insert({
          title: sessionData.title,
          description: sessionData.description,
          start_date: sessionData.start_date || null,
          end_date: sessionData.end_date || null,
          max_participants: sessionData.max_participants,
          is_active: sessionData.is_active,
          is_published: sessionData.is_published,
          location: sessionData.location || null,
          venue: sessionData.venue || null,
          registration_open: true
        })

      if (error) {
        console.error('Error creating session:', error)
        throw error
      }

      await fetchSessions()
    } catch (error) {
      console.error('Error in handleCreateSession:', error)
      throw error
    }
  }

  const toggleSessionStatus = async (sessionId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ is_active: !currentStatus })
        .eq('id', sessionId)

      if (error) {
        console.error('Error updating session status:', error)
        return
      }

      await fetchSessions()
    } catch (error) {
      console.error('Error toggling session status:', error)
    }
  }

  const handleEditSession = async (sessionId: string, sessionData: any) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          title: sessionData.title,
          description: sessionData.description,
          start_date: sessionData.start_date || null,
          end_date: sessionData.end_date || null,
          max_participants: sessionData.max_participants,
          is_active: sessionData.is_active,
          is_published: sessionData.is_published,
          location: sessionData.location || null,
          venue: sessionData.venue || null
        })
        .eq('id', sessionId)

      if (error) {
        console.error('Error updating session:', error)
        throw error
      }

      await fetchSessions()
    } catch (error) {
      console.error('Error in handleEditSession:', error)
      throw error
    }
  }

  const handleDeleteSession = async (sessionId: string, sessionTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${sessionTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (error) {
        console.error('Error deleting session:', error)
        alert('Failed to delete session')
        return
      }

      await fetchSessions()
      alert('Session deleted successfully')
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Failed to delete session')
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminNavigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading sessions...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminNavigation />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Traco Session Management</h1>
              <p className="text-gray-600 mt-1">Manage Sessions and Registrations</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Session
            </button>
          </div>

          {/* Sessions Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600">🎓</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Sessions</p>
                  <p className="text-2xl font-semibold text-gray-900">{sessions.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600">✅</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Sessions</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {sessions.filter(s => s.session.is_active).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600">👥</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Participants</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {sessions.reduce((sum, s) => sum + s.participant_count, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-4xl mb-4">🎓</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sessions</h3>
                <p className="text-gray-600 mb-4">Start by creating your first session</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  Create Session
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Session
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participants
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Workshops
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sessions.map(({ session, participant_count, workshop_count }) => (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {session.title}
                            </div>
                            {session.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {session.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {session.start_date ? new Date(session.start_date).toLocaleDateString('en-US') : 'Not specified'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {participant_count}/{session.max_participants}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-sm text-gray-900 mr-2">{workshop_count}</span>
                            <button
                              onClick={() => {
                                setSelectedSession(session)
                                setShowAddWorkshopModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                              title="Manage workshops"
                            >
                              Manage
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleSessionStatus(session.id, session.is_active)}
                            className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                              session.is_active
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                          >
                            {session.is_active ? (
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd"/>
                                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>
                              </svg>
                            )}
                            {session.is_active ? 'Show' : 'Hide'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-wrap gap-2">
                            <button 
                              onClick={() => {
                                setSelectedSession(session)
                                setShowEditModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-900 text-xs px-2 py-1 bg-blue-50 rounded"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedSession(session)
                                setShowMaterialsModal(true)
                              }}
                              className="text-purple-600 hover:text-purple-900 text-xs px-2 py-1 bg-purple-50 rounded"
                            >
                              Materials
                            </button>
                            <button 
                              onClick={() => handleDeleteSession(session.id, session.title)}
                              className="text-red-600 hover:text-red-900 text-xs px-2 py-1 bg-red-50 rounded"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSessionCreated={handleCreateSession}
      />

      {/* Edit Session Modal */}
      <EditSessionModal
        isOpen={showEditModal}
        session={selectedSession}
        onClose={() => {
          setShowEditModal(false)
          setSelectedSession(null)
        }}
        onSessionUpdated={handleEditSession}
      />

      {/* Add Workshop to Session Modal */}
      <AddWorkshopToSessionModal
        isOpen={showAddWorkshopModal}
        session={selectedSession}
        onClose={() => {
          setShowAddWorkshopModal(false)
          setSelectedSession(null)
        }}
        onWorkshopAdded={fetchSessions}
      />

      {/* Session Materials Management Modal */}
      {showMaterialsModal && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">จัดการเอกสาร Session</h2>
                <button
                  onClick={() => {
                    setShowMaterialsModal(false)
                    setSelectedSession(null)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <SessionMaterialsManager
                sessionId={selectedSession.id}
                sessionTitle={selectedSession.title}
              />
              
              {/* Done Button */}
              <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
                <button
                  onClick={() => {
                    setShowMaterialsModal(false)
                    setSelectedSession(null)
                  }}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}