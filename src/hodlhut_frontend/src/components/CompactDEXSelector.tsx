import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Star, Zap, Waves } from 'lucide-react';
import DEXIcon from './DEXIcon';

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

  // Smart recommendation logic based on trade parameters
  const recommendation = useMemo(() => {
    if (!swapValueUSD || !fromAsset || !toAsset) {
      return { recommendedDEX: null, reasoning: '' };
    }

    let recommendedDEX = 'KongSwap'; // Default to lower fees
    let reasoning = '';

    if (swapValueUSD > 10000) {
      recommendedDEX = 'ICPSwap';
      reasoning = `Large trade ($${Math.round(swapValueUSD).toLocaleString()}) - prioritizing liquidity and price discovery`;
    } else if (swapValueUSD < 1000) {
      recommendedDEX = 'KongSwap';
      reasoning = `Small trade ($${Math.round(swapValueUSD).toLocaleString()}) - prioritizing lower fees`;
    } else {
      recommendedDEX = 'KongSwap';
      reasoning = `Medium trade ($${Math.round(swapValueUSD).toLocaleString()}) - balanced approach favoring speed`;
    }

    return { recommendedDEX, reasoning };
  }, [swapValueUSD, fromAsset, toAsset]);

  // Transform existing data to compact format with smart sorting
  const compactDEXes: CompactDEXView[] = useMemo(() => {
    const dexList = Object.entries(dexData).map(([key, dex]: [string, any]) => ({
      id: key,
      name: dex.name,
      badge: {
        text: dex.badge === 'speed' ? 'FASTEST' : 'MOST LIQUID',
        type: dex.badge
      },
      primaryFee: dex.stats['Trading Fee'] || '0.3%',
      isSelected: selectedDEX === key,
      onSelect: () => setSelectedDEX(key)
    }));

    // Smart sorting: recommended DEX first, then others
    if (recommendation.recommendedDEX) {
      const recommended = dexList.find(dex => dex.id === recommendation.recommendedDEX);
      const others = dexList.filter(dex => dex.id !== recommendation.recommendedDEX);
      return recommended ? [recommended, ...others] : dexList;
    }

    return dexList;
  }, [dexData, selectedDEX, recommendation.recommendedDEX, setSelectedDEX]);

  const handleRowClick = (dexId: string) => {
    // Toggle expansion for details
    setExpandedDEX(expandedDEX === dexId ? null : dexId);
  };

  return (
    <div className="w-full max-w-lg">
      {/* Smart Recommendation Header */}
      {recommendation.recommendedDEX && recommendation.reasoning && (
        <div className="mb-4 p-3 bg-primary-600/10 border border-primary-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Star size={16} className="text-primary-400" />
            <span className="text-sm font-semibold text-primary-400">Smart Recommendation</span>
          </div>
          <p className="text-xs text-text-secondary">{recommendation.reasoning}</p>
        </div>
      )}

      <div className="space-y-2">
        {compactDEXes.map((dex) => {
          const isRecommended = dex.id === recommendation.recommendedDEX;

          return (
          <div key={dex.id} className="border border-white/10 rounded-xl bg-surface-2 overflow-hidden">
            {/* Tier 1: Compact Row (~60px height) */}
            <div
              className={`flex items-center p-4 cursor-pointer hover:bg-surface-3 transition-all duration-200 ${
                dex.isSelected ? 'bg-primary-600/10 border-primary-500' : ''
              } ${
                isRecommended ? 'ring-2 ring-primary-400/30 bg-primary-600/5' : ''
              }`}
              onClick={() => handleRowClick(dex.id)}
            >
              {/* DEX Logo + Name */}
              <div className="flex items-center gap-3 flex-1">
                <DEXIcon dex={dex.id} size={24} />
                <span className="font-semibold text-text-primary">{dex.name}</span>
                {isRecommended && (
                  <Star size={14} className="text-primary-400 fill-primary-400" />
                )}
              </div>

              {/* Badge */}
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                dex.badge.type === 'speed'
                  ? 'bg-warning-400/15 text-warning-300'
                  : 'bg-primary-600/15 text-primary-400'
              }`}>
                {dex.badge.text}
              </div>

              {/* Primary Fee */}
              <div className="text-text-secondary font-medium mx-4">
                {dex.primaryFee}
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