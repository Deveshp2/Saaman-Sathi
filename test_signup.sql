-- Test script to verify signup process works correctly
-- This is for testing purposes only

-- Check if the trigger function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check RLS policies for profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check if tables exist and have proper structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'suppliers', 'vendors')
ORDER BY table_name, ordinal_position;

-- Check grants for authenticated role
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.table_privileges 
WHERE grantee = 'authenticated' 
AND table_name IN ('profiles', 'suppliers', 'vendors', 'categories', 'products', 'orders', 'order_items', 'inventory_transactions');

-- Test data insertion (run this after creating a test user)
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
-- VALUES (
--   gen_random_uuid(),
--   'test@example.com',
--   crypt('password123', gen_salt('bf')),
--   now(),
--   now(),
--   now(),
--   '{"full_name": "Test User", "user_type": "supplier", "company_name": "Test Company"}'::jsonb
-- );

-- Check if profile was created automatically
-- SELECT * FROM profiles WHERE email = 'test@example.com';

-- Check if supplier/vendor record was created
-- SELECT * FROM suppliers WHERE id = (SELECT id FROM profiles WHERE email = 'test@example.com');
-- SELECT * FROM vendors WHERE id = (SELECT id FROM profiles WHERE email = 'test@example.com'); 