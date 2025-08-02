import { notificationManager } from './notificationManager';

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  handler: () => Promise<void>;
  lastRun?: Date;
  nextRun?: Date;
  enabled: boolean;
}

class CronService {
  private jobs: Map<string, CronJob> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.setupDefaultJobs();
  }

  private setupDefaultJobs() {
    // Workshop reminder job - runs every hour
    this.addJob({
      id: 'workshop-reminders',
      name: 'Workshop Reminders',
      schedule: '0 * * * *', // Every hour
      handler: this.sendWorkshopReminders,
      enabled: true
    });

    // Daily summary job - runs at 9 AM every day
    this.addJob({
      id: 'daily-summary',
      name: 'Daily Admin Summary',
      schedule: '0 9 * * *', // 9 AM daily
      handler: this.sendDailySummary,
      enabled: false // Disabled by default
    });

    // Low attendance warning - runs at 6 PM day before workshop
    this.addJob({
      id: 'low-attendance-warning',
      name: 'Low Attendance Warnings',
      schedule: '0 18 * * *', // 6 PM daily
      handler: this.checkLowAttendance,
      enabled: true
    });
  }

  addJob(job: CronJob) {
    this.jobs.set(job.id, job);
    if (job.enabled) {
      this.scheduleJob(job);
    }
  }

  removeJob(jobId: string) {
    const interval = this.intervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(jobId);
    }
    this.jobs.delete(jobId);
  }

  enableJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = true;
      this.scheduleJob(job);
    }
  }

  disableJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = false;
      const interval = this.intervals.get(jobId);
      if (interval) {
        clearInterval(interval);
        this.intervals.delete(jobId);
      }
    }
  }

  getJobs(): CronJob[] {
    return Array.from(this.jobs.values());
  }

  getJob(jobId: string): CronJob | undefined {
    return this.jobs.get(jobId);
  }

  private scheduleJob(job: CronJob) {
    // For demo purposes, we'll use simple intervals instead of full cron parsing
    // In production, you'd want to use a proper cron library
    let intervalMs: number;

    switch (job.id) {
      case 'workshop-reminders':
        intervalMs = 60 * 60 * 1000; // 1 hour
        break;
      case 'daily-summary':
      case 'low-attendance-warning':
        intervalMs = 24 * 60 * 60 * 1000; // 24 hours
        break;
      default:
        intervalMs = 60 * 60 * 1000; // Default to 1 hour
    }

    // Clear existing interval if any
    const existingInterval = this.intervals.get(job.id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Set up new interval
    const interval = setInterval(async () => {
      try {
        console.log(`Running cron job: ${job.name}`);
        job.lastRun = new Date();
        await job.handler();
        job.nextRun = new Date(Date.now() + intervalMs);
      } catch (error) {
        console.error(`Error running cron job ${job.name}:`, error);
      }
    }, intervalMs);

    this.intervals.set(job.id, interval);
    job.nextRun = new Date(Date.now() + intervalMs);
  }

  // Job handlers
  private sendWorkshopReminders = async (): Promise<void> => {
    try {
      const result = await notificationManager.sendWorkshopReminders();
      console.log(`Workshop reminders sent - Success: ${result.success}, Failed: ${result.failed}`);
    } catch (error) {
      console.error('Failed to send workshop reminders:', error);
    }
  };

  private sendDailySummary = async (): Promise<void> => {
    try {
      // This would generate and send a daily summary to admins
      // Implementation would depend on what summary data you want to include
      console.log('Daily summary would be sent here');
    } catch (error) {
      console.error('Failed to send daily summary:', error);
    }
  };

  private checkLowAttendance = async (): Promise<void> => {
    try {
      // This would check for workshops with low attendance and notify admins
      console.log('Low attendance check would run here');
    } catch (error) {
      console.error('Failed to check low attendance:', error);
    }
  };

  // Manual job execution for testing
  async runJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    try {
      console.log(`Manually running job: ${job.name}`);
      job.lastRun = new Date();
      await job.handler();
    } catch (error) {
      console.error(`Error manually running job ${job.name}:`, error);
      throw error;
    }
  }

  // Cleanup method
  destroy() {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
    this.jobs.clear();
  }
}

// Export singleton instance
export const cronService = new CronService();
export default cronService;