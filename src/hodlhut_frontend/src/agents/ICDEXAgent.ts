// ICDEX Agent Stub
// Returns mock DEXQuote data for orderbook-based trading

import { DEXQuote, DEXAdapter } from '../types/dex';

export class ICDEXAgent implements DEXAdapter {
  private isOnline = true;
  private minTradeUsd = 500; // $500 minimum for orderbook trades

  getDEXName(): string {
    return 'ICDEX';
  }

  async isAvailable(): Promise<boolean> {
    // Demo mode: Always available for consistent hackathon demonstrations
    // TODO: Restore random availability simulation for testing: Math.random() > 0.01 (99% uptime)
    return this.isOnline;
  }

  async getQuote(fromToken: string, toToken: string, amount: number): Promise<DEXQuote> {
    // Check minimum trade size
    const tradeValueUsd = this.convertToUSD(amount, fromToken);
    if (tradeValueUsd < this.minTradeUsd) {
      throw new Error(`Minimum trade size is $${this.minTradeUsd}`);
    }

    // Simulate orderbook query delay (slightly slower due to complexity)
    await this.delay(1000 + Math.random() * 500); // 1000-1500ms

    // Calculate orderbook-specific metrics
    const path = this.calculatePath(fromToken, toToken);
    const orderBookData = this.simulateOrderbook(fromToken, toToken, amount);

    return {
      dexName: 'ICDEX',
      path,
      slippage: orderBookData.slippage,
      fee: orderBookData.fee,
      estimatedSpeed: 'On-chain orderbook',
      liquidityUsd: orderBookData.liquidityUsd,
      score: 0, // Will be calculated by DEXRoutingAgent
      reason: orderBookData.reason,
    };
  }

  // Simulate orderbook data and calculations
  private simulateOrderbook(fromToken: string, toToken: string, amount: number) {
    const tradeValueUsd = this.convertToUSD(amount, fromToken);
    const orderBook = this.getOrderbookDepth(fromToken, toToken);

    // Calculate slippage based on orderbook depth
    let slippage = this.calculateOrderbookSlippage(tradeValueUsd, orderBook);

    // Determine fee structure (maker/taker model)
    const fee = this.calculateFee(tradeValueUsd);

    // Calculate available liquidity
    const liquidityUsd = orderBook.bidDepth + orderBook.askDepth;

    // Determine reasoning based on trade characteristics
    let reason = '';
    if (tradeValueUsd > 100000) {
      reason = 'Best execution for very large trades via deep orderbook';
    } else if (tradeValueUsd > 25000) {
      reason = 'Minimal slippage through limit order execution';
    } else {
      reason = 'Professional orderbook trading with price discovery';
    }

    return {
      slippage,
      fee,
      liquidityUsd,
      reason
    };
  }

  // Calculate orderbook slippage (more complex than AMM)
  private calculateOrderbookSlippage(tradeValueUsd: number, orderBook: any): number {
    // ICDEX should show lower slippage than AMMs for larger trades
    // Based on observed behavior: better execution for institutional-size trades

    // For the test data showing ~2% slippage, use realistic orderbook scaling
    if (tradeValueUsd < 1000) {
      return 0.02; // 0.02% for small trades
    } else if (tradeValueUsd < 5000) {
      return 0.5 + (tradeValueUsd / 10000); // ~0.5-1% for medium trades
    } else if (tradeValueUsd < 25000) {
      return 1.0 + (tradeValueUsd / 50000); // ~1-1.5% for larger trades
    } else {
      return Math.min(2.5, 1.5 + (tradeValueUsd / 100000)); // Cap at 2.5%
    }
  }

  // ICDEX fee structure (maker/taker model)
  private calculateFee(tradeValueUsd: number): number {
    // Volume-based fee tiers
    if (tradeValueUsd > 100000) return 0.1; // 0.1% for high volume
    if (tradeValueUsd > 50000) return 0.15; // 0.15% for medium-high volume
    if (tradeValueUsd > 10000) return 0.2; // 0.2% for medium volume
    return 0.25; // 0.25% for standard volume
  }

  // Mock orderbook depth data
  private getOrderbookDepth(fromToken: string, toToken: string) {
    const depthMap: Record<string, any> = {
      'ckBTC-ckUSDC': {
        bidDepth: 2500000, // $2.5M bid depth
        askDepth: 2300000, // $2.3M ask depth
        spread: 0.02 // 2 basis points
      },
      'ckETH-ckUSDC': {
        bidDepth: 1800000, // $1.8M
        askDepth: 1600000, // $1.6M
        spread: 0.03
      },
      'ICP-ckUSDC': {
        bidDepth: 1200000, // $1.2M
        askDepth: 1000000, // $1M
        spread: 0.05
      },
      'ckBTC-ICP': {
        bidDepth: 1500000, // $1.5M
        askDepth: 1400000, // $1.4M
        spread: 0.04
      }
    };

    const pairKey = `${fromToken}-${toToken}`;
    const reversePairKey = `${toToken}-${fromToken}`;

    return depthMap[pairKey] || depthMap[reversePairKey] || {
      bidDepth: 500000,  // $500K default
      askDepth: 500000,  // $500K default
      spread: 0.1
    };
  }

  // ICDEX uses direct pairs (no hub routing for simplicity)
  private calculatePath(fromToken: string, toToken: string): string[] {
    return [fromToken, toToken];
  }

  // Mock token prices (consistent with other agents)
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
      'ICP': 8.5,
      'ckUSDC': 1.0,
      'ckUSDT': 1.0,
    };
    return prices[token] || 1;
  }

  // Simulate orderbook query delay
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Testing utilities
  setAvailability(available: boolean): void {
    this.isOnline = available;
  }

  setMinTradeSize(minUsd: number): void {
    this.minTradeUsd = minUsd;
  }

  // Advanced orderbook features
  getOrderTypes(): string[] {
    return ['Market', 'Limit', 'Stop-Limit', 'FOK', 'IOC'];
  }

  getAdvancedFeatures(): any {
    return {
      iceberg_orders: true,
      twap_orders: true,
      vwap_orders: true,
      grid_trading: true,
      api_trading: true
    };
  }

  // Simulate real orderbook data structure
  getOrderbook(fromToken: string, toToken: string, depth: number = 10): any {
    const basePrice = this.getTokenPrice(toToken) / this.getTokenPrice(fromToken);
    const spread = 0.02; // 2% spread

    const bids = [];
    const asks = [];

    // Generate mock bid/ask levels
    for (let i = 0; i < depth; i++) {
      const bidPrice = basePrice * (1 - spread/2 - (i * 0.001));
      const askPrice = basePrice * (1 + spread/2 + (i * 0.001));

      bids.push({
        price: bidPrice,
        amount: Math.random() * 1000 + 100,
        total: 0 // Will be calculated
      });

      asks.push({
        price: askPrice,
        amount: Math.random() * 1000 + 100,
        total: 0 // Will be calculated
      });
    }

    return { bids, asks, spread: spread * 100 };
  }
}