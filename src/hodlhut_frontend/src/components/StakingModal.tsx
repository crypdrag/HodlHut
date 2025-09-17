import React, { useState, useEffect } from 'react';
import { X, Rocket, Star, TrendingUp } from 'lucide-react';
import AssetIcon from './AssetIcon';
import { MASTER_ASSETS } from '../../assets/master_asset_data';

interface StakingModalProps {
  isOpen: boolean;
  selectedAsset: string | null;
  portfolio: { [key: string]: number };
  stakedAmounts: { [key: string]: number };
  onClose: () => void;
  onStakingConfirmation: (asset: string, amount: number) => void;
}

const StakingModal: React.FC<StakingModalProps> = ({
  isOpen,
  selectedAsset,
  portfolio,
  stakedAmounts,
  onClose,
  onStakingConfirmation
}) => {
  const [stakingAmount, setStakingAmount] = useState('');

  // Clear input field when switching assets or modal closes
  useEffect(() => {
    if (!isOpen) {
      // Clear field when modal closes
      setStakingAmount('');
    }
  }, [isOpen, selectedAsset]);

  // Format amount utility (keeping existing logic)
  const formatAmount = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(4);
  };

  // Calculate diversity multiplier for staking benefits display
  const calculateDiversityMultiplier = () => {
    const assetsList = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'];
    const assetsWithBalance = assetsList.filter(asset => portfolio[asset] && portfolio[asset] > 0);
    const stakedCount = assetsWithBalance.filter(asset => stakedAmounts[asset] > 0).length;
    const multipliers = [1.0, 1.5, 2.0, 2.25, 2.5, 2.5]; // 3.00%, 4.50%, 6.00%, 6.75%, 7.50% (max)
    return multipliers[Math.min(stakedCount, multipliers.length - 1)];
  };

  // Render staking benefits display
  const renderStakingBenefits = () => {
    if (!selectedAsset) return null;

    const baseAPY = 3.0; // Base APY percentage
    const multiplier = calculateDiversityMultiplier();
    const boostedAPY = baseAPY * multiplier;

    return (
      <div className="bg-success-950/30 border border-success-800/50 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-success-400" />
          <span className="text-sm font-medium text-success-400">Staking Benefits</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Base APY</span>
            <span className="text-text-primary">{baseAPY}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Diversity Multiplier</span>
            <span className="text-success-400">{multiplier.toFixed(2)}x</span>
          </div>
          <div className="border-t border-white/10 pt-2">
            <div className="flex justify-between text-base font-semibold">
              <span className="text-text-primary">Total APY</span>
              <span className="text-success-400">{boostedAPY.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render diversity boost notice for first-time stakers
  const renderDiversityBoostNotice = () => {
    const assetsList = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'];
    const assetsWithBalance = assetsList.filter(asset => portfolio[asset] && portfolio[asset] > 0);
    const currentlyStakedCount = assetsWithBalance.filter(asset => stakedAmounts[asset] > 0).length;
    const willBeStaking = selectedAsset && stakedAmounts[selectedAsset] === 0;

    if (!willBeStaking || currentlyStakedCount >= 5) return null;

    const newStakedCount = currentlyStakedCount + 1;
    const multipliers = [1.0, 1.5, 2.0, 2.25, 2.5, 2.5];
    const nextMultiplier = multipliers[Math.min(newStakedCount, multipliers.length - 1)];

    return (
      <div className="bg-warning-950/30 border border-warning-800/50 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-5 h-5 text-warning-400" />
          <span className="text-sm font-medium text-warning-400">Diversity Bonus!</span>
        </div>
        <p className="text-sm text-text-secondary mb-2">
          This is your {currentlyStakedCount === 0 ? 'first' : `${newStakedCount}${newStakedCount === 2 ? 'nd' : newStakedCount === 3 ? 'rd' : 'th'}`} staked asset.
          Your APY multiplier will increase to <span className="text-warning-400 font-semibold">{nextMultiplier.toFixed(2)}x</span>!
        </p>
        <p className="text-xs text-text-muted">
          Stake more diverse assets to unlock higher multipliers (max 2.5x with 5+ assets).
        </p>
      </div>
    );
  };

  const handleStakeClick = () => {
    const amount = parseFloat(stakingAmount);

    if (amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!selectedAsset || amount > (portfolio[selectedAsset] || 0)) {
      alert('Insufficient balance');
      return;
    }

    onStakingConfirmation(selectedAsset, amount);
  };

  const handleClose = () => {
    setStakingAmount('');
    onClose();
  };

  const setPercentageAmount = (percentage: number) => {
    if (selectedAsset) {
      const amount = (portfolio[selectedAsset] || 0) * percentage;
      setStakingAmount(amount.toString());
    }
  };

  const setMaxAmount = () => {
    if (selectedAsset) {
      setStakingAmount((portfolio[selectedAsset] || 0).toString());
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
            Stake {selectedAsset}
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
            Available Balance
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {formatAmount(portfolio[selectedAsset] || 0)} {selectedAsset}
          </div>
          <div className="text-sm text-text-muted">
            ~${formatAmount((portfolio[selectedAsset] || 0) * (MASTER_ASSETS[selectedAsset]?.price || 0))}
          </div>
        </div>

        {/* Staking Amount Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Amount to Stake
          </label>
          <div className="relative">
            <input
              type="number"
              placeholder="0.0"
              className="w-full px-4 py-3 bg-surface-2 border border-white/10 rounded-xl text-text-primary focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              step="any"
              min="0"
              max={portfolio[selectedAsset] || 0}
              value={stakingAmount}
              onChange={(e) => setStakingAmount(e.target.value)}
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium bg-primary-600 hover:bg-primary-500 text-on-primary rounded-lg transition-colors"
              onClick={setMaxAmount}
            >
              MAX
            </button>
          </div>
        </div>

        {/* Quick Amount Buttons */}
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

        {/* Staking Benefits */}
        {renderStakingBenefits()}

        {/* Diversity Boost Notice */}
        {renderDiversityBoostNotice()}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            className="flex-1 btn-secondary py-3"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            className="flex-1 btn-primary py-3"
            onClick={handleStakeClick}
          >
            <Rocket className="w-4 h-4 mr-2" />
            Stake {selectedAsset}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StakingModal;