import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { AlertCircle, CheckCircle, Loader2, Send } from 'lucide-react';
import { emailService } from '../../services/emailService';
import { notificationManager } from '../../services/notificationManager';

export function EmailNotificationTest() {
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testName, setTestName] = useState('Test User');
  const [selectedTemplate, setSelectedTemplate] = useState('registration_confirmation');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  const mockWorkshopData = {
    id: 'test-workshop-id',
    title: 'Introduction to React Development',
    description: 'Learn the basics of React development in this hands-on workshop.',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    startTime: '10:00 AM',
    endTime: '2:00 PM',
    location: 'Computer Lab A, Gates Building',
    capacity: 25,
    instructor: 'Dr. Sarah Johnson'
  };

  const templateOptions = [
    { value: 'registration_confirmation', label: 'Registration Confirmation' },
    { value: 'workshop_reminder', label: 'Workshop Reminder' },
    { value: 'workshop_cancelled', label: 'Workshop Cancelled' },
    { value: 'workshop_updated', label: 'Workshop Updated' },
    { value: 'waitlist_notification', label: 'Waitlist Promotion' }
  ];

  const sendTestNotification = async () => {
    if (!testEmail || !testName) {
      setTestResult({
        status: 'error',
        message: 'Please provide both email and name for testing.'
      });
      return;
    }

    setIsLoading(true);
    setTestResult({ status: 'idle', message: '' });

    try {
      const recipient = { email: testEmail, name: testName };
      const notificationData = {
        workshop: mockWorkshopData,
        user: { name: testName, email: testEmail }
      };

      const success = await emailService.sendNotification(
        selectedTemplate,
        [recipient],
        notificationData
      );

      if (success) {
        setTestResult({
          status: 'success',
          message: `Test ${selectedTemplate} notification sent successfully to ${testEmail}!`
        });
      } else {
        setTestResult({
          status: 'error',
          message: 'Failed to send test notification. Check email service configuration.'
        });
      }
    } catch (error) {
      console.error('Test notification error:', error);
      setTestResult({
        status: 'error',
        message: `Error sending test notification: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testReminderSystem = async () => {
    setIsLoading(true);
    setTestResult({ status: 'idle', message: '' });

    try {
      const result = await notificationManager.sendWorkshopReminders();
      setTestResult({
        status: 'success',
        message: `Reminder system test completed. Success: ${result.success}, Failed: ${result.failed}`
      });
    } catch (error) {
      console.error('Reminder system test error:', error);
      setTestResult({
        status: 'error',
        message: `Error testing reminder system: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (testResult.status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Send className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Email Notification Testing</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration Status</CardTitle>
          <CardDescription>
            Current email service configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">Email API Key</span>
              <span className={`px-2 py-1 rounded text-sm ${
                process.env.REACT_APP_EMAIL_API_KEY 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {process.env.REACT_APP_EMAIL_API_KEY ? 'Configured' : 'Missing'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">From Email</span>
              <span className="text-sm text-muted-foreground">
                {process.env.REACT_APP_FROM_EMAIL || 'noreply@workshoptracker.com'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">From Name</span>
              <span className="text-sm text-muted-foreground">
                {process.env.REACT_APP_FROM_NAME || 'Workshop Tracker'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Email Templates</CardTitle>
          <CardDescription>
            Send test emails using different notification templates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Test Email Address</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter test email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-name">Test Name</Label>
              <Input
                id="test-name"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Enter test name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-select">Email Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={sendTestNotification}
            disabled={isLoading || !testEmail || !testName}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Test Email...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Test Email
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Tests</CardTitle>
          <CardDescription>
            Test the notification system functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={testReminderSystem}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing Reminder System...
              </>
            ) : (
              'Test Workshop Reminder System'
            )}
          </Button>

          <div className="text-sm text-muted-foreground">
            <p>This will check for upcoming workshops and send reminder emails to registered participants.</p>
          </div>
        </CardContent>
      </Card>

      {testResult.status !== 'idle' && (
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-start space-x-3 p-4 rounded-lg ${
              testResult.status === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {getStatusIcon()}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  testResult.status === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {testResult.status === 'success' ? 'Success' : 'Error'}
                </p>
                <p className={`text-sm ${
                  testResult.status === 'success' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {testResult.message}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sample Workshop Data</CardTitle>
          <CardDescription>
            Preview of the mock workshop data used in test emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-x-auto">
            {JSON.stringify(mockWorkshopData, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}