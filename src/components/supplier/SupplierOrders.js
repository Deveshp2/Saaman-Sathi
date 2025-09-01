import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ordersAPI } from '../../lib/api';
import {
  Home,
  Package,
  BarChart3,
  ShoppingCart,
  Store,
  Settings,
  LogOut,
  Search,
  Bell,
  User,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  X
} from 'lucide-react';

const SupplierOrders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  // State management
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [orderStats, setOrderStats] = useState({
    total: 0,
    delivered: 0,
    shipped: 0,
    pending: 0,
    cancelled: 0
  });

  // Load orders data on component mount
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const supplierOrders = await ordersAPI.getSupplierOrdersWithItems();

        setOrders(supplierOrders);
        setFilteredOrders(supplierOrders);

        // Calculate order statistics
        const stats = {
          total: supplierOrders.length,
          delivered: supplierOrders.filter(o => o.status === 'delivered').length,
          shipped: supplierOrders.filter(o => o.status === 'shipped').length,
          pending: supplierOrders.filter(o => o.status === 'pending').length,
          cancelled: supplierOrders.filter(o => o.status === 'cancelled').length
        };
        setOrderStats(stats);

      } catch (err) {
        console.error('Error loading orders:', err);
        setError(err.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  // Filter orders based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredOrders(orders);
    } else {
      const filtered = orders.filter(order =>
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vendor_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vendor_profile?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.order_items?.some(item =>
          item.products?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredOrders(filtered);
    }
  }, [searchTerm, orders]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/signin');
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const supplierOrders = await ordersAPI.getSupplierOrdersWithItems();
      setOrders(supplierOrders);
      setFilteredOrders(supplierOrders);

      // Calculate order statistics
      const stats = {
        total: supplierOrders.length,
        delivered: supplierOrders.filter(o => o.status === 'delivered').length,
        shipped: supplierOrders.filter(o => o.status === 'shipped').length,
        pending: supplierOrders.filter(o => o.status === 'pending').length,
        cancelled: supplierOrders.filter(o => o.status === 'cancelled').length
      };
      setOrderStats(stats);

    } catch (err) {
      console.error('Error refreshing orders:', err);
      setError(err.message || 'Failed to refresh orders');
    } finally {
      setRefreshing(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      setUpdatingStatus(orderId);
      await ordersAPI.updateStatus(orderId, newStatus);
      
      // Update local state
      const updatedOrders = orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      );
      setOrders(updatedOrders);
      setFilteredOrders(updatedOrders);

      // Recalculate stats
      const stats = {
        total: updatedOrders.length,
        delivered: updatedOrders.filter(o => o.status === 'delivered').length,
        shipped: updatedOrders.filter(o => o.status === 'shipped').length,
        pending: updatedOrders.filter(o => o.status === 'pending').length,
        cancelled: updatedOrders.filter(o => o.status === 'cancelled').length
      };
      setOrderStats(stats);

    } catch (err) {
      console.error('Error updating order status:', err);
      setError(err.message || 'Failed to update order status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-warning-200" />;
      case 'shipped':
        return <Truck className="w-4 h-4 text-info-200" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-success-200" />;
      case 'cancelled':
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-secondary-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-warning-200 bg-warning-50';
      case 'shipped':
        return 'text-info-200 bg-info-50';
      case 'delivered':
        return 'text-success-200 bg-success-50';
      case 'cancelled':
        return 'text-red-500 bg-red-50';
      default:
        return 'text-secondary-600 bg-secondary-50';
    }
  };

  const sidebarItems = [
    { icon: Home, label: 'Dashboard', path: '/supplier/dashboard', active: location.pathname === '/supplier/dashboard' },
    { icon: Package, label: 'Inventory', path: '/supplier/inventory', active: location.pathname === '/supplier/inventory' },
    { icon: BarChart3, label: 'Reports', path: '/supplier/reports', active: location.pathname === '/supplier/reports' },
    { icon: ShoppingCart, label: 'Orders', path: '/supplier/orders', active: location.pathname === '/supplier/orders' },
    { icon: Store, label: 'Manage Store', path: '/supplier/store', active: location.pathname === '/supplier/store' },
  ];

  const bottomItems = [
    { icon: Settings, label: 'Settings', path: '/supplier/settings' },
    { icon: LogOut, label: 'Log Out', onClick: handleSignOut },
  ];

  return (
    <div className="flex h-screen bg-secondary-100">
      {/* Sidebar */}
      <div className="w-70 bg-white border-r border-secondary-200 flex flex-col">
        {/* Logo */}
        <div className="p-6">
          <h1 className="text-xl font-inter font-semibold text-primary-500">SAAMAN</h1>
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
        <div className="px-4 pb-6">
          <div className="space-y-2">
            {bottomItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick || (() => navigate(item.path))}
                className="w-full flex items-center gap-4 px-4 py-4 text-secondary-700 hover:bg-secondary-50 rounded-lg transition-colors"
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
            <div>
              <h1 className="text-2xl font-inter font-medium text-secondary-900">Orders Management</h1>
              <p className="text-sm font-inter text-secondary-600 mt-1">
                Manage and track orders from vendors
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-5 h-5 text-secondary-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10 pr-4 py-2 border border-secondary-300 rounded-lg text-sm font-inter focus:outline-none focus:border-primary-200 transition-colors"
                />
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-inter text-secondary-700 hover:text-secondary-900 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-secondary-400" />
                <User className="w-5 h-5 text-secondary-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Orders Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {/* Order Statistics */}
          <div className="grid grid-cols-5 gap-6 mb-8">
            <div className="card p-6 text-center">
              <div className="w-8 h-8 bg-secondary-50 rounded mx-auto mb-3 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-secondary-400" />
              </div>
              <p className="text-2xl font-inter font-semibold text-secondary-900">{orderStats.total}</p>
              <p className="text-sm font-inter font-medium text-secondary-600">Total Orders</p>
            </div>
            <div className="card p-6 text-center">
              <div className="w-8 h-8 bg-warning-50 rounded mx-auto mb-3 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning-200" />
              </div>
              <p className="text-2xl font-inter font-semibold text-secondary-900">{orderStats.pending}</p>
              <p className="text-sm font-inter font-medium text-secondary-600">Pending</p>
            </div>
            <div className="card p-6 text-center">
              <div className="w-8 h-8 bg-info-50 rounded mx-auto mb-3 flex items-center justify-center">
                <Truck className="w-5 h-5 text-info-200" />
              </div>
              <p className="text-2xl font-inter font-semibold text-secondary-900">{orderStats.shipped}</p>
              <p className="text-sm font-inter font-medium text-secondary-600">Shipped</p>
            </div>
            <div className="card p-6 text-center">
              <div className="w-8 h-8 bg-success-50 rounded mx-auto mb-3 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success-200" />
              </div>
              <p className="text-2xl font-inter font-semibold text-secondary-900">{orderStats.delivered}</p>
              <p className="text-sm font-inter font-medium text-secondary-600">Delivered</p>
            </div>
            <div className="card p-6 text-center">
              <div className="w-8 h-8 bg-red-50 rounded mx-auto mb-3 flex items-center justify-center">
                <X className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-2xl font-inter font-semibold text-secondary-900">{orderStats.cancelled}</p>
              <p className="text-sm font-inter font-medium text-secondary-600">Cancelled</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              <span className="ml-2 text-secondary-600">Loading orders...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-600 font-medium">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Orders Table */}
              <div className="card">
                <div className="p-6">
                  <div className="grid grid-cols-8 gap-4 text-sm font-inter font-medium text-secondary-700 mb-6 border-b border-secondary-200 pb-4">
                    <div>Order ID</div>
                    <div>Product</div>
                    <div>Vendor</div>
                    <div>Quantity</div>
                    <div>Unit Price</div>
                    <div>Total</div>
                    <div>Status</div>
                    <div>Actions</div>
                  </div>

                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingCart className="w-12 h-12 text-secondary-400 mx-auto mb-3" />
                      <p className="text-secondary-600">
                        {searchTerm ? 'No orders found matching your search' : 'No orders found'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredOrders.flatMap((order) =>
                        order.order_items?.map((item, index) => (
                          <div key={`${order.id}-${item.id}`} className="grid grid-cols-8 gap-4 text-sm font-inter text-secondary-800 py-3 border-b border-secondary-100 hover:bg-secondary-25 transition-colors">
                            <div className="font-medium">
                              {index === 0 ? `#${order.id.slice(0, 8)}` : ''}
                            </div>
                            <div className="flex items-center">
                              {item.products?.image_url ? (
                                <img
                                  src={item.products.image_url}
                                  alt={item.products.name}
                                  className="w-8 h-8 rounded object-cover mr-3"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-secondary-100 rounded mr-3 flex items-center justify-center">
                                  <Package className="w-4 h-4 text-secondary-400" />
                                </div>
                              )}
                              <span className="truncate">{item.products?.name || 'Unknown Product'}</span>
                            </div>
                            <div>
                              {index === 0 ? (
                                order.vendor_profile?.company_name || order.vendor_profile?.full_name || 'Unknown Vendor'
                              ) : ''}
                            </div>
                            <div>{item.quantity}</div>
                            <div>₹ {item.unit_price?.toLocaleString('en-IN') || '0'}</div>
                            <div>₹ {item.total_price?.toLocaleString('en-IN') || '0'}</div>
                            <div>
                              {index === 0 ? (
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                  {getStatusIcon(order.status)}
                                  {order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Unknown'}
                                </span>
                              ) : ''}
                            </div>
                            <div>
                              {index === 0 && order.status === 'pending' ? (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleStatusUpdate(order.id, 'shipped')}
                                    disabled={updatingStatus === order.id}
                                    className="text-xs px-2 py-1 bg-info-50 text-info-200 rounded hover:bg-info-100 transition-colors disabled:opacity-50"
                                  >
                                    {updatingStatus === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Ship'}
                                  </button>
                                  <button
                                    onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                                    disabled={updatingStatus === order.id}
                                    className="text-xs px-2 py-1 bg-red-50 text-red-500 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : index === 0 && order.status === 'shipped' ? (
                                <button
                                  onClick={() => handleStatusUpdate(order.id, 'delivered')}
                                  disabled={updatingStatus === order.id}
                                  className="text-xs px-2 py-1 bg-success-50 text-success-200 rounded hover:bg-success-100 transition-colors disabled:opacity-50"
                                >
                                  {updatingStatus === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Mark Delivered'}
                                </button>
                              ) : ''}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierOrders;
