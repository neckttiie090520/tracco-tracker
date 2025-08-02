import { supabase } from './supabase'
import { workshopService } from './workshops'
import { adminService } from './admin'
import { emailService } from './emailService'
import { notificationManager } from './notificationManager'
import { Database } from '../types/database'
import {
  BatchOperation,
  BatchOperationType,
  BatchOperationError,
  BatchOperationResult,
  BatchOperationCallback,
  BatchOperationProgress,
  BatchOperationPhase,
  WorkshopTemplate,
  TaskTemplate,
  BulkCreateWorkshopsRequest,
  MassEmailRequest,
  EmailRecipient,
  EmailRecipientFilter,
  BatchUpdateWorkshopsRequest,
  BulkCancelRescheduleRequest,
  ExportParticipantDataRequest,
  ExportDataResult,
  ImportWorkshopDataRequest,
  ImportValidationResult,
  BATCH_OPERATION_LIMITS,
  DEFAULT_EXPORT_FIELDS,
  DEFAULT_IMPORT_MAPPINGS,
  BatchOperationQueue,
  QueuedOperation
} from '../types/BatchOperationsTypes'

type Workshop = Database['public']['Tables']['workshops']['Row']
type WorkshopInsert = Database['public']['Tables']['workshops']['Insert']
type User = Database['public']['Tables']['users']['Row']
type TaskInsert = Database['public']['Tables']['tasks']['Insert']

class BatchOperationsService {
  private activeOperations = new Map<string, BatchOperation>()
  private operationQueues = new Map<string, BatchOperationQueue>()
  private abortControllers = new Map<string, AbortController>()
  private progressCallbacks = new Map<string, BatchOperationCallback[]>()

  // ===== CORE OPERATION MANAGEMENT =====

  private generateOperationId(): string {
    return `batch_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private createOperation(
    type: BatchOperationType,
    title: string,
    totalItems: number,
    description?: string
  ): BatchOperation {
    return {
      id: this.generateOperationId(),
      type,
      status: 'pending',
      title,
      description,
      progress: 0,
      totalItems,
      processedItems: 0,
      successItems: 0,
      failedItems: 0,
      errors: [],
      canCancel: true,
      metadata: {}
    }
  }

  private updateOperationProgress(
    operationId: string,
    progress: Partial<BatchOperation>
  ): void {
    const operation = this.activeOperations.get(operationId)
    if (!operation) return

    const updatedOperation = {
      ...operation,
      ...progress,
      progress: Math.min(100, Math.max(0, progress.progress || operation.progress))
    }

    this.activeOperations.set(operationId, updatedOperation)

    // Notify progress callbacks
    const callbacks = this.progressCallbacks.get(operationId) || []
    callbacks.forEach(callback => {
      try {
        callback(updatedOperation.progress, updatedOperation.status, updatedOperation)
      } catch (error) {
        console.error('Error in progress callback:', error)
      }
    })
  }

  private addOperationError(
    operationId: string,
    message: string,
    details?: string,
    itemId?: string,
    severity: 'error' | 'warning' = 'error'
  ): void {
    const operation = this.activeOperations.get(operationId)
    if (!operation) return

    const error: BatchOperationError = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      message,
      details,
      itemId,
      timestamp: new Date(),
      severity,
      retryable: severity === 'warning'
    }

    operation.errors.push(error)
    this.activeOperations.set(operationId, operation)
  }

  // ===== TEMPLATE MANAGEMENT =====

  async getWorkshopTemplates(): Promise<WorkshopTemplate[]> {
    try {
      // For now, return default templates. In production, these would be stored in database
      return [
        {
          id: 'template_1',
          name: 'Programming Workshop',
          description: 'Standard programming workshop template',
          category: 'Programming',
          isDefault: true,
          workshopData: {
            title: '',
            description: 'A hands-on programming workshop',
            max_participants: 30
          },
          taskTemplates: [
            {
              id: 'task_1',
              title: 'Pre-workshop Setup',
              description: 'Install required software and dependencies',
              dueDate: '-3 days',
              orderIndex: 1
            },
            {
              id: 'task_2',
              title: 'Workshop Completion',
              description: 'Submit your completed project',
              dueDate: '+1 day',
              orderIndex: 2
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'template_2',
          name: 'Research Workshop',
          description: 'Academic research workshop template',
          category: 'Research',
          isDefault: true,
          workshopData: {
            title: '',
            description: 'Academic research methodology workshop',
            max_participants: 25
          },
          taskTemplates: [
            {
              id: 'task_1',
              title: 'Literature Review',
              description: 'Prepare initial literature review',
              dueDate: '-7 days',
              orderIndex: 1
            },
            {
              id: 'task_2',
              title: 'Research Proposal',
              description: 'Submit research proposal draft',
              dueDate: '+5 days',
              orderIndex: 2
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    } catch (error) {
      console.error('Error fetching workshop templates:', error)
      throw error
    }
  }

  async createWorkshopTemplate(template: Omit<WorkshopTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkshopTemplate> {
    // In production, this would save to database
    const newTemplate: WorkshopTemplate = {
      ...template,
      id: `template_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    return newTemplate
  }

  // ===== 1. BULK CREATE WORKSHOPS =====

  async bulkCreateWorkshops(
    request: BulkCreateWorkshopsRequest,
    onProgress?: BatchOperationCallback
  ): Promise<BatchOperationResult<Workshop[]>> {
    const operation = this.createOperation(
      'bulk_create_workshops',
      'Bulk Create Workshops',
      request.workshops.length,
      `Creating ${request.workshops.length} workshops from template`
    )

    if (onProgress) {
      this.subscribeToProgress(operation.id, onProgress)
    }

    this.activeOperations.set(operation.id, operation)
    operation.startedAt = new Date()

    try {
      // Get template
      const templates = await this.getWorkshopTemplates()
      const template = templates.find(t => t.id === request.templateId)
      if (!template) {
        throw new Error('Template not found')
      }

      this.updateOperationProgress(operation.id, {
        status: 'in_progress',
        progress: 10
      })

      const createdWorkshops: Workshop[] = []
      const batchSize = 10
      const totalBatches = Math.ceil(request.workshops.length / batchSize)

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * batchSize
        const endIndex = Math.min(startIndex + batchSize, request.workshops.length)
        const workshopBatch = request.workshops.slice(startIndex, endIndex)

        for (let i = 0; i < workshopBatch.length; i++) {
          const workshopData = workshopBatch[i]
          const itemIndex = startIndex + i

          try {
            // Merge template data with custom data
            const workshopToCreate: WorkshopInsert = {
              ...template.workshopData,
              ...workshopData,
              title: workshopData.title || template.workshopData.title || `Workshop ${itemIndex + 1}`,
              instructor: workshopData.instructor || template.workshopData.instructor || '',
            }

            // Create workshop
            const createdWorkshop = await workshopService.createWorkshop(workshopToCreate)
            createdWorkshops.push(createdWorkshop)

            // Create tasks if requested
            if (request.createTasks && template.taskTemplates.length > 0) {
              await this.createTasksFromTemplate(createdWorkshop.id, template.taskTemplates, workshopData.startTime)
            }

            this.updateOperationProgress(operation.id, {
              processedItems: itemIndex + 1,
              successItems: operation.successItems + 1,
              progress: Math.round((itemIndex + 1) / request.workshops.length * 90) + 10
            })

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            this.addOperationError(
              operation.id,
              `Failed to create workshop ${itemIndex + 1}: ${errorMessage}`,
              undefined,
              `workshop_${itemIndex}`
            )

            this.updateOperationProgress(operation.id, {
              processedItems: itemIndex + 1,
              failedItems: operation.failedItems + 1
            })
          }
        }
      }

      // Notify instructors if requested
      if (request.notifyInstructors && createdWorkshops.length > 0) {
        await this.notifyInstructorsOfNewWorkshops(createdWorkshops)
      }

      this.updateOperationProgress(operation.id, {
        status: 'completed',
        progress: 100,
        completedAt: new Date()
      })

      return {
        success: true,
        operation,
        data: createdWorkshops,
        summary: {
          total: request.workshops.length,
          successful: operation.successItems,
          failed: operation.failedItems,
          warnings: operation.errors.filter(e => e.severity === 'warning').length
        }
      }

    } catch (error) {
      this.updateOperationProgress(operation.id, {
        status: 'failed',
        completedAt: new Date()
      })

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.addOperationError(operation.id, `Bulk create operation failed: ${errorMessage}`)

      return {
        success: false,
        operation,
        summary: {
          total: request.workshops.length,
          successful: operation.successItems,
          failed: operation.failedItems,
          warnings: 0
        }
      }
    }
  }

  private async createTasksFromTemplate(
    workshopId: string,
    taskTemplates: TaskTemplate[],
    workshopStartTime?: string
  ): Promise<void> {
    for (const taskTemplate of taskTemplates) {
      try {
        const dueDate = this.calculateDueDate(workshopStartTime, taskTemplate.dueDate)
        
        const taskData: TaskInsert = {
          workshop_id: workshopId,
          title: taskTemplate.title,
          description: taskTemplate.description,
          due_date: dueDate,
          order_index: taskTemplate.orderIndex
        }

        await supabase.from('tasks').insert(taskData)
      } catch (error) {
        console.error('Error creating task from template:', error)
      }
    }
  }

  private calculateDueDate(baseDate?: string, relativeDueDate?: string): string | undefined {
    if (!relativeDueDate || !baseDate) return undefined

    const base = new Date(baseDate)
    const match = relativeDueDate.match(/([+-])(\d+)\s*(days?|weeks?|hours?)/)
    
    if (!match) return undefined

    const [, operator, amount, unit] = match
    const numAmount = parseInt(amount)
    const multiplier = operator === '+' ? 1 : -1

    switch (unit) {
      case 'day':
      case 'days':
        base.setDate(base.getDate() + (numAmount * multiplier))
        break
      case 'week':
      case 'weeks':
        base.setDate(base.getDate() + (numAmount * 7 * multiplier))
        break
      case 'hour':
      case 'hours':
        base.setHours(base.getHours() + (numAmount * multiplier))
        break
    }

    return base.toISOString()
  }

  private async notifyInstructorsOfNewWorkshops(workshops: Workshop[]): Promise<void> {
    // Group workshops by instructor
    const instructorWorkshops = new Map<string, Workshop[]>()
    
    for (const workshop of workshops) {
      const instructorId = workshop.instructor
      if (!instructorWorkshops.has(instructorId)) {
        instructorWorkshops.set(instructorId, [])
      }
      instructorWorkshops.get(instructorId)!.push(workshop)
    }

    // Send notifications to each instructor
    for (const [instructorId, workshopList] of instructorWorkshops) {
      try {
        await notificationManager.sendInstructorNotification(instructorId, workshopList)
      } catch (error) {
        console.error('Failed to notify instructor:', instructorId, error)
      }
    }
  }

  // ===== 2. MASS EMAIL PARTICIPANTS =====

  async massEmailParticipants(
    request: MassEmailRequest,
    onProgress?: BatchOperationCallback
  ): Promise<BatchOperationResult<{sent: number, failed: number}>> {
    const operation = this.createOperation(
      'mass_email_participants',
      'Mass Email Participants',
      0, // Will be updated after recipient resolution
      'Sending emails to participants'
    )

    if (onProgress) {
      this.subscribeToProgress(operation.id, onProgress)
    }

    this.activeOperations.set(operation.id, operation)
    operation.startedAt = new Date()

    try {
      // Resolve recipients
      this.updateOperationProgress(operation.id, {
        status: 'in_progress',
        progress: 10
      })

      const recipients = await this.resolveEmailRecipients(request.recipients)
      
      if (recipients.length > BATCH_OPERATION_LIMITS.MAX_EMAIL_RECIPIENTS) {
        throw new Error(`Too many recipients. Maximum allowed: ${BATCH_OPERATION_LIMITS.MAX_EMAIL_RECIPIENTS}`)
      }

      this.updateOperationProgress(operation.id, {
        totalItems: recipients.length,
        progress: 20
      })

      let sent = 0
      let failed = 0

      // Send emails in batches
      const batchSize = 50
      const totalBatches = Math.ceil(recipients.length / batchSize)

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * batchSize
        const endIndex = Math.min(startIndex + batchSize, recipients.length)
        const recipientBatch = recipients.slice(startIndex, endIndex)

        try {
          if (request.testMode) {
            // In test mode, just simulate sending
            console.log(`Test mode: Would send email to ${recipientBatch.length} recipients`)
            sent += recipientBatch.length
          } else {
            // Send actual emails
            const emailRecipients = recipientBatch.map(r => ({
              email: r.email,
              name: r.name
            }))

            const template = {
              subject: request.subject,
              html: request.content,
              text: request.contentType === 'text' ? request.content : this.htmlToText(request.content)
            }

            const success = await emailService.sendEmail(emailRecipients, template)
            if (success) {
              sent += recipientBatch.length
            } else {
              failed += recipientBatch.length
              this.addOperationError(
                operation.id,
                `Failed to send email batch ${batchIndex + 1}`,
                `Batch size: ${recipientBatch.length}`
              )
            }
          }

          this.updateOperationProgress(operation.id, {
            processedItems: endIndex,
            successItems: sent,
            failedItems: failed,
            progress: 20 + Math.round((endIndex / recipients.length) * 70)
          })

        } catch (error) {
          failed += recipientBatch.length
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          this.addOperationError(
            operation.id,
            `Failed to send email batch ${batchIndex + 1}: ${errorMessage}`,
            `Recipients: ${recipientBatch.map(r => r.email).join(', ')}`
          )
        }
      }

      this.updateOperationProgress(operation.id, {
        status: 'completed',
        progress: 100,
        completedAt: new Date()
      })

      return {
        success: sent > 0,
        operation,
        data: { sent, failed },
        summary: {
          total: recipients.length,
          successful: sent,
          failed: failed,
          warnings: 0
        }
      }

    } catch (error) {
      this.updateOperationProgress(operation.id, {
        status: 'failed',
        completedAt: new Date()
      })

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.addOperationError(operation.id, `Mass email operation failed: ${errorMessage}`)

      return {
        success: false,
        operation,
        data: { sent: 0, failed: 0 },
        summary: {
          total: 0,
          successful: 0,
          failed: 0,
          warnings: 0
        }
      }
    }
  }

  private async resolveEmailRecipients(filter: EmailRecipientFilter): Promise<EmailRecipient[]> {
    const recipients: EmailRecipient[] = []

    switch (filter.type) {
      case 'all':
        const allParticipants = await adminService.getAllParticipants()
        recipients.push(...allParticipants.map(p => ({
          id: p.user.id,
          email: p.user.email,
          name: p.user.name,
          workshopTitle: p.workshop.title
        })))
        break

      case 'workshops':
        if (filter.workshopIds) {
          for (const workshopId of filter.workshopIds) {
            const participants = await adminService.getWorkshopParticipants(workshopId)
            recipients.push(...participants.map(p => ({
              id: p.user.id,
              email: p.user.email,
              name: p.user.name,
              workshopTitle: p.workshop.title
            })))
          }
        }
        break

      case 'users':
        if (filter.userIds) {
          const { data: users } = await supabase
            .from('users')
            .select('*')
            .in('id', filter.userIds)

          if (users) {
            recipients.push(...users.map(u => ({
              id: u.id,
              email: u.email,
              name: u.name
            })))
          }
        }
        break

      case 'custom':
        // Apply custom criteria filtering
        if (filter.criteria) {
          const filteredParticipants = await this.applyEmailFilterCriteria(filter.criteria)
          recipients.push(...filteredParticipants)
        }
        break
    }

    // Remove duplicates based on email
    const uniqueRecipients = recipients.filter((recipient, index, self) =>
      self.findIndex(r => r.email === recipient.email) === index
    )

    return uniqueRecipients
  }

  private async applyEmailFilterCriteria(criteria: any): Promise<EmailRecipient[]> {
    // Implementation would depend on specific criteria
    // For now, return empty array
    return []
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .trim()
  }

  // ===== 3. BATCH UPDATE WORKSHOPS =====

  async batchUpdateWorkshops(
    request: BatchUpdateWorkshopsRequest,
    onProgress?: BatchOperationCallback
  ): Promise<BatchOperationResult<Workshop[]>> {
    const operation = this.createOperation(
      'batch_update_workshops',
      'Batch Update Workshops',
      request.workshopIds.length,
      `Updating ${request.workshopIds.length} workshops`
    )

    if (onProgress) {
      this.subscribeToProgress(operation.id, onProgress)
    }

    this.activeOperations.set(operation.id, operation)
    operation.startedAt = new Date()

    try {
      this.updateOperationProgress(operation.id, {
        status: 'in_progress',
        progress: 10
      })

      const updatedWorkshops: Workshop[] = []

      for (let i = 0; i < request.workshopIds.length; i++) {
        const workshopId = request.workshopIds[i]

        try {
          // Apply conditions if specified
          if (request.conditions && request.conditions.length > 0) {
            const workshop = await workshopService.getWorkshopById(workshopId)
            const conditionsMet = this.evaluateBatchUpdateConditions(workshop, request.conditions)
            
            if (!conditionsMet) {
              this.addOperationError(
                operation.id,
                `Conditions not met for workshop: ${workshop.title}`,
                undefined,
                workshopId,
                'warning'
              )
              continue
            }
          }

          // Perform update
          const updatedWorkshop = await workshopService.updateWorkshop(workshopId, request.updates)
          updatedWorkshops.push(updatedWorkshop)

          this.updateOperationProgress(operation.id, {
            processedItems: i + 1,
            successItems: operation.successItems + 1,
            progress: 10 + Math.round((i + 1) / request.workshopIds.length * 80)
          })

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          this.addOperationError(
            operation.id,
            `Failed to update workshop ${workshopId}: ${errorMessage}`,
            undefined,
            workshopId
          )

          this.updateOperationProgress(operation.id, {
            processedItems: i + 1,
            failedItems: operation.failedItems + 1
          })
        }
      }

      // Send notifications if requested
      if (request.notifyParticipants || request.notifyInstructors) {
        await this.sendBatchUpdateNotifications(updatedWorkshops, request)
      }

      this.updateOperationProgress(operation.id, {
        status: 'completed',
        progress: 100,
        completedAt: new Date()
      })

      return {
        success: true,
        operation,
        data: updatedWorkshops,
        summary: {
          total: request.workshopIds.length,
          successful: operation.successItems,
          failed: operation.failedItems,
          warnings: operation.errors.filter(e => e.severity === 'warning').length
        }
      }

    } catch (error) {
      this.updateOperationProgress(operation.id, {
        status: 'failed',
        completedAt: new Date()
      })

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.addOperationError(operation.id, `Batch update operation failed: ${errorMessage}`)

      return {
        success: false,
        operation,
        summary: {
          total: request.workshopIds.length,
          successful: operation.successItems,
          failed: operation.failedItems,
          warnings: 0
        }
      }
    }
  }

  private evaluateBatchUpdateConditions(workshop: any, conditions: any[]): boolean {
    return conditions.every(condition => {
      const fieldValue = workshop[condition.field]
      
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value
        case 'not_equals':
          return fieldValue !== condition.value
        case 'greater_than':
          return fieldValue > condition.value
        case 'less_than':
          return fieldValue < condition.value
        case 'contains':
          return String(fieldValue).includes(String(condition.value))
        default:
          return true
      }
    })
  }

  private async sendBatchUpdateNotifications(workshops: Workshop[], request: BatchUpdateWorkshopsRequest): Promise<void> {
    for (const workshop of workshops) {
      try {
        if (request.notifyParticipants) {
          await notificationManager.sendWorkshopUpdate(workshop.id)
        }
        if (request.notifyInstructors) {
          await notificationManager.sendInstructorNotification(workshop.instructor, [workshop])
        }
      } catch (error) {
        console.error('Failed to send batch update notification:', error)
      }
    }
  }

  // ===== 4. BULK CANCEL/RESCHEDULE =====

  async bulkCancelReschedule(
    request: BulkCancelRescheduleRequest,
    onProgress?: BatchOperationCallback
  ): Promise<BatchOperationResult<Workshop[]>> {
    const operation = this.createOperation(
      'bulk_cancel_reschedule',
      `Bulk ${request.operation === 'cancel' ? 'Cancel' : 'Reschedule'} Workshops`,
      request.workshopIds.length,
      `${request.operation === 'cancel' ? 'Cancelling' : 'Rescheduling'} ${request.workshopIds.length} workshops`
    )

    if (onProgress) {
      this.subscribeToProgress(operation.id, onProgress)
    }

    this.activeOperations.set(operation.id, operation)
    operation.startedAt = new Date()

    try {
      this.updateOperationProgress(operation.id, {
        status: 'in_progress',
        progress: 10
      })

      const processedWorkshops: Workshop[] = []

      for (let i = 0; i < request.workshopIds.length; i++) {
        const workshopId = request.workshopIds[i]

        try {
          let processedWorkshop: Workshop

          if (request.operation === 'cancel') {
            processedWorkshop = await workshopService.cancelWorkshop(workshopId)
          } else {
            // Reschedule operation
            const updates: Partial<WorkshopInsert> = {}
            
            if (request.rescheduleData?.newStartTime) {
              updates.start_time = request.rescheduleData.newStartTime
            }
            if (request.rescheduleData?.newEndTime) {
              updates.end_time = request.rescheduleData.newEndTime
            }
            if (request.rescheduleData?.newInstructor) {
              updates.instructor = request.rescheduleData.newInstructor
            }

            processedWorkshop = await workshopService.updateWorkshop(workshopId, updates)
          }

          processedWorkshops.push(processedWorkshop)

          // Send notifications if requested
          if (request.notifyParticipants) {
            if (request.operation === 'cancel') {
              await notificationManager.sendWorkshopCancellation(workshopId)
            } else {
              await notificationManager.sendWorkshopUpdate(workshopId)
            }
          }

          this.updateOperationProgress(operation.id, {
            processedItems: i + 1,
            successItems: operation.successItems + 1,
            progress: 10 + Math.round((i + 1) / request.workshopIds.length * 80)
          })

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          this.addOperationError(
            operation.id,
            `Failed to ${request.operation} workshop ${workshopId}: ${errorMessage}`,
            undefined,
            workshopId
          )

          this.updateOperationProgress(operation.id, {
            processedItems: i + 1,
            failedItems: operation.failedItems + 1
          })
        }
      }

      this.updateOperationProgress(operation.id, {
        status: 'completed',
        progress: 100,
        completedAt: new Date()
      })

      return {
        success: true,
        operation,
        data: processedWorkshops,
        summary: {
          total: request.workshopIds.length,
          successful: operation.successItems,
          failed: operation.failedItems,
          warnings: 0
        }
      }

    } catch (error) {
      this.updateOperationProgress(operation.id, {
        status: 'failed',
        completedAt: new Date()
      })

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.addOperationError(operation.id, `Bulk ${request.operation} operation failed: ${errorMessage}`)

      return {
        success: false,
        operation,
        summary: {
          total: request.workshopIds.length,
          successful: operation.successItems,
          failed: operation.failedItems,
          warnings: 0
        }
      }
    }
  }

  // ===== 5. EXPORT PARTICIPANT DATA =====

  async exportParticipantData(
    request: ExportParticipantDataRequest,
    onProgress?: BatchOperationCallback
  ): Promise<BatchOperationResult<ExportDataResult>> {
    const operation = this.createOperation(
      'export_participant_data',
      'Export Participant Data',
      100, // Will be updated based on data size
      `Exporting participant data in ${request.format.toUpperCase()} format`
    )

    if (onProgress) {
      this.subscribeToProgress(operation.id, onProgress)
    }

    this.activeOperations.set(operation.id, operation)
    operation.startedAt = new Date()

    try {
      this.updateOperationProgress(operation.id, {
        status: 'in_progress',
        progress: 10
      })

      // Gather participant data based on scope
      const participantData = await this.gatherParticipantData(request)
      
      this.updateOperationProgress(operation.id, {
        totalItems: participantData.length,
        progress: 30
      })

      // Process and format data
      const formattedData = await this.formatExportData(participantData, request)
      
      this.updateOperationProgress(operation.id, {
        progress: 60
      })

      // Generate export file
      const exportResult = await this.generateExportFile(formattedData, request)
      
      this.updateOperationProgress(operation.id, {
        progress: 90
      })

      this.updateOperationProgress(operation.id, {
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
        successItems: participantData.length
      })

      return {
        success: true,
        operation,
        data: exportResult,
        summary: {
          total: participantData.length,
          successful: participantData.length,
          failed: 0,
          warnings: 0
        }
      }

    } catch (error) {
      this.updateOperationProgress(operation.id, {
        status: 'failed',
        completedAt: new Date()
      })

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.addOperationError(operation.id, `Export operation failed: ${errorMessage}`)

      return {
        success: false,
        operation,
        data: {
          filename: '',
          downloadUrl: '',
          format: request.format,
          size: 0,
          recordCount: 0,
          generatedAt: new Date()
        },
        summary: {
          total: 0,
          successful: 0,
          failed: 1,
          warnings: 0
        }
      }
    }
  }

  private async gatherParticipantData(request: ExportParticipantDataRequest): Promise<any[]> {
    switch (request.scope) {
      case 'all':
        return await adminService.getAllParticipants()
      
      case 'workshops':
        if (!request.workshopIds) return []
        
        const allParticipants = []
        for (const workshopId of request.workshopIds) {
          const participants = await adminService.getWorkshopParticipants(workshopId)
          allParticipants.push(...participants)
        }
        return allParticipants
      
      case 'dateRange':
        if (!request.dateRange) return []
        
        const { data } = await supabase
          .from('workshop_registrations')
          .select(`
            *,
            user:users(id, name, email, faculty, department),
            workshop:workshops(title)
          `)
          .gte('registered_at', request.dateRange.start.toISOString())
          .lte('registered_at', request.dateRange.end.toISOString())
        
        return data || []
      
      default:
        return []
    }
  }

  private async formatExportData(data: any[], request: ExportParticipantDataRequest): Promise<any[]> {
    return data.map(item => {
      const formatted: any = {}
      
      for (const field of request.fields) {
        let value = this.extractFieldValue(item, field.key)
        
        if (request.anonymize && ['email', 'name'].includes(field.key)) {
          value = this.anonymizeValue(value, field.key)
        }
        
        formatted[field.label] = value
      }
      
      return formatted
    })
  }

  private extractFieldValue(item: any, fieldKey: string): any {
    switch (fieldKey) {
      case 'name':
        return item.user?.name || ''
      case 'email':
        return item.user?.email || ''
      case 'faculty':
        return item.user?.faculty || ''
      case 'department':
        return item.user?.department || ''
      case 'workshop_title':
        return item.workshop?.title || ''
      case 'registration_date':
        return item.registered_at ? new Date(item.registered_at).toLocaleDateString() : ''
      default:
        return ''
    }
  }

  private anonymizeValue(value: string, fieldType: string): string {
    if (fieldType === 'email') {
      const [localPart, domain] = value.split('@')
      return `${localPart.substring(0, 3)}***@${domain}`
    }
    if (fieldType === 'name') {
      const parts = value.split(' ')
      return parts.map(part => part.charAt(0) + '*'.repeat(Math.max(0, part.length - 1))).join(' ')
    }
    return value
  }

  private async generateExportFile(data: any[], request: ExportParticipantDataRequest): Promise<ExportDataResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `participant-export-${timestamp}.${request.format}`
    
    let content: string
    let size: number
    
    switch (request.format) {
      case 'csv':
        content = this.generateCSV(data)
        break
      case 'excel':
        content = this.generateExcel(data)
        break
      case 'json':
        content = JSON.stringify(data, null, 2)
        break
      default:
        throw new Error(`Unsupported export format: ${request.format}`)
    }
    
    size = new Blob([content]).size
    
    // In a real implementation, you would upload this to a file storage service
    // For now, we'll create a data URL
    const blob = new Blob([content], { 
      type: request.format === 'csv' ? 'text/csv' : 'application/json' 
    })
    const downloadUrl = URL.createObjectURL(blob)
    
    return {
      filename,
      downloadUrl,
      format: request.format,
      size,
      recordCount: data.length,
      generatedAt: new Date()
    }
  }

  private generateCSV(data: any[]): string {
    if (data.length === 0) return ''
    
    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          return typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value
        }).join(',')
      )
    ]
    
    return csvRows.join('\n')
  }

  private generateExcel(data: any[]): string {
    // This is a simplified implementation
    // In production, you'd use a library like xlsx or exceljs
    return this.generateCSV(data)
  }

  // ===== 6. IMPORT WORKSHOP DATA =====

  async importWorkshopData(
    request: ImportWorkshopDataRequest,
    onProgress?: BatchOperationCallback
  ): Promise<BatchOperationResult<ImportValidationResult | Workshop[]>> {
    const operation = this.createOperation(
      'import_workshop_data',
      'Import Workshop Data',
      100, // Will be updated after file parsing
      `Importing workshops from ${request.file.name}`
    )

    if (onProgress) {
      this.subscribeToProgress(operation.id, onProgress)
    }

    this.activeOperations.set(operation.id, operation)
    operation.startedAt = new Date()

    try {
      this.updateOperationProgress(operation.id, {
        status: 'in_progress',
        progress: 10
      })

      // Parse file
      const parsedData = await this.parseImportFile(request.file, request.format)
      
      this.updateOperationProgress(operation.id, {
        totalItems: parsedData.length,
        progress: 30
      })

      // Validate data
      const validationResult = await this.validateImportData(parsedData, request)
      
      if (request.validateOnly) {
        this.updateOperationProgress(operation.id, {
          status: 'completed',
          progress: 100,
          completedAt: new Date()
        })

        return {
          success: validationResult.isValid,
          operation,
          data: validationResult,
          summary: {
            total: validationResult.totalRows,
            successful: validationResult.validRows,
            failed: validationResult.invalidRows,
            warnings: validationResult.warnings.length
          }
        }
      }

      // Import data if validation passed
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.length} errors found`)
      }

      const importedWorkshops = await this.processImportData(parsedData, request, operation.id)

      this.updateOperationProgress(operation.id, {
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
        successItems: importedWorkshops.length
      })

      return {
        success: true,
        operation,
        data: importedWorkshops,
        summary: {
          total: parsedData.length,
          successful: importedWorkshops.length,
          failed: operation.failedItems,
          warnings: 0
        }
      }

    } catch (error) {
      this.updateOperationProgress(operation.id, {
        status: 'failed',
        completedAt: new Date()
      })

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.addOperationError(operation.id, `Import operation failed: ${errorMessage}`)

      return {
        success: false,
        operation,
        summary: {
          total: 0,
          successful: 0,
          failed: 1,
          warnings: 0
        }
      }
    }
  }

  private async parseImportFile(file: File, format: 'csv' | 'excel'): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          
          if (format === 'csv') {
            const rows = content.split('\n').map(row => row.split(','))
            const headers = rows[0]
            const data = rows.slice(1).map(row => {
              const obj: any = {}
              headers.forEach((header, index) => {
                obj[header.trim()] = row[index]?.trim() || ''
              })
              return obj
            })
            resolve(data)
          } else {
            // For Excel, you'd use a library like xlsx
            reject(new Error('Excel import not implemented yet'))
          }
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  private async validateImportData(data: any[], request: ImportWorkshopDataRequest): Promise<ImportValidationResult> {
    const errors: any[] = []
    const warnings: any[] = []
    const previewData: any[] = []
    
    let validRows = 0
    let invalidRows = 0

    for (let i = 0; i < Math.min(data.length, 10); i++) {
      const row = data[i]
      let hasErrors = false
      let hasWarnings = false

      // Validate required fields
      for (const mapping of request.mappings) {
        if (mapping.required && !row[mapping.sourceColumn]) {
          errors.push({
            row: i + 1,
            column: mapping.sourceColumn,
            value: row[mapping.sourceColumn],
            message: `Required field is empty`,
            severity: 'error'
          })
          hasErrors = true
        }
      }

      // Validate data types and formats
      if (row.max_participants && isNaN(Number(row.max_participants))) {
        warnings.push({
          row: i + 1,
          column: 'max_participants',
          value: row.max_participants,
          message: 'Invalid number format',
          suggestion: 'Use numeric value'
        })
        hasWarnings = true
      }

      if (hasErrors) {
        invalidRows++
      } else {
        validRows++
      }

      previewData.push({
        rowNumber: i + 1,
        data: row,
        hasErrors,
        hasWarnings
      })
    }

    return {
      isValid: errors.length === 0,
      totalRows: data.length,
      validRows,
      invalidRows,
      errors,
      warnings,
      previewData
    }
  }

  private async processImportData(
    data: any[], 
    request: ImportWorkshopDataRequest, 
    operationId: string
  ): Promise<Workshop[]> {
    const importedWorkshops: Workshop[] = []
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      
      try {
        // Map columns to workshop fields
        const workshopData: WorkshopInsert = {}
        
        for (const mapping of request.mappings) {
          const value = row[mapping.sourceColumn] || mapping.defaultValue
          if (value !== undefined) {
            (workshopData as any)[mapping.targetField] = value
          }
        }

        // Create workshop
        const createdWorkshop = await workshopService.createWorkshop(workshopData)
        importedWorkshops.push(createdWorkshop)

        this.updateOperationProgress(operationId, {
          processedItems: i + 1,
          successItems: importedWorkshops.length,
          progress: 50 + Math.round((i + 1) / data.length * 40)
        })

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        this.addOperationError(
          operationId,
          `Failed to import row ${i + 1}: ${errorMessage}`,
          JSON.stringify(row),
          `row_${i + 1}`
        )

        this.updateOperationProgress(operationId, {
          processedItems: i + 1,
          failedItems: this.activeOperations.get(operationId)!.failedItems + 1
        })
      }
    }

    return importedWorkshops
  }

  // ===== PROGRESS TRACKING AND UTILITIES =====

  subscribeToProgress(operationId: string, callback: BatchOperationCallback): void {
    if (!this.progressCallbacks.has(operationId)) {
      this.progressCallbacks.set(operationId, [])
    }
    this.progressCallbacks.get(operationId)!.push(callback)
  }

  unsubscribeFromProgress(operationId: string, callback: BatchOperationCallback): void {
    const callbacks = this.progressCallbacks.get(operationId)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  getActiveOperations(): BatchOperation[] {
    return Array.from(this.activeOperations.values())
  }

  getOperation(operationId: string): BatchOperation | undefined {
    return this.activeOperations.get(operationId)
  }

  async cancelOperation(operationId: string): Promise<boolean> {
    const operation = this.activeOperations.get(operationId)
    if (!operation || !operation.canCancel) {
      return false
    }

    const abortController = this.abortControllers.get(operationId)
    if (abortController) {
      abortController.abort()
    }

    this.updateOperationProgress(operationId, {
      status: 'cancelled',
      completedAt: new Date()
    })

    return true
  }

  clearCompletedOperations(): void {
    const completedIds: string[] = []
    
    for (const [id, operation] of this.activeOperations) {
      if (['completed', 'failed', 'cancelled'].includes(operation.status)) {
        completedIds.push(id)
      }
    }

    completedIds.forEach(id => {
      this.activeOperations.delete(id)
      this.progressCallbacks.delete(id)
      this.abortControllers.delete(id)
    })
  }
}

export const batchOperationsService = new BatchOperationsService()
export default batchOperationsService