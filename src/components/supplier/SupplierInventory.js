import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { productsAPI, categoriesAPI } from '../../lib/api';
import { supabase } from '../../lib/supabase';
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
  Plus,
  X,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ImageIcon,
  RefreshCw,
  Activity,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

const SupplierInventory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  // State management
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [inventoryStats, setInventoryStats] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    totalValue: 0,
    averagePrice: 0
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    price: '',
    cost_price: '',
    stock_quantity: '',
    min_stock_level: '',
    max_stock_level: '',
    unit: 'piece',
    sku: '',
    image_url: ''
  });

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/signin');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      category_id: product.category_id || '',
      price: product.price?.toString() || '',
      cost_price: product.cost_price?.toString() || '',
      stock_quantity: product.stock_quantity?.toString() || '',
      min_stock_level: product.min_stock_level?.toString() || '',
      max_stock_level: product.max_stock_level?.toString() || '',
      unit: product.unit || 'piece',
      sku: product.sku || '',
      image_url: product.image_url || ''
    });
    setImagePreview(product.image_url || null);
    setSelectedImage(null);
    setShowEditModal(true);
    setError('');
    setSuccessMessage('');
  };



  // Calculate inventory statistics
  const calculateInventoryStats = (productsData) => {
    const totalProducts = productsData.length;
    const lowStockProducts = productsData.filter(p =>
      p.stock_quantity <= (p.min_stock_level || 0) && p.stock_quantity > 0
    ).length;
    const outOfStockProducts = productsData.filter(p => p.stock_quantity === 0).length;
    const totalValue = productsData.reduce((sum, p) =>
      sum + (p.stock_quantity * (p.cost_price || 0)), 0
    );
    const averagePrice = totalProducts > 0 ?
      productsData.reduce((sum, p) => sum + (p.price || 0), 0) / totalProducts : 0;

    return {
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalValue,
      averagePrice
    };
  };

  // Load initial data on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [categoriesData, productsData] = await Promise.all([
          categoriesAPI.getAll(),
          productsAPI.getSupplierProducts() // Use getSupplierProducts to only show supplier's own products
        ]);
        setCategories(categoriesData);
        setProducts(productsData);
        setFilteredProducts(productsData);
        setInventoryStats(calculateInventoryStats(productsData));
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load inventory data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    // Set up auto-refresh every 30 seconds for real-time data
    const refreshInterval = setInterval(() => {
      loadInitialData();
    }, 30000);

    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
  }, []);

  // Manual refresh function
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const [categoriesData, productsData] = await Promise.all([
        categoriesAPI.getAll(),
        productsAPI.getSupplierProducts() // Use getSupplierProducts to only show supplier's own products
      ]);
      setCategories(categoriesData);
      setProducts(productsData);
      setFilteredProducts(productsData);
      setInventoryStats(calculateInventoryStats(productsData));
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // Filter products based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateAndSetImage = (file) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, JPEG, GIF, WebP)');
      return false;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size should be less than 10MB');
      return false;
    }

    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
    setError('');
    return true;
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      validateAndSetImage(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndSetImage(files[0]);
    }
  };

  const uploadImageToSupabase = async (file) => {
    try {
      setImageUploading(true);
      console.log('Starting image upload...', { fileName: file.name, fileSize: file.size });

      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('Authentication error:', authError);
        throw new Error('User not authenticated. Please log in again.');
      }

      console.log('User authenticated:', user.email);

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Invalid file type: ${file.type}. Please use PNG, JPG, JPEG, GIF, or WebP images.`);
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error(`File size too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed size is 10MB.`);
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop().toLowerCase();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      console.log('Uploading to path:', filePath, {
        fileType: file.type,
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`
      });

      // Upload file directly to Supabase storage
      // The images bucket exists and is public, so we can upload directly
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Allow overwrite to avoid duplicate errors
          contentType: file.type
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);

        // Handle specific error types
        if (uploadError.message.includes('Duplicate') || uploadError.message.includes('already exists')) {
          // Retry with a different filename
          const retryFileName = `${Date.now()}-retry-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const retryFilePath = `product-images/${retryFileName}`;

          console.log('Retrying upload with new filename:', retryFilePath);

          const { data: retryData, error: retryError } = await supabase.storage
            .from('images')
            .upload(retryFilePath, file, {
              cacheControl: '3600',
              upsert: true,
              contentType: file.type
            });

          if (retryError) {
            console.error('Retry upload failed:', retryError);
            throw new Error(`Upload failed after retry: ${retryError.message}`);
          }

          console.log('Retry upload successful:', retryData);

          // Get public URL for retry upload
          const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(retryFilePath);

          console.log('Generated public URL (retry):', publicUrl);
          return publicUrl;
        } else {
          // For other errors, provide more specific error messages
          let errorMessage = uploadError.message;

          if (uploadError.message.includes('row-level security') || uploadError.message.includes('policy')) {
            errorMessage = 'Permission denied: Storage access policy error. Please ensure you are logged in with proper permissions.';
          } else if (uploadError.message.includes('not found') || uploadError.message.includes('bucket')) {
            errorMessage = 'Storage bucket not accessible. The images bucket exists but may have permission issues.';
          } else if (uploadError.message.includes('permission') || uploadError.message.includes('unauthorized')) {
            errorMessage = 'Permission denied. Please ensure you are logged in with proper permissions.';
          } else if (uploadError.message.includes('size') || uploadError.message.includes('too large')) {
            errorMessage = 'File size too large. Please use a smaller image (max 10MB).';
          } else if (uploadError.message.includes('type') || uploadError.message.includes('mime')) {
            errorMessage = 'Invalid file type. Please use PNG, JPG, JPEG, GIF, or WebP images.';
          } else if (uploadError.message.includes('network') || uploadError.message.includes('connection')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
          } else if (uploadError.message.includes('JWT') || uploadError.message.includes('token')) {
            errorMessage = 'Authentication expired. Please refresh the page and try again.';
          }

          console.error('Upload error details:', {
            originalError: uploadError,
            errorMessage,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
          });

          throw new Error(errorMessage);
        }
      }

      console.log('Upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      console.log('Generated public URL:', publicUrl);

      if (!publicUrl) {
        throw new Error('Failed to generate public URL');
      }

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error(error.message || 'Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setFormData(prev => ({
      ...prev,
      image_url: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    setLoadingMessage('Validating form data...');

    try {
      // Basic form validation
      setLoadingMessage('Validating form...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to show validation message

      if (!formData.name.trim()) {
        throw new Error('Product name is required');
      }

      if (!formData.category_id) {
        throw new Error('Please select a category');
      }

      if (!formData.price || parseFloat(formData.price) <= 0) {
        throw new Error('Valid selling price is required');
      }

      if (!formData.stock_quantity || parseInt(formData.stock_quantity) < 0) {
        throw new Error('Valid initial stock quantity is required');
      }

      // Validate that an image is selected
      if (!selectedImage && !formData.image_url) {
        throw new Error('Product image is required. Please select an image before creating the product.');
      }

      let imageUrl = formData.image_url;

      // Upload image if selected - REQUIRED for product creation
      if (selectedImage) {
        setLoadingMessage('Uploading image...');
        console.log('Uploading selected image...');
        try {
          imageUrl = await uploadImageToSupabase(selectedImage);
          console.log('Image uploaded successfully, URL:', imageUrl);
          setLoadingMessage('Image uploaded successfully!');
          await new Promise(resolve => setTimeout(resolve, 1000)); // Show success message briefly
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          // DO NOT continue without image - throw error to stop product creation
          setLoadingMessage('');
          throw new Error(`Image upload failed: ${uploadError.message}. Please try again or contact support if the problem persists.`);
        }
      } else {
        // Require image for product creation
        throw new Error('Product image is required. Please select an image before creating the product.');
      }

      setLoadingMessage('Creating product...');

      // Convert string values to numbers where needed
      const productData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        sku: formData.sku.trim() || null,
        price: parseFloat(formData.price),
        cost_price: parseFloat(formData.cost_price) || 0,
        stock_quantity: parseInt(formData.stock_quantity),
        min_stock_level: parseInt(formData.min_stock_level) || 0,
        max_stock_level: parseInt(formData.max_stock_level) || null,
        category_id: formData.category_id || null,
        image_url: imageUrl
      };

      console.log('Creating product with data:', productData);
      const newProduct = await productsAPI.create(productData);

      setLoadingMessage('Product created successfully!');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Show success message briefly

      // Update local state with new product
      const updatedProducts = [...products, newProduct];
      setProducts(updatedProducts);
      setFilteredProducts(updatedProducts);

      // Show success message
      setSuccessMessage(`Product "${newProduct.name}" has been created successfully!`);
      setTimeout(() => setSuccessMessage(''), 5000);

      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Product creation error:', error);
      setError(error.message || 'Failed to create product');
      setLoadingMessage('');

      // Add delay to make error message visible before hiding loading state
      await new Promise(resolve => setTimeout(resolve, 3000));
    } finally {
      setSubmitLoading(false);
      setLoadingMessage('');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    setSubmitLoading(true);
    setError('');

    try {
      // Basic form validation
      setLoadingMessage('Validating form...');
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!formData.name.trim()) {
        throw new Error('Product name is required');
      }

      if (!formData.category_id) {
        throw new Error('Please select a category');
      }

      if (!formData.price || parseFloat(formData.price) <= 0) {
        throw new Error('Valid selling price is required');
      }

      if (!formData.stock_quantity || parseInt(formData.stock_quantity) < 0) {
        throw new Error('Valid stock quantity is required');
      }

      let imageUrl = formData.image_url;

      // Upload new image if selected
      if (selectedImage) {
        setLoadingMessage('Uploading image...');
        try {
          imageUrl = await uploadImageToSupabase(selectedImage);
          setLoadingMessage('Image uploaded successfully!');
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (uploadError) {
          setLoadingMessage('');
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }
      }

      setLoadingMessage('Updating product...');

      // Convert string values to numbers where needed
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        sku: formData.sku.trim() || null,
        price: parseFloat(formData.price),
        cost_price: parseFloat(formData.cost_price) || 0,
        stock_quantity: parseInt(formData.stock_quantity),
        min_stock_level: parseInt(formData.min_stock_level) || 0,
        max_stock_level: parseInt(formData.max_stock_level) || null,
        category_id: formData.category_id || null,
        unit: formData.unit,
        image_url: imageUrl
      };

      const updatedProduct = await productsAPI.update(editingProduct.id, productData);

      setLoadingMessage('Product updated successfully!');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update local state with updated product
      const updatedProducts = products.map(p =>
        p.id === editingProduct.id ? updatedProduct : p
      );
      setProducts(updatedProducts);
      setFilteredProducts(updatedProducts);

      // Show success message
      setSuccessMessage(`Product "${updatedProduct.name}" has been updated successfully!`);
      setTimeout(() => setSuccessMessage(''), 5000);

      setShowEditModal(false);
      resetForm();
    } catch (error) {
      console.error('Product update error:', error);
      setError(error.message || 'Failed to update product');
      setLoadingMessage('');
      await new Promise(resolve => setTimeout(resolve, 3000));
    } finally {
      setSubmitLoading(false);
      setLoadingMessage('');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category_id: '',
      price: '',
      cost_price: '',
      stock_quantity: '',
      min_stock_level: '',
      max_stock_level: '',
      unit: 'piece',
      sku: '',
      image_url: ''
    });
    setSelectedImage(null);
    setImagePreview(null);
    setImageUploading(false);
    setError('');
    setSuccessMessage('');
    setLoadingMessage('');
    setEditingProduct(null);
  };

  // Utility function to determine stock status
  const getStockStatus = (product) => {
    if (product.stock_quantity === 0) {
      return { status: 'Out of Stock', className: 'bg-red-50 text-red-600' };
    } else if (product.stock_quantity <= (product.min_stock_level || 0)) {
      return { status: 'Low Stock', className: 'bg-warning-50 text-warning-100' };
    } else {
      return { status: 'In Stock', className: 'bg-success-50 text-success-100' };
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
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
              placeholder="Search inventory items"
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
              className="flex items-center gap-2 px-3 py-2 text-sm font-inter text-secondary-700 hover:text-secondary-900 hover:bg-secondary-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            {lastUpdated && (
              <span className="text-xs text-secondary-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button className="p-2 hover:bg-secondary-50 rounded-lg transition-colors">
              <Bell className="w-6 h-6 text-secondary-700" />
            </button>
            <div className="w-10 h-10 bg-secondary-300 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Inventory Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
          )}

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-inter font-medium text-secondary-900">
                Inventory Management
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Activity className="w-3 h-3 text-green-500" />
                <span className="text-xs text-secondary-500">Real-time data</span>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add New Item
            </button>
          </div>

          {/* Real-time Inventory Statistics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="card p-6 text-center">
              <div className="w-8 h-8 bg-blue-50 rounded mx-auto mb-3 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-inter font-semibold text-secondary-900">
                {inventoryStats.totalProducts}
              </p>
              <p className="text-sm font-inter font-medium text-secondary-600">Total Products</p>
            </div>

            <div className="card p-6 text-center">
              <div className="w-8 h-8 bg-yellow-50 rounded mx-auto mb-3 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-2xl font-inter font-semibold text-secondary-900">
                {inventoryStats.lowStockProducts}
              </p>
              <p className="text-sm font-inter font-medium text-secondary-600">Low Stock</p>
            </div>

            <div className="card p-6 text-center">
              <div className="w-8 h-8 bg-red-50 rounded mx-auto mb-3 flex items-center justify-center">
                <X className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-2xl font-inter font-semibold text-secondary-900">
                {inventoryStats.outOfStockProducts}
              </p>
              <p className="text-sm font-inter font-medium text-secondary-600">Out of Stock</p>
            </div>

            <div className="card p-6 text-center">
              <div className="w-8 h-8 bg-green-50 rounded mx-auto mb-3 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-inter font-semibold text-secondary-900">
                ₹{inventoryStats.totalValue.toLocaleString('en-IN')}
              </p>
              <p className="text-sm font-inter font-medium text-secondary-600">Total Value</p>
            </div>

            <div className="card p-6 text-center">
              <div className="w-8 h-8 bg-purple-50 rounded mx-auto mb-3 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-2xl font-inter font-semibold text-secondary-900">
                ₹{inventoryStats.averagePrice.toLocaleString('en-IN')}
              </p>
              <p className="text-sm font-inter font-medium text-secondary-600">Avg Price</p>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="card">
            <div className="p-6">
              {/* Desktop Table Header */}
              <div className="hidden lg:grid grid-cols-7 gap-4 text-sm font-inter font-medium text-secondary-700 mb-6 border-b border-secondary-200 pb-4 items-center">
                <div className="text-left">Image</div>
                <div className="text-left">Product Name</div>
                <div className="text-left">SKU</div>
                <div className="text-left">Category</div>
                <div className="text-left">Quantity</div>
                <div className="text-left">Price</div>
                <div className="text-left">Status</div>
              </div>

              {/* Mobile Table Header */}
              <div className="lg:hidden grid grid-cols-4 gap-4 text-sm font-inter font-medium text-secondary-700 mb-6 border-b border-secondary-200 pb-4 items-center">
                <div className="text-left">Image</div>
                <div className="text-left">Product</div>
                <div className="text-left">Price</div>
                <div className="text-left">Status</div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                  <span className="ml-2 text-secondary-600">Loading inventory...</span>
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
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-secondary-400 mx-auto mb-3" />
                  <p className="text-secondary-600">
                    {searchTerm ? 'No products found matching your search' : 'No products in inventory'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="mt-3 text-primary-500 hover:text-primary-600 underline"
                    >
                      Add your first product
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProducts.map((product) => {
                    const stockInfo = getStockStatus(product);
                    return (
                      <React.Fragment key={product.id}>
                        {/* Desktop View */}
                        <div
                          className="hidden lg:grid grid-cols-7 gap-4 text-sm font-inter text-secondary-800 py-4 border-b border-secondary-100 hover:bg-secondary-25 transition-colors items-center min-h-[80px] cursor-pointer"
                          onClick={() => handleEditProduct(product)}
                        >
                        {/* Product Image */}
                        <div className="flex items-center justify-start">
                          {product.image_url ? (
                            <div className="relative group">
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-16 h-16 object-cover rounded-lg border border-secondary-200 shadow-sm transition-transform group-hover:scale-105 cursor-pointer"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Create modal to show larger image
                                  const modal = document.createElement('div');
                                  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 cursor-pointer';
                                  modal.innerHTML = `
                                    <div class="relative max-w-3xl max-h-3xl">
                                      <img src="${product.image_url}" alt="${product.name}" class="max-w-full max-h-full object-contain rounded-lg" />
                                      <button class="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75">×</button>
                                    </div>
                                  `;
                                  modal.onclick = () => document.body.removeChild(modal);
                                  document.body.appendChild(modal);
                                }}
                              />
                              <div
                                className="w-16 h-16 bg-secondary-100 rounded-lg border border-secondary-200 flex items-center justify-center hidden"
                              >
                                <Package className="w-8 h-8 text-secondary-400" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-16 h-16 bg-secondary-100 rounded-lg border border-secondary-200 flex items-center justify-center">
                              <Package className="w-8 h-8 text-secondary-400" />
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="font-medium">{product.name}</div>
                        <div className="text-secondary-600">{product.sku || 'N/A'}</div>
                        <div>{product.categories?.name || 'Uncategorized'}</div>
                        <div>{product.stock_quantity} {product.unit}</div>
                        <div>₹ {product.price?.toLocaleString('en-IN') || '0'}</div>
                        <div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${stockInfo.className}`}>
                            {stockInfo.status}
                          </span>
                        </div>
                      </div>

                      {/* Mobile View */}
                      <div
                        key={`${product.id}-mobile`}
                        className="lg:hidden grid grid-cols-4 gap-4 text-sm font-inter text-secondary-800 py-4 border-b border-secondary-100 hover:bg-secondary-25 transition-colors items-center min-h-[76px] cursor-pointer"
                        onClick={() => handleEditProduct(product)}
                      >
                        {/* Product Image */}
                        <div className="flex items-center justify-start">
                          {product.image_url ? (
                            <div className="relative group">
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-14 h-14 object-cover rounded-lg border border-secondary-200 shadow-sm transition-transform group-hover:scale-105 cursor-pointer"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Create modal to show larger image
                                  const modal = document.createElement('div');
                                  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 cursor-pointer';
                                  modal.innerHTML = `
                                    <div class="relative max-w-3xl max-h-3xl">
                                      <img src="${product.image_url}" alt="${product.name}" class="max-w-full max-h-full object-contain rounded-lg" />
                                      <button class="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75">×</button>
                                    </div>
                                  `;
                                  modal.onclick = () => document.body.removeChild(modal);
                                  document.body.appendChild(modal);
                                }}
                              />
                              <div
                                className="w-14 h-14 bg-secondary-100 rounded-lg border border-secondary-200 flex items-center justify-center hidden"
                              >
                                <Package className="w-7 h-7 text-secondary-400" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-14 h-14 bg-secondary-100 rounded-lg border border-secondary-200 flex items-center justify-center">
                              <Package className="w-7 h-7 text-secondary-400" />
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div>
                          <div className="font-medium text-sm">{product.name}</div>
                          <div className="text-xs text-secondary-500 mt-1">
                            {product.categories?.name || 'Uncategorized'} • {product.stock_quantity} {product.unit}
                          </div>
                          {product.sku && (
                            <div className="text-xs text-secondary-400 mt-1">SKU: {product.sku}</div>
                          )}
                        </div>

                        {/* Price */}
                        <div className="font-medium">₹ {product.price?.toLocaleString('en-IN') || '0'}</div>

                        {/* Status */}
                        <div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockInfo.className}`}>
                            {stockInfo.status}
                          </span>
                        </div>
                      </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add New Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-secondary-200">
              <h2 className="text-xl font-inter font-semibold text-secondary-900">
                Add New Product
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-secondary-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-secondary-500" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Product Image Upload */}
              <div>
                <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                  Product Image *
                </label>

                {imagePreview ? (
                  <div className="relative">
                    <div className="border-2 border-secondary-300 rounded-lg p-4 bg-secondary-50">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      disabled={imageUploading}
                    />
                    <div
                      className="border-2 border-dashed border-secondary-300 rounded-lg p-6 text-center hover:border-primary-300 transition-colors cursor-pointer"
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {imageUploading ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-2" />
                          <p className="text-sm text-secondary-500">Uploading image...</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-secondary-400 mx-auto mb-2" />
                          <p className="text-sm text-secondary-500">Click to upload or drag and drop</p>
                          <p className="text-xs text-secondary-400 mt-1">PNG, JPG, JPEG, GIF, WebP up to 10MB</p>
                          <p className="text-xs text-red-500 mt-1 font-medium">* Image is required for product creation</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter product name"
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                    SKU
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="Enter SKU"
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Category and Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                    Category *
                  </label>
                  <div className="relative">
                    <select
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 pr-10 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent bg-white appearance-none cursor-pointer font-inter text-secondary-700"
                      required
                    >
                      <option value="" disabled className="text-secondary-400">
                        Select category
                      </option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id} className="text-secondary-700 py-2">
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {/* Custom dropdown arrow */}
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                    Unit *
                  </label>
                  <div className="relative">
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 pr-10 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent bg-white appearance-none cursor-pointer font-inter text-secondary-700"
                      required
                    >
                      <option value="piece" className="text-secondary-700 py-2">Piece</option>
                      <option value="kg" className="text-secondary-700 py-2">Kilogram (kg)</option>
                      <option value="gram" className="text-secondary-700 py-2">Gram (g)</option>
                      <option value="liter" className="text-secondary-700 py-2">Liter (L)</option>
                      <option value="ml" className="text-secondary-700 py-2">Milliliter (ml)</option>
                      <option value="box" className="text-secondary-700 py-2">Box</option>
                      <option value="pack" className="text-secondary-700 py-2">Pack</option>
                      <option value="bottle" className="text-secondary-700 py-2">Bottle</option>
                      <option value="can" className="text-secondary-700 py-2">Can</option>
                      <option value="dozen" className="text-secondary-700 py-2">Dozen</option>
                    </select>
                    {/* Custom dropdown arrow */}
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter product description"
                  rows="3"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent resize-none"
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                    Selling Price *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                    Cost Price
                  </label>
                  <input
                    type="number"
                    name="cost_price"
                    value={formData.cost_price}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Stock Management */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                    Initial Stock *
                  </label>
                  <input
                    type="number"
                    name="stock_quantity"
                    value={formData.stock_quantity}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                    Min Stock Level
                  </label>
                  <input
                    type="number"
                    name="min_stock_level"
                    value={formData.min_stock_level}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                    Max Stock Level
                  </label>
                  <input
                    type="number"
                    name="max_stock_level"
                    value={formData.max_stock_level}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-600 text-sm font-medium">Error</p>
                      <p className="text-red-600 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message in Modal */}
              {successMessage && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-green-600 text-sm font-medium">Success</p>
                      <p className="text-green-600 text-sm mt-1">{successMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading Message */}
              {loadingMessage && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    <p className="text-blue-700 text-sm font-medium">{loadingMessage}</p>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 text-secondary-700 border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading || imageUploading}
                  className="px-6 py-2 bg-primary-300 text-white rounded-lg hover:bg-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {(submitLoading || imageUploading) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {imageUploading ? 'Uploading Image...' : submitLoading ? (loadingMessage || 'Creating...') : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-secondary-200">
              <h2 className="text-xl font-inter font-semibold text-secondary-900">
                Edit Product
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-secondary-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-secondary-500" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              {/* Product Image Upload */}
              <div>
                <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                  Product Image
                </label>
                <div className="flex items-center gap-4">
                  {/* Image Preview */}
                  <div className="w-24 h-24 border-2 border-dashed border-secondary-300 rounded-lg flex items-center justify-center bg-secondary-50">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="w-8 h-8 text-secondary-400 mx-auto mb-1" />
                        <p className="text-xs text-secondary-500">No image</p>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1">
                    <div
                      className="border-2 border-dashed border-secondary-300 rounded-lg p-4 text-center hover:border-primary-300 transition-colors cursor-pointer"
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('edit-image-upload').click()}
                    >
                      <Upload className="w-6 h-6 text-secondary-400 mx-auto mb-2" />
                      <p className="text-sm text-secondary-600 mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-secondary-500">
                        PNG, JPG, JPEG, GIF, WebP up to 10MB
                      </p>
                    </div>
                    <input
                      id="edit-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter product name"
                  required
                />
              </div>

              {/* Product Description */}
              <div>
                <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  placeholder="Enter product description"
                />
              </div>

              {/* Category and SKU */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter SKU"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                    Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Stock Management */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                    Min Stock Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                    Max Stock Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_stock_level}
                    onChange={(e) => setFormData({ ...formData, max_stock_level: e.target.value })}
                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Unit */}
              <div>
                <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                  Unit
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="piece">Piece</option>
                  <option value="kg">Kilogram</option>
                  <option value="gram">Gram</option>
                  <option value="liter">Liter</option>
                  <option value="ml">Milliliter</option>
                  <option value="meter">Meter</option>
                  <option value="cm">Centimeter</option>
                  <option value="box">Box</option>
                  <option value="pack">Pack</option>
                </select>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Loading Message */}
              {loadingMessage && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {loadingMessage}
                  </p>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 text-secondary-700 border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading || imageUploading}
                  className="px-6 py-2 bg-primary-300 text-white rounded-lg hover:bg-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {(submitLoading || imageUploading) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {imageUploading ? 'Uploading Image...' : submitLoading ? (loadingMessage || 'Updating...') : 'Update Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierInventory;