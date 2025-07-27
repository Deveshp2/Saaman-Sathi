import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SignUp = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    userType: 'vendor'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUserTypeChange = (userType) => {
    setFormData(prev => ({
      ...prev,
      userType
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        formData.userType
      );

      if (error) {
        setError(error.message);
      } else {
        // Redirect based on user type
        if (formData.userType === 'supplier') {
          navigate('/supplier/dashboard');
        } else {
          navigate('/vendor/dashboard');
        }
      }
    } catch (error) {
      setError('An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50 flex items-center justify-center px-4">
      <div className="w-full max-w-[516px]">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-urbanist font-semibold text-secondary-950 mb-2">
            Create an account
          </h1>
          <div className="flex justify-center items-center gap-2 text-base font-urbanist">
            <span className="text-secondary-800">Have an account ?</span>
            <Link to="/signin" className="text-secondary-950 hover:text-primary-200 transition-colors">
              Sign in
            </Link>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-urbanist text-secondary-950 mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Ryan Edgar"
              className="input-field"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-urbanist text-secondary-950 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="xyz@mail.com"
              className="input-field"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-urbanist text-secondary-950 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              className="input-field"
              required
            />
          </div>

          {/* User Type Selection */}
          <div>
            <div className="flex gap-6">
              <button
                type="button"
                onClick={() => handleUserTypeChange('vendor')}
                className={`flex-1 py-4 px-8 rounded-lg border transition-colors ${
                  formData.userType === 'vendor'
                    ? 'border-secondary-950 text-secondary-950'
                    : 'border-secondary-300 text-secondary-400'
                }`}
              >
                Vendor
              </button>
              <button
                type="button"
                onClick={() => handleUserTypeChange('supplier')}
                className={`flex-1 py-4 px-8 rounded-lg border transition-colors ${
                  formData.userType === 'supplier'
                    ? 'border-secondary-950 text-secondary-950'
                    : 'border-secondary-300 text-secondary-400'
                }`}
              >
                Supplier
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-300 text-white font-urbanist font-semibold py-4 px-8 rounded-lg hover:bg-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create your account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignUp; 