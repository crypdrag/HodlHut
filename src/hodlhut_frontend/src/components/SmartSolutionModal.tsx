import React from 'react';
import { Lightbulb } from 'lucide-react';
import { SmartSolution } from '../../assets/master_swap_logic';

interface SmartSolutionModalProps {
  isOpen: boolean;
  pendingApproval: SmartSolution | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const SmartSolutionModal: React.FC<SmartSolutionModalProps> = ({
  isOpen,
  pendingApproval,
  onConfirm,
  onCancel
}) => {
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

  if (!isOpen || !pendingApproval) {
    return null;
  }

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
          </div>

          {/* Cost Breakdown */}
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

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              className="flex-1 btn-secondary btn-text"
              onClick={onCancel}
            >
              Decline
            </button>
            <button
              className="flex-1 btn-primary btn-text"
              onClick={onConfirm}
            >
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartSolutionModal;