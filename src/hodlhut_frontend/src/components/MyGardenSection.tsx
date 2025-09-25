import React from 'react';
import {
  TrendingUp,
  DollarSign,
  Clock,
  Target,
  Trophy,
  ChevronDown,
  Plus
} from 'lucide-react';
import AssetIcon from './AssetIcon';
import { Portfolio, MASTER_ASSETS } from '../../assets/master_asset_data';

interface MyGardenSectionProps {
  portfolio: Portfolio;
  stakedAmounts: Record<string, number>;
  pendingStaking: Set<string>;
  expandedAssets: Set<string>;
  claimedAssets: Set<string>;
  sparklingAssets: Set<string>;
  statsExpanded: boolean;
  setExpandedAssets: (assets: Set<string>) => void;
  setStatsExpanded: (expanded: boolean) => void;
  handleClaimYield: (asset: string) => void;
  openStakingModal: (asset: string) => void;
  openUnstakingModal: (asset: string) => void;
  formatAmount: (amount: number) => string;
  openConsolidatedModal?: () => void;
}

const MyGardenSection: React.FC<MyGardenSectionProps> = ({
  portfolio,
  stakedAmounts,
  pendingStaking,
  expandedAssets,
  claimedAssets,
  sparklingAssets,
  statsExpanded,
  setExpandedAssets,
  setStatsExpanded,
  handleClaimYield,
  openStakingModal,
  openUnstakingModal,
  formatAmount,
  openConsolidatedModal
}) => {
  // Use same asset filtering as Portfolio Overview - only swappable assets with balance > 0
  const fromAssets = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'];
  const assetsWithBalance = fromAssets.filter(asset => portfolio[asset] && portfolio[asset] > 0);
  const stakedAssets = assetsWithBalance.filter(asset => stakedAmounts[asset] > 0);

  const calculateTotalYield = () => {
    let totalYield = 0;
    assetsWithBalance.forEach(asset => {
      const staked = stakedAmounts[asset] || 0;
      const assetPrice = MASTER_ASSETS[asset]?.price || 0;
      const diversityMultiplier = calculateDiversityMultiplier();
      totalYield += staked * assetPrice * (3.0/100/52) * diversityMultiplier; // 3.0% annual yield with multiplier
    });
    return totalYield;
  };

  const calculateDiversityMultiplier = () => {
    const stakedCount = assetsWithBalance.filter(asset => stakedAmounts[asset] > 0).length;
    const multipliers = [1.0, 1.5, 2.0, 2.25, 2.5, 2.5];
    return multipliers[stakedCount] || 1.0;
  };

  const getNextMultiplier = () => {
    const stakedCount = assetsWithBalance.filter(asset => stakedAmounts[asset] > 0).length;
    const multipliers = [1.0, 1.5, 2.0, 2.25, 2.5, 2.5];
    return multipliers[stakedCount + 1] || 2.5;
  };

  const getDiversityProgress = () => {
    const stakedCount = assetsWithBalance.filter(asset => stakedAmounts[asset] > 0).length;
    const totalAssets = assetsWithBalance.length;
    return (stakedCount / totalAssets) * 100;
  };

  const renderStakedAssetRow = (asset: string) => {
    const staked = stakedAmounts[asset] || 0;
    const isPending = pendingStaking.has(asset);
    const assetPrice = MASTER_ASSETS[asset]?.price || 0;

    // Calculate individual asset multiplier based on staking order
    const stakedAssetsList = assetsWithBalance.filter(a => stakedAmounts[a] > 0);
    const assetIndex = stakedAssetsList.indexOf(asset);
    const multipliers = [1.0, 1.5, 2.0, 2.25, 2.5, 2.5];
    const individualMultiplier = multipliers[assetIndex] || 1.0;

    const weeklyYield = staked * assetPrice * (3.0/100/52) * individualMultiplier;
    const canClaim = !claimedAssets.has(asset) && !isPending;

    return (
      <div key={asset} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-surface-2 border border-white/10 rounded-xl hover:bg-surface-3 transition-colors">
        {/* Mobile: Stacked Layout | Desktop: Horizontal Layout */}

        {/* Row 1: Asset Icon & Info (Full width on mobile) */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-surface-3 rounded-lg flex-shrink-0">
            <AssetIcon asset={asset} size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm sm:text-base font-semibold text-text-primary">{asset}</div>
            <div className="text-xs sm:text-sm text-text-secondary truncate">
              {formatAmount(staked)} staked
            </div>
          </div>
        </div>

        {/* Row 2 Mobile: Yield Info | Desktop: Right-aligned yield */}
        <div className="flex items-center justify-between sm:justify-end sm:text-right sm:min-w-[140px]">
          <div className="sm:hidden">
            <div className="text-xs sm:text-sm font-semibold text-success-400">
              ${weeklyYield.toFixed(2)}/week
            </div>
            <div className="text-xs text-text-secondary">
              {((weeklyYield * 52 / (staked * assetPrice)) * 100).toFixed(1)}% APY
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-success-400">
              ${weeklyYield.toFixed(2)}/week
            </div>
            <div className="text-sm text-text-secondary">
              {((weeklyYield * 52 / (staked * assetPrice)) * 100).toFixed(1)}% APY
            </div>
          </div>

          {/* Row 2 Mobile: Action Buttons | Desktop: Right-aligned buttons */}
          <div className="flex gap-2 sm:ml-4">
            <button
              className={`px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-lg transition-colors min-h-[44px] min-w-[60px] sm:min-w-[70px] ${
                canClaim
                  ? sparklingAssets.has(asset)
                    ? 'bg-success-600 text-white animate-pulse'
                    : 'bg-success-500 hover:bg-success-400 text-white'
                  : 'bg-surface-3 text-text-muted cursor-not-allowed'
              }`}
              onClick={() => canClaim && handleClaimYield(asset)}
              disabled={!canClaim}
            >
              {claimedAssets.has(asset) ? '✓' : 'Claim'}
            </button>
            <button
              className="px-2 sm:px-3 py-2 text-xs sm:text-sm bg-surface-3 hover:bg-surface-2 text-text-secondary hover:text-text-primary rounded-lg transition-colors min-h-[44px] min-w-[60px] sm:min-w-[70px]"
              onClick={() => openUnstakingModal(asset)}
              disabled={isPending}
            >
              Manage
            </button>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="space-y-0">
      {/* Diversity Multiplier Indicator - Sticky */}
      <div className="diversity-multiplier-bar">
        <div className="diversity-multiplier-content">
          <div className="diversity-multiplier-left">
            <div className="diversity-multiplier-icon">
              🌱
            </div>
            <div className="diversity-multiplier-text">
              <div className="diversity-multiplier-current">
                {calculateDiversityMultiplier()}x Active
              </div>
              <div className="diversity-multiplier-label">
                Diversity Multiplier
              </div>
            </div>
          </div>
          <div className="diversity-multiplier-right">
            <div className="diversity-multiplier-next">
              Next: {getNextMultiplier()}x
            </div>
            <div className="diversity-progress">
              <div
                className="diversity-progress-fill"
                style={{ width: `${getDiversityProgress()}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Garden Content Container */}
      <div className="rounded-2xl border border-white/10 bg-surface-1 p-4 md:p-6">
        {/* Garden Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-3">My Garden</h1>
          <p className="text-text-secondary mb-4">Hodl Longevity & Asset Diversity Rewards</p>

          {/* Stake Assets Button - Only show when no assets are staked */}
          {openConsolidatedModal && stakedAssets.length === 0 && (
            <button
              onClick={openConsolidatedModal}
              className="btn-success py-3 px-6 text-base font-semibold"
            >
              Stake Assets
            </button>
          )}
        </div>

        {/* Staked Portfolio */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-text-primary">🪴 Staked Assets</h2>
            <div className="text-xs sm:text-sm text-text-secondary">
              {stakedAssets.length} of {assetsWithBalance.length} assets staked
            </div>
          </div>

          {stakedAssets.length > 0 ? (
            <div>
              <div className="space-y-2 sm:space-y-3 mb-4">
                {stakedAssets.map(asset => renderStakedAssetRow(asset))}
              </div>

              {/* Stake Assets Button - Only show when there are unstaked assets available */}
              {openConsolidatedModal && stakedAssets.length < assetsWithBalance.length && (
                <div className="text-center">
                  <button
                    onClick={openConsolidatedModal}
                    className="btn-success py-3 px-6 text-base font-semibold"
                  >
                    Stake More Assets
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 border border-dashed border-white/20 rounded-xl">
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🌱</div>
              <p className="text-sm sm:text-base text-text-secondary mb-2">No assets staked yet</p>
              <p className="text-xs sm:text-sm text-text-muted">Click "Stake Assets" above to get started</p>
            </div>
          )}
        </div>

        {/* Yield Stats - Collapsible (Moved below staking for better UX) */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-surface-1 overflow-hidden">
          <div className="p-4 sm:p-6 cursor-pointer hover:bg-surface-2 transition-colors" onClick={() => setStatsExpanded(!statsExpanded)}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm sm:text-base md:text-lg font-semibold text-text-primary mb-1 sm:mb-2">
                  Yield Stats
                </div>
                <div className="space-y-1 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-success-400">
                    ${calculateTotalYield().toFixed(0)}
                  </div>
                  <div className="text-xs sm:text-sm text-text-secondary">
                    +${(calculateTotalYield() * 0.1).toFixed(0)} this week
                  </div>
                </div>
              </div>
              <div className="ml-4 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-surface-3 hover:bg-surface-4 transition-colors">
                <ChevronDown
                  size={16}
                  className={`text-text-secondary transition-transform duration-200 ${statsExpanded ? 'rotate-180' : ''}`}
                />
              </div>
            </div>
          </div>

          {statsExpanded && (
            <div className="border-t border-white/10 bg-surface-1 animate-in slide-in-from-top-2 duration-200">
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <div className="text-center p-4 rounded-xl bg-surface-2 border border-white/5">
                    <div className="w-8 h-8 mx-auto mb-3 flex items-center justify-center rounded-lg bg-primary-500/10">
                      <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-primary-400" />
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-text-primary mb-1">
                      ${calculateTotalYield().toFixed(0)}
                    </div>
                    <div className="text-xs sm:text-sm text-text-secondary mb-1">
                      Total Garden Yield
                    </div>
                    <div className="text-xs text-text-muted">
                      This week: +${(calculateTotalYield() * 0.1).toFixed(0)}
                    </div>
                  </div>

                  <div className="text-center p-4 rounded-xl bg-surface-2 border border-white/5">
                    <div className="w-8 h-8 mx-auto mb-3 flex items-center justify-center rounded-lg bg-warning-500/10">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-warning-400" />
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-text-primary mb-1">42</div>
                    <div className="text-xs sm:text-sm text-text-secondary mb-1">
                      Average Hodl Days
                    </div>
                    <div className="text-xs text-text-muted">Longest: 127 days</div>
                  </div>

                  <div className="text-center p-4 rounded-xl bg-surface-2 border border-white/5">
                    <div className="w-8 h-8 mx-auto mb-3 flex items-center justify-center rounded-lg bg-success-500/10">
                      <Target className="w-4 h-4 sm:w-5 sm:h-5 text-success-400" />
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-text-primary mb-1">
                      {assetsWithBalance.filter(asset => stakedAmounts[asset] > 0).length}/6
                    </div>
                    <div className="text-xs sm:text-sm text-text-secondary mb-1">
                      Asset Diversity
                    </div>
                    <div className="text-xs text-text-muted">
                      {calculateDiversityMultiplier()}x multiplier active
                    </div>
                  </div>

                  <div className="text-center p-4 rounded-xl bg-surface-2 border border-white/5">
                    <div className="w-8 h-8 mx-auto mb-3 flex items-center justify-center rounded-lg bg-warning-500/10">
                      <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-warning-500" />
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-text-primary mb-1">
                      {calculateDiversityMultiplier()}x
                    </div>
                    <div className="text-xs sm:text-sm text-text-secondary mb-1">
                      Total Multiplier
                    </div>
                    <div className="text-xs text-text-muted">Next level: 15 days</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default MyGardenSection;