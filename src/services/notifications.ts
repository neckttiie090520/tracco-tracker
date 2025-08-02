import { supabase } from './supabase'

export interface NotificationData {
  userName: string
  workshopTitle: string
  workshopUrl: string
  unsubscribeUrl: string
  instructorName?: string
  startDate?: string
  startTime?: string
  endTime?: string
  timeUntil?: string
  taskTitle?: string
  taskDescription?: string
  taskUrl?: string
  dueDate?: string
  timeUntilDue?: string
  submissionStatus?: 'submitted' | 'not_submitted'
  reason?: string
  rescheduleDate?: string
}

export const notificationService = {
  // Send workshop registration confirmation
  async sendRegistrationConfirmation(userEmail: string, data: NotificationData) {
    return this.sendEmail({
      to: userEmail,
      subject: `Registration Confirmed: ${data.workshopTitle}`,
      template: 'workshop-registration',
      data,
      priority: 'high'
    })
  },

  // Send workshop reminder
  async sendWorkshopReminder(userEmail: string, data: NotificationData) {
    const subject = data.timeUntil?.includes('1 hour') 
      ? `Starting Soon: ${data.workshopTitle}` 
      : `Reminder: ${data.workshopTitle} tomorrow`
    
    return this.sendEmail({
      to: userEmail,
      subject,
      template: 'workshop-reminder',
      data,
      priority: 'high'
    })
  },

  // Send task assignment notification
  async sendTaskAssigned(userEmail: string, data: NotificationData) {
    return this.sendEmail({
      to: userEmail,
      subject: `New Task: ${data.taskTitle}`,
      template: 'task-assigned',
      data,
      priority: 'normal'
    })
  },

  // Send task due reminder
  async sendTaskDueReminder(userEmail: string, data: NotificationData) {
    return this.sendEmail({
      to: userEmail,
      subject: `Task Due Soon: ${data.taskTitle}`,
      template: 'task-due-reminder',
      data,
      priority: 'high'
    })
  },

  // Send workshop cancellation
  async sendWorkshopCancellation(userEmail: string, data: NotificationData) {
    return this.sendEmail({
      to: userEmail,
      subject: `Workshop Cancelled: ${data.workshopTitle}`,
      template: 'workshop-cancelled',
      data,
      priority: 'high'
    })
  },

  // Send batch registration confirmations
  async sendBatchRegistrationConfirmations(registrations: Array<{
    email: string
    data: NotificationData
  }>) {
    const promises = registrations.map(({ email, data }) =>
      this.sendRegistrationConfirmation(email, data)
    )
    return Promise.allSettled(promises)
  },

  // Send batch workshop reminders
  async sendBatchWorkshopReminders(reminders: Array<{
    email: string
    data: NotificationData
  }>) {
    const promises = reminders.map(({ email, data }) =>
      this.sendWorkshopReminder(email, data)
    )
    return Promise.allSettled(promises)
  },

  // Get user notification preferences
  async getUserNotificationPreferences(userId: string) {
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching notification preferences:', error)
      throw error
    }

    // Return default preferences if none exist
    return data || {
      email_workshop_reminders: true,
      email_task_notifications: true,
      email_registration_confirmations: true,
      email_cancellations: true,
      reminder_24h: true,
      reminder_1h: true,
      task_due_reminders: true
    }
  },

  // Update user notification preferences
  async updateNotificationPreferences(userId: string, preferences: any) {
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating notification preferences:', error)
      throw error
    }

    return data
  },

  // Schedule workshop reminders (to be called by cron job)
  async scheduleWorkshopReminders() {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const oneHour = new Date(now.getTime() + 60 * 60 * 1000)

    // Get workshops starting in 24 hours
    const { data: upcomingWorkshops } = await supabase
      .from('workshops')
      .select(`
        *,
        instructor:users!workshops_instructor_fkey(name),
        registrations:workshop_registrations(
          user:users(id, email, name)
        )
      `)
      .gte('start_time', tomorrow.toISOString())
      .lt('start_time', new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString())
      .eq('is_active', true)

    // Get workshops starting in 1 hour
    const { data: imminentWorkshops } = await supabase
      .from('workshops')
      .select(`
        *,
        instructor:users!workshops_instructor_fkey(name),
        registrations:workshop_registrations(
          user:users(id, email, name)
        )
      `)
      .gte('start_time', oneHour.toISOString())
      .lt('start_time', new Date(oneHour.getTime() + 5 * 60 * 1000).toISOString())
      .eq('is_active', true)

    // Send 24-hour reminders
    for (const workshop of upcomingWorkshops || []) {
      const reminders = workshop.registrations.map((reg: any) => ({
        email: reg.user.email,
        data: {
          userName: reg.user.name,
          workshopTitle: workshop.title,
          workshopUrl: `${window.location.origin}/workshops/${workshop.id}`,
          unsubscribeUrl: `${window.location.origin}/unsubscribe?token=${reg.user.id}`,
          instructorName: workshop.instructor.name,
          startDate: new Date(workshop.start_time).toLocaleDateString(),
          startTime: new Date(workshop.start_time).toLocaleTimeString(),
          endTime: new Date(workshop.end_time).toLocaleTimeString(),
          timeUntil: 'starts tomorrow'
        }
      }))

      if (reminders.length > 0) {
        await this.sendBatchWorkshopReminders(reminders)
      }
    }

    // Send 1-hour reminders
    for (const workshop of imminentWorkshops || []) {
      const reminders = workshop.registrations.map((reg: any) => ({
        email: reg.user.email,
        data: {
          userName: reg.user.name,
          workshopTitle: workshop.title,
          workshopUrl: `${window.location.origin}/workshops/${workshop.id}`,
          unsubscribeUrl: `${window.location.origin}/unsubscribe?token=${reg.user.id}`,
          instructorName: workshop.instructor.name,
          startDate: new Date(workshop.start_time).toLocaleDateString(),
          startTime: new Date(workshop.start_time).toLocaleTimeString(),
          endTime: new Date(workshop.end_time).toLocaleTimeString(),
          timeUntil: 'starts in 1 hour'
        }
      }))

      if (reminders.length > 0) {
        await this.sendBatchWorkshopReminders(reminders)
      }
    }
  },

  // Schedule task due reminders
  async scheduleTaskDueReminders() {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Get tasks due in 24 hours
    const { data: dueTasks } = await supabase
      .from('tasks')
      .select(`
        *,
        workshop:workshops(title),
        submissions(user_id, status)
      `)
      .gte('due_date', tomorrow.toISOString())
      .lt('due_date', new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString())
      .eq('is_active', true)

    for (const task of dueTasks || []) {
      // Get all registered users for this workshop
      const { data: registrations } = await supabase
        .from('workshop_registrations')
        .select(`
          user:users(id, email, name)
        `)
        .eq('workshop_id', task.workshop_id)

      for (const registration of registrations || []) {
        const user = registration.user
        const userSubmission = task.submissions.find((s: any) => s.user_id === user.id)
        
        if (!userSubmission || userSubmission.status !== 'submitted') {
          await this.sendTaskDueReminder(user.email, {
            userName: user.name,
            taskTitle: task.title,
            workshopTitle: task.workshop.title,
            taskUrl: `${window.location.origin}/workshops/${task.workshop_id}`,
            unsubscribeUrl: `${window.location.origin}/unsubscribe?token=${user.id}`,
            dueDate: new Date(task.due_date).toLocaleDateString(),
            timeUntilDue: 'tomorrow',
            submissionStatus: userSubmission ? userSubmission.status : 'not_submitted'
          })
        }
      }
    }
  },

  // Core email sending function
  private async sendEmail(emailData: {
    to: string
    subject: string
    template: string
    data: any
    priority?: 'high' | 'normal' | 'low'
  }) {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: emailData
      })

      if (error) {
        console.error('Email sending error:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Failed to send email:', error)
      throw error
    }
  }
}