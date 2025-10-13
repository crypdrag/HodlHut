import React, { useState } from 'react';
import { Droplets, TrendingUp, DollarSign, Info, ArrowRight } from 'lucide-react';

const TreasuryPoolPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'swap' | 'pool'>('swap');
  const [swapAmount, setSwapAmount] = useState('');
  const [fromToken, setFromToken] = useState<'BABY' | 'BTC'>('BABY');
  const [toToken, setToToken] = useState<'BABY' | 'BTC'>('BTC');

  // Mock pool data (will be replaced with real data)
  const poolData = {
    babyReserve: 1000000,
    btcReserve: 10.5,
    totalLiquidity: 500000,
    apy: 15.2
  };

  return (
    <div className="w-full min-h-screen bg-bg text-text-primary">
      <div className="container-app">
        {/* Hero Section */}
        <div className="text-center py-8 md:py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            Treasury Pool
          </h1>
          <p className="text-base md:text-lg text-text-secondary max-w-2xl mx-auto">
            Trade Babyrunes for BTC or provide liquidity to earn rewards from protocol fees
          </p>
        </div>

        {/* Pool Stats */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface-1 border border-white/10 rounded-xl p-4">
            <div className="text-sm text-text-secondary mb-1">BABY Reserve</div>
            <div className="text-xl font-bold text-text-primary">
              {poolData.babyReserve.toLocaleString()}
            </div>
          </div>
          <div className="bg-surface-1 border border-white/10 rounded-xl p-4">
            <div className="text-sm text-text-secondary mb-1">BTC Reserve</div>
            <div className="text-xl font-bold text-text-primary">
              {poolData.btcReserve.toFixed(4)} BTC
            </div>
          </div>
          <div className="bg-surface-1 border border-white/10 rounded-xl p-4">
            <div className="text-sm text-text-secondary mb-1">Total Liquidity</div>
            <div className="text-xl font-bold text-text-primary">
              ${poolData.totalLiquidity.toLocaleString()}
            </div>
          </div>
          <div className="bg-surface-1 border border-white/10 rounded-xl p-4">
            <div className="text-sm text-text-secondary mb-1">APY</div>
            <div className="text-xl font-bold text-success-400">
              {poolData.apy}%
            </div>
          </div>
        </div>

        {/* Main Interface */}
        <div className="max-w-2xl mx-auto mb-8">
          {/* Tab Switcher */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('swap')}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
                activeTab === 'swap'
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
              }`}
            >
              Swap
            </button>
            <button
              onClick={() => setActiveTab('pool')}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
                activeTab === 'pool'
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
              }`}
            >
              Add Liquidity
            </button>
          </div>

          {/* Swap Interface */}
          {activeTab === 'swap' && (
            <div className="bg-surface-1 border border-white/10 rounded-3xl p-6 md:p-8">
              {/* From Token */}
              <div className="mb-6">
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  From
                </label>
                <div className="bg-surface-2 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <input
                      type="number"
                      value={swapAmount}
                      onChange={(e) => setSwapAmount(e.target.value)}
                      placeholder="0.0"
                      className="flex-1 text-2xl md:text-3xl font-semibold text-text-primary bg-transparent border-none outline-none"
                      step="any"
                      min="0"
                    />
                    <select
                      value={fromToken}
                      onChange={(e) => {
                        setFromToken(e.target.value as 'BABY' | 'BTC');
                        setToToken(e.target.value === 'BABY' ? 'BTC' : 'BABY');
                      }}
                      className="px-4 py-2 bg-surface-3 rounded-xl text-lg font-semibold border-none outline-none"
                    >
                      <option value="BABY">BABY</option>
                      <option value="BTC">BTC</option>
                    </select>
                  </div>
                  <div className="text-sm text-text-muted">
                    Balance: 0.00 {fromToken}
                  </div>
                </div>
              </div>

              {/* Swap Arrow */}
              <div className="flex justify-center my-4">
                <button className="p-3 bg-surface-2 rounded-full hover:bg-surface-3 transition-all">
                  <ArrowRight className="w-5 h-5 text-text-primary rotate-90" />
                </button>
              </div>

              {/* To Token */}
              <div className="mb-6">
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  To
                </label>
                <div className="bg-surface-2 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1 text-2xl md:text-3xl font-semibold text-text-primary">
                      {swapAmount ? (parseFloat(swapAmount) * 0.99).toFixed(6) : '0.0'}
                    </div>
                    <div className="px-4 py-2 bg-surface-3 rounded-xl text-lg font-semibold">
                      {toToken}
                    </div>
                  </div>
                  <div className="text-sm text-text-muted">
                    You will receive
                  </div>
                </div>
              </div>

              {/* Swap Details */}
              <div className="bg-surface-2 border border-white/10 rounded-xl p-4 mb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Exchange Rate</span>
                    <span className="text-text-primary font-medium">
                      1 {fromToken} ≈ 1.01 {toToken}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Trading Fee</span>
                    <span className="text-text-primary font-medium">0.3%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Price Impact</span>
                    <span className="text-success-400 font-medium">{'<'}0.01%</span>
                  </div>
                </div>
              </div>

              {/* Swap Button */}
              <button
                disabled={!swapAmount || parseFloat(swapAmount) === 0}
                className="w-full btn-primary py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Swap
              </button>
            </div>
          )}

          {/* Add Liquidity Interface */}
          {activeTab === 'pool' && (
            <div className="bg-surface-1 border border-white/10 rounded-3xl p-6 md:p-8">
              <div className="text-center mb-8">
                <Droplets className="w-12 h-12 mx-auto mb-4 text-primary-400" />
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  Add Liquidity
                </h3>
                <p className="text-sm text-text-secondary">
                  Provide liquidity to earn trading fees and protocol rewards
                </p>
              </div>

              {/* Coming Soon Message */}
              <div className="bg-warning-600/15 border border-warning-500/30 rounded-xl p-6 text-center">
                <p className="text-warning-300 font-medium mb-2">
                  Liquidity Provision Coming Soon
                </p>
                <p className="text-sm text-text-secondary">
                  This feature will be available once the pool has been seeded with initial liquidity
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="bg-primary-600/15 border border-primary-500/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <Info className="w-6 h-6 text-primary-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-primary-300 mb-2">
                  About Treasury Pool
                </h3>
                <p className="text-sm text-text-secondary mb-3">
                  The Treasury Pool enables the protocol to distribute community rewards in a decentralized manner.
                  Babyrunes earned from protocol operations can be traded for BTC, creating a liquid market for community incentives.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-success-400" />
                    <span className="text-text-secondary">Earn trading fees as a liquidity provider</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-success-400" />
                    <span className="text-text-secondary">Protocol revenue shared with LPs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-success-400" />
                    <span className="text-text-secondary">Low slippage on trades</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreasuryPoolPage;
