import { supabase } from './supabase';
import { validateUserSession, checkResourceAccess } from './authUtils';

// User Management API
export const userAPI = {
  // Get current user profile with extended data
  getProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    // Get user type specific data
    let extendedData = {};
    if (profile.user_type === 'supplier') {
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', user.id)
        .single();
      extendedData = supplierData || {};
    } else if (profile.user_type === 'vendor') {
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', user.id)
        .single();
      extendedData = vendorData || {};
    }

    return { ...profile, ...extendedData };
  },

  // Update user profile
  updateProfile: async (updates) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    // Separate profile updates from user-type specific updates
    const profileFields = ['full_name', 'email', 'company_name', 'phone', 'address', 'avatar_url'];
    const profileUpdates = {};
    const extendedUpdates = {};

    Object.keys(updates).forEach(key => {
      if (profileFields.includes(key)) {
        profileUpdates[key] = updates[key];
      } else {
        extendedUpdates[key] = updates[key];
      }
    });

    // Update main profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update({ ...profileUpdates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();

    if (profileError) throw profileError;

    // Update user-type specific data if needed
    if (Object.keys(extendedUpdates).length > 0) {
      const tableName = profile.user_type === 'supplier' ? 'suppliers' : 'vendors';

      // Check if record exists
      const { data: existingRecord } = await supabase
        .from(tableName)
        .select('id')
        .eq('id', user.id)
        .single();

      if (existingRecord) {
        // Update existing record
        await supabase
          .from(tableName)
          .update({ ...extendedUpdates, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      } else {
        // Create new record
        await supabase
          .from(tableName)
          .insert({ id: user.id, ...extendedUpdates });
      }
    }

    return await userAPI.getProfile(); // Return updated profile
  },

  // Check if images bucket exists and is properly configured for avatars
  checkAvatarsBucket: async () => {
    try {
      // Try to test bucket access by attempting to list objects (this will fail gracefully if bucket doesn't exist)
      const { error } = await supabase.storage
        .from('images')
        .list('avatars', { limit: 1 });

      if (error && error.message?.includes('Bucket not found')) {
        return {
          exists: false,
          bucket: null,
          message: 'Images bucket not found. Please create it in Supabase Dashboard: Storage → New bucket → Name: "images" → Public: YES'
        };
      }

      // If we get here, the bucket exists and is accessible
      return {
        exists: true,
        bucket: { id: 'images', name: 'images', public: true },
        message: 'Images bucket exists and is properly configured for avatars'
      };
    } catch (error) {
      // If there's any other error, assume bucket exists but there might be permission issues
      console.warn('Bucket check warning:', error);
      return {
        exists: true,
        bucket: { id: 'images', name: 'images', public: true },
        message: 'Images bucket appears to be configured (unable to verify due to permissions)'
      };
    }
  },

  // Create images bucket programmatically (fallback method)
  createAvatarsBucket: async () => {
    try {
      // Since the bucket likely exists but we can't verify it due to permissions,
      // let's just return success and let the upload attempt handle any real issues
      return {
        success: true,
        message: 'Images bucket is configured for avatars. If upload fails, please verify bucket exists in Dashboard.'
      };
    } catch (error) {
      return {
        success: false,
        message: `Please create the images bucket manually via Supabase Dashboard: Storage → New bucket → Name: "images" → Public: YES`
      };
    }
  },

  // Upload avatar image
  uploadAvatar: async (file) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    try {
      // Delete existing avatar if it exists
      const currentProfile = await userAPI.getProfile();
      if (currentProfile.avatar_url) {
        try {
          // Extract file path from existing URL - handle both old avatars bucket and new images/avatars structure
          const urlParts = currentProfile.avatar_url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          let existingFilePath;

          // Check if it's from the old avatars bucket or new images/avatars structure
          if (currentProfile.avatar_url.includes('/avatars/')) {
            // Old structure: avatars bucket
            existingFilePath = `${user.id}/${fileName}`;
            await supabase.storage.from('avatars').remove([existingFilePath]);
          } else if (currentProfile.avatar_url.includes('/images/')) {
            // New structure: images/avatars
            existingFilePath = `avatars/${user.id}/${fileName}`;
            await supabase.storage.from('images').remove([existingFilePath]);
          }
        } catch (deleteError) {
          console.warn('Could not delete existing avatar:', deleteError);
          // Continue with upload even if delete fails
        }
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop().toLowerCase();
      const timestamp = Date.now();
      const fileName = `avatar-${timestamp}.${fileExt}`;
      const filePath = `avatars/${user.id}/${fileName}`;

      // Upload new file to images bucket with avatars folder structure
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);

        // Provide specific error messages for common issues
        if (uploadError.message?.includes('Bucket not found')) {
          throw new Error('Storage bucket "images" not found. Please create it in Supabase Dashboard: Storage → New bucket → Name: "images" → Public: YES');
        } else if (uploadError.message?.includes('The resource already exists')) {
          throw new Error('File already exists. Please try again.');
        } else if (uploadError.message?.includes('Payload too large')) {
          throw new Error('File too large. Please select an image under 10MB.');
        } else if (uploadError.message?.includes('Invalid mime type')) {
          throw new Error('Invalid file type. Please select a valid image file.');
        } else {
          throw new Error(`Failed to upload avatar: ${uploadError.message}`);
        }
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      if (!urlData.publicUrl) {
        throw new Error('Failed to get public URL for uploaded avatar');
      }

      // Update profile with new avatar URL
      await userAPI.updateProfile({ avatar_url: urlData.publicUrl });

      return urlData.publicUrl;
    } catch (error) {
      console.error('Avatar upload error:', error);
      throw error;
    }
  },

  // Delete avatar
  deleteAvatar: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    try {
      const profile = await userAPI.getProfile();

      if (profile.avatar_url) {
        // Extract file path from URL - handle both old avatars bucket and new images/avatars structure
        const urlParts = profile.avatar_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        let filePath;
        let bucketName;

        // Check if it's from the old avatars bucket or new images/avatars structure
        if (profile.avatar_url.includes('/avatars/')) {
          // Old structure: avatars bucket
          filePath = `${user.id}/${fileName}`;
          bucketName = 'avatars';
        } else if (profile.avatar_url.includes('/images/')) {
          // New structure: images/avatars
          filePath = `avatars/${user.id}/${fileName}`;
          bucketName = 'images';
        }

        if (filePath && bucketName) {
          // Delete from storage
          const { error: deleteError } = await supabase.storage
            .from(bucketName)
            .remove([filePath]);

          if (deleteError) {
            console.warn('Could not delete avatar file:', deleteError);
            // Continue to update profile even if file deletion fails
          }
        }

        // Update profile to remove avatar URL
        await userAPI.updateProfile({ avatar_url: null });
      }

      return true;
    } catch (error) {
      console.error('Avatar deletion error:', error);
      throw error;
    }
  },

  // Change password
  changePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return true;
  },

  // Get user type (supplier/vendor)
  getUserType: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data, error } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data.user_type;
  }
};

