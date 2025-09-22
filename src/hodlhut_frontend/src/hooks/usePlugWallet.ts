// React hook for Plug wallet integration
// Provides easy-to-use interface for components

import { useState, useEffect, useCallback } from 'react';
import { Principal } from '@dfinity/principal';
import { plugIntegration, ConnectionState } from '../services/PlugIntegration';
import { SwapRequest, SwapResponse, BalanceEntry } from '../types/myhut';

interface UsePlugWalletReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  principal: Principal | null;
  userHutId: Principal | null;
  error: string | null;

  // Core methods
  connectWallet: () => Promise<Principal | null>;
  disconnectWallet: () => Promise<void>;
  getUserHut: (principal?: Principal) => Promise<Principal | null>;
  executeSwap: (request: SwapRequest) => Promise<SwapResponse | null>;

  // Utility methods
  hasHut: (principal?: Principal) => Promise<boolean>;
  getTestPrincipal: () => Promise<Principal | null>;

  // State helpers
  clearError: () => void;
  refreshConnection: () => Promise<void>;
}

export const usePlugWallet = (): UsePlugWalletReturn => {
  // Local state
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    principal: null,
    userHutId: null,
    error: null
  });
  const [isConnecting, setIsConnecting] = useState(false);

  // Update local state from service
  const updateConnectionState = useCallback(() => {
    const state = plugIntegration.getConnectionState();
    setConnectionState(state);
  }, []);

  // Initialize and sync with service state
  useEffect(() => {
    updateConnectionState();

    // Set up periodic state sync (in case of external changes)
    const interval = setInterval(updateConnectionState, 1000);
    return () => clearInterval(interval);
  }, [updateConnectionState]);

  // Connect to Plug wallet
  const connectWallet = useCallback(async (): Promise<Principal | null> => {
    if (isConnecting) return null;

    setIsConnecting(true);
    try {
      console.log('🔌 Initiating Plug wallet connection...');

      const principal = await plugIntegration.connectPlug();
      updateConnectionState();

      console.log('✅ Wallet connected successfully:', principal.toString());
      return principal;

    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      updateConnectionState();
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, updateConnectionState]);

  // Disconnect from Plug wallet
  const disconnectWallet = useCallback(async (): Promise<void> => {
    try {
      console.log('🔌 Disconnecting Plug wallet...');

      await plugIntegration.disconnect();
      updateConnectionState();

      console.log('✅ Wallet disconnected successfully');

    } catch (error) {
      console.error('❌ Wallet disconnection failed:', error);
      updateConnectionState();
    }
  }, [updateConnectionState]);

  // Get user's Hut canister ID
  const getUserHut = useCallback(async (principal?: Principal): Promise<Principal | null> => {
    try {
      console.log('🏠 Getting user Hut canister...');

      const hutId = await plugIntegration.getUserHut(principal);
      updateConnectionState();

      console.log('✅ User Hut found:', hutId.toString());
      return hutId;

    } catch (error) {
      console.error('❌ Failed to get user Hut:', error);
      updateConnectionState();
      return null;
    }
  }, [updateConnectionState]);

  // Execute a swap through user's MyHut canister
  const executeSwap = useCallback(async (request: SwapRequest): Promise<SwapResponse | null> => {
    try {
      // Ensure we have a user Hut ID
      let hutId = connectionState.userHutId;
      if (!hutId) {
        console.log('🏠 No Hut ID cached, getting user Hut...');
        hutId = await getUserHut();
        if (!hutId) {
          throw new Error('Unable to get user Hut canister ID');
        }
      }

      console.log('🔄 Executing swap through MyHut canister...');
      console.log('📊 Swap details:', {
        from: request.fromAsset,
        to: request.toAsset,
        amount: request.amount,
        dex: request.dexPreference
      });

      const response = await plugIntegration.executeSwap(hutId, request);

      console.log('✅ Swap executed successfully:', response);
      return response;

    } catch (error) {
      console.error('❌ Swap execution failed:', error);
      updateConnectionState();
      return null;
    }
  }, [connectionState.userHutId, getUserHut, updateConnectionState]);

  // Check if user has a Hut
  const hasHut = useCallback(async (principal?: Principal): Promise<boolean> => {
    try {
      const result = await plugIntegration.hasHut(principal);
      console.log('🏠 User has Hut:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to check Hut status:', error);
      return false;
    }
  }, []);

  // Get test principal for development
  const getTestPrincipal = useCallback(async (): Promise<Principal | null> => {
    try {
      const testPrincipal = await plugIntegration.getTestPrincipal();
      console.log('🧪 Test principal:', testPrincipal.toString());
      return testPrincipal;
    } catch (error) {
      console.error('❌ Failed to get test principal:', error);
      return null;
    }
  }, []);

  // Clear current error
  const clearError = useCallback(() => {
    setConnectionState(prev => ({ ...prev, error: null }));
  }, []);

  // Refresh connection state
  const refreshConnection = useCallback(async (): Promise<void> => {
    try {
      updateConnectionState();

      // If connected, refresh Hut ID
      if (connectionState.isConnected && connectionState.principal) {
        await getUserHut(connectionState.principal);
      }
    } catch (error) {
      console.error('❌ Failed to refresh connection:', error);
    }
  }, [connectionState.isConnected, connectionState.principal, getUserHut, updateConnectionState]);

  return {
    // Connection state
    isConnected: connectionState.isConnected,
    isConnecting,
    principal: connectionState.principal,
    userHutId: connectionState.userHutId,
    error: connectionState.error,

    // Core methods
    connectWallet,
    disconnectWallet,
    getUserHut,
    executeSwap,

    // Utility methods
    hasHut,
    getTestPrincipal,

    // State helpers
    clearError,
    refreshConnection
  };
};

// Custom hook for simplified wallet connection status
export const useWalletConnection = () => {
  const { isConnected, isConnecting, principal, error } = usePlugWallet();

  return {
    isConnected,
    isConnecting,
    principal,
    error,
    principalText: principal?.toString() || null
  };
};

// Custom hook for swap operations
export const useSwapOperations = () => {
  const {
    isConnected,
    userHutId,
    executeSwap,
    getUserHut,
    error
  } = usePlugWallet();

  const [isSwapping, setIsSwapping] = useState(false);
  const [lastSwapResult, setLastSwapResult] = useState<SwapResponse | null>(null);

  const performSwap = useCallback(async (request: SwapRequest): Promise<boolean> => {
    if (!isConnected) {
      console.error('❌ Wallet not connected');
      return false;
    }

    setIsSwapping(true);
    setLastSwapResult(null);

    try {
      const result = await executeSwap(request);
      setLastSwapResult(result);
      return result?.success || false;
    } catch (error) {
      console.error('❌ Swap operation failed:', error);
      return false;
    } finally {
      setIsSwapping(false);
    }
  }, [isConnected, executeSwap]);

  return {
    isConnected,
    userHutId,
    isSwapping,
    lastSwapResult,
    performSwap,
    getUserHut,
    error
  };
};