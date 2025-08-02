-- Workshop Materials table
CREATE TABLE IF NOT EXISTS workshop_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('google_doc', 'google_slide', 'google_sheet', 'canva_embed', 'canva_link', 'drive_file', 'drive_folder', 'youtube', 'generic')) NOT NULL,
    url TEXT NOT NULL,
    embed_url TEXT,
    display_mode TEXT CHECK (display_mode IN ('title', 'link', 'embed')) DEFAULT 'title',
    dimensions JSONB DEFAULT '{"width": "100%", "height": "400px"}',
    metadata JSONB DEFAULT '{}',
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workshop_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workshop materials
-- Materials are viewable by workshop participants and admins
CREATE POLICY "Participants can view workshop materials" ON workshop_materials FOR SELECT USING (
    is_active = true AND (
        EXISTS (SELECT 1 FROM workshop_registrations WHERE workshop_id = workshop_materials.workshop_id AND user_id::text = auth.uid()::text)
        OR EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
        OR EXISTS (SELECT 1 FROM workshops WHERE id = workshop_materials.workshop_id AND is_active = true)  -- Public workshops
    )
);

-- Admins can manage materials
CREATE POLICY "Admins can manage workshop materials" ON workshop_materials FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workshop_materials_workshop_id ON workshop_materials(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_materials_order ON workshop_materials(workshop_id, order_index);
CREATE INDEX IF NOT EXISTS idx_workshop_materials_active ON workshop_materials(workshop_id, is_active);

-- Add some sample materials for existing workshops
INSERT INTO workshop_materials (workshop_id, title, type, url, display_mode, order_index) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'React Documentation', 'generic', 'https://reactjs.org/docs/getting-started.html', 'title', 1),
    ('550e8400-e29b-41d4-a716-446655440001', 'TypeScript Handbook', 'generic', 'https://www.typescriptlang.org/docs/', 'title', 2),
    ('550e8400-e29b-41d4-a716-446655440002', 'Python Data Science Notebook', 'generic', 'https://colab.research.google.com/example', 'link', 1)
ON CONFLICT DO NOTHING;