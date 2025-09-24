import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Circle, AlertTriangle, Clock } from 'lucide-react';
import { CompleteSwapAnalysis } from '../../assets/master_swap_logic';
import ResultIndicator from './ResultIndicator';

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  estimatedTime?: string;
}

interface ExecutionProgressModalProps {
  isOpen: boolean;
  transactionData: CompleteSwapAnalysis | null;
  onClose: () => void;
  onComplete: () => void;
}

const ExecutionProgressModal: React.FC<ExecutionProgressModalProps> = ({
  isOpen,
  transactionData,
  onClose,
  onComplete
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<ProgressStep[]>([]);

  // Initialize steps based on transaction type
  useEffect(() => {
    if (!transactionData) return;

    const isICPOnly = !transactionData.isL1Withdrawal;
    const isCrossChain = transactionData.route.isCrossChain;

    let progressSteps: ProgressStep[] = [];

    if (isICPOnly) {
      // Simple ICP-only swap
      progressSteps = [
        {
          id: 'dex_swap',
          title: 'Executing DEX Swap',
          description: `Swapping ${transactionData.fromAsset} to ${transactionData.toAsset} on ${transactionData.selectedDEX || 'DEX'}`,
          status: 'pending',
          estimatedTime: '5-15 seconds'
        },
        {
          id: 'confirmation',
          title: 'Transaction Complete',
          description: 'Swap confirmed and tokens transferred to your wallet',
          status: 'pending'
        }
      ];
    } else if (isCrossChain) {
      // Complex cross-chain operation - transaction-specific steps
      const bridgeToken = getBridgeToken(transactionData.toAsset);
      const destinationNetwork = getDestinationNetwork(transactionData.toAsset);

      // Check if DEX swap is actually needed (only if fromAsset != bridge token)
      const needsDEXSwap = transactionData.fromAsset !== bridgeToken;

      progressSteps = [];

      // Only add DEX swap step if actually needed
      if (needsDEXSwap) {
        progressSteps.push({
          id: 'dex_swap',
          title: 'DEX Swapping',
          description: `${transactionData.fromAsset} → ${bridgeToken}`,
          status: 'pending',
          estimatedTime: '10-20 seconds'
        });
      }

      // Add chain fusion steps
      progressSteps.push(
        {
          id: 'chain_fusion_preparation',
          title: 'Sending to Chain Fusion',
          description: `Sending ${bridgeToken} to Chain Fusion`,
          status: 'pending',
          estimatedTime: '30-60 seconds'
        },
        {
          id: 'chain_fusion_execution',
          title: `Sending to ${destinationNetwork}`,
          description: `Sending ${transactionData.toAsset} to ${destinationNetwork}`,
          status: 'pending',
          estimatedTime: '2-5 minutes'
        },
        {
          id: 'transaction_complete',
          title: 'Transaction Complete',
          description: `${transactionData.toAsset} delivered to your wallet`,
          status: 'pending'
        }
      );
    }

    setSteps(progressSteps);
    setCurrentStepIndex(0);
  }, [transactionData]);

  // Simulate progress for demo (in production, this would be driven by real transaction events)
  useEffect(() => {
    if (!isOpen || steps.length === 0) return;

    const executeSteps = async () => {
      for (let i = 0; i < steps.length; i++) {
        // Mark current step as in progress
        setSteps(prev => prev.map((step, index) => ({
          ...step,
          status: index === i ? 'in_progress' : index < i ? 'completed' : 'pending'
        })));
        setCurrentStepIndex(i);

        // Simulate step duration (in production, wait for real events)
        const stepDuration = i === 0 ? 3000 : i === 1 ? 8000 : 2000; // Different durations for different steps
        await new Promise(resolve => setTimeout(resolve, stepDuration));

        // Mark step as completed
        setSteps(prev => prev.map((step, index) => ({
          ...step,
          status: index <= i ? 'completed' : 'pending'
        })));
      }

      // All steps completed - show completion UI (user clicks "Done" to dismiss)
    };

    executeSteps();
  }, [isOpen, steps.length]);

  // Format amount utility
  const formatAmount = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(4);
  };

  // Helper function to get bridge token (the ICP-native token that bridges to L1)
  const getBridgeToken = (toAsset: string): string => {
    switch (toAsset) {
      case 'BTC': return 'ckBTC';
      case 'ETH': return 'ckETH';
      case 'USDC': return 'ckUSDC';
      case 'USDT': return 'ckUSDT';
      default: return `ck${toAsset}`;
    }
  };

  // Helper function to get destination network name
  const getDestinationNetwork = (toAsset: string): string => {
    switch (toAsset) {
      case 'BTC': return 'Bitcoin';
      case 'ETH':
      case 'USDC':
      case 'USDT': return 'Ethereum';
      default: return 'Network';
    }
  };

  if (!isOpen || !transactionData) {
    return null;
  }

  const allCompleted = steps.every(step => step.status === 'completed');
  const hasFailure = steps.some(step => step.status === 'failed');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface-1 border border-white/20 rounded-2xl max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-600/20 flex items-center justify-center">
              {allCompleted ? (
                <CheckCircle size={20} className="text-success-400" />
              ) : hasFailure ? (
                <AlertTriangle size={20} className="text-error-400" />
              ) : (
                <Clock size={20} className="text-primary-400" />
              )}
            </div>
            <h3 className="text-xl font-semibold text-text-primary">
              {allCompleted ? 'Transaction Complete' : hasFailure ? 'Transaction Failed' : 'Executing Transaction'}
            </h3>
          </div>
          {allCompleted && (
            <button
              className="w-8 h-8 rounded-full bg-surface-3 hover:bg-surface-2 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className={allCompleted ? "p-4" : "p-6"}>
          {/* Transaction Overview - Mobile Optimized */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 ${allCompleted ? "mb-3" : "mb-4"}`}>
            <div className="bg-surface-2 rounded-lg p-2 sm:p-3">
              <div className="text-xs font-medium text-text-muted mb-1">From</div>
              <div className="text-sm font-semibold text-text-primary">
                {formatAmount(transactionData.amount)} {transactionData.fromAsset}
              </div>
            </div>
            <div className="bg-surface-2 rounded-lg p-2 sm:p-3">
              <div className="text-xs font-medium text-text-muted mb-1">To</div>
              <div className="text-sm font-semibold text-text-primary">
                {formatAmount(transactionData.outputAmount)} {transactionData.toAsset}
              </div>
            </div>
          </div>

          {/* Progress Steps - Hide detailed steps when completed for mobile optimization */}
          {!allCompleted && (
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-start gap-4">
                  {/* Step Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {step.status === 'completed' ? (
                      <CheckCircle size={20} className="text-success-400" />
                    ) : step.status === 'in_progress' ? (
                      <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                    ) : step.status === 'failed' ? (
                      <AlertTriangle size={20} className="text-error-400" />
                    ) : (
                      <Circle size={20} className="text-text-muted" />
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`font-semibold ${
                        step.status === 'completed' ? 'text-success-400' :
                        step.status === 'in_progress' ? 'text-primary-400' :
                        step.status === 'failed' ? 'text-error-400' :
                        'text-text-muted'
                      }`}>
                        {step.title}
                      </h4>
                      {step.estimatedTime && step.status === 'in_progress' && (
                        <span className="text-xs text-text-secondary">
                          {step.estimatedTime}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary">
                      {step.description}
                    </p>

                    {/* Progress Bar for Active Step */}
                    {step.status === 'in_progress' && (
                      <div className="mt-3">
                        <div className="w-full bg-surface-3 rounded-full h-2">
                          <div className="bg-primary-500 h-2 rounded-full animate-pulse" style={{width: '45%'}}></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Completion Message with SIMULATED/REAL indicator - Moved up right after TO container when completed */}
          {allCompleted && (
            <div className="mt-4">
              <ResultIndicator
                transactionId={`tx_${Date.now()}_swap_${transactionData.fromAsset}_${transactionData.toAsset}`}
                receivedAmount={transactionData.outputAmount?.toString() || '0'}
                assetSymbol={transactionData.toAsset}
              />
            </div>
          )}

          {/* Failure Message */}
          {hasFailure && (
            <div className="mt-6 p-4 bg-error-600/10 border border-error-500/20 rounded-xl">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-error-400" />
                <span className="text-sm font-semibold text-error-400">
                  Transaction failed
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Please try again or contact support if the issue persists.
              </p>
            </div>
          )}

          {/* Action Button */}
          {allCompleted && (
            <div className="mt-4">
              <button
                className="w-full btn-success btn-text"
                onClick={onComplete}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExecutionProgressModal;