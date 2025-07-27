import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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
      return { error: null };
    } catch (error) {
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