import React, { createContext, useContext, useState, useEffect } from 'react';
// DEMO MODE: Disabled for demo
// import { authService } from '../services/auth';

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
  // DEMO MODE: Start as authenticated by default
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [principal, setPrincipal] = useState<Principal | null>(
    Principal.fromText('rdmx6-jaaaa-aaaaa-aaadq-cai')
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // DEMO MODE: Skip auth initialization
    console.log('Demo mode: Skipping auth initialization - already authenticated');
    // initAuth();
  }, []);

  const initAuth = async () => {
    try {
      // DEMO MODE: Skip Internet Identity for demo purposes
      console.log('Demo mode: Bypassing Internet Identity authentication');
      
      // Create a mock principal for demo
      const mockPrincipal = Principal.fromText('rdmx6-jaaaa-aaaaa-aaadq-cai');
      setIsAuthenticated(true);
      setPrincipal(mockPrincipal);
      
      // Original auth code commented out for demo
      // await authService.init();
      // const authenticated = await authService.isAuthenticated();
      // 
      // if (authenticated) {
      //   const userPrincipal = await authService.getPrincipal();
      //   setIsAuthenticated(true);
      //   setPrincipal(userPrincipal);
      // }
    } catch (error) {
      console.error('Auth initialization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      // DEMO MODE: Simulate successful login
      console.log('Demo mode: Simulating successful login');
      
      const mockPrincipal = Principal.fromText('rdmx6-jaaaa-aaaaa-aaadq-cai');
      setIsAuthenticated(true);
      setPrincipal(mockPrincipal);
      return true;
      
      // Original auth code commented out for demo
      // const success = await authService.login();
      // 
      // if (success) {
      //   const userPrincipal = await authService.getPrincipal();
      //   setIsAuthenticated(true);
      //   setPrincipal(userPrincipal);
      //   return true;
      // }
      // return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // DEMO MODE: Simulate logout
      console.log('Demo mode: Simulating logout');
      setIsAuthenticated(false);
      setPrincipal(null);
      
      // Original auth code commented out for demo
      // await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
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