import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useDataRefresh } from '../../contexts/DataRefreshContext';
import { ordersAPI } from '../../lib/api';
import { useToast } from '../ui/Toast';
import {
  Package,
  ShoppingCart,
  ShoppingBag,
  Settings,
  LogOut,
  Bell,
  User,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Loader2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const VendorCart = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { cart, loading, error: cartError, updateQuantity, removeFromCart, clearCart, getCartTotals, purchaseCart } = useCart();
  const { showToast, ToastContainer } = useToast();
  const { triggerPurchaseRefresh } = useDataRefresh();

  // State management
  const [error, setError] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/signin');
    }
  };

  const sidebarItems = [
    { icon: Package, label: 'Products', path: '/vendor/dashboard', active: location.pathname === '/vendor/dashboard' },
    { icon: ShoppingCart, label: 'Cart', path: '/vendor/cart', active: location.pathname === '/vendor/cart' },
    { icon: ShoppingBag, label: 'Orders', path: '/vendor/orders', active: location.pathname === '/vendor/orders' },
  ];

  const bottomItems = [
    { icon: Settings, label: 'Settings', path: '/vendor/settings' },
    { icon: LogOut, label: 'Log Out', onClick: handleSignOut },
  ];

  // Calculate totals
  const { totalItems, totalAmount: cartTotal } = getCartTotals();

  // Purchase all items
  const handlePurchaseAll = async () => {
    if (cart.length === 0) return;

    try {
      setPurchasing(true);
      setError(null);

      // Use the cart API to purchase all items
      const orders = await purchaseCart(shippingAddress, notes);

      setPurchaseSuccess(true);
      showToast(`Successfully created ${orders.length} order(s)!`, 'success');

      // Trigger global data refresh
      triggerPurchaseRefresh({
        cartPurchase: true,
        itemCount: cart.length,
        orderIds: orders.map(order => order.id)
      });

      // Navigate to orders page after delay
      setTimeout(() => {
        navigate('/vendor/orders');
      }, 2000);

    } catch (err) {
      console.error('Error purchasing cart items:', err);
      setError(err.message || 'Failed to purchase items');
      showToast('Failed to purchase items', 'error');
    } finally {
      setPurchasing(false);
    }
  };

  // Handle quantity change
  const handleQuantityChange = async (productId, newQuantity) => {
    try {
      await updateQuantity(productId, newQuantity);
    } catch (err) {
      showToast('Failed to update quantity', 'error');
    }
  };

  // Handle remove item
  const handleRemoveItem = async (productId) => {
    try {
      await removeFromCart(productId);
      showToast('Item removed from cart', 'success');
    } catch (err) {
      showToast('Failed to remove item', 'error');
    }
  };

  // Handle clear cart
  const handleClearCart = async () => {
    try {
      await clearCart();
      showToast('Cart cleared', 'success');
    } catch (err) {
      showToast('Failed to clear cart', 'error');
    }
  };

  return (
    <div className="flex h-screen bg-secondary-100">
      {/* Sidebar */}
      <div className="w-70 bg-white border-r border-secondary-200 flex flex-col">
        {/* Logo */}
        <div className="p-6">
          <h1 className="text-xl font-inter font-semibold text-primary-500">SAMAAN</h1>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-4">
          <div className="space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-lg transition-colors ${
                  item.active
                    ? 'bg-primary-50 text-primary-500'
                    : 'text-secondary-700 hover:bg-secondary-50'
                }`}
              >
                <item.icon className="w-6 h-6" />
                <span className="font-inter font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Items */}
        <div className="p-4 border-t border-secondary-200">
          <div className="space-y-2">
            {bottomItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick || (() => navigate(item.path))}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-lg transition-colors text-secondary-700 hover:bg-secondary-50"
              >
                <item.icon className="w-6 h-6" />
                <span className="font-inter font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-secondary-200 px-8 py-6">
          <div className="flex justify-between items-center">
            {/* Left Side */}
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-inter font-medium text-secondary-900">
                Shopping Cart
              </h1>
              <div className="flex items-center gap-2 text-sm text-secondary-600">
                <ShoppingCart className="w-4 h-4" />
                <span>{totalItems || 0} items</span>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-5">
              <button className="p-2 hover:bg-secondary-50 rounded-lg transition-colors">
                <Bell className="w-6 h-6 text-secondary-700" />
              </button>
              <div className="w-10 h-10 bg-secondary-300 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Cart Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {purchaseSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800">Purchase successful! Redirecting to orders...</span>
            </div>
          )}

          {(error || cartError) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">{error || cartError}</span>
            </div>
          )}

          {loading && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="text-blue-800">Loading cart...</span>
            </div>
          )}

          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-secondary-900 mb-2">Your cart is empty</h3>
              <p className="text-secondary-600 mb-6">Add some products to your cart to get started</p>
              <button
                onClick={() => navigate('/vendor/dashboard')}
                className="btn-primary"
              >
                Browse Products
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cart Items */}
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="bg-white rounded-lg p-6 border border-secondary-200">
                    <div className="flex items-center gap-6">
                      {/* Product Image */}
                      <div className="w-20 h-20 bg-secondary-200 rounded-lg overflow-hidden flex-shrink-0">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-secondary-400" />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1">
                        <h3 className="font-medium text-secondary-900 mb-1">{item.name || 'Unknown Product'}</h3>
                        <p className="text-sm text-secondary-600">₹{(item.price || 0).toFixed(2)} each</p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center hover:bg-secondary-50 transition-colors"
                          disabled={loading}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-medium">{item.quantity || 0}</span>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center hover:bg-secondary-50 transition-colors"
                          disabled={loading || (item.quantity >= (item.stock_quantity || 0))}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Total Price */}
                      <div className="text-right">
                        <p className="font-medium text-secondary-900">₹{(item.total || 0).toFixed(2)}</p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        disabled={loading}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Shipping Information */}
              <div className="bg-white rounded-lg p-6 border border-secondary-200">
                <h3 className="text-lg font-medium text-secondary-900 mb-4">Shipping Information</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Shipping Address
                    </label>
                    <textarea
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Enter your shipping address..."
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Order Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any special instructions or notes..."
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Cart Summary */}
              <div className="bg-white rounded-lg p-6 border border-secondary-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-secondary-900">Order Summary</h3>
                  <button
                    onClick={handleClearCart}
                    className="text-sm text-red-600 hover:text-red-700 transition-colors"
                    disabled={loading}
                  >
                    Clear Cart
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-secondary-600">
                    <span>Items ({totalItems || 0})</span>
                    <span>₹{(cartTotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-secondary-600">
                    <span>Shipping</span>
                    <span>Free</span>
                  </div>
                  <div className="border-t border-secondary-200 pt-2">
                    <div className="flex justify-between font-medium text-secondary-900">
                      <span>Total</span>
                      <span>₹{(cartTotal || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePurchaseAll}
                  disabled={purchasing || cart.length === 0}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {purchasing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Purchase All Items
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

export default VendorCart;
