import React from 'react';
import {
  TrendingUp,
  DollarSign,
  Clock,
  Target,
  Trophy,
  ChevronDown,
  Plus,
  X
} from 'lucide-react';
import AssetIcon from './AssetIcon';
import { Portfolio, MASTER_ASSETS } from '../../assets/master_asset_data';

interface ConsolidatedStakingModalProps {
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
  isOpen: boolean;
  onClose: () => void;
}

const ConsolidatedStakingModal: React.FC<ConsolidatedStakingModalProps> = ({
  portfolio,
  stakedAmounts,
  pendingStaking,
  expandedAssets,
  claimedAssets,
  sparklingAssets,
  setExpandedAssets,
  handleClaimYield,
  openStakingModal,
  openUnstakingModal,
  formatAmount,
  isOpen,
  onClose
}) => {
  // Wrapper functions to close this modal when opening individual modals
  const handleOpenStakingModal = (asset: string) => {
    onClose(); // Close consolidated modal first
    openStakingModal(asset); // Then open staking modal
  };

  const handleOpenUnstakingModal = (asset: string) => {
    onClose(); // Close consolidated modal first
    openUnstakingModal(asset); // Then open unstaking modal
  };
  // Use same asset filtering as original MyGardenSection
  const fromAssets = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'];
  const assetsWithBalance = fromAssets.filter(asset => portfolio[asset] && portfolio[asset] > 0);

  // Filter to show only unstaked assets (for "Stake More Assets" flow)
  const unstakedAssets = assetsWithBalance.filter(asset => {
    const staked = stakedAmounts[asset] || 0;
    const available = portfolio[asset] || 0;
    return staked === 0 || available > staked; // Show if not staked at all, or has additional balance to stake
  });

  // Preserve all original calculation functions
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

  const renderAssetRow = (asset: string) => {
    const staked = stakedAmounts[asset] || 0;
    const available = portfolio[asset] || 0;
    const isStaked = staked > 0;
    const isPending = pendingStaking.has(asset);
    const assetPrice = MASTER_ASSETS[asset]?.price || 0;

    // Calculate individual asset multiplier based on staking order
    const stakedAssetsList = assetsWithBalance.filter(a => stakedAmounts[a] > 0);
    const assetIndex = stakedAssetsList.indexOf(asset);
    const multipliers = [1.0, 1.5, 2.0, 2.25, 2.5, 2.5];
    const individualMultiplier = isStaked ? (multipliers[assetIndex] || 1.0) : 1.0;

    const weeklyYield = staked * assetPrice * (3.0/100/52) * individualMultiplier;
    const isExpanded = expandedAssets.has(asset);

    return (
      <div key={asset} className={`asset-row ${isStaked ? 'staked' : 'unstaked'}`}>
        {/* Mobile: Vertical Layout | Desktop: Horizontal Layout */}
        <div className="asset-primary border border-white/10 rounded-xl bg-surface-2 hover:bg-surface-3 transition-colors">

          {/* Mobile: Stacked Layout */}
          <div className="flex flex-col sm:hidden p-3 gap-3">
            {/* Row 1: Icon + Asset Name */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-surface-3 rounded-lg flex-shrink-0">
                <AssetIcon asset={asset} size={24} />
              </div>
              <div className="flex-1">
                <div className="text-base font-semibold text-text-primary">{asset}</div>
                <div className="text-xs text-text-secondary">
                  {isPending ? (
                    'Processing...'
                  ) : isStaked ? (
                    `${formatAmount(staked)} Staked`
                  ) : (
                    `${formatAmount(available)} available`
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Yield Info (only for staked assets) */}
            {isStaked && (
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-semibold text-success-400">
                    ${weeklyYield.toFixed(2)}/week
                  </div>
                  <div className="text-xs text-text-secondary">
                    {((weeklyYield * 52 / (staked * assetPrice)) * 100).toFixed(1)}% APY
                  </div>
                </div>
                {isStaked && (
                  <button
                    className="p-2 hover:bg-surface-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    onClick={() => {
                      const newExpanded = new Set(expandedAssets);
                      if (expandedAssets.has(asset)) {
                        newExpanded.delete(asset);
                      } else {
                        newExpanded.add(asset);
                      }
                      setExpandedAssets(newExpanded);
                    }}
                    title={isExpanded ? 'Hide details' : 'Show details'}
                  >
                    <ChevronDown
                      size={16}
                      className={`text-text-secondary transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                )}
              </div>
            )}

            {/* Row 3: Action Buttons */}
            <div className="flex gap-2">
              {isStaked ? (
                <>
                  <button
                    className={`flex-1 py-2 px-3 text-sm rounded-lg transition-colors min-h-[44px] ${
                      claimedAssets.has(asset)
                        ? 'bg-surface-3 text-text-muted cursor-not-allowed'
                        : sparklingAssets.has(asset)
                        ? 'bg-success-600 text-white animate-pulse'
                        : 'bg-success-500 hover:bg-success-400 text-white'
                    }`}
                    onClick={() => !claimedAssets.has(asset) && handleClaimYield(asset)}
                    disabled={claimedAssets.has(asset) || isPending}
                  >
                    {claimedAssets.has(asset) ? '✓ Claimed' : 'Claim'}
                  </button>
                  <button
                    className="flex-1 py-2 px-3 text-sm bg-surface-3 hover:bg-surface-2 text-text-secondary hover:text-text-primary rounded-lg transition-colors min-h-[44px]"
                    onClick={() => handleOpenUnstakingModal(asset)}
                    disabled={isPending}
                  >
                    Manage
                  </button>
                </>
              ) : (
                <button
                  className="w-full py-2 px-3 text-sm bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors min-h-[44px]"
                  onClick={() => handleOpenStakingModal(asset)}
                  disabled={isPending}
                >
                  Stake {asset}
                </button>
              )}
            </div>
          </div>

          {/* Desktop: Horizontal Layout */}
          <div className="hidden sm:flex items-center gap-4 p-4 min-h-[80px]">
            <div className="flex items-center justify-center w-8 h-8 bg-surface-3 rounded-lg flex-shrink-0">
              <AssetIcon asset={asset} size={20} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-text-primary">{asset}</div>
              <div className="text-xs text-text-secondary truncate">
                {isPending ? (
                  'Processing...'
                ) : isStaked ? (
                  `${formatAmount(staked)} Staked`
                ) : (
                  'Available to Stake'
                )}
              </div>
            </div>

            <div className="text-right min-w-[100px]">
              {isStaked ? (
                <>
                  <div className="text-sm font-semibold text-text-primary">
                    {((weeklyYield * 52 / (staked * assetPrice)) * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-success-400">
                    ${weeklyYield.toFixed(2)}/week
                  </div>
                </>
              ) : (
                <div className="text-sm text-text-secondary">
                  {formatAmount(available)} available
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 min-w-[140px] justify-end">
              {isStaked ? (
                <>
                  <button
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors min-h-[36px] ${
                      claimedAssets.has(asset)
                        ? 'bg-surface-3 text-text-muted cursor-not-allowed'
                        : sparklingAssets.has(asset)
                        ? 'bg-success-600 text-white animate-pulse'
                        : 'bg-success-500 hover:bg-success-400 text-white'
                    }`}
                    onClick={() => !claimedAssets.has(asset) && handleClaimYield(asset)}
                    disabled={claimedAssets.has(asset) || isPending}
                  >
                    {claimedAssets.has(asset) ? '✓' : 'Claim'}
                  </button>
                  <button
                    className="px-3 py-1.5 text-xs bg-surface-3 hover:bg-surface-2 text-text-secondary hover:text-text-primary rounded-lg transition-colors min-h-[36px]"
                    onClick={() => handleOpenUnstakingModal(asset)}
                    disabled={isPending}
                  >
                    Manage
                  </button>
                  <button
                    className="ml-1 p-2 hover:bg-surface-2 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                    onClick={() => {
                      const newExpanded = new Set(expandedAssets);
                      if (expandedAssets.has(asset)) {
                        newExpanded.delete(asset);
                      } else {
                        newExpanded.add(asset);
                      }
                      setExpandedAssets(newExpanded);
                    }}
                    title={isExpanded ? 'Hide details' : 'Show details'}
                  >
                    <ChevronDown
                      size={14}
                      className={`text-text-secondary transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </>
              ) : (
                <button
                  className="px-4 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors min-h-[36px]"
                  onClick={() => handleOpenStakingModal(asset)}
                  disabled={isPending}
                >
                  Stake
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expandable Detail Section - Progressive Disclosure */}
        {isStaked && isExpanded && (
          <div className="mt-3 p-4 sm:p-6 bg-surface-1 border border-white/5 rounded-xl animate-in slide-in-from-top-2 duration-200">
            {/* Performance Metrics */}
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={18} className="text-success-400" />
                <span className="text-sm sm:text-base font-semibold text-text-primary">Performance</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <div className="text-xs sm:text-sm text-text-muted">Total Earned</div>
                  <div className="text-sm sm:text-base font-semibold text-success-400">
                    ${(weeklyYield * 4).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-text-muted">Days Staked</div>
                  <div className="text-sm sm:text-base font-semibold text-text-primary">28</div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-text-muted">APY</div>
                  <div className="text-sm sm:text-base font-semibold text-text-primary">
                    {((weeklyYield * 52 / (staked * assetPrice)) * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-text-muted">Multiplier</div>
                  <div className="text-sm sm:text-base font-semibold text-warning-400">
                    +{((individualMultiplier - 1) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Yield Breakdown */}
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={18} className="text-warning-400" />
                <span className="text-sm sm:text-base font-semibold text-text-primary">Yield Breakdown</span>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-text-muted">Base (3% annual)</span>
                  <span className="text-text-primary">
                    ${(staked * assetPrice * (3.0/100/52)).toFixed(2)}/week
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-text-muted">Diversity Bonus ({individualMultiplier}x)</span>
                  <span className="text-success-400">
                    +${(weeklyYield - (staked * assetPrice * (3.0/100/52))).toFixed(2)}/week
                  </span>
                </div>
                <div className="border-t border-white/10 pt-2">
                  <div className="flex justify-between text-sm sm:text-base font-semibold">
                    <span className="text-text-primary">Total</span>
                    <span className="text-success-400">${weeklyYield.toFixed(2)}/week</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={18} className="text-primary-400" />
                <span className="text-sm sm:text-base font-semibold text-text-primary">Recent Activity</span>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-2 h-2 bg-success-400 rounded-full flex-shrink-0"></div>
                    <span className="text-text-secondary truncate">Staked {formatAmount(staked)} {asset}</span>
                  </div>
                  <span className="text-text-muted flex-shrink-0 ml-2">28 days ago</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-2 h-2 bg-warning-400 rounded-full flex-shrink-0"></div>
                    <span className="text-text-secondary truncate">Claimed Weekly Yield</span>
                  </div>
                  <span className="text-text-muted flex-shrink-0 ml-2">7 days ago</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-overlay-1 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-surface-1 rounded-2xl sm:rounded-3xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden border border-white/10">

        {/* Header Section - Fixed (120px) */}
        <div className="p-4 sm:p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-text-primary" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>
              Stake More Assets
            </h2>
            <button
              className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-surface-2 text-text-secondary hover:bg-surface-3 transition-colors min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px]"
              onClick={onClose}
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4">
            <div className="text-center">
              <div className="text-base sm:text-lg md:text-xl font-bold text-text-primary">{unstakedAssets.length}</div>
              <div className="text-xs sm:text-sm text-text-secondary">Available to Stake</div>
            </div>
            <div className="text-center">
              <div className="text-base sm:text-lg md:text-xl font-bold text-primary-400">{calculateDiversityMultiplier()}x</div>
              <div className="text-xs sm:text-sm text-text-secondary">Current Multiplier</div>
            </div>
            <div className="text-center">
              <div className="text-base sm:text-lg md:text-xl font-bold text-warning-400">{getNextMultiplier()}x</div>
              <div className="text-xs sm:text-sm text-text-secondary">Next Multiplier</div>
            </div>
          </div>

          {/* Diversity Progress Bar */}
          <div className="flex items-center justify-between text-xs sm:text-sm text-text-secondary mb-2">
            <span>Diversity Progress</span>
            <span>Next: {getNextMultiplier()}x</span>
          </div>
          <div className="w-full bg-surface-3 rounded-full h-2 sm:h-3">
            <div
              className="bg-gradient-to-r from-primary-600 to-primary-400 h-2 sm:h-3 rounded-full transition-all duration-300"
              style={{ width: `${getDiversityProgress()}%` }}
            />
          </div>
        </div>

        {/* Scrollable Body Section */}
        <div className="p-4 sm:p-6 max-h-[50vh] overflow-y-auto">
          {unstakedAssets.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {unstakedAssets.map(asset => renderAssetRow(asset))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">All Assets Staked!</h3>
              <p className="text-sm text-text-secondary mb-4">
                Great job! You've staked all your available assets.
              </p>
              <div className="text-xs text-text-muted">
                Add more assets to your portfolio to continue growing your garden.
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Zone - Sticky (80px) */}
        {unstakedAssets.length > 0 && (
          <div className="p-4 sm:p-6 border-t border-white/10 bg-surface-1">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                className="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-xl transition-all duration-200 hover:scale-[1.02] flex items-center justify-center gap-2 min-h-[48px] text-sm sm:text-base"
                onClick={() => {
                  // Open staking modal for first unstaked asset
                  if (unstakedAssets.length > 0) {
                    handleOpenStakingModal(unstakedAssets[0]);
                  }
                }}
              >
                🚀 Stake First Available
              </button>
              <button
                className="flex-1 bg-surface-3 hover:bg-surface-2 text-text-primary font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-xl transition-all duration-200 hover:scale-[1.02] flex items-center justify-center gap-2 min-h-[48px] text-sm sm:text-base border border-white/10"
                onClick={onClose}
              >
                ← Back to Garden
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsolidatedStakingModal;