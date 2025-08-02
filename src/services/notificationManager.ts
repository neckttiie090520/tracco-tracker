import { emailService, EmailRecipient, EmailNotificationData } from './emailService';
import { notificationConfig } from './notificationConfig';
import { workshopService } from './workshops';
import { supabase } from './supabase';

export interface NotificationContext {
  workshopId: string;
  userId?: string;
  adminUserId?: string;
  action: 'register' | 'unregister' | 'update' | 'cancel' | 'reminder' | 'waitlist_promotion';
  additionalData?: Record<string, any>;
}

class NotificationManager {
  async sendRegistrationConfirmation(workshopId: string, userId: string): Promise<boolean> {
    try {
      // Check if user wants this notification
      if (!notificationConfig.shouldSendNotification(userId, 'registrationConfirmation')) {
        return true; // Skip but return success
      }

      // Get workshop and user data
      const [workshop, userData] = await Promise.all([
        workshopService.getWorkshopById(workshopId),
        this.getUserData(userId)
      ]);

      if (!workshop || !userData) {
        console.error('Workshop or user data not found');
        return false;
      }

      const notificationData: EmailNotificationData = {
        workshop: this.mapWorkshopData(workshop),
        user: userData
      };

      const recipient: EmailRecipient = {
        email: userData.email,
        name: userData.name
      };

      return await emailService.sendNotification(
        'registration_confirmation',
        [recipient],
        notificationData
      );
    } catch (error) {
      console.error('Failed to send registration confirmation:', error);
      return false;
    }
  }

  async sendWorkshopReminders(): Promise<{ success: number; failed: number }> {
    try {
      // Get workshops that need reminders (within next 24-48 hours)
      const upcomingWorkshops = await this.getUpcomingWorkshops();
      let totalSuccess = 0;
      let totalFailed = 0;

      for (const workshop of upcomingWorkshops) {
        const participants = await workshopService.getWorkshopParticipants(workshop.id);
        
        const reminderData: Array<{ recipient: EmailRecipient; data: EmailNotificationData }> = [];

        for (const participant of participants) {
          const userId = participant.user.id;
          const reminderHours = notificationConfig.getReminderHours(userId);
          
          if (reminderHours > 0 && this.shouldSendReminder(workshop, reminderHours)) {
            const recipient: EmailRecipient = {
              email: participant.user.email,
              name: participant.user.name
            };

            const notificationData: EmailNotificationData = {
              workshop: this.mapWorkshopData(workshop),
              user: {
                name: participant.user.name,
                email: participant.user.email
              }
            };

            reminderData.push({ recipient, data: notificationData });
          }
        }

        if (reminderData.length > 0) {
          const result = await emailService.sendBulkNotifications('workshop_reminder', reminderData);
          totalSuccess += result.success;
          totalFailed += result.failed;
        }
      }

      return { success: totalSuccess, failed: totalFailed };
    } catch (error) {
      console.error('Failed to send workshop reminders:', error);
      return { success: 0, failed: 1 };
    }
  }

  async sendWorkshopCancellation(workshopId: string): Promise<{ success: number; failed: number }> {
    try {
      const [workshop, participants] = await Promise.all([
        workshopService.getWorkshopById(workshopId),
        workshopService.getWorkshopParticipants(workshopId)
      ]);

      if (!workshop) {
        console.error('Workshop not found');
        return { success: 0, failed: 1 };
      }

      const cancellationData: Array<{ recipient: EmailRecipient; data: EmailNotificationData }> = [];

      for (const participant of participants) {
        const userId = participant.user.id;
        
        if (notificationConfig.shouldSendNotification(userId, 'workshopCancelled')) {
          const recipient: EmailRecipient = {
            email: participant.user.email,
            name: participant.user.name
          };

          const notificationData: EmailNotificationData = {
            workshop: this.mapWorkshopData(workshop),
            user: {
              name: participant.user.name,
              email: participant.user.email
            }
          };

          cancellationData.push({ recipient, data: notificationData });
        }
      }

      return await emailService.sendBulkNotifications('workshop_cancelled', cancellationData);
    } catch (error) {
      console.error('Failed to send workshop cancellation notifications:', error);
      return { success: 0, failed: 1 };
    }
  }

