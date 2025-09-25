import React, { useState, useEffect } from 'react';
import AssetIcon from './AssetIcon';
import WalletIcon from './WalletIcon';
import {
  PartyPopper,
  Lock,
  Zap,
  Circle,
  Wallet,
  Globe,
  CreditCard,
  Link,
  Plug,
  User
} from 'lucide-react';
// Tailwind CSS classes now handle all styling

export interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAsset: string;
  onDepositComplete: (asset: string, amount: number) => void;
  onContinue?: () => void; // Optional callback for Continue button
  isSmartSolutionDeposit?: boolean; // Indicates if this is for Smart Solution gas requirement
}

interface WalletOption {
  id: string;
  name: string;
  icon: JSX.Element;
}

const WALLET_OPTIONS: Record<string, WalletOption[]> = {
  'BTC': [
    { id: 'unisat', name: 'Unisat Wallet', icon: <WalletIcon wallet="unisat" size={20} /> },
    { id: 'xverse', name: 'Xverse Wallet', icon: <WalletIcon wallet="xverse" size={20} /> },
    { id: 'okx', name: 'OKX Wallet', icon: <WalletIcon wallet="okx" size={20} /> }
  ],
  'ETH': [
    { id: 'metamask', name: 'MetaMask', icon: <Wallet className="w-4 h-4 text-warning-400" /> },
    { id: 'coinbase', name: 'Coinbase Wallet', icon: <Circle className="w-4 h-4 text-primary-400" /> },
    { id: 'walletconnect', name: 'WalletConnect', icon: <Link className="w-4 h-4" /> }
  ],
  'USDC': [
    { id: 'metamask', name: 'MetaMask', icon: <Wallet className="w-4 h-4 text-warning-400" /> },
    { id: 'coinbase', name: 'Coinbase Wallet', icon: <Circle className="w-4 h-4 text-primary-400" /> },
    { id: 'walletconnect', name: 'WalletConnect', icon: <Link className="w-4 h-4" /> }
  ],
  'USDT': [
    { id: 'metamask', name: 'MetaMask', icon: <Wallet className="w-4 h-4 text-warning-400" /> },
    { id: 'coinbase', name: 'Coinbase Wallet', icon: <Circle className="w-4 h-4 text-primary-400" /> },
    { id: 'walletconnect', name: 'WalletConnect', icon: <Link className="w-4 h-4" /> }
  ],
  'ckBTC': [
    { id: 'plug', name: 'Plug Wallet', icon: <Plug className="w-4 h-4 text-success-400" /> },
    { id: 'stoic', name: 'Stoic Wallet', icon: <Globe className="w-4 h-4 text-primary-400" /> },
    { id: 'nfid', name: 'NFID', icon: <User className="w-4 h-4 text-text-muted" /> }
  ],
  'ckETH': [
    { id: 'plug', name: 'Plug Wallet', icon: <Plug className="w-4 h-4 text-success-400" /> },
    { id: 'stoic', name: 'Stoic Wallet', icon: <Globe className="w-4 h-4 text-primary-400" /> },
    { id: 'nfid', name: 'NFID', icon: <User className="w-4 h-4 text-text-muted" /> }
  ],
  'ckUSDC': [
    { id: 'plug', name: 'Plug Wallet', icon: <Plug className="w-4 h-4 text-success-400" /> },
    { id: 'stoic', name: 'Stoic Wallet', icon: <Globe className="w-4 h-4 text-primary-400" /> },
    { id: 'nfid', name: 'NFID', icon: <User className="w-4 h-4 text-text-muted" /> }
  ],
  'ckUSDT': [
    { id: 'plug', name: 'Plug Wallet', icon: <Plug className="w-4 h-4 text-success-400" /> },
    { id: 'stoic', name: 'Stoic Wallet', icon: <Globe className="w-4 h-4 text-primary-400" /> },
    { id: 'nfid', name: 'NFID', icon: <User className="w-4 h-4 text-text-muted" /> }
  ],
  'ICP': [
    { id: 'plug', name: 'Plug Wallet', icon: <Plug className="w-4 h-4 text-success-400" /> },
    { id: 'stoic', name: 'Stoic Wallet', icon: <Globe className="w-4 h-4 text-primary-400" /> },
    { id: 'nfid', name: 'NFID', icon: <User className="w-4 h-4 text-text-muted" /> }
  ]
};

