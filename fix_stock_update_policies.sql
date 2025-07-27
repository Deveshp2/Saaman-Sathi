-- Fix Stock Update Policies for Purchase Process
-- Run this script in your Supabase SQL Editor to fix database update issues after product purchases

-- =====================================================
-- 1. CRITICAL FIX: ALLOW VENDORS TO UPDATE PRODUCT STOCK
-- =====================================================

-- Drop existing restrictive product policies
DROP POLICY IF EXISTS "Suppliers can manage their own products" ON products;
DROP POLICY IF EXISTS "Vendors can view active products" ON products;
DROP POLICY IF EXISTS "Vendors can update product stock during purchase" ON products;
DROP POLICY IF EXISTS "Service role can manage products" ON products;

-- Create comprehensive product policies
CREATE POLICY "Suppliers can manage their own products" ON products
  FOR ALL USING (
    supplier_id = auth.uid() AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Vendors can view active products" ON products
  FOR SELECT USING (
    is_active = true AND
    auth.role() = 'authenticated'
  );

-- CRITICAL: Allow vendors to update product stock during purchase process
CREATE POLICY "Vendors can update product stock during purchase" ON products
  FOR UPDATE USING (
    auth.role() = 'authenticated'
  )
  WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Allow service role to manage products
CREATE POLICY "Service role can manage products" ON products
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 2. FIX INVENTORY_TRANSACTIONS POLICIES
-- =====================================================

-- Drop existing restrictive inventory_transactions policies
DROP POLICY IF EXISTS "Suppliers can manage inventory transactions for their products" ON inventory_transactions;
DROP POLICY IF EXISTS "Vendors can create inventory transactions during purchase" ON inventory_transactions;
DROP POLICY IF EXISTS "Vendors can view inventory transactions for their purchases" ON inventory_transactions;
DROP POLICY IF EXISTS "Service role can manage inventory transactions" ON inventory_transactions;

-- Create comprehensive inventory_transactions policies
CREATE POLICY "Suppliers can manage inventory transactions for their products" ON inventory_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = inventory_transactions.product_id 
      AND products.supplier_id = auth.uid()
      AND auth.role() = 'authenticated'
    )
  );

-- CRITICAL: Allow vendors to create inventory transactions during purchase
CREATE POLICY "Vendors can create inventory transactions during purchase" ON inventory_transactions
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Allow vendors to view inventory transactions
CREATE POLICY "Vendors can view inventory transactions" ON inventory_transactions
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- Allow service role to manage inventory transactions
CREATE POLICY "Service role can manage inventory transactions" ON inventory_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 3. ENSURE ORDER AND ORDER_ITEMS POLICIES ARE CORRECT
-- =====================================================

-- Drop existing order_items policies
DROP POLICY IF EXISTS "Users can view order items for their orders" ON order_items;
DROP POLICY IF EXISTS "Vendors can create order items" ON order_items;
DROP POLICY IF EXISTS "Service role can manage order items" ON order_items;

-- Create comprehensive order_items policies
CREATE POLICY "Users can view order items for their orders" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND (orders.vendor_id = auth.uid() OR orders.supplier_id = auth.uid())
      AND auth.role() = 'authenticated'
    )
  );

CREATE POLICY "Vendors can create order items" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.vendor_id = auth.uid()
      AND auth.role() = 'authenticated'
    )
  );

-- Allow service role to manage order items
CREATE POLICY "Service role can manage order items" ON order_items
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 4. RECREATE STOCK UPDATE TRIGGER WITH BETTER LOGGING
-- =====================================================

-- Drop and recreate the stock update trigger
DROP TRIGGER IF EXISTS trigger_update_product_stock ON inventory_transactions;
DROP FUNCTION IF EXISTS update_product_stock();

-- Create improved function with better error handling and logging
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
DECLARE
  product_name TEXT;
BEGIN
  -- Get product name for logging
  SELECT name INTO product_name FROM products WHERE id = NEW.product_id;
  
  -- Update the product's stock quantity
  UPDATE products 
  SET stock_quantity = NEW.new_stock,
      updated_at = NOW()
  WHERE id = NEW.product_id;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE WARNING 'Failed to update stock for product %', NEW.product_id;
  ELSE
    RAISE NOTICE 'Stock updated for product % (%): % -> %', 
      NEW.product_id, COALESCE(product_name, 'Unknown'), NEW.previous_stock, NEW.new_stock;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error updating stock for product %: %', NEW.product_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic stock updates
CREATE TRIGGER trigger_update_product_stock
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();

-- =====================================================
-- 5. GRANT ALL NECESSARY PERMISSIONS
-- =====================================================

-- Grant comprehensive permissions for authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.suppliers TO authenticated;
GRANT ALL ON public.vendors TO authenticated;
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.order_items TO authenticated;
GRANT ALL ON public.inventory_transactions TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions for service role
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =====================================================
-- 6. VERIFICATION AND TESTING
-- =====================================================

-- Verify triggers are active
SELECT 
  trigger_name, 
  event_object_table, 
  action_timing, 
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_update_product_stock', 'trigger_generate_order_number')
ORDER BY event_object_table, trigger_name;

-- Verify RLS policies are in place
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename IN ('products', 'orders', 'order_items', 'inventory_transactions')
ORDER BY tablename, policyname;

-- Test query to check recent stock updates (run after making a purchase)
-- SELECT 
--   p.name as product_name,
--   p.stock_quantity as current_stock,
--   it.transaction_type,
--   it.quantity,
--   it.previous_stock,
--   it.new_stock,
--   it.notes,
--   it.created_at
-- FROM products p
-- JOIN inventory_transactions it ON p.id = it.product_id
-- WHERE it.transaction_type = 'sale'
-- ORDER BY it.created_at DESC
-- LIMIT 10;

-- Check for any products with negative stock (should not happen)
SELECT id, name, stock_quantity, updated_at
FROM products
WHERE stock_quantity < 0
ORDER BY updated_at DESC;

-- =====================================================
-- 7. ADDITIONAL SAFETY MEASURES
-- =====================================================

-- Create a function to prevent negative stock
CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_quantity < 0 THEN
    RAISE WARNING 'Attempted to set negative stock for product %: %', NEW.id, NEW.stock_quantity;
    NEW.stock_quantity = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent negative stock
DROP TRIGGER IF EXISTS trigger_prevent_negative_stock ON products;
CREATE TRIGGER trigger_prevent_negative_stock
  BEFORE UPDATE ON products
  FOR EACH ROW
  WHEN (NEW.stock_quantity IS DISTINCT FROM OLD.stock_quantity)
  EXECUTE FUNCTION prevent_negative_stock();

-- Success message
SELECT 'Stock update policies have been successfully applied!' as status;
