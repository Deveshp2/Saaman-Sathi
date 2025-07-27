import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useDataRefresh } from '../../contexts/DataRefreshContext';
import { productsAPI, categoriesAPI, ordersAPI } from '../../lib/api';
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
  Loader2,
  AlertTriangle,
  CheckCircle,
  X,
  Plus,
  Minus,
  ShoppingCart as CartIcon
} from 'lucide-react';

const VendorDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { addToCart } = useCart();
  const { showToast, ToastContainer } = useToast();
  const { refreshTrigger, triggerPurchaseRefresh, shouldRefreshAfterPurchase } = useDataRefresh();

  // State management
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const [buySuccess, setBuySuccess] = useState(false);
  const [buyError, setBuyError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');

  // Load data function (reusable for initial load and refresh)
  const loadData = async (showLoadingState = true) => {
    try {
      if (showLoadingState) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      setConnectionStatus('connecting');

      // Fetch fresh data from Supabase with proper filters for vendors
      const [categoriesData, productsData] = await Promise.all([
        categoriesAPI.getAll(),
        productsAPI.getFreshData({
          is_active: true,
          in_stock_only: true // Only get products with stock > 0
        })
      ]);

      // Filter out any inactive or out-of-stock products
      const activeProducts = productsData.filter(product =>
        product.is_active !== false &&
        (product.stock_quantity || 0) > 0 &&
        product.stock_quantity !== null // Ensure stock_quantity is not null
      );

      setCategories([{ id: 'all', name: 'All' }, ...categoriesData]);
      setProducts(activeProducts);
      setFilteredProducts(activeProducts);
      setLastRefresh(new Date());
      setConnectionStatus('connected');

      if (!showLoadingState) {
        showToast(`Dashboard refreshed - ${activeProducts.length} products loaded`, 'success');
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
      setConnectionStatus('error');
      if (!showLoadingState) {
        showToast('Failed to refresh data', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load initial data on component mount
  useEffect(() => {
    loadData(true);
  }, []);

  // Listen for global refresh triggers (e.g., after purchases)
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('Dashboard refreshing due to global trigger');
      loadData(false);
    }
  }, [refreshTrigger]);

  // Auto-refresh data every 5 minutes (300000ms) with visibility check
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      // Only refresh if the page is visible and user is online
      if (!document.hidden && navigator.onLine) {
        loadData(false);
      }
    }, 300000); // 5 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus('connected');
      // Refresh data when coming back online
      loadData(false);
    };

    const handleOffline = () => {
      setConnectionStatus('error');
    };

    const handleVisibilityChange = () => {
      // Refresh data when tab becomes visible again after being hidden for a while
      if (!document.hidden && navigator.onLine) {
        const timeSinceLastRefresh = Date.now() - lastRefresh.getTime();
        // If it's been more than 2 minutes since last refresh, refresh now
        if (timeSinceLastRefresh > 120000) {
          loadData(false);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [lastRefresh]);

  // Filter products based on category and search term
  useEffect(() => {
    let filtered = products;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product =>
        product.categories?.name === selectedCategory
      );
    }

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchTerm]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleManualRefresh = () => {
    loadData(false);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
    setQuantity(1);
  };

  const handleCloseModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
    setQuantity(1);
    setBuyError(null);
    setBuySuccess(false);
  };

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= (selectedProduct?.stock_quantity || 1)) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    addToCart(selectedProduct, quantity);
    showToast(`${selectedProduct.name} added to cart!`, 'success');
    handleCloseModal();
  };

  const handleBuyNow = async () => {
    if (!selectedProduct) return;

    try {
      setBuying(true);
      setBuyError(null);

      // Check if product still has sufficient stock
      const currentProduct = products.find(p => p.id === selectedProduct.id);
      if (!currentProduct || currentProduct.stock_quantity < quantity) {
        setBuyError('Insufficient stock available. Please refresh and try again.');
        return;
      }

      // Create order data
      const orderData = {
        supplier_id: selectedProduct.supplier_id,
        shipping_address: 'Default shipping address', // You might want to make this configurable
        notes: `Direct purchase - ${selectedProduct.name} (Qty: ${quantity})`
      };

      // Create the order
      const order = await ordersAPI.create(orderData);

      // Add the product as order item (this will automatically update stock)
      const orderItems = [{
        product_id: selectedProduct.id,
        quantity: quantity,
        unit_price: selectedProduct.price
      }];

      await ordersAPI.addOrderItems(order.id, orderItems);

      setBuySuccess(true);
      showToast(`Order placed successfully! Stock updated.`, 'success');

      // Trigger global data refresh for all components
      triggerPurchaseRefresh({
        orderId: order.id,
        productId: selectedProduct.id,
        quantity: quantity
      });

      // Refresh dashboard data to reflect stock changes
      setTimeout(async () => {
        await loadData(false);
        setBuySuccess(false);
        handleCloseModal();
        navigate('/vendor/orders');
      }, 2000);

    } catch (err) {
      console.error('Error processing purchase:', err);
      setBuyError(err.message || 'Failed to process purchase');
      showToast('Failed to place order', 'error');
    } finally {
      setBuying(false);
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
              placeholder="Search product, supplier, order"
              value={searchTerm}
              onChange={handleSearchChange}
              className="flex-1 outline-none text-secondary-500 font-inter"
            />
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-5">
            {/* Connection Status & Last Refresh */}
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500' :
                'bg-red-500'
              }`}></div>
              <span className="text-secondary-500">
                {connectionStatus === 'connected' ? 'Live' :
                 connectionStatus === 'connecting' ? 'Syncing...' :
                 'Offline'}
              </span>
              <span className="text-secondary-400">•</span>
              <span className="text-secondary-500">
                {lastRefresh.toLocaleTimeString()}
              </span>
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-secondary-50 rounded-lg transition-colors disabled:opacity-50"
              title={refreshing ? 'Refreshing...' : 'Refresh data'}
            >
              <RefreshCw className={`w-6 h-6 text-secondary-700 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <div className="w-10 h-10 bg-secondary-300 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {/* Background Refresh Indicator */}
          {refreshing && !loading && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-blue-800 text-sm">Refreshing data...</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              <span className="ml-2 text-secondary-600">Loading products...</span>
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
              {/* Dashboard Stats */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="text-sm text-secondary-600">
                    <span className="font-medium text-secondary-900">{products.length}</span> products available
                  </div>
                  <div className="text-sm text-secondary-600">
                    <span className="font-medium text-secondary-900">{filteredProducts.length}</span> showing
                  </div>
                  {selectedCategory !== 'All' && (
                    <div className="text-sm text-secondary-600">
                      in <span className="font-medium text-primary-500">{selectedCategory}</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-secondary-500">
                  Auto-refresh every 5 minutes
                </div>
              </div>

              {/* Category Filters */}
              <div className="mb-8">
                <div className="flex items-center gap-3 flex-wrap">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.name)}
                      className={`px-14 py-2 rounded-[33px] font-inter font-medium text-sm transition-colors ${
                        selectedCategory === category.name
                          ? 'bg-secondary-200 text-primary-400 border border-primary-400'
                          : 'bg-secondary-200 text-secondary-700'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Products Grid */}
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-secondary-400 mx-auto mb-3" />
                  <p className="text-secondary-600">
                    {searchTerm || selectedCategory !== 'All'
                      ? 'No products found matching your criteria'
                      : 'No products available'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleProductClick(product)}
                    >
                      {/* Product Image */}
                      <div className="relative h-64 bg-secondary-200">
                        <img
                          src={product.image_url || 'https://via.placeholder.com/261x254'}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/261x254';
                          }}
                        />
                        {/* Overlay with product info */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-30 backdrop-blur-sm p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-inter font-medium text-white text-base">
                                {product.name}
                              </h3>
                              <p className="text-white text-xs opacity-80 mt-1">
                                {product.unit || 'piece'}
                              </p>
                              <p className="text-white text-xs opacity-80">
                                {product.profiles?.company_name || product.profiles?.full_name || 'Supplier'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-inter font-medium text-white text-base">
                                ₹{product.price?.toLocaleString('en-IN') || '0'}
                              </p>
                              <p className="text-white text-xs opacity-80">
                                Stock: {product.stock_quantity || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Product Details Modal */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-secondary-200">
              <h2 className="text-2xl font-inter font-medium text-secondary-900">
                {selectedProduct.name}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-secondary-700" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Success/Error Messages */}
              {buySuccess && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800">Purchase successful! Redirecting to orders...</span>
                </div>
              )}

              {buyError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-red-800">{buyError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Product Image and Actions */}
                <div className="space-y-6">
                  {/* Product Image */}
                  <div className="bg-secondary-100 rounded-lg p-4">
                    <img
                      src={selectedProduct.image_url || 'https://via.placeholder.com/400x300'}
                      alt={selectedProduct.name}
                      className="w-full h-64 object-contain rounded-lg"
                    />
                  </div>

                  {/* Stock Info */}
                  <div className="bg-secondary-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-secondary-600">Opening Stock</span>
                        <p className="font-medium text-secondary-900">{selectedProduct.stock_quantity || 0}</p>
                      </div>
                      <div>
                        <span className="text-secondary-600">Remaining Stock</span>
                        <p className="font-medium text-secondary-900">{selectedProduct.stock_quantity || 0}</p>
                      </div>
                      <div>
                        <span className="text-secondary-600">On the way</span>
                        <p className="font-medium text-secondary-900">0</p>
                      </div>
                      <div>
                        <span className="text-secondary-600">Threshold value</span>
                        <p className="font-medium text-secondary-900">10</p>
                      </div>
                    </div>
                  </div>

                  {/* Add to Cart Section */}
                  <div className="border border-secondary-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-medium text-secondary-900">Quantity</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleQuantityChange(-1)}
                          className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center hover:bg-secondary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={quantity <= 1 || buying}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-medium">{quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(1)}
                          className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center hover:bg-secondary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={quantity >= (selectedProduct.stock_quantity || 1) || buying}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleAddToCart}
                        className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={selectedProduct.stock_quantity === 0 || buying}
                      >
                        <CartIcon className="w-5 h-5" />
                        Add to Cart
                      </button>
                      <button
                        onClick={handleBuyNow}
                        disabled={buying || selectedProduct.stock_quantity === 0}
                        className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {buying ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Buy Now'
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column - Product Details */}
                <div className="space-y-6">
                  {/* Primary Details */}
                  <div>
                    <h3 className="text-lg font-medium text-secondary-900 mb-4">Primary Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Product name</span>
                        <span className="font-medium text-secondary-900">{selectedProduct.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Product ID</span>
                        <span className="font-medium text-secondary-900">{selectedProduct.id?.slice(0, 8) || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Product category</span>
                        <span className="font-medium text-secondary-900">{selectedProduct.categories?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Price</span>
                        <span className="font-medium text-secondary-900">₹{(selectedProduct.price || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Expiry Date</span>
                        <span className="font-medium text-secondary-900">
                          {selectedProduct.expiry_date ? new Date(selectedProduct.expiry_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Threshold Value</span>
                        <span className="font-medium text-secondary-900">10</span>
                      </div>
                    </div>
                  </div>

                  {/* Supplier Details */}
                  <div>
                    <h3 className="text-lg font-medium text-secondary-900 mb-4">Supplier Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Supplier name</span>
                        <span className="font-medium text-secondary-900">
                          {selectedProduct.profiles?.full_name || selectedProduct.profiles?.company_name || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Contact Number</span>
                        <span className="font-medium text-secondary-900">+91 98789 86757</span>
                      </div>
                    </div>
                  </div>

                  {/* Stock Locations */}
                  <div>
                    <h3 className="text-lg font-medium text-secondary-900 mb-4">Stock Locations</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Store Name</span>
                        <span className="text-secondary-600">Stock in hand</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-secondary-900">Main Branch</span>
                        <span className="font-medium text-primary-500">{Math.floor((selectedProduct.stock_quantity || 0) * 0.6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-secondary-900">Secondary Branch</span>
                        <span className="font-medium text-primary-500">{Math.floor((selectedProduct.stock_quantity || 0) * 0.4)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedProduct.description && (
                    <div>
                      <h3 className="text-lg font-medium text-secondary-900 mb-4">Description</h3>
                      <p className="text-secondary-700 leading-relaxed">{selectedProduct.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

export default VendorDashboard; 