import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Bell, Mail, Clock } from 'lucide-react';
import { notificationConfig, NotificationSettings } from '../../services/notificationConfig';

interface NotificationPreferencesProps {
  userId: string;
}

export function NotificationPreferences({ userId }: NotificationPreferencesProps) {
  const [settings, setSettings] = useState<NotificationSettings>(
    notificationConfig.getUserNotificationSettings(userId)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    setSettings(notificationConfig.getUserNotificationSettings(userId));
  }, [userId]);

  const handleGlobalToggle = (enabled: boolean) => {
    const newSettings = { ...settings, enabled };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleEmailNotificationChange = (
    key: keyof NotificationSettings['emailNotifications'],
    value: boolean
  ) => {
    const newSettings = {
      ...settings,
      emailNotifications: {
        ...settings.emailNotifications,
        [key]: value
      }
    };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleReminderSettingChange = (key: string, value: boolean | number) => {
    const newSettings = {
      ...settings,
      reminderSettings: {
        ...settings.reminderSettings,
        [key]: value
      }
    };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    setSaveStatus('saving');
    try {
      notificationConfig.saveUserNotificationSettings(userId, newSettings);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const resetToDefaults = () => {
    const defaultSettings = notificationConfig.getUserNotificationSettings('default');
    setSettings(defaultSettings);
    saveSettings(defaultSettings);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Notification Preferences</h2>
        </div>
        {saveStatus === 'saved' && (
          <span className="text-sm text-green-600">Settings saved!</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-sm text-red-600">Failed to save settings</span>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Master Control</CardTitle>
          <CardDescription>
            Enable or disable all email notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications-enabled">Email Notifications</Label>
              <div className="text-sm text-muted-foreground">
                Receive email notifications for workshop activities
              </div>
            </div>
            <Switch
              id="notifications-enabled"
              checked={settings.enabled}
              onCheckedChange={handleGlobalToggle}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Email Notification Types</span>
          </CardTitle>
          <CardDescription>
            Choose which types of email notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between opacity-${settings.enabled ? '100' : '50'}">
              <div className="space-y-0.5">
                <Label htmlFor="registration-confirmation">Registration Confirmations</Label>
                <div className="text-sm text-muted-foreground">
                  Receive confirmation when you register for a workshop
                </div>
              </div>
              <Switch
                id="registration-confirmation"
                checked={settings.emailNotifications.registrationConfirmation}
                onCheckedChange={(checked) => handleEmailNotificationChange('registrationConfirmation', checked)}
                disabled={!settings.enabled}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between opacity-${settings.enabled ? '100' : '50'}">
              <div className="space-y-0.5">
                <Label htmlFor="workshop-reminders">Workshop Reminders</Label>
                <div className="text-sm text-muted-foreground">
                  Receive reminders before your upcoming workshops
                </div>
              </div>
              <Switch
                id="workshop-reminders"
                checked={settings.emailNotifications.workshopReminder}
                onCheckedChange={(checked) => handleEmailNotificationChange('workshopReminder', checked)}
                disabled={!settings.enabled}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between opacity-${settings.enabled ? '100' : '50'}">
              <div className="space-y-0.5">
                <Label htmlFor="workshop-updates">Workshop Updates</Label>
                <div className="text-sm text-muted-foreground">
                  Receive notifications when workshop details change
                </div>
              </div>
              <Switch
                id="workshop-updates"
                checked={settings.emailNotifications.workshopUpdated}
                onCheckedChange={(checked) => handleEmailNotificationChange('workshopUpdated', checked)}
                disabled={!settings.enabled}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between opacity-${settings.enabled ? '100' : '50'}">
              <div className="space-y-0.5">
                <Label htmlFor="workshop-cancellations">Workshop Cancellations</Label>
                <div className="text-sm text-muted-foreground">
                  Receive notifications when workshops are cancelled
                </div>
              </div>
              <Switch
                id="workshop-cancellations"
                checked={settings.emailNotifications.workshopCancelled}
                onCheckedChange={(checked) => handleEmailNotificationChange('workshopCancelled', checked)}
                disabled={!settings.enabled}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between opacity-${settings.enabled ? '100' : '50'}">
              <div className="space-y-0.5">
                <Label htmlFor="waitlist-notifications">Waitlist Notifications</Label>
                <div className="text-sm text-muted-foreground">
                  Receive notifications when you're moved from waitlist to registered
                </div>
              </div>
              <Switch
                id="waitlist-notifications"
                checked={settings.emailNotifications.waitlistNotification}
                onCheckedChange={(checked) => handleEmailNotificationChange('waitlistNotification', checked)}
                disabled={!settings.enabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Reminder Settings</span>
          </CardTitle>
          <CardDescription>
            Configure when you receive workshop reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between opacity-${settings.enabled && settings.emailNotifications.workshopReminder ? '100' : '50'}">
            <div className="space-y-0.5">
              <Label htmlFor="reminder-enabled">Enable Reminders</Label>
              <div className="text-sm text-muted-foreground">
                Send reminder emails before workshops
              </div>
            </div>
            <Switch
              id="reminder-enabled"
              checked={settings.reminderSettings.enabled}
              onCheckedChange={(checked) => handleReminderSettingChange('enabled', checked)}
              disabled={!settings.enabled || !settings.emailNotifications.workshopReminder}
            />
          </div>

          {settings.reminderSettings.enabled && (
            <div className="space-y-2">
              <Label htmlFor="reminder-hours">Reminder Timing</Label>
              <Select
                value={settings.reminderSettings.hoursBeforeWorkshop.toString()}
                onValueChange={(value) => handleReminderSettingChange('hoursBeforeWorkshop', parseInt(value))}
                disabled={!settings.enabled || !settings.emailNotifications.workshopReminder}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour before</SelectItem>
                  <SelectItem value="3">3 hours before</SelectItem>
                  <SelectItem value="6">6 hours before</SelectItem>
                  <SelectItem value="12">12 hours before</SelectItem>
                  <SelectItem value="24">24 hours before</SelectItem>
                  <SelectItem value="48">48 hours before</SelectItem>
                  <SelectItem value="72">72 hours before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={resetToDefaults}>
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}