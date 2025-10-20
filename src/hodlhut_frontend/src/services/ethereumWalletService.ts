// ===============================================
// Ethereum Wallet Service - Multi-Wallet Support
// ===============================================
// Supports: MetaMask, Trust Wallet, Uniswap Wallet
// Network: Ethereum Mainnet / Sepolia Testnet

export interface EthereumWallet {
  id: 'metamask' | 'trust' | 'uniswap';
  name: string;
  icon: string;
  deepLink?: string; // Mobile deep link
  downloadUrl: string;
}

export interface ConnectedEthereumWallet {
  walletId: 'metamask' | 'trust' | 'uniswap';
  address: string;
  chainId: number;
}

export const ETHEREUM_WALLETS: EthereumWallet[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    deepLink: 'https://metamask.app.link/dapp/',
    downloadUrl: 'https://metamask.io/download/'
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: '⚡',
    deepLink: 'https://link.trustwallet.com/open_url?url=',
    downloadUrl: 'https://trustwallet.com/download'
  },
  {
    id: 'uniswap',
    name: 'Uniswap Wallet',
    icon: '🦄',
    downloadUrl: 'https://wallet.uniswap.org/'
  }
];

class EthereumWalletService {
  private connectedWallet: ConnectedEthereumWallet | null = null;

  /**
   * Check if we're on mobile
   */
  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Check if MetaMask is installed (browser extension)
   */
  isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' &&
           !!window.ethereum &&
           (window.ethereum.isMetaMask === true);
  }

  /**
   * Check if Trust Wallet is installed
   */
  isTrustWalletInstalled(): boolean {
    return typeof window !== 'undefined' &&
           !!window.ethereum &&
           (window.ethereum.isTrust === true);
  }

  /**
   * Check if any Ethereum wallet is available
   */
  isWalletAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.ethereum;
  }

  /**
   * Connect to Ethereum wallet (browser extension)
   */
  async connectWallet(walletId: 'metamask' | 'trust' | 'uniswap'): Promise<ConnectedEthereumWallet> {
    if (!window.ethereum) {
      throw new Error('No Ethereum wallet found. Please install MetaMask, Trust Wallet, or use mobile app.');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.');
      }

      const address = accounts[0];

      // Get chain ID
      const chainId = await window.ethereum.request({
        method: 'eth_chainId'
      });

      const connectedWallet: ConnectedEthereumWallet = {
        walletId,
        address,
        chainId: parseInt(chainId, 16)
      };

      this.connectedWallet = connectedWallet;
      return connectedWallet;
    } catch (error: any) {
      console.error('Ethereum wallet connection error:', error);
      if (error.code === 4001) {
        throw new Error('Connection rejected by user');
      }
      throw new Error(`Failed to connect: ${error.message}`);
    }
  }

  /**
   * Open wallet via deep link (mobile)
   */
  openWalletDeepLink(walletId: 'metamask' | 'trust' | 'uniswap'): void {
    const wallet = ETHEREUM_WALLETS.find(w => w.id === walletId);
    if (!wallet || !wallet.deepLink) {
      console.warn(`No deep link available for ${walletId}`);
      return;
    }

    // Get current page URL for deep link
    const currentUrl = window.location.href;
    const deepLinkUrl = `${wallet.deepLink}${encodeURIComponent(currentUrl)}`;

    // Open wallet app
    window.location.href = deepLinkUrl;
  }

  /**
   * Get currently connected wallet
   */
  getConnectedWallet(): ConnectedEthereumWallet | null {
    return this.connectedWallet;
  }

  /**
   * Disconnect wallet
   */
  disconnect(): void {
    this.connectedWallet = null;
  }

  /**
   * Get ETH balance
   */
  async getBalance(address: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error('No Ethereum wallet found');
    }

    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });

      // Convert from Wei to ETH
      const balanceInEth = parseInt(balance, 16) / 1e18;
      return balanceInEth.toString();
    } catch (error: any) {
      console.error('Failed to get balance:', error);
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Switch to Ethereum Mainnet or Sepolia Testnet
   */
  async switchNetwork(network: 'mainnet' | 'sepolia'): Promise<void> {
    if (!window.ethereum) {
      throw new Error('No Ethereum wallet found');
    }

    const chainId = network === 'mainnet' ? '0x1' : '0xaa36a7'; // Sepolia

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }]
      });
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      throw new Error(`Failed to switch network: ${error.message}`);
    }
  }
}

// Export singleton instance
export const ethereumWalletService = new EthereumWalletService();
