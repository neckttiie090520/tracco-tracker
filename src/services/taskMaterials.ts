import { supabaseAdmin } from './supabaseAdmin'
import type { TaskMaterial, CreateTaskMaterialRequest } from '../types/materials'
import { detectMaterialType, convertToEmbedUrl, canEmbed, getDefaultDimensions, getFaviconUrl } from '../utils/materialUtils'

export const TaskMaterialService = {
  /**
   * Create multiple materials for a task
   */
  async createMaterials(taskId: string, materials: CreateTaskMaterialRequest[]): Promise<TaskMaterial[]> {
    console.log('📚 TaskMaterialService.createMaterials called with:', { taskId, materialsCount: materials.length })
    
    if (!materials || materials.length === 0) {
      console.log('📭 No materials to create')
      return []
    }

    const createdMaterials: TaskMaterial[] = []

    for (let i = 0; i < materials.length; i++) {
      const material = materials[i]
      try {
        const materialType = detectMaterialType(material.url)
        
        const materialData = {
          task_id: taskId,
          title: material.title || `Task Material ${i + 1}`,
          type: materialType,
          url: material.url,
          embed_url: canEmbed(materialType) ? convertToEmbedUrl(material.url, materialType) : null,
          display_mode: material.display_mode || 'title',
          dimensions: material.dimensions || getDefaultDimensions(materialType),
          metadata: {
            title: material.title,
            favicon: getFaviconUrl(material.url)
          },
          order_index: i,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        console.log(`📋 Creating task material ${i + 1}:`, materialData)

        const { data, error } = await supabaseAdmin.client
          .from('task_materials')
          .insert(materialData)
          .select('*')
          .single()

        if (error) {
          console.error(`❌ Error creating task material ${i + 1}:`, error)
          if (error.message?.includes('does not exist')) {
            console.error('⚠️ task_materials table does not exist. Please run the migration first.')
            console.error('📋 You can create the table manually in Supabase Dashboard with the SQL from supabase/task-materials-schema.sql')
          }
          throw error
        }

        console.log(`✅ Task material ${i + 1} created successfully:`, data)
        createdMaterials.push(data)
      } catch (error) {
        console.error(`❌ Error creating task material ${i + 1}:`, error)
        throw error
      }
    }

    console.log(`✅ All ${createdMaterials.length} task materials created successfully`)
    return createdMaterials
  },

  /**
   * Update materials for a task (delete existing and create new ones)
   */
  async updateMaterials(taskId: string, materials: CreateTaskMaterialRequest[]): Promise<TaskMaterial[]> {
    console.log('📝 TaskMaterialService.updateMaterials called with:', { taskId, materialsCount: materials.length })

    // First, delete existing materials for this task
    const { error: deleteError } = await supabaseAdmin.client
      .from('task_materials')
      .delete()
      .eq('task_id', taskId)

    if (deleteError) {
      console.error('❌ Error deleting existing task materials:', deleteError)
      throw deleteError
    }

    console.log('🗑️ Existing task materials deleted')

    // Then create new materials
    if (materials && materials.length > 0) {
      return await this.createMaterials(taskId, materials)
    }

    console.log('📭 No new materials to create')
    return []
  },

  /**
   * Get materials for a task
   */
  async getMaterialsByTask(taskId: string): Promise<TaskMaterial[]> {
    console.log('📖 TaskMaterialService.getMaterialsByTask called with taskId:', taskId)

    const { data, error } = await supabaseAdmin.client
      .from('task_materials')
      .select('*')
      .eq('task_id', taskId)
      .eq('is_active', true)
      .order('order_index')

    if (error) {
      console.error('❌ Error fetching task materials:', error)
      throw error
    }

    console.log(`📚 Found ${data?.length || 0} materials for task ${taskId}`)
    return data || []
  },

  /**
   * Get materials for multiple tasks in one query (batch loading)
   */
  async getMaterialsByTasks(taskIds: string[]): Promise<Record<string, TaskMaterial[]>> {
    console.log('📖 TaskMaterialService.getMaterialsByTasks called with taskIds:', taskIds)

    if (!taskIds || taskIds.length === 0) {
      return {}
    }

    const { data, error } = await supabaseAdmin.client
      .from('task_materials')
      .select('*')
      .in('task_id', taskIds)
      .eq('is_active', true)
      .order('order_index')

    if (error) {
      console.error('❌ Error fetching task materials:', error)
      throw error
    }

    // Group materials by task_id
    const materialsByTask: Record<string, TaskMaterial[]> = {}
    taskIds.forEach(taskId => {
      materialsByTask[taskId] = []
    })

    data?.forEach(material => {
      if (!materialsByTask[material.task_id]) {
        materialsByTask[material.task_id] = []
      }
      materialsByTask[material.task_id].push(material)
    })

    console.log(`📚 Found materials for ${Object.keys(materialsByTask).length} tasks`)
    return materialsByTask
  },

  /**
   * Delete a specific material
   */
  async deleteMaterial(materialId: string): Promise<void> {
    console.log('🗑️ TaskMaterialService.deleteMaterial called with materialId:', materialId)

    const { error } = await supabaseAdmin.client
      .from('task_materials')
      .update({ is_active: false })
      .eq('id', materialId)

    if (error) {
      console.error('❌ Error deleting task material:', error)
      throw error
    }

    console.log('✅ Task material deleted successfully')
  }
}