import React, { useState, useMemo, useEffect } from 'react';
import { Star, ChevronDown, ChevronUp } from 'lucide-react';
import DEXIcon from './DEXIcon';
import { dexRoutingAgent } from '../agents/DEXRoutingAgent';
import { DEXQuote, DEXUtils } from '../types/dex';
import { DEXSemantics, DEXMetrics } from '../utils/DEXSemantics';

interface OptimalDEXSelectorProps {
  selectedDEX: string | null;
  setSelectedDEX: (dex: string | null) => void;
  dexData: Record<string, any>;
  fromAsset?: string;
  toAsset?: string;
  swapAmount?: string;
  swapValueUSD?: number;
  slippageTolerance?: number;
  onShowTransactionPreview?: () => void;
  swapAnalysis?: any;
  onDEXSelectedForICPSwap?: (dexId: string) => void;
}

const OptimalDEXSelector: React.FC<OptimalDEXSelectorProps> = ({
  selectedDEX,
  setSelectedDEX,
  dexData,
  fromAsset,
  toAsset,
  swapAmount,
  swapValueUSD,
  slippageTolerance,
  onShowTransactionPreview,
  swapAnalysis,
  onDEXSelectedForICPSwap
}) => {
  const [agentQuotes, setAgentQuotes] = useState<DEXQuote[]>([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Find the optimal DEX based on agent quotes
  const optimalDEX = useMemo(() => {
    if (!agentQuotes.length) {
      // Fallback to default best option
      return { id: 'ICPSwap', data: dexData['ICPSwap'], quote: null };
    }

    // Find the top-scored quote (DEXRoutingAgent already sorts by score)
    const topQuote = agentQuotes[0];
    const fallbackQuote = agentQuotes.find(q => !q.quoteError);
    const bestQuote = topQuote.quoteError ? fallbackQuote : topQuote;

    if (!bestQuote) {
      return { id: 'ICPSwap', data: dexData['ICPSwap'], quote: null };
    }

    return {
      id: bestQuote.dexName,
      data: dexData[bestQuote.dexName],
      quote: bestQuote
    };
  }, [agentQuotes, dexData]);

  // Fetch agent quotes when trade parameters change
  useEffect(() => {
    const fetchOptimalQuote = async () => {
      if (!swapValueUSD || !fromAsset || !toAsset || swapValueUSD < 100) {
        setAgentQuotes([]);
        return;
      }

      if (!requiresDEXRouting(fromAsset, toAsset)) {
        setAgentQuotes([]);
        return;
      }

      setIsLoadingQuotes(true);
      try {
        const decimals = DEXUtils.getTokenDecimals(fromAsset);
        const amount = Math.round(parseFloat(swapAmount || '0') * Math.pow(10, decimals));

        const getIntermediateAsset = (mainnetAsset: string): string => {
          const mapping: Record<string, string> = {
            'BTC': 'ckBTC',
            'ETH': 'ckETH',
            'USDC': 'ckUSDC',
            'USDT': 'ckUSDT'
          };
          return mapping[mainnetAsset] || mainnetAsset;
        };

        const dexToAsset = getIntermediateAsset(toAsset);

        const quotes = await dexRoutingAgent.getBestRoutes({
          fromToken: fromAsset,
          toToken: dexToAsset,
          amount: amount,
          urgency: swapValueUSD > 10000 ? 'high' : 'medium',
          userPreference: swapValueUSD > 25000 ? 'most_liquid' : 'lowest_cost',
          slippageTolerance: slippageTolerance
        });

        setAgentQuotes(quotes);
      } catch (error) {
        console.error('Failed to fetch optimal DEX quote:', error);
        setAgentQuotes([]);
      } finally {
        setIsLoadingQuotes(false);
      }
    };

    const timer = setTimeout(fetchOptimalQuote, 500);
    return () => clearTimeout(timer);
  }, [swapValueUSD, fromAsset, toAsset, swapAmount]);

  const requiresDEXRouting = (from?: string, to?: string): boolean => {
    if (!from || !to) return false;
    const icpAssets = ['ICP', 'ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT'];
    const mainnetAssets = ['BTC', 'ETH', 'USDC', 'USDT'];
    if (!icpAssets.includes(from)) return false;
    return icpAssets.includes(to) || mainnetAssets.includes(to);
  };

  const isICPEcosystemTransaction = (from?: string, to?: string): boolean => {
    if (!from || !to) return false;
    const icpAssets = ['ICP', 'ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT'];
    return icpAssets.includes(from) && icpAssets.includes(to);
  };

  const handleSelectOptimalDEX = () => {
    setSelectedDEX(optimalDEX.id);

    // For DEX-only transactions, trigger swap analysis and preview
    const isICPEcosystemSwap = isICPEcosystemTransaction(fromAsset, toAsset);
    if (isICPEcosystemSwap && fromAsset && toAsset && swapAmount) {
      console.log('🎯 Optimal DEX Selected:', optimalDEX.id, fromAsset, '→', toAsset);

      if (onDEXSelectedForICPSwap) {
        onDEXSelectedForICPSwap(optimalDEX.id);
      } else if (onShowTransactionPreview) {
        onShowTransactionPreview();
      }
    }
  };

  return (
    <div className="w-full max-w-lg">
      {/* Loading state */}
      {isLoadingQuotes && (
        <div className="mb-4 p-4 bg-primary-600/10 border border-primary-500/20 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-primary-400">Finding optimal DEX...</span>
          </div>
        </div>
      )}

      {/* Optimal DEX Display */}
      {!isLoadingQuotes && (
        <div className="border border-white/10 rounded-xl bg-surface-2 overflow-hidden">
          {/* Optimal Choice Header */}
          <div className="p-4 bg-primary-600/5 border-b border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Star size={16} className="text-primary-400 fill-primary-400" />
              <span className="text-sm font-semibold text-primary-400">Optimal Choice</span>
              {optimalDEX.quote?.badge && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  optimalDEX.quote.badge === 'RECOMMENDED' ? 'bg-success-400/15 text-success-300' :
                  optimalDEX.quote.badge === 'FASTEST' ? 'bg-warning-400/15 text-warning-300' :
                  optimalDEX.quote.badge === 'CHEAPEST' ? 'bg-primary-600/15 text-primary-400' :
                  'bg-primary-600/15 text-primary-400'
                }`}>
                  {optimalDEX.quote.badge}
                </span>
              )}
            </div>
            {optimalDEX.quote?.reason && (
              <p className="text-xs text-text-secondary">{optimalDEX.quote.reason}</p>
            )}
          </div>

          {/* Main DEX Row */}
          <div className="p-4">
            <div className="flex items-center justify-between">
              {/* DEX Info */}
              <div className="flex items-center gap-4">
                <DEXIcon dex={optimalDEX.id} size={32} />
                <div>
                  <div className="font-semibold text-text-primary text-lg">{optimalDEX.data?.name || optimalDEX.id}</div>
                  <div className="text-sm text-text-secondary">
                    Fee: {optimalDEX.quote ? `${optimalDEX.quote.fee}%` : (optimalDEX.data?.stats?.['Trading Fee'] || '0.3%')}
                    {optimalDEX.quote?.slippage !== undefined && (
                      <span className="ml-2">
                        • Slippage: ~{optimalDEX.quote.slippage.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Select Button */}
              <button
                onClick={handleSelectOptimalDEX}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  selectedDEX === optimalDEX.id
                    ? 'bg-success-600 text-white'
                    : 'bg-primary-600 hover:bg-primary-500 text-white'
                }`}
              >
                {selectedDEX === optimalDEX.id ? '✓ Selected' : 'Use This DEX'}
              </button>
            </div>

            {/* Agent Quote Metrics */}
            {optimalDEX.quote && (
              <div className="mt-4 p-3 bg-surface-3 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Agent Score:</span>
                  <span className="font-medium text-text-primary">{optimalDEX.quote.score.toFixed(1)}/10</span>
                </div>
                {optimalDEX.quote.liquidityUsd && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-text-secondary">Liquidity:</span>
                    <span className="font-medium text-text-primary">${(optimalDEX.quote.liquidityUsd / 1000).toFixed(0)}K</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-text-secondary">Estimated Speed:</span>
                  <span className="font-medium text-text-primary">{optimalDEX.quote.estimatedSpeed}</span>
                </div>
              </div>
            )}

            {/* Toggle Details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              <span>{showDetails ? 'Hide Details' : 'Show Details'}</span>
              {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {/* Expanded Details */}
          {showDetails && (
            <div className="border-t border-white/10 bg-surface-1 p-6">
              {optimalDEX.quote && swapValueUSD ? (
                (() => {
                  const metrics: DEXMetrics = {
                    slippage: optimalDEX.quote.slippage,
                    liquidityUsd: optimalDEX.quote.liquidityUsd,
                    fee: optimalDEX.quote.fee,
                    estimatedSpeed: optimalDEX.quote.estimatedSpeed,
                    tradeValueUsd: swapValueUSD,
                    dexName: optimalDEX.quote.dexName
                  };

                  const explanation = DEXSemantics.generateExplanation(metrics);
                  const semanticColor = DEXSemantics.getSemanticColor(explanation.slippageCategory, explanation.liquidityCategory);

                  return (
                    <>
                      {/* Performance Assessment */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-text-primary mb-3">Performance Assessment</h4>
                        <div className={`text-sm ${semanticColor} font-medium mb-2`}>
                          {explanation.overallRecommendation}
                        </div>
                        {explanation.celebrationMessage && (
                          <div className="text-sm text-success-400">
                            {explanation.celebrationMessage}
                          </div>
                        )}
                        {explanation.warningMessage && (
                          <div className="text-sm text-warning-400">
                            {explanation.warningMessage}
                          </div>
                        )}
                      </div>

                      {/* Detailed Metrics */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surface-2 rounded-lg p-3">
                          <div className="text-xs text-text-muted mb-1">Price Impact</div>
                          <div className={`text-sm font-semibold ${semanticColor}`}>
                            {metrics.slippage.toFixed(2)}% ({explanation.slippageCategory})
                          </div>
                        </div>
                        <div className="bg-surface-2 rounded-lg p-3">
                          <div className="text-xs text-text-muted mb-1">Liquidity Depth</div>
                          <div className="text-sm font-semibold text-text-primary">
                            ${(metrics.liquidityUsd/1000).toFixed(0)}K ({explanation.liquidityCategory})
                          </div>
                        </div>
                        <div className="bg-surface-2 rounded-lg p-3">
                          <div className="text-xs text-text-muted mb-1">Trading Fee</div>
                          <div className="text-sm font-semibold text-text-primary">
                            {metrics.fee}%
                          </div>
                        </div>
                        <div className="bg-surface-2 rounded-lg p-3">
                          <div className="text-xs text-text-muted mb-1">Execution Speed</div>
                          <div className="text-sm font-semibold text-text-primary">
                            {metrics.estimatedSpeed}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()
              ) : (
                // Fallback to static data
                <>
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-text-primary mb-4">Key Features</h4>
                    <div className="space-y-2">
                      {optimalDEX.data?.advantages?.map((advantage: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-success-400 flex-shrink-0"></div>
                          <span className="text-sm text-text-secondary">{advantage}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {optimalDEX.data?.stats && Object.entries(optimalDEX.data.stats).map(([stat, value]) => (
                      <div key={stat} className="bg-surface-2 rounded-lg p-3">
                        <div className="text-xs text-text-muted mb-1">{stat}</div>
                        <div className="text-sm font-semibold text-text-primary">{String(value)}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OptimalDEXSelector;