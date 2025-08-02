import type { MaterialMetadata, MaterialType } from '../types/materials';
import { detectMaterialType, convertToEmbedUrl, canEmbed, getFaviconUrl, getDomainName } from '../utils/materialUtils';

/**
 * Service for extracting metadata from URLs
 * In a production environment, this would typically call a backend service
 * that can safely fetch and parse HTML content
 */
export class MaterialMetadataService {
  /**
   * Extracts metadata from a URL
   */
  static async extractMetadata(url: string): Promise<MaterialMetadata> {
    const type = detectMaterialType(url);
    const embedUrl = convertToEmbedUrl(url, type);
    const canEmbedContent = canEmbed(type);
    
    // For now, we'll provide basic metadata based on URL patterns
    // In production, you'd want to implement proper Open Graph parsing
    const metadata: MaterialMetadata = {
      title: await this.extractTitle(url, type),
      favicon: getFaviconUrl(url),
      canEmbed: canEmbedContent,
      embedUrl: canEmbedContent ? embedUrl : undefined,
    };
    
    // Try to get thumbnail for supported services
    const thumbnail = await this.extractThumbnail(url, type);
    if (thumbnail) {
      metadata.thumbnail = thumbnail;
    }
    
    return metadata;
  }
  
  /**
   * Extracts title from URL or generates a reasonable default
   */
  private static async extractTitle(url: string, type: MaterialType): Promise<string> {
    // For specific services, we can generate better titles
    switch (type) {
      case 'google_doc':
        return this.extractGoogleDocTitle(url) || 'Google Document';
      
      case 'google_slide':
        return this.extractGoogleSlideTitle(url) || 'Google Slides Presentation';
      
      case 'google_sheet':
        return this.extractGoogleSheetTitle(url) || 'Google Spreadsheet';
      
      case 'youtube':
        return this.extractYouTubeTitle(url) || 'YouTube Video';
      
      case 'canva_embed':
      case 'canva_link':
        return this.extractCanvaTitle(url) || 'Canva Design';
      
      case 'drive_file':
        return 'Google Drive File';
      
      case 'drive_folder':
        return 'Google Drive Folder';
      
      default:
        return getDomainName(url) + ' Link';
    }
  }
  
  /**
   * Extracts thumbnail URL for supported services
   */
  private static async extractThumbnail(url: string, type: MaterialType): Promise<string | undefined> {
    switch (type) {
      case 'youtube': {
        const videoId = this.extractYouTubeVideoId(url);
        if (videoId) {
          return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
        break;
      }
      
      
      // For Google services, thumbnails would require API integration
      case 'google_doc':
      case 'google_slide':
      case 'google_sheet':
      case 'drive_file':
        // Google Drive API could provide thumbnails
        break;
      
      case 'canva_embed':
      case 'canva_link':
        // Canva API could provide thumbnails
        break;
    }
    
    return undefined;
  }
  
  /**
   * Attempts to extract Google Doc title from URL
   */
  private static extractGoogleDocTitle(url: string): string | null {
    // Google Docs sometimes include the title in the URL path
    // This is a simple heuristic - in production you'd use the Google Docs API
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const titleIndex = pathParts.findIndex(part => part === 'document') + 2;
      if (titleIndex < pathParts.length && pathParts[titleIndex] !== 'edit') {
        return decodeURIComponent(pathParts[titleIndex]).replace(/[-_]/g, ' ');
      }
    } catch {
      // Ignore parsing errors
    }
    return null;
  }
  
  /**
   * Attempts to extract Google Slides title from URL
   */
  private static extractGoogleSlideTitle(url: string): string | null {
    // Similar to Google Docs
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const titleIndex = pathParts.findIndex(part => part === 'presentation') + 2;
      if (titleIndex < pathParts.length && pathParts[titleIndex] !== 'edit') {
        return decodeURIComponent(pathParts[titleIndex]).replace(/[-_]/g, ' ');
      }
    } catch {
      // Ignore parsing errors
    }
    return null;
  }
  
  /**
   * Attempts to extract Google Sheets title from URL
   */
  private static extractGoogleSheetTitle(url: string): string | null {
    // Similar to Google Docs
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const titleIndex = pathParts.findIndex(part => part === 'spreadsheets') + 2;
      if (titleIndex < pathParts.length && pathParts[titleIndex] !== 'edit') {
        return decodeURIComponent(pathParts[titleIndex]).replace(/[-_]/g, ' ');
      }
    } catch {
      // Ignore parsing errors
    }
    return null;
  }
  
  /**
   * Attempts to extract YouTube title from URL
   */
  private static extractYouTubeTitle(_url: string): string | null {
    // YouTube titles would require API integration
    // For now, just indicate it's a YouTube video
    return null;
  }
  
  /**
   * Attempts to extract Canva design title from URL
   */
  private static extractCanvaTitle(url: string): string | null {
    // Canva URLs sometimes contain design IDs but not titles
    // For now, we'll provide a generic title based on URL structure
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      // Look for design ID and create a meaningful title
      if (pathParts.includes('design')) {
        const designIndex = pathParts.indexOf('design');
        if (designIndex < pathParts.length - 1) {
          const designId = pathParts[designIndex + 1];
          // If there's a recognizable pattern, we could make it more specific
          if (url.includes('/view')) {
            return 'Canva Presentation';
          } else if (url.includes('/edit')) {
            return 'Canva Design (Editable)';
          }
          return `Canva Design`;
        }
      }
    } catch {
      // Ignore parsing errors
    }
    return null;
  }
  
  /**
   * Extracts YouTube video ID from various URL formats
   */
  private static extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }
}

/**
 * Simulates a metadata extraction API call
 * In production, this would be replaced with actual HTTP requests to your backend
 */
export async function fetchUrlMetadata(url: string): Promise<MaterialMetadata> {
  try {
    return await MaterialMetadataService.extractMetadata(url);
  } catch (error) {
    console.error('Error extracting metadata:', error);
    
    // Fallback metadata
    return {
      title: getDomainName(url) + ' Link',
      favicon: getFaviconUrl(url),
      canEmbed: false,
    };
  }
}