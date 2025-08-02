-- Task Materials table (similar to workshop_materials but for tasks)
-- This extends the materials system to support task-specific reference materials

CREATE TABLE IF NOT EXISTS task_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('google_doc', 'google_slide', 'google_sheet', 'canva_embed', 'canva_link', 'drive_file', 'drive_folder', 'youtube', 'generic')),
  url TEXT NOT NULL,
  embed_url TEXT,
  display_mode TEXT NOT NULL DEFAULT 'title' CHECK (display_mode IN ('title', 'link', 'embed')),
  dimensions JSONB,
  metadata JSONB,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_materials_task_id ON task_materials(task_id);
CREATE INDEX IF NOT EXISTS idx_task_materials_order ON task_materials(task_id, order_index) WHERE is_active = true;

-- Row Level Security (RLS)
ALTER TABLE task_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Participants can view materials for tasks in workshops they're registered for
CREATE POLICY "Participants can view task materials" ON task_materials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN workshop_registrations wr ON wr.workshop_id = t.workshop_id
      WHERE t.id = task_materials.task_id 
      AND wr.user_id = auth.uid()
    )
  );

-- Admins can manage all task materials
CREATE POLICY "Admins can manage task materials" ON task_materials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_task_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_task_materials_updated_at
  BEFORE UPDATE ON task_materials
  FOR EACH ROW EXECUTE FUNCTION update_task_materials_updated_at();

-- Comments
COMMENT ON TABLE task_materials IS 'Reference materials and resources attached to specific tasks';
COMMENT ON COLUMN task_materials.task_id IS 'References the parent task';
COMMENT ON COLUMN task_materials.type IS 'Material type for display optimization';
COMMENT ON COLUMN task_materials.display_mode IS 'How the material should be displayed (title card, full link, or embedded)';
COMMENT ON COLUMN task_materials.dimensions IS 'Display dimensions for embedded content (JSON: {width, height})';
COMMENT ON COLUMN task_materials.metadata IS 'Cached metadata (title, favicon, etc.) for performance';
COMMENT ON COLUMN task_materials.order_index IS 'Display order within the task (0-based)';