import React from 'react';
import { X, ArrowRight, AlertTriangle } from 'lucide-react';
import { CompleteSwapAnalysis } from '../../assets/master_swap_logic';

interface TransactionPreviewModalProps {
  isOpen: boolean;
  transactionData: CompleteSwapAnalysis | null;
  onClose: () => void;
  onExecute: () => void;
}

const TransactionPreviewModal: React.FC<TransactionPreviewModalProps> = ({
  isOpen,
  transactionData,
  onClose,
  onExecute
}) => {
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

          {/* Action Buttons */}
          <div className="flex gap-3 sticky bottom-0 bg-surface-1 pt-4">
            <button
              className="flex-1 btn-secondary btn-text"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="flex-1 btn-primary btn-text"
              onClick={onExecute}
            >
              Execute Swap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionPreviewModal;