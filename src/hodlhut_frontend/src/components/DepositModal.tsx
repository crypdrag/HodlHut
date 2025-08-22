import React, { useState } from 'react';
import AssetIcon from './AssetIcon';
import '../styles/DepositModal.css';

export interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAsset: string;
  onDepositComplete: (asset: string, amount: number) => void;
}

interface WalletOption {
  id: string;
  name: string;
  icon: string;
}

const WALLET_OPTIONS: Record<string, WalletOption[]> = {
  'BTC': [
    { id: 'unisat', name: 'Unisat Wallet', icon: '🟠' },
    { id: 'xverse', name: 'Xverse Wallet', icon: '🔷' },
    { id: 'leather', name: 'Leather Wallet', icon: '🟤' }
  ],
  'ETH': [
    { id: 'metamask', name: 'MetaMask', icon: '🦊' },
    { id: 'coinbase', name: 'Coinbase Wallet', icon: '🔵' },
    { id: 'walletconnect', name: 'WalletConnect', icon: '🔗' }
  ],
  'USDC': [
    { id: 'metamask', name: 'MetaMask', icon: '🦊' },
    { id: 'coinbase', name: 'Coinbase Wallet', icon: '🔵' },
    { id: 'walletconnect', name: 'WalletConnect', icon: '🔗' }
  ],
  'USDT': [
    { id: 'metamask', name: 'MetaMask', icon: '🦊' },
    { id: 'coinbase', name: 'Coinbase Wallet', icon: '🔵' },
    { id: 'walletconnect', name: 'WalletConnect', icon: '🔗' }
  ],
  'SOL': [
    { id: 'phantom', name: 'Phantom Wallet', icon: '👻' },
    { id: 'solflare', name: 'Solflare Wallet', icon: '☀️' },
    { id: 'backpack', name: 'Backpack Wallet', icon: '🎒' }
  ],
  'ckBTC': [
    { id: 'plug', name: 'Plug Wallet', icon: '🔌' },
    { id: 'stoic', name: 'Stoic Wallet', icon: '🌍' },
    { id: 'nfid', name: 'NFID', icon: '🆔' }
  ],
  'ckETH': [
    { id: 'plug', name: 'Plug Wallet', icon: '🔌' },
    { id: 'stoic', name: 'Stoic Wallet', icon: '🌍' },
    { id: 'nfid', name: 'NFID', icon: '🆔' }
  ],
  'ckUSDC': [
    { id: 'plug', name: 'Plug Wallet', icon: '🔌' },
    { id: 'stoic', name: 'Stoic Wallet', icon: '🌍' },
    { id: 'nfid', name: 'NFID', icon: '🆔' }
  ],
  'ckUSDT': [
    { id: 'plug', name: 'Plug Wallet', icon: '🔌' },
    { id: 'stoic', name: 'Stoic Wallet', icon: '🌍' },
    { id: 'nfid', name: 'NFID', icon: '🆔' }
  ],
  'ckSOL': [
    { id: 'plug', name: 'Plug Wallet', icon: '🔌' },
    { id: 'stoic', name: 'Stoic Wallet', icon: '🌍' },
    { id: 'nfid', name: 'NFID', icon: '🆔' }
  ],
  'ICP': [
    { id: 'plug', name: 'Plug Wallet', icon: '🔌' },
    { id: 'stoic', name: 'Stoic Wallet', icon: '🌍' },
    { id: 'nfid', name: 'NFID', icon: '🆔' }
  ]
};

