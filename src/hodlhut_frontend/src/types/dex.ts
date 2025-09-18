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
  badge?: "RECOMMENDED" | "ADVANCED" | "FASTEST" | "CHEAPEST" | "LOWEST_COST";
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