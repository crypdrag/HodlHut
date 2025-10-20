import React, { useEffect, useState } from 'react';
import { X, Wallet } from 'lucide-react';
import { simpleEthereumWallet } from '../services/simpleEthereumWallet';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  deepLink?: string;
}

interface WalletSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWallet: (walletId: string) => void;
  walletType: 'ethereum' | 'icp' | 'bitcoin';
  onEthereumConnected?: (address: string) => void;
}

const ETHEREUM_WALLETS: WalletOption[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    description: 'Connect with MetaMask',
    deepLink: 'https://metamask.app.link/dapp/'
  },
  {
    id: 'uniswap',
    name: 'Uniswap Wallet',
    icon: '🦄',
    description: 'Connect with Uniswap Wallet',
    deepLink: 'https://uniswap.org/app'
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: '⚡',
    description: 'Connect with Trust Wallet',
    deepLink: 'https://link.trustwallet.com/open_url?url='
  }
];

const ICP_WALLETS: WalletOption[] = [
  {
    id: 'plug',
    name: 'Plug Wallet',
    icon: '🔌',
    description: 'Connect with Plug browser extension'
  },
  {
    id: 'nfid',
    name: 'NFID',
    icon: '🆔',
    description: 'Connect with NFID wallet'
  }
];

const BITCOIN_WALLETS: WalletOption[] = [
  {
    id: 'unisat',
    name: 'Unisat',
    icon: '⚙️',
    description: 'Connect with Unisat wallet'
  },
  {
    id: 'xverse',
    name: 'Xverse',
    icon: '✖️',
    description: 'Connect with Xverse wallet'
  }
];

const WalletSelectionModal: React.FC<WalletSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectWallet,
  walletType,
  onEthereumConnected
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect if user is on mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Reset error when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const wallets = walletType === 'ethereum'
    ? ETHEREUM_WALLETS
    : walletType === 'icp'
    ? ICP_WALLETS
    : BITCOIN_WALLETS;

  const title = walletType === 'ethereum'
    ? 'Connect Ethereum Wallet'
    : walletType === 'icp'
    ? 'Connect ICP Wallet'
    : 'Connect Bitcoin Wallet';

  const handleWalletClick = async (wallet: WalletOption) => {
    if (walletType === 'ethereum') {
      const mobile = isMobile();

      console.log('🔍 Wallet click:', {
        wallet: wallet.id,
        isMobile: mobile,
        isAvailable: simpleEthereumWallet.isAvailable(),
        walletType: simpleEthereumWallet.getWalletType()
      });

      // For testnet: Just try to connect to ANY available Ethereum wallet
      // Auto-fallback to demo mode if no wallet available
      setIsConnecting(true);
      setError(null);

      try {
        const address = await simpleEthereumWallet.connect();
        console.log('✅ Connected to Ethereum wallet:', address);

        if (onEthereumConnected) {
          onEthereumConnected(address);
        }

        onClose();
      } catch (err: any) {
        console.error('❌ Ethereum wallet connection error:', err);
        setError(err.message || 'Failed to connect to Ethereum wallet');
      } finally {
        setIsConnecting(false);
      }
    } else {
      // For ICP and Bitcoin, use the existing handler
      onSelectWallet(wallet.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-overlay-1 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-1 rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/10">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">{title}</h2>
          <button
            className="w-8 h-8 min-h-[44px] sm:min-h-0 flex items-center justify-center rounded-full bg-surface-2 text-text-secondary hover:bg-surface-3 transition-colors"
            onClick={onClose}
            aria-label="Close wallet selection"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Wallet Options */}
        <div className="space-y-3">
          {wallets.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => handleWalletClick(wallet)}
              disabled={walletType === 'ethereum' && isConnecting}
              className="w-full min-h-[60px] sm:min-h-0 p-4 bg-surface-2 hover:bg-surface-3 border border-white/10 hover:border-primary-500 rounded-xl transition-all duration-200 flex items-center gap-4 text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Wallet Icon */}
              <div className="text-3xl sm:text-4xl flex-shrink-0">
                {wallet.icon}
              </div>

              {/* Wallet Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm sm:text-base font-semibold text-text-primary mb-1">
                  {wallet.name}
                </div>
                <div className="text-xs sm:text-sm text-text-secondary">
                  {isConnecting && walletType === 'ethereum' ? 'Connecting...' : wallet.description}
                </div>
              </div>

              {/* Arrow Icon */}
              <div className="text-text-muted flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-6 p-3 bg-surface-2/50 border border-white/10 rounded-lg">
          <div className="flex items-start gap-2">
            <Wallet className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary">
              By connecting a wallet, you agree to HodlHut's Terms of Service and acknowledge that you have read and understand the protocol disclaimers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletSelectionModal;
