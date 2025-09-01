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
  Calendar,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  CheckCircle,
  X
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const SupplierReports = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  // State management
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Weekly');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load comprehensive reports data on component mount
  useEffect(() => {
    const loadReportsData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dashboardAPI.getComprehensiveReports(selectedPeriod);
        setReportsData(data);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Error loading reports data:', err);
        setError(err.message || 'Failed to load reports data');
      } finally {
        setLoading(false);
      }
    };

    loadReportsData();

    // Set up auto-refresh every 60 seconds for real-time data
    const refreshInterval = setInterval(() => {
      loadReportsData();
    }, 60000);

    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
  }, [selectedPeriod]);

  // Manual refresh function
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const data = await dashboardAPI.getComprehensiveReports(selectedPeriod);
      setReportsData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error refreshing reports data:', err);
      setError(err.message || 'Failed to refresh reports data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/signin');
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

  // Create chart data for sales trend
  const createSalesTrendChartData = () => {
    if (!reportsData?.salesTrendData) return null;

    const data = reportsData.salesTrendData;

    return {
      labels: data.map(item => item.label),
      datasets: [
        {
          label: 'Revenue (₹)',
          data: data.map(item => item.revenue),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
        },
        {
          label: 'Orders',
          data: data.map(item => item.orders),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(16, 185, 129)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          yAxisID: 'y1',
        }
      ]
    };
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            family: 'Inter',
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            if (context.datasetIndex === 0) {
              return `Revenue: ₹${context.parsed.y.toLocaleString('en-IN')}`;
            } else {
              return `Orders: ${context.parsed.y}`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            family: 'Inter',
            size: 11
          },
          color: '#6B7280'
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            family: 'Inter',
            size: 11
          },
          color: '#6B7280',
          callback: function(value) {
            return '₹' + value.toLocaleString('en-IN');
          }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          font: {
            family: 'Inter',
            size: 11
          },
          color: '#6B7280'
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
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
                  <option value="Yearly">Yearly</option>
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
                {/* Real-time Overview Section */}
                <div className="card p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-inter font-medium text-secondary-900">Real-time Overview</h2>
                    <div className="flex items-center gap-2 text-xs text-secondary-500">
                      <Activity className="w-3 h-3" />
                      Live Data
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {/* Total Revenue */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <p className="text-2xl font-inter font-semibold text-secondary-900">
                          ₹{(reportsData?.revenueAnalytics?.totalRevenue ?? 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <p className="text-sm font-inter text-secondary-600">Total Revenue</p>
                    </div>

                    {/* Total Orders */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <ShoppingCart className="w-4 h-4 text-blue-500" />
                        <p className="text-2xl font-inter font-semibold text-secondary-900">
                          {reportsData?.ordersAnalytics?.totalOrders ?? 0}
                        </p>
                      </div>
                      <p className="text-sm font-inter text-secondary-600">Total Orders</p>
                    </div>

                    {/* Completion Rate */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <BarChart3 className="w-4 h-4 text-purple-500" />
                        <p className="text-2xl font-inter font-semibold text-secondary-900">
                          {(reportsData?.ordersAnalytics?.completionRate ?? 0).toFixed(1)}%
                        </p>
                      </div>
                      <p className="text-sm font-inter text-secondary-600">Completion Rate</p>
                    </div>

                    {/* Average Order Value */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <TrendingUp className="w-4 h-4 text-orange-500" />
                        <p className="text-2xl font-inter font-semibold text-secondary-900">
                          ₹{(reportsData?.ordersAnalytics?.averageOrderValue ?? 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <p className="text-sm font-inter text-secondary-600">Avg Order Value</p>
                    </div>

                    {/* Recent Activity */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <Activity className="w-4 h-4 text-indigo-500" />
                        <p className="text-2xl font-inter font-semibold text-secondary-900">
                          {reportsData?.ordersAnalytics?.recentOrders ?? 0}
                        </p>
                      </div>
                      <p className="text-sm font-inter text-secondary-600">Recent Orders (7d)</p>
                    </div>

                    {/* Pending Orders */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <Clock className="w-4 h-4 text-yellow-500" />
                        <p className="text-2xl font-inter font-semibold text-secondary-900">
                          {reportsData?.ordersAnalytics?.pendingOrders ?? 0}
                        </p>
                      </div>
                      <p className="text-sm font-inter text-secondary-600">Pending Orders</p>
                    </div>

                    {/* Completed Orders */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <p className="text-2xl font-inter font-semibold text-secondary-900">
                          {reportsData?.ordersAnalytics?.completedOrders ?? 0}
                        </p>
                      </div>
                      <p className="text-sm font-inter text-secondary-600">Completed Orders</p>
                    </div>

                    {/* Cancelled Orders */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <X className="w-4 h-4 text-red-500" />
                        <p className="text-2xl font-inter font-semibold text-secondary-900">
                          {reportsData?.ordersAnalytics?.cancelledOrders ?? 0}
                        </p>
                      </div>
                      <p className="text-sm font-inter text-secondary-600">Cancelled Orders</p>
                    </div>
                  </div>
                </div>

                {/* Real-time Sales Trend Chart */}
                <div className="card p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-lg font-inter font-medium text-secondary-900">
                        Sales Trend ({selectedPeriod} View)
                      </h2>
                      <p className="text-sm text-secondary-600 mt-1">Real-time revenue and order tracking</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-xs text-secondary-500">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Live Data
                      </div>
                      <button className="text-sm font-inter text-secondary-600 hover:text-secondary-700 transition-colors">
                        Download
                      </button>
                    </div>
                  </div>

                  {/* Chart Area */}
                  <div className="h-80">
                    {reportsData?.salesTrendData && createSalesTrendChartData() ? (
                      <Line data={createSalesTrendChartData()} options={chartOptions} />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <BarChart3 className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
                          <p className="text-secondary-600">Loading chart data...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chart Summary */}
                  <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-secondary-100">
                    <div className="text-center">
                      <p className="text-sm text-secondary-600">Peak Revenue Day</p>
                      <p className="text-lg font-semibold text-secondary-900">
                        ₹{reportsData?.salesTrendData ?
                          Math.max(...reportsData.salesTrendData.map(d => d.revenue)).toLocaleString('en-IN') :
                          '0'
                        }
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-secondary-600">Total Orders ({selectedPeriod})</p>
                      <p className="text-lg font-semibold text-secondary-900">
                        {reportsData?.salesTrendData ?
                          reportsData.salesTrendData.reduce((sum, d) => sum + d.orders, 0) :
                          0
                        }
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-secondary-600">
                        Avg {selectedPeriod === 'Weekly' ? 'Daily' : selectedPeriod === 'Monthly' ? 'Daily' : selectedPeriod === 'Quarterly' ? 'Weekly' : 'Monthly'} Revenue
                      </p>
                      <p className="text-lg font-semibold text-secondary-900">
                        ₹{reportsData?.salesTrendData && reportsData.salesTrendData.length > 0 ?
                          (reportsData.salesTrendData.reduce((sum, d) => sum + d.revenue, 0) / reportsData.salesTrendData.length).toLocaleString('en-IN') :
                          '0'
                        }
                      </p>
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