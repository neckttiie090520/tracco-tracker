import type { MaterialType } from '../types/materials';

/**
 * Detects the type of material based on URL patterns
 */
export function detectMaterialType(url: string): MaterialType {
  const normalizedUrl = url.toLowerCase();

  // Google Docs
  if (normalizedUrl.includes('docs.google.com/document')) {
    return 'google_doc';
  }
  
  // Google Slides
  if (normalizedUrl.includes('docs.google.com/presentation')) {
    return 'google_slide';
  }
  
  // Google Sheets
  if (normalizedUrl.includes('docs.google.com/spreadsheets')) {
    return 'google_sheet';
  }
  
  // Google Drive files
  if (normalizedUrl.includes('drive.google.com/file')) {
    return 'drive_file';
  }
  
  // Google Drive folders
  if (normalizedUrl.includes('drive.google.com/drive/folders')) {
    return 'drive_folder';
  }
  
  // Canva
  if (normalizedUrl.includes('canva.com')) {
    if (normalizedUrl.includes('/embed') || normalizedUrl.includes('embed=true')) {
      return 'canva_embed';
    }
    // Check if it's a Canva design/presentation link that can be embedded
    if (normalizedUrl.includes('/design/') && (normalizedUrl.includes('/view') || normalizedUrl.includes('/edit'))) {
      return 'canva_embed'; // Treat as embeddable
    }
    return 'canva_link';
  }
  
  // YouTube
  if (normalizedUrl.includes('youtube.com/watch') || 
      normalizedUrl.includes('youtu.be/') || 
      normalizedUrl.includes('youtube.com/embed')) {
    return 'youtube';
  }
  
  
  return 'generic';
}

/**
 * Converts a regular URL to its embeddable version
 */
export function convertToEmbedUrl(url: string, type: MaterialType): string {
  switch (type) {
    case 'google_doc': {
      // Convert from: https://docs.google.com/document/d/DOCUMENT_ID/edit
      // To: https://docs.google.com/document/d/DOCUMENT_ID/preview
      const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        return `https://docs.google.com/document/d/${match[1]}/preview`;
      }
      return url;
    }
    
    case 'google_slide': {
      // Convert from: https://docs.google.com/presentation/d/PRESENTATION_ID/edit
      // To: https://docs.google.com/presentation/d/PRESENTATION_ID/embed?start=false&loop=false&delayms=3000
      const match = url.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        return `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=3000`;
      }
      return url;
    }
    
    case 'google_sheet': {
      // Convert from: https://docs.google.com/spreadsheets/d/SHEET_ID/edit
      // To: https://docs.google.com/spreadsheets/d/SHEET_ID/pubhtml?widget=true&headers=false
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        return `https://docs.google.com/spreadsheets/d/${match[1]}/pubhtml?widget=true&headers=false`;
      }
      return url;
    }
    
    case 'drive_file': {
      // Convert from: https://drive.google.com/file/d/FILE_ID/view
      // To: https://drive.google.com/file/d/FILE_ID/preview
      const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
      return url;
    }
    
    case 'youtube': {
      // Convert from: https://www.youtube.com/watch?v=VIDEO_ID
      // To: https://www.youtube.com/embed/VIDEO_ID
      let videoId = '';
      
      if (url.includes('youtube.com/watch')) {
        const match = url.match(/[?&]v=([^&]+)/);
        if (match) videoId = match[1];
      } else if (url.includes('youtu.be/')) {
        const match = url.match(/youtu\.be\/([^?&]+)/);
        if (match) videoId = match[1];
      } else if (url.includes('youtube.com/embed')) {
        return url; // Already in embed format
      }
      
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
      return url;
    }
    
    case 'canva_embed': {
      // Convert Canva design/presentation URLs to embed format
      // From: https://www.canva.com/design/DESIGN_ID/view
      // To: https://www.canva.com/design/DESIGN_ID/view?embed
      if (url.includes('/design/') && !url.includes('embed')) {
        // Remove any existing query parameters and add embed=true
        const baseUrl = url.split('?')[0];
        if (baseUrl.endsWith('/view') || baseUrl.endsWith('/edit')) {
          return baseUrl.replace('/edit', '/view') + '?embed';
        }
        // If URL doesn't end with /view or /edit, try to add view and embed
        const urlWithoutSlash = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        return urlWithoutSlash + '/view?embed';
      }
      // Already in embed format or other Canva embed URL
      return url;
    }
    
    default:
      return url;
  }
}

/**
 * Checks if a material type supports embedding
 */
export function canEmbed(type: MaterialType): boolean {
  const embeddableTypes: MaterialType[] = [
    'google_doc',
    'google_slide', 
    'google_sheet',
    'drive_file',
    'canva_embed',
    'youtube'
  ];
  
  return embeddableTypes.includes(type);
}

/**
 * Gets default dimensions for different material types
 */
export function getDefaultDimensions(type: MaterialType): { width: string; height: string } {
  switch (type) {
    case 'youtube':
      return { width: '100%', height: '315px' }; // 16:9 aspect ratio
    
    case 'google_slide':
      return { width: '100%', height: '400px' };
    
    case 'google_doc':
    case 'google_sheet':
    case 'drive_file':
      return { width: '100%', height: '600px' };
    
    case 'canva_embed':
      return { width: '100%', height: '500px' };
    
    default:
      return { width: '100%', height: '400px' };
  }
}

/**
 * Extracts favicon URL from a domain
 */
export function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).origin;
    return `${domain}/favicon.ico`;
  } catch {
    return '/default-favicon.ico';
  }
}

/**
 * Gets a display-friendly domain name from URL
 */
export function getDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch {
    return 'Unknown';
  }
}

/**
 * Validates if a URL is potentially embeddable
 */
export function validateEmbedUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const urlObj = new URL(url);
    
    // Check for HTTPS (required for most embeds)
    if (urlObj.protocol !== 'https:') {
      return { valid: false, reason: 'HTTPS required for embedding' };
    }
    
    // Check for known problematic domains
    const problematicDomains = ['facebook.com', 'instagram.com', 'tiktok.com', 'twitter.com'];
    if (problematicDomains.some(domain => urlObj.hostname.includes(domain))) {
      return { valid: false, reason: 'Platform does not support embedding' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }
}