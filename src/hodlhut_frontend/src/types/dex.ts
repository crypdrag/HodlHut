// DEX Integration Types
// Based on the DEXQuote specification for agent-driven UI integration

export interface DEXQuote {
  // DEX Identity
  dexName: string;          // e.g., "ICPSwap", "KongSwap", "ICDEX"
  path: string[];           // token swap path, e.g., ["ckBTC", "ICP", "ckUSDC"]

  // Quote Metrics
  slippage: number;         // % slippage, e.g., 0.18 (for 0.18%)
  fee: number;              // % swap fee, e.g., 0.3 (for 0.3%)
  estimatedSpeed: string;   // e.g., "1.5s", "On-chain orderbook"
  liquidityUsd: number;     // pool depth in USD, e.g., 425000

  // Scoring and UX
  score: number;            // agent-generated score for ranking (0-100)
  badge?: "RECOMMENDED" | "ADVANCED" | "FASTEST" | "CHEAPEST";
  reason: string;           // human-readable rationale, e.g., "Lowest slippage + good liquidity"

  // Optional Fallback Metadata
  quoteError?: string;      // populated if quote fails or DEX unavailable
}

// Route Input for DEXRoutingAgent
export interface RouteInput {
  fromToken: string;        // e.g., "ckBTC"
  toToken: string;          // e.g., "ckUSDC"
  amount: number;           // in satoshis or token decimals
  urgency?: "low" | "medium" | "high";
  userPreference?: "fastest" | "lowest_cost" | "most_liquid";
  slippageTolerance?: number; // e.g., 1.0 for 1% slippage tolerance
}

// Scoring Weights Configuration
export interface ScoringWeights {
  slippage: number;         // default: 40%
  fee: number;              // default: 30%
  speed: number;            // default: 15%
  liquidityDepth: number;   // default: 10%
  availability: number;     // default: 5%
}

// DEX Adapter Interface (for agent stubs)
export interface DEXAdapter {
  getDEXName(): string;
  getQuote(fromToken: string, toToken: string, amount: number): Promise<DEXQuote>;
  isAvailable(): Promise<boolean>;
}

// DEX Routing Agent Interface
export interface DEXRoutingAgent {
  getBestRoutes(input: RouteInput): Promise<DEXQuote[]>;
  getAvailableDEXs(): string[];
  updateScoringWeights(weights: Partial<ScoringWeights>): void;
}

// Enhanced DEX Options (extends existing structure)
export interface EnhancedDEXData {
  name: string;
  badge: 'speed' | 'liquidity' | 'orderbook';
  stats: Record<string, string>;
  advantages: string[];
  tradeoffs: string[];
  // New fields for agent integration
  minTradeUsd?: number;     // minimum trade size for this DEX
  maxTradeUsd?: number;     // maximum recommended trade size
  orderTypes?: string[];    // e.g., ["Market", "Limit"] for ICDEX
}

// Mock data for stub implementations
export const MOCK_EXCHANGE_RATES: Record<string, Record<string, number>> = {
  'ICP': {
    'ckBTC': 0.000104,  // 12/115474 ≈ 0.000104
    'ckETH': 0.00375,   // 12/3200 ≈ 0.00375
    'ckUSDC': 12.0,
    'ckUSDT': 12.0
  },
  'ckBTC': {
    'ICP': 9622.8,     // 115474/12 ≈ 9623
    'ckETH': 36.08,     // 115474/3200 ≈ 36
    'ckUSDC': 115474.0, // Current BTC price
    'ckUSDT': 115474.0  // Current BTC price
  },
  'ckETH': {
    'ICP': 266.7,      // 3200/12 ≈ 267
    'ckBTC': 0.0277,   // 3200/115474 ≈ 0.0277
    'ckUSDC': 3200.0,
    'ckUSDT': 3200.0
  },
  'ckUSDC': {
    'ICP': 0.083,      // 1/12 ≈ 0.083
    'ckBTC': 0.00000866, // 1/115474 ≈ 0.00000866
    'ckETH': 0.0003125, // 1/3200 = 0.0003125
    'ckUSDT': 1.0
  },
  'ckUSDT': {
    'ICP': 0.083,      // 1/12 ≈ 0.083
    'ckBTC': 0.00000866, // 1/115474 ≈ 0.00000866
    'ckETH': 0.0003125, // 1/3200 = 0.0003125
    'ckUSDC': 1.0
  }
};

