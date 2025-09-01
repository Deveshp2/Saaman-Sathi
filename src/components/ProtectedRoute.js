import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, userType }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [redirectPath, setRedirectPath] = useState('');

  // Use an effect to determine redirects only after a short delay
  // This prevents flash redirects during tab switches
  useEffect(() => {
    // Check if we have a session in localStorage
    const sessionActive = localStorage.getItem('sessionActive') === 'true';
    
    // If loading or we have an active session, don't redirect yet
    if (loading || sessionActive) {
      return;
    }

    // Only redirect if we're sure the user isn't authenticated
    if (!isAuthenticated && !user) {
      const timer = setTimeout(() => {
        setShouldRedirect(true);
        setRedirectPath('/signin');
      }, 300); // Small delay to prevent flash redirects
      return () => clearTimeout(timer);
    }

    // Check user type after we're sure we have a user
    if (user && userType && user.user_type !== userType) {
      const timer = setTimeout(() => {
        setShouldRedirect(true);
        if (user.user_type === 'supplier') {
          setRedirectPath('/supplier/dashboard');
        } else if (user.user_type === 'vendor') {
          setRedirectPath('/vendor/dashboard');
        } else {
          setRedirectPath('/');
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [user, loading, isAuthenticated, userType]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-200"></div>
      </div>
    );
  }

  // Handle redirects
  if (shouldRedirect) {
    return <Navigate to={redirectPath} replace />;
  }

  // If we have a session active in localStorage but no user yet, show loading
  const sessionActive = localStorage.getItem('sessionActive') === 'true';
  if (sessionActive && !user) {
    return (
      <div className="min-h-screen bg-secondary-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-200"></div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;