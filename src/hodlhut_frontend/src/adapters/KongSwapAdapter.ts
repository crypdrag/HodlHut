// KongSwap Adapter Stub
// Fast and efficient DEX optimized for speed and low fees, ideal for small to medium trades

import {
  DEXAdapter,
  DEXQuote,
  MOCK_EXCHANGE_RATES,
  MOCK_LIQUIDITY_USD,
  DEXUtils
} from '../types/dex';

export class KongSwapAdapter implements DEXAdapter {
  private readonly dexName = 'KongSwap';
  private readonly supportedPairs = [
    ['ICP', 'ckBTC'],
    ['ICP', 'ckETH'],
    ['ICP', 'ckUSDC'],
    ['ICP', 'ckUSDT'],
    ['ckBTC', 'ckETH'],
    ['ckBTC', 'ckUSDC'],
    ['ckBTC', 'ckUSDT'],
    ['ckETH', 'ckUSDC'],
    ['ckETH', 'ckUSDT'],
    ['ckUSDC', 'ckUSDT']
  ];

  getDEXName(): string {
    return this.dexName;
  }

  async isAvailable(): Promise<boolean> {
    // Simulate 97% uptime for KongSwap (very reliable)
    return Math.random() > 0.03;
  }

  async getQuote(fromToken: string, toToken: string, amount: number): Promise<DEXQuote> {
    try {
      // Check if pair is supported
      const pairSupported = this.supportedPairs.some(
        ([a, b]) => (a === fromToken && b === toToken) || (a === toToken && b === fromToken)
      );

      if (!pairSupported) {
        return this.createErrorQuote(fromToken, toToken, amount, 'Unsupported trading pair on KongSwap');
      }

      // Check availability
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return this.createErrorQuote(fromToken, toToken, amount, 'KongSwap temporarily unavailable');
      }

      // Get base exchange rate
      const exchangeRate = MOCK_EXCHANGE_RATES[fromToken]?.[toToken];
      if (!exchangeRate) {
        return this.createErrorQuote(fromToken, toToken, amount, 'No exchange rate available');
      }

      // Calculate trade details
      const tradeAmountUsd = DEXUtils.convertToUSD(amount, fromToken);
      const liquidityUsd = MOCK_LIQUIDITY_USD[fromToken]?.[toToken] || 1000000;

      // KongSwap characteristics: Fast execution with competitive fees
      const baseFee = 0.2; // 0.2% base fee (lower than ICPSwap)
      const efficientSlippage = DEXUtils.calculateSlippage(tradeAmountUsd, liquidityUsd);

      // KongSwap optimizes for speed and efficiency
      const speedBonus = tradeAmountUsd < 25000 ? 0.02 : 0; // Reduced slippage for smaller trades
      const finalSlippage = Math.max(0.06, efficientSlippage - speedBonus);

      // Calculate output amount with slippage
      const theoreticalOutput = amount * exchangeRate;
      const slippageReduction = theoreticalOutput * (finalSlippage / 100);
      const outputAmount = Math.floor(theoreticalOutput - slippageReduction);

      // Calculate fee amount
      const feeAmount = Math.floor(amount * (baseFee / 100));

      // Speed is KongSwap's main advantage
      let estimatedSpeed: string;
      if (tradeAmountUsd > 100000) {
        estimatedSpeed = "15-30 seconds"; // Even large trades are fast
      } else if (tradeAmountUsd > 10000) {
        estimatedSpeed = "8-20 seconds"; // Medium trades
      } else {
        estimatedSpeed = "5-15 seconds"; // Small trades are very fast
      }

      // Calculate score (KongSwap excels at speed and low fees)
      const score = DEXUtils.calculateScore(finalSlippage, baseFee, liquidityUsd, estimatedSpeed);

      // Add bonus for speed and efficiency
      let speedBonus_score = 0;
      if (tradeAmountUsd < 50000) speedBonus_score += 8; // Speed advantage for smaller trades
      if (baseFee < 0.25) speedBonus_score += 5; // Low fee bonus
      if (estimatedSpeed.includes('5-15')) speedBonus_score += 7; // Very fast execution

      const finalScore = Math.min(100, score + speedBonus_score);

      // Determine badge based on trade characteristics
      let badge: string | undefined;
      let reason: string;

      if (tradeAmountUsd < 10000) {
        badge = "FASTEST";
        reason = "Optimized for fast execution of small to medium trades";
      } else if (tradeAmountUsd < 50000) {
        badge = "RECOMMENDED";
        reason = "Best balance of speed, fees, and execution quality";
      } else if (baseFee < 0.25) {
        badge = "CHEAPEST";
        reason = "Lowest fees with reliable execution";
      } else {
        reason = "Fast and efficient DEX with competitive fees";
      }

      return {
        dexName: this.dexName,
        path: [fromToken, toToken],
        slippage: parseFloat(finalSlippage.toFixed(3)),
        fee: baseFee,
        estimatedSpeed,
        liquidityUsd,
        score: parseFloat(finalScore.toFixed(1)),
        badge: badge as any,
        reason
      };

    } catch (error) {
      console.error('KongSwap quote error:', error);
      return this.createErrorQuote(fromToken, toToken, amount, 'Failed to get KongSwap quote');
    }
  }

  private createErrorQuote(fromToken: string, toToken: string, amount: number, errorMessage: string): DEXQuote {
    return {
      dexName: this.dexName,
      path: [fromToken, toToken],
      slippage: 0,
      fee: 0,
      estimatedSpeed: "N/A",
      liquidityUsd: 0,
      score: 0,
      reason: "KongSwap unavailable",
      quoteError: errorMessage
    };
  }

  // Additional KongSwap-specific methods for future integration

  async getSwapRoute(fromToken: string, toToken: string): Promise<any> {
    // Stub for optimal route calculation
    return {
      path: [fromToken, toToken],
      hops: 1, // Direct swap most efficient
      estimatedGasCost: 0.001, // Very low gas costs
      routeOptimal: true
    };
  }

  async getInstantQuote(fromToken: string, toToken: string, amount: number): Promise<any> {
    // Stub for instant quote (KongSwap specialty)
    const exchangeRate = MOCK_EXCHANGE_RATES[fromToken]?.[toToken] || 1;
    const output = amount * exchangeRate;

    return {
      inputAmount: amount,
      outputAmount: Math.floor(output * 0.998), // Very minimal slippage
      executionTime: "5-15 seconds",
      priceImpact: 0.05,
      guaranteed: true // KongSwap guarantees execution
    };
  }

  async executeSwapFast(fromToken: string, toToken: string, amount: number): Promise<any> {
    // Stub for fast swap execution
    return {
      transactionId: `kong_${Date.now()}`,
      status: 'executing',
      estimatedCompletion: '5-15 seconds',
      priority: 'high',
      fromToken,
      toToken,
      inputAmount: amount,
      fastTrack: true
    };
  }

  async getSpeedMetrics(): Promise<any> {
    // Stub for performance metrics
    return {
      avgExecutionTime: '8.5 seconds',
      successRate: 99.2,
      uptime: 97.1,
      lastBlockProcessed: Date.now() - 2000,
      queueLength: 3 // Very short queue
    };
  }
}