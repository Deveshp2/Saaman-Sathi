import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI } from '../../lib/api';
import { useToast } from '../ui/Toast';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Camera,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Upload
} from 'lucide-react';

const ProfileSettings = () => {
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();

  // State management
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    company_name: '',
    phone: '',
    address: '',
    // Supplier specific fields
    business_license: '',
    tax_id: ''
  });

  // Password form data
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
    showPassword: false
  });

  // Load profile data
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const profileData = await userAPI.getProfile();
      setProfile(profileData);
      setFormData({
        full_name: profileData.full_name || '',
        email: profileData.email || '',
        company_name: profileData.company_name || '',
        phone: profileData.phone || '',
        address: profileData.address || '',
        business_license: profileData.business_license || '',
        tax_id: profileData.tax_id || ''
      });
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err.message);
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle password input changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save profile changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);

      // Prepare updates object
      const updates = { ...formData };
      
      // Convert credit_limit to number if provided
      if (updates.credit_limit) {
        updates.credit_limit = parseFloat(updates.credit_limit);
      }

      await userAPI.updateProfile(updates);
      await loadProfile(); // Reload to get updated data
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message);
      showToast('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      showToast('Please select a valid image file (JPEG, PNG, GIF, or WebP)', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be less than 5MB', 'error');
      return;
    }

    try {
      setAvatarUploading(true);
      setError(null);

      console.log('Uploading avatar:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // Check if images bucket exists before upload (optional check)
      try {
        const bucketCheck = await userAPI.checkAvatarsBucket();
        if (!bucketCheck.exists) {
          console.log('Images bucket verification failed, but proceeding with upload...');
          // Don't throw error here, let the upload attempt handle it
        }
      } catch (bucketError) {
        console.warn('Bucket check failed, but proceeding with upload:', bucketError);
        // Continue with upload - the upload function will handle bucket issues
      }

      const avatarUrl = await userAPI.uploadAvatar(file);
      console.log('Avatar uploaded successfully:', avatarUrl);

      await loadProfile(); // Reload to get updated avatar
      showToast('Avatar updated successfully!', 'success');

      // Clear the file input
      e.target.value = '';
    } catch (err) {
      console.error('Error uploading avatar:', err);
      const errorMessage = err.message || 'Failed to upload avatar';
      setError(`Avatar upload failed: ${errorMessage}`);
      showToast(`Failed to upload avatar: ${errorMessage}`, 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  // Handle avatar deletion
  const handleDeleteAvatar = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) {
      return;
    }

    try {
      setAvatarUploading(true);
      setError(null);

      await userAPI.deleteAvatar();
      await loadProfile(); // Reload to get updated profile
      showToast('Avatar removed successfully!', 'success');
    } catch (err) {
      console.error('Error deleting avatar:', err);
      const errorMessage = err.message || 'Failed to remove avatar';
      setError(`Avatar deletion failed: ${errorMessage}`);
      showToast(`Failed to remove avatar: ${errorMessage}`, 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  // Handle password change
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    try {
      setSaving(true);
      await userAPI.changePassword(passwordData.newPassword);
      setPasswordData({ newPassword: '', confirmPassword: '', showPassword: false });
      setShowPasswordForm(false);
      showToast('Password changed successfully!', 'success');
    } catch (err) {
      console.error('Error changing password:', err);
      showToast('Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          <span className="text-secondary-600">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">Error Loading Profile</h3>
          <p className="text-secondary-600 mb-4">{error}</p>
          <button
            onClick={loadProfile}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile Information', icon: User },
    { id: 'security', label: 'Security', icon: Lock }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <ToastContainer />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary-900 mb-2">Profile Settings</h1>
        <p className="text-secondary-600">Manage your account information and preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-secondary-200 mb-8">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-8">
          {/* Avatar Section */}
          <div className="bg-white rounded-lg p-6 border border-secondary-200">
            <h3 className="text-lg font-medium text-secondary-900 mb-4">Profile Picture</h3>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-secondary-100 flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-secondary-400" />
                  )}
                </div>
                {avatarUploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex gap-3">
                  <label className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors cursor-pointer flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload New
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={avatarUploading}
                    />
                  </label>
                  
                  {profile?.avatar_url && (
                    <button
                      onClick={handleDeleteAvatar}
                      disabled={avatarUploading}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-sm text-secondary-500 mt-2">
                  JPG, PNG or GIF. Max size 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <form onSubmit={handleSaveProfile}>
            <div className="bg-white rounded-lg p-6 border border-secondary-200">
              <h3 className="text-lg font-medium text-secondary-900 mb-6">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                {profile?.user_type === 'supplier' && (
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      <Building className="w-4 h-4 inline mr-2" />
                      Shop Name
                    </label>
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    placeholder="Enter your complete address..."
                  />
                </div>
              </div>
            </div>

            {/* User Type Specific Fields */}
            {profile?.user_type === 'supplier' && (
              <div className="bg-white rounded-lg p-6 border border-secondary-200 mt-6">
                <h3 className="text-lg font-medium text-secondary-900 mb-6">Supplier Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Business License
                    </label>
                    <input
                      type="text"
                      name="business_license"
                      value={formData.business_license}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter business license number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Tax ID
                    </label>
                    <input
                      type="text"
                      name="tax_id"
                      value={formData.tax_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter tax identification number"
                    />
                  </div>
                </div>
              </div>
            )}

            {profile?.user_type === 'vendor' && (
              <div className="bg-white rounded-lg p-6 border border-secondary-200 mt-6">
                <h3 className="text-lg font-medium text-secondary-900 mb-6">Vendor Information</h3>
                <p className="text-secondary-600">No additional vendor-specific information required at this time.</p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-red-800">{error}</span>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end mt-8">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 border border-secondary-200">
            <h3 className="text-lg font-medium text-secondary-900 mb-4">Password</h3>

            {!showPasswordForm ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary-600">Change your account password</p>
                  <p className="text-sm text-secondary-500 mt-1">
                    Last updated: {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Never'}
                  </p>
                </div>
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Change Password
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={passwordData.showPassword ? 'text' : 'password'}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-3 py-2 pr-10 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter new password"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordData(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                    >
                      {passwordData.showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type={passwordData.showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Update Password
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({ newPassword: '', confirmPassword: '', showPassword: false });
                    }}
                    className="px-4 py-2 bg-secondary-200 text-secondary-700 rounded-lg hover:bg-secondary-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Account Information */}
          <div className="bg-white rounded-lg p-6 border border-secondary-200">
            <h3 className="text-lg font-medium text-secondary-900 mb-4">Account Information</h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-secondary-600">User Type:</span>
                <span className="font-medium text-secondary-900 capitalize">{profile?.user_type}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-secondary-600">Account Created:</span>
                <span className="font-medium text-secondary-900">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-secondary-600">Last Updated:</span>
                <span className="font-medium text-secondary-900">
                  {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSettings;
