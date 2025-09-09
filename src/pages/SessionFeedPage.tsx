import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../services/supabase'
import { UserNavigation } from '../components/user/UserNavigation'
import { BackButton } from '../components/common/BackButton'
import { ImprovedWorkshopCard } from '../components/workshops/ImprovedWorkshopCard'
import { WorkshopMaterialDisplay } from '../components/materials/WorkshopMaterialDisplay'
import { MaterialService } from '../services/materials'
import { Link } from 'react-router-dom'
import type { SessionMaterial } from '../types/materials'

interface Session {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string
  max_participants: number
}

interface Workshop {
  id: string
  title: string
  description: string
  instructor: string
  instructor_user?: {
    name: string
  }
  google_doc_url?: string
  start_time: string
  end_time: string
  max_participants: number
  is_active: boolean
  created_at: string
}

interface SessionMaterial {
  id: string
  title: string
  description?: string
  file_url: string
  material_type: string
  session_id: string
}

// Function to detect material type from URL
const getMaterialTypeFromUrl = (url: string) => {
  const domain = url.toLowerCase()
  
  if (domain.includes('docs.google.com')) return { type: 'Google Docs', icon: 'ðŸ“„', color: 'from-blue-500 to-blue-600' }
  if (domain.includes('drive.google.com')) return { type: 'Google Drive', icon: 'ðŸ’¾', color: 'from-yellow-500 to-orange-500' }
  if (domain.includes('youtube.com') || domain.includes('youtu.be')) return { type: 'YouTube', icon: 'ðŸŽ¥', color: 'from-red-500 to-red-600' }
  if (domain.includes('canva.com')) return { type: 'Canva', icon: 'ðŸŽ¨', color: 'from-purple-500 to-pink-500' }
  if (domain.includes('figma.com')) return { type: 'Figma', icon: 'ðŸŽ¯', color: 'from-purple-600 to-indigo-600' }
  if (domain.includes('slides.google.com')) return { type: 'Google Slides', icon: 'ðŸ“Š', color: 'from-orange-500 to-red-500' }
  
  return { type: 'Web Link', icon: 'ðŸ”—', color: 'from-gray-500 to-gray-600' }
}

// Function to create embed URL
const getEmbedUrl = (url: string) => {
  // Canva embed
  if (url.includes('canva.com/design/')) {
    return url + '/embed'
  }
  
  // Google Slides embed
  if (url.includes('docs.google.com/presentation/')) {
    return url.replace('/edit', '/embed')
  }
  
  // YouTube embed
  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('v=')[1]?.split('&')[0]
    return `https://www.youtube.com/embed/${videoId}`
  }
  
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0]
    return `https://www.youtube.com/embed/${videoId}`
  }
  
  return null
}

