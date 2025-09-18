// ===============================================
// MASTER ASSET DATA - Complete Asset Registry
// ===============================================
// 🛡️ SAFE BACKUP: Contains ALL assets from original + new work
// Compatible with: Original Dapp, Old .ts files, NEW modules
// ✅ Includes: ckSOL, SOL, USDCs (NEW additions)

export interface Asset {
  symbol: string;
  name: string;
  icon: string;
  price: number;
  chain: 'ICP' | 'Bitcoin' | 'Ethereum' | 'Solana';
  type: 'native' | 'ck-token';
  category: 'crypto' | 'stablecoin';
  isL1: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
}

export interface Portfolio {
  [asset: string]: number;
}

// ===============================================
// COMPLETE ASSET REGISTRY (Original + New + ckSOL)
// ===============================================

export const MASTER_ASSETS: { [key: string]: Asset } = {
  // BITCOIN ECOSYSTEM
  'BTC': { 
    symbol: 'BTC', 
    name: 'Bitcoin', 
    icon: './assets/images/BTC.svg', 
    price: 97600, 
    chain: 'Bitcoin', 
    type: 'native',
    category: 'crypto',
    isL1: true,
    canDeposit: true,
    canWithdraw: true
  },
  'ckBTC': { 
    symbol: 'ckBTC', 
    name: 'Chain Key Bitcoin', 
    icon: './assets/images/ckBTC.svg', 
    price: 97600, 
    chain: 'ICP', 
    type: 'ck-token',
    category: 'crypto',
    isL1: false,
    canDeposit: true,
    canWithdraw: false
  },

  // ETHEREUM ECOSYSTEM  
  'ETH': { 
    symbol: 'ETH', 
    name: 'Ethereum', 
    icon: './assets/images/ETH.svg', 
    price: 3800, 
    chain: 'Ethereum', 
    type: 'native',
    category: 'crypto',
    isL1: true,
    canDeposit: true,
    canWithdraw: true
  },
  'ckETH': { 
    symbol: 'ckETH', 
    name: 'Chain Key Ethereum', 
    icon: './assets/images/ckETH.svg', 
    price: 3800, 
    chain: 'ICP', 
    type: 'ck-token',
    category: 'crypto',
    isL1: false,
    canDeposit: true,
    canWithdraw: false
  },
  'USDC': { 
    symbol: 'USDC', 
    name: 'USD Coin', 
    icon: './assets/images/ckUSDC.svg', 
    price: 1.00, 
    chain: 'Ethereum', 
    type: 'native',
    category: 'stablecoin',
    isL1: true,
    canDeposit: true,
    canWithdraw: true
  },
  'ckUSDC': { 
    symbol: 'ckUSDC', 
    name: 'Chain Key USDC', 
    icon: './assets/images/ckUSDC.svg', 
    price: 1.00, 
    chain: 'ICP', 
    type: 'ck-token',
    category: 'stablecoin',
    isL1: false,
    canDeposit: true,
    canWithdraw: false
  },
  'USDT': { 
    symbol: 'USDT', 
    name: 'Tether', 
    icon: './assets/images/ckUSDT.svg', 
    price: 1.00, 
    chain: 'Ethereum', 
    type: 'native',
    category: 'stablecoin',
    isL1: true,
    canDeposit: true,
    canWithdraw: true
  },
  'ckUSDT': { 
    symbol: 'ckUSDT', 
    name: 'Chain Key USDT', 
    icon: './assets/images/ckUSDT.svg', 
    price: 1.00, 
    chain: 'ICP', 
    type: 'ck-token',
    category: 'stablecoin',
    isL1: false,
    canDeposit: true,
    canWithdraw: false
  },


  // INTERNET COMPUTER
  'ICP': { 
    symbol: 'ICP', 
    name: 'Internet Computer', 
    icon: './assets/images/ICP.svg', 
    price: 12.50, 
    chain: 'ICP', 
    type: 'native',
    category: 'crypto',
    isL1: false,
    canDeposit: true,
    canWithdraw: false
  }
};

// ===============================================
// COMPATIBILITY EXPORTS (For Legacy Code)
// ===============================================

// Legacy format for original Dapp HTML
export const ASSET_PRICES: { [key: string]: number } = Object.entries(MASTER_ASSETS).reduce((acc, [symbol, asset]) => {
  acc[symbol] = asset.price;
  return acc;
}, {} as { [key: string]: number });

// Legacy format for original Dapp HTML
export const ASSET_ICONS: { [key: string]: string } = Object.entries(MASTER_ASSETS).reduce((acc, [symbol, asset]) => {
  acc[symbol] = asset.icon;
  return acc;
}, {} as { [key: string]: string });

