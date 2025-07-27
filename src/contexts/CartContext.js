import React, { createContext, useContext, useState, useEffect } from 'react';

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

  // Load cart from localStorage on component mount
  useEffect(() => {
    const savedCart = localStorage.getItem('vendorCart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (err) {
        console.error('Error loading cart from localStorage:', err);
        localStorage.removeItem('vendorCart');
      }
    }
  }, []);

  // Save cart to localStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem('vendorCart', JSON.stringify(cart));
  }, [cart]);

  // Add item to cart
  const addToCart = (product, quantity = 1) => {
    const price = parseFloat(product.price) || 0;
    const qty = parseInt(quantity) || 1;

    const cartItem = {
      id: product.id,
      name: product.name || 'Unknown Product',
      price: price,
      quantity: qty,
      total: price * qty,
      image_url: product.image_url,
      supplier_id: product.supplier_id
    };

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        const newQuantity = (existingItem.quantity || 0) + qty;
        const itemPrice = parseFloat(existingItem.price) || 0;
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: newQuantity, total: newQuantity * itemPrice }
            : item
        );
      } else {
        return [...prevCart, cartItem];
      }
    });
  };

  // Update item quantity
  const updateQuantity = (productId, newQuantity) => {
    const qty = parseInt(newQuantity) || 0;

    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId
          ? { ...item, quantity: qty, total: (parseFloat(item.price) || 0) * qty }
          : item
      )
    );
  };

  // Remove item from cart
  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  // Clear entire cart
  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('vendorCart');
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

  const value = {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartTotals,
    isInCart,
    getItemQuantity
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
