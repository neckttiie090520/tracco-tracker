-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  subject text NOT NULL,
  template text NOT NULL,
  status text DEFAULT 'sent'::text CHECK (status = ANY (ARRAY['sent'::text, 'failed'::text, 'bounced'::text, 'delivered'::text])),
  provider_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notification_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  subject text NOT NULL,
  template text NOT NULL,
  data jsonb NOT NULL,
  priority text DEFAULT 'normal'::text CHECK (priority = ANY (ARRAY['high'::text, 'normal'::text, 'low'::text])),
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'sent'::text, 'failed'::text])),
  scheduled_for timestamp with time zone DEFAULT now(),
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  CONSTRAINT notification_queue_pkey PRIMARY KEY (id)
);
CREATE TABLE public.scheduled_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  workshop_id uuid,
  task_id uuid,
  notification_type text NOT NULL,
  scheduled_for timestamp with time zone NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'cancelled'::text])),
  created_at timestamp with time zone DEFAULT now(),
  sent_at timestamp with time zone,
  CONSTRAINT scheduled_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT scheduled_notifications_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT scheduled_notifications_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id)
);
CREATE TABLE public.session_materials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  title character varying,
  url text NOT NULL,
  embed_url text,
  display_mode character varying DEFAULT 'embed'::character varying CHECK (display_mode::text = ANY (ARRAY['title'::character varying, 'link'::character varying, 'embed'::character varying]::text[])),
  type character varying,
  metadata jsonb DEFAULT '{}'::jsonb,
  dimensions jsonb DEFAULT '{"width": "100%", "height": "400px"}'::jsonb,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT session_materials_pkey PRIMARY KEY (id),
  CONSTRAINT session_materials_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id)
);
CREATE TABLE public.session_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  registration_method text DEFAULT 'manual'::text CHECK (registration_method = ANY (ARRAY['manual'::text, 'bulk_import'::text, 'self_register'::text])),
  registered_at timestamp with time zone DEFAULT now(),
  checked_in_at timestamp with time zone,
  status text DEFAULT 'registered'::text CHECK (status = ANY (ARRAY['registered'::text, 'checked_in'::text, 'completed'::text, 'cancelled'::text])),
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT session_registrations_pkey PRIMARY KEY (id),
  CONSTRAINT session_registrations_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT session_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.session_workshops (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  workshop_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT session_workshops_pkey PRIMARY KEY (id),
  CONSTRAINT session_workshops_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT session_workshops_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id)
);
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  organizer_id uuid,
  cover_image_url text,
  location text,
  venue text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  max_participants integer DEFAULT 500,
  registration_open boolean DEFAULT true,
  is_active boolean DEFAULT true,
  is_published boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamp with time zone,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES public.users(id)
);
CREATE TABLE public.submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid,
  user_id uuid,
  file_url text,
  submission_url text,
  notes text,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'reviewed'::text])),
  submitted_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  group_id uuid,
  links jsonb,
  CONSTRAINT submissions_pkey PRIMARY KEY (id),
  CONSTRAINT submissions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT submissions_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.task_groups(id)
);
CREATE TABLE public.task_group_members (
  task_group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner'::text, 'member'::text])),
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT task_group_members_pkey PRIMARY KEY (task_group_id, user_id),
  CONSTRAINT task_group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT task_group_members_task_group_id_fkey FOREIGN KEY (task_group_id) REFERENCES public.task_groups(id)
);
CREATE TABLE public.task_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  name text NOT NULL,
  owner_id uuid NOT NULL,
  party_code text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT task_groups_pkey PRIMARY KEY (id),
  CONSTRAINT task_groups_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_groups_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.task_materials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  title text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['google_doc'::text, 'google_slide'::text, 'google_sheet'::text, 'canva_embed'::text, 'canva_link'::text, 'drive_file'::text, 'drive_folder'::text, 'youtube'::text, 'generic'::text])),
  url text NOT NULL,
  embed_url text,
  display_mode text NOT NULL DEFAULT 'title'::text CHECK (display_mode = ANY (ARRAY['title'::text, 'link'::text, 'embed'::text])),
  dimensions jsonb,
  metadata jsonb,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT task_materials_pkey PRIMARY KEY (id),
  CONSTRAINT task_materials_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workshop_id uuid,
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamp with time zone,
  submission_mode text NOT NULL DEFAULT 'individual'::text CHECK (submission_mode = ANY (ARRAY['individual'::text, 'group'::text])),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id)
);
CREATE TABLE public.user_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  badge_type text NOT NULL,
  badge_name text NOT NULL,
  badge_icon text NOT NULL,
  earned_at timestamp with time zone DEFAULT now(),
  workshop_id uuid,
  task_id uuid,
  CONSTRAINT user_badges_pkey PRIMARY KEY (id),
  CONSTRAINT user_badges_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_badges_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id)
);
CREATE TABLE public.user_notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  email_workshop_reminders boolean DEFAULT true,
  email_task_notifications boolean DEFAULT true,
  email_registration_confirmations boolean DEFAULT true,
  email_cancellations boolean DEFAULT true,
  reminder_24h boolean DEFAULT true,
  reminder_1h boolean DEFAULT true,
  task_due_reminders boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_notification_preferences_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  workshop_id uuid,
  total_tasks integer DEFAULT 0,
  completed_tasks integer DEFAULT 0,
  completion_percentage numeric DEFAULT 0.00,
  points_earned integer DEFAULT 0,
  streak_days integer DEFAULT 0,
  last_activity timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_progress_pkey PRIMARY KEY (id),
  CONSTRAINT user_progress_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id),
  CONSTRAINT user_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role text DEFAULT 'participant'::text CHECK (role = ANY (ARRAY['admin'::text, 'participant'::text])),
  faculty text,
  department text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  bio text,
  avatar_saturation integer DEFAULT 95 CHECK (avatar_saturation >= 0 AND avatar_saturation <= 100),
  avatar_lightness integer DEFAULT 45 CHECK (avatar_lightness >= 10 AND avatar_lightness <= 90),
  avatar_seed text,
  organization text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.workshop_materials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workshop_id uuid,
  title text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['google_doc'::text, 'google_slide'::text, 'google_sheet'::text, 'canva_embed'::text, 'canva_link'::text, 'drive_file'::text, 'drive_folder'::text, 'youtube'::text, 'generic'::text])),
  url text NOT NULL,
  embed_url text,
  display_mode text DEFAULT 'title'::text CHECK (display_mode = ANY (ARRAY['title'::text, 'link'::text, 'embed'::text])),
  dimensions jsonb DEFAULT '{"width": "100%", "height": "400px"}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT workshop_materials_pkey PRIMARY KEY (id),
  CONSTRAINT workshop_materials_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id)
);
CREATE TABLE public.workshop_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workshop_id uuid,
  user_id uuid,
  registered_at timestamp with time zone DEFAULT now(),
  CONSTRAINT workshop_registrations_pkey PRIMARY KEY (id),
  CONSTRAINT workshop_registrations_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id)
);
CREATE TABLE public.workshops (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  instructor uuid,
  google_doc_url text,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  max_participants integer DEFAULT 150,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  session_id uuid,
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamp with time zone,
  CONSTRAINT workshops_pkey PRIMARY KEY (id),
  CONSTRAINT workshops_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id)
);