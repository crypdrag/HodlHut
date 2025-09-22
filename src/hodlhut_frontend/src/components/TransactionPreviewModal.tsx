import React, { useState, useEffect } from 'react';
import { X, ArrowRight, AlertTriangle, Wallet, ExternalLink, CheckCircle, Copy } from 'lucide-react';
import { CompleteSwapAnalysis, SmartSolution } from '../../assets/master_swap_logic';

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
          { id: 'unisat', name: 'Unisat', icon: '🟠' },
          { id: 'xverse', name: 'Xverse', icon: '⚫' },
          { id: 'okx', name: 'OKX Wallet', icon: '🔵' }
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
      <div className="bg-surface-1 border border-white/20 rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-surface-1 z-10">
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
        <div className="p-6">
          {/* Swap Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-surface-2 rounded-xl p-4">
              <div className="text-xs font-medium text-text-muted mb-2">From</div>
              <div className="text-sm sm:text-base font-semibold text-text-primary">
                {formatAmount(transactionData.amount)} {transactionData.fromAsset}
              </div>
            </div>
            <div className="bg-surface-2 rounded-xl p-4">
              <div className="text-xs font-medium text-text-muted mb-2">To</div>
              <div className="text-sm sm:text-base font-semibold text-text-primary">
                {formatAmount(transactionData.outputAmount)} {transactionData.toAsset}
              </div>
            </div>
          </div>

          {/* Exchange Rate */}
          <div className="bg-surface-2 rounded-xl p-4 mb-6">
            <div className="text-xs font-medium text-text-muted mb-2">Exchange Rate</div>
            <div className="text-sm font-semibold text-text-primary">
              1 {transactionData.fromAsset} = {formatAmount(transactionData.rate)} {transactionData.toAsset}
            </div>
          </div>

          {/* Route Information */}
          <div className="bg-surface-2 rounded-xl p-4 mb-6">
            <div className="text-xs font-medium text-text-muted mb-3">Swap Route</div>
            <div className="flex items-center gap-2 flex-wrap">
              {transactionData.route.steps.map((step, index) => (
                <React.Fragment key={index}>
                  <span className="text-sm font-medium text-text-primary bg-surface-3 px-2 py-1 rounded-lg">
                    {step}
                  </span>
                  {index < transactionData.route.steps.length - 1 && (
                    <ArrowRight size={14} className="text-text-muted" />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="text-xs text-text-secondary mt-2">
              Complexity: {transactionData.route.complexity} • {transactionData.route.estimatedTime}
            </div>
          </div>

          {/* Smart Solution Gas Swap Details */}
          {approvedSmartSolution?.swapDetails && (
            <div className="bg-warning-600/10 border border-warning-500/20 rounded-xl p-4 mb-6">
              <div className="text-xs font-medium text-warning-400 mb-4 flex items-center gap-2">
                <AlertTriangle size={14} />
                Gas Asset Swap Required
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-secondary">Swap Amount:</span>
                  <span className="font-medium text-text-primary">
                    {approvedSmartSolution.swapDetails.sourceAmount.toFixed(6)} {approvedSmartSolution.swapDetails.sourceAsset}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-secondary">Receive:</span>
                  <span className="font-medium text-success-400">
                    {approvedSmartSolution.swapDetails.targetAmount} {approvedSmartSolution.swapDetails.targetAsset}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-secondary">Exchange Rate:</span>
                  <span className="font-medium text-text-primary">
                    1 {approvedSmartSolution.swapDetails.sourceAsset} = {approvedSmartSolution.swapDetails.exchangeRate.toFixed(4)} {approvedSmartSolution.swapDetails.targetAsset}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-secondary">DEX Fee ({approvedSmartSolution.swapDetails.dexFeePercentage}%):</span>
                  <span className="font-medium text-error-400">
                    {approvedSmartSolution.swapDetails.dexFee.toFixed(6)} {approvedSmartSolution.swapDetails.sourceAsset}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-secondary">DEX Platform:</span>
                  <span className="font-medium text-text-primary">
                    {approvedSmartSolution.swapDetails.recommendedDEX}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-white/10 pt-2">
                  <span className="text-text-secondary font-medium">Total Cost USD:</span>
                  <span className="font-semibold text-error-400">
                    ${approvedSmartSolution.swapDetails.totalCostUSD.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="mt-3 text-xs text-warning-300">
                This swap will be executed automatically to obtain {approvedSmartSolution.swapDetails.targetAsset} for gas fees.
              </div>
            </div>
          )}

          {/* Fee Breakdown */}
          {transactionData.feeRequirements.length > 0 && (
            <div className="bg-surface-2 rounded-xl p-4 mb-6">
              <div className="text-xs font-medium text-text-muted mb-4">Fee Breakdown</div>
              <div className="space-y-3">
                {transactionData.feeRequirements.map((fee: any, index: number) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">{fee.description}</span>
                    <span className="font-medium text-text-primary">${fee.usdValue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total Fees */}
          <div className="bg-warning-600/10 border border-warning-500/20 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-warning-400" />
                <span className="text-sm font-semibold text-text-primary">Total Fees</span>
              </div>
              <span className="text-sm font-bold text-warning-400">
                ${transactionData.totalFeesUSD.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Cross-Chain Information */}
          {transactionData.route.isCrossChain && (
            <div className="bg-primary-600/10 border border-primary-500/20 rounded-xl p-4 mb-6">
              <div className="text-xs font-medium text-primary-400 mb-2">Cross-Chain Transaction</div>
              <div className="text-sm text-text-secondary">
                Chains involved: {transactionData.route.chainsInvolved?.join(' → ')}
              </div>
            </div>
          )}

          {/* Destination Wallet Section */}
          {transactionData.isL1Withdrawal && getDestinationInfo() && (
            <div className="bg-warning-600/10 border border-warning-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={16} className="text-warning-400" />
                <span className="text-sm font-semibold text-warning-400">Destination Required</span>
              </div>

              <div className="text-xs text-text-secondary mb-4">
                Where should your {transactionData.toAsset} be sent on {getDestinationInfo()?.network}?
              </div>

              {/* Connection Method Toggle */}
              <div className="flex bg-surface-2 rounded-lg p-1 mb-4">
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
                <div className="space-y-2">
                  {getDestinationInfo()?.wallets.map((wallet) => (
                    <button
                      key={wallet.id}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        connectedWallet === wallet.id
                          ? 'border-success-500 bg-success-600/10'
                          : 'border-white/10 bg-surface-2 hover:bg-surface-3'
                      }`}
                      onClick={() => handleWalletConnect(wallet.id)}
                    >
                      <span className="text-lg">{wallet.icon}</span>
                      <span className="text-sm font-medium text-text-primary">{wallet.name}</span>
                      <div className="ml-auto">
                        {connectedWallet === wallet.id ? (
                          <CheckCircle size={16} className="text-success-400" />
                        ) : (
                          <ExternalLink size={14} className="text-text-muted" />
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
                <div>
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

          {/* Action Buttons */}
          <div className="flex gap-3 sticky bottom-0 bg-surface-1 pt-4">
            <button
              className="flex-1 btn-secondary btn-text"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className={`flex-1 btn-text transition-colors ${
                transactionData.isL1Withdrawal && !destinationReady
                  ? 'bg-surface-3 text-text-muted cursor-not-allowed'
                  : 'btn-primary'
              }`}
              onClick={() => {
                if (transactionData.isL1Withdrawal && !destinationReady) return;
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
              disabled={transactionData.isL1Withdrawal && !destinationReady}
            >
              {transactionData.isL1Withdrawal && !destinationReady
                ? 'Select Destination First'
                : 'Execute Swap'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionPreviewModal;