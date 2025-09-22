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
        description: 'Demo transaction - not executed on blockchain'
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
    <div className={`rounded-xl border p-4 ${styles.container}`}>
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${styles.badge}`}>
          {styles.icon}
          <span className="text-xs font-bold tracking-wide">{styles.label}</span>
        </div>

        {!actuallyReal && (
          <div className="flex items-center gap-1 text-warning-400">
            <AlertTriangle size={14} />
            <span className="text-xs font-medium">Demo Mode</span>
          </div>
        )}
      </div>

      {/* Transaction Details */}
      {transactionId && (
        <div className="mb-3">
          <div className="text-xs font-medium text-text-muted mb-1">
            {actuallyReal ? 'Transaction ID' : 'Demo Transaction ID'}
          </div>
          <div className="text-sm font-mono text-text-primary bg-surface-2 px-3 py-2 rounded-lg">
            {transactionId}
          </div>
        </div>
      )}

      {/* Received Amount */}
      {receivedAmount && assetSymbol && (
        <div className="mb-3">
          <div className="text-xs font-medium text-text-muted mb-1">
            {actuallyReal ? 'Amount Received' : 'Simulated Amount'}
          </div>
          <div className="text-lg font-semibold text-text-primary">
            {receivedAmount} {assetSymbol}
          </div>
        </div>
      )}

      {/* Additional Details */}
      {details && (
        <div className="mb-3">
          <div className="text-sm text-text-secondary">
            {details}
          </div>
        </div>
      )}

      {/* Status Description */}
      <div className="text-xs text-text-secondary italic">
        {styles.description}
      </div>

      {/* Development Warning */}
      {!actuallyReal && (
        <div className="mt-3 p-3 bg-warning-600/10 border border-warning-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-warning-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-warning-300">
              <strong>Development Notice:</strong> This is a simulated transaction for testing purposes.
              No real assets have been transferred or fees charged.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultIndicator;