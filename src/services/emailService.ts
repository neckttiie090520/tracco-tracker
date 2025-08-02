// import { Workshop, Registration } from '../types';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailRecipient {
  email: string;
  name: string;
}

export interface EmailNotificationData {
  workshop: Workshop;
  registration?: Registration;
  user?: { name: string; email: string };
  customData?: Record<string, any>;
}

class EmailService {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_EMAIL_API_KEY || '';
    this.fromEmail = import.meta.env.VITE_FROM_EMAIL || 'noreply@workshoptracker.com';
    this.fromName = import.meta.env.VITE_FROM_NAME || 'Workshop Tracker';
  }

  private getTemplate(type: string, data: EmailNotificationData): EmailTemplate {
    const templates: Record<string, (data: EmailNotificationData) => EmailTemplate> = {
      'registration_confirmation': (data) => ({
        subject: `Registration Confirmed: ${data.workshop.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Registration Confirmed!</h2>
            <p>Dear ${data.user?.name || 'Participant'},</p>
            <p>Your registration for <strong>${data.workshop.title}</strong> has been confirmed.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">Workshop Details</h3>
              <p><strong>Title:</strong> ${data.workshop.title}</p>
              <p><strong>Date:</strong> ${new Date(data.workshop.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${data.workshop.startTime} - ${data.workshop.endTime}</p>
              <p><strong>Location:</strong> ${data.workshop.location}</p>
              <p><strong>Capacity:</strong> ${data.workshop.capacity} participants</p>
            </div>
            
            <p>We look forward to seeing you at the workshop!</p>
            <p>Best regards,<br>Workshop Tracker Team</p>
          </div>
        `,
        text: `
Registration Confirmed: ${data.workshop.title}

Dear ${data.user?.name || 'Participant'},

Your registration for ${data.workshop.title} has been confirmed.

Workshop Details:
- Title: ${data.workshop.title}
- Date: ${new Date(data.workshop.date).toLocaleDateString()}
- Time: ${data.workshop.startTime} - ${data.workshop.endTime}
- Location: ${data.workshop.location}
- Capacity: ${data.workshop.capacity} participants

We look forward to seeing you at the workshop!

Best regards,
Workshop Tracker Team
        `
      }),

      'workshop_reminder': (data) => ({
        subject: `Reminder: ${data.workshop.title} Tomorrow`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Workshop Reminder</h2>
            <p>Dear ${data.user?.name || 'Participant'},</p>
            <p>This is a friendly reminder that you have a workshop tomorrow:</p>
            
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #991b1b;">${data.workshop.title}</h3>
              <p><strong>Date:</strong> ${new Date(data.workshop.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${data.workshop.startTime} - ${data.workshop.endTime}</p>
              <p><strong>Location:</strong> ${data.workshop.location}</p>
            </div>
            
            <p>Please make sure to arrive on time. If you need to cancel, please do so as soon as possible.</p>
            <p>See you tomorrow!</p>
            <p>Best regards,<br>Workshop Tracker Team</p>
          </div>
        `,
        text: `
Workshop Reminder: ${data.workshop.title} Tomorrow

Dear ${data.user?.name || 'Participant'},

This is a friendly reminder that you have a workshop tomorrow:

${data.workshop.title}
Date: ${new Date(data.workshop.date).toLocaleDateString()}
Time: ${data.workshop.startTime} - ${data.workshop.endTime}
Location: ${data.workshop.location}

Please make sure to arrive on time. If you need to cancel, please do so as soon as possible.

See you tomorrow!

Best regards,
Workshop Tracker Team
        `
      }),

      'workshop_cancelled': (data) => ({
        subject: `Workshop Cancelled: ${data.workshop.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Workshop Cancelled</h2>
            <p>Dear ${data.user?.name || 'Participant'},</p>
            <p>We regret to inform you that the following workshop has been cancelled:</p>
            
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #991b1b;">${data.workshop.title}</h3>
              <p><strong>Originally scheduled for:</strong> ${new Date(data.workshop.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${data.workshop.startTime} - ${data.workshop.endTime}</p>
            </div>
            
            <p>We apologize for any inconvenience this may cause. We will notify you if we reschedule this workshop.</p>
            <p>Thank you for your understanding.</p>
            <p>Best regards,<br>Workshop Tracker Team</p>
          </div>
        `,
        text: `
Workshop Cancelled: ${data.workshop.title}

Dear ${data.user?.name || 'Participant'},

We regret to inform you that the following workshop has been cancelled:

${data.workshop.title}
Originally scheduled for: ${new Date(data.workshop.date).toLocaleDateString()}
Time: ${data.workshop.startTime} - ${data.workshop.endTime}

We apologize for any inconvenience this may cause. We will notify you if we reschedule this workshop.

Thank you for your understanding.

Best regards,
Workshop Tracker Team
        `
      }),

      'workshop_updated': (data) => ({
        subject: `Workshop Updated: ${data.workshop.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">Workshop Updated</h2>
            <p>Dear ${data.user?.name || 'Participant'},</p>
            <p>The workshop you're registered for has been updated:</p>
            
            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #92400e;">${data.workshop.title}</h3>
              <p><strong>Date:</strong> ${new Date(data.workshop.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${data.workshop.startTime} - ${data.workshop.endTime}</p>
              <p><strong>Location:</strong> ${data.workshop.location}</p>
            </div>
            
            <p>Please review the updated details and make note of any changes.</p>
            <p>If you have any questions, please contact us.</p>
            <p>Best regards,<br>Workshop Tracker Team</p>
          </div>
        `,
        text: `
Workshop Updated: ${data.workshop.title}

Dear ${data.user?.name || 'Participant'},

The workshop you're registered for has been updated:

${data.workshop.title}
Date: ${new Date(data.workshop.date).toLocaleDateString()}
Time: ${data.workshop.startTime} - ${data.workshop.endTime}
Location: ${data.workshop.location}

Please review the updated details and make note of any changes.

If you have any questions, please contact us.

Best regards,
Workshop Tracker Team
        `
      }),

      'waitlist_notification': (data) => ({
        subject: `Spot Available: ${data.workshop.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Great News!</h2>
            <p>Dear ${data.user?.name || 'Participant'},</p>
            <p>A spot has become available in the workshop you were waitlisted for:</p>
            
            <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #065f46;">${data.workshop.title}</h3>
              <p><strong>Date:</strong> ${new Date(data.workshop.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${data.workshop.startTime} - ${data.workshop.endTime}</p>
              <p><strong>Location:</strong> ${data.workshop.location}</p>
            </div>
            
            <p>You have been automatically registered for this workshop. If you can no longer attend, please cancel your registration as soon as possible.</p>
            <p>We look forward to seeing you!</p>
            <p>Best regards,<br>Workshop Tracker Team</p>
          </div>
        `,
        text: `
Great News! Spot Available: ${data.workshop.title}

Dear ${data.user?.name || 'Participant'},

A spot has become available in the workshop you were waitlisted for:

${data.workshop.title}
Date: ${new Date(data.workshop.date).toLocaleDateString()}
Time: ${data.workshop.startTime} - ${data.workshop.endTime}
Location: ${data.workshop.location}

You have been automatically registered for this workshop. If you can no longer attend, please cancel your registration as soon as possible.

We look forward to seeing you!

Best regards,
Workshop Tracker Team
        `
      })
    };

    return templates[type]?.(data) || {
      subject: 'Workshop Notification',
      html: '<p>Workshop notification</p>',
      text: 'Workshop notification'
    };
  }

  async sendEmail(
    recipients: EmailRecipient[],
    template: EmailTemplate,
    attachments?: Array<{ filename: string; content: string; type: string }>
  ): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('Email API key not configured. Email not sent.');
      return false;
    }

    try {
      // This would integrate with your email service provider (SendGrid, AWS SES, etc.)
      // For now, we'll simulate the API call
      console.log('Sending email to:', recipients.map(r => r.email));
      console.log('Subject:', template.subject);
      
      // Simulate API call
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          from: { email: this.fromEmail, name: this.fromName },
          to: recipients,
          subject: template.subject,
          html: template.html,
          text: template.text,
          attachments
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendNotification(
    type: string,
    recipients: EmailRecipient[],
    data: EmailNotificationData
  ): Promise<boolean> {
    const template = this.getTemplate(type, data);
    return this.sendEmail(recipients, template);
  }

  async sendBulkNotifications(
    type: string,
    recipientData: Array<{ recipient: EmailRecipient; data: EmailNotificationData }>
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const { recipient, data } of recipientData) {
      try {
        const sent = await this.sendNotification(type, [recipient], data);
        if (sent) success++;
        else failed++;
      } catch (error) {
        console.error('Failed to send notification to:', recipient.email, error);
        failed++;
      }
    }

    return { success, failed };
  }
}

export const emailService = new EmailService();
export default emailService;