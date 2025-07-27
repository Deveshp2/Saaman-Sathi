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
  const { cart, updateQuantity, removeFromCart, clearCart, getCartTotals } = useCart();
  const { showToast, ToastContainer } = useToast();
  const { triggerPurchaseRefresh } = useDataRefresh();

  // State management
  const [error, setError] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
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

      // Group items by supplier
      const itemsBySupplier = cart.reduce((acc, item) => {
        const supplierId = item.supplier_id || 'unknown';
        if (!acc[supplierId]) {
          acc[supplierId] = [];
        }
        acc[supplierId].push(item);
        return acc;
      }, {});

      // Create orders for each supplier sequentially to avoid order number conflicts
      const createdOrders = [];
      for (const [supplierId, items] of Object.entries(itemsBySupplier)) {
        const orderData = {
          supplier_id: supplierId,
          shipping_address: 'Default shipping address', // You might want to make this configurable
          notes: `Bulk order from cart - ${items.length} items`
        };

        const order = await ordersAPI.create(orderData);

        const orderItems = items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price
        }));

        await ordersAPI.addOrderItems(order.id, orderItems);
        createdOrders.push(order);

        // Small delay between orders to ensure unique timestamps
        if (createdOrders.length < Object.keys(itemsBySupplier).length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      setPurchaseSuccess(true);
      clearCart();
      showToast(`Successfully placed ${createdOrders.length} order(s)! Stock updated.`, 'success');

      // Trigger global data refresh for all components
      triggerPurchaseRefresh({
        orderCount: createdOrders.length,
        orderIds: createdOrders.map(o => o.id),
        totalItems: cart.length
      });

      // Show success message for 3 seconds then redirect
      setTimeout(() => {
        setPurchaseSuccess(false);
        navigate('/vendor/orders');
      }, 3000);

    } catch (err) {
      console.error('Error purchasing items:', err);
      setError(err.message || 'Failed to process purchase');
      showToast('Failed to process purchase', 'error');
    } finally {
      setPurchasing(false);
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

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">{error}</span>
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
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center hover:bg-secondary-50 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-medium">{item.quantity || 0}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center hover:bg-secondary-50 transition-colors"
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
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cart Summary */}
              <div className="bg-white rounded-lg p-6 border border-secondary-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-secondary-900">Order Summary</h3>
                  <button
                    onClick={clearCart}
                    className="text-sm text-red-600 hover:text-red-700 transition-colors"
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