  async sendWorkshopUpdate(workshopId: string): Promise<{ success: number; failed: number }> {
    try {
      const [workshop, participants] = await Promise.all([
        workshopService.getWorkshopById(workshopId),
        workshopService.getWorkshopParticipants(workshopId)
      ]);

      if (!workshop) {
        console.error('Workshop not found');
        return { success: 0, failed: 1 };
      }

      const updateData: Array<{ recipient: EmailRecipient; data: EmailNotificationData }> = [];

      for (const participant of participants) {
        const userId = participant.user.id;
        
        if (notificationConfig.shouldSendNotification(userId, 'workshopUpdated')) {
          const recipient: EmailRecipient = {
            email: participant.user.email,
            name: participant.user.name
          };

          const notificationData: EmailNotificationData = {
            workshop: this.mapWorkshopData(workshop),
            user: {
              name: participant.user.name,
              email: participant.user.email
            }
          };

          updateData.push({ recipient, data: notificationData });
        }
      }

      return await emailService.sendBulkNotifications('workshop_updated', updateData);
    } catch (error) {
      console.error('Failed to send workshop update notifications:', error);
      return { success: 0, failed: 1 };
    }
  }

  async sendWaitlistPromotion(workshopId: string, userId: string): Promise<boolean> {
    try {
      if (!notificationConfig.shouldSendNotification(userId, 'waitlistNotification')) {
        return true;
      }

      const [workshop, userData] = await Promise.all([
        workshopService.getWorkshopById(workshopId),
        this.getUserData(userId)
      ]);

      if (!workshop || !userData) {
        console.error('Workshop or user data not found');
        return false;
      }

      const notificationData: EmailNotificationData = {
        workshop: this.mapWorkshopData(workshop),
        user: userData
      };

      const recipient: EmailRecipient = {
        email: userData.email,
        name: userData.name
      };

      return await emailService.sendNotification(
        'waitlist_notification',
        [recipient],
        notificationData
      );
    } catch (error) {
      console.error('Failed to send waitlist promotion notification:', error);
      return false;
    }
  }

  async sendAdminNotification(type: string, workshopId: string, context?: any): Promise<boolean> {
    try {
      // Get admin users
      const { data: adminUsers, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'admin');

      if (error || !adminUsers?.length) {
        console.error('No admin users found:', error);
        return false;
      }

      const workshop = await workshopService.getWorkshopById(workshopId);
      if (!workshop) {
        console.error('Workshop not found');
        return false;
      }

      // Send notifications to all admins who have this notification enabled
      const adminRecipients: EmailRecipient[] = adminUsers
        .filter(admin => {
          switch (type) {
            case 'new_registration':
              return notificationConfig.shouldSendAdminNotification('newRegistrations');
            case 'cancellation':
              return notificationConfig.shouldSendAdminNotification('cancellations');
            case 'capacity_reached':
              return notificationConfig.shouldSendAdminNotification('workshopCapacityReached');
            case 'low_attendance':
              return notificationConfig.shouldSendAdminNotification('lowAttendance');
            default:
              return false;
          }
        })
        .map(admin => ({
          email: admin.email,
          name: admin.name
        }));

      if (adminRecipients.length === 0) {
        return true; // No admins want this notification
      }

      // Create admin-specific notification data
      const notificationData: EmailNotificationData = {
        workshop: this.mapWorkshopData(workshop),
        customData: context
      };

      return await emailService.sendNotification(
        `admin_${type}`,
        adminRecipients,
        notificationData
      );
    } catch (error) {
      console.error('Failed to send admin notification:', error);
      return false;
    }
  }

  private async getUserData(userId: string): Promise<{ name: string; email: string } | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get user data:', error);
      return null;
    }
  }

  private async getUpcomingWorkshops() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('workshops')
        .select('*')
        .eq('is_active', true)
        .gte('start_time', tomorrow.toISOString())
        .lt('start_time', dayAfterTomorrow.toISOString());

      if (error) {
        console.error('Error fetching upcoming workshops:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get upcoming workshops:', error);
      return [];
    }
  }

  private shouldSendReminder(workshop: any, reminderHours: number): boolean {
    const workshopTime = new Date(workshop.start_time);
    const now = new Date();
    const hoursUntilWorkshop = (workshopTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Send reminder if workshop is within the specified hours range
    return hoursUntilWorkshop <= reminderHours && hoursUntilWorkshop > (reminderHours - 1);
  }

  private mapWorkshopData(workshop: any): any {
    return {
      id: workshop.id,
      title: workshop.title,
      description: workshop.description,
      date: workshop.start_time,
      startTime: new Date(workshop.start_time).toLocaleTimeString(),
      endTime: new Date(workshop.end_time).toLocaleTimeString(),
      location: workshop.location,
      capacity: workshop.capacity,
      instructor: workshop.instructor?.name || 'TBA'
    };
  }
}

export const notificationManager = new NotificationManager();
export default notificationManager;