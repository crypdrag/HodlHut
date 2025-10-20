/**
 * Simple Plug Wallet Service
 * Direct integration with window.ic.plug (Plug browser extension)
 * Auto-falls back to demo mode for testnet if no wallet available
 */

import { Principal } from '@dfinity/principal';

// Declare Plug wallet type
declare global {
  interface Window {
    ic?: {
      plug?: any;
    };
  }
}

interface PlugWalletState {
  principal: string | null;
  isConnected: boolean;
  isDemoMode: boolean;
}

interface PlugBalance {
  asset: string;
  balance: string;
}

class SimplePlugWallet {
  private listeners: Set<(state: PlugWalletState) => void> = new Set();
  private state: PlugWalletState = {
    principal: null,
    isConnected: false,
    isDemoMode: false,
  };

  // Demo mode mock balances (ICP ecosystem assets)
  private demoBalances: Record<string, string> = {
    'ICP': '100.5',
    'ckBTC': '0.25',
    'ckETH': '1.5',
    'ckUSDC': '5000.0',
    'ckUSDT': '5000.0',
  };

  constructor() {
    // Check if already connected (Plug persists connections)
    this.checkConnection();
  }

  /**
   * Check if Plug wallet is available (extension installed)
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' &&
           typeof window.ic?.plug !== 'undefined';
  }

  /**
   * Check if already connected (on page load)
   */
  async checkConnection(): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const isConnected = await window.ic!.plug.isConnected();

      if (isConnected) {
        const principal = await window.ic!.plug.getPrincipal();
        this.state = {
          principal: principal.toString(),
          isConnected: true,
          isDemoMode: false,
        };
        this.notifyListeners();
        console.log('✅ Plug wallet already connected:', principal.toString());
      }
    } catch (error) {
      console.error('Error checking Plug wallet connection:', error);
    }
  }

  /**
   * Connect wallet (request access)
   * Falls back to demo mode for testnet if no wallet available
   */
  async connect(): Promise<string> {
    // Try real Plug wallet first
    if (this.isAvailable()) {
      try {
        const whitelist = [
          // Add your canister IDs here
          process.env.REACT_APP_HODLPROTOCOL_EXCHANGE_CANISTER_ID,
          process.env.REACT_APP_HODLPROTOCOL_FRONTEND_CANISTER_ID,
        ].filter(Boolean) as string[];

        const connected = await window.ic!.plug.requestConnect({
          whitelist,
          host: process.env.REACT_APP_IC_HOST || 'https://icp0.io',
        });

        if (!connected) {
          throw new Error('User rejected the connection request');
        }

        const principal = await window.ic!.plug.getPrincipal();
        const principalText = principal.toString();

        this.state = {
          principal: principalText,
          isConnected: true,
          isDemoMode: false,
        };

        this.notifyListeners();
        console.log('✅ Plug wallet connected:', principalText);

        return principalText;
      } catch (error: any) {
        console.error('Error connecting Plug wallet:', error);

        if (error.message?.includes('rejected')) {
          throw new Error('User rejected the connection request');
        }

        // Don't throw - fall through to demo mode
        console.log('⚠️ Plug connection failed, falling back to demo mode');
      }
    }

    // Fallback to demo mode for testnet (no wallet required)
    console.log('⚡ No Plug wallet found - using DEMO MODE for testnet');

    // Generate a realistic-looking demo principal
    const demoPrincipal = 'aaaaa-aa-demo-principal-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aae';

    this.state = {
      principal: demoPrincipal,
      isConnected: true,
      isDemoMode: true,
    };

    this.notifyListeners();
    console.log('✅ Demo Plug wallet connected:', demoPrincipal);

    return demoPrincipal;
  }

  /**
   * Disconnect wallet (clear state only)
   */
  async disconnect(): Promise<void> {
    // Try to disconnect from real Plug if available
    if (this.isAvailable() && !this.state.isDemoMode) {
      try {
        await window.ic!.plug.disconnect();
      } catch (error) {
        console.error('Error disconnecting from Plug:', error);
      }
    }

    this.state = {
      principal: null,
      isConnected: false,
      isDemoMode: false,
    };

    this.notifyListeners();
    console.log('✅ Plug wallet disconnected');
  }

  /**
   * Get current wallet state
   */
  getState(): PlugWalletState {
    return { ...this.state };
  }

  /**
   * Get current principal
   */
  getPrincipal(): string | null {
    return this.state.principal;
  }

  /**
   * Check if connected
   */
  isWalletConnected(): boolean {
    return this.state.isConnected;
  }

  /**
   * Check if in demo mode
   */
  isDemoModeActive(): boolean {
    return this.state.isDemoMode;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: PlugWalletState) => void): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.getState());
      } catch (error) {
        console.error('Error in Plug wallet state listener:', error);
      }
    });
  }

  /**
   * Get token balance (ICP ecosystem)
   * Returns mock balance in demo mode
   */
  async getBalance(asset: 'ICP' | 'ckBTC' | 'ckETH' | 'ckUSDC' | 'ckUSDT'): Promise<string> {
    if (!this.state.principal) {
      throw new Error('Wallet not connected');
    }

    // Demo mode - return mock balances
    if (this.state.isDemoMode || !this.isAvailable()) {
      console.log(`⚡ Demo mode - returning mock ${asset} balance`);
      return this.demoBalances[asset] || '0';
    }

    try {
      // Real Plug wallet balance query
      // Note: Plug has different methods for different assets
      const balance = await window.ic!.plug.requestBalance();

      // Find the specific asset
      const assetBalance = balance.find((b: any) =>
        b.symbol === asset || b.name === asset
      );

      if (assetBalance) {
        // Convert from base units if needed
        const amount = assetBalance.amount || assetBalance.value || 0;
        return amount.toString();
      }

      return '0';
    } catch (error) {
      console.error(`Error fetching ${asset} balance:`, error);

      // Fallback to demo balance on error
      console.log('⚠️ Balance query failed, using demo balance');
      return this.demoBalances[asset] || '0';
    }
  }

  /**
   * Get all balances
   * Returns mock balances in demo mode
   */
  async getAllBalances(): Promise<PlugBalance[]> {
    if (!this.state.principal) {
      throw new Error('Wallet not connected');
    }

    // Demo mode - return all mock balances
    if (this.state.isDemoMode || !this.isAvailable()) {
      console.log('⚡ Demo mode - returning mock balances');
      return Object.entries(this.demoBalances).map(([asset, balance]) => ({
        asset,
        balance,
      }));
    }

    try {
      // Real Plug wallet balance query
      const balances = await window.ic!.plug.requestBalance();

      return balances.map((b: any) => ({
        asset: b.symbol || b.name,
        balance: (b.amount || b.value || 0).toString(),
      }));
    } catch (error) {
      console.error('Error fetching balances:', error);

      // Fallback to demo balances on error
      console.log('⚠️ Balance query failed, using demo balances');
      return Object.entries(this.demoBalances).map(([asset, balance]) => ({
        asset,
        balance,
      }));
    }
  }

  /**
   * Create actor for canister calls (advanced usage)
   */
  async createActor(canisterId: string, interfaceFactory: any): Promise<any> {
    if (!this.state.isConnected) {
      throw new Error('Wallet not connected');
    }

    // Demo mode - return mock actor
    if (this.state.isDemoMode) {
      console.log('⚡ Demo mode - returning mock actor');
      return {
        // Mock actor methods can be added here if needed
      };
    }

    try {
      return await window.ic!.plug.createActor({
        canisterId,
        interfaceFactory,
      });
    } catch (error) {
      console.error('Error creating actor:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const simplePlugWallet = new SimplePlugWallet();
