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
    // ICDEX has high uptime due to native IC orderbook
    return this.isOnline && Math.random() > 0.01; // 99% uptime
  }

  async getQuote(fromToken: string, toToken: string, amount: number): Promise<DEXQuote> {
    // Check minimum trade size
    const tradeValueUsd = amount * this.getTokenPrice(fromToken);
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
    const tradeValueUsd = amount * this.getTokenPrice(fromToken);
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
    const totalDepth = orderBook.bidDepth + orderBook.askDepth;
    const tradePercent = tradeValueUsd / totalDepth;

    // Orderbook slippage is more favorable for large trades
    let slippage = 0;

    if (tradePercent < 0.01) { // <1% of book depth
      slippage = 0.02 + Math.random() * 0.03; // 0.02-0.05%
    } else if (tradePercent < 0.05) { // 1-5% of book depth
      slippage = 0.05 + (tradePercent * 2); // 0.05-0.15%
    } else if (tradePercent < 0.1) { // 5-10% of book depth
      slippage = 0.15 + (tradePercent * 3); // 0.15-0.45%
    } else { // >10% of book depth
      slippage = Math.min(2.0, 0.5 + (tradePercent * 5)); // Cap at 2%
    }

    return slippage;
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
  private getTokenPrice(token: string): number {
    const prices: Record<string, number> = {
      'ckBTC': 65000,
      'ckETH': 2500,
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