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

  // Slippage Explanations (User Impact Focus)
  private static getSlippageExplanation(metrics: DEXMetrics): string {
    const { slippage, tradeValueUsd } = metrics;
    const dollarImpact = (tradeValueUsd * slippage) / 100;

    switch (this.categorizeSlippage(slippage)) {
      case 'excellent':
        return `Excellent execution! You'll get ~${slippage.toFixed(2)}% less than expected (about $${dollarImpact.toFixed(2)}). This is normal market movement.`;

      case 'good':
        return `Good execution. You'll get ~${slippage.toFixed(1)}% less than expected (about $${dollarImpact.toFixed(2)}). This is reasonable for current market conditions.`;

      case 'fair':
        return `Fair execution. You'll get ~${slippage.toFixed(1)}% less than expected (about $${dollarImpact.toFixed(2)}). Consider if this trade size is optimal.`;

      case 'poor':
        return `High slippage detected. You'll get ~${slippage.toFixed(1)}% less than expected (about $${dollarImpact.toFixed(2)}). Consider smaller trade size or different timing.`;

      case 'dangerous':
        return `Very high slippage! You'll get ~${slippage.toFixed(0)}% less than expected (about $${dollarImpact.toFixed(2)}). This trade size may be too large for current liquidity.`;

      case 'catastrophic':
        return `CATASTROPHIC LIQUIDITY FAILURE: This pool has critically insufficient liquidity. You would lose ~${slippage.toFixed(0)}% of your trade value (about $${dollarImpact.toFixed(2)}) due to broken market conditions. This represents a liquidity crisis, not normal trading.`;
    }
  }

  // Liquidity Explanations (Educational Focus)
  private static getLiquidityExplanation(metrics: DEXMetrics): string {
    const { liquidityUsd, tradeValueUsd } = metrics;
    const liquidityRatio = liquidityUsd / tradeValueUsd;

    switch (this.categorizeLiquidity(liquidityUsd, tradeValueUsd)) {
      case 'excellent':
        return `Excellent liquidity! $${(liquidityUsd/1000).toFixed(0)}K available means your trade barely affects the price. You get the best possible rate.`;

      case 'good':
        return `Good liquidity. $${(liquidityUsd/1000).toFixed(0)}K available provides stable pricing for your $${(tradeValueUsd/1000).toFixed(1)}K trade.`;

      case 'fair':
        return `Fair liquidity. $${(liquidityUsd/1000).toFixed(0)}K available covers your trade, but larger amounts might get worse rates.`;

      case 'low':
        return `Lower liquidity. $${(liquidityUsd/1000).toFixed(0)}K available means your trade impacts the price more than ideal.`;

      case 'very-low':
        return `Very low liquidity. Only $${(liquidityUsd/1000).toFixed(0)}K available for a $${(tradeValueUsd/1000).toFixed(1)}K trade. Price impact will be significant.`;
    }
  }

  // Overall Recommendations (Action-Oriented)
  private static getOverallRecommendation(metrics: DEXMetrics): string {
    const slippageCategory = this.categorizeSlippage(metrics.slippage);
    const liquidityCategory = this.categorizeLiquidity(metrics.liquidityUsd, metrics.tradeValueUsd);

    // Excellent scenarios
    if (slippageCategory === 'excellent' && ['excellent', 'good'].includes(liquidityCategory)) {
      return 'Excellent choice! Great liquidity and minimal slippage make this optimal for your trade.';
    }

    // Good scenarios
    if (slippageCategory === 'good' && liquidityCategory !== 'very-low') {
      return 'Good option. Reasonable slippage with adequate liquidity for efficient execution.';
    }

    // Warning scenarios
    if (slippageCategory === 'poor' || liquidityCategory === 'very-low') {
      return 'Consider alternatives. High slippage or low liquidity may result in unfavorable execution.';
    }

    // Dangerous scenarios
    if (slippageCategory === 'dangerous') {
      return 'Proceed with caution. Very high slippage detected - consider reducing trade size or trying later.';
    }

    // Catastrophic scenarios
    if (slippageCategory === 'catastrophic') {
      return 'DO NOT TRADE: This pool has catastrophically insufficient liquidity. Trading here will result in severe financial loss due to broken market conditions. Consider using a different DEX or waiting for liquidity to improve.';
    }

    // Default fair scenarios
    return 'Fair option. Acceptable execution conditions with moderate slippage and liquidity.';
  }

  // Educational Notes (Learning Opportunities)
  private static getEducationalNote(metrics: DEXMetrics): string | undefined {
    const { dexName, slippage, liquidityUsd } = metrics;

    if (slippage > 50.0) {
      return '📚 LIQUIDITY CRISIS EDUCATION: This pool has insufficient funds to execute trades efficiently. AMM pools need balanced token reserves to function properly. When liquidity drops below critical levels, price impact becomes extreme and fees can spike dramatically. This is why diversified liquidity across multiple DEXs is important for healthy DeFi ecosystems.';
    }

    if (dexName === 'ICDEX' && slippage < 1.0) {
      return '💡 Orderbook DEXs like ICDEX often provide better execution for larger trades because you trade directly with other users instead of an automated pool.';
    }

    if (slippage > 5.0) {
      return '💡 High slippage usually means your trade size is large relative to available liquidity. Splitting into smaller trades or waiting for better liquidity can help.';
    }

    if (liquidityUsd > 1000000) {
      return '💡 High liquidity means many traders are providing funds to this pool, creating stable prices and better execution for everyone.';
    }

    return undefined;
  }

  // Warning Messages (Protective)
  private static getWarningMessage(metrics: DEXMetrics): string | undefined {
    if (metrics.slippage > 15.0) {
      return `⚠️ Very high slippage! You may lose $${((metrics.tradeValueUsd * metrics.slippage) / 100).toFixed(2)} to price impact alone.`;
    }

    if (this.categorizeLiquidity(metrics.liquidityUsd, metrics.tradeValueUsd) === 'very-low') {
      return '⚠️ Low liquidity detected. Your trade represents a significant portion of available funds, leading to poor execution.';
    }

    return undefined;
  }

  // Celebration Messages (Positive Reinforcement)
  private static getCelebrationMessage(metrics: DEXMetrics): string | undefined {
    const slippageCategory = this.categorizeSlippage(metrics.slippage);
    const liquidityCategory = this.categorizeLiquidity(metrics.liquidityUsd, metrics.tradeValueUsd);

    if (slippageCategory === 'excellent' && liquidityCategory === 'excellent') {
      return '🎉 Perfect conditions! Excellent liquidity and minimal slippage mean you get maximum value from your trade.';
    }

    if (metrics.slippage < 0.5) {
      return '✨ Outstanding execution! Less than 0.5% slippage is excellent for DeFi trading.';
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