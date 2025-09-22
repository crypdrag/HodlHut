import React, { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { SmartSolution } from '../../assets/master_swap_logic';
import OptimalDEXSelector from './OptimalDEXSelector';

interface SmartSolutionModalProps {
  isOpen: boolean;
  pendingApproval: SmartSolution | null;
  onConfirm: () => void;
  onCancel: () => void;
  // New props for CompactDEX integration
  fromAsset?: string;
  toAsset?: string;
  swapAmount?: string;
  swapValueUSD?: number;
}

// DEX data structure for CompactDEXSelector (reusing from SwapAssetsSection)
const DEX_OPTIONS_ENHANCED = {
  KongSwap: {
    name: 'KongSwap',
    badge: 'speed',
    stats: {
      'Swap Speed': '~30s',
      'Trading Fee': '0.3%',
      'Liquidity': 'Medium',
      'Slippage': 'Low'
    },
    advantages: ['Fast execution', 'Low slippage'],
    tradeoffs: ['Lower liquidity pools', 'Newer platform']
  },
  ICPSwap: {
    name: 'ICPSwap',
    badge: 'liquidity',
    stats: {
      'Swap Speed': '~45s',
      'Trading Fee': '0.3%',
      'Liquidity': 'High',
      'Slippage': 'Medium'
    },
    advantages: ['Deep liquidity', 'Established platform'],
    tradeoffs: ['Slightly slower', 'Higher fees']
  },
  ICDEX: {
    name: 'ICDEX',
    badge: 'liquidity',
    stats: {
      'Swap Speed': '~60s',
      'Trading Fee': '0.1%',
      'Liquidity': 'High',
      'Slippage': 'Low'
    },
    advantages: ['Professional orderbook', 'Low fees'],
    tradeoffs: ['Slower execution', 'More complex interface']
  }
};

const SmartSolutionModal: React.FC<SmartSolutionModalProps> = ({
  isOpen,
  pendingApproval,
  onConfirm,
  onCancel,
  fromAsset,
  toAsset,
  swapAmount,
  swapValueUSD
}) => {
  // State for DEX selection in the CompactDEX component
  const [selectedDEX, setSelectedDEX] = useState<string | null>(null);
  // Format text with numbers (keeping the existing utility function logic)
  const formatTextWithNumbers = (text: string): string => {
    return text.replace(/\b(\d+(?:\.\d+)?)\b/g, (match) => {
      const num = parseFloat(match);
      return num >= 1000000 ? (num / 1000000).toFixed(1) + 'M' :
             num >= 1000 ? (num / 1000).toFixed(1) + 'K' :
             match;
    });
  };

  // Format number utility
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // REMOVED: Competing gas asset logic - Smart Solutions now generated correctly by core logic
  // No need for modal to "correct" already-correct solutions

  if (!isOpen || !pendingApproval) {
    return null;
  }

  // Trust the Smart Solutions from core logic - no correction needed

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onCancel}>
      <div className="bg-surface-1 border border-white/20 rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning-600/20 flex items-center justify-center">
              <Lightbulb size={20} className="text-warning-400" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary">Approve Smart Solution</h3>
          </div>
          <button
            className="w-8 h-8 rounded-full bg-surface-3 hover:bg-surface-2 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-text-primary mb-2">
              {formatTextWithNumbers(pendingApproval.title)}
            </h4>
            <p className="text-text-secondary leading-relaxed">
              {formatTextWithNumbers(pendingApproval.description)}
            </p>

            {/* Add helpful action explanation */}
            {(pendingApproval.id?.includes('use_balance_') || pendingApproval.type === 'deduct_from_swap') ? (
              <div className="mt-4 p-3 bg-success-600/10 border border-success-500/20 rounded-lg">
                <div className="text-sm text-success-300 font-medium mb-1">✅ Using Existing Balance:</div>
                <div className="text-xs text-text-secondary leading-relaxed">
                  HodlHut will automatically deduct the gas fee from your existing balance. No DEX trading required.
                </div>
              </div>
            ) : pendingApproval.type === 'auto_swap' && (
              <div className="mt-4 p-3 bg-success-600/10 border border-success-500/20 rounded-lg">
                <div className="text-sm text-success-300 font-medium mb-1">✨ HodlHut Will Handle This:</div>
                <div className="text-xs text-text-secondary leading-relaxed">
                  {pendingApproval.title.includes('Auto-Swap') &&
                    "Our DEXRoutingAgent will automatically execute the required swap in the background. No manual action needed."
                  }
                  {pendingApproval.title.includes('Deposit') && pendingApproval.title.includes('ICP Wallet') &&
                    "HodlHut will open your wallet interface to request the transfer. Simply approve when prompted."
                  }
                  {pendingApproval.title.includes('Chain Fusion') &&
                    "HodlHut will open the Chain Fusion interface with the exact amount and address. Just send from your external wallet."
                  }
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Cost Section: DEX selection only for actual swaps, not balance usage */}
          {(pendingApproval.type === 'auto_swap' || pendingApproval.type === 'swap_other_asset') && !pendingApproval.id?.includes('use_balance_') ? (
            <div className="bg-surface-2 rounded-xl p-4 mb-6">
              <div className="text-sm font-medium text-text-secondary mb-4">Optimal DEX for this Swap:</div>
              <OptimalDEXSelector
                selectedDEX={selectedDEX}
                setSelectedDEX={setSelectedDEX}
                dexData={DEX_OPTIONS_ENHANCED}
                fromAsset={fromAsset}
                toAsset={toAsset}
                swapAmount={swapAmount}
                swapValueUSD={swapValueUSD}
              />
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-text-secondary">You'll receive:</span>
                  <span className="text-sm font-semibold text-success-400">
                    {formatNumber(pendingApproval.userReceives.amount)} {pendingApproval.userReceives.asset}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            // Traditional cost breakdown for deposit-type solutions
            <div className="bg-surface-2 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-text-secondary">Cost:</span>
                <div className="text-right">
                  <div className="text-sm font-semibold text-error-400">
                    {formatNumber(parseFloat(pendingApproval.cost.amount))} {pendingApproval.cost.asset}
                  </div>
                  {pendingApproval.cost.description && (
                    <div className="text-xs text-text-muted mt-1">{pendingApproval.cost.description}</div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-text-secondary">You'll receive:</span>
                <span className="text-sm font-semibold text-success-400">
                  {formatNumber(pendingApproval.userReceives.amount)} {pendingApproval.userReceives.asset}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              className="flex-1 btn-secondary btn-text"
              onClick={onCancel}
            >
              See Other Options
            </button>
            <button
              className="flex-1 btn-primary btn-text"
              onClick={onConfirm}
            >
              {pendingApproval.type === 'auto_swap' ? 'Yes, Execute Automatically' : 'Yes, Proceed'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartSolutionModal;