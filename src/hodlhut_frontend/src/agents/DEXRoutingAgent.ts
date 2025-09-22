// DEX Routing Agent Implementation
// Implements scoring logic and quote aggregation based on your specifications

import { DEXQuote, RouteInput, ScoringWeights, DEXAdapter, DEXRoutingAgent as IDEXRoutingAgent, DEXUtils } from '../types/dex';
import { ICDEXAdapter } from '../adapters/ICDEXAdapter';
import { ICPSwapAdapter } from '../adapters/ICPSwapAdapter';
import { KongSwapAdapter } from '../adapters/KongSwapAdapter';

export class DEXRoutingAgent implements IDEXRoutingAgent {
  private adapters: Map<string, DEXAdapter> = new Map();
  private readonly QUOTE_TIMEOUT_MS = 3000; // 3-second timeout for parallel calls
  private scoringWeights: ScoringWeights = {
    slippage: 0.35,        // 35% weight - price impact (reduced for speed focus)
    fee: 0.35,             // 35% weight - direct cost impact
    speed: 0.20,           // 20% weight - execution speed (increased priority)
    liquidityDepth: 0.05,  // 5% weight - pool depth
    availability: 0.05     // 5% weight - error/timeout history
  };

  // Performance tracking
  private performanceMetrics = {
    totalRequests: 0,
    timeouts: 0,
    averageResponseTime: 0,
    lastRequestTime: 0
  };

  constructor() {
    // Initialize with our stub adapters
    this.registerAdapter(new ICDEXAdapter());
    this.registerAdapter(new ICPSwapAdapter());
    this.registerAdapter(new KongSwapAdapter());
  }

  // Register a DEX adapter
  registerAdapter(adapter: DEXAdapter): void {
    this.adapters.set(adapter.getDEXName(), adapter);
  }

  // Get available DEX names
  getAvailableDEXs(): string[] {
    return Array.from(this.adapters.keys());
  }

  // Update scoring weights configuration
  updateScoringWeights(weights: Partial<ScoringWeights>): void {
    this.scoringWeights = { ...this.scoringWeights, ...weights };
  }

