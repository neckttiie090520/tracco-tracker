import { Database } from './database'

// Base types from database
type Workshop = Database['public']['Tables']['workshops']['Row']
type WorkshopInsert = Database['public']['Tables']['workshops']['Insert']
type User = Database['public']['Tables']['users']['Row']
type Task = Database['public']['Tables']['tasks']['Row']
type TaskInsert = Database['public']['Tables']['tasks']['Insert']

// ===== BATCH OPERATION CORE TYPES =====

export type BatchOperationType = 'bulk_create_workshops' | 'mass_email_participants' | 'batch_update_workshops' | 'bulk_cancel_reschedule' | 'export_participant_data' | 'import_workshop_data'

export type BatchOperationStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'partially_completed'

export interface BatchOperation {
  id: string
  type: BatchOperationType
  status: BatchOperationStatus
  title: string
  description?: string
  progress: number // 0-100
  totalItems: number
  processedItems: number
  successItems: number
  failedItems: number
  errors: BatchOperationError[]
  startedAt?: Date
  completedAt?: Date
  estimatedDuration?: number // in seconds
  canCancel: boolean
  metadata?: Record<string, any>
}

export interface BatchOperationError {
  id: string
  message: string
  details?: string
  itemId?: string
  itemData?: any
  timestamp: Date
  severity: 'error' | 'warning'
  retryable: boolean
}

export interface BatchOperationResult<T = any> {
  success: boolean
  operation: BatchOperation
  data?: T
  summary: {
    total: number
    successful: number
    failed: number
    warnings: number
  }
}

// ===== WORKSHOP TEMPLATE SYSTEM =====

export interface WorkshopTemplate {
  id: string
  name: string
  description?: string
  category?: string
  isDefault?: boolean
  workshopData?: Partial<WorkshopInsert>
  taskTemplates?: TaskTemplate[]
  createdAt?: Date
  updatedAt?: Date
  // Additional fields used by the component
  title?: string
  duration?: number
  maxParticipants?: number
  defaultTasks?: TaskTemplate[]
}

export interface TaskTemplate {
  id: string
  title: string
  description?: string
  dueDate?: string // relative format like "+7 days" or "+2 weeks"
  orderIndex: number
  dueOffsetDays?: number
}

export interface WorkshopTemplateCategory {
  id: string
  name: string
  description?: string
  templates: WorkshopTemplate[]
}

export interface BulkCreateWorkshopsRequest {
  templateId: string
  workshops: Array<{
    title?: string
    instructor?: string
    startTime?: string
    endTime?: string
    maxParticipants?: number
    customFields?: Record<string, any>
  }>
  createTasks: boolean
  notifyInstructors: boolean
}

// Interface for the component's bulk create parameters
export interface BulkCreateWorkshopsParams {
  operationType: BatchOperationType
  templates: WorkshopTemplate[]
  instructorId: string
  defaultValues: {
    start_time: string
    end_time: string
    is_active: boolean
  }
  notifyInstructors: boolean
  createTasks: boolean
  taskTemplates?: TaskTemplate[]
}

// ===== PROGRESS TRACKING SYSTEM =====

export interface BatchOperationProgress {
  operationId: string
  phase: BatchOperationPhase
  currentStep: string
  stepsCompleted: number
  totalSteps: number
  itemsProcessed: number
  totalItems: number
  percentage: number
  estimatedTimeRemaining?: number
  throughputPerSecond?: number
  lastUpdated: Date
}

export type BatchOperationPhase = 'initializing' | 'validating' | 'processing' | 'finalizing' | 'completed' | 'error'

// ===== UI STATE MANAGEMENT =====

export interface BatchOperationsState {
  activeOperations: BatchOperation[]
  completedOperations: BatchOperation[]
  currentOperation?: BatchOperation
  isModalOpen: boolean
  modalType?: BatchOperationType
  templates: WorkshopTemplate[]
}

export interface BatchOperationSummary {
  totalOperations: number
  activeOperations: number
  completedOperations: number
  failedOperations: number
  totalItemsProcessed: number
  avgProcessingTime?: number
  lastOperationAt?: Date
}

// ===== EXPORTED CONSTANTS =====

export const BATCH_OPERATION_LIMITS = {
  MAX_ITEMS_PER_OPERATION: 1000,
  MAX_CONCURRENT_OPERATIONS: 3,
  MAX_EMAIL_RECIPIENTS: 500,
  MAX_FILE_SIZE_MB: 50,
  PROGRESS_UPDATE_INTERVAL: 1000, // ms
} as const