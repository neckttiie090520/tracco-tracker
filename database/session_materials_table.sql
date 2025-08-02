-- Create session_materials table
CREATE TABLE IF NOT EXISTS session_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    title VARCHAR(255),
    url TEXT NOT NULL,
    embed_url TEXT,
    display_mode VARCHAR(10) DEFAULT 'embed' CHECK (display_mode IN ('title', 'link', 'embed')),
    type VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    dimensions JSONB DEFAULT '{"width": "100%", "height": "400px"}',
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_session_materials_session_id ON session_materials(session_id);
CREATE INDEX IF NOT EXISTS idx_session_materials_active ON session_materials(is_active);
CREATE INDEX IF NOT EXISTS idx_session_materials_order ON session_materials(session_id, order_index);

-- Enable RLS
ALTER TABLE session_materials ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view active session materials" ON session_materials
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage session materials" ON session_materials
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_session_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_materials_updated_at
    BEFORE UPDATE ON session_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_session_materials_updated_at();