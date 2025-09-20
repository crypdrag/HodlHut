// TypeScript interfaces for MyHut canister integration

// Asset types supported by the platform (both IC-native and L1 assets)
export type AssetType =
  | 'ICP'
  | 'ckBTC'
  | 'ckETH'
  | 'ckUSDC'
  | 'ckUSDT'
  | 'BTC'
  | 'ETH'
  | 'USDC'
  | 'USDT';

// Transaction urgency levels
export type SwapUrgency = 'low' | 'medium' | 'high';

// Swap request interface for executing trades
export interface SwapRequest {
  fromAsset: AssetType;
  toAsset: AssetType;
  amount: string; // Amount as string to handle large numbers safely
  slippage: number; // Maximum acceptable slippage percentage (e.g., 0.5 for 0.5%)
  dexPreference?: string; // Optional DEX preference ("KongSwap", "ICPSwap", "ICDEX")
  urgency: SwapUrgency; // Transaction urgency
  maxFeeUsd?: number; // Maximum acceptable fee in USD
}

// Swap route information
export interface SwapRoute {
  dexUsed: string; // Which DEX was used
  steps: string[]; // Steps in the swap process
  estimatedTime: string; // Estimated completion time
  complexity: string; // "Simple", "Complex", etc.
}

// Swap response interface returned from execute_swap
export interface SwapResponse {
  success: boolean;
  transactionId?: string;
  outputAmount?: string; // Actual amount received as string
  actualFeeUsd?: number; // Actual fee paid in USD
  executionTime?: number; // Timestamp of execution
  errorMessage?: string; // Error message if failed
  route?: SwapRoute; // The route taken for the swap
}

// Balance entry for asset holdings
export interface BalanceEntry {
  asset: AssetType;
  balance: string; // Balance as string to handle large numbers safely
  balanceUsd: number; // USD value of balance
  lastUpdated: number; // Timestamp of last update
}

// MyHut canister interface for frontend calls
export interface MyHutCanister {
  // Initialize the Hut with an owner
  initialize: (hutOwner: string) => Promise<{ ok?: string; err?: string }>;

  // Execute a swap transaction
  execute_swap: (request: SwapRequest) => Promise<SwapResponse>;

  // Get all current balances
  get_balance: () => Promise<BalanceEntry[]>;

  // Get specific asset balance
  get_asset_balance: (asset: AssetType) => Promise<BalanceEntry | null>;

  // Get owner information
  get_owner: () => Promise<string | null>;

  // Check if Hut is initialized
  is_initialized: () => Promise<boolean>;
}

// Conversion utilities for working with the canister
export class MyHutUtils {
  // Convert AssetType to the variant format expected by Motoko
  static assetTypeToMotoko(asset: AssetType): Record<string, null> {
    return { [asset]: null };
  }

  // Convert Motoko asset variant back to TypeScript enum
  static assetTypeFromMotoko(motokoAsset: Record<string, null>): AssetType {
    const key = Object.keys(motokoAsset)[0];
    return key as AssetType;
  }

  // Convert urgency to Motoko variant format
  static urgencyToMotoko(urgency: SwapUrgency): Record<string, null> {
    return { [urgency]: null };
  }

  // Convert string amount to bigint for Motoko (handles large numbers)
  static stringToBigInt(amount: string): bigint {
    return BigInt(amount);
  }

  // Convert bigint back to string for frontend display
  static bigIntToString(amount: bigint): string {
    return amount.toString();
  }

  // Format balance for display (with proper decimals)
  static formatBalance(balance: string, asset: AssetType): string {
    const decimals = this.getAssetDecimals(asset);
    const num = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    const wholePart = num / divisor;
    const fractionalPart = num % divisor;

    if (fractionalPart === 0n) {
      return wholePart.toString();
    }

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    return `${wholePart}.${fractionalStr.replace(/0+$/, '')}`;
  }

  // Get decimal places for each asset
  static getAssetDecimals(asset: AssetType): number {
    switch (asset) {
      case 'ICP':
      case 'ckBTC':
      case 'BTC':
        return 8;
      case 'ckETH':
      case 'ETH':
        return 18;
      case 'ckUSDC':
      case 'ckUSDT':
      case 'USDC':
      case 'USDT':
        return 6;
      default:
        return 8; // Default to 8 decimals
    }
  }

  // Convert human-readable amount to smallest units
  static toSmallestUnits(amount: string, asset: AssetType): string {
    const decimals = this.getAssetDecimals(asset);
    const num = parseFloat(amount);
    const multiplier = 10 ** decimals;
    return Math.floor(num * multiplier).toString();
  }
}

// Error types for better error handling
export class MyHutError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MyHutError';
  }
}

// Common error codes
export const MyHutErrorCodes = {
  NOT_INITIALIZED: 'NOT_INITIALIZED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  UNSUPPORTED_ASSET: 'UNSUPPORTED_ASSET',
  SLIPPAGE_EXCEEDED: 'SLIPPAGE_EXCEEDED',
  FEE_TOO_HIGH: 'FEE_TOO_HIGH',
  SWAP_FAILED: 'SWAP_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR'
} as const;

export type MyHutErrorCode = typeof MyHutErrorCodes[keyof typeof MyHutErrorCodes];