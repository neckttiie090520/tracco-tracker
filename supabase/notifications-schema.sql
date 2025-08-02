-- Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    template TEXT NOT NULL,
    status TEXT CHECK (status IN ('sent', 'failed', 'bounced', 'delivered')) DEFAULT 'sent',
    provider_id TEXT,
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User notification preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email_workshop_reminders BOOLEAN DEFAULT true,
    email_task_notifications BOOLEAN DEFAULT true,
    email_registration_confirmations BOOLEAN DEFAULT true,
    email_cancellations BOOLEAN DEFAULT true,
    reminder_24h BOOLEAN DEFAULT true,
    reminder_1h BOOLEAN DEFAULT true,
    task_due_reminders BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Notification queue for batch processing
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    template TEXT NOT NULL,
    data JSONB NOT NULL,
    priority TEXT CHECK (priority IN ('high', 'normal', 'low')) DEFAULT 'normal',
    status TEXT CHECK (status IN ('pending', 'processing', 'sent', 'failed')) DEFAULT 'pending',
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Scheduled notifications (for reminders)
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL, -- 'workshop_reminder_24h', 'workshop_reminder_1h', 'task_due_reminder'
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'sent', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled_for ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status);

-- Row Level Security
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for email_logs (admin only)
CREATE POLICY "Admins can view email logs" ON email_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- Policies for user_notification_preferences
CREATE POLICY "Users can view own notification preferences" ON user_notification_preferences FOR SELECT USING (
    auth.uid()::text = user_id::text
);

CREATE POLICY "Users can update own notification preferences" ON user_notification_preferences FOR ALL USING (
    auth.uid()::text = user_id::text
);

-- Policies for notification_queue (admin only)
CREATE POLICY "Admins can manage notification queue" ON notification_queue FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- Policies for scheduled_notifications
CREATE POLICY "Users can view own scheduled notifications" ON scheduled_notifications FOR SELECT USING (
    auth.uid()::text = user_id::text
);

CREATE POLICY "Admins can manage scheduled notifications" ON scheduled_notifications FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- Function to automatically schedule workshop reminders
CREATE OR REPLACE FUNCTION schedule_workshop_reminders()
RETURNS TRIGGER AS $$
BEGIN
    -- Schedule 24-hour reminder
    INSERT INTO scheduled_notifications (user_id, workshop_id, notification_type, scheduled_for)
    SELECT 
        wr.user_id,
        NEW.id,
        'workshop_reminder_24h',
        NEW.start_time - INTERVAL '24 hours'
    FROM workshop_registrations wr
    WHERE wr.workshop_id = NEW.id
    AND NEW.start_time - INTERVAL '24 hours' > NOW()
    ON CONFLICT DO NOTHING;

    -- Schedule 1-hour reminder
    INSERT INTO scheduled_notifications (user_id, workshop_id, notification_type, scheduled_for)
    SELECT 
        wr.user_id,
        NEW.id,
        'workshop_reminder_1h',
        NEW.start_time - INTERVAL '1 hour'
    FROM workshop_registrations wr
    WHERE wr.workshop_id = NEW.id
    AND NEW.start_time - INTERVAL '1 hour' > NOW()
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to schedule task due reminders
CREATE OR REPLACE FUNCTION schedule_task_reminders()
RETURNS TRIGGER AS $$
BEGIN
    -- Schedule task due reminder (24 hours before)
    INSERT INTO scheduled_notifications (user_id, task_id, notification_type, scheduled_for)
    SELECT 
        wr.user_id,
        NEW.id,
        'task_due_reminder',
        NEW.due_date - INTERVAL '24 hours'
    FROM workshop_registrations wr
    WHERE wr.workshop_id = NEW.workshop_id
    AND NEW.due_date - INTERVAL '24 hours' > NOW()
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to schedule registration confirmation
CREATE OR REPLACE FUNCTION schedule_registration_confirmation()
RETURNS TRIGGER AS $$
BEGIN
    -- Add registration confirmation to queue
    INSERT INTO notification_queue (recipient, subject, template, data, priority)
    SELECT 
        u.email,
        'Registration Confirmed: ' || w.title,
        'workshop-registration',
        jsonb_build_object(
            'userName', u.name,
            'workshopTitle', w.title,
            'workshopUrl', '/workshops/' || w.id,
            'unsubscribeUrl', '/unsubscribe?token=' || u.id,
            'instructorName', i.name,
            'startDate', to_char(w.start_time, 'FMDay, Month DD, YYYY'),
            'startTime', to_char(w.start_time, 'HH12:MI AM'),
            'endTime', to_char(w.end_time, 'HH12:MI AM')
        ),
        'high'
    FROM users u
    JOIN workshops w ON w.id = NEW.workshop_id
    LEFT JOIN users i ON i.id = w.instructor
    WHERE u.id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trigger_schedule_workshop_reminders ON workshops;
CREATE TRIGGER trigger_schedule_workshop_reminders
    AFTER INSERT OR UPDATE OF start_time ON workshops
    FOR EACH ROW
    EXECUTE FUNCTION schedule_workshop_reminders();

DROP TRIGGER IF EXISTS trigger_schedule_task_reminders ON tasks;
CREATE TRIGGER trigger_schedule_task_reminders
    AFTER INSERT OR UPDATE OF due_date ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION schedule_task_reminders();

DROP TRIGGER IF EXISTS trigger_schedule_registration_confirmation ON workshop_registrations;
CREATE TRIGGER trigger_schedule_registration_confirmation
    AFTER INSERT ON workshop_registrations
    FOR EACH ROW
    EXECUTE FUNCTION schedule_registration_confirmation();