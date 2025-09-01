import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ordersAPI } from '../../lib/api';
import { exportOrdersToPDF } from '../../utils/pdfExport';
import { useToast } from '../ui/Toast';
import {
  Package,
  ShoppingCart,
  ShoppingBag,
  Settings,
  LogOut,
  Search,
  RefreshCw,
  User,
  Download,
  Loader2,
  AlertTriangle
} from 'lucide-react';

const VendorOrders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { showToast, ToastContainer } = useToast();

  // State management
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [orderStats, setOrderStats] = useState({
    total: 0,
    delivered: 0,
    inTransit: 0,
    pending: 0,
    cancelled: 0
  });

  // Load orders data on component mount
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const vendorOrders = await ordersAPI.getVendorOrdersWithItems();

        setOrders(vendorOrders);
        setFilteredOrders(vendorOrders);

        // Calculate order statistics
        const stats = {
          total: vendorOrders.length,
          delivered: vendorOrders.filter(o => o.status === 'delivered').length,
          inTransit: vendorOrders.filter(o => o.status === 'shipped').length,
          pending: vendorOrders.filter(o => o.status === 'pending').length,
          cancelled: vendorOrders.filter(o => o.status === 'cancelled').length
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
    if (!searchTerm.trim()) {
      setFilteredOrders(orders);
    } else {
      const filtered = orders.filter(order =>
        order.id.toString().includes(searchTerm) ||
        order.vendor_profile?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vendor_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplier_profile?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplier_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      const vendorOrders = await ordersAPI.getVendorOrdersWithItems();
      setOrders(vendorOrders);
      setFilteredOrders(vendorOrders);

      // Calculate order statistics
      const stats = {
        total: vendorOrders.length,
        delivered: vendorOrders.filter(o => o.status === 'delivered').length,
        inTransit: vendorOrders.filter(o => o.status === 'shipped').length,
        pending: vendorOrders.filter(o => o.status === 'pending').length,
        cancelled: vendorOrders.filter(o => o.status === 'cancelled').length
      };
      setOrderStats(stats);
      setError(null);
      showToast('Orders refreshed successfully', 'success');
    } catch (err) {
      console.error('Error refreshing orders:', err);
      setError(err.message || 'Failed to refresh orders');
      showToast('Failed to refresh orders', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportToPDF = async () => {
    if (filteredOrders.length === 0) {
      showToast('No orders available to export', 'warning');
      return;
    }

    setExporting(true);
    try {
      const result = exportOrdersToPDF(filteredOrders, 'Vendor');
      if (result.success) {
        showToast(`Orders exported successfully as ${result.filename}`, 'success');
      } else {
        showToast(`Export failed: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export orders to PDF', 'error');
    } finally {
      setExporting(false);
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



  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-success-50 text-success-100';
      case 'shipped':
        return 'bg-info-50 text-info-100';
      case 'pending':
        return 'bg-warning-50 text-warning-100';
      case 'cancelled':
        return 'bg-red-50 text-red-600';
      default:
        return 'bg-secondary-50 text-secondary-600';
    }
  };

  const getStatusLabel = (status) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'Delivered';
      case 'shipped':
        return 'In Transit';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
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
        <div className="p-4 space-y-2">
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-25 bg-white border-b border-secondary-200 flex items-center justify-between px-8">
          {/* Search Bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border border-secondary-200 rounded">
            <Search className="w-6 h-6 text-secondary-500" />
            <input
              type="text"
              placeholder="Search orders"
              value={searchTerm}
              onChange={handleSearchChange}
              className="flex-1 outline-none text-secondary-500 font-inter"
            />
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-5">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-secondary-50 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh orders"
            >
              <RefreshCw className={`w-6 h-6 text-secondary-700 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="w-10 h-10 bg-secondary-300 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Orders Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-inter font-medium text-secondary-900">
              My Orders
            </h1>
            <button
              onClick={handleExportToPDF}
              disabled={exporting || filteredOrders.length === 0}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title={filteredOrders.length === 0 ? 'No orders to export' : 'Export orders to PDF'}
            >
              {exporting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              {exporting ? 'Exporting...' : 'Export Orders'}
            </button>
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
                  <div className="grid grid-cols-7 gap-4 text-sm font-inter font-medium text-secondary-700 mb-6 border-b border-secondary-200 pb-4">
                    <div>Order ID</div>
                    <div>Product</div>
                    <div>Product Name</div>
                    <div>Price</div>
                    <div>Quantity</div>
                    <div>Date</div>
                    <div>Status</div>
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
                          <div key={`${order.id}-${item.id}`} className="grid grid-cols-7 gap-4 text-sm font-inter text-secondary-800 py-3 border-b border-secondary-100 hover:bg-secondary-25 transition-colors">
                            <div className="font-medium">
                              {index === 0 ? `#${order.id.slice(0, 8)}` : ''}
                            </div>
                            <div className="flex items-center">
                              {item.products?.image_url ? (
                                <img
                                  src={item.products.image_url}
                                  alt={item.products.name}
                                  className="w-12 h-12 object-cover rounded-lg border border-secondary-200"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-secondary-200 rounded-lg flex items-center justify-center">
                                  <Package className="w-6 h-6 text-secondary-400" />
                                </div>
                              )}
                            </div>
                            <div className="font-medium">
                              {item.products?.name || 'Unknown Product'}
                            </div>
                            <div>₹{(item.unit_price || 0).toFixed(2)}</div>
                            <div>{item.quantity || 0}</div>
                            <div>
                              {index === 0 ? new Date(order.created_at).toLocaleDateString('en-IN') : ''}
                            </div>
                            <div>
                              {index === 0 && (
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                  {getStatusLabel(order.status)}
                                </span>
                              )}
                            </div>
                          </div>
                        )) || []
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Statistics */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="card p-6 text-center">
                  <h3 className="text-2xl font-inter font-semibold text-secondary-900">{orderStats.total}</h3>
                  <p className="text-sm font-inter text-secondary-600">Total Orders</p>
                </div>
                <div className="card p-6 text-center">
                  <h3 className="text-2xl font-inter font-semibold text-success-100">{orderStats.delivered}</h3>
                  <p className="text-sm font-inter text-secondary-600">Delivered</p>
                </div>
                <div className="card p-6 text-center">
                  <h3 className="text-2xl font-inter font-semibold text-info-100">{orderStats.inTransit}</h3>
                  <p className="text-sm font-inter text-secondary-600">In Transit</p>
                </div>
                <div className="card p-6 text-center">
                  <h3 className="text-2xl font-inter font-semibold text-warning-100">{orderStats.pending}</h3>
                  <p className="text-sm font-inter text-secondary-600">Pending</p>
                </div>
                <div className="card p-6 text-center">
                  <h3 className="text-2xl font-inter font-semibold text-red-600">{orderStats.cancelled}</h3>
                  <p className="text-sm font-inter text-secondary-600">Cancelled</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

export default VendorOrders; 