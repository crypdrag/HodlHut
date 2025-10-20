// ===============================================
// MASTER SWAP LOGIC - Complete Swap Engine
// ===============================================
// 🛡️ SAFE BACKUP: Contains ALL swap logic from our extraction work
// Includes: Route calculations, Fee management, Smart solutions, 
//          Visual brackets, DEX integration, Price impact
// ✅ Works with: masterAssetData.ts and all existing components

import {
  MASTER_ASSETS,
  ASSET_PRICES,
  Portfolio,
  isL1Withdrawal,
  getDestinationChain,
  getCkTokenForL1,
  isStablecoin
} from './master_asset_data';


// ===============================================
// CORE INTERFACES
// ===============================================

export interface SwapRoute {
  steps: string[];
  complexity: 'simple' | 'cross-chain';
  estimatedTime: string;
  isCrossChain: boolean;
  chainsInvolved: string[];
  operationType: 'Minter Operation' | 'DEX Swap' | 'DEX + Minter';
}

export interface FeeRequirement {
  token: string;
  amount: number;
  description: string;
  usdValue: number;
  isUserSufficient: boolean;
  purpose: 'dex' | 'gas' | 'network' | 'kyc';
  deductFromFinal?: boolean; // Optional flag for gas fees deducted from final withdrawal amount
  preferredSolution?: 'deduct_from_final' | 'swap_other_asset' | 'manual_topup'; // Preferred Smart Solution
}

export interface SmartSolution {
  id: string;
  type: 'deduct_from_swap' | 'swap_other_asset' | 'manual_topup' | 'auto_swap' | 'use_balance';
  title: string;
  description: string;
  badge: 'RECOMMENDED' | 'REQUIRED STEP' | 'ALTERNATIVE';
  userReceives: {
    amount: number;
    asset: string;
  };
  cost: {
    amount: string;
    asset: string;
    description?: string;
  };
  dexButtons?: string;
  // Enhanced metadata for proper display logic
  metadata?: {
    gasAsset?: string;        // ckETH, ckBTC
    network?: string;         // Ethereum, Bitcoin
    sourceAsset?: string;     // Asset being used to pay for gas
    targetAsset?: string;     // Final destination asset
    dexRecommendation?: string; // Recommended DEX name
  };
  // Detailed swap breakdown for Transaction Preview
  swapDetails?: {
    sourceAsset: string;
    sourceAmount: number;
    targetAsset: string;
    targetAmount: number;
    exchangeRate: number;
    dexFee: number;
    dexFeePercentage: number;
    recommendedDEX: string;
    totalCostUSD: number;
    priceImpact?: number;
  };
}

export interface BaseSwapResult {
  fromAmount: number;
  toAmount: number;
  rate: number;
  priceImpact: number;
  isValidPair: boolean;
}

export interface DEXOption {
  id: string;
  name: string;
  tradingFee: number;
  advantages: string[];
  stats: {
    'Swap Speed': string;
    'Trading Fee': string;
    'Liquidity': string;
    'Slippage': string;
  };
  deepLinkBase: string;
}

export interface CompleteSwapAnalysis {
  success: boolean;
  fromAsset: string;
  toAsset: string;
  amount: number;
  outputAmount: number;
  rate: number;
  priceImpact: number;
  route: SwapRoute;
  feeRequirements: FeeRequirement[];
  needsSmartSolutions: boolean;
  smartSolutions?: SmartSolution[];
  isL1Withdrawal: boolean;
  destinationChain: string;
  totalFeesUSD: number;
  selectedDEX?: string;
  errors?: string[];
}

// ===============================================
// CANONICAL GAS ASSET LOGIC (User-Defined Requirements)
// ===============================================

/**
 * CANONICAL GAS ASSET DETERMINATION LOGIC
 * This implements the exact user-defined requirements for gas asset selection
 * to prevent confusion and ensure consistent behavior across the application.
 */

export interface GasAssetSolution {
  step: 1 | 2 | 3 | 4;
  action: 'use_balance' | 'swap_from_other' | 'swap_from_source' | 'deposit';
  gasAsset: 'ckETH' | 'ckBTC';
  network: 'Ethereum' | 'Bitcoin';
  sourceAsset?: string;
  amount: number;
  hasBalance: boolean;
  description: string;
}

/**
 * Determines correct gas asset based on destination chain
 */
export function getRequiredGasAsset(toAsset: string): { gasAsset: 'ckETH' | 'ckBTC', network: 'Ethereum' | 'Bitcoin' } {
  // ETHEREUM DESTINATIONS: USDC, USDT, ETH
  if (['USDC', 'USDT', 'ETH'].includes(toAsset)) {
    return { gasAsset: 'ckETH', network: 'Ethereum' };
  }

  // BITCOIN DESTINATIONS: BTC
  if (toAsset === 'BTC') {
    return { gasAsset: 'ckBTC', network: 'Bitcoin' };
  }

  // Default fallback (shouldn't happen for L1 withdrawals)
  return { gasAsset: 'ckETH', network: 'Ethereum' };
}

/**
 * CANONICAL USER LOGIC: Any asset swap to Ethereum
 * 1) Does user have ckETH in portfolio? Yes? Use this. No? Go to option 2
 * 2) Does user have other ckAssets that can be swapped for ckETH? Yes? Find best deal show DEX No? Go to option 3
 * 3) Does user agree to swap for ckETH from FROM ASSET ckbalance? Yes? Find best deal show DEX No? Show option 4
 * 4) Does user want to deposit ckETH or ETH? (Final Option)
 */
export function generateCanonicalGasSolutions(
  toAsset: string,
  fromAsset: string,
  gasAmountNeeded: number,
  portfolio: Portfolio
): GasAssetSolution[] {
  const { gasAsset, network } = getRequiredGasAsset(toAsset);
  const solutions: GasAssetSolution[] = [];

  // STEP 1: Check if user has required gas asset in portfolio
  const gasBalance = portfolio[gasAsset] || 0;
  if (gasBalance >= gasAmountNeeded) {
    solutions.push({
      step: 1,
      action: 'use_balance',
      gasAsset,
      network,
      amount: gasAmountNeeded,
      hasBalance: true,
      description: `You have ${gasAsset} in your portfolio! Use ${gasAmountNeeded.toFixed(3)} ${gasAsset} for ${network} gas fees?`
    });
  }

  // STEP 2: Check for other ckAssets that can be swapped for gas asset
  const otherAssets = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP']
    .filter(asset => asset !== gasAsset && asset !== fromAsset)
    .filter(asset => portfolio[asset] && portfolio[asset] > 0);

  if (otherAssets.length > 0) {
    // Find best asset based on value
    const bestAsset = otherAssets.reduce((best, asset) => {
      const bestValue = (portfolio[best] || 0) * (ASSET_PRICES[best] || 0);
      const assetValue = (portfolio[asset] || 0) * (ASSET_PRICES[asset] || 0);
      return assetValue > bestValue ? asset : best;
    }, otherAssets[0]);

    solutions.push({
      step: 2,
      action: 'swap_from_other',
      gasAsset,
      network,
      sourceAsset: bestAsset,
      amount: gasAmountNeeded,
      hasBalance: true,
      description: `Swap from your ${bestAsset} balance to get ${gasAsset} for ${network} gas fees using the best available DEX rate.`
    });
  }

  // STEP 3: Swap from the FROM asset balance
  if (fromAsset !== gasAsset && portfolio[fromAsset] > 0) {
    solutions.push({
      step: 3,
      action: 'swap_from_source',
      gasAsset,
      network,
      sourceAsset: fromAsset,
      amount: gasAmountNeeded,
      hasBalance: true,
      description: `Swap from your ${fromAsset} balance to get ${gasAsset} for ${network} gas fees.`
    });
  }

  // STEP 4: Deposit option (final fallback)
  solutions.push({
    step: 4,
    action: 'deposit',
    gasAsset,
    network,
    amount: gasAmountNeeded,
    hasBalance: false,
    description: `Deposit ${gasAsset} to your portfolio or transfer ${gasAsset.replace('ck', '')} from ${network} network.`
  });

  return solutions;
}

// ===============================================
// ROUTE CALCULATION ENGINE
// ===============================================

/**
 * Main route calculation function - determines optimal swap path
 */
export function calculateSwapRoute(fromAsset: string, toAsset: string): SwapRoute {
  console.log(`🗺️ Route Planning: ${fromAsset} → ${toAsset}`);

  // Minter operations (direct conversions, no DEX needed)
  if (!needsDEXSelection(fromAsset, toAsset)) {
    return {
      steps: [fromAsset, toAsset],
      complexity: 'simple',
      estimatedTime: '30s - 2 min',
      isCrossChain: isL1Withdrawal(toAsset),
      chainsInvolved: isL1Withdrawal(toAsset) 
        ? ['Internet Computer', getDestinationChain(toAsset)] 
        : ['Internet Computer'],
      operationType: 'Minter Operation'
    };
  }
  
  // Cross-chain operations requiring DEX + Chain Fusion
  if (isL1Withdrawal(toAsset)) {
    const chainsInvolved = ['Internet Computer'];
    let bridgeAsset = getCkTokenForL1(toAsset) || 'ckUSDC';
    
    // Determine optimal bridge asset based on destination
    if (toAsset === 'BTC') {
      bridgeAsset = 'ckBTC';
      chainsInvolved.push('Bitcoin');
    } else if (['ETH', 'USDC', 'USDT'].includes(toAsset)) {
      bridgeAsset = toAsset === 'ETH' ? 'ckETH' :
                    toAsset === 'USDT' ? 'ckUSDT' : 'ckUSDC';
      chainsInvolved.push('Ethereum');
    }
    
    // Build multi-step route: Asset → Bridge → L1
    const steps = fromAsset === bridgeAsset 
      ? [fromAsset, toAsset]  
      : [fromAsset, bridgeAsset, toAsset];
        
    return {
      steps: steps,
      complexity: 'cross-chain',
      estimatedTime: '2-5 min',
      isCrossChain: true,
      chainsInvolved: chainsInvolved,
      operationType: 'DEX + Minter'
    };
  }
  
  // Simple DEX swap (both tokens on Internet Computer)
  return {
    steps: [fromAsset, toAsset],
    complexity: 'simple',
    estimatedTime: '5-15s',
    isCrossChain: false,
    chainsInvolved: ['Internet Computer'],
    operationType: 'DEX Swap'
  };
}

/**
 * Determines if swap requires DEX selection
 * Bitcoin-only onramp: TO asset is always BTC
 * Only ckBTC → BTC is direct (no DEX needed)
 * All other assets need DEX routing to get ckBTC first
 */
export function needsDEXSelection(fromAsset: string, toAsset: string): boolean {
  // Bitcoin-only onramp: Special handling for BTC destination
  if (toAsset === 'BTC') {
    return fromAsset !== 'ckBTC'; // DEX needed unless FROM is already ckBTC
  }

  // Original minter pairs logic for non-BTC destinations
  const minterPairs = [
    ['ckBTC', 'BTC'], ['BTC', 'ckBTC'],
    ['ckETH', 'ETH'], ['ETH', 'ckETH'],
    ['ckUSDC', 'USDC'], ['USDC', 'ckUSDC'],
    ['ckUSDT', 'USDT'], ['USDT', 'ckUSDT'],
    ['ckUSDC', 'USDCs'], ['USDCs', 'ckUSDC']
  ];

  const isDirect = minterPairs.some(pair =>
    (pair[0] === fromAsset && pair[1] === toAsset) ||
    (pair[1] === fromAsset && pair[0] === toAsset)
  );

  return !isDirect;
}

// ===============================================
// EXCHANGE RATE & PRICE IMPACT ENGINE
// ===============================================

/**
 * Calculates base exchange rate between two assets
 */
export function calculateExchangeRate(fromAsset: string, toAsset: string): number {
  // SPECIAL CASE: Stablecoin to stablecoin conversions are always 1:1
  const stablecoins = ['ckUSDC', 'ckUSDT', 'USDC', 'USDT', 'USDCs'];
  
  if (stablecoins.includes(fromAsset) && stablecoins.includes(toAsset)) {
    return 1.0; // 1:1 exchange rate for all USD-pegged stablecoins
  }
  
  const fromPrice = ASSET_PRICES[fromAsset];
  const toPrice = ASSET_PRICES[toAsset];
  
  if (!fromPrice || !toPrice) {
    console.warn(`⚠️ Missing price data: ${fromAsset} ($${fromPrice}) → ${toAsset} ($${toPrice})`);
    return 0;
  }
  
  return fromPrice / toPrice;
}

/**
 * Calculates price impact based on swap size and liquidity
 */
export function calculatePriceImpact(fromAsset: string, toAsset: string, amount: number): number {
  // Mock liquidity pools - in production, fetch from DEX APIs
  const LIQUIDITY_POOLS = {
    'ckBTC-ckUSDC': { depth: 5000000, volume24h: 2500000 },
    'ckETH-ckUSDC': { depth: 8000000, volume24h: 4000000 },
    'ICP-ckUSDC': { depth: 3000000, volume24h: 1200000 },
    'ckBTC-ckETH': { depth: 3500000, volume24h: 1800000 },
    'ckETH-ckSOL': { depth: 2000000, volume24h: 900000 },
    'ckUSDC-ckUSDT': { depth: 10000000, volume24h: 5000000 }
  };
  
  const poolKey = getPoolKey(fromAsset, toAsset);
  const pool = LIQUIDITY_POOLS[poolKey as keyof typeof LIQUIDITY_POOLS];
  
  if (!pool) {
    return getDefaultPriceImpact(amount);
  }
  
  const swapValueUSD = amount * ASSET_PRICES[fromAsset];
  const impactRatio = swapValueUSD / pool.depth;
  let priceImpact = Math.sqrt(impactRatio) * 0.3;
  
  // Apply logarithmic scaling for very large swaps
  if (impactRatio > 0.1) {
    priceImpact = 0.3 * Math.log(1 + impactRatio * 3);
  }
  
  return Math.min(priceImpact, 0.15); // Cap at 15%
}

function getPoolKey(fromAsset: string, toAsset: string): string {
  const assets = [fromAsset, toAsset].sort();
  return `${assets[0]}-${assets[1]}`;
}

function getDefaultPriceImpact(amount: number): number {
  if (amount < 1) return 0.001;
  if (amount < 10) return 0.005;
  if (amount < 100) return 0.02;
  return 0.05;
}

/**
 * Calculates complete swap details including fees and price impact
 */
export function calculateBaseSwapRate(fromAsset: string, toAsset: string, amount: number): BaseSwapResult {
  if (amount <= 0) {
    return {
      fromAmount: amount,
      toAmount: 0,
      rate: 0,
      priceImpact: 0,
      isValidPair: false
    };
  }
  
  if (!ASSET_PRICES[fromAsset] || !ASSET_PRICES[toAsset]) {
    return {
      fromAmount: amount,
      toAmount: 0,
      rate: 0,
      priceImpact: 0,
      isValidPair: false
    };
  }
  
  const baseRate = calculateExchangeRate(fromAsset, toAsset);
  
  // SPECIAL CASE: No price impact for stablecoin Chain Fusion operations
  const stablecoins = ['ckUSDC', 'ckUSDT', 'USDC', 'USDT', 'USDCs'];
  const isStablecoinOperation = stablecoins.includes(fromAsset) && stablecoins.includes(toAsset);
  
  const priceImpact = isStablecoinOperation ? 0 : calculatePriceImpact(fromAsset, toAsset, amount);
  const effectiveRate = baseRate * (1 - priceImpact);
  const toAmount = amount * effectiveRate;
  
  return {
    fromAmount: amount,
    toAmount: toAmount,
    rate: effectiveRate,
    priceImpact: priceImpact,
    isValidPair: true
  };
}

// ===============================================
// FEE MANAGEMENT ENGINE
// ===============================================

/**
 * Calculates all fee requirements for a swap with Chain Fusion support
 */
export function calculateFeeRequirements(
  fromAsset: string, 
  toAsset: string, 
  amount: number, 
  portfolio: Portfolio,
  selectedDEX: string = 'ICPSwap'
): FeeRequirement[] {
  console.log('🔥 CALCULATE FEE REQUIREMENTS:', { fromAsset, toAsset, amount });
  
  const fees: FeeRequirement[] = [];
  const route = calculateSwapRoute(fromAsset, toAsset);
  const isMinterOp = route.operationType === 'Minter Operation';

  console.log('🔥 FEE CALC ROUTE:', { route, isMinterOp });

  // Swap Fee (2%) - Always added first to appear at top of fee stack
  const swapFeeRate = 0.02; // 2%
  const swapFeeAmount = amount * swapFeeRate;
  const swapFeeUSD = swapFeeAmount * ASSET_PRICES[fromAsset];

  // For native L1 withdrawals, swap fee can be deducted from final amount
  const isNativeWithdrawal = isMinterOp && isL1Withdrawal(toAsset) &&
    ((fromAsset === 'ckETH' && toAsset === 'ETH') ||
     (fromAsset === 'ckBTC' && toAsset === 'BTC'));

  fees.push({
    token: fromAsset,
    amount: swapFeeAmount,
    description: 'HODL Protocol Fee (2%)',
    usdValue: swapFeeUSD,
    isUserSufficient: isNativeWithdrawal ? true : (portfolio[fromAsset] || 0) >= (amount + swapFeeAmount),
    purpose: 'network'
  });

  console.log('💰 ADDED SWAP FEE:', { swapFeeAmount, swapFeeUSD });
  console.log('💰 CURRENT FEES ARRAY:', fees);
  
  // DEX Trading Fees (for DEX swaps like ckUSDT → ckSOL or DEX + Minter operations)
  if (!isMinterOp || route.operationType === 'DEX + Minter') {
    const dexFeeRate = selectedDEX === 'KongSwap' ? 0.003 : 0.003;
    const dexFeeAmount = amount * dexFeeRate;
    const dexFeeUSD = dexFeeAmount * ASSET_PRICES[fromAsset];

    // Check if user has sufficient funds for both swap fee and DEX fee
    const totalFeesSoFar = swapFeeAmount + dexFeeAmount;
    
    fees.push({
      token: fromAsset,
      amount: dexFeeAmount,
      description: `${selectedDEX} Trading Fee (${(dexFeeRate * 100).toFixed(1)}%)`,
      usdValue: dexFeeUSD,
      isUserSufficient: (portfolio[fromAsset] || 0) >= (amount + totalFeesSoFar),
      purpose: 'dex'
    });
  }
  
  // L1 Gas Fees - Bitcoin-only onramp: Show fees in Transaction Preview, no Smart Solutions
  console.log('🔥 L1 WITHDRAWAL CHECK:', { fromAsset, toAsset, isL1: isL1Withdrawal(toAsset) });

  if (isL1Withdrawal(toAsset)) {
    const gasFee = calculateL1GasFee(toAsset, portfolio);
    console.log('🔥 L1 GAS FEE RESULT:', gasFee);

    if (gasFee) {
      // Bitcoin-only: Gas fee shown in preview, no Smart Solutions needed
      fees.push(gasFee);
      console.log('🔥 Bitcoin withdrawal - gas fee shown in preview, deducted from final amount');
    }
  }
  
  console.log('🎯 FINAL FEES ARRAY BEING RETURNED:', fees);
  return fees;
}

// Helper function to determine if withdrawal supports fee deduction from amount
function isNativeL1Asset(toAsset: string): boolean {
  // Native Layer 1 assets where fees are deducted from withdrawal amount
  return ['BTC', 'ETH', 'SOL', 'USDCs'].includes(toAsset);
}

function calculateL1GasFee(toAsset: string, portfolio: Portfolio): FeeRequirement | null {
  console.log('🔍 calculateL1GasFee called with toAsset:', toAsset);

  // Bitcoin-only onramp: Only BTC withdrawals supported
  if (toAsset === 'BTC') {
    const feeAmount = 0.0005;
    const feeToken = 'ckBTC';
    const feeUSD = feeAmount * ASSET_PRICES[feeToken];

    return {
      token: feeToken,
      amount: feeAmount,
      description: 'Bitcoin Network Fee (deducted from final amount)',
      usdValue: feeUSD,
      isUserSufficient: true, // Bitcoin gas deducted from final amount, no Smart Solutions needed
      purpose: 'gas',
      deductFromFinal: true,
      preferredSolution: 'deduct_from_final'
    };
  }

  return null;
}

// ===============================================
// SMART SOLUTIONS ENGINE
// ===============================================

/**
 * CLEAN Smart Solutions - Bitcoin-Only Onramp
 * Purpose: Bitcoin gas fees are deducted from final amount - no Smart Solutions needed
 */
export function generateSmartSolutions(
  swapAnalysis: CompleteSwapAnalysis,
  portfolio: Portfolio,
  selectedDEX: string = 'ICPSwap'
): SmartSolution[] {
  console.log('🚀 Bitcoin-Only Onramp: No Smart Solutions needed (gas deducted from final)');

  // Bitcoin-only onramp: Gas fees deducted from final BTC amount
  // No separate gas asset management needed
  return [];
}

/**
 * Gets logical fee payment alternatives based on swap context and user holdings
 */
function getLogicalFeeAlternatives(
  fee: FeeRequirement, 
  swapAnalysis: CompleteSwapAnalysis, 
  portfolio: Portfolio
): SmartSolution[] {
  const alternatives: SmartSolution[] = [];
  
  // Only suggest alternatives if user has sufficient balances
  const portfolioAssets = Object.keys(portfolio).filter(asset => (portfolio[asset] || 0) > 0);
  
  // CASE 1: If user has more of the FROM asset, allow them to use it for fees
  if (fee.token !== swapAnalysis.fromAsset) {
    const feeInFromAsset = fee.usdValue / ASSET_PRICES[swapAnalysis.fromAsset];
    const totalNeededFromAsset = swapAnalysis.amount + feeInFromAsset;
    
    if ((portfolio[swapAnalysis.fromAsset] || 0) >= totalNeededFromAsset) {
      alternatives.push({
        id: `use_more_${swapAnalysis.fromAsset}`,
        type: 'auto_swap',
        title: `🔄 Use Additional ${swapAnalysis.fromAsset} for Fees`,
        description: `Use ${formatCleanNumber(feeInFromAsset)} more ${swapAnalysis.fromAsset} (≈$${fee.usdValue.toFixed(2)}) to cover the ${fee.token} fees. Total used: ${formatCleanNumber(totalNeededFromAsset)} ${swapAnalysis.fromAsset}.`,
        badge: 'RECOMMENDED',
        userReceives: {
          amount: swapAnalysis.outputAmount,
          asset: swapAnalysis.toAsset
        },
        cost: {
          amount: formatCleanNumber(feeInFromAsset),
          asset: swapAnalysis.fromAsset,
          description: 'Additional from your balance'
        }
      });
    }
  }
  
  // CASE 2: Suggest only stablecoins and major assets (avoid suggesting random token swaps)
  const preferredAlternatives = ['ckUSDC', 'ckUSDT', 'ckBTC', 'ckETH', 'ckSOL', 'ICP'].filter(asset => 
    asset !== swapAnalysis.fromAsset && 
    asset !== fee.token && 
    portfolioAssets.includes(asset)
  );
  
  for (const asset of preferredAlternatives.slice(0, 1)) { // Only suggest one logical alternative
    const feeInOtherAsset = (fee.usdValue * 1.1) / ASSET_PRICES[asset]; // 10% buffer
    const portfolioBalance = portfolio[asset] || 0;
    
    if (portfolioBalance >= feeInOtherAsset) {
      alternatives.push({
        id: `swap_${asset}_for_fees`,
        type: 'swap_other_asset',
        title: `💡 Use Your ${asset} for ${fee.token} Fees`,
        description: `Swap ${formatCleanNumber(feeInOtherAsset)} ${asset} (≈$${fee.usdValue.toFixed(2)}) to get ${fee.token} for fees. Your main ${swapAnalysis.fromAsset} → ${swapAnalysis.toAsset} swap remains unchanged.`,
        badge: 'ALTERNATIVE',
        userReceives: {
          amount: swapAnalysis.outputAmount,
          asset: swapAnalysis.toAsset
        },
        cost: {
          amount: formatCleanNumber(feeInOtherAsset),
          asset: asset,
          description: `From your ${asset} balance (${formatCleanNumber(portfolioBalance)} available)`
        }
      });
      break; // Only suggest one alternative asset
    }
  }
  
  return alternatives;
}

// ===============================================
// DEX INTEGRATION ENGINE
// ===============================================

export const DEX_OPTIONS: Record<string, DEXOption> = {
  'ICPSwap': {
    id: 'ICPSwap',
    name: 'ICPSwap',
    tradingFee: 0.003,
    advantages: ['Higher liquidity pools', 'Better price discovery', 'More established trading pairs'],
    stats: {
      'Swap Speed': '8-15s',
      'Trading Fee': '0.3%',
      'Liquidity': 'High',
      'Slippage': 'Low-Medium'
    },
    deepLinkBase: 'https://app.icpswap.com/swap'
  },
  'KongSwap': {
    id: 'KongSwap',
    name: 'KongSwap',
    tradingFee: 0.003,
    advantages: ['Lower trading fees', 'Faster transaction processing', 'Better for smaller trades'], // Updated stats
    stats: {
      'Swap Speed': '5-12s',
      'Trading Fee': '0.3%',
      'Liquidity': 'Medium',
      'Slippage': 'Medium'
    },
    deepLinkBase: 'https://kongswap.io/swap'
  }
};

export function recommendDEX(fromAsset: string, toAsset: string, amount: number): {
  recommended: DEXOption;
  reasoning: string;
} {
  const swapValueUSD = amount * ASSET_PRICES[fromAsset];

  let preferredDEX = 'KongSwap'; // Default to lower fees
  let reasoning = '';

  if (swapValueUSD > 10000) {
    preferredDEX = 'ICPSwap';
    reasoning = `Large trade ($${Math.round(swapValueUSD).toLocaleString()}) - prioritizing liquidity and price discovery`;
  } else if (swapValueUSD < 1000) {
    preferredDEX = 'KongSwap';
    reasoning = `Small trade ($${Math.round(swapValueUSD).toLocaleString()}) - prioritizing lower fees`;
  } else {
    reasoning = `Medium trade ($${Math.round(swapValueUSD).toLocaleString()}) - balanced approach with lower fees`;
  }

  return {
    recommended: DEX_OPTIONS[preferredDEX],
    reasoning
  };
}

/**
 * AUTO-SELECT OPTIMAL DEX (Mobile-First UX)
 * Automatically picks the best DEX for a swap without user intervention.
 * Returns the DEX ID string that can be directly used in swap execution.
 *
 * Bitcoin-only onramp: All routes end at BTC, so we optimize for:
 * - Speed (KongSwap for small/medium trades)
 * - Liquidity (ICPSwap for large trades)
 */
export function autoSelectOptimalDEX(fromAsset: string, toAsset: string, amount: number): string {
  const recommendation = recommendDEX(fromAsset, toAsset, amount);
  return recommendation.recommended.id;
}

// ===============================================
// VISUAL BRACKETS ENGINE
// ===============================================

export interface BracketConfig {
  startIndex: number;
  endIndex: number;
  label: string;
  type: 'dex' | 'fusion' | 'minter';
}

export function getBracketConfiguration(route: SwapRoute): BracketConfig[] {
  const configs: BracketConfig[] = [];
  
  if (route.operationType === 'DEX + Minter' && route.steps.length === 3) {
    configs.push({
      startIndex: 0,
      endIndex: 2,
      label: 'Choose DEX',
      type: 'dex'
    });
    
    configs.push({
      startIndex: 2,
      endIndex: 4,
      label: 'Chain Fusion',
      type: 'fusion'
    });
  } else if (route.operationType === 'DEX Swap') {
    configs.push({
      startIndex: 0,
      endIndex: 2,
      label: 'DEX Swap',
      type: 'dex'
    });
  } else if (route.operationType === 'Minter Operation') {
    configs.push({
      startIndex: 0,
      endIndex: 2,
      label: route.isCrossChain ? 'Chain Fusion' : 'IC Minter',
      type: route.isCrossChain ? 'fusion' : 'minter'
    });
  }
  
  return configs;
}

// ===============================================
// MAIN ANALYSIS FUNCTION (COMPLETE ORCHESTRATOR)
// ===============================================

/**
 * Complete swap analysis function - this is the main entry point
 */
