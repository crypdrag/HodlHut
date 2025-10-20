import React from 'react';
import { AlertTriangle, CheckCircle, Settings } from 'lucide-react';

interface ResultIndicatorProps {
  /** Whether this is showing a real production result */
  isReal?: boolean;
  /** Transaction ID to display */
  transactionId?: string;
  /** Received amount to display */
  receivedAmount?: string;
  /** Asset symbol */
  assetSymbol?: string;
  /** Additional details to show */
  details?: string;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

const ResultIndicator: React.FC<ResultIndicatorProps> = ({
  isReal,
  transactionId,
  receivedAmount,
  assetSymbol,
  details,
  compact = false
}) => {
  // Auto-detect environment if not explicitly specified
  const isProduction = process.env.NODE_ENV === 'production';
  const actuallyReal = isReal ?? isProduction;

  const getIndicatorStyles = () => {
    if (actuallyReal) {
      return {
        container: 'bg-success-600/15 border-success-500/30',
        badge: 'bg-success-500 text-success-50',
        icon: <CheckCircle size={16} className="text-success-400" />,
        label: 'REAL',
        description: 'Live transaction confirmed on blockchain'
      };
    } else {
      return {
        container: 'bg-warning-600/15 border-warning-500/30',
        badge: 'bg-warning-500 text-warning-900',
        icon: <Settings size={16} className="text-warning-400" />,
        label: 'SIMULATED',
        description: 'Transaction simulation completed'
      };
    }
  };

  const styles = getIndicatorStyles();

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${styles.container}`}>
        {styles.icon}
        <span className="text-xs font-semibold">{styles.label}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Demo TX ID Row - DEX compact style */}
      {transactionId && (
        <div className="dex-compact-row">
          <div className="dex-compact-left">
            <div className="dex-compact-info">
              <div className="dex-compact-name">Demo TX ID</div>
            </div>
          </div>
          <div className="dex-compact-right">
            <div className="text-right">
              <div className="text-xs font-mono text-text-primary code truncate max-w-[180px]">
                {transactionId}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Amount Row - DEX compact style */}
      {receivedAmount && assetSymbol && (
        <div className="dex-compact-row">
          <div className="dex-compact-left">
            <div className="dex-compact-info">
              <div className="dex-compact-name">Amount</div>
            </div>
          </div>
          <div className="dex-compact-right">
            <div className="text-right">
              <div className="body-sm font-bold text-success-400">
                {receivedAmount} {assetSymbol}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultIndicator;