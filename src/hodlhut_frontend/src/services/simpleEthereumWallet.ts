/**
 * Simple Ethereum Wallet Service
 * Direct integration with window.ethereum (MetaMask, Trust Wallet, etc.)
 * No wagmi/WalletConnect complexity - just like our Plug wallet integration
 */

// Declare ethereum type
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface EthereumWalletState {
  address: string | null;
  isConnected: boolean;
}

class SimpleEthereumWallet {
  private listeners: Set<(state: EthereumWalletState) => void> = new Set();
  private state: EthereumWalletState = {
    address: null,
    isConnected: false,
  };

  constructor() {
    // Listen for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on?.('accountsChanged', (accounts: string[]) => {
        this.handleAccountsChanged(accounts);
      });

      window.ethereum.on?.('chainChanged', () => {
        // Reload page on chain change (recommended by MetaMask)
        window.location.reload();
      });

      // Check if already connected
      this.checkConnection();
    }
  }

  /**
   * Check if wallet is available (extension installed)
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }

  /**
   * Get installed wallet type
   */
  getWalletType(): string | null {
    if (!this.isAvailable()) return null;

    if (window.ethereum?.isMetaMask) return 'MetaMask';
    if (window.ethereum?.isTrust) return 'Trust Wallet';
    if (window.ethereum?.isCoinbaseWallet) return 'Coinbase Wallet';

    return 'Ethereum Wallet'; // Generic
  }

  /**
   * Check if already connected (on page load)
   */
  async checkConnection(): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      });

      if (accounts && accounts.length > 0) {
        this.state = {
          address: accounts[0],
          isConnected: true,
        };
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error checking Ethereum wallet connection:', error);
    }
  }

  /**
   * Connect wallet (request account access)
   * Falls back to demo mode for testnet if no wallet available
   */
  async connect(): Promise<string> {
    // Try real wallet first
    if (this.isAvailable()) {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });

        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts found');
        }

        const address = accounts[0];
        this.state = {
          address,
          isConnected: true,
        };

        this.notifyListeners();
        console.log('✅ Ethereum wallet connected:', address);

        return address;
      } catch (error: any) {
        console.error('Error connecting Ethereum wallet:', error);

        if (error.code === 4001) {
          throw new Error('User rejected the connection request');
        }

        throw new Error(`Failed to connect: ${error.message || 'Unknown error'}`);
      }
    }

    // Fallback to demo mode for testnet (no wallet required)
    console.log('⚡ No Ethereum wallet found - using DEMO MODE for testnet');
    const demoAddress = '0xDemo1234567890123456789012345678901234567';
    this.state = {
      address: demoAddress,
      isConnected: true,
    };

    this.notifyListeners();
    console.log('✅ Demo wallet connected:', demoAddress);

    return demoAddress;
  }

  /**
   * Disconnect wallet (clear state only - can't force disconnect in wallet)
   */
  disconnect(): void {
    this.state = {
      address: null,
      isConnected: false,
    };
    this.notifyListeners();
    console.log('✅ Ethereum wallet disconnected');
  }

  /**
   * Get current wallet state
   */
  getState(): EthereumWalletState {
    return { ...this.state };
  }

  /**
   * Get current address
   */
  getAddress(): string | null {
    return this.state.address;
  }

  /**
   * Check if connected
   */
  isWalletConnected(): boolean {
    return this.state.isConnected;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: EthereumWalletState) => void): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Handle account changes from wallet
   */
  private handleAccountsChanged(accounts: string[]): void {
    if (accounts.length === 0) {
      // User disconnected
      this.state = {
        address: null,
        isConnected: false,
      };
    } else {
      // Account switched
      this.state = {
        address: accounts[0],
        isConnected: true,
      };
    }

    this.notifyListeners();
    console.log('🔄 Ethereum account changed:', this.state.address);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.getState());
      } catch (error) {
        console.error('Error in wallet state listener:', error);
      }
    });
  }

  /**
   * Get token balance (ERC20)
   * Returns mock balance in demo mode
   */
  async getTokenBalance(tokenAddress: string, decimals: number = 18): Promise<string> {
    if (!this.state.address) {
      throw new Error('Wallet not connected');
    }

    // Demo mode - return mock balances
    if (!this.isAvailable() || this.state.address.startsWith('0xDemo')) {
      console.log('⚡ Demo mode - returning mock token balance');
      // USDC/USDT mock balance
      return '1250.50';
    }

    try {
      // ERC20 balanceOf ABI
      const data = `0x70a08231000000000000000000000000${this.state.address.slice(2)}`;

      const balance = await window.ethereum.request({
        method: 'eth_call',
        params: [
          {
            to: tokenAddress,
            data,
          },
          'latest',
        ],
      });

      // Convert from hex and adjust for decimals
      const balanceBigInt = BigInt(balance);
      const divisor = BigInt(10 ** decimals);
      const balanceNumber = Number(balanceBigInt) / Number(divisor);

      return balanceNumber.toString();
    } catch (error) {
      console.error('Error fetching token balance:', error);
      throw error;
    }
  }

  /**
   * Get ETH balance
   * Returns mock balance in demo mode
   */
  async getETHBalance(): Promise<string> {
    if (!this.state.address) {
      throw new Error('Wallet not connected');
    }

    // Demo mode - return mock balance
    if (!this.isAvailable() || this.state.address.startsWith('0xDemo')) {
      console.log('⚡ Demo mode - returning mock ETH balance');
      return '2.5';
    }

    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [this.state.address, 'latest'],
      });

      // Convert from wei to ETH
      const balanceBigInt = BigInt(balance);
      const ethBalance = Number(balanceBigInt) / 1e18;

      return ethBalance.toString();
    } catch (error) {
      console.error('Error fetching ETH balance:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const simpleEthereumWallet = new SimpleEthereumWallet();
