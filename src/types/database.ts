export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'admin' | 'participant'
          faculty?: string
          department?: string
          bio?: string
          organization?: string
          avatar_seed?: string
          avatar_saturation?: number
          avatar_lightness?: number
          metadata: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: 'admin' | 'participant'
          faculty?: string
          department?: string
          bio?: string
          organization?: string
          avatar_seed?: string
          avatar_saturation?: number
          avatar_lightness?: number
          metadata?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'admin' | 'participant'
          faculty?: string
          department?: string
          bio?: string
          organization?: string
          avatar_seed?: string
          avatar_saturation?: number
          avatar_lightness?: number
          metadata?: Record<string, any>
          created_at?: string
        }
      }
      workshops: {
        Row: {
          id: string
          title: string
          description?: string
          instructor: string
          google_doc_url?: string
          start_time?: string
          end_time?: string
          max_participants: number
          is_active: boolean
          is_published: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          instructor: string
          google_doc_url?: string
          start_time?: string
          end_time?: string
          max_participants?: number
          created_at?: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          instructor: string
          google_doc_url?: string
          start_time?: string
          end_time?: string
          max_participants?: number
          is_active?: boolean
          is_published?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          instructor?: string
          google_doc_url?: string
          start_time?: string
          end_time?: string
          max_participants?: number
          is_active?: boolean
          is_published?: boolean
          created_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          title: string
          description?: string
          organizer_id?: string
          cover_image_url?: string
          location?: string
          venue?: string
          start_date?: string
          end_date?: string
          max_participants: number
          registration_open: boolean
          is_active: boolean
          is_published: boolean
          metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          organizer_id?: string
          cover_image_url?: string
          location?: string
          venue?: string
          start_date?: string
          end_date?: string
          max_participants?: number
          registration_open?: boolean
          is_active?: boolean
          is_published?: boolean
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          organizer_id?: string
          cover_image_url?: string
          location?: string
          venue?: string
          start_date?: string
          end_date?: string
          max_participants?: number
          registration_open?: boolean
          is_active?: boolean
          is_published?: boolean
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
      session_registrations: {
        Row: {
          id: string
          session_id: string
          user_id: string
          registration_method: string
          registered_at: string
          checked_in_at?: string
          status: string
          notes?: string
          metadata: Record<string, any>
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          registration_method?: string
          registered_at?: string
          checked_in_at?: string
          status?: string
          notes?: string
          metadata?: Record<string, any>
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          registration_method?: string
          registered_at?: string
          checked_in_at?: string
          status?: string
          notes?: string
          metadata?: Record<string, any>
        }
      }
      session_workshops: {
        Row: {
          id: string
          session_id: string
          workshop_id: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          workshop_id: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          workshop_id?: string
          created_at?: string
        }
      }
      workshop_registrations: {
        Row: {
          id: string
          workshop_id: string
          user_id: string
          registered_at: string
        }
        Insert: {
          id?: string
          workshop_id: string
          user_id: string
          registered_at?: string
        }
        Update: {
          id?: string
          workshop_id?: string
          user_id?: string
          registered_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          workshop_id: string
          title: string
          description?: string
          due_date?: string
          order_index: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workshop_id: string
          title: string
          description?: string
          due_date?: string
          order_index?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workshop_id?: string
          title?: string
          description?: string
          due_date?: string
          order_index?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      submissions: {
        Row: {
          id: string
          task_id: string
          user_id: string
          file_url?: string
          submission_url?: string
          notes?: string
          status: 'draft' | 'submitted' | 'reviewed'
          feedback?: string
          grade?: string
          reviewed_at?: string
          reviewed_by?: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          file_url?: string
          submission_url?: string
          notes?: string
          status?: 'draft' | 'submitted' | 'reviewed'
          feedback?: string
          grade?: string
          reviewed_at?: string
          reviewed_by?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          file_url?: string
          submission_url?: string
          notes?: string
          status?: 'draft' | 'submitted' | 'reviewed'
          feedback?: string
          grade?: string
          reviewed_at?: string
          reviewed_by?: string
          submitted_at?: string
          updated_at?: string
        }
      }
    }
  }
}