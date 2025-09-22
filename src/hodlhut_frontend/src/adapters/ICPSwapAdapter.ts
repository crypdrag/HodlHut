// ICPSwap Adapter Stub
// Balanced DEX with good liquidity and moderate fees, suitable for medium trades

import {
  DEXAdapter,
  DEXQuote,
  MOCK_EXCHANGE_RATES,
  MOCK_LIQUIDITY_USD,
  DEXUtils
} from '../types/dex';

export class ICPSwapAdapter implements DEXAdapter {
  private readonly dexName = 'ICPSwap';
  private readonly supportedPairs = [
    ['ICP', 'ckBTC'],
    ['ICP', 'ckETH'],
    ['ICP', 'ckUSDC'],
    // ['ICP', 'ckUSDT'], // Removed: No liquidity available on ICPSwap
    ['ckBTC', 'ckETH'],
    ['ckBTC', 'ckUSDC'],
    // ['ckBTC', 'ckUSDT'], // Removed: Massive price deviation (-99.99%)
    ['ckETH', 'ckUSDC']
    // ['ckETH', 'ckUSDT'], // Removed: No liquidity available on ICPSwap
    // ['ckUSDC', 'ckUSDT'] // Removed: No stable-to-stable support yet
  ];

  getDEXName(): string {
    return this.dexName;
  }

  async isAvailable(): Promise<boolean> {
    // Demo mode: Always available for consistent hackathon demonstrations
    // TODO: Replace with real ICPSwap endpoint health check when integrating live APIs
    // Real implementation: return await fetch('/icpswap/health').then(r => r.ok);
    // Simulated uptime would be: Math.random() > 0.08 (92% uptime)
    return true;
  }

  async getQuote(fromToken: string, toToken: string, amount: number): Promise<DEXQuote> {
    try {
      // Check if pair is supported
      const pairSupported = this.supportedPairs.some(
        ([a, b]) => (a === fromToken && b === toToken) || (a === toToken && b === fromToken)
      );

      if (!pairSupported) {
        return this.createErrorQuote(fromToken, toToken, amount, 'Unsupported trading pair on ICPSwap');
      }

      // Check availability
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return this.createErrorQuote(fromToken, toToken, amount, 'ICPSwap temporarily unavailable');
      }

      // Get base exchange rate
      const exchangeRate = MOCK_EXCHANGE_RATES[fromToken]?.[toToken];
      if (!exchangeRate) {
        return this.createErrorQuote(fromToken, toToken, amount, 'No exchange rate available');
      }

      // Calculate trade details
      const tradeAmountUsd = DEXUtils.convertToUSD(amount, fromToken);
      const liquidityUsd = MOCK_LIQUIDITY_USD[fromToken]?.[toToken] || 1000000;

      // ICPSwap characteristics: Balanced approach with moderate liquidity
      const baseFee = 0.25; // 0.25% base fee
      const finalSlippage = DEXUtils.calculateICPSwapSlippage(tradeAmountUsd, fromToken, toToken);

      // Check if this pair has liquidity issues based on real data
      if (finalSlippage >= 999) {
        return this.createErrorQuote(fromToken, toToken, amount, 'ICPSwap liquidity unavailable for this pair');
      }

      // Calculate output amount with slippage
      const theoreticalOutput = amount * exchangeRate;
      const slippageReduction = theoreticalOutput * (finalSlippage / 100);
      const outputAmount = Math.floor(theoreticalOutput - slippageReduction);

      // Calculate fee amount
      const feeAmount = Math.floor(amount * (baseFee / 100));

      // Speed is consistent for AMM
      let estimatedSpeed: string;
      if (tradeAmountUsd > 50000) {
        estimatedSpeed = "20-60 seconds"; // Large trades take longer
      } else if (tradeAmountUsd > 5000) {
        estimatedSpeed = "15-45 seconds"; // Medium trades
      } else {
        estimatedSpeed = "10-30 seconds"; // Small trades
      }

      // Calculate score (ICPSwap is solid middle ground)
      const score = DEXUtils.calculateScore(finalSlippage, baseFee, liquidityUsd, estimatedSpeed);

      // Add bonus for balanced features
      let balancedBonus = 0;
      if (tradeAmountUsd > 5000 && tradeAmountUsd < 50000) balancedBonus += 5; // Sweet spot
      if (liquidityUsd > 5000000) balancedBonus += 3; // Good liquidity

      const finalScore = Math.min(100, score + balancedBonus);

      // Determine badge based on trade characteristics
      let badge: string | undefined;
      let reason: string;

      if (tradeAmountUsd > 10000 && tradeAmountUsd < 75000) {
        badge = "RECOMMENDED";
        reason = "Optimal liquidity and execution for medium-large trades";
      } else if (liquidityUsd > 8000000) {
        badge = "MOST_LIQUID";
        reason = "Strong liquidity pools provide reliable execution";
      } else if (finalSlippage < 0.15) {
        badge = "CHEAPEST";
        reason = "Competitive slippage for this trade size";
      } else {
        reason = "Balanced AMM with consistent execution and fees";
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
      console.error('ICPSwap quote error:', error);
      return this.createErrorQuote(fromToken, toToken, amount, 'Failed to get ICPSwap quote');
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
      reason: "ICPSwap unavailable",
      quoteError: errorMessage
    };
  }

  // Additional ICPSwap-specific methods for future integration

  async getPoolInfo(fromToken: string, toToken: string): Promise<any> {
    // Stub for pool information
    return {
      poolId: `icpswap_${fromToken}_${toToken}`,
      totalLiquidity: MOCK_LIQUIDITY_USD[fromToken]?.[toToken] || 0,
      volume24h: 250000,
      fee: 0.25,
      reserves: {
        [fromToken]: 1000000,
        [toToken]: 1000000
      }
    };
  }

  async estimateSwapOutput(fromToken: string, toToken: string, amount: number): Promise<any> {
    // Stub for swap output estimation
    const exchangeRate = MOCK_EXCHANGE_RATES[fromToken]?.[toToken] || 1;
    const theoreticalOutput = amount * exchangeRate;
    const slippage = DEXUtils.calculateSlippage(
      DEXUtils.convertToUSD(amount, fromToken),
      MOCK_LIQUIDITY_USD[fromToken]?.[toToken] || 1000000
    );

    return {
      outputAmount: Math.floor(theoreticalOutput * (1 - slippage / 100)),
      priceImpact: slippage,
      minimumReceived: Math.floor(theoreticalOutput * 0.995), // 0.5% slippage tolerance
      route: [fromToken, toToken]
    };
  }

  async executeSwap(fromToken: string, toToken: string, amount: number): Promise<any> {
    // Stub for swap execution
    return {
      transactionId: `icpswap_${Date.now()}`,
      status: 'pending',
      estimatedCompletion: '15-45 seconds',
      fromToken,
      toToken,
      inputAmount: amount
    };
  }
}