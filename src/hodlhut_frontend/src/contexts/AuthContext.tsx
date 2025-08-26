import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';

import { Principal } from '@dfinity/principal';

interface AuthContextType {
  isAuthenticated: boolean;
  principal: Principal | null;
  isLoading: boolean;
  login: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // DEMO MODE: Start as NOT authenticated for demo login flow
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize real Internet Identity authentication
    console.log('Initializing Internet Identity authentication...');
    initAuth();
  }, []);

  const initAuth = async () => {
    setIsLoading(true);
    try {
      console.log('Initializing LOCAL Internet Identity auth service...');
      
      await authService.init();
      const authenticated = await authService.isAuthenticated();
      
      if (authenticated) {
        const userPrincipal = await authService.getPrincipal();
        setIsAuthenticated(true);
        setPrincipal(userPrincipal);
        console.log('User already authenticated locally:', userPrincipal?.toString());
      } else {
        console.log('User not authenticated - ready for local II login');
      }
    } catch (error) {
      console.error('Local auth initialization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log('Starting LOCAL Internet Identity login...');
      
      const success = await authService.login();
      
      if (success) {
        const userPrincipal = await authService.getPrincipal();
        setIsAuthenticated(true);
        setPrincipal(userPrincipal);
        console.log('Local II login successful:', userPrincipal?.toString());
        return true;
      }
      
      console.log('Local II login failed');
      return false;
    } catch (error) {
      console.error('Local II login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      console.log('Logging out from LOCAL Internet Identity...');
      await authService.logout();
      setIsAuthenticated(false);
      setPrincipal(null);
      console.log('Local II logout successful');
    } catch (error) {
      console.error('Local II logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    principal,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};