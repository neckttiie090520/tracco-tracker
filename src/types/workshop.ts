export interface Workshop {
  id: string
  title: string
  description?: string
  instructor?: string
  instructor_user?: {
    name: string
  }
  google_doc_url?: string
  start_time?: string
  end_time?: string
  max_participants: number
  is_active: boolean
  created_at: string
  updated_at?: string
  session_id?: string
}