// Mock liquidity data (in USD)
export const MOCK_LIQUIDITY_USD: Record<string, Record<string, number>> = {
  'ICP': {
    'ckBTC': 2500000,  // $2.5M
    'ckETH': 1800000,   // $1.8M
    'ckUSDC': 5000000,  // $5M
    'ckUSDT': 3200000   // $3.2M
  },
  'ckBTC': {
    'ICP': 2500000,
    'ckETH': 8500000,   // $8.5M
    'ckUSDC': 12000000, // $12M
    'ckUSDT': 9000000   // $9M
  },
  'ckETH': {
    'ICP': 1800000,
    'ckBTC': 8500000,
    'ckUSDC': 15000000, // $15M
    'ckUSDT': 11000000  // $11M
  },
  'ckUSDC': {
    'ICP': 5000000,
    'ckBTC': 12000000,
    'ckETH': 15000000,
    'ckUSDT': 25000000  // $25M
  },
  'ckUSDT': {
    'ICP': 3200000,
    'ckBTC': 9000000,
    'ckETH': 11000000,
    'ckUSDC': 25000000
  }
};

// REAL ICDEX orderbook data based on actual market collection (Sep 21, 2025)
// Source: Direct ICDEX UI analysis of 62 total pairs, active trading data
export const ICDEX_ORDERBOOK_DEPTH: Record<string, Record<string, { bidDepth: number, askDepth: number, spread: number, fee: number, volume24h: number, isActive: boolean }>> = {
  'ckBTC': {
    'ICP': { bidDepth: 8000000, askDepth: 7200000, spread: 0.08, fee: 0.3, volume24h: 2320000, isActive: true }, // EXCELLENT: 2.32M ICP volume, best liquidity
    'ckETH': { bidDepth: 200000, askDepth: 180000, spread: 0.15, fee: 0.3, volume24h: 40, isActive: true }, // MODERATE: 40 ckBTC volume
    'ckUSDT': { bidDepth: 0, askDepth: 0, spread: 0, fee: 0.5, volume24h: 0, isActive: false } // DEAD: Zero liquidity confirmed
  },
  'ckETH': {
    'ICP': { bidDepth: 1500000, askDepth: 1350000, spread: 0.12, fee: 0.3, volume24h: 95933, isActive: true }, // GOOD: 95.9K ICP volume
    'ckBTC': { bidDepth: 180000, askDepth: 200000, spread: 0.15, fee: 0.3, volume24h: 40, isActive: true }, // MODERATE: 40 ckBTC volume
    'ckUSDT': { bidDepth: 15000, askDepth: 12000, spread: 0.25, fee: 0.5, volume24h: 297, isActive: false } // STALE: Ancient pricing (2,150 ckUSDT)
  },
  'ICP': {
    'ckBTC': { bidDepth: 7200000, askDepth: 8000000, spread: 0.08, fee: 0.3, volume24h: 2320000, isActive: true }, // EXCELLENT: 2.32M ICP volume, best liquidity
    'ckETH': { bidDepth: 1350000, askDepth: 1500000, spread: 0.12, fee: 0.3, volume24h: 95933, isActive: true }, // GOOD: 95.9K ICP volume
    'ckUSDC': { bidDepth: 280000, askDepth: 250000, spread: 0.18, fee: 0.5, volume24h: 55555, isActive: true } // MODERATE: 55.5K ckUSDC volume, higher 0.5% fee
  },
  'ckUSDC': {
    'ICP': { bidDepth: 250000, askDepth: 280000, spread: 0.18, fee: 0.5, volume24h: 55555, isActive: true }, // MODERATE: 55.5K ckUSDC volume, higher 0.5% fee
    'ckBTC': { bidDepth: 0, askDepth: 0, spread: 0, fee: 0.5, volume24h: 0, isActive: false }, // NO DIRECT PAIR
    'ckETH': { bidDepth: 0, askDepth: 0, spread: 0, fee: 0.5, volume24h: 0, isActive: false } // NO DIRECT PAIR
  },
  'ckUSDT': {
    'ckBTC': { bidDepth: 0, askDepth: 0, spread: 0, fee: 0.5, volume24h: 0, isActive: false }, // DEAD: Zero liquidity confirmed
    'ckETH': { bidDepth: 12000, askDepth: 15000, spread: 0.25, fee: 0.5, volume24h: 297, isActive: false }, // STALE: Ancient pricing
    'ICP': { bidDepth: 0, askDepth: 0, spread: 0, fee: 0.5, volume24h: 0, isActive: false } // NO LIQUIDITY
  }
};

// Utility functions for stub implementations
export class DEXUtils {
  // Calculate KongSwap slippage based on real data collected Dec 2024
  static calculateKongSwapSlippage(tradeAmountUsd: number, fromToken: string, toToken: string): number {
    // Real KongSwap data points for mathematical extrapolation
    const realData: Record<string, Record<string, { baseTradeUsd: number, baseImpact: number }>> = {
      'ckBTC': {
        'ckUSDC': { baseTradeUsd: 3462.64, baseImpact: 3.85 },
        'ckETH': { baseTradeUsd: 3462.64, baseImpact: 4.08 },
        'ckUSDT': { baseTradeUsd: 3462.64, baseImpact: 1.67 }
      },
      'ckETH': {
        'ckUSDC': { baseTradeUsd: 223.20, baseImpact: 0.61 },
        'ckUSDT': { baseTradeUsd: 223.20, baseImpact: 0.47 },
        'ICP': { baseTradeUsd: 1121.10, baseImpact: 1.4 }     // Live data: 0.261371118120890875 ckETH → 242.95192847 ICP (1.4% impact, $1.74 fee)
      },
      'ckUSDC': {
        'ckBTC': { baseTradeUsd: 1005.10, baseImpact: 1.35 }, // Live data: 1000 ckUSDC → 0.00861296 ckBTC
        'ICP': { baseTradeUsd: 998.55, baseImpact: 1.2 }      // Live data: 1000 ckUSDC → 216.08338403 ICP (1.2% impact)
      },
      'ICP': {
        'ckUSDC': { baseTradeUsd: 986.55, baseImpact: 1.19 }, // Live data: 216.08338403 ICP → 976.221283 ckUSDC (1.19% impact)
        'ckBTC': { baseTradeUsd: 1136.66, baseImpact: 170.0 }, // CATASTROPHIC: $57.97 TVL, $1935.54 fees, liquidity crisis
        'ckETH': { baseTradeUsd: 1137.14, baseImpact: 1.42 },  // Live data: 250 ICP → 0.261371118120890875 ckETH (1.42% impact, $74.66 fee)
        'ckUSDT': { baseTradeUsd: 1137.42, baseImpact: 0.58 }  // Live data: 250 ICP → 1,130.828072 ckUSDT (0.58% impact, $3.41 fee)
      },
      'ckUSDT': {
        'ICP': { baseTradeUsd: 1130.83, baseImpact: 0.58 }    // Live data: 1,130.828072 ckUSDT → 247.09414775 ICP (0.58% impact, $3.38 fee)
      }
    };

    // Find pair data (check both directions)
    let pairData = realData[fromToken]?.[toToken];
    if (!pairData) {
      // Try reverse lookup - slippage should be similar in both directions
      pairData = realData[toToken]?.[fromToken];
    }

    if (!pairData) {
      // Fallback for unsupported pairs
      return Math.min(8.0, 0.1 + (tradeAmountUsd / 100000) * 2.0);
    }

    // Mathematical extrapolation: Impact scales with sqrt of trade size
    const scaleFactor = Math.sqrt(tradeAmountUsd / pairData.baseTradeUsd);
    return Math.max(0.1, pairData.baseImpact * scaleFactor);
  }

  // Calculate ICPSwap slippage based on real data with mathematical extrapolation
  static calculateICPSwapSlippage(tradeAmountUsd: number, fromToken: string, toToken: string): number {
    // Real ICPSwap data points for mathematical extrapolation
    const icpSwapData: Record<string, Record<string, { baseTradeUsd: number, baseImpact: number }>> = {
      'ckBTC': {
        'ckUSDC': { baseTradeUsd: 561.37, baseImpact: 24.65 }, // Live data: 0.00491553 ckBTC → 422.375 ckUSDC (-24.65% impact)
        'ckETH': { baseTradeUsd: 2280.0, baseImpact: 1.46 },   // Live data: 0.02 ckBTC → 0.519479 ckETH (-1.46% impact)
        'ICP': { baseTradeUsd: 1130.0, baseImpact: 0.25 }      // Live data: 0.00995941 ckBTC → 246.92 ICP (+0.25% favorable execution)
      },
      'ckETH': {
        'ckUSDC': { baseTradeUsd: 846.61, baseImpact: 8.15 },  // Live data: 0.194897 ckETH → 776.582 ckUSDC (-8.15% impact)
        'ckBTC': { baseTradeUsd: 2250.0, baseImpact: 1.12 },   // Live data: 0.519479 ckETH → 0.0194855 ckBTC (-1.12% impact)
        'ICP': { baseTradeUsd: 1120.0, baseImpact: 0.34 }      // Live data: ckETH → ICP (-0.34% impact)
      },
      'ckUSDC': {
        'ckBTC': { baseTradeUsd: 1000.0, baseImpact: 43.94 }, // Live data: 1000 ckUSDC → 0.00491553 ckBTC (-43.94% impact)
        'ckETH': { baseTradeUsd: 1000.0, baseImpact: 15.45 }, // Live data: 1000 ckUSDC → 0.194897 ckETH (-15.45% impact)
        'ICP': { baseTradeUsd: 1000.0, baseImpact: 0.57 }     // Live data: 1000 ckUSDC → 216.856 ICP (-0.57% impact)
      },
      'ICP': {
        'ckUSDC': { baseTradeUsd: 995.59, baseImpact: 0.14 }, // Live data: 216.856 ICP → 992.863 ckUSDC (-0.14% impact)
        'ckBTC': { baseTradeUsd: 1150.0, baseImpact: 0.90 },  // Live data: 250 ICP → 0.00995941 ckBTC (-0.90% impact)
        'ckETH': { baseTradeUsd: 1150.0, baseImpact: 2.37 }   // Live data: ICP → ckETH (-2.37% impact)
      }
    };

    // Find pair data (check both directions)
    let pairData = icpSwapData[fromToken]?.[toToken];
    if (!pairData) {
      // Try reverse lookup for missing pairs
      pairData = icpSwapData[toToken]?.[fromToken];
    }

    if (!pairData) {
      // Mark unsupported pairs as unavailable (ckUSDT pairs)
      return 999; // This will trigger unavailable status
    }

    // Mathematical extrapolation: Impact scales with sqrt of trade size
    const scaleFactor = Math.sqrt(tradeAmountUsd / pairData.baseTradeUsd);
    return Math.max(0.5, pairData.baseImpact * scaleFactor);
  }

  // Legacy method for backward compatibility
  static calculateSlippage(tradeAmountUsd: number, liquidityUsd: number): number {
    // Fallback to KongSwap-style calculation if no specific data
    return this.calculateKongSwapSlippage(tradeAmountUsd, 'ckBTC', 'ckUSDC');
  }

  // Calculate ICDEX orderbook slippage with real market data
  static calculateOrderbookSlippage(tradeAmountUsd: number, fromToken: string, toToken: string): number {
    const orderbookData = ICDEX_ORDERBOOK_DEPTH[fromToken]?.[toToken];
    if (!orderbookData) {
      return 999; // No orderbook data available - mark as unavailable
    }

    const { bidDepth, askDepth, spread, fee, volume24h, isActive } = orderbookData;

    // Check if pair is active with real liquidity
    if (!isActive || volume24h === 0) {
      return 999; // Dead or stale pair - mark as unavailable
    }

    // Volume-based liquidity assessment (excellent orderbook performance for active pairs)
    let volumeBonus = 0;
    if (volume24h > 1000000) volumeBonus = -0.2;      // Excellent volume (>1M): reduce slippage
    else if (volume24h > 50000) volumeBonus = -0.1;   // Good volume (>50K): slight reduction
    else if (volume24h < 1000) volumeBonus = 0.5;     // Low volume (<1K): penalty

    const relevantDepth = Math.min(bidDepth, askDepth); // Use smaller side for conservative estimate
    const impactRatio = tradeAmountUsd / relevantDepth;

    // ICDEX orderbook execution model (superior to AMM for most trades)
    let marketImpact: number;
    if (impactRatio < 0.001) marketImpact = 0.02;      // 0.02% for small trades (excellent)
    else if (impactRatio < 0.005) marketImpact = 0.05; // 0.05% for moderate trades
    else if (impactRatio < 0.01) marketImpact = 0.12;  // 0.12% for medium trades
    else if (impactRatio < 0.02) marketImpact = 0.25;  // 0.25% for large trades
    else if (impactRatio < 0.05) marketImpact = 0.6;   // 0.6% for very large trades
    else if (impactRatio < 0.1) marketImpact = 1.4;    // 1.4% for huge trades
    else if (impactRatio < 0.2) marketImpact = 3.2;    // 3.2% for massive trades
    else marketImpact = 6.5; // 6.5% maximum even for extreme trades

    // Total execution cost: spread + market impact + volume adjustment
    const totalSlippage = marketImpact + spread + volumeBonus;

    // ICDEX advantage: Even worst case (6.5%) is better than ICPSwap 43.94% or KongSwap 155%
    return Math.max(0.02, totalSlippage); // Minimum 0.02% (orderbook advantage)
  }

  // Convert amount to USD for calculations
  static convertToUSD(amount: number, token: string): number {
    const usdRates: Record<string, number> = {
      'ICP': 12.0,
      'ckBTC': 115474.0,  // Updated to current BTC price
      'ckETH': 3200.0,
      'ckUSDC': 1.0,
      'ckUSDT': 1.0
    };

    const decimals = this.getTokenDecimals(token);
    const humanAmount = amount / Math.pow(10, decimals);
    return humanAmount * (usdRates[token] || 1.0);
  }

  // Get decimal places for token
  static getTokenDecimals(token: string): number {
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

  // Calculate score based on slippage, fee, and liquidity
  static calculateScore(slippage: number, fee: number, liquidityUsd: number, speed: string): number {
    let score = 100;

    // Penalize high slippage (weight: 40%)
    score -= (slippage * 8); // 1% slippage = -8 points

    // Penalize high fees (weight: 30%)
    score -= (fee * 10); // 0.3% fee = -3 points

    // Reward high liquidity (weight: 20%)
    const liquidityScore = Math.min(liquidityUsd / 1000000, 10); // Cap at 10M
    score += liquidityScore * 2;

    // Speed bonus (weight: 10%)
    if (speed.includes('1.5s') || speed.includes('5-15')) score += 5;
    else if (speed.includes('orderbook')) score += 3;

    return Math.max(0, Math.min(100, score));
  }
}