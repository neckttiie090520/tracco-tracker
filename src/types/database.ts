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
          is_archived: boolean
          archived_at?: string
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
          is_active?: boolean
          is_published?: boolean
          is_archived?: boolean
          archived_at?: string
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
          is_archived?: boolean
          archived_at?: string
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
          is_archived: boolean
          archived_at?: string
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
          is_archived?: boolean
          archived_at?: string
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
          is_archived?: boolean
          archived_at?: string
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
          submission_mode: 'individual' | 'group'
          is_archived: boolean
          archived_at?: string
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
          submission_mode?: 'individual' | 'group'
          is_archived?: boolean
          archived_at?: string
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
          submission_mode?: 'individual' | 'group'
          is_archived?: boolean
          archived_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      submissions: {
        Row: {
          id: string
          task_id: string
          user_id: string
          group_id?: string | null
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
          group_id?: string | null
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
          group_id?: string | null
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
      task_groups: {
        Row: {
          id: string
          task_id: string
          name: string
          owner_id: string
          party_code: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          name: string
          owner_id: string
          party_code: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          name?: string
          owner_id?: string
          party_code?: string
          created_at?: string
        }
      }
      task_group_members: {
        Row: {
          task_group_id: string
          user_id: string
          role: 'owner' | 'member'
          joined_at: string
        }
        Insert: {
          task_group_id: string
          user_id: string
          role?: 'owner' | 'member'
          joined_at?: string
        }
        Update: {
          task_group_id?: string
          user_id?: string
          role?: 'owner' | 'member'
          joined_at?: string
        }
      }
    }
  }
}
