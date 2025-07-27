-- Updated Policies and Fixes for Duplicate Orders and User Profile Issues
-- Run this script in your Supabase SQL Editor to fix all authentication and order creation issues

-- =====================================================
-- 1. FIX ORDER NUMBER DUPLICATE CONSTRAINT ISSUE
-- =====================================================

-- Remove conflicting default value from order_number column
ALTER TABLE orders ALTER COLUMN order_number DROP DEFAULT;

-- Drop existing order number generation trigger and function
DROP TRIGGER IF EXISTS trigger_generate_order_number ON orders;
DROP TRIGGER IF EXISTS trigger_generate_timestamp_order_number ON orders;
DROP FUNCTION IF EXISTS generate_order_number();
DROP FUNCTION IF EXISTS generate_timestamp_order_number();

-- Create improved order number generation function
CREATE OR REPLACE FUNCTION generate_timestamp_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ORD-' || 
                     TO_CHAR(NOW(), 'YYYY-MM-DD-HH24-MI-SS-US') || '-' ||
                     LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for timestamp-based order numbers
CREATE TRIGGER trigger_generate_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_timestamp_order_number();

-- =====================================================
-- 2. FIX USER PROFILE ISSUES
-- =====================================================

-- User type constraint already exists and is correct
-- Verify constraint allows lowercase values (vendor, supplier)
-- UPDATE profiles SET user_type = LOWER(user_type) WHERE user_type IN ('Vendor', 'Supplier');

-- Update the user profile creation trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_type_value TEXT;
BEGIN
    -- Validate required metadata
    IF NEW.raw_user_meta_data IS NULL THEN
        RAISE NOTICE 'No metadata provided for user %, using defaults', NEW.email;
        INSERT INTO public.profiles (id, full_name, email, user_type)
        VALUES (NEW.id, '', LOWER(TRIM(NEW.email)), 'vendor');
        RETURN NEW;
    END IF;

    -- Get user_type and convert to lowercase
    user_type_value := LOWER(COALESCE(NEW.raw_user_meta_data->>'user_type', 'vendor'));
    
    -- Validate user_type
    IF user_type_value NOT IN ('vendor', 'supplier') THEN
        RAISE NOTICE 'Invalid user_type % for %, defaulting to vendor', user_type_value, NEW.email;
        user_type_value := 'vendor';
    END IF;

    -- Insert user profile with proper error handling
    BEGIN
        INSERT INTO public.profiles (id, full_name, email, user_type)
        VALUES (
            NEW.id,
            COALESCE(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
            LOWER(TRIM(NEW.email)),
            user_type_value
        );

        RAISE NOTICE 'User profile created successfully for: % with type: %',
            NEW.email, user_type_value;

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating user profile for %: %, creating with defaults', NEW.email, SQLERRM;
        -- Try to create with default values as fallback
        INSERT INTO public.profiles (id, full_name, email, user_type)
        VALUES (NEW.id, '', LOWER(TRIM(NEW.email)), 'vendor')
        ON CONFLICT (id) DO NOTHING;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- 3. FIX RLS POLICIES FOR STOCK UPDATES AFTER PURCHASE
-- =====================================================

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Suppliers can manage their own products" ON products;
DROP POLICY IF EXISTS "Vendors can view active products" ON products;
DROP POLICY IF EXISTS "Service role can manage products" ON products;

-- Create improved product policies that allow stock updates during purchases
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
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'vendor'
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'vendor'
    )
  );

-- Allow service role to manage products
CREATE POLICY "Service role can manage products" ON products
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 4. FIX ORDER AND ORDER_ITEMS POLICIES
-- =====================================================

-- Drop existing order policies
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Vendors can create orders" ON orders;
DROP POLICY IF EXISTS "Suppliers can update orders they're involved in" ON orders;
DROP POLICY IF EXISTS "Service role can manage orders" ON orders;

-- Create improved order policies
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (
    (vendor_id = auth.uid() OR supplier_id = auth.uid()) AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Vendors can create orders" ON orders
  FOR INSERT WITH CHECK (
    vendor_id = auth.uid() AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'vendor'
    )
  );

CREATE POLICY "Suppliers can update orders they're involved in" ON orders
  FOR UPDATE USING (
    supplier_id = auth.uid() AND
    auth.role() = 'authenticated'
  );

-- Allow service role to manage orders
CREATE POLICY "Service role can manage orders" ON orders
  FOR ALL USING (auth.role() = 'service_role');

-- Drop existing order_items policies
DROP POLICY IF EXISTS "Users can view order items for their orders" ON order_items;
DROP POLICY IF EXISTS "Vendors can create order items" ON order_items;
DROP POLICY IF EXISTS "Service role can manage order items" ON order_items;

-- Create improved order_items policies
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
-- 5. FIX INVENTORY_TRANSACTIONS POLICIES FOR PURCHASE TRACKING
-- =====================================================

-- Drop existing inventory_transactions policies
DROP POLICY IF EXISTS "Suppliers can manage inventory transactions for their products" ON inventory_transactions;
DROP POLICY IF EXISTS "Service role can manage inventory transactions" ON inventory_transactions;

-- Create improved inventory_transactions policies
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
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'vendor'
    )
  );

-- Allow vendors to view inventory transactions for products they've purchased
CREATE POLICY "Vendors can view inventory transactions for their purchases" ON inventory_transactions
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'vendor'
    ) AND
    transaction_type = 'sale'
  );

-- Allow service role to manage inventory transactions
CREATE POLICY "Service role can manage inventory transactions" ON inventory_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 6. ENSURE DATABASE TRIGGERS ARE ACTIVE
-- =====================================================

-- Drop and recreate the stock update trigger to ensure it's working
DROP TRIGGER IF EXISTS trigger_update_product_stock ON inventory_transactions;
DROP FUNCTION IF EXISTS update_product_stock();

-- Create improved function to update product stock when inventory transactions occur
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the product's stock quantity with better error handling
  UPDATE products
  SET stock_quantity = NEW.new_stock,
      updated_at = NOW()
  WHERE id = NEW.product_id;

  -- Log the stock update
  RAISE NOTICE 'Stock updated for product %: % -> %', NEW.product_id, NEW.previous_stock, NEW.new_stock;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic stock updates
CREATE TRIGGER trigger_update_product_stock
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();

-- =====================================================
-- 7. GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant necessary permissions for authenticated users
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

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================

-- Test the new order number generation
SELECT 'ORD-' || TO_CHAR(NOW(), 'YYYY-MM-DD-HH24-MI-SS-US') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') as sample_order_number_1,
       'ORD-' || TO_CHAR(NOW(), 'YYYY-MM-DD-HH24-MI-SS-US') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') as sample_order_number_2;

-- Verify user profiles exist and have correct structure
SELECT id, email, user_type, full_name, company_name FROM profiles LIMIT 3;

-- Verify the triggers are active
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('orders', 'inventory_transactions')
AND trigger_name IN ('trigger_generate_order_number', 'trigger_update_product_stock');

-- Check RLS policies are in place
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('products', 'orders', 'order_items', 'inventory_transactions')
ORDER BY tablename, policyname;

-- Test stock update functionality (run this after a purchase to verify)
-- SELECT p.name, p.stock_quantity, it.transaction_type, it.quantity, it.previous_stock, it.new_stock, it.created_at
-- FROM products p
-- JOIN inventory_transactions it ON p.id = it.product_id
-- WHERE it.transaction_type = 'sale'
-- ORDER BY it.created_at DESC
-- LIMIT 5;
