export interface NotificationSettings {
  enabled: boolean;
  emailNotifications: {
    registrationConfirmation: boolean;
    workshopReminder: boolean;
    workshopCancelled: boolean;
    workshopUpdated: boolean;
    waitlistNotification: boolean;
  };
  reminderSettings: {
    enabled: boolean;
    hoursBeforeWorkshop: number;
  };
}

export interface AdminNotificationSettings {
  newRegistrations: boolean;
  cancellations: boolean;
  workshopCapacityReached: boolean;
  lowAttendance: boolean;
  workshopReminders: boolean;
}

export const DEFAULT_USER_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  emailNotifications: {
    registrationConfirmation: true,
    workshopReminder: true,
    workshopCancelled: true,
    workshopUpdated: true,
    waitlistNotification: true,
  },
  reminderSettings: {
    enabled: true,
    hoursBeforeWorkshop: 24,
  },
};

export const DEFAULT_ADMIN_NOTIFICATION_SETTINGS: AdminNotificationSettings = {
  newRegistrations: true,
  cancellations: true,
  workshopCapacityReached: true,
  lowAttendance: true,
  workshopReminders: false,
};

class NotificationConfigService {
  private readonly STORAGE_KEY = 'workshop_notification_settings';
  private readonly ADMIN_STORAGE_KEY = 'workshop_admin_notification_settings';

  getUserNotificationSettings(userId: string): NotificationSettings {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY}_${userId}`);
      if (stored) {
        return { ...DEFAULT_USER_NOTIFICATION_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load user notification settings:', error);
    }
    return DEFAULT_USER_NOTIFICATION_SETTINGS;
  }

  saveUserNotificationSettings(userId: string, settings: NotificationSettings): void {
    try {
      localStorage.setItem(`${this.STORAGE_KEY}_${userId}`, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save user notification settings:', error);
    }
  }

  getAdminNotificationSettings(): AdminNotificationSettings {
    try {
      const stored = localStorage.getItem(this.ADMIN_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_ADMIN_NOTIFICATION_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load admin notification settings:', error);
    }
    return DEFAULT_ADMIN_NOTIFICATION_SETTINGS;
  }

  saveAdminNotificationSettings(settings: AdminNotificationSettings): void {
    try {
      localStorage.setItem(this.ADMIN_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save admin notification settings:', error);
    }
  }

  shouldSendNotification(
    userId: string,
    notificationType: keyof NotificationSettings['emailNotifications']
  ): boolean {
    const settings = this.getUserNotificationSettings(userId);
    return settings.enabled && settings.emailNotifications[notificationType];
  }

  shouldSendAdminNotification(
    notificationType: keyof AdminNotificationSettings
  ): boolean {
    const settings = this.getAdminNotificationSettings();
    return settings[notificationType];
  }

  getReminderHours(userId: string): number {
    const settings = this.getUserNotificationSettings(userId);
    return settings.reminderSettings.enabled ? settings.reminderSettings.hoursBeforeWorkshop : 0;
  }
}

export const notificationConfig = new NotificationConfigService();
export default notificationConfig;