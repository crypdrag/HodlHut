import React, { useState } from 'react';
import { Zap, Info, TrendingUp, Shield, ArrowRight } from 'lucide-react';

const StakeBTCPage: React.FC = () => {
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakingDuration, setStakingDuration] = useState<'30' | '90' | '180'>('90');

  // Calculate APY based on duration (placeholder values)
  const getAPY = (duration: string) => {
    const apyMap = {
      '30': '6%',
      '90': '8%',
      '180': '10%'
    };
    return apyMap[duration as keyof typeof apyMap] || '8%';
  };

  return (
    <div className="w-full min-h-screen bg-bg text-text-primary">
      <div className="container-app">
        {/* Hero Section */}
        <div className="text-center py-8 md:py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            Stake Bitcoin. Earn Rewards. Stay Liquid.
          </h1>
          <p className="text-base md:text-lg text-text-secondary max-w-2xl mx-auto">
            First Bitcoin liquid staking on Internet Computer via Babylon Protocol
          </p>
        </div>

        {/* Main Staking Interface */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-surface-1 border border-white/10 rounded-3xl p-6 md:p-8">
            {/* Amount Input */}
            <div className="mb-6">
              <label className="text-sm font-medium text-text-secondary mb-2 block">
                Amount to Stake
              </label>
              <div className="bg-surface-2 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="0.0"
                    className="flex-1 text-2xl md:text-3xl font-semibold text-text-primary bg-transparent border-none outline-none"
                    step="any"
                    min="0"
                  />
                  <div className="flex items-center gap-2 px-4 py-2 bg-surface-3 rounded-xl">
                    <span className="text-lg font-semibold">BTC</span>
                  </div>
                </div>
                <div className="mt-4 text-sm text-text-muted">
                  Balance: 0.00 BTC
                </div>
              </div>
            </div>

            {/* Duration Selection */}
            <div className="mb-6">
              <label className="text-sm font-medium text-text-secondary mb-3 block">
                Staking Duration
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setStakingDuration('30')}
                  className={`p-4 rounded-xl border transition-all ${
                    stakingDuration === '30'
                      ? 'border-primary-500 bg-primary-600/15'
                      : 'border-white/10 bg-surface-2 hover:bg-surface-3'
                  }`}
                >
                  <div className="text-lg font-bold text-text-primary">30 Days</div>
                  <div className="text-sm text-success-400 mt-1">6% APY</div>
                </button>
                <button
                  onClick={() => setStakingDuration('90')}
                  className={`p-4 rounded-xl border transition-all ${
                    stakingDuration === '90'
                      ? 'border-primary-500 bg-primary-600/15'
                      : 'border-white/10 bg-surface-2 hover:bg-surface-3'
                  }`}
                >
                  <div className="text-lg font-bold text-text-primary">90 Days</div>
                  <div className="text-sm text-success-400 mt-1">8% APY</div>
                </button>
                <button
                  onClick={() => setStakingDuration('180')}
                  className={`p-4 rounded-xl border transition-all ${
                    stakingDuration === '180'
                      ? 'border-primary-500 bg-primary-600/15'
                      : 'border-white/10 bg-surface-2 hover:bg-surface-3'
                  }`}
                >
                  <div className="text-lg font-bold text-text-primary">180 Days</div>
                  <div className="text-sm text-success-400 mt-1">10% APY</div>
                </button>
              </div>
            </div>

            {/* Staking Summary */}
            <div className="bg-surface-2 border border-white/10 rounded-xl p-4 mb-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">You will receive</span>
                  <span className="text-sm font-medium text-text-primary">
                    {stakeAmount || '0.0'} BLST
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">APY</span>
                  <span className="text-sm font-medium text-success-400">
                    {getAPY(stakingDuration)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Estimated Rewards</span>
                  <span className="text-sm font-medium text-success-400">
                    {stakeAmount ? (parseFloat(stakeAmount) * 0.08 * (parseInt(stakingDuration) / 365)).toFixed(6) : '0.0'} BTC
                  </span>
                </div>
              </div>
            </div>

            {/* Stake Button */}
            <button
              disabled={!stakeAmount || parseFloat(stakeAmount) === 0}
              className="w-full btn-primary py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="inline w-5 h-5 mr-2" />
              Stake BTC
            </button>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-surface-1 border border-white/10 rounded-xl p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-primary-600/15 rounded-full">
              <TrendingUp className="w-6 h-6 text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Earn Rewards</h3>
            <p className="text-sm text-text-secondary">
              Earn up to 10% APY on your Bitcoin holdings
            </p>
          </div>

          <div className="bg-surface-1 border border-white/10 rounded-xl p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-success-600/15 rounded-full">
              <Zap className="w-6 h-6 text-success-400" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Stay Liquid</h3>
            <p className="text-sm text-text-secondary">
              Receive BLST tokens that represent your staked BTC
            </p>
          </div>

          <div className="bg-surface-1 border border-white/10 rounded-xl p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-warning-600/15 rounded-full">
              <Shield className="w-6 h-6 text-warning-400" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Secure</h3>
            <p className="text-sm text-text-secondary">
              Powered by Babylon Protocol on Bitcoin mainnet
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl font-bold text-text-primary text-center mb-8">
            How It Works
          </h2>
          <div className="space-y-4">
            <div className="bg-surface-1 border border-white/10 rounded-xl p-6 flex items-start gap-4">
              <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-primary-600 rounded-full text-white font-bold">
                1
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Deposit Bitcoin
                </h3>
                <p className="text-sm text-text-secondary">
                  Connect your Bitcoin wallet and deposit BTC to start earning
                </p>
              </div>
            </div>

            <div className="bg-surface-1 border border-white/10 rounded-xl p-6 flex items-start gap-4">
              <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-primary-600 rounded-full text-white font-bold">
                2
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Receive BLST
                </h3>
                <p className="text-sm text-text-secondary">
                  Get liquid staking tokens (BLST) that represent your staked Bitcoin
                </p>
              </div>
            </div>

            <div className="bg-surface-1 border border-white/10 rounded-xl p-6 flex items-start gap-4">
              <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-primary-600 rounded-full text-white font-bold">
                3
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Earn & Trade
                </h3>
                <p className="text-sm text-text-secondary">
                  Earn rewards on your staked BTC while using BLST in DeFi
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="bg-primary-600/15 border border-primary-500/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <Info className="w-6 h-6 text-primary-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-primary-300 mb-2">
                  Powered by Babylon Protocol
                </h3>
                <p className="text-sm text-text-secondary">
                  Babylon Protocol enables Bitcoin holders to earn staking rewards while maintaining liquidity.
                  Your Bitcoin is secured by the Bitcoin network itself through time-lock contracts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StakeBTCPage;
