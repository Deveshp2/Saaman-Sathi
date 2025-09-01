import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartAPI } from '../lib/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Load cart from database when user is authenticated
  useEffect(() => {
    if (user) {
      loadCart();
    } else {
      setCart([]);
    }
  }, [user]);

  // Load cart from database
  const loadCart = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const cartItems = await cartAPI.getCart();

      // Transform database cart items to match the expected format
      const transformedCart = cartItems.map(item => ({
        id: item.product_id,
        cartItemId: item.id, // Store the cart table ID for updates/deletes
        name: item.products?.name || 'Unknown Product',
        price: parseFloat(item.unit_price),
        quantity: item.quantity,
        total: item.quantity * parseFloat(item.unit_price),
        image_url: item.products?.image_url,
        supplier_id: item.products?.supplier_id,
        stock_quantity: item.products?.stock_quantity,
        is_active: item.products?.is_active
      }));

      setCart(transformedCart);
    } catch (err) {
      console.error('Error loading cart:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add item to cart
  const addToCart = async (product, quantity = 1) => {
    if (!user) {
      setError('Please log in to add items to cart');
      return;
    }

    try {
      setError(null);
      const price = parseFloat(product.price) || 0;
      const qty = parseInt(quantity) || 1;

      await cartAPI.addToCart(product.id, qty, price);
      await loadCart(); // Reload cart to get updated data
    } catch (err) {
      console.error('Error adding to cart:', err);
      setError(err.message);
      throw err;
    }
  };

  // Update item quantity
  const updateQuantity = async (productId, newQuantity) => {
    if (!user) {
      setError('Please log in to update cart');
      return;
    }

    try {
      setError(null);
      const qty = parseInt(newQuantity) || 0;

      // Find the cart item to get the cartItemId
      const cartItem = cart.find(item => item.id === productId);
      if (!cartItem) {
        throw new Error('Item not found in cart');
      }

      if (qty <= 0) {
        await removeFromCart(productId);
        return;
      }

      await cartAPI.updateCartItem(cartItem.cartItemId, qty);
      await loadCart(); // Reload cart to get updated data
    } catch (err) {
      console.error('Error updating cart quantity:', err);
      setError(err.message);
      throw err;
    }
  };

  // Remove item from cart
  const removeFromCart = async (productId) => {
    if (!user) {
      setError('Please log in to remove items from cart');
      return;
    }

    try {
      setError(null);

      // Find the cart item to get the cartItemId
      const cartItem = cart.find(item => item.id === productId);
      if (!cartItem) {
        throw new Error('Item not found in cart');
      }

      await cartAPI.removeFromCart(cartItem.cartItemId);
      await loadCart(); // Reload cart to get updated data
    } catch (err) {
      console.error('Error removing from cart:', err);
      setError(err.message);
      throw err;
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    if (!user) {
      setError('Please log in to clear cart');
      return;
    }

    try {
      setError(null);
      await cartAPI.clearCart();
      setCart([]);
    } catch (err) {
      console.error('Error clearing cart:', err);
      setError(err.message);
      throw err;
    }
  };

  // Get cart totals
  const getCartTotals = () => {
    const totalItems = cart.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    const totalAmount = cart.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    return { totalItems, totalAmount };
  };

  // Check if item is in cart
  const isInCart = (productId) => {
    return cart.some(item => item.id === productId);
  };

  // Get item quantity in cart
  const getItemQuantity = (productId) => {
    const item = cart.find(item => item.id === productId);
    return item ? item.quantity : 0;
  };

  // Purchase all items in cart
  const purchaseCart = async (shippingAddress = '', notes = '') => {
    if (!user) {
      setError('Please log in to purchase items');
      return;
    }

    try {
      setError(null);
      const orders = await cartAPI.purchaseCart(shippingAddress, notes);
      await loadCart(); // Reload cart (should be empty now)
      return orders;
    } catch (err) {
      console.error('Error purchasing cart:', err);
      setError(err.message);
      throw err;
    }
  };

  const value = {
    cart,
    loading,
    error,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartTotals,
    isInCart,
    getItemQuantity,
    purchaseCart,
    loadCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
