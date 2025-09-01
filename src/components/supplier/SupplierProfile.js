import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI } from '../../lib/api';
import ProfileSettings from '../shared/ProfileSettings';
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
  User
} from 'lucide-react';

const SupplierProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);

  // Load profile data for avatar
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileData = await userAPI.getProfile();
        setProfile(profileData);
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    loadProfile();
  }, []);

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
    { icon: Settings, label: 'Settings', path: '/supplier/settings', active: location.pathname === '/supplier/settings' },
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
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-secondary-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-inter font-semibold text-secondary-900">Profile Settings</h1>
              <p className="text-secondary-600 mt-1">Manage your supplier account information</p>
            </div>

            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 w-80 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Notifications */}
              <button className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-lg transition-colors">
                <Bell className="w-6 h-6" />
              </button>

              {/* Profile */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-primary-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary-900">
                    {user?.full_name || 'Supplier'}
                  </p>
                  <p className="text-xs text-secondary-500 capitalize">{user?.user_type}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <ProfileSettings />
        </div>
      </div>
    </div>
  );
};

export default SupplierProfile;
