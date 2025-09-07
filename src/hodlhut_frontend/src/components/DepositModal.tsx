import React, { useState, useEffect } from 'react';
import AssetIcon from './AssetIcon';
import { 
  PartyPopper,
  Lock,
  Zap,
  Circle,
  Square,
  Sun,
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
}

interface WalletOption {
  id: string;
  name: string;
  icon: JSX.Element;
}

const WALLET_OPTIONS: Record<string, WalletOption[]> = {
  'BTC': [
    { id: 'unisat', name: 'Unisat Wallet', icon: <Circle className="w-4 h-4 text-orange-500" /> },
    { id: 'xverse', name: 'Xverse Wallet', icon: <Square className="w-4 h-4 text-blue-500" /> },
    { id: 'leather', name: 'Leather Wallet', icon: <Square className="w-4 h-4 text-amber-600" /> }
  ],
  'ETH': [
    { id: 'metamask', name: 'MetaMask', icon: <Wallet className="w-4 h-4 text-orange-500" /> },
    { id: 'coinbase', name: 'Coinbase Wallet', icon: <Circle className="w-4 h-4 text-blue-500" /> },
    { id: 'walletconnect', name: 'WalletConnect', icon: <Link className="w-4 h-4" /> }
  ],
  'USDC': [
    { id: 'metamask', name: 'MetaMask', icon: <Wallet className="w-4 h-4 text-orange-500" /> },
    { id: 'coinbase', name: 'Coinbase Wallet', icon: <Circle className="w-4 h-4 text-blue-500" /> },
    { id: 'walletconnect', name: 'WalletConnect', icon: <Link className="w-4 h-4" /> }
  ],
  'USDT': [
    { id: 'metamask', name: 'MetaMask', icon: <Wallet className="w-4 h-4 text-orange-500" /> },
    { id: 'coinbase', name: 'Coinbase Wallet', icon: <Circle className="w-4 h-4 text-blue-500" /> },
    { id: 'walletconnect', name: 'WalletConnect', icon: <Link className="w-4 h-4" /> }
  ],
  'SOL': [
    { id: 'phantom', name: 'Phantom Wallet', icon: <Wallet className="w-4 h-4 text-purple-500" /> },
    { id: 'solflare', name: 'Solflare Wallet', icon: <Sun className="w-4 h-4 text-yellow-500" /> },
    { id: 'backpack', name: 'Backpack Wallet', icon: <Square className="w-4 h-4 text-gray-600" /> }
  ],
  'USDC(SOL)': [
    { id: 'phantom', name: 'Phantom Wallet', icon: <Wallet className="w-4 h-4 text-purple-500" /> },
    { id: 'solflare', name: 'Solflare Wallet', icon: <Sun className="w-4 h-4 text-yellow-500" /> },
    { id: 'backpack', name: 'Backpack Wallet', icon: <Square className="w-4 h-4 text-gray-600" /> }
  ],
  'ckBTC': [
    { id: 'plug', name: 'Plug Wallet', icon: <Plug className="w-4 h-4 text-green-500" /> },
    { id: 'stoic', name: 'Stoic Wallet', icon: <Globe className="w-4 h-4 text-blue-500" /> },
    { id: 'nfid', name: 'NFID', icon: <User className="w-4 h-4 text-gray-600" /> }
  ],
  'ckETH': [
    { id: 'plug', name: 'Plug Wallet', icon: <Plug className="w-4 h-4 text-green-500" /> },
    { id: 'stoic', name: 'Stoic Wallet', icon: <Globe className="w-4 h-4 text-blue-500" /> },
    { id: 'nfid', name: 'NFID', icon: <User className="w-4 h-4 text-gray-600" /> }
  ],
  'ckUSDC': [
    { id: 'plug', name: 'Plug Wallet', icon: <Plug className="w-4 h-4 text-green-500" /> },
    { id: 'stoic', name: 'Stoic Wallet', icon: <Globe className="w-4 h-4 text-blue-500" /> },
    { id: 'nfid', name: 'NFID', icon: <User className="w-4 h-4 text-gray-600" /> }
  ],
  'ckUSDT': [
    { id: 'plug', name: 'Plug Wallet', icon: <Plug className="w-4 h-4 text-green-500" /> },
    { id: 'stoic', name: 'Stoic Wallet', icon: <Globe className="w-4 h-4 text-blue-500" /> },
    { id: 'nfid', name: 'NFID', icon: <User className="w-4 h-4 text-gray-600" /> }
  ],
  'ckSOL': [
    { id: 'plug', name: 'Plug Wallet', icon: <Plug className="w-4 h-4 text-green-500" /> },
    { id: 'stoic', name: 'Stoic Wallet', icon: <Globe className="w-4 h-4 text-blue-500" /> },
    { id: 'nfid', name: 'NFID', icon: <User className="w-4 h-4 text-gray-600" /> }
  ],
  'ICP': [
    { id: 'plug', name: 'Plug Wallet', icon: <Plug className="w-4 h-4 text-green-500" /> },
    { id: 'stoic', name: 'Stoic Wallet', icon: <Globe className="w-4 h-4 text-blue-500" /> },
    { id: 'nfid', name: 'NFID', icon: <User className="w-4 h-4 text-gray-600" /> }
  ]
};

