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
  Loader2
} from 'lucide-react';

const SupplierDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  
  // State for dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dashboardAPI.getSupplierDashboard();
        setDashboardData(data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
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
              placeholder="Search product, supplier, order"
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

        {/* Dashboard Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              <span className="ml-2 text-secondary-600">Loading dashboard data...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600 font-medium">Error loading dashboard data</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sales Overview */}
                <div className="card p-6">
                  <h2 className="text-xl font-inter font-medium text-secondary-900 mb-6">
                    Sales Overview
                  </h2>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-info-50 rounded mx-auto mb-3 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-info-100" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-inter font-semibold text-secondary-700">
                          {dashboardData?.salesOverview?.sales || 0}
                        </p>
                        <p className="text-sm font-inter font-medium text-secondary-600">Sales</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-purple-50 rounded mx-auto mb-3 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-purple-100" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-inter font-semibold text-secondary-700">
                          ₹ {dashboardData?.salesOverview?.revenue?.toLocaleString('en-IN') || '0'}
                        </p>
                        <p className="text-sm font-inter font-medium text-secondary-600">Revenue</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-warning-50 rounded mx-auto mb-3 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-warning-100" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-inter font-semibold text-secondary-700">
                          ₹ {dashboardData?.salesOverview?.profit?.toLocaleString('en-IN') || '0'}
                        </p>
                        <p className="text-sm font-inter font-medium text-secondary-600">Profit</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-success-50 rounded mx-auto mb-3 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-success-100" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-inter font-semibold text-secondary-700">
                          ₹ {dashboardData?.salesOverview?.cost?.toLocaleString('en-IN') || '0'}
                        </p>
                        <p className="text-sm font-inter font-medium text-secondary-600">Cost</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Purchase Overview */}
                <div className="card p-6">
                  <h2 className="text-xl font-inter font-medium text-secondary-900 mb-6">
                    Purchase Overview
                  </h2>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-info-50 rounded mx-auto mb-3 flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-info-200" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-inter font-semibold text-secondary-700">
                          {dashboardData?.purchaseOverview?.purchase || 0}
                        </p>
                        <p className="text-sm font-inter font-medium text-secondary-600">Purchase</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-purple-50 rounded mx-auto mb-3 flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-purple-100" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-inter font-semibold text-secondary-700">
                          {dashboardData?.purchaseOverview?.cancel || 0}
                        </p>
                        <p className="text-sm font-inter font-medium text-secondary-600">Cancel</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-success-50 rounded mx-auto mb-3 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-success-100" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-inter font-semibold text-secondary-700">
                          ₹ {dashboardData?.purchaseOverview?.cost?.toLocaleString('en-IN') || '0'}
                        </p>
                        <p className="text-sm font-inter font-medium text-secondary-600">Cost</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-warning-50 rounded mx-auto mb-3 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-warning-100" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-inter font-semibold text-secondary-700">
                          ₹ {dashboardData?.purchaseOverview?.return?.toLocaleString('en-IN') || '0'}
                        </p>
                        <p className="text-sm font-inter font-medium text-secondary-600">Return</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inventory Summary */}
                <div className="card p-6">
                  <h2 className="text-xl font-inter font-medium text-secondary-900 mb-6">
                    Inventory Summary
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-warning-50 rounded mx-auto mb-3 flex items-center justify-center">
                        <Package className="w-5 h-5 text-warning-200" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-inter font-semibold text-secondary-700">
                          {dashboardData?.inventorySummary?.quantityInHand || 0}
                        </p>
                        <p className="text-sm font-inter font-medium text-secondary-600">Quantity in Hand</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-purple-50 rounded mx-auto mb-3 flex items-center justify-center">
                        <Package className="w-5 h-5 text-purple-100" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-inter font-semibold text-secondary-700">
                          {dashboardData?.inventorySummary?.toBeReceived || 0}
                        </p>
                        <p className="text-sm font-inter font-medium text-secondary-600">To be received</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Summary */}
                <div className="card p-6">
                  <h2 className="text-xl font-inter font-medium text-secondary-900 mb-6">
                    Product Summary
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-info-50 rounded mx-auto mb-3 flex items-center justify-center">
                        <Store className="w-5 h-5 text-info-300" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-inter font-semibold text-secondary-700">
                          {dashboardData?.productSummary?.numberOfSuppliers || 0}
                        </p>
                        <p className="text-sm font-inter font-medium text-secondary-600">Number of Customers</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-purple-50 rounded mx-auto mb-3 flex items-center justify-center">
                        <Package className="w-5 h-5 text-purple-100" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-inter font-semibold text-secondary-700">
                          {dashboardData?.productSummary?.numberOfCategories || 0}
                        </p>
                        <p className="text-sm font-inter font-medium text-secondary-600">Number of Categories</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Low Quantity Stock */}
              <div className="mt-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-inter font-medium text-secondary-900">
                    Low Quantity Stock
                  </h2>
                  <button
                    onClick={() => navigate('/supplier/inventory')}
                    className="text-sm font-inter text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    See All
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {dashboardData?.lowStockProducts?.length > 0 ? (
                    dashboardData.lowStockProducts.map((product) => (
                      <div key={product.id} className="card p-4 flex items-center gap-4">
                        <div className="w-15 h-17 bg-secondary-200 rounded flex items-center justify-center">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <Package className="w-8 h-8 text-secondary-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-inter font-semibold text-secondary-900">{product.name}</h3>
                          <p className="text-sm font-inter text-secondary-600">
                            Remaining Quantity: {product.stock_quantity} {product.unit || 'units'}
                          </p>
                        </div>
                        <div className="bg-red-50 text-red-600 px-2 py-1 rounded-full text-xs font-inter font-medium">
                          Low
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 text-center py-8 text-secondary-600">
                      <Package className="w-12 h-12 mx-auto mb-3 text-secondary-400" />
                      <p>No low stock products found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Top Selling Stock */}
              <div className="mt-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-inter font-medium text-secondary-900">
                    Top Selling Stock
                  </h2>
                  <button
                    onClick={() => navigate('/supplier/reports')}
                    className="text-sm font-inter text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    See All
                  </button>
                </div>
                <div className="card">
                  <div className="p-6">
                    <div className="grid grid-cols-4 gap-4 text-sm font-inter font-medium text-secondary-700 mb-4">
                      <div>Name</div>
                      <div>Sold Quantity</div>
                      <div>Remaining Quantity</div>
                      <div>Price</div>
                    </div>
                    <div className="space-y-4">
                      {dashboardData?.topSellingProducts?.length > 0 ? (
                        dashboardData.topSellingProducts.map((product, index) => (
                          <div key={index} className="grid grid-cols-4 gap-4 text-sm font-inter text-secondary-800">
                            <div>{product.name}</div>
                            <div>{product.soldQuantity}</div>
                            <div>{product.remainingQuantity}</div>
                            <div>₹ {product.price?.toLocaleString('en-IN') || '0'}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-secondary-600">
                          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-secondary-400" />
                          <p>No sales data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierDashboard;