  // Main routing method - returns sorted quotes based on price and speed scoring
  async getBestRoutes(input: RouteInput): Promise<DEXQuote[]> {
    const startTime = Date.now();
    this.performanceMetrics.totalRequests++;
    this.performanceMetrics.lastRequestTime = startTime;

    const quotes: DEXQuote[] = [];

    // STEP 1: Execute all adapter calls in parallel with 3-second timeout
    const quotePromises = Array.from(this.adapters.entries()).map(([dexName, adapter]) =>
      this.getQuoteWithTimeout(dexName, adapter, input)
    );

    // Wait for all quotes with individual timeouts
    const results = await Promise.allSettled(quotePromises);

    // Process results and collect quotes
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value !== null) {
        quotes.push(result.value);
      }
      // Timeouts and errors are already handled in getQuoteWithTimeout
    });

    // STEP 2: Score all quotes prioritizing price and speed
    for (const quote of quotes) {
      if (!quote.quoteError) {
        quote.score = this.scoreQuote(quote, input);
        this.assignBadge(quote, quotes);
      } else {
        quote.score = 0; // Error quotes get lowest score
      }
    }

    // STEP 3: Sort by score descending (highest score first)
    quotes.sort((a, b) => b.score - a.score);

    // STEP 3.5: Filter quotes based on user's slippage tolerance
    console.log(`[DEXRoutingAgent] Slippage tolerance check: ${input.slippageTolerance}%`);
    if (input.slippageTolerance && input.slippageTolerance > 0) {
      quotes.forEach(quote => {
        if (quote.slippage > input.slippageTolerance!) {
          console.log(`[DEXRoutingAgent] ${quote.dexName} REJECTED: slippage ${quote.slippage.toFixed(2)}% > tolerance ${input.slippageTolerance.toFixed(1)}%`);
          quote.quoteError = `Slippage ${quote.slippage.toFixed(2)}% exceeds tolerance ${input.slippageTolerance.toFixed(1)}%`;
          quote.score = 0; // Mark as unusable
        } else {
          console.log(`[DEXRoutingAgent] ${quote.dexName} ACCEPTED: slippage ${quote.slippage.toFixed(2)}% <= tolerance ${input.slippageTolerance.toFixed(1)}%`);
        }
      });
      // Re-sort after applying slippage filter
      quotes.sort((a, b) => b.score - a.score);
    }

    // STEP 4: Apply user preference adjustments
    this.adjustScoresForPreferences(quotes, input);

    // Update performance metrics
    const responseTime = Date.now() - startTime;
    this.updatePerformanceMetrics(responseTime);

    return quotes;
  }

  // Execute quote request with timeout protection
  private async getQuoteWithTimeout(dexName: string, adapter: DEXAdapter, input: RouteInput): Promise<DEXQuote | null> {
    try {
      // Demo mode: Include all DEXs for hackathon demonstrations
      const tradeAmountUsd = DEXUtils.convertToUSD(input.amount, input.fromToken);

      // DEBUG: Log the routing attempt
      console.log(`[DEXRoutingAgent] ${dexName} quote attempt:`);
      console.log(`  - From: ${input.fromToken}`);
      console.log(`  - To: ${input.toToken}`);
      console.log(`  - Amount: ${input.amount}`);
      console.log(`  - USD Value: $${tradeAmountUsd}`);

      // TODO: Re-enable ICDEX threshold for production: tradeAmountUsd > 50000
      // For demo mode, all DEXs are available regardless of trade size

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Quote request timeout')), this.QUOTE_TIMEOUT_MS);
      });

      // Create adapter calls promise
      const quotePromise = (async () => {
        const isAvailable = await adapter.isAvailable();
        console.log(`[DEXRoutingAgent] ${dexName} isAvailable:`, isAvailable);
        if (!isAvailable) {
          console.log(`[DEXRoutingAgent] ${dexName} unavailable, creating error quote`);
          return this.createErrorQuote(dexName, 'DEX unavailable');
        }
        const quote = await adapter.getQuote(input.fromToken, input.toToken, input.amount);
        console.log(`[DEXRoutingAgent] ${dexName} quote result - hasError:`, !!quote.quoteError);
        if (quote.quoteError) {
          console.error(`[DEXRoutingAgent] ${dexName} ERROR:`, quote.quoteError);
        } else {
          console.log(`[DEXRoutingAgent] ${dexName} SUCCESS:`);
          console.log(`  - Fee: ${quote.fee}%`);
          console.log(`  - Slippage: ${quote.slippage}%`);
          console.log(`  - Path:`, quote.path);
        }
        return quote;
      })();

      // Race between quote and timeout
      return await Promise.race([quotePromise, timeoutPromise]);

    } catch (error) {
      if (error instanceof Error && error.message === 'Quote request timeout') {
        this.performanceMetrics.timeouts++;
        return this.createErrorQuote(dexName, `Request timeout (>${this.QUOTE_TIMEOUT_MS}ms)`);
      }
      return this.createErrorQuote(dexName, `Quote failed: ${error}`);
    }
  }

  // Get quote from specific DEX
  async getQuoteFromDEX(dexName: string, fromToken: string, toToken: string, amount: number): Promise<DEXQuote> {
    const adapter = this.adapters.get(dexName);
    if (!adapter) {
      return this.createErrorQuote(dexName, 'DEX adapter not found');
    }

    try {
      return await adapter.getQuote(fromToken, toToken, amount);
    } catch (error) {
      return this.createErrorQuote(dexName, `Quote failed: ${error}`);
    }
  }

  // Scoring function based on your specification
  private scoreQuote(quote: DEXQuote, input: RouteInput): number {
    // Normalize metrics to 0-100 scale for scoring
    const slippageScore = Math.max(0, 100 - (quote.slippage * 100)); // Lower slippage = higher score
    const feeScore = Math.max(0, 100 - (quote.fee * 100)); // Lower fees = higher score

    // Speed score based on estimated execution time
    const speedScore = this.getSpeedScore(quote.estimatedSpeed);

    // Liquidity score based on USD depth
    const liquidityScore = Math.min(100, (quote.liquidityUsd / 10000)); // Scale to 100 max

    // Availability score (100 if no errors, 0 if errors)
    const availabilityScore = quote.quoteError ? 0 : 100;

    // Calculate weighted score
    const totalScore =
      (slippageScore * this.scoringWeights.slippage) +
      (feeScore * this.scoringWeights.fee) +
      (speedScore * this.scoringWeights.speed) +
      (liquidityScore * this.scoringWeights.liquidityDepth) +
      (availabilityScore * this.scoringWeights.availability);

    return Math.round(totalScore * 100) / 100; // Round to 2 decimal places
  }

  // Convert speed strings to numeric scores
  private getSpeedScore(estimatedSpeed: string): number {
    if (estimatedSpeed.includes('s')) {
      const seconds = parseFloat(estimatedSpeed.replace('s', ''));
      return Math.max(0, 100 - (seconds * 10)); // Lower seconds = higher score
    }

    // Handle special cases
    if (estimatedSpeed.includes('orderbook')) return 85;
    if (estimatedSpeed.includes('instant')) return 100;
    if (estimatedSpeed.includes('fast')) return 90;

    return 75; // Default moderate score
  }

  // Assign badges based on relative performance
  private assignBadge(quote: DEXQuote, allQuotes: DEXQuote[]): void {
    const validQuotes = allQuotes.filter(q => !q.quoteError);

    if (validQuotes.length === 0) return;

    // Find best in each category
    const lowestSlippage = Math.min(...validQuotes.map(q => q.slippage));
    const lowestFee = Math.min(...validQuotes.map(q => q.fee));
    const highestLiquidity = Math.max(...validQuotes.map(q => q.liquidityUsd));

    // Assign badges
    if (quote.slippage === lowestSlippage && quote.fee === lowestFee) {
      quote.badge = 'RECOMMENDED';
    } else if (quote.fee === lowestFee) {
      quote.badge = 'CHEAPEST';
    } else if (quote.slippage === lowestSlippage) {
      quote.badge = 'CHEAPEST';
    } else if (quote.liquidityUsd === highestLiquidity) {
      quote.badge = 'ADVANCED';
    } else if (quote.estimatedSpeed.includes('1.') || quote.estimatedSpeed.includes('0.')) {
      quote.badge = 'FASTEST';
    }
  }

  // Adjust scores based on user preferences and urgency
  private adjustScoresForPreferences(quotes: DEXQuote[], input: RouteInput): void {
    if (input.urgency === 'high') {
      // Boost speed weight for urgent trades
      quotes.forEach(quote => {
        const speedBoost = this.getSpeedScore(quote.estimatedSpeed) * 0.3;
        quote.score += speedBoost;
      });
    }

    if (input.userPreference === 'lowest_cost') {
      // Boost cost-related scores
      quotes.forEach(quote => {
        const costBoost = (100 - quote.fee * 100) * 0.2;
        quote.score += costBoost;
      });
    }

    if (input.userPreference === 'most_liquid') {
      // Boost liquidity scores
      quotes.forEach(quote => {
        const liquidityBoost = Math.min(100, quote.liquidityUsd / 10000) * 0.2;
        quote.score += liquidityBoost;
      });
    }

    // Re-sort after adjustments
    quotes.sort((a, b) => b.score - a.score);
  }

  // Create error quote for failed DEX calls
  private createErrorQuote(dexName: string, error: string): DEXQuote {
    return {
      dexName,
      path: [],
      slippage: 999,
      fee: 999,
      estimatedSpeed: 'Error',
      liquidityUsd: 0,
      score: 0,
      reason: `${dexName} unavailable`,
      quoteError: error
    };
  }

  // Update performance tracking metrics
  private updatePerformanceMetrics(responseTime: number): void {
    const alpha = 0.1; // Exponential smoothing factor
    this.performanceMetrics.averageResponseTime =
      this.performanceMetrics.averageResponseTime === 0
        ? responseTime
        : (1 - alpha) * this.performanceMetrics.averageResponseTime + alpha * responseTime;
  }

  // Get performance metrics for monitoring
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      timeoutRate: this.performanceMetrics.totalRequests > 0
        ? (this.performanceMetrics.timeouts / this.performanceMetrics.totalRequests) * 100
        : 0,
      uptime: this.performanceMetrics.totalRequests > 0
        ? ((this.performanceMetrics.totalRequests - this.performanceMetrics.timeouts) / this.performanceMetrics.totalRequests) * 100
        : 100
    };
  }

  // Enhanced liquidity-aware routing status
  getRoutingStatus() {
    const availableDEXs = this.getAvailableDEXs();
    const metrics = this.getPerformanceMetrics();

    return {
      activeDEXs: availableDEXs.length,
      dexNames: availableDEXs,
      performanceMetrics: metrics,
      routingFeatures: {
        parallelExecution: true,
        timeoutProtection: `${this.QUOTE_TIMEOUT_MS}ms`,
        liquidityAwareSlippage: true,
        dynamicScoring: true,
        tradeSizeOptimization: true
      }
    };
  }
}

// Singleton instance for global use
export const dexRoutingAgent = new DEXRoutingAgent();