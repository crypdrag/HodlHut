// ===============================================
// Bitcoin Wallet Service - Unisat + Xverse Integration
// ===============================================
// Phase 1 MVP: Unisat and Xverse (both have Taproot + Runes support)
// Network: Bitcoin Signet testnet (tb1p... addresses)

// TODO: Implement proper sats-connect integration
// import { request, AddressPurpose } from 'sats-connect';

// ===============================================
// TypeScript Interfaces
// ===============================================

export interface WalletInfo {
  id: 'unisat' | 'xverse';
  name: string;
  icon?: string;
  isInstalled: boolean;
  isTaprootSupported: boolean;
}

export interface ConnectedWallet {
  walletId: 'unisat' | 'xverse';
  address: string; // Taproot address (tb1p...)
  publicKey: string; // 33-byte hex
  network: 'signet' | 'testnet' | 'mainnet';
}

export interface SignPsbtResult {
  signedPsbtHex: string;
  signedPsbtBase64: string;
}

// ===============================================
// Wallet Detection
// ===============================================

declare global {
  interface Window {
    unisat?: {
      requestAccounts: () => Promise<string[]>;
      getAccounts: () => Promise<string[]>;
      getPublicKey: () => Promise<string>;
      getNetwork: () => Promise<string>; // Legacy
      switchNetwork: (network: string) => Promise<void>; // Legacy
      getChain: () => Promise<{ enum: string; name: string; network: string }>; // New API
      switchChain: (chain: string) => Promise<void>; // New API
      signPsbt: (psbtHex: string, options?: any) => Promise<string>;
      pushPsbt: (psbtHex: string) => Promise<string>;
      getBalance: () => Promise<{ confirmed: number; unconfirmed: number; total: number }>;
    };
    BitcoinProvider?: any; // Xverse
    XverseProviders?: {
      BitcoinProvider?: any;
    };
  }
}

// ===============================================
// Bitcoin Wallet Service
// ===============================================

class BitcoinWalletService {
  private connectedWallet: ConnectedWallet | null = null;

  /**
   * Detect available Bitcoin wallets
   */
  getAvailableWallets(): WalletInfo[] {
    const wallets: WalletInfo[] = [
      {
        id: 'unisat',
        name: 'Unisat Wallet',
        isInstalled: typeof window !== 'undefined' && !!window.unisat,
        isTaprootSupported: true,
      },
      {
        id: 'xverse',
        name: 'Xverse',
        isInstalled: typeof window !== 'undefined' && !!(window.BitcoinProvider || window.XverseProviders?.BitcoinProvider),
        isTaprootSupported: true,
      },
    ];

    return wallets;
  }

  /**
   * Connect to Unisat wallet
   */
  async connectUnisat(): Promise<ConnectedWallet> {
    if (!window.unisat) {
      throw new Error('Unisat wallet is not installed. Please install from https://unisat.io');
    }

    try {
      // Request account access
      const accounts = await window.unisat.requestAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please create a wallet in Unisat.');
      }

      const address = accounts[0];

      // Get public key (Unisat returns 33-byte compressed key with coordinate)
      const publicKeyFull = await window.unisat.getPublicKey();

      // Remove coordinate byte (first byte) for btc-staking-ts SDK
      // SDK expects "publicKeyNoCoordHex" = 32-byte x-coordinate only
      const publicKey = publicKeyFull.slice(2); // Remove first byte (02 or 03)

      // Check chain using new API
      const chain = await window.unisat.getChain();
      console.log('Unisat chain:', chain); // Debug log

      // Switch to Bitcoin Signet if not already
      if (chain.enum !== 'BITCOIN_SIGNET') {
        await window.unisat.switchChain('BITCOIN_SIGNET');
      }

      // Validate Taproot address
      if (!address.startsWith('tb1p')) {
        throw new Error(
          'Non-Taproot address detected. Please switch to a Taproot (tb1p...) address in Unisat settings.'
        );
      }

      const connectedWallet: ConnectedWallet = {
        walletId: 'unisat',
        address,
        publicKey,
        network: 'signet',
      };

      this.connectedWallet = connectedWallet;
      return connectedWallet;
    } catch (error: any) {
      console.error('Unisat connection error:', error);
      throw new Error(`Failed to connect to Unisat: ${error.message}`);
    }
  }

  /**
   * Connect to Xverse wallet using sats-connect
   * TODO: Implement with proper sats-connect v4 API
   */
  async connectXverse(): Promise<ConnectedWallet> {
    if (!window.BitcoinProvider && !window.XverseProviders?.BitcoinProvider) {
      throw new Error('Xverse wallet is not installed. Please install from https://xverse.app');
    }

    // TODO: Implement Xverse connection with proper sats-connect v4 API
    // The sats-connect API changed significantly in v4.x
    // Need to use the Wallet class instance instead of standalone request() function
    throw new Error('Xverse integration not yet implemented. Please use Unisat wallet for now.');
  }

  /**
   * Generic connect method - routes to specific wallet
   */
  async connect(walletId: 'unisat' | 'xverse'): Promise<ConnectedWallet> {
    if (walletId === 'unisat') {
      return this.connectUnisat();
    } else if (walletId === 'xverse') {
      return this.connectXverse();
    } else {
      throw new Error(`Unsupported wallet: ${walletId}`);
    }
  }

  /**
   * Get currently connected wallet
   */
  getConnectedWallet(): ConnectedWallet | null {
    return this.connectedWallet;
  }

  /**
   * Disconnect wallet
   */
  disconnect(): void {
    this.connectedWallet = null;
  }

  /**
   * Get BTC balance (Signet testnet)
   */
  async getBalance(): Promise<{ confirmed: number; unconfirmed: number; total: number }> {
    if (!this.connectedWallet) {
      throw new Error('No wallet connected');
    }

    if (this.connectedWallet.walletId === 'unisat') {
      if (!window.unisat) {
        throw new Error('Unisat wallet not found');
      }
      return await window.unisat.getBalance();
    }

    // Xverse balance requires separate API call (not implemented in sats-connect)
    // For MVP, return mock data
    return { confirmed: 100000, unconfirmed: 0, total: 100000 };
  }

  /**
   * Sign PSBT with Unisat
   */
  async signPsbtUnisat(psbtHex: string): Promise<SignPsbtResult> {
    if (!window.unisat) {
      throw new Error('Unisat wallet not found');
    }

    try {
      const signedPsbtHex = await window.unisat.signPsbt(psbtHex, {
        autoFinalized: false, // Return PSBT, don't finalize yet
      });

      // Convert to base64 for compatibility
      const signedPsbtBase64 = Buffer.from(signedPsbtHex, 'hex').toString('base64');

      return {
        signedPsbtHex,
        signedPsbtBase64,
      };
    } catch (error: any) {
      console.error('Unisat PSBT signing error:', error);
      throw new Error(`Failed to sign PSBT with Unisat: ${error.message}`);
    }
  }

  /**
   * Sign PSBT with Xverse
   * TODO: Implement with proper sats-connect v4 API
   */
  async signPsbtXverse(psbtHex: string): Promise<SignPsbtResult> {
    // TODO: Implement Xverse PSBT signing with proper sats-connect v4 API
    throw new Error('Xverse PSBT signing not yet implemented. Please use Unisat wallet for now.');
  }

  /**
   * Sign PSBT - routes to appropriate wallet
   */
  async signPsbt(psbtHex: string): Promise<SignPsbtResult> {
    if (!this.connectedWallet) {
      throw new Error('No wallet connected');
    }

    if (this.connectedWallet.walletId === 'unisat') {
      return this.signPsbtUnisat(psbtHex);
    } else if (this.connectedWallet.walletId === 'xverse') {
      return this.signPsbtXverse(psbtHex);
    } else {
      throw new Error(`Unsupported wallet: ${this.connectedWallet.walletId}`);
    }
  }

  /**
   * Validate wallet is ready for staking
   */
  validateForStaking(): { isValid: boolean; error?: string } {
    if (!this.connectedWallet) {
      return { isValid: false, error: 'No wallet connected' };
    }

    if (!this.connectedWallet.address.startsWith('tb1p')) {
      return { isValid: false, error: 'Taproot address required (tb1p...)' };
    }

    if (this.connectedWallet.network !== 'signet') {
      return { isValid: false, error: 'Must be on Bitcoin Signet testnet' };
    }

    if (!this.connectedWallet.publicKey || this.connectedWallet.publicKey.length !== 66) {
      return { isValid: false, error: 'Invalid public key format' };
    }

    return { isValid: true };
  }
}

// Export singleton instance
export const bitcoinWalletService = new BitcoinWalletService();
