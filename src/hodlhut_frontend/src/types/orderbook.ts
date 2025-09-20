// Orderbook Types for ICDEX Professional Trading

export type OrderType = 'market' | 'limit';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'partial' | 'filled' | 'cancelled' | 'failed';

export interface LimitOrder {
  id: string;
  userId: string;
  side: OrderSide;
  type: OrderType;
  fromAsset: string;
  toAsset: string;
  price: number;        // Price per unit in toAsset terms
  amount: number;       // Amount in fromAsset units
  filled: number;       // Amount already filled
  remaining: number;    // Amount remaining to fill
  status: OrderStatus;
  createdAt: number;    // Unix timestamp
  updatedAt: number;    // Unix timestamp
  expiresAt?: number;   // Optional expiration timestamp
  slippage?: number;    // Max acceptable slippage (%)
  fees: {
    estimated: number;  // Estimated fees in USD
    actual?: number;    // Actual fees paid (when filled)
  };
}

export interface OrderbookEntry {
  price: number;
  amount: number;
  total: number;        // Cumulative total at this price level
  orders: number;       // Number of orders at this price
}

export interface OrderbookData {
  pair: string;         // e.g., "ckBTC/ICP"
  bids: OrderbookEntry[];  // Buy orders (highest price first)
  asks: OrderbookEntry[];  // Sell orders (lowest price first)
  spread: number;       // Bid-ask spread
  lastPrice: number;    // Last traded price
  volume24h: number;    // 24h volume in base asset
  timestamp: number;    // Last update timestamp
}

export interface LimitOrderInput {
  side: OrderSide;
  fromAsset: string;
  toAsset: string;
  price: string;        // String for input validation
  amount: string;       // String for input validation
  orderType: OrderType;
  slippage: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK';  // Good Till Cancelled, Immediate Or Cancel, Fill Or Kill
}

export interface OrderValidation {
  isValid: boolean;
  errors: {
    price?: string;
    amount?: string;
    slippage?: string;
    liquidity?: string;
    balance?: string;
    general?: string;
  };
  warnings: {
    highSlippage?: string;
    lowLiquidity?: string;
    priceImpact?: string;
  };
}

export interface OrderExecutionResult {
  success: boolean;
  orderId?: string;
  transactionId?: string;
  estimatedFees: number;
  estimatedTime: string;
  error?: string;
  partialFill?: {
    filled: number;
    remaining: number;
    averagePrice: number;
  };
}

// Error types for enhanced error handling
export interface OrderbookError {
  code: 'INSUFFICIENT_LIQUIDITY' | 'INVALID_SLIPPAGE' | 'WALLET_APPROVAL_FAILED' |
        'BALANCE_INSUFFICIENT' | 'PRICE_OUT_OF_RANGE' | 'ORDER_SIZE_TOO_SMALL' |
        'MARKET_CLOSED' | 'NETWORK_ERROR';
  message: string;
  details?: any;
  recoverable: boolean;
  suggestedAction?: string;
}