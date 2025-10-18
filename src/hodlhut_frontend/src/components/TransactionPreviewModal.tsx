import React, { useState, useEffect } from 'react';
import { X, ArrowRight, AlertTriangle, Wallet, ExternalLink, CheckCircle, Copy } from 'lucide-react';
import { CompleteSwapAnalysis, SmartSolution } from '../../assets/master_swap_logic';
import UnisatLogo from '../../assets/images/Unisat.svg';
import XverseLogo from '../../assets/images/Xverse.svg';

interface TransactionPreviewModalProps {
  isOpen: boolean;
  transactionData: CompleteSwapAnalysis | null;
  approvedSmartSolution?: SmartSolution | null;
  onClose: () => void;
  onExecute: () => void;
}

const TransactionPreviewModal: React.FC<TransactionPreviewModalProps> = ({
  isOpen,
  transactionData,
  approvedSmartSolution,
  onClose,
  onExecute
}) => {
  // Wallet connection state
  const [walletConnectionMethod, setWalletConnectionMethod] = useState<'connect' | 'manual'>('connect');
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState<string>('');
  const [addressValid, setAddressValid] = useState<boolean>(false);
  const [destinationReady, setDestinationReady] = useState<boolean>(false);

  // Reset wallet state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setWalletConnectionMethod('connect');
      setConnectedWallet(null);
      setManualAddress('');
      setAddressValid(false);
      setDestinationReady(false);
    }
  }, [isOpen]);

  // Validate address format
  useEffect(() => {
    if (walletConnectionMethod === 'manual' && manualAddress) {
      // Basic validation (in production, use proper address validation libraries)
      const isBTCAddress = manualAddress.match(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,87}$/);
      const isETHAddress = manualAddress.match(/^0x[a-fA-F0-9]{40}$/);
      setAddressValid(!!(isBTCAddress || isETHAddress));
    } else {
      setAddressValid(false);
    }
  }, [manualAddress, walletConnectionMethod]);

  // Update destination ready status
  useEffect(() => {
    const isWalletReady = walletConnectionMethod === 'connect' && connectedWallet;
    const isManualReady = walletConnectionMethod === 'manual' && addressValid;
    setDestinationReady(!!(isWalletReady || isManualReady));
  }, [walletConnectionMethod, connectedWallet, addressValid]);

  // Get destination network info
  const getDestinationInfo = () => {
    if (!transactionData) return null;

    const { toAsset } = transactionData;
    if (toAsset === 'BTC') {
      return {
        network: 'Bitcoin',
        wallets: [
          { id: 'unisat', name: 'Unisat', logo: UnisatLogo },
          { id: 'xverse', name: 'Xverse', logo: XverseLogo }
        ],
        addressPlaceholder: 'bc1q... or 1... or 3...'
      };
    } else if (['ETH', 'USDC', 'USDT'].includes(toAsset)) {
      return {
        network: 'Ethereum',
        wallets: [
          { id: 'metamask', name: 'MetaMask', icon: '🦊' },
          { id: 'coinbase', name: 'Coinbase Wallet', icon: '🔷' },
          { id: 'walletconnect', name: 'WalletConnect', icon: '🔗' }
        ],
        addressPlaceholder: '0x...'
      };
    }
    return null;
  };

  // Mock wallet connection (in production, integrate with actual wallet APIs)
  const handleWalletConnect = async (walletId: string) => {
    // Simulate connection
    setConnectedWallet(walletId);
    // In production:
    // - Call wallet.connect()
    // - Get user's address
    // - Validate network
  };

  // Format amount utility
  const formatAmount = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(4);
  };

  if (!isOpen || !transactionData) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-600/20 flex items-center justify-center">
              📋
            </div>
            <h3 className="text-xl font-semibold text-text-primary">Transaction Preview</h3>
          </div>
          <button
            className="w-8 h-8 rounded-full bg-surface-3 hover:bg-surface-2 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {/* Destination Wallet Section - PRIORITIZED FOR MOBILE */}
          {transactionData.isL1Withdrawal && getDestinationInfo() && (
            <div className="info-critical mb-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-warning-400" />
                <span className="text-xs sm:text-sm font-semibold text-warning-400">Select Destination Wallet</span>
              </div>

              <div className="text-xs text-text-secondary mb-3">
                Where should your {transactionData.toAsset} be sent on {getDestinationInfo()?.network}?
              </div>

              {/* Connection Method Toggle */}
              <div className="flex bg-surface-2 rounded-lg p-1 mb-3">
                <button
                  className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-colors ${
                    walletConnectionMethod === 'connect'
                      ? 'bg-primary-600 text-white'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  onClick={() => setWalletConnectionMethod('connect')}
                >
                  Connect Wallet
                </button>
                <button
                  className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-colors ${
                    walletConnectionMethod === 'manual'
                      ? 'bg-primary-600 text-white'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  onClick={() => setWalletConnectionMethod('manual')}
                >
                  Enter Address
                </button>
              </div>

              {/* Wallet Connection Options */}
              {walletConnectionMethod === 'connect' && (
                <div className="space-y-2 mb-3">
                  {getDestinationInfo()?.wallets.map((wallet: any) => (
                    <button
                      key={wallet.id}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 transform ${
                        connectedWallet === wallet.id
                          ? 'border-success-500 bg-success-600/10 scale-[1.02] shadow-lg'
                          : 'border-warning-400 bg-surface-2 hover:bg-surface-3 hover:border-warning-300 hover:scale-[1.01] hover:shadow-md'
                      }`}
                      onClick={() => handleWalletConnect(wallet.id)}
                    >
                      {wallet.logo ? (
                        <img
                          src={wallet.logo}
                          alt={wallet.name}
                          className="w-6 h-6 object-contain transition-transform duration-200 hover:scale-110"
                        />
                      ) : (
                        <span className="text-lg transition-transform duration-200 hover:scale-110">{wallet.icon}</span>
                      )}
                      <span className="text-sm font-medium text-text-primary">{wallet.name}</span>
                      <div className="ml-auto transition-colors duration-200">
                        {connectedWallet === wallet.id ? (
                          <CheckCircle size={16} className="text-success-400" />
                        ) : (
                          <ExternalLink size={14} className="text-text-muted group-hover:text-warning-400" />
                        )}
                      </div>
                    </button>
                  ))}

                  {connectedWallet && (
                    <div className="mt-3 p-3 bg-success-600/10 border border-success-500/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-success-400" />
                        <span className="text-xs font-medium text-success-400">Wallet Connected</span>
                      </div>
                      <div className="text-xs text-text-secondary mt-1">
                        Ready to receive {transactionData.toAsset}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Address Input */}
              {walletConnectionMethod === 'manual' && (
                <div className="mb-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      placeholder={getDestinationInfo()?.addressPlaceholder}
                      className={`w-full p-3 bg-surface-2 border rounded-lg text-sm transition-colors ${
                        manualAddress && addressValid
                          ? 'border-success-500 text-success-400'
                          : manualAddress && !addressValid
                          ? 'border-error-500 text-error-400'
                          : 'border-white/10 text-text-primary'
                      }`}
                    />
                    {manualAddress && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {addressValid ? (
                          <CheckCircle size={16} className="text-success-400" />
                        ) : (
                          <AlertTriangle size={16} className="text-error-400" />
                        )}
                      </div>
                    )}
                  </div>

                  {manualAddress && !addressValid && (
                    <div className="mt-2 text-xs text-error-400">
                      Please enter a valid {getDestinationInfo()?.network} address
                    </div>
                  )}

                  {addressValid && (
                    <div className="mt-2 p-3 bg-success-600/10 border border-success-500/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-success-400" />
                        <span className="text-xs font-medium text-success-400">Valid Address</span>
                      </div>
                      <div className="text-xs text-text-secondary mt-1">
                        {transactionData.toAsset} will be sent to this address
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Swap Overview - Critical Info */}
          <div className="amount-display-compact mb-2">
            <div>
              <div className="text-xs font-medium text-text-muted">From</div>
              <div className="text-sm sm:text-lg font-semibold text-text-primary">
                {formatAmount(transactionData.amount)} {transactionData.fromAsset}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-text-muted">To</div>
              <div className="text-sm sm:text-lg font-semibold text-text-primary">
                {formatAmount(transactionData.outputAmount)} {transactionData.toAsset}
              </div>
            </div>
          </div>

          {/* Compact Route & Rate Information */}
          <div className="bg-surface-2 rounded-lg p-2 sm:p-3 mb-3">
            {/* Rate and Route in single row on mobile, stacked on small screens */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 mb-2">
              <div className="flex-1">
                <div className="text-xs font-medium text-text-muted">Rate</div>
                <div className="text-xs font-semibold text-text-primary">
                  1 {transactionData.fromAsset} = {formatAmount(transactionData.rate)} {transactionData.toAsset}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-text-muted">Route</div>
                <div className="flex items-center gap-1 flex-wrap">
                  {transactionData.route.steps.map((step, index) => (
                    <React.Fragment key={index}>
                      <span className="text-xs font-medium text-text-primary bg-surface-3 px-1.5 py-0.5 rounded">
                        {step}
                      </span>
                      {index < transactionData.route.steps.length - 1 && (
                        <ArrowRight size={12} className="text-text-muted" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-xs text-text-secondary">
              {transactionData.route.complexity} • {transactionData.route.estimatedTime}
            </div>
          </div>

          {/* Smart Solution Gas Swap Details */}
          {approvedSmartSolution?.swapDetails && (
            <div className="bg-warning-600/10 border border-warning-500/20 rounded-lg p-2 sm:p-3 mb-3">
              <div className="text-xs sm:text-sm font-medium text-warning-400 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                <AlertTriangle size={12} className="sm:w-4 sm:h-4 flex-shrink-0" />
                Gas Asset Swap Required
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-text-secondary">Swap:</span>
                  <span className="font-medium text-text-primary text-right">
                    {approvedSmartSolution.swapDetails.sourceAmount.toFixed(6)} {approvedSmartSolution.swapDetails.sourceAsset}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-text-secondary">Receive:</span>
                  <span className="font-medium text-success-400 text-right">
                    {approvedSmartSolution.swapDetails.targetAmount} {approvedSmartSolution.swapDetails.targetAsset}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-text-secondary">Rate:</span>
                  <span className="font-medium text-text-primary text-right">
                    1 {approvedSmartSolution.swapDetails.sourceAsset} = {approvedSmartSolution.swapDetails.exchangeRate.toFixed(4)} {approvedSmartSolution.swapDetails.targetAsset}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-text-secondary">Fee:</span>
                  <span className="font-medium text-error-400 text-right">
                    {approvedSmartSolution.swapDetails.dexFee.toFixed(6)} {approvedSmartSolution.swapDetails.sourceAsset}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-text-secondary">DEX:</span>
                  <span className="font-medium text-text-primary text-right">
                    {approvedSmartSolution.swapDetails.recommendedDEX}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm border-t border-white/10 pt-1.5 sm:pt-2 mt-1.5 sm:mt-2">
                  <span className="text-text-secondary font-medium">Total USD:</span>
                  <span className="font-semibold text-error-400 text-right">
                    ${approvedSmartSolution.swapDetails.totalCostUSD.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="mt-2 sm:mt-3 text-xs text-warning-300 leading-snug">
                Auto-executed for {approvedSmartSolution.swapDetails.targetAsset} gas fees
              </div>
            </div>
          )}

          {/* Fee Breakdown */}
          {transactionData.feeRequirements.length > 0 && (
            <div className="bg-surface-2 rounded-lg p-2 sm:p-3 mb-3">
              <div className="text-xs font-medium text-text-muted mb-2">Fee Breakdown</div>
              <div className="space-y-3">
                {transactionData.feeRequirements.map((fee: any, index: number) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-text-secondary">{fee.description}</span>
                    <span className="text-xs sm:text-sm font-medium text-text-primary">${fee.usdValue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total Fees */}
          <div className="bg-warning-600/10 border border-warning-500/20 rounded-lg p-2 sm:p-3 mb-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-warning-400" />
                <span className="text-xs sm:text-sm font-semibold text-text-primary">Total Fees</span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-warning-400">
                ${transactionData.totalFeesUSD.toFixed(2)}
              </span>
            </div>
          </div>



        </div>

        {/* Action Buttons */}
        <div className="modal-footer">
          <div className="action-zone-primary">
            {destinationReady || !transactionData.isL1Withdrawal ? (
              <div className="flex gap-3">
                <button
                  className="flex-1 btn-error btn-text"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 btn-primary btn-text"
                  onClick={() => {
                    // Pass destination info to execution
                    const destinationInfo = {
                      method: walletConnectionMethod,
                      wallet: connectedWallet,
                      address: manualAddress,
                      network: getDestinationInfo()?.network
                    };
                    console.log('Executing with destination:', destinationInfo);
                    onExecute();
                  }}
                >
                  Execute Swap
                </button>
              </div>
            ) : (
              <button
                className="w-full btn-error btn-text"
                onClick={onClose}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionPreviewModal;