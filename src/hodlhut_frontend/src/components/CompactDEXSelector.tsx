import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, Star, Zap, Waves } from 'lucide-react';
import DEXIcon from './DEXIcon';
import { dexRoutingAgent } from '../agents/DEXRoutingAgent';
import { DEXQuote, DEXUtils } from '../types/dex';
import { DEXSemantics, DEXMetrics } from '../utils/DEXSemantics';

// Interface for compact DEX row
interface CompactDEXView {
  id: string;
  name: string;
  badge: {
    text: string;
    type: 'speed' | 'liquidity';
  };
  primaryFee: string;
  isSelected: boolean;
  onSelect: () => void;
  agentQuote?: DEXQuote; // Agent-driven quote data
}

// Interface for detailed DEX data (Tier 2)
interface DetailedDEXData {
  stats: Record<string, string>;
  advantages: string[];
  tradeoffs: string[];
}

interface CompactDEXSelectorProps {
  selectedDEX: string | null;
  setSelectedDEX: (dex: string | null) => void;
  dexData: Record<string, any>; // Existing DEX_OPTIONS_ENHANCED structure
  // Smart recommendation parameters
  fromAsset?: string;
  toAsset?: string;
  swapAmount?: string;
  swapValueUSD?: number;
  slippageTolerance?: number; // User's slippage tolerance setting
  // Transaction preview callback for ICP-only swaps
  onShowTransactionPreview?: () => void;
  swapAnalysis?: any; // For checking if it's ICP-only vs cross-chain
  // Callback to trigger swap analysis generation with selected DEX
  onDEXSelectedForICPSwap?: (dexId: string) => void;
}

const CompactDEXSelector: React.FC<CompactDEXSelectorProps> = ({
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
  const [expandedDEX, setExpandedDEX] = useState<string | null>(null);

  // Local slippage tolerance state for UI interaction
  const [localSlippageTolerance, setLocalSlippageTolerance] = useState<number>(slippageTolerance || 5.0);

  // State for agent-driven recommendations
  const [agentQuotes, setAgentQuotes] = useState<DEXQuote[]>([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);

  // Agent-driven smart recommendation logic
  const recommendation = useMemo(() => {
    if (!agentQuotes.length) {
      return { recommendedDEX: null, reasoning: '', badge: null };
    }

    // Find the top-scored quote (DEXRoutingAgent already sorts by score)
    const topQuote = agentQuotes[0];
    const fallbackQuote = agentQuotes.find(q => !q.quoteError);
    const recommendedQuote = topQuote.quoteError ? fallbackQuote : topQuote;

    if (!recommendedQuote) {
      return { recommendedDEX: null, reasoning: 'All DEX agents unavailable', badge: null };
    }

    return {
      recommendedDEX: recommendedQuote.dexName,
      reasoning: recommendedQuote.reason,
      badge: recommendedQuote.badge
    };
  }, [agentQuotes]);

  // Fetch agent quotes when trade parameters change
  useEffect(() => {
    const fetchAgentQuotes = async () => {
      if (!swapValueUSD || !fromAsset || !toAsset || swapValueUSD < 100) {
        setAgentQuotes([]);
        return;
      }

      // Only fetch quotes if this route requires DEX routing
      if (!requiresDEXRouting(fromAsset, toAsset)) {
        setAgentQuotes([]);
        return;
      }

      setIsLoadingQuotes(true);
      try {
        // Convert swapAmount to proper units using correct decimals for each token
        const decimals = DEXUtils.getTokenDecimals(fromAsset);
        const amount = Math.round(parseFloat(swapAmount || '0') * Math.pow(10, decimals));

        // Map mainnet destinations to intermediate ckAssets for DEX routing
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
          toToken: dexToAsset, // Use intermediate ckAsset for DEX routing
          amount: amount,
          urgency: swapValueUSD > 10000 ? 'high' : 'medium',
          userPreference: swapValueUSD > 25000 ? 'most_liquid' : 'lowest_cost',
          slippageTolerance: slippageTolerance
        });

        setAgentQuotes(quotes);
      } catch (error) {
        console.error('Failed to fetch DEX quotes:', error);
        setAgentQuotes([]);
      } finally {
        setIsLoadingQuotes(false);
      }
    };

    // Debounce the quote fetching
    const timer = setTimeout(fetchAgentQuotes, 500);
    return () => clearTimeout(timer);
  }, [swapValueUSD, fromAsset, toAsset, swapAmount]);

  // Transform existing data to compact format with agent-driven smart sorting
  const compactDEXes: CompactDEXView[] = useMemo(() => {
    const dexList = Object.entries(dexData).map(([key, dex]: [string, any]) => {
      // Find corresponding agent quote for this DEX
      const agentQuote = agentQuotes.find(q => q.dexName === key);

      return {
        id: key,
        name: dex.name,
        badge: {
          text: agentQuote?.badge || (dex.badge === 'speed' ? 'FASTEST' : 'MOST LIQUID'),
          type: dex.badge
        },
        primaryFee: agentQuote ? `${agentQuote.fee}%` : (dex.stats['Trading Fee'] || '0.3%'),
        isSelected: selectedDEX === key,
        onSelect: () => setSelectedDEX(key),
        agentQuote: agentQuote // Add agent quote data for enhanced display
      };
    });

    // Agent-driven smart sorting: sort by agent score, then recommended DEX first
    if (agentQuotes.length > 0) {
      return dexList.sort((a, b) => {
        const aQuote = a.agentQuote;
        const bQuote = b.agentQuote;

        // Sort by score (highest first)
        if (aQuote && bQuote) {
          return bQuote.score - aQuote.score;
        }

        // Fallback to original order if no quotes
        return 0;
      });
    }

    // Fallback sorting: recommended DEX first if available
    if (recommendation.recommendedDEX) {
      const recommended = dexList.find(dex => dex.id === recommendation.recommendedDEX);
      const others = dexList.filter(dex => dex.id !== recommendation.recommendedDEX);
      return recommended ? [recommended, ...others] : dexList;
    }

    return dexList;
  }, [dexData, selectedDEX, recommendation.recommendedDEX, agentQuotes, setSelectedDEX]);

  const handleRowClick = (dexId: string) => {
    // Toggle expansion for details
    setExpandedDEX(expandedDEX === dexId ? null : dexId);
  };

  // Helper function to determine if transaction needs DEX routing
  const requiresDEXRouting = (from?: string, to?: string): boolean => {
    if (!from || !to) return false;

    const icpAssets = ['ICP', 'ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT'];
    const mainnetAssets = ['BTC', 'ETH', 'USDC', 'USDT'];

    // If FROM is ICP ecosystem asset, we can route via DEX
    if (!icpAssets.includes(from)) return false;

    // Route to ICP ecosystem assets directly
    if (icpAssets.includes(to)) return true;

    // Route to mainnet assets via intermediate ckAsset
    if (mainnetAssets.includes(to)) return true;

    return false;
  };

  // Helper function to determine if transaction stays within ICP ecosystem
  const isICPEcosystemTransaction = (from?: string, to?: string): boolean => {
    if (!from || !to) return false;

    const icpAssets = ['ICP', 'ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT'];

    // Both assets must be in ICP ecosystem for DEX-only transaction
    return icpAssets.includes(from) && icpAssets.includes(to);
  };

  return (
    <div className="w-full max-w-full sm:max-w-lg">
      {/* Slippage Tolerance Container */}
      <div className="mb-4 p-2 sm:p-3 bg-warning-400/10 border border-warning-400/20 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs sm:text-sm font-semibold text-warning-300">Slippage Tolerance</span>
        </div>
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          {[0.5, 1, 3, 5].map((tolerance) => (
            <button
              key={tolerance}
              onClick={() => {
                setLocalSlippageTolerance(tolerance);
                console.log('Selected slippage tolerance:', tolerance + '%');
              }}
              className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
                localSlippageTolerance === tolerance
                  ? 'bg-warning-400 text-warning-900'
                  : 'bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary'
              }`}
            >
              {tolerance}%
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {compactDEXes.map((dex) => {
          const isRecommended = dex.id === recommendation.recommendedDEX;

          return (
          <div key={dex.id} className="border border-white/10 rounded-xl bg-surface-2 overflow-hidden">
            {/* Tier 1: Compact Row (~60px height) */}
            <div
              className={`cursor-pointer hover:bg-surface-3 transition-all duration-200 ${
                dex.isSelected ? 'bg-primary-600/10 border-primary-500' : ''
              } ${
                isRecommended ? 'ring-2 ring-primary-400/30 bg-primary-600/5' : ''
              }`}
              onClick={() => handleRowClick(dex.id)}
            >
              {/* RECOMMENDED Badge - positioned above DEX info */}
              {isRecommended && (
                <div className="px-4 pt-3 pb-1">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success-400/15 text-success-300">
                    RECOMMENDED
                  </span>
                </div>
              )}

              {/* Main Row - Logo, Badge, Fee, Select Button */}
              <div className={`flex items-center p-2 sm:p-4 ${isRecommended ? 'pt-1 sm:pt-2' : ''}`}>
                {/* DEX Logo + Name */}
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <DEXIcon dex={dex.id} size={20} />
                  <span className="text-sm sm:text-base font-semibold text-text-primary truncate">{dex.name}</span>
                </div>

                {/* Mobile-friendly visual indicator - just a colored dot */}
                {isRecommended && (
                  <div className="w-2 h-2 rounded-full bg-success-400 animate-pulse"></div>
                )}

                {/* Clean Fee Display */}
                <div className="text-xs sm:text-sm text-text-secondary font-medium mx-1 sm:mx-4">
                  {dex.primaryFee}
                </div>

                {/* Select Button */}
                <button
                onClick={(e) => {
                  e.stopPropagation();

                  // CRITICAL: High slippage validation before DEX selection
                  if (dex.agentQuote && localSlippageTolerance) {
                    const isHighSlippage = dex.agentQuote.slippage > localSlippageTolerance;
                    const isExtremeSlippage = dex.agentQuote.slippage > 10.0;

                    if (isExtremeSlippage) {
                      // Block extreme slippage trades
                      console.warn('🚨 BLOCKED: Extreme slippage', dex.agentQuote.slippage.toFixed(2), '% on', dex.id);
                      alert(`⚠️ TRADE BLOCKED\n\nSlippage of ${dex.agentQuote.slippage.toFixed(1)}% is extremely high and could result in significant losses.\n\nConsider:\n• Reducing trade size\n• Using ICP hub routing\n• Waiting for better liquidity`);
                      return;
                    }

                    if (isHighSlippage) {
                      // Warn on high slippage but allow trade
                      const proceed = window.confirm(`⚠️ HIGH SLIPPAGE WARNING\n\nThis trade has ${dex.agentQuote.slippage.toFixed(1)}% slippage, exceeding your ${localSlippageTolerance}% tolerance.\n\nProceed anyway?`);
                      if (!proceed) {
                        console.log('🛑 User declined high slippage trade on', dex.id);
                        return;
                      }
                    }
                  }

                  dex.onSelect();

                  // For DEX-only transactions (ICP ecosystem), trigger swap analysis and Transaction Preview
                  const isICPEcosystemSwap = isICPEcosystemTransaction(fromAsset, toAsset);
                  if (isICPEcosystemSwap && fromAsset && toAsset && swapAmount) {
                    console.log('🎯 DEX Selected for ICP ecosystem swap:', dex.id, fromAsset, '→', toAsset);

                    // Trigger swap analysis generation with selected DEX, then Transaction Preview
                    if (onDEXSelectedForICPSwap) {
                      onDEXSelectedForICPSwap(dex.id);
                    } else if (onShowTransactionPreview) {
                      // Fallback to direct Transaction Preview if swap analysis already exists
                      onShowTransactionPreview();
                    }
                  }
                }}
                className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[44px] min-w-[60px] sm:min-w-[80px] ${
                  dex.isSelected
                    ? 'bg-success-600 text-white'
                    : 'bg-primary-600 hover:bg-primary-500 text-white'
                }`}
              >
                {dex.isSelected ? '✓ Selected' : 'Select'}
              </button>

              {/* Expand Arrow */}
              <div className="ml-1 sm:ml-2 text-text-muted">
                {expandedDEX === dex.id ? (
                  <ChevronUp size={14} className="sm:w-4 sm:h-4" />
                ) : (
                  <ChevronDown size={14} className="sm:w-4 sm:h-4" />
                )}
              </div>
              </div>

              {/* Agent Data Row - Score, Slippage, and Badge info below main row */}
              {dex.agentQuote && dex.agentQuote.slippage !== undefined && swapValueUSD && (
                <div className="px-2 sm:px-4 pb-2 sm:pb-3 text-xs text-text-muted">
                  {(() => {
                    // Generate semantic analysis for dynamic badges
                    const metrics: DEXMetrics = {
                      slippage: dex.agentQuote.slippage,
                      liquidityUsd: dex.agentQuote.liquidityUsd,
                      fee: dex.agentQuote.fee,
                      estimatedSpeed: dex.agentQuote.estimatedSpeed,
                      tradeValueUsd: swapValueUSD,
                      dexName: dex.agentQuote.dexName
                    };

                    const explanation = DEXSemantics.generateExplanation(metrics);
                    const semanticBadge = DEXSemantics.getSemanticBadge(explanation);
                    const semanticColor = DEXSemantics.getSemanticColor(explanation.slippageCategory, explanation.liquidityCategory);

                    return (
                      <>
                        {/* Top row: Dynamic semantic badge and metrics */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              explanation.slippageCategory === 'excellent' ? 'bg-success-400/15 text-success-300' :
                              explanation.slippageCategory === 'good' ? 'bg-primary-600/15 text-primary-400' :
                              explanation.slippageCategory === 'fair' ? 'bg-warning-400/15 text-warning-300' :
                              explanation.slippageCategory === 'poor' ? 'bg-error-400/15 text-error-400' :
                              'bg-error-500/15 text-error-500'
                            }`}>
                              {semanticBadge}
                            </span>
                            <span>Score: {dex.agentQuote.score.toFixed(1)}</span>
                          </div>
                          <div>
                            {dex.agentQuote.liquidityUsd ? `$${(dex.agentQuote.liquidityUsd / 1000).toFixed(0)}K liquidity` : ''}
                          </div>
                        </div>
                        {/* Bottom row: Performance metrics with semantic coloring */}
                        <div className="flex items-center gap-4">
                          <span className={semanticColor}>
                            Slippage: ~{dex.agentQuote.slippage.toFixed(2)}% ({explanation.slippageCategory})
                          </span>
                          <span>Speed: {dex.agentQuote.estimatedSpeed}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Tier 2: Expanded Details (On-demand) */}
            {expandedDEX === dex.id && (
              <div className="border-t border-white/10 bg-surface-1 p-6">
                {/* Dynamic Semantic Explanations */}
                {(() => {
                  // Generate semantic explanation if we have agent quote data (including high slippage cases)
                  if (dex.agentQuote && dex.agentQuote.slippage !== undefined && swapValueUSD) {
                    const metrics: DEXMetrics = {
                      slippage: dex.agentQuote.slippage,
                      liquidityUsd: dex.agentQuote.liquidityUsd,
                      fee: dex.agentQuote.fee,
                      estimatedSpeed: dex.agentQuote.estimatedSpeed,
                      tradeValueUsd: swapValueUSD,
                      dexName: dex.agentQuote.dexName
                    };

                    const explanation = DEXSemantics.generateExplanation(metrics);
                    const semanticColor = DEXSemantics.getSemanticColor(explanation.slippageCategory, explanation.liquidityCategory);

                    return (
                      <>
                        {/* Celebration Message */}
                        {explanation.celebrationMessage && (
                          <div className="mb-4 p-3 bg-success-500/10 border border-success-400/20 rounded-lg">
                            <div className="text-sm font-medium text-success-300">
                              {explanation.celebrationMessage}
                            </div>
                          </div>
                        )}

                        {/* Warning Message */}
                        {explanation.warningMessage && (
                          <div className="mb-4 p-3 bg-error-500/10 border border-error-400/20 rounded-lg">
                            <div className="text-sm font-medium text-error-300">
                              {explanation.warningMessage}
                            </div>
                          </div>
                        )}

                        {/* Overall Recommendation */}
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-text-primary mb-3">Overall Assessment</h4>
                          <div className={`text-sm ${semanticColor} font-medium mb-2`}>
                            {explanation.overallRecommendation}
                          </div>
                        </div>

                        {/* Slippage Analysis */}
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-text-primary mb-3">Price Impact Analysis</h4>
                          <div className="text-sm text-text-secondary leading-relaxed">
                            {explanation.slippageExplanation}
                          </div>
                        </div>

                        {/* Liquidity Analysis */}
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-text-primary mb-3">Liquidity Analysis</h4>
                          <div className="text-sm text-text-secondary leading-relaxed">
                            {explanation.liquidityExplanation}
                          </div>
                        </div>

                        {/* Educational Note */}
                        {explanation.educationalNote && (
                          <div className="mb-6 p-3 bg-primary-600/10 border border-primary-500/20 rounded-lg">
                            <div className="text-sm text-primary-300">
                              {explanation.educationalNote}
                            </div>
                          </div>
                        )}

                        {/* Performance Metrics */}
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-text-primary mb-4">Real-Time Metrics</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-surface-2 rounded-lg p-3">
                              <div className="text-xs text-text-muted mb-1">Slippage</div>
                              <div className={`text-sm font-semibold ${semanticColor}`}>
                                {metrics.slippage.toFixed(2)}% ({explanation.slippageCategory})
                              </div>
                            </div>
                            <div className="bg-surface-2 rounded-lg p-3">
                              <div className="text-xs text-text-muted mb-1">Liquidity</div>
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
                              <div className="text-xs text-text-muted mb-1">Speed</div>
                              <div className="text-sm font-semibold text-text-primary">
                                {metrics.estimatedSpeed}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  }

                  // Fallback to static content when no agent data available
                  return (
                    <>
                      {/* Static Performance Metrics */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-text-primary mb-4">Performance Metrics</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(dexData[dex.id].stats).map(([stat, value]) => (
                            <div key={stat} className="bg-surface-2 rounded-lg p-3">
                              <div className="text-xs text-text-muted mb-1">{stat}</div>
                              <div className="text-sm font-semibold text-text-primary">{String(value)}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Static Advantages */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-text-primary mb-4">Best For</h4>
                        <div className="space-y-2">
                          {dexData[dex.id].advantages.map((advantage, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-success-400 flex-shrink-0"></div>
                              <span className="text-sm text-text-secondary">{advantage}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Static Trade-offs */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-text-primary mb-4">Trade-offs</h4>
                        <div className="space-y-2">
                          {dexData[dex.id].tradeoffs.map((tradeoff, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-warning-400 flex-shrink-0"></div>
                              <span className="text-sm text-text-secondary">{tradeoff}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Compare Toggle */}
                <div className="pt-4 border-t border-white/5">
                  <button className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                    Compare with other DEXs →
                  </button>
                </div>
              </div>
            )}
          </div>
        );
        })}
      </div>
    </div>
  );
};

export default CompactDEXSelector;