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
  // Callback to provide cycling function to parent
  onCycleDEX?: (cycleFunc: () => void) => void;
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
  onDEXSelectedForICPSwap,
  onCycleDEX
}) => {
  const [expandedDEX, setExpandedDEX] = useState<string | null>(null);

  // Local slippage tolerance state for UI interaction
  const [localSlippageTolerance, setLocalSlippageTolerance] = useState<number>(slippageTolerance || 5.0);

  // Current DEX index for cycling through options (0 = top recommended)
  const [currentDEXIndex, setCurrentDEXIndex] = useState<number>(0);

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
        // Map mainnet assets to intermediate ckAssets for DEX routing
        const getIntermediateAsset = (mainnetAsset: string): string => {
          const mapping: Record<string, string> = {
            'BTC': 'ckBTC',
            'ETH': 'ckETH',
            'USDC': 'ckUSDC',
            'USDT': 'ckUSDT'
          };
          return mapping[mainnetAsset] || mainnetAsset;
        };

        // Map BOTH from and to assets to their ckAsset equivalents for DEX routing
        const dexFromAsset = getIntermediateAsset(fromAsset);
        const dexToAsset = getIntermediateAsset(toAsset);

        // Convert swapAmount to proper units using decimals for the intermediate ckAsset
        const decimals = DEXUtils.getTokenDecimals(dexFromAsset);
        const amount = Math.round(parseFloat(swapAmount || '0') * Math.pow(10, decimals));

        const quotes = await dexRoutingAgent.getBestRoutes({
          fromToken: dexFromAsset, // Use intermediate ckAsset (e.g., ckETH instead of ETH)
          toToken: dexToAsset,     // Use intermediate ckAsset (e.g., ckBTC instead of BTC)
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

  // Transform existing data to compact format - ONLY SHOW TOP RECOMMENDED DEX
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

    // Sort by agent score (highest first)
    let sortedList = dexList;
    if (agentQuotes.length > 0) {
      sortedList = dexList.sort((a, b) => {
        const aQuote = a.agentQuote;
        const bQuote = b.agentQuote;

        // Sort by score (highest first)
        if (aQuote && bQuote) {
          return bQuote.score - aQuote.score;
        }

        // Fallback to original order if no quotes
        return 0;
      });
    } else if (recommendation.recommendedDEX) {
      // Fallback sorting: recommended DEX first if available
      const recommended = dexList.find(dex => dex.id === recommendation.recommendedDEX);
      const others = dexList.filter(dex => dex.id !== recommendation.recommendedDEX);
      sortedList = recommended ? [recommended, ...others] : dexList;
    }

    // Return ALL DEXs (sorted by score/recommendation)
    return sortedList;
  }, [dexData, selectedDEX, recommendation.recommendedDEX, agentQuotes, setSelectedDEX]);

  // Get the current DEX to display based on cycling index
  const currentDEX = compactDEXes[currentDEXIndex] || compactDEXes[0];

  // Cycle to next DEX when "DEX Options" button is clicked
  const handleCycleDEX = () => {
    setCurrentDEXIndex((prevIndex) => (prevIndex + 1) % compactDEXes.length);
  };

  // Provide cycling function to parent on mount
  useEffect(() => {
    if (onCycleDEX) {
      onCycleDEX(handleCycleDEX);
    }
  }, [onCycleDEX]);

  const handleRowClick = (dexId: string) => {
    // Toggle expansion for details
    setExpandedDEX(expandedDEX === dexId ? null : dexId);
  };

  // Helper function to determine if transaction needs DEX routing
  const requiresDEXRouting = (from?: string, to?: string): boolean => {
    if (!from || !to) return false;

    const icpAssets = ['ICP', 'ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT'];
    const mainnetAssets = ['BTC', 'ETH', 'USDC', 'USDT'];

    // Accept both ICP ecosystem assets AND mainnet assets as FROM
    // Mainnet assets will be bridged to ckAssets first, then routed via DEX
    const fromIsICP = icpAssets.includes(from);
    const fromIsMainnet = mainnetAssets.includes(from);

    if (!fromIsICP && !fromIsMainnet) return false;

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

  // Slippage compatibility checking functions
  const isDEXCompatibleWithSlippage = (dexId: string): boolean => {
    if (!localSlippageTolerance) return true; // If no slippage set, allow all DEXs

    const agentQuote = agentQuotes.find(quote => quote.dexName === dexId);
    if (!agentQuote) return true; // If no quote data, don't disable (fallback)

    return agentQuote.slippage <= localSlippageTolerance;
  };

  const getRequiredSlippageForDEX = (dexId: string): number | null => {
    const agentQuote = agentQuotes.find(quote => quote.dexName === dexId);
    return agentQuote ? agentQuote.slippage : null;
  };

  const getSlippageStatusMessage = (dexId: string): string | null => {
    const requiredSlippage = getRequiredSlippageForDEX(dexId);
    if (!requiredSlippage || !localSlippageTolerance) return null;

    if (requiredSlippage > localSlippageTolerance) {
      return `Requires ${requiredSlippage.toFixed(1)}% slippage (current: ${localSlippageTolerance}%)`;
    }

    return null;
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
        {/* Only show the current DEX (cycling through options) */}
        {currentDEX && (()  => {
          const dex = currentDEX;
          const isRecommended = currentDEXIndex === 0; // First DEX is always recommended
          const isCompatible = isDEXCompatibleWithSlippage(dex.id);
          const slippageMessage = getSlippageStatusMessage(dex.id);

          return (
          <div key={dex.id} className={`border rounded-xl overflow-hidden transition-all duration-200 ${
            isCompatible
              ? 'border-white/10 bg-surface-2'
              : 'border-error-400/40 bg-surface-2 opacity-60'
          }`}>
            {/* Tier 1: Compact Row (~60px height) */}
            <div
              className={`cursor-pointer transition-all duration-200 ${
                isCompatible
                  ? `hover:bg-surface-3 ${
                      dex.isSelected ? 'bg-primary-600/10 border-primary-500' : ''
                    } ${
                      isRecommended ? 'ring-2 ring-primary-400/30 bg-primary-600/5' : ''
                    }`
                  : 'bg-error-600/5 hover:bg-error-600/10'
              }`}
              onClick={() => handleRowClick(dex.id)}
              title={!isCompatible && slippageMessage ? `${slippageMessage} - Click to expand for details` : undefined}
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
                  <div className="relative">
                    <DEXIcon dex={dex.id} size={20} />
                    {!isCompatible && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm sm:text-base font-semibold truncate ${
                      isCompatible ? 'text-text-primary' : 'text-text-secondary'
                    }`}>{dex.name}</span>
                    {!isCompatible && slippageMessage && (
                      <div className="text-xs text-error-400 truncate">{slippageMessage}</div>
                    )}
                  </div>
                </div>

                {/* Mobile-friendly visual indicator - just a colored dot */}
                {isRecommended && (
                  <div className="w-2 h-2 rounded-full bg-success-400 animate-pulse"></div>
                )}

                {/* Clean Fee Display */}
                <div className="text-xs sm:text-sm text-text-secondary font-medium mx-1 sm:mx-4">
                  {dex.primaryFee}
                </div>

                {/* Select Button - Only show for compatible DEXs */}
                {isCompatible && (
                  <button
                  onClick={(e) => {
                    e.stopPropagation();

                    // Original slippage validation logic for extreme cases
                    if (dex.agentQuote && localSlippageTolerance) {
                      const isExtremeSlippage = dex.agentQuote.slippage > 10.0;

                      if (isExtremeSlippage) {
                        // Block extreme slippage trades
                        console.warn('🚨 BLOCKED: Extreme slippage', dex.agentQuote.slippage.toFixed(2), '% on', dex.id);
                        alert(`⚠️ TRADE BLOCKED\n\nSlippage of ${dex.agentQuote.slippage.toFixed(1)}% is extremely high and could result in significant losses.\n\nConsider:\n• Reducing trade size\n• Using ICP hub routing\n• Waiting for better liquidity`);
                        return;
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
                )}

                {/* Empty space for incompatible DEXs to maintain layout */}
                {!isCompatible && (
                  <div className="px-2 sm:px-4 py-2 min-h-[44px] min-w-[60px] sm:min-w-[80px]">
                    {/* Empty space that maintains layout - no interaction needed */}
                  </div>
                )}

              {/* Expand Arrow - More prominent for incompatible DEXs */}
              <div className={`ml-1 sm:ml-2 transition-colors ${
                !isCompatible ? 'text-error-400' : 'text-text-muted'
              }`}>
                {expandedDEX === dex.id ? (
                  <ChevronUp size={14} className="sm:w-4 sm:h-4" />
                ) : (
                  <ChevronDown size={14} className="sm:w-4 sm:h-4" />
                )}
              </div>
              </div>

              {/* Mobile-Optimized Badge Row - Progressive Disclosure */}
              {dex.agentQuote && dex.agentQuote.slippage !== undefined && swapValueUSD && (
                <div className="px-2 sm:px-4 pb-2 sm:pb-3">
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
                        {/* Mobile: Single row with essential info only */}
                        <div className="flex items-center justify-between sm:hidden">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            explanation.slippageCategory === 'excellent' ? 'bg-success-400/15 text-success-300' :
                            explanation.slippageCategory === 'good' ? 'bg-primary-600/15 text-primary-400' :
                            explanation.slippageCategory === 'fair' ? 'bg-warning-400/15 text-warning-300' :
                            explanation.slippageCategory === 'poor' ? 'bg-error-400/15 text-error-400' :
                            'bg-error-500/15 text-error-500'
                          }`}>
                            {semanticBadge}
                          </span>
                          <span className={`text-xs font-medium ${semanticColor}`}>
                            {dex.agentQuote.slippage.toFixed(1)}%
                          </span>
                        </div>

                        {/* Desktop: Full detailed layout */}
                        <div className="hidden sm:block">
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
                              <span className="text-xs text-text-muted">Score: {dex.agentQuote.score.toFixed(1)}</span>
                            </div>
                            <div className="text-xs text-text-muted">
                              {dex.agentQuote.liquidityUsd ? `$${(dex.agentQuote.liquidityUsd / 1000).toFixed(0)}K liquidity` : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-text-muted">
                            <span className={semanticColor}>
                              Slippage: ~{dex.agentQuote.slippage.toFixed(2)}% ({explanation.slippageCategory})
                            </span>
                            <span>Speed: {dex.agentQuote.estimatedSpeed}</span>
                          </div>
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
                        <div className="mb-4 sm:mb-6">
                          <h4 className="text-xs sm:text-sm font-semibold text-text-primary mb-2 sm:mb-3">Overall Assessment</h4>
                          <div className={`text-xs sm:text-sm ${semanticColor} font-medium mb-1 sm:mb-2`}>
                            {explanation.overallRecommendation}
                          </div>
                        </div>

                        {/* Slippage Analysis */}
                        <div className="mb-4 sm:mb-6">
                          <h4 className="text-xs sm:text-sm font-semibold text-text-primary mb-2 sm:mb-3">Price Impact Analysis</h4>
                          <div className="text-xs sm:text-sm text-text-secondary leading-snug sm:leading-relaxed">
                            {explanation.slippageExplanation}
                          </div>
                        </div>

                        {/* Liquidity Analysis */}
                        <div className="mb-4 sm:mb-6">
                          <h4 className="text-xs sm:text-sm font-semibold text-text-primary mb-2 sm:mb-3">Liquidity Analysis</h4>
                          <div className="text-xs sm:text-sm text-text-secondary leading-snug sm:leading-relaxed">
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

              </div>
            )}
          </div>
        );
        })()}
      </div>
    </div>
  );
};

export default CompactDEXSelector;