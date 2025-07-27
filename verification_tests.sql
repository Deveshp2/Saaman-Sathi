-- Verification Tests for Updated Policies and Fixes
-- Run these queries to verify everything is working correctly

-- =====================================================
-- 1. VERIFY ORDER NUMBER GENERATION
-- =====================================================

-- Test order number generation (should produce unique numbers)
SELECT 
  'Test 1' as test_name,
  'ORD-' || TO_CHAR(NOW(), 'YYYY-MM-DD-HH24-MI-SS-US') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') as order_number_1,
  'ORD-' || TO_CHAR(NOW(), 'YYYY-MM-DD-HH24-MI-SS-US') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') as order_number_2,
  'ORD-' || TO_CHAR(NOW(), 'YYYY-MM-DD-HH24-MI-SS-US') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') as order_number_3;

-- Verify trigger exists and is active
SELECT 
  trigger_name, 
  event_manipulation, 
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'orders' 
AND trigger_name LIKE '%order_number%';

-- =====================================================
-- 2. VERIFY USER PROFILES
-- =====================================================

-- Check user profiles exist and have correct structure
SELECT 
  'User Profiles Check' as test_name,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN user_type = 'vendor' THEN 1 END) as vendor_count,
  COUNT(CASE WHEN user_type = 'supplier' THEN 1 END) as supplier_count
FROM user_profiles;

-- Verify user_type constraint
SELECT 
  'Constraint Check' as test_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'user_profiles'::regclass AND contype = 'c';

-- Check handle_new_user function exists
SELECT 
  'Function Check' as test_name,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- =====================================================
-- 3. VERIFY RLS POLICIES
-- =====================================================

-- Check RLS is enabled on all tables
SELECT 
  'RLS Status' as test_name,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'orders', 'products')
ORDER BY tablename;

-- List all active policies
SELECT 
  'Active Policies' as test_name,
  tablename, 
  policyname, 
  cmd as operation,
  permissive
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'orders', 'products')
ORDER BY tablename, policyname;

-- =====================================================
-- 4. VERIFY FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Check foreign key constraints are correct
SELECT 
  'Foreign Keys' as test_name,
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('orders', 'products')
AND ccu.table_name = 'user_profiles';

-- =====================================================
-- 5. VERIFY PERMISSIONS
-- =====================================================

-- Check table permissions for authenticated role
SELECT 
  'Permissions Check' as test_name,
  table_name,
  privilege_type
FROM information_schema.table_privileges 
WHERE grantee = 'authenticated' 
AND table_name IN ('user_profiles', 'orders', 'products', 'categories')
ORDER BY table_name, privilege_type;

-- =====================================================
-- 6. TEST QUERIES (SAFE READ-ONLY TESTS)
-- =====================================================

-- Test user profile query (should work without errors)
SELECT 
  'Profile Query Test' as test_name,
  'SUCCESS' as status,
  COUNT(*) as profile_count
FROM user_profiles 
WHERE user_type IN ('vendor', 'supplier');

-- Test orders table structure
SELECT 
  'Orders Structure Test' as test_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('id', 'order_number', 'vendor_id', 'supplier_id')
ORDER BY ordinal_position;

-- =====================================================
-- 7. EXPECTED RESULTS SUMMARY
-- =====================================================

/*
EXPECTED RESULTS:

1. Order Number Generation:
   - Should produce 3 unique order numbers with format: ORD-YYYY-MM-DD-HH-MI-SS-MICROSECONDS-XXXX
   - Trigger should be active on orders table

2. User Profiles:
   - Should show existing profiles with lowercase user_type values
   - Constraint should allow only 'vendor' and 'supplier'
   - handle_new_user function should exist

3. RLS Policies:
   - All tables should have RLS enabled (rowsecurity = true)
   - Should show policies for SELECT, INSERT, UPDATE operations
   - Each table should have appropriate policies for user roles

4. Foreign Keys:
   - orders.vendor_id and orders.supplier_id should reference user_profiles.id
   - products.supplier_id should reference user_profiles.id

5. Permissions:
   - authenticated role should have ALL privileges on main tables
   - Should include SELECT, INSERT, UPDATE, DELETE permissions

6. Test Queries:
   - Profile query should return count without errors
   - Orders table should have proper structure with order_number column

If any test fails, check the specific error message and refer to the troubleshooting section.
*/
