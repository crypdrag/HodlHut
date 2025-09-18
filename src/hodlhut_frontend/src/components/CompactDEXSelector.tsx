import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, Star, Zap, Waves } from 'lucide-react';
import DEXIcon from './DEXIcon';
import { dexRoutingAgent } from '../agents/DEXRoutingAgent';
import { DEXQuote } from '../types/dex';

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
}

const CompactDEXSelector: React.FC<CompactDEXSelectorProps> = ({
  selectedDEX,
  setSelectedDEX,
  dexData,
  fromAsset,
  toAsset,
  swapAmount,
  swapValueUSD
}) => {
  const [expandedDEX, setExpandedDEX] = useState<string | null>(null);

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

      setIsLoadingQuotes(true);
      try {
        // Convert swapAmount to proper units (assuming 8 decimals for most tokens)
        const amount = Math.round(parseFloat(swapAmount || '0') * 100000000);

        const quotes = await dexRoutingAgent.getBestRoutes({
          fromToken: fromAsset,
          toToken: toAsset,
          amount: amount,
          urgency: swapValueUSD > 10000 ? 'high' : 'medium',
          userPreference: swapValueUSD > 25000 ? 'most_liquid' : 'lowest_cost'
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

        // Prioritize available quotes over unavailable ones
        if (aQuote && !aQuote.quoteError && bQuote && bQuote.quoteError) return -1;
        if (bQuote && !bQuote.quoteError && aQuote && aQuote.quoteError) return 1;

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

  return (
    <div className="w-full max-w-lg">
      {/* Agent-Driven Smart Recommendation Header */}
      {(recommendation.recommendedDEX && recommendation.reasoning) || isLoadingQuotes ? (
        <div className="mb-4 p-3 bg-primary-600/10 border border-primary-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            {isLoadingQuotes ? (
              <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Star size={16} className="text-primary-400" />
            )}
            <span className="text-sm font-semibold text-primary-400">
              {isLoadingQuotes ? 'Analyzing DEX Options...' : 'Agent Recommendation'}
            </span>
            {recommendation.badge && !isLoadingQuotes && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                recommendation.badge === 'RECOMMENDED' ? 'bg-success-400/15 text-success-300' :
                recommendation.badge === 'FASTEST' ? 'bg-warning-400/15 text-warning-300' :
                recommendation.badge === 'CHEAPEST' ? 'bg-primary-600/15 text-primary-400' :
                'bg-primary-600/15 text-primary-400'
              }`}>
                {recommendation.badge}
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary">
            {isLoadingQuotes ? 'Fetching quotes from all DEX agents...' : recommendation.reasoning}
          </p>
        </div>
      ) : null}

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
              {/* Main Row - Logo, Badge, Fee, Select Button */}
              <div className="flex items-center p-4">
                {/* DEX Logo + Name */}
                <div className="flex items-center gap-3 flex-1">
                  <DEXIcon dex={dex.id} size={24} />
                  <span className="font-semibold text-text-primary">{dex.name}</span>
                  {isRecommended && (
                    <Star size={14} className="text-primary-400 fill-primary-400" />
                  )}
                </div>

                {/* Mobile-friendly visual indicator - just a colored dot */}
                {isRecommended && (
                  <div className="w-2 h-2 rounded-full bg-success-400 animate-pulse"></div>
                )}

                {/* Clean Fee Display */}
                <div className="text-text-secondary font-medium mx-4">
                  {dex.primaryFee}
                  {dex.agentQuote?.quoteError && (
                    <div className="text-xs text-error-400 mt-1">
                      Unavailable
                    </div>
                  )}
                </div>

                {/* Select Button */}
                <button
                onClick={(e) => {
                  e.stopPropagation();
                  dex.onSelect();
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dex.isSelected
                    ? 'bg-success-600 text-white'
                    : 'bg-primary-600 hover:bg-primary-500 text-white'
                }`}
              >
                {dex.isSelected ? '✓ Selected' : 'Select'}
              </button>

              {/* Expand Arrow */}
              <div className="ml-2 text-text-muted">
                {expandedDEX === dex.id ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </div>
              </div>

              {/* Agent Data Row - Score, Slippage, and Badge info below main row */}
              {dex.agentQuote && !dex.agentQuote.quoteError && (
                <div className="px-4 pb-3 text-xs text-text-muted">
                  {/* Top row: Badge and main metrics */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {dex.badge.text && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          dex.badge.text === 'RECOMMENDED' ? 'bg-success-400/15 text-success-300' :
                          dex.badge.text === 'FASTEST' ? 'bg-warning-400/15 text-warning-300' :
                          dex.badge.text === 'CHEAPEST' ? 'bg-primary-600/15 text-primary-400' :
                          dex.badge.text === 'LOWEST_COST' ? 'bg-primary-600/15 text-primary-400' :
                          dex.badge.type === 'speed'
                            ? 'bg-warning-400/15 text-warning-300'
                            : 'bg-primary-600/15 text-primary-400'
                        }`}>
                          {dex.badge.text}
                        </span>
                      )}
                      <span>Score: {dex.agentQuote.score.toFixed(1)}</span>
                    </div>
                    <div>
                      {dex.agentQuote.liquidityUsd ? `$${(dex.agentQuote.liquidityUsd / 1000).toFixed(0)}K liquidity` : ''}
                    </div>
                  </div>
                  {/* Bottom row: Performance metrics */}
                  <div className="flex items-center gap-4">
                    <span>Slippage: ~{dex.agentQuote.slippage.toFixed(2)}%</span>
                    <span>Speed: {dex.agentQuote.estimatedSpeed}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tier 2: Expanded Details (On-demand) */}
            {expandedDEX === dex.id && (
              <div className="border-t border-white/10 bg-surface-1 p-6">
                {/* Stats Grid - Detailed Performance Metrics */}
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

                {/* Advantages */}
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

                {/* Trade-offs */}
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