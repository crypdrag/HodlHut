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
    <div className="modal-overlay" onClick={onCancel}>
      <div className="smart-solution-modal" onClick={(e) => e.stopPropagation()}>
        <div className="smart-solution-header">
          <div className="smart-solution-icon">
            <Lightbulb size={24} color="#f1760f" />
          </div>
          <h3 className="smart-solution-title">Approve Smart Solution</h3>
          <button
            className="modal-close-btn"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="smart-solution-content">
          <div className="solution-details">
            <h4>{formatTextWithNumbers(pendingApproval.title)}</h4>
            <p className="solution-description">{formatTextWithNumbers(pendingApproval.description)}</p>

            <div className="solution-breakdown">
              <div className="cost-item">
                <span className="label">Cost:</span>
                <span className="value cost">
                  {formatNumber(parseFloat(pendingApproval.cost.amount))} {pendingApproval.cost.asset}
                  {pendingApproval.cost.description && (
                    <div className="cost-description">{pendingApproval.cost.description}</div>
                  )}
                </span>
              </div>
              <div className="receive-item">
                <span className="label">You'll receive:</span>
                <span className="value receive">
                  {formatNumber(pendingApproval.userReceives.amount)} {pendingApproval.userReceives.asset}
                </span>
              </div>
            </div>
          </div>

          <div className="solution-actions">
            <button
              className="btn btn-decline"
              onClick={onCancel}
            >
              Decline
            </button>
            <button
              className="btn btn-approve"
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