const ASSET_ICONS: Record<string, JSX.Element> = {
  'BTC': <Circle className="w-4 h-4 text-warning-400" />,
  'ETH': <Circle className="w-4 h-4 text-primary-400" />,
  'USDC': <CreditCard className="w-4 h-4 text-success-400" />,
  'USDT': <CreditCard className="w-4 h-4 text-success-500" />,
  'ckBTC': <Circle className="w-4 h-4 text-warning-400" />,
  'ckETH': <Circle className="w-4 h-4 text-primary-400" />,
  'ckUSDC': <CreditCard className="w-4 h-4 text-success-400" />,
  'ckUSDT': <CreditCard className="w-4 h-4 text-success-500" />,
  'ICP': <Globe className="w-4 h-4 text-secondary-400" />
};

const getWalletTypeText = (asset: string): string => {
  if (['BTC'].includes(asset)) return 'Bitcoin';
  if (['ETH', 'USDC', 'USDT'].includes(asset)) return 'Ethereum';
  if (['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'].includes(asset)) return 'ICP';
  return 'Wallet';
};

enum DepositStep {
  AmountInput = 1,
  WalletSelection = 2,
  Processing = 3,
  Success = 4
}

const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  selectedAsset,
  onDepositComplete,
  onContinue,
  isSmartSolutionDeposit = false
}) => {
  const [currentStep, setCurrentStep] = useState<DepositStep>(DepositStep.AmountInput);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [totalSteps, setTotalSteps] = useState<number>(4);
  const [activeTimeouts, setActiveTimeouts] = useState<NodeJS.Timeout[]>([]);
  const [activeIntervals, setActiveIntervals] = useState<NodeJS.Timeout[]>([]);

  // Clean up state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Clear any existing timeouts/intervals
      activeTimeouts.forEach(timeout => clearTimeout(timeout));
      activeIntervals.forEach(interval => clearInterval(interval));
      
      // Reset to initial state
      setCurrentStep(DepositStep.AmountInput);
      setDepositAmount('');
      setSelectedWallet('');
      setProcessingMessage('');
      setActiveTimeouts([]);
      setActiveIntervals([]);
    }
  }, [isOpen, selectedAsset]); // Reset when modal opens or asset changes

  if (!isOpen) return null;

  const clearAllTimers = () => {
    // Clear all active timeouts and intervals
    activeTimeouts.forEach(timeout => clearTimeout(timeout));
    activeIntervals.forEach(interval => clearInterval(interval));
    setActiveTimeouts([]);
    setActiveIntervals([]);
  };

  const handleClose = () => {
    // Clean up all timers to prevent interference
    clearAllTimers();
    
    // Reset all state
    setCurrentStep(DepositStep.AmountInput);
    setDepositAmount('');
    setSelectedWallet('');
    setProcessingMessage('');
    
    // Call onContinue callback if provided (for resetting Add Assets component)
    if (onContinue) {
      onContinue();
    }
    
    onClose();
  };

  const handleConnectWallet = () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    setCurrentStep(DepositStep.WalletSelection);
  };

  const handleWalletSelect = (walletId: string) => {
    // Clear any existing timers before starting new deposit
    clearAllTimers();
    
    setSelectedWallet(walletId);
    setCurrentStep(DepositStep.Processing);
    setProcessingMessage('');
    
    simulateDeposit(walletId);
  };

  const simulateDeposit = (walletId: string) => {
    const amount = parseFloat(depositAmount);
    let finalAsset = selectedAsset;
    let messages: string[] = [];

    // Reset progress tracking
    setCurrentStepIndex(0);

    // Determine deposit flow based on asset
    if (['BTC'].includes(selectedAsset)) {
      finalAsset = 'ckBTC';
      messages = [
        'Sending BTC to ICP Bitcoin canister...',
        'Bitcoin received!',
        'Minting ckBTC...',
        'ckBTC is in your Hut! Happy Hodling!'
      ];
      setTotalSteps(messages.length);
      handleBitcoinDeposit(messages, finalAsset, amount);
    } else if (['ETH'].includes(selectedAsset)) {
      finalAsset = 'ckETH';
      messages = [
        'Sending ETH to ICP...',
        'ETH Received!',
        'Minting ckETH!',
        'Your ckETH is Safu in your Hut!'
      ];
      setTotalSteps(messages.length);
      handleEthereumDeposit(messages, finalAsset, amount);
    } else if (['USDC'].includes(selectedAsset)) {
      finalAsset = 'ckUSDC';
      messages = [
        'Sending USDC to ICP...',
        'USDC Received!',
        'Converting to ckUSDC...',
        'ckUSDC is in your Hut!'
      ];
      setTotalSteps(messages.length);
      handleEthereumDeposit(messages, finalAsset, amount);
    } else if (['USDT'].includes(selectedAsset)) {
      finalAsset = 'ckUSDT';
      messages = [
        'Sending USDT to ICP...',
        'USDT Received!',
        'Converting to ckUSDT...',
        'ckUSDT is in your Hut!'
      ];
      setTotalSteps(messages.length);
      handleEthereumDeposit(messages, finalAsset, amount);
    } else {
      // ck-tokens and ICP - direct deposits
      messages = [
        `Sending ${selectedAsset} to your Hut!`,
        `${selectedAsset} is in your Hut!`
      ];
      setTotalSteps(messages.length);
      handleStandardDeposit(messages, finalAsset, amount);
    }
  };

  const handleBitcoinDeposit = (messages: string[], finalAsset: string, amount: number) => {
    setProcessingMessage(messages[0]);
    setCurrentStepIndex(0);

    const timeout = setTimeout(() => {
      showBitcoinBlockConfirmation(() => {
        let messageIndex = 1;
        const messageInterval = setInterval(() => {
          if (messageIndex < messages.length) {
            setProcessingMessage(messages[messageIndex]);
            setCurrentStepIndex(messageIndex);
            messageIndex++;

            if (messageIndex >= messages.length) {
              clearInterval(messageInterval);
              setActiveIntervals(prev => prev.filter(i => i !== messageInterval));
              completeDeposit(finalAsset, amount);
            }
          }
        }, 2000);
        setActiveIntervals(prev => [...prev, messageInterval]);
      });
    }, 2000);
    setActiveTimeouts(prev => [...prev, timeout]);
  };

  const handleEthereumDeposit = (messages: string[], finalAsset: string, amount: number) => {
    setProcessingMessage(messages[0]);
    setCurrentStepIndex(0);

    const timeout = setTimeout(() => {
      showEthereumBlockConfirmation(() => {
        let messageIndex = 1;
        const messageInterval = setInterval(() => {
          if (messageIndex < messages.length) {
            setProcessingMessage(messages[messageIndex]);
            setCurrentStepIndex(messageIndex);
            messageIndex++;

            if (messageIndex >= messages.length) {
              clearInterval(messageInterval);
              setActiveIntervals(prev => prev.filter(i => i !== messageInterval));
              completeDeposit(finalAsset, amount);
            }
          }
        }, 2000);
        setActiveIntervals(prev => [...prev, messageInterval]);
      });
    }, 2000);
    setActiveTimeouts(prev => [...prev, timeout]);
  };


  const handleStandardDeposit = (messages: string[], finalAsset: string, amount: number) => {
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      if (messageIndex < messages.length) {
        setProcessingMessage(messages[messageIndex]);
        setCurrentStepIndex(messageIndex);
        messageIndex++;

        if (messageIndex >= messages.length) {
          clearInterval(messageInterval);
          setActiveIntervals(prev => prev.filter(i => i !== messageInterval));
          completeDeposit(finalAsset, amount);
        }
      }
    }, 1800);
    setActiveIntervals(prev => [...prev, messageInterval]);
  };

  const showBitcoinBlockConfirmation = (onComplete: () => void) => {
    setProcessingMessage('');
    // Show Bitcoin block confirmation UI - meter fills in 6 seconds
    setTimeout(() => {
      setProcessingMessage('✅ All 12 Bitcoin confirmations complete!');
      setTimeout(onComplete, 2000);
    }, 6500); // Wait for meter to complete (6s) + buffer (0.5s)
  };

  const showEthereumBlockConfirmation = (onComplete: () => void) => {
    setProcessingMessage('');
    // Show Ethereum block confirmation UI - meter fills in 6 seconds
    setTimeout(() => {
      setProcessingMessage('✅ All 65 Ethereum confirmations complete!');
      setTimeout(onComplete, 2000);
    }, 6500); // Wait for meter to complete (6s) + buffer (0.5s)
  };


  const completeDeposit = (finalAsset: string, amount: number) => {
    onDepositComplete(finalAsset, amount);
    setCurrentStep(DepositStep.Success);
  };

  const renderAmountInput = () => (
    <div>
      <div className="text-center mb-8">
        <div className="mb-4 flex justify-center">
          <AssetIcon asset={selectedAsset} size={64} />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-text-primary m-0" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>{selectedAsset}</h3>
      </div>

      <label className="block text-xs sm:text-sm font-semibold text-text-primary mb-2">Amount to deposit:</label>
      <input 
        type="number" 
        className="rounded-xl bg-surface-2 px-3 py-2 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-primary-400 text-text-primary placeholder:text-text-muted w-full mb-8"
        placeholder="0.001" 
        step="0.000001" 
        min="0"
        value={depositAmount}
        onChange={(e) => setDepositAmount(e.target.value)}
      />

      <button
        className="px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold bg-primary-600 hover:bg-primary-500 text-on-primary focus:ring-2 focus:ring-primary-400 focus:outline-none transition-all duration-200 w-full py-4 sm:text-base sm:font-semibold"
        onClick={handleConnectWallet}
      >
        Connect Wallet & Deposit
      </button>
    </div>
  );

  const renderWalletSelection = () => (
    <div>
      <h3 className="text-lg sm:text-xl font-bold text-text-primary mb-6 text-center" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Deposit {selectedAsset}</h3>
      <div className="grid grid-cols-1 gap-3">
        {WALLET_OPTIONS[selectedAsset]?.map((wallet) => (
          <div
            key={wallet.id}
            className="
              rounded-2xl border border-white/10 bg-surface-1 p-4
              hover:bg-surface-2 hover:border-primary-500/20
              active:scale-[0.98]
              transition-all duration-200
              cursor-pointer
              flex items-center gap-4
              min-h-[4rem]
            "
            onClick={() => handleWalletSelect(wallet.id)}
          >
            <div className="flex-shrink-0">
              {wallet.icon}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs sm:text-sm font-semibold text-text-primary block truncate">
                {wallet.name}
              </span>
              <span className="text-xs text-text-muted">
                {getWalletTypeText(selectedAsset)} Wallet
              </span>
            </div>
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-success-400 rounded-full opacity-60"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div>
      <div className="text-center py-8">
        {/* Step-based Progress Meter */}
        <div className="mb-6">
          <div className="w-full max-w-sm mx-auto">
            {/* Progress Bar Container */}
            <div className="h-4 bg-surface-3 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 rounded-full relative transition-all duration-1000 ease-out"
                style={{
                  width: `${((currentStepIndex + 1) / totalSteps) * 100}%`
                }}
              >
                {/* Shimmer Effect - Only when progressing */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full"
                  style={{
                    animation: currentStepIndex < totalSteps - 1 ? 'shimmer 2s ease-in-out infinite' : 'none'
                  }}
                ></div>
              </div>
            </div>

            {/* Step Progress Indicators */}
            <div className="mt-3 flex items-center justify-center">
              <div className="text-xs text-text-secondary">
                Step {currentStepIndex + 1} of {totalSteps}
              </div>
            </div>

            {/* Step Dots Visualization */}
            <div className="mt-2 flex items-center justify-center">
              <div className="inline-flex items-center gap-1.5">
                {Array.from({ length: totalSteps }, (_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index <= currentStepIndex
                        ? 'bg-primary-400 scale-110'
                        : 'bg-surface-3'
                    }`}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Processing Deposit...</h3>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">{processingMessage}</p>

        {/* Block confirmation visualizations would go here */}
        {(['BTC'].includes(selectedAsset) && processingMessage === '') && (
          <BitcoinConfirmationAnimation />
        )}
        {(['ETH', 'USDC', 'USDT'].includes(selectedAsset) && processingMessage === '') && (
          <EthereumConfirmationAnimation />
        )}
        {(['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'].includes(selectedAsset) && processingMessage === '') && (
          <ICPConfirmationAnimation />
        )}
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div>
      <div className="text-center py-8">
        <div className="mb-4 flex justify-center"><PartyPopper className="w-8 h-8 text-primary-500" /></div>
        <h3 className="text-lg sm:text-xl font-bold text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Deposit Successful!</h3>
        <p className="text-xs sm:text-sm text-text-secondary mb-8 leading-relaxed">
          Your asset has been added to your hut!
        </p>
        <button
          className="px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold bg-primary-600 hover:bg-primary-500 text-on-primary focus:ring-2 focus:ring-primary-400 focus:outline-none transition-all duration-200 w-full py-4 sm:text-base sm:font-semibold"
          onClick={handleClose}
        >
          {isSmartSolutionDeposit ? 'Continue Transaction' : 'Continue'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-overlay-1 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-1 rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/10">
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <div className="w-8"></div> {/* Spacer for centering */}
          <h2 className="text-lg sm:text-2xl font-bold text-text-primary m-0 text-center flex-1" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Deposit {selectedAsset}</h2>
          <button
            className="bg-transparent border-none text-lg sm:text-xl text-text-secondary cursor-pointer p-2 rounded-lg transition-all duration-200 hover:bg-surface-2 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"
            onClick={handleClose}
          >✕</button>
        </div>

        {currentStep === DepositStep.AmountInput && renderAmountInput()}
        {currentStep === DepositStep.WalletSelection && renderWalletSelection()}
        {currentStep === DepositStep.Processing && renderProcessing()}
        {currentStep === DepositStep.Success && renderSuccess()}
      </div>
    </div>
  );
};

// Block confirmation animation components
const BitcoinConfirmationAnimation: React.FC = () => (
  <div className="bitcoin-confirmation mt-4">
    <div className="confirmation-icon flex justify-center mb-3"><AssetIcon asset="BTC" size={28} className="sm:w-8 sm:h-8" /></div>
    <h4 className="text-sm sm:text-base font-semibold text-text-primary text-center mb-3">Bitcoin Block Confirmation</h4>
    <div className="confirmation-progress">
      <div className="confirmation-bar">
        <div className="confirmation-fill bitcoin"></div>
      </div>
      <div className="confirmation-status flex items-center justify-center gap-2 text-xs sm:text-sm text-text-secondary mb-2">
        <div className="w-2 h-2 bg-warning-400 rounded-full animate-pulse"></div>
        Waiting for 12 confirmations...
      </div>
      <div className="confirmation-count text-xs sm:text-sm font-medium text-warning-400 text-center mb-2">0/12 blocks</div>
    </div>
    <div className="confirmation-info text-xs sm:text-sm text-text-muted text-center leading-snug">
      <Lock className="inline w-3 h-3 sm:w-4 sm:h-4 mr-1" /> ICP requires 12 confirmations for Bitcoin finality (~2 hours)
    </div>
  </div>
);

const EthereumConfirmationAnimation: React.FC = () => (
  <div className="ethereum-confirmation mt-4">
    <div className="confirmation-icon flex justify-center mb-3"><AssetIcon asset="ETH" size={28} className="sm:w-8 sm:h-8" /></div>
    <h4 className="text-sm sm:text-base font-semibold text-text-primary text-center mb-3">Ethereum Block Confirmation</h4>
    <div className="confirmation-progress">
      <div className="confirmation-bar">
        <div className="confirmation-fill ethereum"></div>
      </div>
      <div className="confirmation-status flex items-center justify-center gap-2 text-xs sm:text-sm text-text-secondary mb-2">
        <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
        Waiting for 65 confirmations...
      </div>
      <div className="confirmation-count text-xs sm:text-sm font-medium text-primary-400 text-center mb-2">0/65 blocks</div>
    </div>
    <div className="confirmation-info text-xs sm:text-sm text-text-muted text-center leading-snug">
      <Lock className="inline w-3 h-3 sm:w-4 sm:h-4 mr-1" /> ICP requires 65 confirmations for Ethereum finality (~13 min)
    </div>
  </div>
);

const ICPConfirmationAnimation: React.FC = () => (
  <div className="icp-confirmation mt-4">
    <div className="confirmation-icon flex justify-center mb-3"><AssetIcon asset="ICP" size={28} className="sm:w-8 sm:h-8" /></div>
    <h4 className="text-sm sm:text-base font-semibold text-text-primary text-center mb-3">ICP Transaction Confirmation</h4>
    <div className="confirmation-progress">
      <div className="confirmation-bar">
        <div className="confirmation-fill icp"></div>
      </div>
      <div className="confirmation-status flex items-center justify-center gap-2 text-xs sm:text-sm text-text-secondary mb-2">
        <div className="w-2 h-2 bg-success-400 rounded-full animate-pulse"></div>
        Processing ICP transaction...
      </div>
      <div className="confirmation-count text-xs sm:text-sm font-medium text-success-400 text-center mb-2">Finalizing...</div>
    </div>
    <div className="confirmation-info text-xs sm:text-sm text-text-muted text-center leading-snug">
      <Zap className="inline w-3 h-3 sm:w-4 sm:h-4 mr-1" /> ICP transactions confirm in seconds
    </div>
  </div>
);

export default DepositModal;