// Legacy format for old .ts files
export const ASSETS = MASTER_ASSETS;

// ===============================================
// ASSET CATEGORY ARRAYS
// ===============================================

// Assets that can be held in portfolio (ck-tokens + ICP only)
export const PORTFOLIO_ASSETS = Object.keys(MASTER_ASSETS).filter(
  symbol => MASTER_ASSETS[symbol].chain === 'ICP'
);

// All possible swap destinations (including L1 withdrawals)
export const ALL_SWAP_DESTINATIONS = Object.keys(MASTER_ASSETS);

// L1 withdrawal destinations (native assets on their chains)
export const L1_WITHDRAWAL_ASSETS = Object.keys(MASTER_ASSETS).filter(
  symbol => MASTER_ASSETS[symbol].isL1
);

// Chain Fusion deposit sources (L1 assets that can be deposited via Chain Fusion)
export const CHAIN_FUSION_SOURCES = ['BTC', 'ETH', 'USDC', 'USDT'];

// ICRC/ICP native assets (can be deposited directly on ICP)
export const ICRC_ICP_ASSETS = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'];

// Stablecoins (for special handling)
export const STABLECOINS = Object.keys(MASTER_ASSETS).filter(
  symbol => MASTER_ASSETS[symbol].category === 'stablecoin'
);

// Major cryptocurrencies (for prioritization)
export const MAJOR_CRYPTOS = ['BTC', 'ckBTC', 'ETH', 'ckETH', 'ICP'];

// ===============================================
// HELPER FUNCTIONS
// ===============================================

/**
 * Gets asset information by symbol
 */
export function getAsset(symbol: string): Asset | null {
  return MASTER_ASSETS[symbol] || null;
}

/**
 * Gets asset price by symbol
 */
export function getAssetPrice(symbol: string): number {
  return MASTER_ASSETS[symbol]?.price || 0;
}

/**
 * Gets asset icon by symbol
 */
export function getAssetIcon(symbol: string): string {
  return MASTER_ASSETS[symbol]?.icon || '?';
}

/**
 * Determines the destination chain for a given asset
 */
export function getDestinationChain(asset: string): 'ICP' | 'Bitcoin' | 'Ethereum' | 'Solana' {
  const assetInfo = MASTER_ASSETS[asset];
  return assetInfo?.chain || 'ICP';
}

/**
 * Checks if a swap involves L1 withdrawal (Chain Fusion)
 */
export function isL1Withdrawal(toAsset: string): boolean {
  return MASTER_ASSETS[toAsset]?.isL1 || false;
}

/**
 * Checks if an asset is a stablecoin
 */
export function isStablecoin(asset: string): boolean {
  return MASTER_ASSETS[asset]?.category === 'stablecoin' || false;
}

/**
 * Checks if an asset is a ck-token
 */
export function isCkToken(asset: string): boolean {
  return MASTER_ASSETS[asset]?.type === 'ck-token' || false;
}

/**
 * Gets the corresponding ck-token for an L1 asset
 */
export function getCkTokenForL1(l1Asset: string): string | null {
  const ckTokenMap: { [key: string]: string } = {
    'BTC': 'ckBTC',
    'ETH': 'ckETH', 
    'USDC': 'ckUSDC',
    'USDT': 'ckUSDT',
  };
  return ckTokenMap[l1Asset] || null;
}

/**
 * Gets the corresponding L1 asset for a ck-token
 */
export function getL1ForCkToken(ckAsset: string): string | null {
  const l1Map: { [key: string]: string } = {
    'ckBTC': 'BTC',
    'ckETH': 'ETH',
    'ckUSDC': 'USDC',
    'ckUSDT': 'USDT',
  };
  return l1Map[ckAsset] || null;
}

/**
 * Gets available destination assets for a given source asset
 */
export function getAvailableDestinations(fromAsset: string): string[] {
  return ALL_SWAP_DESTINATIONS.filter(asset => asset !== fromAsset);
}

/**
 * Gets assets available for deposit based on deposit type
 */
export function getDepositableAssets(depositType: 'chain-fusion' | 'icrc-icp' | 'all'): string[] {
  switch (depositType) {
    case 'chain-fusion':
      return CHAIN_FUSION_SOURCES;
    case 'icrc-icp':
      return ICRC_ICP_ASSETS;
    case 'all':
      return Object.keys(MASTER_ASSETS).filter(symbol => MASTER_ASSETS[symbol].canDeposit);
    default:
      return [];
  }
}

/**
 * Gets formatted display information for UI components
 */
