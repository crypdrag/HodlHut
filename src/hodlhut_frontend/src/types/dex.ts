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

// Utility functions for stub implementations
export class DEXUtils {
  // Calculate slippage based on trade size and liquidity
  static calculateSlippage(tradeAmountUsd: number, liquidityUsd: number): number {
    const impactRatio = tradeAmountUsd / liquidityUsd;

    if (impactRatio < 0.001) return 0.05; // 0.05% for small trades
    if (impactRatio < 0.01) return 0.1;   // 0.1% for medium trades
    if (impactRatio < 0.05) return 0.5;   // 0.5% for large trades
    if (impactRatio < 0.1) return 1.0;    // 1% for very large trades
    return 2.5; // 2.5% for huge trades
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