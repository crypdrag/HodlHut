import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import AssetIcon from './AssetIcon';
import { MASTER_ASSETS } from '../../assets/master_asset_data';

interface UnstakingModalProps {
  isOpen: boolean;
  selectedAsset: string | null;
  portfolio: { [key: string]: number };
  stakedAmounts: { [key: string]: number };
  onClose: () => void;
  onUnstakingConfirmation: (asset: string, amount: number) => void;
}

const UnstakingModal: React.FC<UnstakingModalProps> = ({
  isOpen,
  selectedAsset,
  portfolio,
  stakedAmounts,
  onClose,
  onUnstakingConfirmation
}) => {
  const [unstakingAmount, setUnstakingAmount] = useState('');

  // Format amount utility (keeping existing logic)
  const formatAmount = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(4);
  };

  // Calculate diversity multiplier for impact analysis
  const calculateDiversityMultiplier = () => {
    const assetsList = ['ckBTC', 'ckETH', 'ckSOL', 'ckUSDC', 'ckUSDT', 'ICP'];
    const assetsWithBalance = assetsList.filter(asset => portfolio[asset] && portfolio[asset] > 0);
    const stakedCount = assetsWithBalance.filter(asset => stakedAmounts[asset] > 0).length;
    const multipliers = [1.0, 1.25, 1.5, 1.75, 2.0, 2.2];
    return multipliers[stakedCount] || 1.0;
  };

  // Render current position and unstaking impact analysis
  const renderUnstakingImpactAnalysis = () => {
    if (!selectedAsset) return null;

    const currentMultiplier = calculateDiversityMultiplier();
    const currentStaked = stakedAmounts[selectedAsset] || 0;
    const assetPrice = MASTER_ASSETS[selectedAsset]?.price || 0;
    const currentWeeklyYield = currentStaked * assetPrice * 0.05 * currentMultiplier;

    return (
      <div className="bg-surface-2 border border-white/10 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-medium text-text-primary mb-3">Current Position</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-text-secondary">Staked Amount</span>
            <span className="text-text-primary font-medium">{formatAmount(currentStaked)} {selectedAsset}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Current APY</span>
            <span className="text-success-400 font-medium">{(8.5 * currentMultiplier).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Diversity Multiplier</span>
            <span className="text-warning-400 font-medium">{currentMultiplier.toFixed(2)}x</span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-2 font-medium">
            <span className="text-text-primary">Weekly Yield</span>
            <span className="text-success-400">${currentWeeklyYield.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  const handleUnstakeClick = () => {
    const amount = parseFloat(unstakingAmount);

    if (amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!selectedAsset || amount > (stakedAmounts[selectedAsset] || 0)) {
      alert('Insufficient staked balance');
      return;
    }

    onUnstakingConfirmation(selectedAsset, amount);
  };

  const handleClose = () => {
    setUnstakingAmount('');
    onClose();
  };

  const setPercentageAmount = (percentage: number) => {
    if (selectedAsset) {
      const amount = (stakedAmounts[selectedAsset] || 0) * percentage;
      setUnstakingAmount(amount.toString());
    }
  };

  const setAllAmount = () => {
    if (selectedAsset) {
      setUnstakingAmount((stakedAmounts[selectedAsset] || 0).toString());
    }
  };

  if (!isOpen || !selectedAsset) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-overlay-1 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-1 rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="heading-3 text-text-primary m-0">
            Manage {selectedAsset}
          </h2>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-2 text-text-secondary hover:bg-surface-3 transition-colors"
            onClick={handleClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Asset Info */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-surface-2 rounded-full">
            <AssetIcon asset={selectedAsset} size={40} />
          </div>
          <div className="text-sm text-text-secondary mb-2">
            Currently Staked
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {formatAmount(stakedAmounts[selectedAsset] || 0)} {selectedAsset}
          </div>
          <div className="text-sm text-text-muted">
            ~${formatAmount((stakedAmounts[selectedAsset] || 0) * (MASTER_ASSETS[selectedAsset]?.price || 0))}
          </div>
        </div>

        {/* Unstaking Amount Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Amount to Unstake
          </label>
          <div className="relative">
            <input
              type="number"
              placeholder="0.0"
              className="w-full px-4 py-3 bg-surface-2 border border-white/10 rounded-xl text-text-primary focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              step="any"
              min="0"
              max={stakedAmounts[selectedAsset] || 0}
              value={unstakingAmount}
              onChange={(e) => setUnstakingAmount(e.target.value)}
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium bg-primary-600 hover:bg-primary-500 text-on-primary rounded-lg transition-colors"
              onClick={setAllAmount}
            >
              ALL
            </button>
          </div>
        </div>

        {/* Quick Unstaking Buttons */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[0.25, 0.5, 0.75, 1].map((percentage) => (
            <button
              key={percentage}
              className="px-3 py-2 text-xs font-medium bg-surface-2 hover:bg-surface-3 text-text-secondary hover:text-text-primary border border-white/10 rounded-lg transition-all"
              onClick={() => setPercentageAmount(percentage)}
            >
              {percentage === 1 ? '100%' : `${Math.round(percentage * 100)}%`}
            </button>
          ))}
        </div>

        {/* Impact Analysis */}
        {renderUnstakingImpactAnalysis()}

        {/* Warning Notice */}
        <div className="bg-error-400/10 border border-error-400/20 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-error-400" />
            <span className="text-sm font-medium text-error-300">Unstaking Notice</span>
          </div>
          <p className="text-xs text-error-200">
            Unstaking will immediately stop yield generation for the withdrawn amount. Consider partial unstaking to maintain some rewards.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            className="flex-1 btn-secondary py-3"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            className="flex-1 btn-error py-3"
            onClick={handleUnstakeClick}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Unstake {selectedAsset}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnstakingModal;