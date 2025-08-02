-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'participant')) DEFAULT 'participant',
    faculty TEXT,
    department TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workshops table
CREATE TABLE IF NOT EXISTS workshops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    instructor UUID REFERENCES users(id),
    google_doc_url TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    max_participants INTEGER DEFAULT 150,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workshop registrations (many-to-many)
CREATE TABLE IF NOT EXISTS workshop_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workshop_id, user_id)
);

-- Tasks per workshop
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User submissions
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    file_url TEXT,
    submission_url TEXT,
    notes TEXT,
    status TEXT CHECK (status IN ('draft', 'submitted', 'reviewed')) DEFAULT 'draft',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, user_id)
);

-- Row Level Security policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Users can read their own data and admins can read all
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = id::text OR EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Workshops are publicly readable, admins can manage
CREATE POLICY "Anyone can view active workshops" ON workshops FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage workshops" ON workshops FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));

-- Workshop registrations
CREATE POLICY "Users can view own registrations" ON workshop_registrations FOR SELECT USING (auth.uid()::text = user_id::text OR EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));
CREATE POLICY "Users can register for workshops" ON workshop_registrations FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can cancel own registrations" ON workshop_registrations FOR DELETE USING (auth.uid()::text = user_id::text);

-- Tasks are readable by workshop participants
CREATE POLICY "Participants can view workshop tasks" ON tasks FOR SELECT USING (
    is_active = true AND (
        EXISTS (SELECT 1 FROM workshop_registrations WHERE workshop_id = tasks.workshop_id AND user_id::text = auth.uid()::text) 
        OR EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
    )
);

-- Submissions
CREATE POLICY "Users can view own submissions" ON submissions FOR SELECT USING (auth.uid()::text = user_id::text OR EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));
CREATE POLICY "Users can manage own submissions" ON submissions FOR ALL USING (auth.uid()::text = user_id::text);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO users (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'participant'
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- User already exists, ignore
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Insert sample data
INSERT INTO users (id, email, name, role) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'admin@cmu.ac.th', 'Workshop Admin', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO workshops (id, title, description, instructor, start_time, end_time) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'Web Development Workshop', 'Learn modern web development with React and TypeScript', '550e8400-e29b-41d4-a716-446655440000', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '3 hours'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Data Science Basics', 'Introduction to data analysis and visualization', '550e8400-e29b-41d4-a716-446655440000', NOW() + INTERVAL '14 days', NOW() + INTERVAL '14 days' + INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tasks (workshop_id, title, description, order_index) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'Create a React Component', 'Build a simple React component with props and state', 1),
    ('550e8400-e29b-41d4-a716-446655440001', 'Add Styling with CSS', 'Style your component using CSS or Tailwind', 2),
    ('550e8400-e29b-41d4-a716-446655440002', 'Data Analysis Task', 'Analyze the provided dataset and create visualizations', 1)
ON CONFLICT DO NOTHING;