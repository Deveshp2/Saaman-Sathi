-- Fix RLS Policies for Inventory Management System
-- Run this in your Supabase SQL Editor after running the main schema

-- Drop existing policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Create improved RLS policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id AND 
    auth.role() = 'authenticated'
  );

-- Allow service role to manage profiles (for admin operations)
CREATE POLICY "Service role can manage profiles" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Fix policies for suppliers table
DROP POLICY IF EXISTS "Suppliers can manage their own supplier data" ON suppliers;

CREATE POLICY "Suppliers can manage their own supplier data" ON suppliers
  FOR ALL USING (
    id = auth.uid() AND 
    auth.role() = 'authenticated'
  );

-- Allow service role to manage suppliers
CREATE POLICY "Service role can manage suppliers" ON suppliers
  FOR ALL USING (auth.role() = 'service_role');

-- Fix policies for vendors table
DROP POLICY IF EXISTS "Vendors can manage their own vendor data" ON vendors;

CREATE POLICY "Vendors can manage their own vendor data" ON vendors
  FOR ALL USING (
    id = auth.uid() AND 
    auth.role() = 'authenticated'
  );

-- Allow service role to manage vendors
CREATE POLICY "Service role can manage vendors" ON vendors
  FOR ALL USING (auth.role() = 'service_role');

-- Fix policies for products table
DROP POLICY IF EXISTS "Suppliers can manage their own products" ON products;
DROP POLICY IF EXISTS "Vendors can view active products" ON products;

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

-- Allow service role to manage products
CREATE POLICY "Service role can manage products" ON products
  FOR ALL USING (auth.role() = 'service_role');

-- Fix policies for orders table
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Vendors can create orders" ON orders;
DROP POLICY IF EXISTS "Suppliers can update orders they're involved in" ON orders;

CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (
    (vendor_id = auth.uid() OR supplier_id = auth.uid()) AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Vendors can create orders" ON orders
  FOR INSERT WITH CHECK (
    vendor_id = auth.uid() AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Suppliers can update orders they're involved in" ON orders
  FOR UPDATE USING (
    supplier_id = auth.uid() AND 
    auth.role() = 'authenticated'
  );

-- Allow service role to manage orders
CREATE POLICY "Service role can manage orders" ON orders
  FOR ALL USING (auth.role() = 'service_role');

-- Fix policies for order_items table
DROP POLICY IF EXISTS "Users can view order items for their orders" ON order_items;
DROP POLICY IF EXISTS "Vendors can create order items" ON order_items;

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

-- Fix policies for inventory_transactions table
DROP POLICY IF EXISTS "Suppliers can manage inventory transactions for their products" ON inventory_transactions;

CREATE POLICY "Suppliers can manage inventory transactions for their products" ON inventory_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = inventory_transactions.product_id 
      AND products.supplier_id = auth.uid()
      AND auth.role() = 'authenticated'
    )
  );

-- Allow service role to manage inventory transactions
CREATE POLICY "Service role can manage inventory transactions" ON inventory_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- Fix policies for categories table
DROP POLICY IF EXISTS "Authenticated users can view categories" ON categories;
DROP POLICY IF EXISTS "Suppliers can manage categories" ON categories;

CREATE POLICY "Authenticated users can view categories" ON categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Suppliers can manage categories" ON categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'supplier'
      AND auth.role() = 'authenticated'
    )
  );

-- Allow service role to manage categories
CREATE POLICY "Service role can manage categories" ON categories
  FOR ALL USING (auth.role() = 'service_role');

-- Create a function to handle user signup with proper profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'vendor')
  );
  
  -- Insert into appropriate user type table
  IF NEW.raw_user_meta_data->>'user_type' = 'supplier' THEN
    INSERT INTO public.suppliers (id) VALUES (NEW.id);
  ELSE
    INSERT INTO public.vendors (id) VALUES (NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.suppliers TO authenticated;
GRANT ALL ON public.vendors TO authenticated;
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.order_items TO authenticated;
GRANT ALL ON public.inventory_transactions TO authenticated; 