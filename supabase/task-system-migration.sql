-- Migration to add missing fields for task system
-- Run this after the initial schema.sql

-- Add missing columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add missing columns to submissions table  
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('draft', 'submitted', 'reviewed')) DEFAULT 'draft';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);

-- Update workshops table to add is_active if not exists
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_submissions_updated_at ON submissions;
CREATE TRIGGER update_submissions_updated_at
    BEFORE UPDATE ON submissions
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_workshops_updated_at ON workshops;
CREATE TRIGGER update_workshops_updated_at
    BEFORE UPDATE ON workshops
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Create storage bucket for workshop files if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('workshop-files', 'workshop-files', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for workshop files
CREATE POLICY IF NOT EXISTS "Users can upload their own files" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'workshop-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can view their own files and admins can view all" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'workshop-files' AND (
            auth.uid()::text = (storage.foldername(name))[1] OR
            EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
        )
    );

CREATE POLICY IF NOT EXISTS "Users can update their own files" ON storage.objects
    FOR UPDATE USING (bucket_id = 'workshop-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can delete their own files" ON storage.objects
    FOR DELETE USING (bucket_id = 'workshop-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add RLS policies for admin task management
CREATE POLICY IF NOT EXISTS "Admins can manage all tasks" ON tasks 
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));

-- Update submission policies to allow admin reviews
DROP POLICY IF EXISTS "Admins can review all submissions" ON submissions;
CREATE POLICY "Admins can review all submissions" ON submissions 
    FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));

-- Ensure task statistics are accessible to admins
CREATE OR REPLACE VIEW task_submission_stats AS
SELECT 
    t.id as task_id,
    t.title,
    t.workshop_id,
    w.title as workshop_title,
    COUNT(s.id) as total_submissions,
    COUNT(CASE WHEN s.status = 'submitted' THEN 1 END) as submitted_count,
    COUNT(CASE WHEN s.status = 'reviewed' THEN 1 END) as reviewed_count,
    COUNT(CASE WHEN s.status = 'draft' THEN 1 END) as draft_count
FROM tasks t
LEFT JOIN submissions s ON t.id = s.task_id
LEFT JOIN workshops w ON t.workshop_id = w.id
WHERE t.is_active = true
GROUP BY t.id, t.title, t.workshop_id, w.title;

-- Grant access to the view for authenticated users
GRANT SELECT ON task_submission_stats TO authenticated;