export function getAssetDisplayInfo(asset: string): {
  name: string;
  icon: string;
  chainBadge: string;
  description: string;
  category: string;
} {
  const assetInfo = MASTER_ASSETS[asset];
  if (!assetInfo) {
    return {
      name: asset,
      icon: '?',
      chainBadge: 'Unknown',
      description: 'Unknown asset',
      category: 'unknown'
    };
  }

  let chainBadge = '';
  let description = '';

  if (assetInfo.isL1) {
    chainBadge = `${assetInfo.chain} L1`;
    description = `Native ${asset} on ${assetInfo.chain}`;
  } else {
    chainBadge = 'ICP';
    description = assetInfo.type === 'ck-token' 
      ? `Chain Key ${asset.replace('ck', '')}` 
      : assetInfo.name;
  }

  return {
    name: assetInfo.name,
    icon: assetInfo.icon,
    chainBadge,
    description,
    category: assetInfo.category
  };
}

/**
 * Validates if a swap is technically possible
 */
export function validateSwapPossibility(fromAsset: string, toAsset: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (!fromAsset || !toAsset) {
    errors.push('Both source and destination assets must be selected');
  }

  if (fromAsset === toAsset) {
    errors.push('Cannot swap the same asset');
  }

  if (!MASTER_ASSETS[fromAsset]) {
    errors.push(`Unknown source asset: ${fromAsset}`);
  }

  if (!MASTER_ASSETS[toAsset]) {
    errors.push(`Unknown destination asset: ${toAsset}`);
  }

  // Check if from asset can be held in portfolio
  if (fromAsset && !PORTFOLIO_ASSETS.includes(fromAsset)) {
    errors.push(`${fromAsset} cannot be held in portfolio. Only ICP assets can be swapped.`);
  }

  // Add warnings for cross-chain swaps
  if (isL1Withdrawal(toAsset)) {
    warnings.push(`This is a cross-chain withdrawal to ${getDestinationChain(toAsset)} L1. Additional fees and time required.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Calculates portfolio statistics
 */
export function calculatePortfolioStats(portfolio: Portfolio): {
  totalValue: number;
  assetCount: number;
  diversityMultiplier: number;
  categoryBreakdown: { [category: string]: number };
  chainBreakdown: { [chain: string]: number };
} {
  let totalValue = 0;
  const assetCount = Object.keys(portfolio).length;
  const categoryBreakdown: { [category: string]: number } = {};
  const chainBreakdown: { [chain: string]: number } = {};

  // Calculate values and breakdowns
  Object.entries(portfolio).forEach(([asset, amount]) => {
    const assetInfo = MASTER_ASSETS[asset];
    if (assetInfo) {
      const value = amount * assetInfo.price;
      totalValue += value;

      // Category breakdown
      categoryBreakdown[assetInfo.category] = (categoryBreakdown[assetInfo.category] || 0) + value;

      // Chain breakdown
      chainBreakdown[assetInfo.chain] = (chainBreakdown[assetInfo.chain] || 0) + value;
    }
  });

  // Calculate diversity multiplier
  let diversityMultiplier = 1.0;
  if (assetCount >= 2) diversityMultiplier = 1.25;
  if (assetCount >= 3) diversityMultiplier = 1.5;
  if (assetCount >= 4) diversityMultiplier = 1.8;
  if (assetCount >= 5) diversityMultiplier = 2.2;

  return {
    totalValue,
    assetCount,
    diversityMultiplier,
    categoryBreakdown,
    chainBreakdown
  };
}

// ===============================================
// MOCK DATA FOR DEVELOPMENT
// ===============================================

export const MOCK_PORTFOLIO: Portfolio = {
  'ckBTC': 0.1,
  'ckETH': 2.0,
  'ckUSDC': 1000,
  'ckUSDT': 500,
  'ICP': 1000
};

export const MOCK_PRICES_UPDATE = {
  ...ASSET_PRICES,
  // Live price simulation would go here
};

// ===============================================
// EXPORT ALL FOR COMPATIBILITY
// ===============================================

export default {
  MASTER_ASSETS,
  ASSET_PRICES,
  ASSET_ICONS,
  ASSETS,
  PORTFOLIO_ASSETS,
  ALL_SWAP_DESTINATIONS,
  L1_WITHDRAWAL_ASSETS,
  CHAIN_FUSION_SOURCES,
  ICRC_ICP_ASSETS,
  STABLECOINS,
  MAJOR_CRYPTOS,
  getAsset,
  getAssetPrice,
  getAssetIcon,
  getDestinationChain,
  isL1Withdrawal,
  isStablecoin,
  isCkToken,
  getCkTokenForL1,
  getL1ForCkToken,
  getAvailableDestinations,
  getDepositableAssets,
  getAssetDisplayInfo,
  validateSwapPossibility,
  calculatePortfolioStats,
  MOCK_PORTFOLIO
};