// KongSwap Agent Stub
// Returns mock DEXQuote data optimized for speed and lower fees

import { DEXQuote, DEXAdapter } from '../types/dex';

export class KongSwapAgent implements DEXAdapter {
  private isOnline = true;

  getDEXName(): string {
    return 'KongSwap';
  }

  async isAvailable(): Promise<boolean> {
    // Demo mode: Always available for consistent hackathon demonstrations
    // TODO: Restore random availability simulation for testing: Math.random() > 0.02 (98% uptime)
    return this.isOnline;
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

  // Calculate slippage with KongSwap real data (Dec 2024)
  private calculateSlippage(amount: number, fromToken: string, toToken: string, path: string[]): number {
    // Real KongSwap data points for mathematical extrapolation
    const realData: Record<string, { baseTradeUsd: number, baseImpact: number }> = {
      'ckBTC-ckUSDC': { baseTradeUsd: 3462.64, baseImpact: 3.85 },
      'ckBTC-ckETH': { baseTradeUsd: 3462.64, baseImpact: 4.08 },
      'ckBTC-ckUSDT': { baseTradeUsd: 3462.64, baseImpact: 1.67 },
      'ckETH-ckUSDC': { baseTradeUsd: 223.20, baseImpact: 0.61 },
      'ckETH-ckUSDT': { baseTradeUsd: 223.20, baseImpact: 0.47 }
    };

    const tradeAmountUsd = this.convertToUSD(amount, fromToken);
    const pairKey = `${fromToken}-${toToken}`;
    const reversePairKey = `${toToken}-${fromToken}`;

    const pairData = realData[pairKey] || realData[reversePairKey];
    if (!pairData) {
      // Fallback for unsupported pairs
      return Math.min(8.0, 0.1 + (tradeAmountUsd / 100000) * 2.0);
    }

    // Mathematical extrapolation: Impact scales with sqrt of trade size
    const scaleFactor = Math.sqrt(tradeAmountUsd / pairData.baseTradeUsd);
    let slippage = Math.max(0.1, pairData.baseImpact * scaleFactor);

    // Multi-hop penalty (2-hop maximum for KongSwap)
    if (path.length > 2) {
      slippage *= 1.2; // 20% penalty for hub routing
    }

    return slippage;
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

  // Convert amount to USD with proper decimal handling
  private convertToUSD(amount: number, token: string): number {
    const usdRates: Record<string, number> = {
      'ICP': 12.0,
      'ckBTC': 115474.0,
      'ckETH': 3200.0,
      'ckUSDC': 1.0,
      'ckUSDT': 1.0
    };

    const decimals = this.getTokenDecimals(token);
    const humanAmount = amount / Math.pow(10, decimals);
    return humanAmount * (usdRates[token] || 1.0);
  }

  private getTokenDecimals(token: string): number {
    switch (token) {
      case 'ICP':
      case 'ckBTC':
        return 8;
      case 'ckETH':
        return 18;
      case 'ckUSDC':
      case 'ckUSDT':
        return 6;
      default:
        return 8;
    }
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