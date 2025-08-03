-- Add admin users to the system
-- These users will be created with admin role when they first sign in with Google OAuth

-- Update existing users to admin if they already exist
UPDATE users 
SET role = 'admin', updated_at = NOW()
WHERE email IN (
    'apitchaka@camt.info',
    'apitchaka@gmail.com', 
    'Dawnpongwat@gmail.com',
    'p.sugunnasil@gmail.com'
);

-- For new users, we need to modify the handle_new_user function to check if they should be admin
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    admin_emails TEXT[] := ARRAY[
        'admin@cmu.ac.th',
        'apitchaka@camt.info',
        'apitchaka@gmail.com', 
        'Dawnpongwat@gmail.com',
        'p.sugunnasil@gmail.com'
    ];
    user_role TEXT := 'participant';
BEGIN
    -- Check if this email should be an admin
    IF NEW.email = ANY(admin_emails) THEN
        user_role := 'admin';
    END IF;
    
    INSERT INTO users (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        user_role
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- User already exists, update their role if they should be admin
        IF NEW.email = ANY(admin_emails) THEN
            UPDATE users 
            SET role = 'admin', updated_at = NOW()
            WHERE id = NEW.id AND role != 'admin';
        END IF;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the admin users
SELECT email, name, role, created_at 
FROM users 
WHERE role = 'admin' 
ORDER BY created_at;