-- Fix authentication trigger for new users
-- Run this in Supabase SQL Editor

-- 1. Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop existing function if exists  
DROP FUNCTION IF EXISTS handle_new_user();

-- 3. Create the function with proper error handling
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
    user_name TEXT;
BEGIN
    -- Check if this email should be an admin
    IF NEW.email = ANY(admin_emails) THEN
        user_role := 'admin';
    END IF;
    
    -- Get user name from metadata or email
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    
    -- Insert user with error handling
    INSERT INTO public.users (id, email, name, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        user_name,
        user_role,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = CASE 
            WHEN EXCLUDED.email = ANY(admin_emails) THEN 'admin'
            ELSE users.role
        END,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and still return NEW to not break auth
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION handle_new_user();

-- 5. Test the function (optional)
-- This will show any immediate syntax errors
SELECT handle_new_user() FROM (SELECT NULL) AS dummy WHERE FALSE;

-- 6. Verify the trigger exists
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 7. Check users table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;