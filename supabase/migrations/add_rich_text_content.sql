-- Migration to add rich text content support to materials tables
-- This allows storing Quill.js editor content alongside existing URL-based materials

-- Add content columns to workshop_materials table
ALTER TABLE workshop_materials 
ADD COLUMN IF NOT EXISTS content_type TEXT CHECK (content_type IN ('url', 'rich_text')) DEFAULT 'url',
ADD COLUMN IF NOT EXISTS rich_content JSONB,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add content columns to task_materials table  
ALTER TABLE task_materials 
ADD COLUMN IF NOT EXISTS content_type TEXT CHECK (content_type IN ('url', 'rich_text')) DEFAULT 'url',
ADD COLUMN IF NOT EXISTS rich_content JSONB,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add content columns to session_materials table
ALTER TABLE session_materials 
ADD COLUMN IF NOT EXISTS content_type TEXT CHECK (content_type IN ('url', 'rich_text')) DEFAULT 'url',
ADD COLUMN IF NOT EXISTS rich_content JSONB,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update material types to include rich_text
ALTER TABLE workshop_materials 
DROP CONSTRAINT IF EXISTS workshop_materials_type_check,
ADD CONSTRAINT workshop_materials_type_check 
CHECK (type IN ('google_doc', 'google_slide', 'google_sheet', 'canva_embed', 'canva_link', 'drive_file', 'drive_folder', 'youtube', 'generic', 'rich_text'));

ALTER TABLE task_materials 
DROP CONSTRAINT IF EXISTS task_materials_type_check,
ADD CONSTRAINT task_materials_type_check 
CHECK (type IN ('google_doc', 'google_slide', 'google_sheet', 'canva_embed', 'canva_link', 'drive_file', 'drive_folder', 'youtube', 'generic', 'rich_text'));

ALTER TABLE session_materials 
DROP CONSTRAINT IF EXISTS session_materials_type_check,
ADD CONSTRAINT session_materials_type_check 
CHECK (type IN ('google_doc', 'google_slide', 'google_sheet', 'canva_embed', 'canva_link', 'drive_file', 'drive_folder', 'youtube', 'generic', 'rich_text'));

-- Update display_mode to include content mode
ALTER TABLE workshop_materials 
DROP CONSTRAINT IF EXISTS workshop_materials_display_mode_check,
ADD CONSTRAINT workshop_materials_display_mode_check 
CHECK (display_mode IN ('title', 'link', 'embed', 'content'));

ALTER TABLE task_materials 
DROP CONSTRAINT IF EXISTS task_materials_display_mode_check,
ADD CONSTRAINT task_materials_display_mode_check 
CHECK (display_mode IN ('title', 'link', 'embed', 'content'));

ALTER TABLE session_materials 
DROP CONSTRAINT IF EXISTS session_materials_display_mode_check,
ADD CONSTRAINT session_materials_display_mode_check 
CHECK (display_mode IN ('title', 'link', 'embed', 'content'));

-- Create indexes for better performance on rich content queries
CREATE INDEX IF NOT EXISTS idx_workshop_materials_content_type ON workshop_materials(content_type);
CREATE INDEX IF NOT EXISTS idx_task_materials_content_type ON task_materials(content_type);  
CREATE INDEX IF NOT EXISTS idx_session_materials_content_type ON session_materials(content_type);

-- Add comments for documentation
COMMENT ON COLUMN workshop_materials.content_type IS 'Type of material content: url for external links, rich_text for Quill.js content';
COMMENT ON COLUMN workshop_materials.rich_content IS 'Quill.js Delta format content for rich text materials';
COMMENT ON COLUMN workshop_materials.description IS 'Optional description for the material';

COMMENT ON COLUMN task_materials.content_type IS 'Type of material content: url for external links, rich_text for Quill.js content';
COMMENT ON COLUMN task_materials.rich_content IS 'Quill.js Delta format content for rich text materials';
COMMENT ON COLUMN task_materials.description IS 'Optional description for the material';

COMMENT ON COLUMN session_materials.content_type IS 'Type of material content: url for external links, rich_text for Quill.js content';
COMMENT ON COLUMN session_materials.rich_content IS 'Quill.js Delta format content for rich text materials';
COMMENT ON COLUMN session_materials.description IS 'Optional description for the material';