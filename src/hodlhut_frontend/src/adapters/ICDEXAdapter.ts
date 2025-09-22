// ICDEX Adapter Stub
// Professional orderbook DEX optimized for large trades and price discovery

import {
  DEXAdapter,
  DEXQuote,
  MOCK_EXCHANGE_RATES,
  MOCK_LIQUIDITY_USD,
  ICDEX_ORDERBOOK_DEPTH,
  DEXUtils
} from '../types/dex';

export class ICDEXAdapter implements DEXAdapter {
  private readonly dexName = 'ICDEX';
  // Active pairs based on real ICDEX market data (Sep 21, 2025)
  private readonly activePairs = [
    ['ICP', 'ckBTC'],     // EXCELLENT: 2.32M ICP volume, 0.3% fee
    ['ICP', 'ckETH'],     // GOOD: 95.9K ICP volume, 0.3% fee
    ['ICP', 'ckUSDC'],    // MODERATE: 55.5K ckUSDC volume, 0.5% fee
    ['ckBTC', 'ckETH']    // MODERATE: 40 ckBTC volume, 0.3% fee
  ];

  // Dead/stale pairs to exclude from routing
  private readonly deadPairs = [
    ['ckBTC', 'ckUSDT'],  // DEAD: Zero liquidity confirmed
    ['ckETH', 'ckUSDT'],  // STALE: Ancient pricing (2,150 ckUSDT)
    ['ICP', 'ckUSDT']     // NO LIQUIDITY: Not available
  ];

  getDEXName(): string {
    return this.dexName;
  }

  async isAvailable(): Promise<boolean> {
    // Demo mode: Always available for consistent hackathon demonstrations
    // TODO: Replace with real ICDEX endpoint health check when integrating live APIs
    // Real implementation: return await icdexCanister.health_check();
    // Simulated uptime would be: Math.random() > 0.05 (95% uptime)
    return true;
  }

  async getQuote(fromToken: string, toToken: string, amount: number): Promise<DEXQuote> {
    try {
      // Check if pair is active with real liquidity
      const pairActive = this.activePairs.some(
        ([a, b]) => (a === fromToken && b === toToken) || (a === toToken && b === fromToken)
      );

      const pairDead = this.deadPairs.some(
        ([a, b]) => (a === fromToken && b === toToken) || (a === toToken && b === fromToken)
      );

      if (pairDead) {
        return this.createErrorQuote(fromToken, toToken, amount, 'ICDEX pair has no liquidity or stale pricing');
      }

      if (!pairActive) {
        return this.createErrorQuote(fromToken, toToken, amount, 'Trading pair not available on ICDEX');
      }

      // Check availability
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return this.createErrorQuote(fromToken, toToken, amount, 'ICDEX orderbook temporarily unavailable');
      }

      // Get base exchange rate
      const exchangeRate = MOCK_EXCHANGE_RATES[fromToken]?.[toToken];
      if (!exchangeRate) {
        return this.createErrorQuote(fromToken, toToken, amount, 'No exchange rate available');
      }

      // Calculate trade details
      const tradeAmountUsd = DEXUtils.convertToUSD(amount, fromToken);

      // Use realistic orderbook depth instead of generic liquidity
      const orderbookData = ICDEX_ORDERBOOK_DEPTH[fromToken]?.[toToken];
      const liquidityUsd = orderbookData
        ? Math.min(orderbookData.bidDepth, orderbookData.askDepth) // Conservative estimate
        : MOCK_LIQUIDITY_USD[fromToken]?.[toToken] || 1000000;

      // ICDEX characteristics: Professional orderbook with real fee structure
      const baseFee = orderbookData?.fee || 0.3; // Use real ICDEX fees (0.3% or 0.5% taker)

      // Use specialized orderbook slippage calculation
      const orderbookSlippage = DEXUtils.calculateOrderbookSlippage(tradeAmountUsd, fromToken, toToken);

      // Apply ICDEX maker rebate for limit orders (simulate professional trading)
      let effectiveFee = baseFee;
      if (tradeAmountUsd > 25000) {
        // Large trades could use limit orders (maker = 0% fee)
        const makerProbability = Math.min(0.7, tradeAmountUsd / 100000); // Up to 70% chance for $100K+ trades
        effectiveFee = baseFee * (1 - makerProbability); // Reduced fee due to maker possibility
      }

      const finalSlippage = Math.max(0.02, orderbookSlippage);

      // Calculate output amount with slippage
      const theoreticalOutput = amount * exchangeRate;
      const slippageReduction = theoreticalOutput * (finalSlippage / 100);
      const outputAmount = Math.floor(theoreticalOutput - slippageReduction);

      // Calculate fee amount using effective fee (accounts for maker rebates)
      const feeAmount = Math.floor(amount * (effectiveFee / 100));

      // Speed depends on trade type and size (orderbook advantages)
      let estimatedSpeed: string;
      if (tradeAmountUsd > 100000) {
        estimatedSpeed = "Professional orderbook execution"; // Large trades get pro treatment
      } else if (tradeAmountUsd > 25000) {
        estimatedSpeed = "Limit order eligible (15-45s)"; // Medium-large trades
      } else if (tradeAmountUsd > 10000) {
        estimatedSpeed = "Market order execution (8-15s)"; // Medium trades
      } else {
        estimatedSpeed = "Standard market order (5-12s)"; // Small trades
      }

      // Calculate score (ICDEX excels at large trades and professional features)
      const score = DEXUtils.calculateScore(finalSlippage, effectiveFee, liquidityUsd, estimatedSpeed);

      // Add bonus for professional features
      let professionalBonus = 0;
      if (tradeAmountUsd > 50000) professionalBonus += 10; // Large trade bonus
      if (liquidityUsd > 10000000) professionalBonus += 5; // Deep liquidity bonus

      const finalScore = Math.min(100, score + professionalBonus);

      // Determine badge based on trade characteristics
      let badge: string | undefined;
      let reason: string;

      if (tradeAmountUsd > 100000) {
        badge = "RECOMMENDED";
        reason = "Professional orderbook optimal for large trades";
      } else if (tradeAmountUsd > 25000) {
        badge = "ADVANCED";
        reason = "Orderbook liquidity provides best execution";
      } else if (liquidityUsd > 15000000) {
        badge = "CHEAPEST";
        reason = "Deep liquidity minimizes price impact";
      } else {
        reason = "Professional orderbook trading with competitive fees";
      }

      return {
        dexName: this.dexName,
        path: [fromToken, toToken],
        slippage: parseFloat(finalSlippage.toFixed(3)),
        fee: parseFloat(effectiveFee.toFixed(2)), // Show effective fee (includes maker discounts)
        estimatedSpeed,
        liquidityUsd,
        score: parseFloat(finalScore.toFixed(1)),
        badge: badge as any,
        reason: effectiveFee < baseFee
          ? `${reason} (Maker rebate eligible: ${effectiveFee.toFixed(2)}% effective fee)`
          : reason
      };

    } catch (error) {
      console.error('ICDEX quote error:', error);
      return this.createErrorQuote(fromToken, toToken, amount, 'Failed to get ICDEX quote');
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
      reason: "ICDEX unavailable",
      quoteError: errorMessage
    };
  }

  // Additional ICDEX-specific methods for future integration

  async getOrderBook(fromToken: string, toToken: string): Promise<any> {
    // Stub for orderbook data
    return {
      bids: [],
      asks: [],
      spread: 0.1
    };
  }

  async placeMarketOrder(fromToken: string, toToken: string, amount: number): Promise<any> {
    // Stub for market order placement
    return {
      orderId: `icdex_${Date.now()}`,
      status: 'pending',
      estimatedFill: '15-45 seconds'
    };
  }

  async placeLimitOrder(fromToken: string, toToken: string, amount: number, price: number): Promise<any> {
    // Stub for limit order placement
    return {
      orderId: `icdex_limit_${Date.now()}`,
      status: 'open',
      price,
      amount
    };
  }
}