const ASSET_ICONS: Record<string, string> = {
  'BTC': '₿',
  'ETH': 'Ξ', 
  'USDC': '💵',
  'USDT': '💲',
  'SOL': '☀️',
  'ckBTC': '₿',
  'ckETH': 'Ξ',
  'ckUSDC': '💵',
  'ckUSDT': '💲',
  'ckSOL': '☀️',
  'ICP': '∞'
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
  const [processingMessage, setProcessingMessage] = useState<string>('Connecting to blockchain...');
  const [activeTimeouts, setActiveTimeouts] = useState<NodeJS.Timeout[]>([]);
  const [activeIntervals, setActiveIntervals] = useState<NodeJS.Timeout[]>([]);

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
    setProcessingMessage('Connecting to blockchain...');
    
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
    setProcessingMessage('Connecting to blockchain...');
    
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
        'ckBTC is in your Hut! Happy Hodling! 🎉'
      ];
      handleBitcoinDeposit(messages, finalAsset, amount);
    } else if (['ETH'].includes(selectedAsset)) {
      finalAsset = 'ckETH';
      messages = [
        'Sending ETH to ICP...',
        'ETH Received!',
        'Minting ckETH!',
        'Your ckETH is Safu in your Hut! 🎉'
      ];
      handleEthereumDeposit(messages, finalAsset, amount);
    } else if (['USDC'].includes(selectedAsset)) {
      finalAsset = 'ckUSDC';
      messages = [
        'Sending USDC to ICP...',
        'USDC Received!',
        'Converting to ckUSDC...',
        'ckUSDC is in your Hut! 🎉'
      ];
      handleEthereumDeposit(messages, finalAsset, amount);
    } else if (['USDT'].includes(selectedAsset)) {
      finalAsset = 'ckUSDT';
      messages = [
        'Sending USDT to ICP...',
        'USDT Received!',
        'Converting to ckUSDT...',
        'ckUSDT is in your Hut! 🎉'
      ];
      handleEthereumDeposit(messages, finalAsset, amount);
    } else if (['SOL'].includes(selectedAsset)) {
      finalAsset = 'ckSOL';
      messages = [
        'Sending SOL to ICP...',
        'SOL Received!',
        'Converting to ckSOL...',
        'ckSOL is in your Hut! 🎉'
      ];
      handleSolanaDeposit(messages, finalAsset, amount);
    } else {
      // ck-tokens and ICP - direct deposits
      messages = [
        `Sending ${selectedAsset} to your Hut!`,
        `${selectedAsset} is in your Hut! 🎉`
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
    // Show Bitcoin block confirmation UI
    setTimeout(() => {
      setProcessingMessage('✅ All 12 Bitcoin confirmations complete!');
      setTimeout(onComplete, 2000);
    }, 8000); // Simulate 8 seconds for demo
  };

  const showEthereumBlockConfirmation = (onComplete: () => void) => {
    setProcessingMessage('');
    // Show Ethereum block confirmation UI  
    setTimeout(() => {
      setProcessingMessage('✅ All 65 Ethereum confirmations complete!');
      setTimeout(onComplete, 2000);
    }, 6000); // Simulate 6 seconds for demo
  };

  const showSolanaBlockConfirmation = (onComplete: () => void) => {
    setProcessingMessage('');
    // Show Solana block confirmation UI
    setTimeout(() => {
      setProcessingMessage('✅ Solana transaction confirmed!');
      setTimeout(onComplete, 2000);
    }, 3000); // Simulate 3 seconds for demo
  };

  const completeDeposit = (finalAsset: string, amount: number) => {
    onDepositComplete(finalAsset, amount);
    setCurrentStep(DepositStep.Success);
  };

  const renderAmountInput = () => (
    <div id="deposit-step-1">
      <div className="deposit-asset-header">
        <div className="selected-asset-icon">
          <AssetIcon asset={selectedAsset} size={64} />
        </div>
        <h3 className="selected-asset-name">{selectedAsset}</h3>
      </div>

      <label className="amount-label">Amount to deposit:</label>
      <input 
        type="number" 
        className="deposit-amount-input" 
        placeholder="0.001" 
        step="0.000001" 
        min="0"
        value={depositAmount}
        onChange={(e) => setDepositAmount(e.target.value)}
      />

      <button 
        className="connect-wallet-btn" 
        onClick={handleConnectWallet}
      >
        Connect Wallet & Deposit
      </button>
    </div>
  );

  const renderWalletSelection = () => (
    <div id="deposit-step-2">
      <h3 className="wallet-selection-title">Connect Wallet</h3>
      <div className="wallet-grid">
        {WALLET_OPTIONS[selectedAsset]?.map((wallet) => (
          <div 
            key={wallet.id}
            className="wallet-option"
            onClick={() => handleWalletSelect(wallet.id)}
          >
            <span className="wallet-icon">{wallet.icon}</span>
            <span className="wallet-name">{wallet.name}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div id="deposit-step-3">
      <div className="processing-container">
        <div className="processing-icon">⏳</div>
        <h3>Processing Deposit...</h3>
        <p className="processing-message">{processingMessage}</p>
        
        {/* Block confirmation visualizations would go here */}
        {(['BTC'].includes(selectedAsset) && processingMessage === '') && (
          <BitcoinConfirmationAnimation />
        )}
        {(['ETH', 'USDC', 'USDT'].includes(selectedAsset) && processingMessage === '') && (
          <EthereumConfirmationAnimation />
        )}
        {(['SOL'].includes(selectedAsset) && processingMessage === '') && (
          <SolanaConfirmationAnimation />
        )}
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div id="deposit-step-4">
      <div className="success-container">
        <div className="success-icon">🎉</div>
        <h3>Deposit Successful!</h3>
        <p className="success-message">
          Your asset has been added to your hut!
        </p>
        <button className="continue-btn" onClick={handleClose}>
          Continue
        </button>
      </div>
    </div>
  );

  return (
    <div className="deposit-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Deposit {selectedAsset}</h2>
          <button className="close-btn" onClick={handleClose}>✕</button>
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
      🔒 ICP requires 12 confirmations for Bitcoin finality (~2 hours)
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
      🔒 ICP requires 65 confirmations for Ethereum finality (~13 minutes)
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
      ⚡ Solana transactions confirm in seconds
    </div>
  </div>
);

export default DepositModal;