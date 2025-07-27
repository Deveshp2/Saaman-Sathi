import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useDataRefresh } from '../../contexts/DataRefreshContext';
import { productsAPI } from '../../lib/api';
import { useToast } from '../ui/Toast';
import {
  Package,
  ShoppingCart,
  ShoppingBag,
  Settings,
  LogOut,
  Search,
  Bell,
  User,
  Heart,
  ShoppingCart as CartIcon,
  Loader2,
  AlertTriangle,
  Plus,
  Minus
} from 'lucide-react';

const VendorProducts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { addToCart, getCartTotals } = useCart();
  const { showToast, ToastContainer } = useToast();
  const { refreshTrigger } = useDataRefresh();

  // State management
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Load products data (reusable for initial load and refresh)
  const loadProducts = async (showLoadingState = true) => {
    try {
      if (showLoadingState) {
        setLoading(true);
      }
      setError(null);

      const productsData = await productsAPI.getFreshData({
        is_active: true,
        in_stock_only: true // Only get products with stock > 0
      });

      // Filter out any inactive or out-of-stock products
      const activeProducts = productsData.filter(product =>
        product.is_active !== false &&
        (product.stock_quantity || 0) > 0 &&
        product.stock_quantity !== null
      );

      setProducts(activeProducts);
      setFilteredProducts(activeProducts);

      // Set first product as selected if available
      if (activeProducts.length > 0 && !selectedProduct) {
        setSelectedProduct(activeProducts[0]);
      }

    } catch (err) {
      console.error('Error loading products:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Load products data on component mount
  useEffect(() => {
    loadProducts(true);
  }, []);

  // Listen for global refresh triggers (e.g., after purchases)
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('Products page refreshing due to global trigger');
      loadProducts(false);
    }
  }, [refreshTrigger]);

  // Filter products based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
  };

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= (selectedProduct?.stock_quantity || 1)) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = (product = selectedProduct, qty = quantity) => {
    if (!product) return;

    addToCart(product, qty);

    // Reset quantity only if using selected product
    if (product === selectedProduct) {
      setQuantity(1);
    }

    // Show success message with toast notification
    showToast(`${product.name} added to cart!`, 'success');
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
              placeholder="Search products"
              value={searchTerm}
              onChange={handleSearchChange}
              className="flex-1 outline-none text-secondary-500 font-inter"
            />
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

        {/* Products Content */}
        <div className="flex-1 p-8 overflow-y-auto">
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
              {/* Header */}
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-inter font-medium text-secondary-900">
                  Product Details
                </h1>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-secondary-600">
                    Cart Items: {getCartTotals().totalItems}
                  </span>
                  <button
                    className="btn-primary flex items-center gap-2"
                    onClick={handleAddToCart}
                    disabled={!selectedProduct || selectedProduct.stock_quantity === 0}
                  >
                    <CartIcon className="w-5 h-5" />
                    Add to Cart
                  </button>
                </div>
              </div>

              {/* Product Grid */}
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-secondary-400 mx-auto mb-3" />
                  <p className="text-secondary-600">
                    {searchTerm ? 'No products found matching your search' : 'No products available'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className={`bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow cursor-pointer ${
                        selectedProduct?.id === product.id ? 'ring-2 ring-primary-500' : ''
                      }`}
                      onClick={() => handleProductSelect(product)}
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

                        {/* Action buttons */}
                        <div className="absolute top-4 right-4 flex gap-2">
                          <button className="w-8 h-8 bg-white bg-opacity-80 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-colors">
                            <Heart className="w-4 h-4 text-secondary-700" />
                          </button>
                          <button
                            className="w-8 h-8 bg-white bg-opacity-80 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(product, 1);
                            }}
                          >
                            <CartIcon className="w-4 h-4 text-secondary-700" />
                          </button>
                        </div>

                        {/* Stock status indicator */}
                        {product.stock_quantity === 0 && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                            <span className="text-white font-medium">Out of Stock</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Product Details Section */}
              {selectedProduct && (
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="card p-6">
                    <h3 className="font-inter font-medium text-secondary-900 mb-4">
                      Product Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Product Name:</span>
                        <span className="font-medium">{selectedProduct.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Unit:</span>
                        <span className="font-medium">{selectedProduct.unit || 'piece'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Category:</span>
                        <span className="font-medium">{selectedProduct.categories?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Supplier:</span>
                        <span className="font-medium">
                          {selectedProduct.profiles?.company_name || selectedProduct.profiles?.full_name || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Price:</span>
                        <span className="font-medium text-primary-500">
                          ₹{selectedProduct.price?.toLocaleString('en-IN') || '0'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Stock:</span>
                        <span className={`font-medium ${
                          selectedProduct.stock_quantity > 10 ? 'text-success-100' :
                          selectedProduct.stock_quantity > 0 ? 'text-warning-100' : 'text-red-600'
                        }`}>
                          {selectedProduct.stock_quantity > 0 ?
                            `${selectedProduct.stock_quantity} available` :
                            'Out of Stock'
                          }
                        </span>
                      </div>
                      {selectedProduct.description && (
                        <div className="pt-3 border-t border-secondary-200">
                          <span className="text-secondary-600">Description:</span>
                          <p className="text-sm text-secondary-700 mt-1">{selectedProduct.description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card p-6">
                    <h3 className="font-inter font-medium text-secondary-900 mb-4">
                      Order Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-secondary-600">Quantity:</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuantityChange(-1)}
                            disabled={quantity <= 1}
                            className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-medium w-8 text-center">{quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(1)}
                            disabled={quantity >= (selectedProduct.stock_quantity || 1)}
                            className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Unit Price:</span>
                        <span className="font-medium">₹{selectedProduct.price?.toLocaleString('en-IN') || '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Total:</span>
                        <span className="font-medium text-primary-500">
                          ₹{((selectedProduct.price || 0) * quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="pt-4 border-t border-secondary-200">
                        <button
                          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={handleAddToCart}
                          disabled={selectedProduct.stock_quantity === 0}
                        >
                          {selectedProduct.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

export default VendorProducts; 