export function SessionFeedPage() {
  const { user } = useAuth()
  const [session, setSession] = useState<Session | null>(null)
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [sessionMaterials, setSessionMaterials] = useState<SessionMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [showFullDescription, setShowFullDescription] = useState(false)
  
  useEffect(() => {
    if (user) {
      fetchSessionData()
    }
  }, [user])

  const fetchSessionData = async () => {
    try {
      setLoading(true)

      // Get user's active session
      const { data: sessionReg, error: sessionError } = await supabase
        .from('session_registrations')
        .select(`
          *,
          sessions (
            id,
            title,
            description,
            start_date,
            end_date,
            max_participants
          )
        `)
        .eq('user_id', user?.id)
        .eq('status', 'registered')
        .maybeSingle()

      if (sessionError) {
        console.error('Session registration error:', sessionError)
        setLoading(false)
        return
      }

      if (!sessionReg?.sessions) {
        setLoading(false)
        return
      }

      setSession(sessionReg.sessions)

      // Get workshops for this session
      const { data: sessionWorkshops, error: workshopError } = await supabase
        .from('session_workshops')
        .select(`
          workshop_id,
          workshops!inner (
            id,
            title,
            description,
            instructor,
            google_doc_url,
            start_time,
            end_time,
            max_participants,
            is_active,
            is_archived,
            created_at
          )
        `)
        .eq('session_id', sessionReg.sessions.id)
        .eq('workshops.is_archived', false)

      if (workshopError) {
        console.error('Workshop query error:', workshopError)
      }

      if (sessionWorkshops) {
        const workshopData = sessionWorkshops
          .map(sw => sw.workshops)
          .filter(Boolean)
          .filter(workshop => workshop.is_active && !workshop.is_archived)
          .sort((a, b) => {
            // Sort by start_time if available, otherwise by created_at
            const aTime = a.start_time ? new Date(a.start_time) : new Date(a.created_at)
            const bTime = b.start_time ? new Date(b.start_time) : new Date(b.created_at)
            return aTime.getTime() - bTime.getTime()
          })
        
        console.log('SessionWorkshops raw:', sessionWorkshops)
        console.log('Workshop data filtered:', workshopData)
        
        // Fetch instructor names separately
        if (workshopData.length > 0) {
          const instructorIds = [...new Set(workshopData.map(w => w.instructor).filter(Boolean))]
          
          if (instructorIds.length > 0) {
            const { data: instructors } = await supabase
              .from('users')
              .select('id, name')
              .in('id', instructorIds)
            
            if (instructors) {
              const instructorMap = Object.fromEntries(
                instructors.map(i => [i.id, i])
              )
              
              workshopData.forEach(workshop => {
                if (workshop.instructor && instructorMap[workshop.instructor]) {
                  workshop.instructor_user = { name: instructorMap[workshop.instructor].name }
                }
              })
            }
          }
        }
        
        setWorkshops(workshopData)
        
      } else {
        console.log('No sessionWorkshops data')
        setWorkshops([])
      }

      // Fetch session materials
      try {
        const materials = await MaterialService.getSessionMaterials(sessionReg.sessions.id)
        setSessionMaterials(materials)
      } catch (error) {
        console.error('Error fetching session materials:', error)
        setSessionMaterials([])
      }

    } catch (error) {
      console.error('Error fetching session data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Add debug logging
  console.log('SessionFeedPage State:', {
    session,
    workshops,
    loading,
    user: user?.id
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">{t.loading}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavigation />
        <div className="max-w-4xl mx-auto px-8 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-red-500 text-5xl mb-4">!</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.sessionNotFoundTitle}</h2>
            <p className="text-gray-600 mb-6">{t.sessionNotFoundDesc}</p>
            <Link to="/sessions" className="btn btn-primary px-6 py-3 font-semibold">{t.goSessions}</Link>
          </div>
        </div>
      </div>
    )
  }

  // Find main session material (embed display mode first, then any)
  const mainSessionMaterial = sessionMaterials[0]
  const secondarySessionMaterials = sessionMaterials.slice(1)
  
  // Description handling
  const descriptionPreview = session?.description?.slice(0, 150) || ''
  const hasLongDescription = (session?.description?.length || 0) > 150

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavigation />
      
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="mb-4">
          <BackButton to="/dashboard" />
        </div>
        {/* Main Session Material Display - Respect display mode */}
        {mainSessionMaterial ? (
          <div className="mb-8">
            {mainSessionMaterial.display_mode === 'embed' && mainSessionMaterial.embed_url ? (
              <div className="aspect-video w-full mb-6 rounded-2xl overflow-hidden">
                <WorkshopMaterialDisplay material={mainSessionMaterial} className="w-full h-full" />
              </div>
            ) : (
              <div className="mb-6">
                <WorkshopMaterialDisplay material={mainSessionMaterial} />
              </div>
            )}
            
            {/* Session Title and Info - Clean minimal style */}
            <div className="space-y-3">
              <h1 className="text-xl font-semibold text-gray-900 leading-tight">
                {session.title}
              </h1>
              
              {/* Session Meta Info - Minimal badges */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                  ðŸ“… {new Date(session.start_date).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short'
                  })} - {new Date(session.end_date).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short'
                  })}
                </span>
                
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs">
                  ðŸ‘¥ {session.max_participants} à¸„à¸™
                </span>
              </div>
              
              {/* Facebook-style Description */}
              {session.description && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-gray-800 whitespace-pre-line leading-relaxed">
                    {showFullDescription ? session.description : descriptionPreview}
                    {!showFullDescription && hasLongDescription && '...'}
                    {hasLongDescription && (
                      <button
                        onClick={() => setShowFullDescription(!showFullDescription)}
                        className="ml-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        {showFullDescription ? 'à¸¢à¹ˆà¸­à¸¥à¸‡' : 'à¸”à¸¹à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Fallback when no materials - show traditional header */
          <div className="bg-indigo-600 text-white relative overflow-hidden rounded-2xl mb-8">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10 px-8 py-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-6xl">ðŸŽ¯</div>
                <div>
                  <h1 className="text-4xl font-bold mb-2">{session.title}</h1>
                </div>
              </div>
              
              {session.description && (
                <div className="bg-white/15 backdrop-blur-sm rounded-lg p-4 max-w-3xl mb-6">
                  <div className="text-white/95 whitespace-pre-line leading-relaxed">
                    {showFullDescription ? session.description : descriptionPreview}
                    {!showFullDescription && hasLongDescription && '...'}
                    {hasLongDescription && (
                      <button
                        onClick={() => setShowFullDescription(!showFullDescription)}
                        className="ml-2 text-white/90 hover:text-white font-medium transition-colors"
                      >
                        {showFullDescription ? 'à¸¢à¹ˆà¸­à¸¥à¸‡' : 'à¸”à¸¹à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡'}
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                  <span className="text-white/80">ðŸ“… à¸§à¸±à¸™à¸—à¸µà¹ˆ:</span>
                  <span className="font-semibold ml-2">
                    {new Date(session.start_date).toLocaleDateString('th-TH')} - {new Date(session.end_date).toLocaleDateString('th-TH')}
                  </span>
                </div>
                
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                  <span className="text-white/80">ðŸ‘¥ à¸œà¸¹à¹‰à¹€à¸‚à¹‰à¸²à¸£à¹ˆà¸§à¸¡:</span>
                  <span className="font-semibold ml-2">{session.max_participants} à¸„à¸™</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Additional Session Materials - Minimal style */}

        {/* Workshops Section - Minimal header */}
        <div className="mb-8">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-1">
              ðŸ« Workshops à¹ƒà¸™à¸‡à¸²à¸™à¸ªà¸±à¸¡à¸¡à¸™à¸²à¸™à¸µà¹‰
            </h2>
            <p className="text-sm text-gray-600">
              à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¹à¸¥à¸°à¸à¸²à¸£à¹€à¸£à¸µà¸¢à¸™à¸£à¸¹à¹‰à¸—à¸µà¹ˆà¸ˆà¸±à¸”à¸‚à¸¶à¹‰à¸™à¹ƒà¸™à¸‡à¸²à¸™à¸ªà¸±à¸¡à¸¡à¸™à¸²à¸„à¸£à¸±à¹‰à¸‡à¸™à¸µà¹‰
            </p>
          </div>

          {workshops.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="text-4xl mb-3">ðŸ«</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µ Workshops
              </h3>
              <p className="text-sm text-gray-600">
                à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µ Workshops à¸—à¸µà¹ˆà¹€à¸›à¸´à¸”à¹ƒà¸«à¹‰à¸¥à¸‡à¸—à¸°à¹€à¸šà¸µà¸¢à¸™à¹ƒà¸™à¸‡à¸²à¸™à¸ªà¸±à¸¡à¸¡à¸™à¸²à¸™à¸µà¹‰
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workshops.map((workshop) => (
                <ImprovedWorkshopCard key={workshop.id} workshop={workshop} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions - Minimal style */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-3">à¸ˆà¸±à¸”à¸à¸²à¸£à¸‡à¸²à¸™à¸‚à¸­à¸‡à¸„à¸¸à¸“</h3>
          <p className="text-sm text-gray-600 mb-4">
            à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸„à¸§à¸²à¸¡à¸„à¸·à¸šà¸«à¸™à¹‰à¸² à¸ªà¹ˆà¸‡à¸‡à¸²à¸™ à¹à¸¥à¸°à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¹€à¸­à¸à¸ªà¸²à¸£à¸›à¸£à¸°à¸à¸­à¸š
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/my-tasks"
              className="btn btn-primary px-4 py-2 text-sm font-medium"
            >
              à¸‡à¸²à¸™à¸‚à¸­à¸‡à¸‰à¸±à¸™
            </Link>
            <Link
              to="/materials"
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              à¹€à¸­à¸à¸ªà¸²à¸£à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
