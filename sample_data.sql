-- Sample Data for Inventory Management System
-- Run this after setting up the database schema

-- Insert sample categories (if not already inserted)
INSERT INTO categories (name, description) VALUES
  ('Electronics', 'Electronic devices and components'),
  ('Clothing', 'Apparel and fashion items'),
  ('Home & Garden', 'Home improvement and garden supplies'),
  ('Sports & Outdoor', 'Sports equipment and outdoor gear'),
  ('Books & Media', 'Books, movies, and other media'),
  ('Automotive', 'Automotive parts and accessories'),
  ('Health & Beauty', 'Health and beauty products'),
  ('Food & Beverage', 'Food and beverage items')
ON CONFLICT (name) DO NOTHING;

-- Get category IDs for reference
DO $$
DECLARE
    electronics_id UUID;
    clothing_id UUID;
    home_id UUID;
    sports_id UUID;
    books_id UUID;
    automotive_id UUID;
    health_id UUID;
    food_id UUID;
BEGIN
    SELECT id INTO electronics_id FROM categories WHERE name = 'Electronics';
    SELECT id INTO clothing_id FROM categories WHERE name = 'Clothing';
    SELECT id INTO home_id FROM categories WHERE name = 'Home & Garden';
    SELECT id INTO sports_id FROM categories WHERE name = 'Sports & Outdoor';
    SELECT id INTO books_id FROM categories WHERE name = 'Books & Media';
    SELECT id INTO automotive_id FROM categories WHERE name = 'Automotive';
    SELECT id INTO health_id FROM categories WHERE name = 'Health & Beauty';
    SELECT id INTO food_id FROM categories WHERE name = 'Food & Beverage';

    -- Note: You'll need to replace these UUIDs with actual user IDs after creating test accounts
    -- This is just a template for when you have actual user accounts

    -- Sample products (replace supplier_id with actual user IDs)
    -- INSERT INTO products (supplier_id, category_id, name, description, sku, price, cost_price, stock_quantity, min_stock_level, unit, is_active) VALUES
    --   ('actual-supplier-uuid', electronics_id, 'Wireless Headphones', 'High-quality wireless headphones with noise cancellation', 'WH-001', 99.99, 60.00, 50, 10, 'piece', true),
    --   ('actual-supplier-uuid', electronics_id, 'Smartphone', 'Latest smartphone with advanced features', 'SP-002', 599.99, 400.00, 25, 5, 'piece', true),
    --   ('actual-supplier-uuid', clothing_id, 'Cotton T-Shirt', 'Comfortable cotton t-shirt in various colors', 'TS-003', 19.99, 8.00, 100, 20, 'piece', true),
    --   ('actual-supplier-uuid', clothing_id, 'Denim Jeans', 'Classic denim jeans with modern fit', 'DJ-004', 49.99, 25.00, 75, 15, 'piece', true),
    --   ('actual-supplier-uuid', home_id, 'Coffee Maker', 'Automatic coffee maker with timer', 'CM-005', 89.99, 45.00, 30, 8, 'piece', true),
    --   ('actual-supplier-uuid', home_id, 'Table Lamp', 'Modern table lamp with LED lighting', 'TL-006', 39.99, 20.00, 60, 12, 'piece', true),
    --   ('actual-supplier-uuid', sports_id, 'Yoga Mat', 'Non-slip yoga mat for home workouts', 'YM-007', 29.99, 15.00, 80, 15, 'piece', true),
    --   ('actual-supplier-uuid', sports_id, 'Dumbbells Set', 'Adjustable dumbbells set for strength training', 'DS-008', 149.99, 80.00, 20, 5, 'set', true),
    --   ('actual-supplier-uuid', books_id, 'Programming Guide', 'Comprehensive guide to modern programming', 'BG-009', 24.99, 12.00, 45, 10, 'piece', true),
    --   ('actual-supplier-uuid', books_id, 'Business Strategy', 'Strategic business management book', 'BS-010', 34.99, 18.00, 35, 8, 'piece', true);

END $$;

-- Sample inventory transactions (replace with actual product and user IDs)
-- INSERT INTO inventory_transactions (product_id, transaction_type, quantity, previous_stock, new_stock, reference_type, notes, created_by) VALUES
--   ('actual-product-uuid', 'purchase', 50, 0, 50, 'manual', 'Initial stock purchase', 'actual-supplier-uuid'),
--   ('actual-product-uuid', 'sale', 5, 50, 45, 'order', 'Order fulfillment', 'actual-supplier-uuid'),
--   ('actual-product-uuid', 'adjustment', 10, 45, 55, 'manual', 'Stock adjustment', 'actual-supplier-uuid');

-- Sample orders (replace with actual user IDs)
-- INSERT INTO orders (vendor_id, supplier_id, status, total_amount, shipping_address, notes) VALUES
--   ('actual-vendor-uuid', 'actual-supplier-uuid', 'confirmed', 299.95, '123 Main Street, City, State 12345', 'Please deliver by Friday'),
--   ('actual-vendor-uuid', 'actual-supplier-uuid', 'shipped', 149.98, '456 Oak Avenue, City, State 12345', 'Handle with care');

-- Sample order items (replace with actual order and product IDs)
-- INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES
--   ('actual-order-uuid', 'actual-product-uuid', 3, 99.99, 299.97),
--   ('actual-order-uuid', 'actual-product-uuid', 2, 49.99, 99.98);

-- Update order totals (this will be done automatically by triggers, but you can run this to ensure consistency)
-- UPDATE orders SET total_amount = (
--   SELECT COALESCE(SUM(total_price), 0)
--   FROM order_items
--   WHERE order_id = orders.id
-- );

-- Sample data for testing reports
-- This will be populated automatically as users interact with the system

-- Note: To use this script effectively:
-- 1. First create test user accounts through the application
-- 2. Get the actual UUIDs of the created users
-- 3. Replace the placeholder UUIDs in this script with actual UUIDs
-- 4. Run the modified script

-- Alternative: You can also insert data directly through the application interface
-- which will automatically handle the relationships and constraints 