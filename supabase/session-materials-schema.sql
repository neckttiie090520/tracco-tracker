-- Session Materials table
CREATE TABLE IF NOT EXISTS session_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
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
ALTER TABLE session_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for session materials
-- Materials are viewable by session participants and admins
CREATE POLICY "Participants can view session materials" ON session_materials FOR SELECT USING (
    is_active = true AND (
        EXISTS (SELECT 1 FROM session_registrations WHERE session_id = session_materials.session_id AND user_id::text = auth.uid()::text)
        OR EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
        OR EXISTS (SELECT 1 FROM sessions WHERE id = session_materials.session_id AND is_active = true)  -- Public sessions
    )
);

-- Admins can manage materials
CREATE POLICY "Admins can manage session materials" ON session_materials FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_session_materials_session_id ON session_materials(session_id);
CREATE INDEX IF NOT EXISTS idx_session_materials_order ON session_materials(session_id, order_index);
CREATE INDEX IF NOT EXISTS idx_session_materials_active ON session_materials(session_id, is_active);