const ASSET_ICONS: Record<string, JSX.Element> = {
  'BTC': <Circle className="w-4 h-4 text-orange-500" />,
  'ETH': <Circle className="w-4 h-4 text-blue-500" />, 
  'USDC': <CreditCard className="w-4 h-4 text-green-500" />,
  'USDT': <CreditCard className="w-4 h-4 text-green-600" />,
  'SOL': <Sun className="w-4 h-4 text-yellow-500" />,
  'ckBTC': <Circle className="w-4 h-4 text-orange-500" />,
  'ckETH': <Circle className="w-4 h-4 text-blue-500" />,
  'ckUSDC': <CreditCard className="w-4 h-4 text-green-500" />,
  'ckUSDT': <CreditCard className="w-4 h-4 text-green-600" />,
  'ckSOL': <Sun className="w-4 h-4 text-yellow-500" />,
  'ICP': <Globe className="w-4 h-4 text-purple-500" />
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
  onDepositComplete 
}) => {
  const [currentStep, setCurrentStep] = useState<DepositStep>(DepositStep.AmountInput);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [processingMessage, setProcessingMessage] = useState<string>('');
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

    // Determine deposit flow based on asset
    if (['BTC'].includes(selectedAsset)) {
      finalAsset = 'ckBTC';
      messages = [
        'Sending BTC to ICP Bitcoin canister...',
        'Bitcoin received!',
        'Minting ckBTC...',
        'ckBTC is in your Hut! Happy Hodling!'
      ];
      handleBitcoinDeposit(messages, finalAsset, amount);
    } else if (['ETH'].includes(selectedAsset)) {
      finalAsset = 'ckETH';
      messages = [
        'Sending ETH to ICP...',
        'ETH Received!',
        'Minting ckETH!',
        'Your ckETH is Safu in your Hut!'
      ];
      handleEthereumDeposit(messages, finalAsset, amount);
    } else if (['USDC'].includes(selectedAsset)) {
      finalAsset = 'ckUSDC';
      messages = [
        'Sending USDC to ICP...',
        'USDC Received!',
        'Converting to ckUSDC...',
        'ckUSDC is in your Hut!'
      ];
      handleEthereumDeposit(messages, finalAsset, amount);
    } else if (['USDT'].includes(selectedAsset)) {
      finalAsset = 'ckUSDT';
      messages = [
        'Sending USDT to ICP...',
        'USDT Received!',
        'Converting to ckUSDT...',
        'ckUSDT is in your Hut!'
      ];
      handleEthereumDeposit(messages, finalAsset, amount);
    } else if (['SOL', 'USDC(SOL)'].includes(selectedAsset)) {
      if (selectedAsset === 'SOL') {
        finalAsset = 'ckSOL';
        messages = [
          'Sending SOL to ICP...',
          'SOL Received!',
          'Converting to ckSOL...',
          'ckSOL is in your Hut!'
        ];
      } else { // USDC(SOL)
        finalAsset = 'ckUSDC';
        messages = [
          'Sending USDC (SOL) to ICP...',
          'USDC (SOL) Received!',
          'Converting to ckUSDC...',
          'ckUSDC is in your Hut!'
        ];
      }
      handleSolanaDeposit(messages, finalAsset, amount);
    } else {
      // ck-tokens and ICP - direct deposits
      messages = [
        `Sending ${selectedAsset} to your Hut!`,
        `${selectedAsset} is in your Hut!`
      ];
      handleStandardDeposit(messages, finalAsset, amount);
    }
  };

  const handleBitcoinDeposit = (messages: string[], finalAsset: string, amount: number) => {
    setProcessingMessage(messages[0]);
    
    const timeout = setTimeout(() => {
      showBitcoinBlockConfirmation(() => {
        let messageIndex = 1;
        const messageInterval = setInterval(() => {
          if (messageIndex < messages.length) {
            setProcessingMessage(messages[messageIndex]);
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
    
    const timeout = setTimeout(() => {
      showEthereumBlockConfirmation(() => {
        let messageIndex = 1;
        const messageInterval = setInterval(() => {
          if (messageIndex < messages.length) {
            setProcessingMessage(messages[messageIndex]);
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

  const handleSolanaDeposit = (messages: string[], finalAsset: string, amount: number) => {
    setProcessingMessage(messages[0]);
    
    const timeout = setTimeout(() => {
      showSolanaBlockConfirmation(() => {
        let messageIndex = 1;
        const messageInterval = setInterval(() => {
          if (messageIndex < messages.length) {
            setProcessingMessage(messages[messageIndex]);
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

  const showSolanaBlockConfirmation = (onComplete: () => void) => {
    setProcessingMessage('');
    // Show Solana block confirmation UI - meter fills in 6 seconds
    setTimeout(() => {
      setProcessingMessage('✅ Solana transaction confirmed!');
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
        <h3 className="text-xl font-bold text-text-primary m-0" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>{selectedAsset}</h3>
      </div>

      <label className="block text-sm font-semibold text-text-primary mb-2">Amount to deposit:</label>
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
        className="px-4 py-2 rounded-2xl text-sm font-semibold bg-primary-600 hover:bg-primary-500 text-on-primary focus:ring-2 focus:ring-primary-400 focus:outline-none transition-all duration-200 w-full py-4 text-base font-semibold"
        onClick={handleConnectWallet}
      >
        Connect Wallet & Deposit
      </button>
    </div>
  );

  const renderWalletSelection = () => (
    <div>
      <h3 className="text-xl font-bold text-text-primary mb-6 text-center" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Connect Wallet</h3>
      <div className="grid grid-cols-1 gap-3">
        {WALLET_OPTIONS[selectedAsset]?.map((wallet) => (
          <div 
            key={wallet.id}
            className="rounded-2xl border border-white/10 bg-surface-1 p-6 hover:bg-surface-2 transition-all duration-300 cursor-pointer gap-3"
            onClick={() => handleWalletSelect(wallet.id)}
          >
            <span>{wallet.icon}</span>
            <span className="text-sm font-semibold text-text-primary">{wallet.name}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div>
      <div className="text-center py-8">
        <div className="text-5xl mb-4">⏳</div>
        <h3 className="text-xl font-bold text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Processing Deposit...</h3>
        <p className="text-text-secondary text-sm leading-relaxed">{processingMessage}</p>
        
        {/* Block confirmation visualizations would go here */}
        {(['BTC'].includes(selectedAsset) && processingMessage === '') && (
          <BitcoinConfirmationAnimation />
        )}
        {(['ETH', 'USDC', 'USDT'].includes(selectedAsset) && processingMessage === '') && (
          <EthereumConfirmationAnimation />
        )}
        {(['SOL', 'USDC(SOL)'].includes(selectedAsset) && processingMessage === '') && (
          <SolanaConfirmationAnimation />
        )}
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div>
      <div className="text-center py-8">
        <div className="mb-4 flex justify-center"><PartyPopper className="w-8 h-8 text-primary-500" /></div>
        <h3 className="text-xl font-bold text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Deposit Successful!</h3>
        <p className="text-text-secondary text-sm mb-8 leading-relaxed">
          Your asset has been added to your hut!
        </p>
        <button 
          className="px-4 py-2 rounded-2xl text-sm font-semibold bg-primary-600 hover:bg-primary-500 text-on-primary focus:ring-2 focus:ring-primary-400 focus:outline-none transition-all duration-200 w-full py-4 text-base font-semibold"
          onClick={handleClose}
        >
          Continue
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-overlay-1 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-1 rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-text-primary m-0" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Deposit {selectedAsset}</h2>
          <button 
            className="bg-transparent border-none text-xl text-text-secondary cursor-pointer p-2 rounded-lg transition-all duration-200 hover:bg-surface-2"
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
  <div className="bitcoin-confirmation">
    <div className="confirmation-icon"><AssetIcon asset="BTC" size={32} /></div>
    <h4>Bitcoin Block Confirmation</h4>
    <div className="confirmation-progress">
      <div className="confirmation-bar">
        <div className="confirmation-fill bitcoin"></div>
      </div>
      <div className="confirmation-status">⏳ Waiting for 12 confirmations...</div>
      <div className="confirmation-count">0/12 blocks</div>
    </div>
    <div className="confirmation-info">
      <Lock className="inline w-4 h-4 mr-1" /> ICP requires 12 confirmations for Bitcoin finality (~2 hours)
    </div>
  </div>
);

const EthereumConfirmationAnimation: React.FC = () => (
  <div className="ethereum-confirmation">
    <div className="confirmation-icon"><AssetIcon asset="ETH" size={32} /></div>
    <h4>Ethereum Block Confirmation</h4>
    <div className="confirmation-progress">
      <div className="confirmation-bar">
        <div className="confirmation-fill ethereum"></div>
      </div>
      <div className="confirmation-status">⏳ Waiting for 65 confirmations...</div>
      <div className="confirmation-count">0/65 blocks</div>
    </div>
    <div className="confirmation-info">
      <Lock className="inline w-4 h-4 mr-1" /> ICP requires 65 confirmations for Ethereum finality (~13 min)
    </div>
  </div>
);

const SolanaConfirmationAnimation: React.FC = () => (
  <div className="solana-confirmation">
    <div className="confirmation-icon"><AssetIcon asset="SOL" size={32} /></div>
    <h4>Solana Transaction Confirmation</h4>
    <div className="confirmation-progress">
      <div className="confirmation-bar">
        <div className="confirmation-fill solana"></div>
      </div>
      <div className="confirmation-status">⏳ Confirming transaction...</div>
      <div className="confirmation-count">Finalizing...</div>
    </div>
    <div className="confirmation-info">
      <Zap className="inline w-4 h-4 mr-1" /> Solana transactions confirm in seconds
    </div>
  </div>
);

export default DepositModal;