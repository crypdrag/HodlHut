// KongSwap Agent Stub
// Returns mock DEXQuote data optimized for speed and lower fees

import { DEXQuote, DEXAdapter } from '../types/dex';

export class KongSwapAgent implements DEXAdapter {
  private isOnline = true;

  getDEXName(): string {
    return 'KongSwap';
  }

  async isAvailable(): Promise<boolean> {
    // KongSwap tends to be more stable (newer architecture)
    return this.isOnline && Math.random() > 0.02; // 98% uptime
  }

  async getQuote(fromToken: string, toToken: string, amount: number): Promise<DEXQuote> {
    // Simulate faster response times (KongSwap advantage)
    await this.delay(400 + Math.random() * 200); // 400-600ms

    // Calculate optimal path (KongSwap supports 2-hop maximum)
    const path = this.calculatePath(fromToken, toToken);

    // Mock quote data based on KongSwap characteristics
    const baseSlippage = this.calculateSlippage(amount, fromToken, toToken, path);
    const liquidityUsd = this.getLiquidityForPair(fromToken, toToken);

    return {
      dexName: 'KongSwap',
      path,
      slippage: baseSlippage,
      fee: 0.3, // 0.3% standard fee (same as ICPSwap)
      estimatedSpeed: '0.8s', // Faster execution
      liquidityUsd,
      score: 0, // Will be calculated by DEXRoutingAgent
      reason: 'Fast execution with optimized AMM routing',
    };
  }

  // Calculate slippage with KongSwap-specific characteristics
  private calculateSlippage(amount: number, fromToken: string, toToken: string, path: string[]): number {
    const liquidityUsd = this.getLiquidityForPair(fromToken, toToken);
    const tradePercent = (amount * this.getTokenPrice(fromToken)) / liquidityUsd;

    // Base slippage calculation
    let slippage = Math.pow(tradePercent * 100, 1.4) * 0.01; // Slightly better than ICPSwap

    // Multi-hop penalty (2-hop maximum for KongSwap)
    if (path.length > 2) {
      slippage *= 1.2; // 20% penalty for hub routing
    }

    // KongSwap has slightly better price impact due to newer AMM design
    slippage *= 0.95;

    // Cap and add variation
    slippage = Math.min(slippage, 12);
    slippage += (Math.random() - 0.5) * 0.015;

    return Math.max(0.03, slippage); // Minimum 0.03% slippage (slightly better)
  }

  // KongSwap liquidity pools (generally smaller but growing)
  private getLiquidityForPair(fromToken: string, toToken: string): number {
    const liquidityMap: Record<string, number> = {
      'ckBTC-ICP': 950000,       // $950K (less than ICPSwap)
      'ICP-ckUSDC': 420000,      // $420K
      'ckETH-ICP': 600000,       // $600K
      'ckUSDT-ICP': 380000,      // $380K
      'ckBTC-ckUSDC': 250000,    // $250K (direct pair)
      'ckETH-ckUSDC': 180000,    // $180K
      'ICP-KONG': 150000,        // $150K (native token)
    };

    const pairKey = `${fromToken}-${toToken}`;
    const reversePairKey = `${toToken}-${fromToken}`;

    return liquidityMap[pairKey] || liquidityMap[reversePairKey] || 100000; // Default $100K
  }

  // Mock token prices (same as ICPSwap for consistency)
  private getTokenPrice(token: string): number {
    const prices: Record<string, number> = {
      'ckBTC': 115474,
      'ckETH': 4475,
      'ICP': 5.0,
      'ckUSDC': 1.0,
      'ckUSDT': 1.0,
      'KONG': 0.01, // Native KongSwap token
    };
    return prices[token] || 1;
  }

  // KongSwap pathfinding (2-hop maximum, ICP as primary hub)
  private calculatePath(fromToken: string, toToken: string): string[] {
    // Direct pairs when available (KongSwap has fewer direct pairs)
    const directPairs = [
      'ckBTC-ICP', 'ckETH-ICP', 'ckUSDC-ICP', 'ckUSDT-ICP',
      'ICP-KONG' // Native token pairs
    ];

    const pairKey = `${fromToken}-${toToken}`;
    const reversePairKey = `${toToken}-${fromToken}`;

    if (directPairs.includes(pairKey) || directPairs.includes(reversePairKey)) {
      return [fromToken, toToken];
    }

    // Hub routing through ICP (KongSwap's primary routing strategy)
    return [fromToken, 'ICP', toToken];
  }

  // Simulate faster network response
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Testing utilities
  setAvailability(available: boolean): void {
    this.isOnline = available;
  }

  // Simulate KongSwap's grid trading features (advanced)
  getGridTradingOptions(fromToken: string, toToken: string): any {
    return {
      available: true,
      minGridSize: 0.1,
      maxGridSize: 5.0,
      recommendedGridSize: 1.0,
      estimatedAPY: '12-18%'
    };
  }
}