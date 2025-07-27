-- Test Stock Updates After Purchase
-- Run these queries to verify that stock updates are working correctly

-- =====================================================
-- 1. CHECK CURRENT SYSTEM STATUS
-- =====================================================

-- Verify all required triggers are active
SELECT 
  'TRIGGERS STATUS' as check_type,
  trigger_name, 
  event_object_table, 
  action_timing, 
  event_manipulation,
  CASE 
    WHEN trigger_name IS NOT NULL THEN '✅ ACTIVE'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_update_product_stock', 
  'trigger_generate_order_number',
  'trigger_prevent_negative_stock'
)
ORDER BY event_object_table, trigger_name;

-- Verify RLS policies are in place for critical tables
SELECT 
  'RLS POLICIES STATUS' as check_type,
  tablename, 
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ POLICIES EXIST'
    ELSE '❌ NO POLICIES'
  END as status
FROM pg_policies
WHERE tablename IN ('products', 'orders', 'order_items', 'inventory_transactions')
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- 2. CHECK RECENT PURCHASE ACTIVITY
-- =====================================================

-- Show recent orders and their items
SELECT 
  'RECENT ORDERS' as check_type,
  o.order_number,
  o.status,
  o.total_amount,
  o.created_at,
  COUNT(oi.id) as item_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY o.id, o.order_number, o.status, o.total_amount, o.created_at
ORDER BY o.created_at DESC
LIMIT 10;

-- Show recent inventory transactions (stock changes)
SELECT 
  'RECENT STOCK CHANGES' as check_type,
  p.name as product_name,
  it.transaction_type,
  it.quantity,
  it.previous_stock,
  it.new_stock,
  it.notes,
  it.created_at
FROM inventory_transactions it
JOIN products p ON it.product_id = p.id
WHERE it.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY it.created_at DESC
LIMIT 10;

-- =====================================================
-- 3. VERIFY STOCK CONSISTENCY
-- =====================================================

-- Check if product stock matches latest inventory transaction
WITH latest_transactions AS (
  SELECT DISTINCT ON (product_id)
    product_id,
    new_stock as transaction_stock,
    created_at
  FROM inventory_transactions
  ORDER BY product_id, created_at DESC
)
SELECT 
  'STOCK CONSISTENCY CHECK' as check_type,
  p.name as product_name,
  p.stock_quantity as current_stock,
  lt.transaction_stock,
  CASE 
    WHEN p.stock_quantity = lt.transaction_stock THEN '✅ CONSISTENT'
    WHEN lt.transaction_stock IS NULL THEN '⚠️ NO TRANSACTIONS'
    ELSE '❌ INCONSISTENT'
  END as status,
  lt.created_at as last_transaction
FROM products p
LEFT JOIN latest_transactions lt ON p.id = lt.product_id
WHERE p.is_active = true
ORDER BY 
  CASE 
    WHEN p.stock_quantity = lt.transaction_stock THEN 1
    WHEN lt.transaction_stock IS NULL THEN 2
    ELSE 0
  END,
  p.name
LIMIT 20;

-- =====================================================
-- 4. CHECK FOR POTENTIAL ISSUES
-- =====================================================

-- Check for products with negative stock (should not exist)
SELECT 
  'NEGATIVE STOCK CHECK' as check_type,
  id,
  name,
  stock_quantity,
  updated_at,
  '❌ NEGATIVE STOCK' as issue
FROM products
WHERE stock_quantity < 0
ORDER BY updated_at DESC;

-- Check for products with null stock
SELECT 
  'NULL STOCK CHECK' as check_type,
  id,
  name,
  stock_quantity,
  updated_at,
  '⚠️ NULL STOCK' as issue
FROM products
WHERE stock_quantity IS NULL
ORDER BY updated_at DESC;

-- Check for orphaned inventory transactions
SELECT 
  'ORPHANED TRANSACTIONS CHECK' as check_type,
  it.id,
  it.product_id,
  it.transaction_type,
  it.created_at,
  '⚠️ ORPHANED TRANSACTION' as issue
FROM inventory_transactions it
LEFT JOIN products p ON it.product_id = p.id
WHERE p.id IS NULL
ORDER BY it.created_at DESC
LIMIT 10;

-- =====================================================
-- 5. PERFORMANCE AND ACTIVITY METRICS
-- =====================================================

-- Count transactions by type in last 24 hours
SELECT 
  'TRANSACTION SUMMARY' as check_type,
  transaction_type,
  COUNT(*) as count,
  SUM(quantity) as total_quantity
FROM inventory_transactions
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY transaction_type
ORDER BY count DESC;

-- Show products with recent stock changes
SELECT 
  'RECENTLY UPDATED PRODUCTS' as check_type,
  p.name,
  p.stock_quantity,
  p.updated_at,
  CASE 
    WHEN p.stock_quantity = 0 THEN '❌ OUT OF STOCK'
    WHEN p.stock_quantity <= p.min_stock_level THEN '⚠️ LOW STOCK'
    ELSE '✅ IN STOCK'
  END as stock_status
FROM products p
WHERE p.updated_at >= NOW() - INTERVAL '24 hours'
  AND p.is_active = true
ORDER BY p.updated_at DESC
LIMIT 15;

-- =====================================================
-- 6. MANUAL TEST QUERIES (UNCOMMENT TO USE)
-- =====================================================

-- Test creating a manual inventory transaction (UNCOMMENT TO TEST)
-- INSERT INTO inventory_transactions (
--   product_id, 
--   transaction_type, 
--   quantity, 
--   previous_stock, 
--   new_stock, 
--   notes
-- ) 
-- SELECT 
--   id,
--   'adjustment',
--   1,
--   stock_quantity,
--   stock_quantity + 1,
--   'Manual test transaction'
-- FROM products 
-- WHERE is_active = true 
-- LIMIT 1;

-- Check if the manual transaction updated the product stock
-- SELECT 
--   p.name,
--   p.stock_quantity,
--   it.new_stock,
--   it.notes,
--   it.created_at
-- FROM products p
-- JOIN inventory_transactions it ON p.id = it.product_id
-- WHERE it.notes = 'Manual test transaction'
-- ORDER BY it.created_at DESC
-- LIMIT 1;

-- =====================================================
-- 7. SUMMARY REPORT
-- =====================================================

-- Generate a summary report
SELECT 
  'SYSTEM HEALTH SUMMARY' as report_type,
  (SELECT COUNT(*) FROM products WHERE is_active = true) as active_products,
  (SELECT COUNT(*) FROM products WHERE stock_quantity = 0 AND is_active = true) as out_of_stock_products,
  (SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '24 hours') as orders_last_24h,
  (SELECT COUNT(*) FROM inventory_transactions WHERE created_at >= NOW() - INTERVAL '24 hours') as stock_changes_last_24h,
  (SELECT COUNT(*) FROM inventory_transactions WHERE transaction_type = 'sale' AND created_at >= NOW() - INTERVAL '24 hours') as sales_last_24h;

-- Final status message
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_update_product_stock')
    THEN '✅ Stock update system is configured and ready!'
    ELSE '❌ Stock update system needs configuration!'
  END as final_status;
