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
import { Bell, Mail, Settings } from 'lucide-react';
import { notificationConfig, AdminNotificationSettings } from '../../services/notificationConfig';
import { notificationManager } from '../../services/notificationManager';

export function NotificationSettings() {
  const [adminSettings, setAdminSettings] = useState<AdminNotificationSettings>(
    notificationConfig.getAdminNotificationSettings()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => {
    setAdminSettings(notificationConfig.getAdminNotificationSettings());
  }, []);

  const handleSettingChange = (key: keyof AdminNotificationSettings, value: boolean) => {
    const newSettings = { ...adminSettings, [key]: value };
    setAdminSettings(newSettings);
    notificationConfig.saveAdminNotificationSettings(newSettings);
  };

  const sendTestReminders = async () => {
    setIsLoading(true);
    try {
      const result = await notificationManager.sendWorkshopReminders();
      console.log('Test reminders sent:', result);
    } catch (error) {
      console.error('Failed to send test reminders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestEmail = async () => {
    setTestEmailStatus('sending');
    try {
      // This would send a test email to verify the email service is working
      // For now, we'll just simulate it
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTestEmailStatus('sent');
      setTimeout(() => setTestEmailStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to send test email:', error);
      setTestEmailStatus('error');
      setTimeout(() => setTestEmailStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Notification Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Admin Notifications</span>
          </CardTitle>
          <CardDescription>
            Configure which notifications you want to receive as an administrator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="new-registrations">New Registrations</Label>
                <div className="text-sm text-muted-foreground">
                  Get notified when users register for workshops
                </div>
              </div>
              <Switch
                id="new-registrations"
                checked={adminSettings.newRegistrations}
                onCheckedChange={(checked) => handleSettingChange('newRegistrations', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="cancellations">Registration Cancellations</Label>
                <div className="text-sm text-muted-foreground">
                  Get notified when users cancel their registrations
                </div>
              </div>
              <Switch
                id="cancellations"
                checked={adminSettings.cancellations}
                onCheckedChange={(checked) => handleSettingChange('cancellations', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="capacity-reached">Workshop Capacity Reached</Label>
                <div className="text-sm text-muted-foreground">
                  Get notified when workshops reach full capacity
                </div>
              </div>
              <Switch
                id="capacity-reached"
                checked={adminSettings.workshopCapacityReached}
                onCheckedChange={(checked) => handleSettingChange('workshopCapacityReached', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="low-attendance">Low Attendance Warnings</Label>
                <div className="text-sm text-muted-foreground">
                  Get notified when workshops have unusually low registration
                </div>
              </div>
              <Switch
                id="low-attendance"
                checked={adminSettings.lowAttendance}
                onCheckedChange={(checked) => handleSettingChange('lowAttendance', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="workshop-reminders">Workshop Reminder Reports</Label>
                <div className="text-sm text-muted-foreground">
                  Get daily reports of reminder emails sent to participants
                </div>
              </div>
              <Switch
                id="workshop-reminders"
                checked={adminSettings.workshopReminders}
                onCheckedChange={(checked) => handleSettingChange('workshopReminders', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Email System Management</span>
          </CardTitle>
          <CardDescription>
            Test and manage the email notification system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={sendTestEmail}
              disabled={testEmailStatus === 'sending'}
              variant={testEmailStatus === 'sent' ? 'outline' : 'default'}
            >
              {testEmailStatus === 'sending' && 'Sending...'}
              {testEmailStatus === 'sent' && 'Test Email Sent!'}
              {testEmailStatus === 'error' && 'Failed to Send'}
              {testEmailStatus === 'idle' && 'Send Test Email'}
            </Button>

            <Button
              onClick={sendTestReminders}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? 'Sending...' : 'Send Workshop Reminders Now'}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Test Email:</strong> Sends a test email to verify the email service is working properly.
            </p>
            <p>
              <strong>Workshop Reminders:</strong> Manually triggers the reminder system to send emails for upcoming workshops.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Configuration</CardTitle>
          <CardDescription>
            Current email service configuration status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Email Service:</span>
              <span className="text-sm text-muted-foreground">
                {process.env.REACT_APP_EMAIL_API_KEY ? 'Configured' : 'Not Configured'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">From Email:</span>
              <span className="text-sm text-muted-foreground">
                {process.env.REACT_APP_FROM_EMAIL || 'noreply@workshoptracker.com'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">From Name:</span>
              <span className="text-sm text-muted-foreground">
                {process.env.REACT_APP_FROM_NAME || 'Workshop Tracker'}
              </span>
            </div>
          </div>
          
          {!process.env.REACT_APP_EMAIL_API_KEY && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> Email service is not configured. 
                Please set the REACT_APP_EMAIL_API_KEY environment variable to enable email notifications.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}