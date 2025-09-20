import React from 'react';
import { Lock, CheckCircle } from 'lucide-react';
import { CompleteSwapAnalysis } from '../../assets/master_swap_logic';

export type AuthStep = 'authenticate' | 'confirming' | 'wallet_connect' | 'wallet_connecting' | 'executing' | 'success';

export interface TransactionStep {
  message: string;
  completed: boolean;
  current: boolean;
}

interface AuthenticationModalProps {
  isOpen: boolean;
  transactionData: CompleteSwapAnalysis | null;
  authStep: AuthStep;
  selectedWallet: string;
  selectedDEX: string;
  transactionSteps: TransactionStep[];
  onClose: () => void;
  onStepChange: (step: AuthStep) => void;
  onReset: () => void;
  onSetTransactionSteps: (steps: TransactionStep[]) => void;
}

const AuthenticationModal: React.FC<AuthenticationModalProps> = ({
  isOpen,
  transactionData,
  authStep,
  selectedWallet,
  selectedDEX,
  transactionSteps,
  onClose,
  onStepChange,
  onReset,
  onSetTransactionSteps
}) => {
  // Format amount utility (keeping existing logic)
  const formatAmount = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(4);
  };

  if (!isOpen || !transactionData) {
    return null;
  }

  const handleAuthenticate = () => {
    onStepChange('confirming');

    setTimeout(() => {
      onStepChange('wallet_connect');
    }, 1500);
  };

  const handleWalletConnect = (wallet: string) => {
    onStepChange('wallet_connecting');

    setTimeout(() => {
      onStepChange('executing');

      // Initialize transaction steps
      onSetTransactionSteps([
        { message: `MyHut Fees (0.1%) extracted`, completed: false, current: true },
        { message: `SWAP ${transactionData?.fromAsset}→${transactionData?.toAsset} ${selectedDEX || 'ICPSwap'}`, completed: false, current: false },
        { message: `${selectedDEX || 'ICPSwap'} 0.3% Fee extracted`, completed: false, current: false },
        { message: `Sending ${transactionData?.toAsset}+ckETH (gas) to ICP EVM RPC`, completed: false, current: false },
        { message: `Ethereum transaction confirmation`, completed: false, current: false }
      ]);

      // Start executing transaction steps (simplified simulation)
      setTimeout(() => onStepChange('success'), 5000);
    }, 2000);
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        {authStep === 'authenticate' && (
          <>
            <div className="auth-modal-header">
              <h3 className="auth-modal-title">Authenticate Internet Identity to Perform Transaction</h3>
              <button
                className="modal-close-btn"
                onClick={onClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="auth-modal-content">
              <div className="transaction-preview">
                <h4>Transaction Summary</h4>

                <div className="swap-details">
                  <div className="swap-from-to">
                    <div className="swap-asset">
                      <span className="asset-amount">{formatAmount(transactionData.amount)}</span>
                      <span className="text-lg font-semibold text-text-primary mb-2">{transactionData.fromAsset}</span>
                    </div>
                    <div className="swap-arrow">→</div>
                    <div className="swap-asset">
                      <span className="asset-amount">{formatAmount(transactionData.outputAmount)}</span>
                      <span className="text-lg font-semibold text-text-primary mb-2">{transactionData.toAsset}</span>
                    </div>
                  </div>

                  <div className="swap-route-info">
                    <div className="route-item">
                      <span>Route:</span>
                      <span>{transactionData.route.operationType}</span>
                    </div>
                    <div className="route-item">
                      <span>DEX:</span>
                      <span>{selectedDEX || 'ICPSwap'}</span>
                    </div>
                    <div className="route-item">
                      <span>Estimated Time:</span>
                      <span>{transactionData.route.estimatedTime}</span>
                    </div>
                    <div className="route-item">
                      <span>Total Fees:</span>
                      <span>${transactionData.totalFeesUSD.toFixed(2)}</span>
                    </div>
                    <div className="route-item">
                      <span>Price Impact:</span>
                      <span>{transactionData.priceImpact.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                <div className="auth-actions">
                  <button
                    className="btn btn-approve auth-btn"
                    onClick={handleAuthenticate}
                  >
                    🔐 Authenticate with Internet Identity
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {authStep === 'confirming' && (
          <div className="auth-modal-content">
            <div className="transaction-status">
              <div className="status-icon spinning"><Lock className="w-12 h-12 text-primary-400" /></div>
              <h3>Authenticating...</h3>
              <p>Please complete the Internet Identity authentication in the popup window.</p>
            </div>
          </div>
        )}

        {authStep === 'wallet_connect' && (
          <div className="auth-modal-content">
            <div className="wallet-selection">
              <h3>Select Wallet for Transaction</h3>
              <p>Choose your preferred wallet to complete the swap</p>

              <div className="wallet-options">
                <button
                  className={`wallet-option ${selectedWallet === 'Internet Identity' ? 'selected' : ''}`}
                  onClick={() => handleWalletConnect('Internet Identity')}
                >
                  <div className="wallet-icon">🆔</div>
                  <span>Internet Identity</span>
                  <span className="recommended-badge">Recommended</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {authStep === 'executing' && (
          <div className="auth-modal-content">
            <div className="transaction-execution">
              <h3>Executing Transaction</h3>
              <p className="execution-subtitle">Processing your {transactionData.fromAsset} → {transactionData.toAsset} swap</p>

              <div className="transaction-steps">
                {transactionSteps.map((step, index) => (
                  <div key={index} className={`step ${step.completed ? 'completed' : ''} ${step.current ? 'current' : ''}`}>
                    <div className="step-icon">
                      {step.completed ? <CheckCircle className="w-4 h-4 text-success-400" /> :
                       step.current ? <div className="spinner"></div> :
                       <div className="step-number">{index + 1}</div>}
                    </div>
                    <span className="step-message">{step.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {authStep === 'success' && (
          <div className="auth-modal-content">
            <div className="transaction-success">
              <div className="success-icon">
                <CheckCircle className="w-16 h-16 text-success-400" />
              </div>
              <h3>Transaction Complete!</h3>
              <p>Your swap has been executed successfully.</p>

              <div className="swap-summary">
                <div className="summary-row">
                  <span>Swapped:</span>
                  <span><strong>{formatAmount(transactionData.amount)} {transactionData.fromAsset}</strong></span>
                </div>
                <div className="summary-row">
                  <span>Received:</span>
                  <span><strong>{formatAmount(transactionData.outputAmount)} {transactionData.toAsset}</strong></span>
                </div>
                <div className="summary-row">
                  <span>Total fees:</span>
                  <span><strong>${transactionData.totalFeesUSD.toFixed(2)}</strong></span>
                </div>
                <div className="summary-row">
                  <span>Via:</span>
                  <span><strong>{selectedDEX || 'ICPSwap'} + Ethereum</strong></span>
                </div>
              </div>
            </div>

            <div className="success-actions">
              <button
                className="btn btn-approve success-btn"
                onClick={handleReset}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Continue Trading
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthenticationModal;