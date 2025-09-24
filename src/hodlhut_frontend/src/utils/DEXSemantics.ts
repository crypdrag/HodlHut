// DEX Semantic Mapping System
// Converts real-time mathematical data into user-friendly educational explanations

export interface DEXMetrics {
  slippage: number;
  liquidityUsd: number;
  fee: number;
  estimatedSpeed: string;
  tradeValueUsd: number;
  dexName: string;
}

export interface SemanticExplanation {
  slippageCategory: 'excellent' | 'good' | 'fair' | 'poor' | 'dangerous' | 'catastrophic';
  liquidityCategory: 'excellent' | 'good' | 'fair' | 'low' | 'very-low';
  slippageExplanation: string;
  liquidityExplanation: string;
  overallRecommendation: string;
  educationalNote?: string;
  warningMessage?: string;
  celebrationMessage?: string;
}

export class DEXSemantics {

  /**
   * Generate user-friendly semantic explanations from real math data
   */
  static generateExplanation(metrics: DEXMetrics): SemanticExplanation {
    const slippageCategory = this.categorizeSlippage(metrics.slippage);
    const liquidityCategory = this.categorizeLiquidity(metrics.liquidityUsd, metrics.tradeValueUsd);

    return {
      slippageCategory,
      liquidityCategory,
      slippageExplanation: this.getSlippageExplanation(metrics),
      liquidityExplanation: this.getLiquidityExplanation(metrics),
      overallRecommendation: this.getOverallRecommendation(metrics),
      educationalNote: this.getEducationalNote(metrics),
      warningMessage: this.getWarningMessage(metrics),
      celebrationMessage: this.getCelebrationMessage(metrics)
    };
  }

  // Slippage Categorization (Based on Real Math)
  private static categorizeSlippage(slippage: number): SemanticExplanation['slippageCategory'] {
    if (slippage <= 0.5) return 'excellent';
    if (slippage <= 2.0) return 'good';
    if (slippage <= 5.0) return 'fair';
    if (slippage <= 15.0) return 'poor';
    if (slippage <= 50.0) return 'dangerous';
    return 'catastrophic'; // For broken liquidity conditions (>50% slippage)
  }

  // Liquidity Categorization (Contextual to Trade Size)
  private static categorizeLiquidity(
    liquidityUsd: number,
    tradeValueUsd: number
  ): SemanticExplanation['liquidityCategory'] {
    const liquidityRatio = liquidityUsd / tradeValueUsd;

    if (liquidityRatio >= 1000) return 'excellent';  // $1M+ liquidity for $1K trade
    if (liquidityRatio >= 100) return 'good';        // $100K+ liquidity for $1K trade
    if (liquidityRatio >= 20) return 'fair';         // $20K+ liquidity for $1K trade
    if (liquidityRatio >= 5) return 'low';           // $5K+ liquidity for $1K trade
    return 'very-low';                               // Less than 5x trade size
  }

  // Slippage Explanations (Ultra Mobile-Optimized)
  private static getSlippageExplanation(metrics: DEXMetrics): string {
    const { slippage, tradeValueUsd } = metrics;
    const dollarImpact = (tradeValueUsd * slippage) / 100;

    switch (this.categorizeSlippage(slippage)) {
      case 'excellent':
        return `Excellent execution. ~${slippage.toFixed(2)}% slippage (~$${dollarImpact.toFixed(2)}).`;

      case 'good':
        return `Good execution. ~${slippage.toFixed(1)}% slippage (~$${dollarImpact.toFixed(2)}).`;

      case 'fair':
        return `Fair execution. ~${slippage.toFixed(1)}% slippage (~$${dollarImpact.toFixed(2)}).`;

      case 'poor':
        return `High slippage. ~${slippage.toFixed(1)}% slippage (~$${dollarImpact.toFixed(2)}).`;

      case 'dangerous':
        return `Very high slippage! ~${slippage.toFixed(0)}% loss (~$${dollarImpact.toFixed(2)}).`;

      case 'catastrophic':
        return `EXTREME SLIPPAGE: ~${slippage.toFixed(0)}% loss (~$${dollarImpact.toFixed(2)}).`;
    }
  }

  // Liquidity Explanations (Ultra Mobile-Optimized)
  private static getLiquidityExplanation(metrics: DEXMetrics): string {
    const { liquidityUsd, tradeValueUsd } = metrics;

    switch (this.categorizeLiquidity(liquidityUsd, tradeValueUsd)) {
      case 'excellent':
        return `Excellent liquidity. $${(liquidityUsd/1000).toFixed(0)}K available.`;

      case 'good':
        return `Good liquidity. $${(liquidityUsd/1000).toFixed(0)}K available.`;

      case 'fair':
        return `Fair liquidity. $${(liquidityUsd/1000).toFixed(0)}K available.`;

      case 'low':
        return `Lower liquidity. $${(liquidityUsd/1000).toFixed(0)}K available.`;

      case 'very-low':
        return `Low liquidity. $${(liquidityUsd/1000).toFixed(0)}K available.`;
    }
  }

  // Overall Recommendations (Mobile-Optimized)
  private static getOverallRecommendation(metrics: DEXMetrics): string {
    const slippageCategory = this.categorizeSlippage(metrics.slippage);
    const liquidityCategory = this.categorizeLiquidity(metrics.liquidityUsd, metrics.tradeValueUsd);

    // Excellent scenarios
    if (slippageCategory === 'excellent' && ['excellent', 'good'].includes(liquidityCategory)) {
      return 'Excellent option. Optimal liquidity and minimal slippage.';
    }

    // Good scenarios
    if (slippageCategory === 'good' && liquidityCategory !== 'very-low') {
      return 'Good option. Reasonable slippage with adequate liquidity for efficient execution.';
    }

    // Warning scenarios
    if (slippageCategory === 'poor' || liquidityCategory === 'very-low') {
      return 'Consider alternatives. High slippage or low liquidity detected.';
    }

    // Dangerous scenarios
    if (slippageCategory === 'dangerous') {
      return 'Proceed with caution. Very high slippage detected.';
    }

    // Catastrophic scenarios
    if (slippageCategory === 'catastrophic') {
      return 'DO NOT TRADE: Catastrophically insufficient liquidity will result in severe losses.';
    }

    // Default fair scenarios
    return 'Fair option. Acceptable execution with moderate slippage.';
  }

  // Educational Notes (Mobile-Optimized)
  private static getEducationalNote(metrics: DEXMetrics): string | undefined {
    // Remove educational notes for mobile - too verbose for mobile viewport
    return undefined;
  }

  // Warning Messages (Mobile-Optimized)
  private static getWarningMessage(metrics: DEXMetrics): string | undefined {
    if (metrics.slippage > 15.0) {
      return `⚠️ Very high slippage! You may lose $${((metrics.tradeValueUsd * metrics.slippage) / 100).toFixed(2)}.`;
    }

    if (this.categorizeLiquidity(metrics.liquidityUsd, metrics.tradeValueUsd) === 'very-low') {
      return '⚠️ Low liquidity detected. Poor execution expected.';
    }

    return undefined;
  }

  // Celebration Messages (Mobile-Optimized)
  private static getCelebrationMessage(metrics: DEXMetrics): string | undefined {
    const slippageCategory = this.categorizeSlippage(metrics.slippage);
    const liquidityCategory = this.categorizeLiquidity(metrics.liquidityUsd, metrics.tradeValueUsd);

    if (slippageCategory === 'excellent' && liquidityCategory === 'excellent') {
      return '🎉 Perfect conditions! Excellent liquidity and minimal slippage.';
    }

    if (metrics.slippage < 0.5) {
      return '✨ Outstanding execution! Less than 0.5% slippage.';
    }

    return undefined;
  }

  // Utility: Get semantic color for UI
  static getSemanticColor(
    slippageCategory: SemanticExplanation['slippageCategory'],
    liquidityCategory: SemanticExplanation['liquidityCategory']
  ): string {
    if (slippageCategory === 'catastrophic') return 'text-red-600';
    if (slippageCategory === 'excellent') return 'text-success-400';
    if (slippageCategory === 'good') return 'text-primary-400';
    if (slippageCategory === 'fair') return 'text-warning-400';
    if (slippageCategory === 'poor') return 'text-error-400';
    if (slippageCategory === 'dangerous') return 'text-error-500';
    return 'text-text-secondary';
  }

  // Utility: Get semantic badge text
  static getSemanticBadge(explanation: SemanticExplanation): string {
    if (explanation.slippageCategory === 'catastrophic') return 'DO NOT TRADE';
    if (explanation.celebrationMessage) return 'EXCELLENT';
    if (explanation.slippageCategory === 'excellent') return 'OPTIMAL';
    if (explanation.slippageCategory === 'good') return 'GOOD';
    if (explanation.slippageCategory === 'fair') return 'FAIR';
    if (explanation.warningMessage) return 'CAUTION';
    return 'REVIEW';
  }
}