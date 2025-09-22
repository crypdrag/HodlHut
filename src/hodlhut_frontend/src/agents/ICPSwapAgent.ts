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

  // Calculate ICPSwap slippage based on real data with liquidity issues
  private calculateSlippage(amount: number, fromToken: string, toToken: string): number {
    // ICPSwap shows 0.5% slippage tolerance but has price deviations
    const priceDeviations: Record<string, number> = {
      'ckBTC-ckUSDC': 81.77, // Massive price deviation indicates liquidity issues
      'ckBTC-ckETH': 1.83,   // Minor deviation, more realistic
      'ckBTC-ckUSDT': 99.99, // Completely broken - should be marked unavailable
      'ckETH-ckUSDC': 14.86, // Significant price deviation
      'ckETH-ckUSDT': 100.0  // No liquidity available
    };

    const tradeAmountUsd = this.convertToUSD(amount, fromToken);
    const pairKey = `${fromToken}-${toToken}`;
    const reversePairKey = `${toToken}-${fromToken}`;

    const deviation = priceDeviations[pairKey] || priceDeviations[reversePairKey];

    // Only mark completely broken pairs as unavailable (ckUSDT with 99.99%+ deviation)
    if (!deviation || deviation >= 99) {
      return 999; // This will trigger unavailable status
    }

    // For pairs with severe price deviations (>70%), reflect the actual poor execution
    if (deviation > 70) {
      // Use the actual price deviation as base slippage since that's what users experience
      const actualDeviation = deviation * 0.8; // 80% of the price deviation as slippage
      const scaleFactor = Math.sqrt(tradeAmountUsd / 3464); // Based on user's $3,464 test trade
      return Math.max(65.0, actualDeviation * scaleFactor); // Minimum 65% slippage for such poor liquidity
    }

    // For pairs with significant but manageable deviations (15-70%), moderate penalty
    if (deviation > 15) {
      const baseSlippage = deviation * 0.5; // 50% of price deviation as slippage
      const scaleFactor = Math.sqrt(tradeAmountUsd / 3000);
      return Math.max(5.0, baseSlippage * scaleFactor); // Minimum 5% slippage
    }

    // For pairs with minor deviations (<15%), use 0.5% base with normal scaling
    const baseSlippage = 0.5;
    const scaleFactor = Math.sqrt(tradeAmountUsd / 3000); // Based on ~$3k test trades
    return Math.max(0.5, baseSlippage * scaleFactor);
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