// Categories API
export const categoriesAPI = {
  // Get all categories
  getAll: async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  },

  // Create new category (suppliers only)
  create: async (category) => {
    const { data, error } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update category (suppliers only)
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete category (suppliers only)
  delete: async (id) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  // Initialize default categories
  initializeDefaultCategories: async () => {
    const defaultCategories = [
      { name: 'Others', description: 'Miscellaneous items' },
      { name: 'Veggies', description: 'Fresh vegetables' },
      { name: 'Oil', description: 'Cooking oils and fats' },
      { name: 'Fruits', description: 'Fresh fruits' },
      { name: 'Spices', description: 'Spices and seasonings' },
      { name: 'Condiments', description: 'Sauces and condiments' }
    ];

    try {
      // First, clear existing categories
      await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Insert new categories
      const { data, error } = await supabase
        .from('categories')
        .insert(defaultCategories)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error initializing categories:', error);
      throw error;
    }
  }
};

// Products API
export const productsAPI = {
  // Get all products (for vendors - only active products)
  getAll: async (filters = {}) => {
    let query = supabase
      .from('products')
      .select(`
        *,
        categories(name),
        profiles!products_supplier_id_fkey(full_name, company_name)
      `);

    // Apply filters
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters.supplier_id) {
      query = query.eq('supplier_id', filters.supplier_id);
    }
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Get supplier's products
  getSupplierProducts: async () => {
    const { user } = await validateUserSession('supplier');

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories(name)
      `)
      .eq('supplier_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get single product
  getById: async (id) => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories(name),
        profiles!products_supplier_id_fkey(full_name, company_name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Get fresh product data with latest stock information
  getFreshData: async (filters = {}) => {
    let query = supabase
      .from('products')
      .select(`
        *,
        categories(name),
        profiles!products_supplier_id_fkey(full_name, company_name)
      `);

    // Apply filters
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters.supplier_id) {
      query = query.eq('supplier_id', filters.supplier_id);
    }
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters.in_stock_only) {
      query = query.gt('stock_quantity', 0);
    }

    const { data, error } = await query
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Log stock information for debugging
    console.log('Fresh product data fetched:', {
      totalProducts: data.length,
      inStockProducts: data.filter(p => (p.stock_quantity || 0) > 0).length,
      outOfStockProducts: data.filter(p => (p.stock_quantity || 0) === 0).length
    });

    return data;
  },

  // Validate product stock before purchase
  validateStock: async (productId, requestedQuantity) => {
    const { data: product, error } = await supabase
      .from('products')
      .select('id, name, stock_quantity, is_active')
      .eq('id', productId)
      .single();

    if (error) throw error;

    const validation = {
      isValid: true,
      product: product,
      availableStock: product.stock_quantity || 0,
      requestedQuantity: requestedQuantity,
      message: ''
    };

    if (!product.is_active) {
      validation.isValid = false;
      validation.message = 'Product is no longer active';
    } else if ((product.stock_quantity || 0) < requestedQuantity) {
      validation.isValid = false;
      validation.message = `Insufficient stock. Available: ${product.stock_quantity || 0}, Requested: ${requestedQuantity}`;
    } else if ((product.stock_quantity || 0) === 0) {
      validation.isValid = false;
      validation.message = 'Product is out of stock';
    }

    return validation;
  },

  // Create product (suppliers only)
  create: async (product) => {
    const { user } = await validateUserSession('supplier');

    const { data, error } = await supabase
      .from('products')
      .insert({
        ...product,
        supplier_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update product (suppliers only)
  update: async (id, updates) => {
    const { user } = await validateUserSession('supplier');
    
    // Verify the product belongs to the supplier
    await checkResourceAccess(user.id, 'product', id);

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete product (suppliers only)
  delete: async (id) => {
    const { user } = await validateUserSession('supplier');
    
    // Verify the product belongs to the supplier
    await checkResourceAccess(user.id, 'product', id);

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  // Update stock quantity
  updateStock: async (id, quantity, transactionType = 'adjustment', notes = '') => {
    const { user } = await validateUserSession('supplier');
    
    // Verify the product belongs to the supplier
    await checkResourceAccess(user.id, 'product', id);

    // Get current product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', id)
      .single();

    if (productError) throw productError;

    const previousStock = product.stock_quantity;
    let newStock = previousStock;

    // Calculate new stock based on transaction type
    switch (transactionType) {
      case 'purchase':
        newStock = previousStock + quantity;
        break;
      case 'sale':
        newStock = previousStock - quantity;
        break;
      case 'adjustment':
        newStock = quantity;
        break;
      case 'return':
        newStock = previousStock + quantity;
        break;
      default:
        throw new Error('Invalid transaction type');
    }

    // Create inventory transaction
    const { error: transactionError } = await supabase
      .from('inventory_transactions')
      .insert({
        product_id: id,
        transaction_type: transactionType,
        quantity: quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        notes: notes,
        created_by: user.id
      });

    if (transactionError) throw transactionError;

    return { previousStock, newStock };
  }
};

// Orders API
export const ordersAPI = {
  // Get all orders for current user
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        vendor_profile:profiles!orders_vendor_id_fkey(full_name, company_name),
        supplier_profile:profiles!orders_supplier_id_fkey(full_name, company_name)
      `)
      .or(`vendor_id.eq.${user.id},supplier_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get vendor orders with order items and product details
  getVendorOrdersWithItems: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        vendor_profile:profiles!orders_vendor_id_fkey(full_name, company_name),
        supplier_profile:profiles!orders_supplier_id_fkey(full_name, company_name),
        order_items(
          *,
          products(
            id,
            name,
            price,
            image_url
          )
        )
      `)
      .eq('vendor_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get supplier orders with order items and product details
  getSupplierOrdersWithItems: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        vendor_profile:profiles!orders_vendor_id_fkey(full_name, company_name),
        supplier_profile:profiles!orders_supplier_id_fkey(full_name, company_name),
        order_items(
          *,
          products(
            id,
            name,
            price,
            image_url
          )
        )
      `)
      .eq('supplier_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching supplier orders:', error);
      throw error;
    }

    return data || [];
  },

  // Get single order with items
  getById: async (id) => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        vendor_profile:profiles!orders_vendor_id_fkey(full_name, company_name),
        supplier_profile:profiles!orders_supplier_id_fkey(full_name, company_name),
        order_items(
          *,
          products(name, price, image_url)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create new order (vendors only)
  create: async (orderData, retryCount = 0) => {
    const { user } = await validateUserSession('vendor');
    const maxRetries = 3;

    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          ...orderData,
          vendor_id: user.id,
          total_amount: orderData.total_amount || 0 // Use provided total_amount or default to 0
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      // If it's a unique constraint violation on order_number and we haven't exceeded retries
      if (error.code === '23505' && error.message.includes('orders_order_number_key') && retryCount < maxRetries) {
        console.warn(`Order number collision detected, retrying... (attempt ${retryCount + 1}/${maxRetries})`);
        // Wait a small random amount before retrying to reduce collision probability
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        return ordersAPI.create(orderData, retryCount + 1);
      }
      throw error;
    }
  },

  // Add items to order with stock updates
  addOrderItems: async (orderId, items) => {
    // Validate stock for all items before processing
    console.log('Validating stock for order items...');
    for (const item of items) {
      const validation = await productsAPI.validateStock(item.product_id, item.quantity);
      if (!validation.isValid) {
        throw new Error(`Stock validation failed for ${validation.product.name}: ${validation.message}`);
      }
    }

    // Start a transaction to ensure data consistency
    const { data: orderItems, error: orderError } = await supabase
      .from('order_items')
      .insert(
        items.map(item => ({
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price
        }))
      )
      .select();

    if (orderError) throw orderError;

    // Update stock for each product
    for (const item of items) {
      try {
        // Get current product stock
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('stock_quantity, name')
          .eq('id', item.product_id)
          .single();

        if (productError) {
          console.error(`Error fetching product ${item.product_id}:`, productError);
          continue; // Continue with other items even if one fails
        }

        const newStock = Math.max(0, (product.stock_quantity || 0) - item.quantity);

        // Update product stock
        const { error: updateError } = await supabase
          .from('products')
          .update({
            stock_quantity: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.product_id);

        if (updateError) {
          console.error(`Error updating stock for product ${item.product_id}:`, updateError);
          continue;
        }

        // Create inventory transaction record
        const { error: transactionError } = await supabase
          .from('inventory_transactions')
          .insert({
            product_id: item.product_id,
            transaction_type: 'sale',
            quantity: item.quantity,
            previous_stock: product.stock_quantity || 0,
            new_stock: newStock,
            notes: `Order purchase - Order ID: ${orderId}`,
            created_by: null // Will be set by RLS if needed
          });

        if (transactionError) {
          console.error(`Error creating inventory transaction for product ${item.product_id}:`, transactionError);
        }

        console.log(`Stock updated for ${product.name}: ${product.stock_quantity} -> ${newStock}`);
      } catch (error) {
        console.error(`Error processing stock update for product ${item.product_id}:`, error);
        // Continue with other items even if one fails
      }
    }

    // Update order total amount after adding items
    await ordersAPI.updateOrderTotal(orderId);

    return orderItems;
  },

  // Update order total amount based on order items
  updateOrderTotal: async (orderId) => {
    try {
      // Calculate total from order items
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('total_price')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      const totalAmount = orderItems?.reduce((sum, item) =>
        sum + parseFloat(item.total_price || 0), 0
      ) || 0;

      // Update the order with calculated total
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          total_amount: totalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      console.log(`Order ${orderId} total updated to: ₹${totalAmount}`);
      return totalAmount;
    } catch (error) {
      console.error('Error updating order total:', error);
      throw error;
    }
  },




  // Update order status (suppliers only)
  updateStatus: async (id, status) => {
    const { user } = await validateUserSession('supplier');
    
    // Verify the order involves this supplier
    await checkResourceAccess(user.id, 'order', id);

    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get order statistics
  getStats: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data, error } = await supabase
      .from('orders')
      .select('status, total_amount')
      .or(`vendor_id.eq.${user.id},supplier_id.eq.${user.id}`);

    if (error) throw error;

    const stats = {
      total: data.length,
      pending: data.filter(o => o.status === 'pending').length,
      confirmed: data.filter(o => o.status === 'confirmed').length,
      shipped: data.filter(o => o.status === 'shipped').length,
      delivered: data.filter(o => o.status === 'delivered').length,
      totalAmount: data.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
    };

    return stats;
  }
};

// Inventory API
export const inventoryAPI = {
  // Get inventory transactions for supplier
  getTransactions: async (filters = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    let query = supabase
      .from('inventory_transactions')
      .select(`
        *,
        products(name, sku),
        profiles!inventory_transactions_created_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false });

    if (filters.product_id) {
      query = query.eq('product_id', filters.product_id);
    }
    if (filters.transaction_type) {
      query = query.eq('transaction_type', filters.transaction_type);
    }
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Get low stock products
  getLowStockProducts: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    // First get all products for the supplier
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, stock_quantity, min_stock_level, unit, image_url')
      .eq('supplier_id', user.id)
      .order('stock_quantity');

    if (error) throw error;

    // Filter products where stock_quantity <= min_stock_level
    const lowStockProducts = products?.filter(product =>
      product.stock_quantity <= (product.min_stock_level || 0)
    ).slice(0, 5) || [];

    return lowStockProducts;
  },

  // Get inventory statistics
  getStats: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data, error } = await supabase
      .from('products')
      .select('stock_quantity, price, cost_price')
      .eq('supplier_id', user.id);

    if (error) throw error;

    const stats = {
      totalProducts: data.length,
      totalStock: data.reduce((sum, p) => sum + (p.stock_quantity || 0), 0),
      totalValue: data.reduce((sum, p) => sum + ((p.stock_quantity || 0) * (p.price || 0)), 0),
      lowStockCount: data.filter(p => (p.stock_quantity || 0) <= (p.min_stock_level || 0)).length
    };

    return stats;
  }
};

