import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const authCheckInProgress = useRef(false);
    const lastActivityTimestamp = useRef(Date.now());
    const sessionTimeoutRef = useRef(null);

    // Function to get session that prevents concurrent calls
    const getSession = async (force = false) => {
      // Prevent concurrent session checks
      if (authCheckInProgress.current && !force) {
        return;
      }

      try {
        authCheckInProgress.current = true;
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(session.user));
          localStorage.setItem('sessionActive', 'true');
        } else if (force) {
          // Only clear on forced checks to prevent unwanted logouts
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('user');
          localStorage.removeItem('sessionActive');
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        authCheckInProgress.current = false;
        setLoading(false);
      }
    };

    // Track user activity
    const updateActivity = () => {
      lastActivityTimestamp.current = Date.now();
    };

    // Handle storage events for cross-tab synchronization
    const handleStorageChange = (event) => {
      if (event.key === 'sessionActive') {
        if (event.newValue === 'true') {
          // Another tab logged in
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
              setIsAuthenticated(true);
              setLoading(false);
            } catch (e) {
              console.error('Failed to parse user from localStorage', e);
            }
          }
        } else if (event.newValue === null) {
          // Another tab logged out
          setUser(null);
          setIsAuthenticated(false);
          setLoading(false);
        }
      }
    };

    useEffect(() => {
      // Check for stored session first
      const sessionActive = localStorage.getItem('sessionActive') === 'true';
      const storedUser = localStorage.getItem('user');
      
      if (sessionActive && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        } catch (e) {
          localStorage.removeItem('user');
        }
      }

      // Initialize session
      getSession();

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setUser(session.user);
            setIsAuthenticated(true);
            localStorage.setItem('user', JSON.stringify(session.user));
            localStorage.setItem('sessionActive', 'true');
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('user');
            localStorage.removeItem('sessionActive');
          }
          setLoading(false);
        }
      );

      // Handle visibility change events
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          // Only verify session if we're supposed to be logged in
          // and it's been more than 5 seconds since last check
          if (isAuthenticated && Date.now() - lastActivityTimestamp.current > 5000) {
            getSession();
          }
          updateActivity();
        }
      };

      // Set up event listeners for user activity
      const activityEvents = ['mousedown', 'keydown', 'touchstart', 'click'];
      activityEvents.forEach(event => {
        document.addEventListener(event, updateActivity);
      });
      
      // Add event listeners
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('storage', handleStorageChange);

      // Set a periodic check for session validity when the tab is active
      const periodicSessionCheck = () => {
        if (document.visibilityState === 'visible' && isAuthenticated) {
          getSession();
        }
        sessionTimeoutRef.current = setTimeout(periodicSessionCheck, 5 * 60 * 1000); // Check every 5 minutes
      };
      
      sessionTimeoutRef.current = setTimeout(periodicSessionCheck, 5 * 60 * 1000);

      return () => {
        subscription.unsubscribe();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('storage', handleStorageChange);
        activityEvents.forEach(event => {
          document.removeEventListener(event, updateActivity);
        });
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
        }
      };
    }, [isAuthenticated]);

  const signUp = async (email, password, fullName, userType, companyName = null) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            user_type: userType,
            company_name: companyName || null,
          }
        }
      });

      if (error) throw error;

      // The database trigger will automatically create the profile and user type records
      // No need to manually insert them here

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signIn = async (email, password, userType) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Get user profile to verify user type
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_type, full_name, company_name')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          throw new Error('User profile not found');
        }

        // Verify that the user is signing in with the correct user type
        if (profile.user_type !== userType) {
          throw new Error(`Invalid user type. This account is registered as a ${profile.user_type}, not a ${userType}.`);
        }

        // Add user type and profile data to the user object
        data.user.user_type = profile.user_type;
        data.user.full_name = profile.full_name;
        data.user.company_name = profile.company_name;
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear user state immediately
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
      localStorage.removeItem('sessionActive');

      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
