import { supabase } from '../lib/supabase';

// Test function to check database connectivity and data
export const testDatabaseConnection = async () => {
  try {
    console.log('Testing database connection...');
    
    // Test 1: Check if we can connect to the database
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user);
    
    if (!user) {
      console.log('No user logged in');
      return;
    }
    
    // Test 2: Check user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
    } else {
      console.log('User profile:', profile);
    }
    
    // Test 3: Check all orders in database
    const { data: allOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*');
    
    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
    } else {
      console.log('All orders in database:', allOrders);
    }
    
    // Test 4: Check orders for current user (if supplier)
    if (profile?.user_type === 'supplier') {
      const { data: supplierOrders, error: supplierOrdersError } = await supabase
        .from('orders')
        .select('*')
        .eq('supplier_id', user.id);
      
      if (supplierOrdersError) {
        console.error('Error fetching supplier orders:', supplierOrdersError);
      } else {
        console.log('Orders for current supplier:', supplierOrders);
      }
    }
    
    // Test 5: Check all products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*');
    
    if (productsError) {
      console.error('Error fetching products:', productsError);
    } else {
      console.log('All products in database:', products);
    }
    
    // Test 6: Check all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    } else {
      console.log('All profiles in database:', profiles);
    }
    
  } catch (error) {
    console.error('Database test error:', error);
  }
};

// Function to create sample data for testing
export const createSampleData = async () => {
  try {
    console.log('Creating sample data...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No user logged in');
      return;
    }
    
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profile?.user_type === 'supplier') {
      console.log('Current user is a supplier, creating sample orders...');
      
      // Create a sample vendor profile if it doesn't exist
      const { data: vendors } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'vendor')
        .limit(1);
      
      let vendorId;
      if (vendors && vendors.length > 0) {
        vendorId = vendors[0].id;
        console.log('Using existing vendor:', vendors[0]);
      } else {
        console.log('No vendors found in database');
        return;
      }
      
      // Create sample orders
      const sampleOrders = [
        {
          vendor_id: vendorId,
          supplier_id: user.id,
          status: 'pending',
          total_amount: 1500.00,
          shipping_address: '123 Test Street, Test City',
          notes: 'Sample order 1'
        },
        {
          vendor_id: vendorId,
          supplier_id: user.id,
          status: 'shipped',
          total_amount: 2500.00,
          shipping_address: '456 Sample Avenue, Sample Town',
          notes: 'Sample order 2'
        },
        {
          vendor_id: vendorId,
          supplier_id: user.id,
          status: 'delivered',
          total_amount: 3200.00,
          shipping_address: '789 Demo Road, Demo City',
          notes: 'Sample order 3'
        }
      ];
      
      for (const orderData of sampleOrders) {
        const { data: order, error } = await supabase
          .from('orders')
          .insert(orderData)
          .select()
          .single();
        
        if (error) {
          console.error('Error creating sample order:', error);
        } else {
          console.log('Created sample order:', order);
        }
      }
    }
    
  } catch (error) {
    console.error('Error creating sample data:', error);
  }
};
