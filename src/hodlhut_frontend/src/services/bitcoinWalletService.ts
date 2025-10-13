// ===============================================
// Bitcoin Wallet Service - Unisat + Xverse Integration
// ===============================================
// Phase 1 MVP: Unisat and Xverse (both have Taproot + Runes support)
// Network: Bitcoin Signet testnet (tb1p... addresses)

import { request, AddressPurpose } from 'sats-connect';

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
      getNetwork: () => Promise<string>;
      switchNetwork: (network: string) => Promise<void>;
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

      // Get public key
      const publicKey = await window.unisat.getPublicKey();

      // Check network
      const network = await window.unisat.getNetwork();

      // Switch to Signet if not already
      if (network !== 'signet') {
        await window.unisat.switchNetwork('signet');
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
   */
  async connectXverse(): Promise<ConnectedWallet> {
    if (!window.BitcoinProvider && !window.XverseProviders?.BitcoinProvider) {
      throw new Error('Xverse wallet is not installed. Please install from https://xverse.app');
    }

    try {
      return new Promise<ConnectedWallet>((resolve, reject) => {
        const getAddressOptions = {
          payload: {
            purposes: [AddressPurpose.Payment],
            message: 'Connect to hodlprotocol for Bitcoin staking',
            network: {
              type: 'Signet' as const,
            },
          },
          onFinish: (response: any) => {
            const paymentAddress = response.addresses.find(
              (addr: any) => addr.purpose === AddressPurpose.Payment
            );

            if (!paymentAddress) {
              reject(new Error('No payment address found from Xverse'));
              return;
            }

            // Validate Taproot address
            if (!paymentAddress.address.startsWith('tb1p')) {
              reject(
                new Error(
                  'Non-Taproot address detected. Please ensure Xverse is using Taproot addresses.'
                )
              );
              return;
            }

            const connectedWallet: ConnectedWallet = {
              walletId: 'xverse',
              address: paymentAddress.address,
              publicKey: paymentAddress.publicKey,
              network: 'signet',
            };

            this.connectedWallet = connectedWallet;
            resolve(connectedWallet);
          },
          onCancel: () => {
            reject(new Error('User cancelled Xverse connection'));
          },
        };

        request('getAccounts', getAddressOptions);
      });
    } catch (error: any) {
      console.error('Xverse connection error:', error);
      throw new Error(`Failed to connect to Xverse: ${error.message}`);
    }
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
   */
  async signPsbtXverse(psbtHex: string): Promise<SignPsbtResult> {
    return new Promise<SignPsbtResult>((resolve, reject) => {
      const signPsbtOptions = {
        payload: {
          network: {
            type: 'Signet' as const,
          },
          message: 'Sign Bitcoin staking transaction',
          psbtBase64: Buffer.from(psbtHex, 'hex').toString('base64'),
          broadcast: false, // Don't broadcast, REE Orchestrator will do it
          inputsToSign: [
            {
              address: this.connectedWallet!.address,
              signingIndexes: [0], // Sign first input
            },
          ],
        },
        onFinish: (response: any) => {
          const signedPsbtBase64 = response.psbtBase64;
          const signedPsbtHex = Buffer.from(signedPsbtBase64, 'base64').toString('hex');

          resolve({
            signedPsbtHex,
            signedPsbtBase64,
          });
        },
        onCancel: () => {
          reject(new Error('User cancelled PSBT signing'));
        },
      };

      request('signPsbt', signPsbtOptions);
    });
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
