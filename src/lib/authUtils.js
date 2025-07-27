import { supabase } from './supabase';

// Utility function to verify user type from profiles table
export const verifyUserType = async (userId, expectedUserType) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('user_type, full_name, company_name')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error('User profile not found');
    }

    if (profile.user_type !== expectedUserType) {
      throw new Error(`Access denied. This account is registered as a ${profile.user_type}, not a ${expectedUserType}.`);
    }

    return profile;
  } catch (error) {
    throw error;
  }
};

// Utility function to get user profile data
export const getUserProfile = async (userId) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error('User profile not found');
    }

    return profile;
  } catch (error) {
    throw error;
  }
};

// Utility function to check if user has access to a specific resource
export const checkResourceAccess = async (userId, resourceType, resourceId = null) => {
  try {
    const profile = await getUserProfile(userId);
    
    switch (resourceType) {
      case 'product':
        if (profile.user_type === 'supplier') {
          // Suppliers can only access their own products
          const { data: product, error } = await supabase
            .from('products')
            .select('supplier_id')
            .eq('id', resourceId)
            .single();
          
          if (error || product.supplier_id !== userId) {
            throw new Error('Access denied to this product');
          }
        } else if (profile.user_type === 'vendor') {
          // Vendors can only view active products
          const { data: product, error } = await supabase
            .from('products')
            .select('is_active')
            .eq('id', resourceId)
            .single();
          
          if (error || !product.is_active) {
            throw new Error('Product not available');
          }
        }
        break;
        
      case 'order':
        if (profile.user_type === 'supplier') {
          // Suppliers can only access orders they're involved in
          const { data: order, error } = await supabase
            .from('orders')
            .select('supplier_id')
            .eq('id', resourceId)
            .single();
          
          if (error || order.supplier_id !== userId) {
            throw new Error('Access denied to this order');
          }
        } else if (profile.user_type === 'vendor') {
          // Vendors can only access their own orders
          const { data: order, error } = await supabase
            .from('orders')
            .select('vendor_id')
            .eq('id', resourceId)
            .single();
          
          if (error || order.vendor_id !== userId) {
            throw new Error('Access denied to this order');
          }
        }
        break;
        
      default:
        throw new Error('Invalid resource type');
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Utility function to get user type from session
export const getUserTypeFromSession = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const profile = await getUserProfile(user.id);
    return profile.user_type;
  } catch (error) {
    console.error('Error getting user type:', error);
    return null;
  }
};

// Utility function to validate user session and type
export const validateUserSession = async (requiredUserType = null) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user');
    }

    const profile = await getUserProfile(user.id);
    
    if (requiredUserType && profile.user_type !== requiredUserType) {
      throw new Error(`Access denied. Required user type: ${requiredUserType}, Actual user type: ${profile.user_type}`);
    }

    return {
      user: {
        ...user,
        user_type: profile.user_type,
        full_name: profile.full_name,
        company_name: profile.company_name
      },
      profile
    };
  } catch (error) {
    throw error;
  }
}; 