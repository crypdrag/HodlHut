// ICPSwap Agent Stub
// Returns mock DEXQuote data based on your specifications

import { DEXQuote, DEXAdapter } from '../types/dex';

export class ICPSwapAgent implements DEXAdapter {
  private isOnline = true;

  getDEXName(): string {
    return 'ICPSwap';
  }

  async isAvailable(): Promise<boolean> {
    // Demo mode: Always available for consistent hackathon demonstrations
    // TODO: Restore random availability simulation for testing: Math.random() > 0.05 (95% uptime)
    return this.isOnline;
  }

  async getQuote(fromToken: string, toToken: string, amount: number): Promise<DEXQuote> {
    // Simulate network delay
    await this.delay(800 + Math.random() * 400); // 800-1200ms

    // Simulate realistic trading paths
    const path = this.calculatePath(fromToken, toToken);

    // Mock quote data based on your research (ICPSwap ~$9.47M TVL)
    const baseSlippage = this.calculateSlippage(amount, fromToken, toToken);
    const liquidityUsd = this.getLiquidityForPair(fromToken, toToken);

    return {
      dexName: 'ICPSwap',
      path,
      slippage: baseSlippage,
      fee: 0.3, // 0.3% standard fee
      estimatedSpeed: '1.5s',
      liquidityUsd,
      score: 0, // Will be calculated by DEXRoutingAgent
      reason: 'Established liquidity pools with Uniswap V3 mechanics',
    };
  }

  // Calculate ICPSwap slippage based on real data with mathematical extrapolation
  private calculateSlippage(amount: number, fromToken: string, toToken: string): number {
    // Real ICPSwap data points for mathematical extrapolation
    const realData: Record<string, { baseTradeUsd: number, baseImpact: number }> = {
      'ckBTC-ckUSDC': { baseTradeUsd: 561.37, baseImpact: 24.65 }, // Live data: 0.00491553 ckBTC → 422.375 ckUSDC (-24.65% impact)
      'ckBTC-ckETH': { baseTradeUsd: 2280.0, baseImpact: 1.46 },   // Live data: 0.02 ckBTC → 0.519479 ckETH (-1.46% impact)
      'ckETH-ckUSDC': { baseTradeUsd: 846.61, baseImpact: 8.15 },  // Live data: 0.194897 ckETH → 776.582 ckUSDC (-8.15% impact)
      'ckETH-ckBTC': { baseTradeUsd: 2250.0, baseImpact: 1.12 },   // Live data: 0.519479 ckETH → 0.0194855 ckBTC (-1.12% impact)
      'ckETH-ICP': { baseTradeUsd: 1120.0, baseImpact: 0.34 },     // Live data: ckETH → ICP (-0.34% impact)
      'ckUSDC-ckBTC': { baseTradeUsd: 1000.0, baseImpact: 43.94 }, // Live data: 1000 ckUSDC → 0.00491553 ckBTC (-43.94% impact)
      'ckUSDC-ckETH': { baseTradeUsd: 1000.0, baseImpact: 15.45 }, // Live data: 1000 ckUSDC → 0.194897 ckETH (-15.45% impact)
      'ckUSDC-ICP': { baseTradeUsd: 1000.0, baseImpact: 0.57 },    // Live data: 1000 ckUSDC → 216.856 ICP (-0.57% impact)
      'ICP-ckUSDC': { baseTradeUsd: 995.59, baseImpact: 0.14 },    // Live data: 216.856 ICP → 992.863 ckUSDC (-0.14% impact)
      'ICP-ckBTC': { baseTradeUsd: 1150.0, baseImpact: 0.90 },     // Live data: 250 ICP → 0.00995941 ckBTC (-0.90% impact)
      'ICP-ckETH': { baseTradeUsd: 1150.0, baseImpact: 2.37 },     // Live data: ICP → ckETH (-2.37% impact)
      'ckBTC-ICP': { baseTradeUsd: 1130.0, baseImpact: 0.25 }      // Live data: 0.00995941 ckBTC → 246.92 ICP (+0.25% favorable execution)
    };

    const tradeAmountUsd = this.convertToUSD(amount, fromToken);
    const pairKey = `${fromToken}-${toToken}`;
    const reversePairKey = `${toToken}-${fromToken}`;

    const pairData = realData[pairKey] || realData[reversePairKey];

    if (!pairData) {
      // Mark unsupported pairs as unavailable (ckUSDT pairs)
      return 999; // This will trigger unavailable status
    }

    // Mathematical extrapolation: Impact scales with sqrt of trade size
    const scaleFactor = Math.sqrt(tradeAmountUsd / pairData.baseTradeUsd);
    return Math.max(0.5, pairData.baseImpact * scaleFactor);
  }

  // Get estimated liquidity for trading pairs
  private getLiquidityForPair(fromToken: string, toToken: string): number {
    const liquidityMap: Record<string, number> = {
      'ckBTC-ICP': 1200000,      // $1.2M
      'ICP-ckUSDC': 565440,      // $565K (from research)
      'ckETH-ICP': 800000,       // $800K
      'ckUSDT-ICP': 450000,      // $450K
      'ckBTC-ckUSDC': 300000,    // $300K (direct pair)
      'ckETH-ckUSDC': 200000,    // $200K
    };

    const pairKey = `${fromToken}-${toToken}`;
    const reversePairKey = `${toToken}-${fromToken}`;

    return liquidityMap[pairKey] || liquidityMap[reversePairKey] || 150000; // Default $150K
  }

  // Mock token prices for calculation
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

  private getTokenPrice(token: string): number {
    const prices: Record<string, number> = {
      'ckBTC': 115474,
      'ckETH': 4475,
      'ICP': 5.0,
      'ckUSDC': 1.0,
      'ckUSDT': 1.0,
    };
    return prices[token] || 1;
  }

  // Calculate optimal trading path
  private calculatePath(fromToken: string, toToken: string): string[] {
    // Direct pairs when available
    const directPairs = [
      'ckBTC-ckUSDC', 'ckETH-ckUSDC', 'ckBTC-ckETH',
      'ICP-ckUSDC', 'ICP-ckBTC', 'ICP-ckETH'
    ];

    const pairKey = `${fromToken}-${toToken}`;
    const reversePairKey = `${toToken}-${fromToken}`;

    if (directPairs.includes(pairKey) || directPairs.includes(reversePairKey)) {
      return [fromToken, toToken];
    }

    // Hub routing through ICP for better liquidity
    return [fromToken, 'ICP', toToken];
  }

  // Simulate network delay
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Testing method to simulate downtime
  setAvailability(available: boolean): void {
    this.isOnline = available;
  }
}