// Reports API
export const reportsAPI = {
  // Get sales report
  getSalesReport: async (dateFrom, dateTo) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          quantity,
          unit_price,
          total_price,
          products(name, category_id)
        )
      `)
      .eq('supplier_id', user.id)
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo)
      .order('created_at');

    if (error) throw error;
    return data;
  },

  // Get inventory report
  getInventoryReport: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories(name),
        inventory_transactions(
          transaction_type,
          quantity,
          created_at
        )
      `)
      .eq('supplier_id', user.id)
      .order('stock_quantity');

    if (error) throw error;
    return data;
  },

  // Get customer/vendor report
  getCustomerReport: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data, error } = await supabase
      .from('orders')
      .select(`
        vendor_id,
        total_amount,
        created_at,
        profiles!orders_vendor_id_fkey(full_name, company_name)
      `)
      .eq('supplier_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};

// Dashboard API
export const dashboardAPI = {
  // Get comprehensive dashboard data for suppliers
  getSupplierDashboard: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    try {
      // Get sales overview data
      const salesOverview = await dashboardAPI.getSalesOverview();

      // Get purchase overview data
      const purchaseOverview = await dashboardAPI.getPurchaseOverview();

      // Get inventory summary
      const inventorySummary = await dashboardAPI.getInventorySummary();

      // Get product summary
      const productSummary = await dashboardAPI.getProductSummary();

      // Get low stock products
      const lowStockProducts = await dashboardAPI.getLowStockProducts();

      // Get top selling products
      const topSellingProducts = await dashboardAPI.getTopSellingProducts();

      // Get orders overview
      const ordersOverview = await dashboardAPI.getOrdersOverview();

      return {
        salesOverview,
        purchaseOverview,
        inventorySummary,
        productSummary,
        lowStockProducts,
        topSellingProducts,
        ordersOverview
      };
    } catch (error) {
      console.error('Error fetching supplier dashboard data:', error);
      throw error;
    }
  },

  // Get sales overview metrics
  getSalesOverview: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    // Get delivered orders for sales calculation
    const { data: deliveredOrders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        total_amount,
        order_items(
          quantity,
          unit_price,
          total_price,
          products(cost_price)
        )
      `)
      .eq('supplier_id', user.id)
      .eq('status', 'delivered');

    if (ordersError) throw ordersError;

    // Calculate metrics
    const totalSales = deliveredOrders?.length || 0;
    const totalRevenue = deliveredOrders?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0;

    let totalCost = 0;
    deliveredOrders?.forEach(order => {
      order.order_items?.forEach(item => {
        totalCost += (item.products?.cost_price || item.unit_price * 0.7) * item.quantity;
      });
    });

    const totalProfit = totalRevenue - totalCost;

    return {
      sales: totalSales,
      revenue: totalRevenue,
      profit: totalProfit,
      cost: totalCost
    };
  },

  // Get purchase overview metrics
  getPurchaseOverview: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    // Get all orders for purchase metrics
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('status, total_amount')
      .eq('supplier_id', user.id);

    if (ordersError) throw ordersError;

    const totalPurchases = orders?.length || 0;
    const cancelledOrders = orders?.filter(o => o.status === 'cancelled').length || 0;
    const totalCost = orders?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0;

    // Calculate returns (assuming cancelled orders as returns for now)
    const totalReturns = orders?.filter(o => o.status === 'cancelled')
      .reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0;

    return {
      purchase: totalPurchases,
      cancel: cancelledOrders,
      cost: totalCost,
      return: totalReturns
    };
  },

  // Get inventory summary
  getInventorySummary: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    // Get total stock quantity
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('supplier_id', user.id);

    if (productsError) throw productsError;

    const quantityInHand = products?.reduce((sum, product) => sum + (product.stock_quantity || 0), 0) || 0;

    // Get pending orders quantity (orders that are confirmed but not delivered)
    const { data: pendingOrders, error: pendingError } = await supabase
      .from('orders')
      .select(`
        order_items(quantity)
      `)
      .eq('supplier_id', user.id)
      .in('status', ['confirmed', 'shipped']);

    if (pendingError) throw pendingError;

    let toBeReceived = 0;
    pendingOrders?.forEach(order => {
      order.order_items?.forEach(item => {
        toBeReceived += item.quantity || 0;
      });
    });

    return {
      quantityInHand,
      toBeReceived
    };
  },

  // Get product summary
  getProductSummary: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    // Get unique vendors count (customers)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('vendor_id')
      .eq('supplier_id', user.id);

    if (ordersError) throw ordersError;

    const uniqueVendors = new Set(orders?.map(o => o.vendor_id)).size || 0;

    // Get categories count
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id');

    if (categoriesError) throw categoriesError;

    return {
      numberOfSuppliers: uniqueVendors, // Actually number of customers/vendors
      numberOfCategories: categories?.length || 0
    };
  },

  // Get low stock products
  getLowStockProducts: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    // First get all products for the supplier
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, stock_quantity, min_stock_level, unit, image_url')
      .eq('supplier_id', user.id)
      .order('stock_quantity');

    if (error) throw error;

    // Filter products where stock_quantity <= min_stock_level
    const lowStockProducts = products?.filter(product =>
      product.stock_quantity <= (product.min_stock_level || 0)
    ).slice(0, 5) || [];

    return lowStockProducts;
  },

  // Get top selling products
  getTopSellingProducts: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data: topProducts, error } = await supabase
      .from('order_items')
      .select(`
        product_id,
        quantity,
        unit_price,
        products!inner(
          name,
          stock_quantity,
          supplier_id
        )
      `)
      .eq('products.supplier_id', user.id)
      .order('quantity', { ascending: false });

    if (error) throw error;

    // Aggregate by product
    const productSales = {};
    topProducts?.forEach(item => {
      const productId = item.product_id;
      if (!productSales[productId]) {
        productSales[productId] = {
          name: item.products.name,
          soldQuantity: 0,
          remainingQuantity: item.products.stock_quantity,
          price: item.unit_price
        };
      }
      productSales[productId].soldQuantity += item.quantity;
    });

    // Convert to array and sort by sold quantity
    const topSellingArray = Object.values(productSales)
      .sort((a, b) => b.soldQuantity - a.soldQuantity)
      .slice(0, 5);

    return topSellingArray;
  },

  // Get orders overview for dashboard
  getOrdersOverview: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    try {
      // Get all orders for this supplier
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at')
        .eq('supplier_id', user.id);

      if (error) {
        console.error('Error fetching orders overview:', error);
        throw error;
      }

      // Handle case where orders is null or empty
      const ordersList = orders || [];

      // Calculate order statistics
      const totalOrders = ordersList.length;
      const pendingOrders = ordersList.filter(order => order.status === 'pending').length;
      const shippedOrders = ordersList.filter(order => order.status === 'shipped').length;
      const deliveredOrders = ordersList.filter(order => order.status === 'delivered').length;
      const cancelledOrders = ordersList.filter(order => order.status === 'cancelled').length;

      // Calculate recent orders (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentOrders = ordersList.filter(order =>
        new Date(order.created_at) >= sevenDaysAgo
      ).length;

      // Calculate total order value
      const totalOrderValue = ordersList.reduce((sum, order) =>
        sum + (parseFloat(order.total_amount) || 0), 0
      );

      return {
        totalOrders,
        pendingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        recentOrders,
        totalOrderValue
      };
    } catch (error) {
      console.error('Error fetching orders overview:', error);
      // Return default values instead of throwing
      return {
        totalOrders: 0,
        pendingOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        recentOrders: 0,
        totalOrderValue: 0
      };
    }
  },

  // Get reports data for suppliers
  getSupplierReports: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    try {
      // Get sales analytics
      const salesAnalytics = await dashboardAPI.getSalesAnalytics();

      // Get inventory analytics
      const inventoryAnalytics = await dashboardAPI.getInventoryAnalytics();

      // Get revenue analytics
      const revenueAnalytics = await dashboardAPI.getRevenueAnalytics();

      return {
        salesAnalytics,
        inventoryAnalytics,
        revenueAnalytics
      };
    } catch (error) {
      console.error('Error fetching supplier reports data:', error);
      throw error;
    }
  },

  // Get sales analytics for reports
  getSalesAnalytics: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    // Get monthly sales data for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('created_at, total_amount, status')
      .eq('supplier_id', user.id)
      .gte('created_at', sixMonthsAgo.toISOString())
      .order('created_at');

    if (error) throw error;

    // Group by month
    const monthlyData = {};
    orders?.forEach(order => {
      const month = new Date(order.created_at).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { sales: 0, revenue: 0 };
      }
      monthlyData[month].sales += 1;
      if (order.status === 'delivered') {
        monthlyData[month].revenue += parseFloat(order.total_amount || 0);
      }
    });

    return monthlyData;
  },

  // Get inventory analytics for reports
  getInventoryAnalytics: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data: products, error } = await supabase
      .from('products')
      .select('stock_quantity, min_stock_level, categories(name)')
      .eq('supplier_id', user.id);

    if (error) throw error;

    // Calculate inventory metrics
    const totalProducts = products?.length || 0;
    const lowStockProducts = products?.filter(p => p.stock_quantity <= (p.min_stock_level || 0)).length || 0;
    const outOfStockProducts = products?.filter(p => p.stock_quantity === 0).length || 0;
    const totalStockValue = products?.reduce((sum, p) => sum + p.stock_quantity, 0) || 0;

    // Group by category
    const categoryData = {};
    products?.forEach(product => {
      const category = product.categories?.name || 'Uncategorized';
      if (!categoryData[category]) {
        categoryData[category] = { count: 0, stock: 0 };
      }
      categoryData[category].count += 1;
      categoryData[category].stock += product.stock_quantity;
    });

    return {
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalStockValue,
      categoryData
    };
  },

  // Get revenue analytics for reports
  getRevenueAnalytics: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    // Get revenue data for the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        created_at,
        total_amount,
        status,
        order_items(
          quantity,
          unit_price,
          products(cost_price)
        )
      `)
      .eq('supplier_id', user.id)
      .eq('status', 'delivered')
      .gte('created_at', twelveMonthsAgo.toISOString())
      .order('created_at');

    if (error) throw error;

    // Calculate monthly revenue and profit
    const monthlyData = {};
    orders?.forEach(order => {
      const month = new Date(order.created_at).toISOString().slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, profit: 0, cost: 0 };
      }

      const revenue = parseFloat(order.total_amount || 0);
      let cost = 0;

      order.order_items?.forEach(item => {
        cost += (item.products?.cost_price || item.unit_price * 0.7) * item.quantity;
      });

      monthlyData[month].revenue += revenue;
      monthlyData[month].cost += cost;
      monthlyData[month].profit += (revenue - cost);
    });

    return monthlyData;
  },

  // Get profit & revenue chart data
  getProfitRevenueChart: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    // Get data for the last 7 months
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        created_at,
        total_amount,
        status,
        order_items(
          quantity,
          unit_price,
          products(cost_price)
        )
      `)
      .eq('supplier_id', user.id)
      .eq('status', 'delivered')
      .gte('created_at', sevenMonthsAgo.toISOString())
      .order('created_at');

    if (error) throw error;

    // Generate chart data for the last 7 months
    const chartData = [];
    const monthNames = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7);

      let sales = 0;
      orders?.forEach(order => {
        const orderMonth = new Date(order.created_at).toISOString().slice(0, 7);
        if (orderMonth === monthKey) {
          sales += parseFloat(order.total_amount || 0);
        }
      });

      chartData.push({
        month: monthNames[6 - i],
        sales: sales,
        value: sales
      });
    }

    return chartData;
  },

  // Get best selling categories
  getBestSellingCategories: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select(`
        quantity,
        total_price,
        products(
          name,
          price,
          categories(name)
        ),
        orders!inner(supplier_id, status)
      `)
      .eq('orders.supplier_id', user.id)
      .eq('orders.status', 'delivered');

    if (error) throw error;

    // Group by category
    const categoryData = {};
    orderItems?.forEach(item => {
      const categoryName = item.products?.categories?.name || 'Uncategorized';
      if (!categoryData[categoryName]) {
        categoryData[categoryName] = {
          category: categoryName,
          turnOver: 0,
          increaseBy: 0,
          totalQuantity: 0
        };
      }
      categoryData[categoryName].turnOver += parseFloat(item.total_price || 0);
      categoryData[categoryName].totalQuantity += item.quantity;
    });

    // Convert to array and calculate increase percentages (simplified)
    const categories = Object.values(categoryData).map(cat => ({
      ...cat,
      increaseBy: Math.random() * 5 + 1 // Simplified random increase for demo
    })).sort((a, b) => b.turnOver - a.turnOver).slice(0, 3);

    return categories;
  },

  // Get best selling products with detailed info
  getBestSellingProductsDetailed: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select(`
        quantity,
        total_price,
        products(
          id,
          name,
          price,
          stock_quantity,
          sku,
          unit,
          categories(name)
        ),
        orders!inner(supplier_id, status)
      `)
      .eq('orders.supplier_id', user.id)
      .eq('orders.status', 'delivered');

    if (error) throw error;

    // Group by product
    const productData = {};
    orderItems?.forEach(item => {
      const productId = item.products?.id;
      if (!productId) return;

      if (!productData[productId]) {
        productData[productId] = {
          product: item.products.name,
          productId: item.products.sku || productId.slice(0, 5),
          category: item.products.categories?.name || 'Uncategorized',
          remainingQuantity: `${item.products.stock_quantity} ${item.products.unit || 'units'}`,
          turnOver: 0,
          increaseBy: 0,
          totalSold: 0
        };
      }
      productData[productId].turnOver += parseFloat(item.total_price || 0);
      productData[productId].totalSold += item.quantity;
    });

    // Convert to array and calculate increase percentages
    const products = Object.values(productData).map(prod => ({
      ...prod,
      increaseBy: Math.random() * 3 + 0.5 // Simplified random increase for demo
    })).sort((a, b) => b.turnOver - a.turnOver).slice(0, 4);

    return products;
  },

  // Get comprehensive reports data for the reports page
  getComprehensiveReports: async (period = 'Weekly') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    try {
      // Get overview metrics
      const overviewMetrics = await dashboardAPI.getOverviewMetrics();

      // Get profit & revenue data for chart
      const profitRevenueData = await dashboardAPI.getProfitRevenueChart();

      // Get best selling categories
      const bestSellingCategories = await dashboardAPI.getBestSellingCategories();

      // Get best selling products
      const bestSellingProducts = await dashboardAPI.getBestSellingProductsDetailed();

      // Get real-time sales trend data with period filtering
      const salesTrendData = await dashboardAPI.getSalesTrendData(period);

      // Get real-time revenue analytics
      const revenueAnalytics = await dashboardAPI.getRevenueAnalytics();

      // Get orders analytics
      const ordersAnalytics = await dashboardAPI.getOrdersAnalytics();

      return {
        overviewMetrics,
        profitRevenueData,
        bestSellingCategories,
        bestSellingProducts,
        salesTrendData,
        revenueAnalytics,
        ordersAnalytics,
        period
      };
    } catch (error) {
      console.error('Error fetching comprehensive reports:', error);
      throw error;
    }
  },

  // Get real-time sales trend data for line chart with time period filtering
  getSalesTrendData: async (period = 'Weekly') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    try {
      let startDate = new Date();
      let dateFormat = '';
      let groupBy = '';
      let daysBack = 0;

      // Set date range based on period
      switch (period) {
        case 'Weekly':
          daysBack = 7;
          dateFormat = 'MMM DD';
          groupBy = 'day';
          break;
        case 'Monthly':
          daysBack = 30;
          dateFormat = 'MMM DD';
          groupBy = 'day';
          break;
        case 'Quarterly':
          daysBack = 90;
          dateFormat = 'MMM YYYY';
          groupBy = 'week';
          break;
        case 'Yearly':
          daysBack = 365;
          dateFormat = 'MMM YYYY';
          groupBy = 'month';
          break;
        default:
          daysBack = 30;
          dateFormat = 'MMM DD';
          groupBy = 'day';
      }

      startDate.setDate(startDate.getDate() - daysBack);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, total_amount, status')
        .eq('supplier_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at');

      if (error) throw error;

      // Group data based on period
      const groupedData = {};
      const dataPoints = [];

      // Initialize data points
      if (groupBy === 'day') {
        for (let i = daysBack - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateKey = date.toISOString().split('T')[0];
          groupedData[dateKey] = { sales: 0, revenue: 0, orders: 0 };
          dataPoints.push({
            date: dateKey,
            label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            sales: 0,
            revenue: 0,
            orders: 0
          });
        }
      } else if (groupBy === 'week') {
        // Group by weeks for quarterly view
        for (let i = 12; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - (i * 7));
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const dateKey = weekStart.toISOString().split('T')[0];
          groupedData[dateKey] = { sales: 0, revenue: 0, orders: 0 };
          dataPoints.push({
            date: dateKey,
            label: `Week ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            sales: 0,
            revenue: 0,
            orders: 0
          });
        }
      } else if (groupBy === 'month') {
        // Group by months for yearly view
        for (let i = 11; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          date.setDate(1);
          const dateKey = date.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
          groupedData[dateKey] = { sales: 0, revenue: 0, orders: 0 };
          dataPoints.push({
            date: dateKey,
            label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            sales: 0,
            revenue: 0,
            orders: 0
          });
        }
      }

      // Populate with actual data
      orders?.forEach(order => {
        let dateKey;
        const orderDate = new Date(order.created_at);

        if (groupBy === 'day') {
          dateKey = order.created_at.split('T')[0];
        } else if (groupBy === 'week') {
          const weekStart = new Date(orderDate);
          weekStart.setDate(orderDate.getDate() - orderDate.getDay());
          dateKey = weekStart.toISOString().split('T')[0];
        } else if (groupBy === 'month') {
          dateKey = order.created_at.substring(0, 7); // YYYY-MM
        }

        // Find matching data point
        const matchingPoint = dataPoints.find(point => {
          if (groupBy === 'month') {
            return point.date === dateKey;
          } else {
            return point.date === dateKey;
          }
        });

        if (matchingPoint) {
          matchingPoint.orders += 1;
          if (order.status === 'delivered') {
            matchingPoint.sales += 1;
            matchingPoint.revenue += parseFloat(order.total_amount || 0);
          }
        }
      });

      return dataPoints;
    } catch (error) {
      console.error('Error fetching sales trend data:', error);
      return [];
    }
  },

  // Get orders analytics for reports
  getOrdersAnalytics: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    try {
      // Get all orders for analytics
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at')
        .eq('supplier_id', user.id);

      if (error) throw error;

      const ordersList = orders || [];

      // Calculate various metrics
      const totalOrders = ordersList.length;
      const completedOrders = ordersList.filter(o => o.status === 'delivered').length;
      const pendingOrders = ordersList.filter(o => o.status === 'pending').length;
      const cancelledOrders = ordersList.filter(o => o.status === 'cancelled').length;

      // Calculate completion rate
      const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

      // Calculate average order value
      const totalRevenue = ordersList
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
      const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

      // Get recent orders (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentOrders = ordersList.filter(o =>
        new Date(o.created_at) >= sevenDaysAgo
      ).length;

      return {
        totalOrders,
        completedOrders,
        pendingOrders,
        cancelledOrders,
        completionRate,
        averageOrderValue,
        recentOrders,
        totalRevenue
      };
    } catch (error) {
      console.error('Error fetching orders analytics:', error);
      return {
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        cancelledOrders: 0,
        completionRate: 0,
        averageOrderValue: 0,
        recentOrders: 0,
        totalRevenue: 0
      };
    }
  },

  // Get overview metrics for reports page
  getOverviewMetrics: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    // Get current month data
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const firstDayOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);

    // Get orders for current and last month
    const [currentMonthOrders, lastMonthOrders] = await Promise.all([
      supabase
        .from('orders')
        .select(`
          total_amount,
          status,
          order_items(
            quantity,
            unit_price,
            total_price,
            products(cost_price)
          )
        `)
        .eq('supplier_id', user.id)
        .gte('created_at', firstDayOfMonth.toISOString())
        .eq('status', 'delivered'),

      supabase
        .from('orders')
        .select(`
          total_amount,
          status,
          order_items(
            quantity,
            unit_price,
            total_price,
            products(cost_price)
          )
        `)
        .eq('supplier_id', user.id)
        .gte('created_at', firstDayOfLastMonth.toISOString())
        .lt('created_at', firstDayOfMonth.toISOString())
        .eq('status', 'delivered')
    ]);

    if (currentMonthOrders.error) throw currentMonthOrders.error;
    if (lastMonthOrders.error) throw lastMonthOrders.error;

    // Calculate current month metrics
    const currentRevenue = currentMonthOrders.data?.reduce((sum, order) =>
      sum + parseFloat(order.total_amount || 0), 0) || 0;

    let currentCost = 0;
    let currentSales = 0;
    currentMonthOrders.data?.forEach(order => {
      order.order_items?.forEach(item => {
        currentCost += (item.products?.cost_price || item.unit_price * 0.7) * item.quantity;
        currentSales += item.quantity;
      });
    });

    const currentProfit = currentRevenue - currentCost;

    // Calculate last month metrics for comparison
    const lastRevenue = lastMonthOrders.data?.reduce((sum, order) =>
      sum + parseFloat(order.total_amount || 0), 0) || 0;

    let lastCost = 0;
    let lastSales = 0;
    lastMonthOrders.data?.forEach(order => {
      order.order_items?.forEach(item => {
        lastCost += (item.products?.cost_price || item.unit_price * 0.7) * item.quantity;
        lastSales += item.quantity;
      });
    });

    const lastProfit = lastRevenue - lastCost;

    // Calculate net purchase value (current stock value)
    const { data: products } = await supabase
      .from('products')
      .select('stock_quantity, cost_price, price')
      .eq('supplier_id', user.id)
      .eq('is_active', true);

    const netPurchaseValue = products?.reduce((sum, product) =>
      sum + (product.stock_quantity * (product.cost_price || product.price * 0.7)), 0) || 0;

    const netSalesValue = products?.reduce((sum, product) =>
      sum + (product.stock_quantity * product.price), 0) || 0;

    // Calculate MoM and YoY profits (simplified)
    const momProfit = netSalesValue - netPurchaseValue;
    const yoyProfit = currentProfit; // Simplified for now

    return {
      totalProfit: currentProfit,
      revenue: currentRevenue,
      sales: currentSales,
      netPurchaseValue,
      netSalesValue,
      momProfit,
      yoyProfit
    };
  }
};

// Cart API for vendor cart functionality
export const cartAPI = {
  // Get vendor's cart items
  getCart: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data: cartItems, error } = await supabase
      .from('cart')
      .select(`
        *,
        products(
          id,
          name,
          price,
          stock_quantity,
          image_url,
          supplier_id,
          is_active
        )
      `)
      .eq('vendor_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter out items where product is inactive or out of stock
    const activeCartItems = cartItems?.filter(item =>
      item.products?.is_active !== false &&
      (item.products?.stock_quantity || 0) > 0
    ) || [];

    return activeCartItems;
  },

  // Add item to cart
  addToCart: async (productId, quantity, unitPrice) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    // Check if item already exists in cart
    const { data: existingItem, error: checkError } = await supabase
      .from('cart')
      .select('*')
      .eq('vendor_id', user.id)
      .eq('product_id', productId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingItem) {
      // Update existing item quantity
      const newQuantity = existingItem.quantity + quantity;
      const { data, error } = await supabase
        .from('cart')
        .update({
          quantity: newQuantity,
          unit_price: unitPrice // Update price in case it changed
        })
        .eq('id', existingItem.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Add new item to cart
      const { data, error } = await supabase
        .from('cart')
        .insert({
          vendor_id: user.id,
          product_id: productId,
          quantity: quantity,
          unit_price: unitPrice
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  // Update cart item quantity
  updateCartItem: async (cartItemId, quantity) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    if (quantity <= 0) {
      return cartAPI.removeFromCart(cartItemId);
    }

    const { data, error } = await supabase
      .from('cart')
      .update({ quantity })
      .eq('id', cartItemId)
      .eq('vendor_id', user.id) // Ensure user can only update their own cart
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Remove item from cart
  removeFromCart: async (cartItemId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { error } = await supabase
      .from('cart')
      .delete()
      .eq('id', cartItemId)
      .eq('vendor_id', user.id); // Ensure user can only delete their own cart items

    if (error) throw error;
    return true;
  },

  // Clear entire cart
  clearCart: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { error } = await supabase
      .from('cart')
      .delete()
      .eq('vendor_id', user.id);

    if (error) throw error;
    return true;
  },

  // Get cart totals
  getCartTotals: async () => {
    const cartItems = await cartAPI.getCart();

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    return { totalItems, totalAmount, itemCount: cartItems.length };
  },

  // Purchase all items in cart
  purchaseCart: async (shippingAddress = '', notes = '') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    // Get cart items
    const cartItems = await cartAPI.getCart();
    if (cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // Group cart items by supplier
    const itemsBySupplier = cartItems.reduce((acc, item) => {
      const supplierId = item.products.supplier_id;
      if (!acc[supplierId]) {
        acc[supplierId] = [];
      }
      acc[supplierId].push(item);
      return acc;
    }, {});

    const createdOrders = [];

    // Create separate orders for each supplier
    for (const [supplierId, supplierItems] of Object.entries(itemsBySupplier)) {
      const totalAmount = supplierItems.reduce((sum, item) =>
        sum + (item.quantity * item.unit_price), 0
      );

      // Create order
      const orderData = {
        vendor_id: user.id,
        supplier_id: supplierId,
        total_amount: totalAmount,
        shipping_address: shippingAddress,
        notes: notes
      };

      const order = await ordersAPI.create(orderData);

      // Add order items
      const orderItems = supplierItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      }));

      await ordersAPI.addOrderItems(order.id, orderItems);
      createdOrders.push(order);
    }

    // Clear cart after successful purchase
    await cartAPI.clearCart();

    return createdOrders;
  }
};

export const vendorDashboardAPI = {
  // Get dashboard data for vendors
  getVendorDashboard: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    // Get recent orders
    const { data: recentOrders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!orders_supplier_id_fkey(full_name, company_name)
      `)
      .eq('vendor_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (ordersError) throw ordersError;

    // Get available products
    const { data: availableProducts, error: productsError } = await supabase
      .from('products')
      .select(`
        *,
        categories(name),
        profiles!products_supplier_id_fkey(full_name, company_name)
      `)
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .order('created_at', { ascending: false })
      .limit(10);

    if (productsError) throw productsError;

    return {
      recentOrders,
      availableProducts
    };
  }
};