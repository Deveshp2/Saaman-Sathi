import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardAPI } from '../../lib/api';
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
  Download,
  Loader2,
  AlertTriangle,
  Calendar
} from 'lucide-react';

const SupplierReports = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  // State management
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('Weekly');

  // Load comprehensive reports data on component mount
  useEffect(() => {
    const loadReportsData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dashboardAPI.getComprehensiveReports();
        setReportsData(data);
      } catch (err) {
        console.error('Error loading reports data:', err);
        setError(err.message || 'Failed to load reports data');
      } finally {
        setLoading(false);
      }
    };

    loadReportsData();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
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

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0).replace('₹', '₹');
  };

  // Format percentage
  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  // Create chart data for profit & revenue
  const createChartData = () => {
    if (!reportsData?.profitRevenueData) return [];
    return reportsData.profitRevenueData;
  };

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
              placeholder="Search reports"
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

        {/* Reports Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-inter font-medium text-secondary-900">
              Reports
            </h1>
            <div className="flex items-center gap-4">
              <button className="btn-secondary flex items-center gap-2">
                <Download className="w-5 h-5" />
                Download
              </button>
              <div className="flex items-center gap-2 bg-white border border-secondary-200 rounded-lg px-3 py-2">
                <Calendar className="w-4 h-4 text-secondary-500" />
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="bg-transparent text-sm font-inter text-secondary-700 border-none outline-none"
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              <span className="ml-2 text-secondary-600">Loading reports data...</span>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Overview and Chart */}
              <div className="lg:col-span-2 space-y-8">
                {/* Overview Section */}
                <div className="card p-6">
                  <h2 className="text-lg font-inter font-medium text-secondary-900 mb-6">Overview</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {/* Total Profit */}
                    <div className="text-center">
                      <p className="text-2xl font-inter font-semibold text-secondary-900">
                        ₹{(reportsData?.overviewMetrics?.totalProfit || 21190).toLocaleString('en-IN')}
                      </p>
                      <p className="text-sm font-inter text-secondary-600 mt-1">Total Profit</p>
                    </div>

                    {/* Revenue */}
                    <div className="text-center">
                      <p className="text-2xl font-inter font-semibold text-warning-100">
                        ₹{(reportsData?.overviewMetrics?.revenue || 18300).toLocaleString('en-IN')}
                      </p>
                      <p className="text-sm font-inter text-secondary-600 mt-1">Revenue</p>
                    </div>

                    {/* Sales */}
                    <div className="text-center">
                      <p className="text-2xl font-inter font-semibold text-secondary-900">
                        ₹{(reportsData?.overviewMetrics?.sales || 17432).toLocaleString('en-IN')}
                      </p>
                      <p className="text-sm font-inter text-secondary-600 mt-1">Sales</p>
                    </div>

                    {/* Additional metrics row */}
                    <div className="text-center">
                      <p className="text-2xl font-inter font-semibold text-secondary-900">
                        ₹{(reportsData?.overviewMetrics?.netPurchaseValue || 17432).toLocaleString('en-IN')}
                      </p>
                      <p className="text-sm font-inter text-secondary-600 mt-1">Net purchase value</p>
                    </div>

                    <div className="text-center">
                      <p className="text-2xl font-inter font-semibold text-secondary-900">
                        ₹{(reportsData?.overviewMetrics?.netSalesValue || 80432).toLocaleString('en-IN')}
                      </p>
                      <p className="text-sm font-inter text-secondary-600 mt-1">Net sales value</p>
                    </div>

                    <div className="text-center">
                      <p className="text-2xl font-inter font-semibold text-secondary-900">
                        ₹{(reportsData?.overviewMetrics?.momProfit || 30432).toLocaleString('en-IN')}
                      </p>
                      <p className="text-sm font-inter text-secondary-600 mt-1">MoM Profit</p>
                    </div>

                    <div className="text-center">
                      <p className="text-2xl font-inter font-semibold text-secondary-900">
                        ₹{(reportsData?.overviewMetrics?.yoyProfit || 10432).toLocaleString('en-IN')}
                      </p>
                      <p className="text-sm font-inter text-secondary-600 mt-1">YoY Profit</p>
                    </div>
                  </div>
                </div>

                {/* Profit & Revenue Chart */}
                <div className="card p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-inter font-medium text-secondary-900">Profit & Revenue</h2>
                    <div className="flex items-center gap-4">
                      <button className="text-sm font-inter text-secondary-600 hover:text-secondary-700 transition-colors">
                        Download
                      </button>
                      <div className="flex items-center gap-2 bg-secondary-50 rounded-lg px-3 py-1">
                        <span className="text-sm font-inter text-secondary-700">{selectedPeriod}</span>
                      </div>
                    </div>
                  </div>

                  {/* Chart Area */}
                  <div className="relative h-80">
                    {/* Chart Background */}
                    <div className="absolute inset-0 bg-gradient-to-b from-pink-50 to-transparent rounded-lg"></div>

                    {/* Chart Content */}
                    <div className="relative h-full flex items-end justify-between px-4 pb-8">
                      {createChartData().map((dataPoint, index) => (
                        <div key={index} className="flex flex-col items-center">
                          {/* Data Point */}
                          <div
                            className="w-2 h-2 bg-pink-500 rounded-full mb-2"
                            style={{
                              marginBottom: `${(dataPoint.value / 80000) * 200}px`
                            }}
                          ></div>
                          {/* Month Label */}
                          <span className="text-xs font-inter text-secondary-600">{dataPoint.month}</span>
                        </div>
                      ))}
                    </div>

                    {/* Chart Value Display */}
                    <div className="absolute top-4 left-4">
                      <div className="bg-white rounded-lg shadow-sm px-3 py-2">
                        <p className="text-xs font-inter text-secondary-600">Sales</p>
                        <p className="text-lg font-inter font-semibold text-secondary-900">220,342,123$</p>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="absolute bottom-4 left-4 flex items-center gap-2">
                      <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                      <span className="text-xs font-inter text-secondary-600">Sales</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Best Selling Category and Products */}
              <div className="space-y-8">
                {/* Best Selling Category */}
                <div className="card p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-inter font-medium text-secondary-900">Best selling category</h2>
                    <button className="text-sm font-inter text-primary-400 hover:text-primary-300 transition-colors">
                      See All
                    </button>
                  </div>

                  {/* Category Headers */}
                  <div className="grid grid-cols-3 gap-4 text-sm font-inter font-medium text-secondary-600 mb-4">
                    <div>Category</div>
                    <div>Turn Over</div>
                    <div>Increase By</div>
                  </div>

                  {/* Category Data */}
                  <div className="space-y-4">
                    {(reportsData?.bestSellingCategories || [
                      { category: 'Vegetable', turnOver: 26000, increaseBy: 3.2 },
                      { category: 'Instant Food', turnOver: 22000, increaseBy: 2.0 },
                      { category: 'Households', turnOver: 22000, increaseBy: 1.5 }
                    ]).map((category, index) => (
                      <div key={index} className="grid grid-cols-3 gap-4 text-sm font-inter">
                        <div className="text-secondary-900">{category.category}</div>
                        <div className="text-secondary-900">{formatCurrency(category.turnOver)}</div>
                        <div className="text-success-100">{formatPercentage(category.increaseBy)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Best Selling Product */}
                <div className="card p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-inter font-medium text-secondary-900">Best selling product</h2>
                    <button className="text-sm font-inter text-primary-400 hover:text-primary-300 transition-colors">
                      See All
                    </button>
                  </div>

                  {/* Product Headers */}
                  <div className="grid grid-cols-6 gap-2 text-sm font-inter font-medium text-secondary-600 mb-4">
                    <div>Product</div>
                    <div>Product ID</div>
                    <div>Category</div>
                    <div>Remaining Quantity</div>
                    <div>Turn Over</div>
                    <div>Increase By</div>
                  </div>

                  {/* Product Data */}
                  <div className="space-y-4">
                    {(reportsData?.bestSellingProducts || [
                      { product: 'Tomato', productId: '23567', category: 'Vegetable', remainingQuantity: '225 kg', turnOver: 17000, increaseBy: 2.3 },
                      { product: 'Onion', productId: '25831', category: 'Vegetable', remainingQuantity: '200 kg', turnOver: 12000, increaseBy: 1.3 },
                      { product: 'Maggi', productId: '56841', category: 'Instant Food', remainingQuantity: '200 Packet', turnOver: 10000, increaseBy: 1.3 },
                      { product: 'Surf Excel', productId: '23567', category: 'Household', remainingQuantity: '125 Packet', turnOver: 9000, increaseBy: 1.0 }
                    ]).map((product, index) => (
                      <div key={index} className="grid grid-cols-6 gap-2 text-sm font-inter">
                        <div className="text-secondary-900">{product.product}</div>
                        <div className="text-secondary-700">{product.productId}</div>
                        <div className="text-secondary-700">{product.category}</div>
                        <div className="text-secondary-700">{product.remainingQuantity}</div>
                        <div className="text-secondary-900">{formatCurrency(product.turnOver)}</div>
                        <div className="text-success-100">{formatPercentage(product.increaseBy)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierReports; 