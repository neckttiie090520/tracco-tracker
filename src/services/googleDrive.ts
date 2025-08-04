/**
 * Google Drive API Service
 * 
 * Handles file uploads, sharing permissions, and file management
 * for the Workshop Tracker Materials system.
 * 
 * References:
 * - Drive API: https://developers.google.com/drive/api/guides/about-sdk
 * - File Upload: https://developers.google.com/drive/api/guides/manage-uploads
 * - Permissions: https://developers.google.com/drive/api/guides/manage-sharing
 */

import { supabase } from './supabase'

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink: string;
  webContentLink: string;
  thumbnailLink?: string;
  createdTime: string;
  modifiedTime: string;
  parents?: string[];
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

class GoogleDriveService {
  private isInitialized = false;
  private accessToken: string | null = null;

  /**
   * Initialize Google APIs
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.loadGoogleApis();
    await this.initializeGapi();
    this.isInitialized = true;
  }

  /**
   * Load Google APIs scripts
   */
  private async loadGoogleApis(): Promise<void> {
    if (window.gapi && window.google) return;

    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';

    const pickerScript = document.createElement('script');
    pickerScript.src = 'https://apis.google.com/js/picker.js';

    document.head.appendChild(gapiScript);
    document.head.appendChild(gisScript);
    document.head.appendChild(pickerScript);

    return new Promise((resolve, reject) => {
      let scriptsLoaded = 0;
      const totalScripts = 3;

      const onLoad = () => {
        scriptsLoaded++;
        if (scriptsLoaded === totalScripts) resolve();
      };

      gapiScript.onload = onLoad;
      gisScript.onload = onLoad;
      pickerScript.onload = onLoad;
      
      gapiScript.onerror = gisScript.onerror = pickerScript.onerror = reject;
    });
  }

  /**
   * Initialize Google API client
   */
  private async initializeGapi(): Promise<void> {
    await new Promise<void>((resolve) => {
      window.gapi.load('client:picker', resolve);
    });

    await window.gapi.client.init({
      apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
    });
  }

  /**
   * Authenticate user with Google
   * If user is already logged in with Supabase, try to use existing token
   */
  async authenticate(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // First, try to get existing token from Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.provider_token) {
      // Use the existing Google token from Supabase
      this.accessToken = session.provider_token;
      window.gapi.client.setToken({ access_token: this.accessToken });
      
      // Verify the token has Drive permissions
      try {
        await window.gapi.client.drive.about.get();
        return true;
      } catch (error) {
        console.log('Existing token lacks Drive permissions, requesting new one');
      }
    }

    // If no existing token or it lacks Drive permissions, request new one
    return new Promise((resolve) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response: any) => {
          if (response.error) {
            console.error('Authentication error:', response.error);
            resolve(false);
            return;
          }
          
          this.accessToken = response.access_token;
          window.gapi.client.setToken({ access_token: this.accessToken });
          resolve(true);
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.accessToken && !!window.gapi?.client?.getToken();
  }

  /**
   * Create folder structure for workshop materials
   */
  async createMaterialsFolder(workshopId: string): Promise<string> {
    if (!this.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    // Check if main folder exists
    const mainFolderName = 'Workshop Materials';
    let mainFolderId = await this.findFolder(mainFolderName);
    
    if (!mainFolderId) {
      mainFolderId = await this.createFolder(mainFolderName, 'root');
    }

    // Create workshop-specific folder
    const workshopFolderName = `Workshop ${workshopId}`;
    let workshopFolderId = await this.findFolder(workshopFolderName, mainFolderId);
    
    if (!workshopFolderId) {
      workshopFolderId = await this.createFolder(workshopFolderName, mainFolderId);
    }

    return workshopFolderId;
  }

  /**
   * Find folder by name
   */
  private async findFolder(name: string, parentId: string = 'root'): Promise<string | null> {
    const response = await window.gapi.client.drive.files.list({
      q: `name='${name}' and parents in '${parentId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)'
    });

    return response.result.files?.[0]?.id || null;
  }

  /**
   * Create a new folder
   */
  private async createFolder(name: string, parentId: string): Promise<string> {
    const response = await window.gapi.client.drive.files.create({
      resource: {
        name: name,
        parents: [parentId],
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    });

    return response.result.id;
  }

  /**
   * Upload file to Google Drive
   */
  async uploadFile(
    file: File,
    folderId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<DriveFile> {
    if (!this.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    const metadata = {
      name: file.name,
      parents: [folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
    form.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percent: Math.round((e.loaded / e.total) * 100)
          });
        }
      });

      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            this.shareFile(response.id, 'reader', 'anyone')
              .then(() => this.getFileMetadata(response.id))
              .then(resolve)
              .catch(reject);
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        }
      };

      xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name');
      xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`);
      xhr.send(form);
    });
  }

  /**
   * Share file with specific permissions
   */
  private async shareFile(fileId: string, role: string = 'reader', type: string = 'anyone'): Promise<void> {
    await window.gapi.client.drive.permissions.create({
      fileId: fileId,
      resource: {
        role: role,
        type: type
      }
    });
  }

  /**
   * Get file metadata including download links
   */
  async getFileMetadata(fileId: string): Promise<DriveFile> {
    const response = await window.gapi.client.drive.files.get({
      fileId: fileId,
      fields: 'id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink,createdTime,modifiedTime,parents'
    });

    return response.result as DriveFile;
  }

  /**
   * List files in a folder
   */
  async listFiles(folderId: string): Promise<DriveFile[]> {
    const response = await window.gapi.client.drive.files.list({
      q: `parents in '${folderId}' and trashed=false`,
      fields: 'files(id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink,createdTime,modifiedTime)',
      orderBy: 'createdTime desc'
    });

    return response.result.files || [];
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    await window.gapi.client.drive.files.delete({
      fileId: fileId
    });
  }

  /**
   * Open Google Picker for selecting existing files
   */
  async openPicker(folderId?: string): Promise<DriveFile[]> {
    if (!this.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    return new Promise((resolve, reject) => {
      const picker = new window.google.picker.PickerBuilder()
        .addView(
          folderId 
            ? new window.google.picker.DocsView().setParent(folderId)
            : window.google.picker.ViewId.DOCS
        )
        .setOAuthToken(this.accessToken)
        .setDeveloperKey(import.meta.env.VITE_GOOGLE_API_KEY)
        .setCallback(async (data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            try {
              const files: DriveFile[] = [];
              for (const doc of data.docs) {
                const file = await this.getFileMetadata(doc.id);
                files.push(file);
              }
              resolve(files);
            } catch (error) {
              reject(error);
            }
          } else if (data.action === window.google.picker.Action.CANCEL) {
            resolve([]);
          }
        })
        .build();

      picker.setVisible(true);
    });
  }

  /**
   * Get file preview URL for common file types
   */
  getPreviewUrl(file: DriveFile): string {
    if (file.mimeType.startsWith('image/')) {
      return file.webViewLink;
    }
    
    if (file.mimeType === 'application/pdf') {
      return `https://drive.google.com/file/d/${file.id}/preview`;
    }

    return file.webViewLink;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const googleDriveService = new GoogleDriveService();