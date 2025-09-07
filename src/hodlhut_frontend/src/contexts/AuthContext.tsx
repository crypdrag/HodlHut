import React, { createContext, useContext, useState, useEffect } from 'react';
// import { authService } from '../services/auth'; // Disabled for development preview

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
  // DEMO MODE: Simplified authentication for development preview
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock principal for demo purposes
  const mockPrincipal = Principal.fromText('rdmx6-jaaaa-aaaaa-aaadq-cai');

  useEffect(() => {
    // Skip Internet Identity initialization for development preview
    console.log('Running in development preview mode - Internet Identity disabled');
  }, []);

  const login = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log('Demo login - simulating Internet Identity authentication...');
      
      // Simulate login delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful authentication
      setIsAuthenticated(true);
      setPrincipal(mockPrincipal);
      console.log('Demo login successful:', mockPrincipal.toString());
      return true;
    } catch (error) {
      console.error('Demo login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      console.log('Demo logout...');
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsAuthenticated(false);
      setPrincipal(null);
      console.log('Demo logout successful');
    } catch (error) {
      console.error('Demo logout failed:', error);
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