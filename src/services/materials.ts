import { supabase } from './supabase';
import { supabaseAdmin } from './supabaseAdmin';
import type { 
  WorkshopMaterial, 
  CreateMaterialRequest, 
  UpdateMaterialRequest,
  SessionMaterial,
  CreateSessionMaterialRequest,
  UpdateSessionMaterialRequest
} from '../types/materials';
import { detectMaterialType, convertToEmbedUrl, canEmbed, getDefaultDimensions } from '../utils/materialUtils';
import { fetchUrlMetadata } from './materialMetadata';

export class MaterialService {
  /**
   * Get all materials for a workshop
   */
  static async getWorkshopMaterials(workshopId: string): Promise<WorkshopMaterial[]> {
    const { data, error } = await supabase
      .from('workshop_materials')
      .select('*')
      .eq('workshop_id', workshopId)
      .eq('is_active', true)
      .order('order_index');

    if (error) {
      console.error('Error fetching workshop materials:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Replace all materials for a workshop with the provided list (admin)
   * This is used by edit flows to ensure ordering and adds/removes are persisted.
   */
  static async replaceWorkshopMaterials(
    workshopId: string,
    items: Array<Partial<WorkshopMaterial> & { url: string; display_mode: any; title?: string; dimensions?: any }>
  ): Promise<void> {
    await supabaseAdmin.client
      .from('workshop_materials')
      .delete()
      .eq('workshop_id', workshopId)

    for (const item of items) {
      await this.createMaterial({
        workshop_id: workshopId,
        url: item.url,
        display_mode: item.display_mode,
        title: item.title,
        dimensions: item.dimensions
      } as CreateMaterialRequest)
    }
  }

  /**
   * Create a new material
   */
  static async createMaterial(request: CreateMaterialRequest): Promise<WorkshopMaterial> {
    try {
      // Detect material type and generate embed URL
      const materialType = detectMaterialType(request.url);
      const embedUrl = canEmbed(materialType) ? convertToEmbedUrl(request.url, materialType) : undefined;
      
      // Get metadata
      const metadata = await fetchUrlMetadata(request.url);
      
      // Use default dimensions if not provided
      const dimensions = request.dimensions || getDefaultDimensions(materialType);
      
      // Get next order index
      const { data: existingMaterials } = await supabase
        .from('workshop_materials')
        .select('order_index')
        .eq('workshop_id', request.workshop_id)
        .order('order_index', { ascending: false })
        .limit(1);
      
      const nextIndex = existingMaterials && existingMaterials.length > 0 
        ? existingMaterials[0].order_index + 1 
        : 0;

      const materialData = {
        workshop_id: request.workshop_id,
        title: request.title || metadata.title,
        type: materialType,
        url: request.url,
        embed_url: embedUrl,
        display_mode: request.display_mode,
        dimensions,
        metadata: {
          title: metadata.title,
          favicon: metadata.favicon,
          thumbnail: metadata.thumbnail,
          description: metadata.description
        },
        order_index: nextIndex,
        is_active: true
      };

      // Use admin client for creating materials (bypasses RLS)
      const { data, error } = await supabaseAdmin.adminOperations.createMaterial(materialData);

      if (error) {
        console.error('Error creating material:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createMaterial:', error);
      throw error;
    }
  }

  /**
   * Replace all materials for a session with the provided list (admin)
   */
  static async replaceSessionMaterials(
    sessionId: string,
    items: Array<Partial<SessionMaterial> & { url: string; display_mode: any; title?: string; dimensions?: any }>
  ): Promise<void> {
    try {
      // First delete existing materials
      const { error: deleteError } = await supabaseAdmin.client
        .from('session_materials')
        .delete()
        .eq('session_id', sessionId)
      
      if (deleteError) {
        console.error('Error deleting existing session materials:', deleteError)
        // Continue anyway to try to insert new materials
      }

      // Then create new materials
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        try {
          await this.createSessionMaterial({
            session_id: sessionId,
            url: item.url,
            display_mode: item.display_mode || 'title',
            title: item.title || '',
            dimensions: item.dimensions
          } as CreateSessionMaterialRequest)
        } catch (createError) {
          console.error(`Error creating session material ${i + 1}:`, createError)
          // Continue with other materials even if one fails
        }
      }
    } catch (error) {
      console.error('Error in replaceSessionMaterials:', error)
      throw error
    }
  }

  /**
   * Update a material
   */
  static async updateMaterial(materialId: string, updates: UpdateMaterialRequest): Promise<WorkshopMaterial> {
    try {
      const data = await supabaseAdmin.adminOperations.updateMaterial(materialId, updates);
      return data;
    } catch (error) {
      console.error('Error updating material:', error);
      throw error;
    }
  }

  /**
   * Delete a material (soft delete)
   */
  static async deleteMaterial(materialId: string): Promise<void> {
    try {
      await supabaseAdmin.adminOperations.deleteMaterial(materialId);
    } catch (error) {
      console.error('Error deleting material:', error);
      throw error;
    }
  }

  /**
   * Reorder materials
   */
  static async reorderMaterials(_workshopId: string, materialIds: string[]): Promise<void> {
    try {
      // Update order_index for each material
      const updates = materialIds.map((materialId, index) => ({
        id: materialId,
        order_index: index
      }));

      for (const update of updates) {
        await supabaseAdmin.adminOperations.updateMaterial(update.id, {
          order_index: update.order_index
        });
      }
    } catch (error) {
      console.error('Error reordering materials:', error);
      throw error;
    }
  }

  // ==================== SESSION MATERIALS ====================

  /**
   * Get all materials for a session
   */
  static async getSessionMaterials(sessionId: string): Promise<SessionMaterial[]> {
    const { data, error } = await supabase
      .from('session_materials')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .order('order_index');

    if (error) {
      console.error('Error fetching session materials:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Create a new session material
   */
  static async createSessionMaterial(request: CreateSessionMaterialRequest): Promise<SessionMaterial> {
    try {
      // Detect material type and generate embed URL
      const materialType = detectMaterialType(request.url);
      const embedUrl = canEmbed(materialType) ? convertToEmbedUrl(request.url, materialType) : undefined;
      
      // Get metadata
      const metadata = await fetchUrlMetadata(request.url);
      
      // Use default dimensions if not provided
      const dimensions = request.dimensions || getDefaultDimensions(materialType);
      
      // Get next order index
      const { data: existingMaterials } = await supabase
        .from('session_materials')
        .select('order_index')
        .eq('session_id', request.session_id)
        .order('order_index', { ascending: false })
        .limit(1);
      
      const nextIndex = existingMaterials && existingMaterials.length > 0 
        ? existingMaterials[0].order_index + 1 
        : 0;

      const materialData = {
        session_id: request.session_id,
        title: request.title || metadata.title,
        type: materialType,
        url: request.url,
        embed_url: embedUrl,
        display_mode: request.display_mode,
        dimensions,
        metadata: {
          title: metadata.title,
          favicon: metadata.favicon,
          thumbnail: metadata.thumbnail,
          description: metadata.description
        },
        order_index: nextIndex,
        is_active: true
      };

      // Use admin client for creating session materials (bypasses RLS)
      const data = await supabaseAdmin.adminOperations.createSessionMaterial(materialData);
      return data;
    } catch (error) {
      console.error('Error in createSessionMaterial:', error);
      throw error;
    }
  }

  /**
   * Update a session material
   */
  static async updateSessionMaterial(materialId: string, updates: UpdateSessionMaterialRequest): Promise<SessionMaterial> {
    try {
      const updateData: any = { ...updates };

      // If URL is being updated, regenerate metadata
      if (updates.url) {
        const materialType = detectMaterialType(updates.url);
        const embedUrl = canEmbed(materialType) ? convertToEmbedUrl(updates.url, materialType) : undefined;
        const metadata = await fetchUrlMetadata(updates.url);
        
        updateData.type = materialType;
        updateData.embed_url = embedUrl;
        updateData.metadata = {
          title: metadata.title,
          favicon: metadata.favicon,
          thumbnail: metadata.thumbnail,
          description: metadata.description
        };
      }

      const data = await supabaseAdmin.adminOperations.updateSessionMaterial(materialId, updateData);
      return data;
    } catch (error) {
      console.error('Error in updateSessionMaterial:', error);
      throw error;
    }
  }

  /**
   * Delete a session material (soft delete)
   */
  static async deleteSessionMaterial(materialId: string): Promise<void> {
    try {
      await supabaseAdmin.adminOperations.deleteSessionMaterial(materialId);
    } catch (error) {
      console.error('Error in deleteSessionMaterial:', error);
      throw error;
    }
  }

  /**
   * Reorder session materials
   */
  static async reorderSessionMaterials(_sessionId: string, materialIds: string[]): Promise<void> {
    try {
      // Update order_index for each material
      const updates = materialIds.map((materialId, index) => ({
        id: materialId,
        order_index: index
      }));

      for (const update of updates) {
        await supabaseAdmin.adminOperations.updateSessionMaterial(update.id, {
          order_index: update.order_index
        });
      }
    } catch (error) {
      console.error('Error reordering session materials:', error);
      throw error;
    }
  }
}