export function analyzeCompleteSwap(
  fromAsset: string,
  toAsset: string,
  amount: number,
  portfolio: Portfolio,
  selectedDEX: string = 'ICPSwap'
): CompleteSwapAnalysis {
  console.log('🔬 MASTER ANALYSIS: Analyzing swap:', { fromAsset, toAsset, amount });
  console.log('🔬 ASSET_PRICES check:', { 
    fromAssetPrice: ASSET_PRICES[fromAsset], 
    toAssetPrice: ASSET_PRICES[toAsset],
    fromExists: fromAsset in ASSET_PRICES,
    toExists: toAsset in ASSET_PRICES,
    allPrices: Object.keys(ASSET_PRICES)
  });

  // Validation
  if (!fromAsset || !toAsset || amount <= 0) {
    console.log('🔬 VALIDATION FAILED: Basic parameters');
    return { 
      success: false, 
      errors: ['Invalid swap parameters'],
      fromAsset: '',
      toAsset: '',
      amount: 0,
      outputAmount: 0,
      rate: 0,
      priceImpact: 0,
      route: null as any,
      feeRequirements: [],
      needsSmartSolutions: false,
      isL1Withdrawal: false,
      destinationChain: '',
      totalFeesUSD: 0
    };
  }

  // Calculate base swap details
  const baseSwap = calculateBaseSwapRate(fromAsset, toAsset, amount);
  console.log('🔬 BASE SWAP RESULT:', baseSwap);
  
  if (!baseSwap.isValidPair) {
    console.log('🔬 BASE SWAP INVALID PAIR');
    return { 
      success: false, 
      errors: ['Invalid asset pair'],
      fromAsset,
      toAsset,
      amount,
      outputAmount: 0,
      rate: 0,
      priceImpact: 0,
      route: null as any,
      feeRequirements: [],
      needsSmartSolutions: false,
      isL1Withdrawal: false,
      destinationChain: '',
      totalFeesUSD: 0
    };
  }

  // Generate route and fee requirements
  const route = calculateSwapRoute(fromAsset, toAsset);
  console.log('🚀 CALLING calculateFeeRequirements from analyzeCompleteSwap');
  const feeRequirements = calculateFeeRequirements(fromAsset, toAsset, amount, portfolio, selectedDEX);
  console.log('🚀 FEE REQUIREMENTS RESULT:', feeRequirements);

  // Calculate total fees and check for smart solutions
  console.log('🚀 FEE REQUIREMENTS IN ANALYSIS:', feeRequirements);
  const totalFeesUSD = feeRequirements.reduce((sum, fee) => sum + fee.usdValue, 0);
  console.log('🚀 TOTAL FEES USD:', totalFeesUSD);
  // Bitcoin-only onramp: No Smart Solutions needed (gas deducted from final amount)
  const needsSmartSolutions = false;

  const swapAnalysis: CompleteSwapAnalysis = {
    success: true,
    fromAsset,
    toAsset,
    amount,
    outputAmount: baseSwap.toAmount,
    rate: baseSwap.rate,
    priceImpact: baseSwap.priceImpact,
    route,
    feeRequirements,
    needsSmartSolutions,
    isL1Withdrawal: isL1Withdrawal(toAsset),
    destinationChain: getDestinationChain(toAsset),
    totalFeesUSD,
    selectedDEX
  };

  // Generate smart solutions using core logic
  if (needsSmartSolutions) {
    console.log('🚀 Generating Smart Solutions for gas requirements');
    swapAnalysis.smartSolutions = generateSmartSolutions(swapAnalysis, portfolio, selectedDEX);
    console.log('✅ Smart Solutions generated:', swapAnalysis.smartSolutions?.length || 0, 'solutions');
  }

  console.log('✅ MASTER ANALYSIS: Complete:', swapAnalysis);
  return swapAnalysis;
}

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

/**
 * Clean number formatting - removes unnecessary decimal places
 */
function formatCleanNumber(num: number): string {
  if (num === 0) return '0';
  if (num < 0.001) {
    return num.toFixed(6).replace(/\.?0+$/, '');
  }
  if (num < 1) {
    return num.toFixed(6).replace(/\.?0+$/, '');
  }
  if (num % 1 === 0) {
    return num.toString();
  }
  return num.toFixed(6).replace(/\.?0+$/, '');
}

/**
 * Formats numbers for display
 */
export function formatNumber(num: number, decimals: number = 6): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  } else {
    return formatCleanNumber(num);
  }
}

/**
 * Validates portfolio sufficiency for a swap
 */
export function validatePortfolioSufficiency(
  fromAsset: string,
  amount: number,
  portfolio: Portfolio
): { sufficient: boolean; available: number; needed: number } {
  const available = portfolio[fromAsset] || 0;
  return {
    sufficient: available >= amount,
    available,
    needed: amount
  };
}

/**
 * Estimates swap completion time
 */
export function estimateSwapTime(route: SwapRoute, selectedDEX: string = 'ICPSwap'): string {
  if (route.operationType === 'Minter Operation') {
    return route.isCrossChain ? '1-3 min' : '15-45s';
  } else if (route.operationType === 'DEX Swap') {
    return selectedDEX === 'KongSwap' ? '5-12s' : '8-15s';
  } else {
    return '2-8 min';
  }
}

// ===============================================
// SMART SOLUTIONS UTILITIES
// ===============================================

/**
 * Extract gas asset, network, and source asset information from Smart Solution
 * Provides clean data for display logic without string parsing
 */
// REMOVED: extractSmartSolutionGasInfo() - Competing gas asset detection system
// Smart Solutions now generated correctly by core logic - no extraction needed

// ===============================================
// EXPORT ALL FOR USAGE
// ===============================================

export default {
  // Main Functions
  analyzeCompleteSwap,
  calculateSwapRoute,
  calculateFeeRequirements,
  generateSmartSolutions,
  recommendDEX,
  getBracketConfiguration,
  
  // Core Calculations
  calculateExchangeRate,
  calculatePriceImpact,
  calculateBaseSwapRate,
  
  // Utilities
  needsDEXSelection,
  formatNumber,
  validatePortfolioSufficiency,
  estimateSwapTime,
  // REMOVED: extractSmartSolutionGasInfo - competing logic eliminated
  
  // Constants
  DEX_OPTIONS
};