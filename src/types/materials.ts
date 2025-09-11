export interface WorkshopMaterial {
  id: string;
  workshop_id: string;
  title: string;
  type: 'google_doc' | 'google_slide' | 'google_sheet' | 'canva_embed' | 'canva_link' | 'drive_file' | 'drive_folder' | 'youtube' | 'generic' | 'rich_text';
  url: string;
  embed_url?: string; // Converted URL for embedding
  display_mode: 'title' | 'link' | 'embed' | 'content';
  content_type?: 'url' | 'rich_text';
  rich_content?: any; // Quill.js Delta format
  description?: string;
  dimensions?: {
    width: string;    // e.g., '100%'
    height: string;   // e.g., '600px', or calculated from aspect ratio
  };
  metadata?: {
    title?: string;
    favicon?: string;
    thumbnail?: string;
    description?: string;
  };
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface MaterialMetadata {
  title: string;
  favicon?: string;
  thumbnail?: string;
  description?: string;
  canEmbed: boolean;
  embedUrl?: string;
}

export type MaterialType = WorkshopMaterial['type'];
export type DisplayMode = WorkshopMaterial['display_mode'];

export interface CreateMaterialRequest {
  workshop_id: string;
  title?: string;
  url: string;
  display_mode: DisplayMode;
  content_type?: 'url' | 'rich_text';
  rich_content?: any; // Quill.js Delta format
  description?: string;
  dimensions?: {
    width: string;
    height: string;
  };
}

export interface UpdateMaterialRequest {
  title?: string;
  display_mode?: DisplayMode;
  dimensions?: {
    width: string;
    height: string;
  };
  order_index?: number;
}

// Task Materials - Similar to WorkshopMaterial but for tasks
export interface TaskMaterial {
  id: string;
  task_id: string;
  title: string;
  type: 'google_doc' | 'google_slide' | 'google_sheet' | 'canva_embed' | 'canva_link' | 'drive_file' | 'drive_folder' | 'youtube' | 'generic' | 'rich_text';
  url: string;
  embed_url?: string; // Converted URL for embedding
  display_mode: 'title' | 'link' | 'embed' | 'content';
  content_type?: 'url' | 'rich_text';
  rich_content?: any; // Quill.js Delta format
  description?: string;
  dimensions?: {
    width: string;    // e.g., '100%'
    height: string;   // e.g., '600px', or calculated from aspect ratio
  };
  metadata?: {
    title?: string;
    favicon?: string;
    thumbnail?: string;
    description?: string;
  };
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskMaterialRequest {
  task_id: string;
  title?: string;
  url: string;
  display_mode: DisplayMode;
  content_type?: 'url' | 'rich_text';
  rich_content?: any; // Quill.js Delta format
  description?: string;
  dimensions?: {
    width: string;
    height: string;
  };
}

// Session Materials - Similar to WorkshopMaterial but for sessions
export interface SessionMaterial {
  id: string;
  session_id: string;
  title: string;
  type: 'google_doc' | 'google_slide' | 'google_sheet' | 'canva_embed' | 'canva_link' | 'drive_file' | 'drive_folder' | 'youtube' | 'generic' | 'rich_text';
  url: string;
  embed_url?: string; // Converted URL for embedding
  display_mode: 'title' | 'link' | 'embed' | 'content';
  content_type?: 'url' | 'rich_text';
  rich_content?: any; // Quill.js Delta format
  description?: string;
  dimensions?: {
    width: string;    // e.g., '100%'
    height: string;   // e.g., '600px', or calculated from aspect ratio
  };
  metadata?: {
    title?: string;
    favicon?: string;
    thumbnail?: string;
    description?: string;
  };
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionMaterialRequest {
  session_id: string;
  title?: string;
  url: string;
  display_mode: DisplayMode;
  content_type?: 'url' | 'rich_text';
  rich_content?: any; // Quill.js Delta format
  description?: string;
  dimensions?: {
    width: string;
    height: string;
  };
}

export interface UpdateSessionMaterialRequest {
  title?: string;
  display_mode?: DisplayMode;
  dimensions?: {
    width: string;
    height: string;
  };
  order_index?: number;
  is_active?: boolean;
}