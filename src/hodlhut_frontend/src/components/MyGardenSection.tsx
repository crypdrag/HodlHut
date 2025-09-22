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
  formatAmount
}) => {
  // Use same asset filtering as Portfolio Overview - only swappable assets with balance > 0
  const fromAssets = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'];
  const assetsWithBalance = fromAssets.filter(asset => portfolio[asset] && portfolio[asset] > 0);

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

  const renderStakingCard = (asset: string) => {
    const staked = stakedAmounts[asset] || 0;
    const available = portfolio[asset] || 0;
    const isStaked = staked > 0;
    const isPending = pendingStaking.has(asset);
    const assetPrice = MASTER_ASSETS[asset]?.price || 0;
    const diversityMultiplier = calculateDiversityMultiplier();
    const weeklyYield = staked * assetPrice * (3.0/100/52) * diversityMultiplier;
    const currentMultiplier = calculateDiversityMultiplier();
    const nextMultiplier = isStaked ? currentMultiplier : getNextMultiplier();
    const nextMultiplierBoost = isStaked ? 0 : (nextMultiplier - currentMultiplier); // Boost for staking new asset

    return (
      <div key={asset} className={`staking-asset-card ${isStaked ? 'staked' : 'unstaked'} ${expandedAssets.has(asset) ? 'expanded' : ''}`}>
        <div className="staking-asset-card-header">
          <div className="staking-asset-icon">
            <AssetIcon asset={asset} size={48} />
          </div>
          <div className="staking-asset-name">{asset}</div>
          <div className={`staking-asset-status ${isStaked ? 'staked' : 'unstaked'}`}>
            {isPending ? (
              'Processing...'
            ) : isStaked ? (
              `${formatAmount(staked)} Staked`
            ) : (
              'Available to Stake'
            )}
          </div>
          {isStaked && (
            <button
              className="staking-asset-expand-btn"
              onClick={() => {
                const newExpanded = new Set(expandedAssets);
                if (expandedAssets.has(asset)) {
                  newExpanded.delete(asset);
                } else {
                  newExpanded.add(asset);
                }
                setExpandedAssets(newExpanded);
              }}
              title={expandedAssets.has(asset) ? 'Hide details' : 'Show details'}
            >
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${
                  expandedAssets.has(asset) ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}
        </div>

        <div className="staking-asset-card-body">
          <div className="staking-asset-details">
            {isStaked ? (
              <div className="staking-asset-yield">
                🌱 Growing • Yield: ${weeklyYield.toFixed(2)}/week
                <br />
                <small className="text-text-muted">
                  Base rate: ${(staked * assetPrice * (3.0/100/52)).toFixed(2)} × {diversityMultiplier}x multiplier
                </small>
              </div>
            ) : (
              <>
                <div className="staking-asset-available">
                  Available: {formatAmount(available)} {asset}
                </div>
                {nextMultiplierBoost > 0 && (
                  <div className="staking-asset-multiplier-boost">
                    +{nextMultiplierBoost.toFixed(2)}x Multiplier Boost
                  </div>
                )}
              </>
            )}
          </div>

          {/* Expandable Detail Section */}
          {isStaked && expandedAssets.has(asset) && (
            <div className="staking-asset-details-expanded">
              <div className="detail-section-divider" />

              {/* Performance Metrics */}
              <div className="detail-section">
                <div className="detail-section-title">
                  <TrendingUp size={16} className="text-success-400" />
                  Performance Metrics
                </div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Total Earned</span>
                    <span className="detail-value text-success-400">
                      ${((weeklyYield * 4)).toFixed(2)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">APY</span>
                    <span className="detail-value">
                      {((weeklyYield * 52 / (staked * assetPrice)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Days Staked</span>
                    <span className="detail-value">28 days</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Multiplier Impact</span>
                    <span className="detail-value text-warning-400">
                      +{((diversityMultiplier - 1) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Yield Breakdown */}
              <div className="detail-section">
                <div className="detail-section-title">
                  <DollarSign size={16} className="text-warning-400" />
                  Yield Breakdown
                </div>
                <div className="detail-breakdown">
                  <div className="breakdown-item">
                    <div className="breakdown-left">
                      <span className="breakdown-label">Base Yield</span>
                      <span className="breakdown-sublabel">5% annual rate</span>
                    </div>
                    <span className="breakdown-value">
                      ${(staked * assetPrice * (3.0/100/52)).toFixed(2)}/week
                    </span>
                  </div>
                  <div className="breakdown-item">
                    <div className="breakdown-left">
                      <span className="breakdown-label">Diversity Bonus</span>
                      <span className="breakdown-sublabel">{diversityMultiplier}x multiplier</span>
                    </div>
                    <span className="breakdown-value text-success-400">
                      +${(weeklyYield - (staked * assetPrice * (3.0/100/52))).toFixed(2)}/week
                    </span>
                  </div>
                  <div className="breakdown-divider" />
                  <div className="breakdown-item breakdown-total">
                    <span className="breakdown-label">Total Weekly</span>
                    <span className="breakdown-value text-success-400">
                      ${weeklyYield.toFixed(2)}/week
                    </span>
                  </div>
                </div>
              </div>

              {/* Staking History */}
              <div className="detail-section">
                <div className="detail-section-title">
                  <Clock size={16} className="text-primary-400" />
                  Recent Activity
                </div>
                <div className="history-list">
                  <div className="history-item">
                    <div className="history-left">
                      <div className="history-icon success">
                        <Plus size={12} />
                      </div>
                      <div className="history-content">
                        <div className="history-action">Staked {formatAmount(staked)} {asset}</div>
                        <div className="history-date">28 days ago</div>
                      </div>
                    </div>
                    <div className="history-amount">+{diversityMultiplier}x Multiplier</div>
                  </div>
                  <div className="history-item">
                    <div className="history-left">
                      <div className="history-icon claim">
                        <DollarSign size={12} />
                      </div>
                      <div className="history-content">
                        <div className="history-action">Claimed Weekly Yield</div>
                        <div className="history-date">7 days ago</div>
                      </div>
                    </div>
                    <div className="history-amount">${weeklyYield.toFixed(2)}</div>
                  </div>
                  <div className="history-item">
                    <div className="history-left">
                      <div className="history-icon claim">
                        <DollarSign size={12} />
                      </div>
                      <div className="history-content">
                        <div className="history-action">Claimed Weekly Yield</div>
                        <div className="history-date">14 days ago</div>
                      </div>
                    </div>
                    <div className="history-amount">${(weeklyYield * 0.95).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="staking-asset-card-footer">
          {isStaked ? (
            <div className="flex gap-2">
              <button
                className={`flex-1 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  claimedAssets.has(asset)
                    ? 'bg-surface-3 text-text-muted cursor-not-allowed'
                    : sparklingAssets.has(asset)
                    ? 'btn-success animate-pulse'
                    : 'btn-success'
                }`}
                onClick={() => !claimedAssets.has(asset) && handleClaimYield(asset)}
                disabled={claimedAssets.has(asset) || isPending}
              >
                {claimedAssets.has(asset) ? 'Claimed ✓' : 'Claim'}
              </button>
              <button
                className="flex-1 btn-secondary py-3 text-sm"
                onClick={() => openUnstakingModal(asset)}
                disabled={isPending}
              >
                {isPending ? 'Processing...' : 'Manage'}
              </button>
            </div>
          ) : (
            <button
              className="w-full btn-primary py-3"
              onClick={() => openStakingModal(asset)}
              disabled={isPending}
            >
              {isPending ? 'Processing...' : `Stake ${asset} 🌱`}
            </button>
          )}
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
          <p className="text-text-secondary mb-3">Hodl Longevity & Asset Diversity Rewards</p>
          <div className="inline-flex items-center gap-2 rounded-full bg-success-600/15 text-success-400 px-4 py-2 text-sm font-semibold">
            🌿 Sprout Gardener
          </div>
        </div>

        {/* Quick Actions */}
        <div className="garden-quick-actions">
          <div className="garden-quick-action stake-all" onClick={() => alert('Stake All Available Assets coming soon!')}>
            <div className="garden-quick-action-content">
              <div className="garden-quick-action-icon">
                🚀
              </div>
              <div className="garden-quick-action-text">
                <div className="garden-quick-action-title">Stake All Available</div>
                <div className="garden-quick-action-subtitle">Maximize your diversity multiplier</div>
              </div>
            </div>
          </div>
          <div className="garden-quick-action claim-all" onClick={() => alert('Claim All Yields coming soon!')}>
            <div className="garden-quick-action-content">
              <div className="garden-quick-action-icon">
                💰
              </div>
              <div className="garden-quick-action-text">
                <div className="garden-quick-action-title">Claim All Yields</div>
                <div className="garden-quick-action-subtitle">Harvest your weekly rewards</div>
              </div>
            </div>
          </div>
        </div>

        {/* Yield Stats - Collapsible */}
        <div className="yield-stats-collapse">
          <div className="yield-stats-header" onClick={() => setStatsExpanded(!statsExpanded)}>
            <div className="yield-stats-title">
              Yield Stats
            </div>
            <div className="yield-stats-summary">
              <div className="yield-stats-total">
                ${calculateTotalYield().toFixed(0)}
              </div>
              <div className="yield-stats-change">
                +${(calculateTotalYield() * 0.1).toFixed(0)} this week
              </div>
            </div>
            <div className={`yield-stats-expand-icon ${statsExpanded ? 'expanded' : ''}`}>
              ▼
            </div>
          </div>
          <div className={`yield-stats-content ${statsExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="yield-stats-grid">
              <div className="yield-stat-item">
                <div className="yield-stat-icon">
                  <DollarSign className="w-6 h-6 text-primary-400" />
                </div>
                <div className="yield-stat-value">${calculateTotalYield().toFixed(0)}</div>
                <div className="yield-stat-label">Total Garden Yield</div>
                <div className="yield-stat-detail">This week: +${(calculateTotalYield() * 0.1).toFixed(0)}</div>
              </div>

              <div className="yield-stat-item">
                <div className="yield-stat-icon">
                  <Clock className="w-6 h-6 text-warning-400" />
                </div>
                <div className="yield-stat-value">42</div>
                <div className="yield-stat-label">Average Hodl Days</div>
                <div className="yield-stat-detail">Longest: 127 days</div>
              </div>

              <div className="yield-stat-item">
                <div className="yield-stat-icon">
                  <Target className="w-6 h-6 text-success-400" />
                </div>
                <div className="yield-stat-value">{assetsWithBalance.filter(asset => stakedAmounts[asset] > 0).length}/6</div>
                <div className="yield-stat-label">Asset Diversity</div>
                <div className="yield-stat-detail">{calculateDiversityMultiplier()}x multiplier active</div>
              </div>

              <div className="yield-stat-item">
                <div className="yield-stat-icon">
                  <Trophy className="w-6 h-6 text-warning-500" />
                </div>
                <div className="yield-stat-value">{calculateDiversityMultiplier()}x</div>
                <div className="yield-stat-label">Total Multiplier</div>
                <div className="yield-stat-detail">Next level: 15 days</div>
              </div>
            </div>
          </div>
        </div>

        {/* Staking Assets */}
        <div>
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-text-primary mb-2">🪴 Your Assets</h2>
            <p className="text-text-secondary text-sm md:text-base">Stake assets to earn yield • Greater diversity = Higher rewards</p>
          </div>

          <div className="staking-grid-mobile staking-grid-tablet staking-grid-desktop">
            {assetsWithBalance.map(asset => renderStakingCard(asset))}
          </div>
        </div>
      </div>

      {/* Mobile Thumb Zone - Only visible on mobile */}
      <div className="garden-thumb-zone">
        <div className="garden-thumb-actions">
          <button className="garden-thumb-button-primary" onClick={() => alert('Claim All Yields coming soon!')}>
            💰 Claim All
          </button>
          <button className="garden-thumb-button-secondary" onClick={() => alert('Stake All Available coming soon!')}>
            🚀 Stake All
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyGardenSection;