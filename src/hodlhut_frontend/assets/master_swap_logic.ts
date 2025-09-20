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
  type: 'deduct_from_swap' | 'swap_other_asset' | 'manual_topup' | 'auto_swap';
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
      bridgeAsset = toAsset === 'ETH' ? 'ckETH' : 'ckUSDC';
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
 */
export function needsDEXSelection(fromAsset: string, toAsset: string): boolean {
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
  
  // MyHut Fee (0.1%) - Always added first to appear at top of fee stack
  const myHutFeeRate = 0.001; // 0.1%
  const myHutFeeAmount = amount * myHutFeeRate;
  const myHutFeeUSD = myHutFeeAmount * ASSET_PRICES[fromAsset];
  
  fees.push({
    token: fromAsset,
    amount: myHutFeeAmount,
    description: 'MyHut Fees (0.1%)',
    usdValue: myHutFeeUSD,
    isUserSufficient: (portfolio[fromAsset] || 0) >= (amount + myHutFeeAmount),
    purpose: 'network'
  });
  
  console.log('💰 ADDED MYHUT FEE:', { myHutFeeAmount, myHutFeeUSD });
  console.log('💰 CURRENT FEES ARRAY:', fees);
  
  // DEX Trading Fees (for DEX swaps like ckUSDT → ckSOL or DEX + Minter operations)
  if (!isMinterOp || route.operationType === 'DEX + Minter') {
    const dexFeeRate = selectedDEX === 'KongSwap' ? 0.003 : 0.003;
    const dexFeeAmount = amount * dexFeeRate;
    const dexFeeUSD = dexFeeAmount * ASSET_PRICES[fromAsset];
    
    // Check if user has sufficient funds for both MyHut fee and DEX fee
    const totalFeesSoFar = myHutFeeAmount + dexFeeAmount;
    
    fees.push({
      token: fromAsset,
      amount: dexFeeAmount,
      description: `${selectedDEX} Trading Fee (${(dexFeeRate * 100).toFixed(1)}%)`,
      usdValue: dexFeeUSD,
      isUserSufficient: (portfolio[fromAsset] || 0) >= (amount + totalFeesSoFar),
      purpose: 'dex'
    });
  }
  
  // L1 Gas Fees - CRITICAL: Check for ALL L1 withdrawal destinations, not just cross-chain
  console.log('🔥 L1 WITHDRAWAL CHECK:', { toAsset, isL1: isL1Withdrawal(toAsset) });
  
  if (isL1Withdrawal(toAsset)) {
    console.log('🔥 CALLING calculateL1GasFee for:', toAsset);
    const gasFee = calculateL1GasFee(toAsset, portfolio);
    console.log('🔥 L1 GAS FEE RESULT:', gasFee);
    if (gasFee) {
      fees.push(gasFee);
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
  // UNIVERSAL RULE: ERC-20 tokens on Ethereum require separate ETH gas
  if (['USDC', 'USDT'].includes(toAsset)) {
    const ethGasAmount = 0.003;
    const ethGasUSD = ethGasAmount * ASSET_PRICES['ckETH'];
    
    console.log('🔍 ETH Gas Fee Debug:', {
      toAsset,
      ethGasAmount,
      ckETHPrice: ASSET_PRICES['ckETH'],
      ethGasUSD,
      portfolioETH: portfolio['ckETH'] || 0
    });
    
    return {
      token: 'ckETH',
      amount: ethGasAmount,
      description: 'Ethereum Gas Fee (ERC-20 transfer)',
      usdValue: ethGasUSD,
      isUserSufficient: (portfolio['ckETH'] || 0) >= ethGasAmount,
      purpose: 'gas'
    };
  }
  
  // UNIVERSAL RULE: Native Layer 1 assets - fees deducted from withdrawal amount
  // This is the PREFERRED and FIRST option for BTC, ETH, SOL destinations
  if (isNativeL1Asset(toAsset)) {
    let feeAmount: number;
    let feeToken: string;
    let description: string;
    
    if (toAsset === 'BTC') {
      feeAmount = 0.0005;
      feeToken = 'ckBTC';
      description = 'Bitcoin Network Fee (deducted from final amount)';
    } else if (toAsset === 'ETH') {
      feeAmount = 0.003;
      feeToken = 'ckETH';
      description = 'Ethereum Gas Fee (deducted from final amount)';
    } else if (['SOL', 'USDCs'].includes(toAsset)) {
      feeAmount = 0.001;
      feeToken = 'ckSOL';
      description = 'Solana Network Fee (deducted from final amount)';
    } else {
      return null;
    }
    
    const feeUSD = feeAmount * ASSET_PRICES[feeToken];
    
    return {
      token: feeToken,
      amount: feeAmount,
      description: description,
      usdValue: feeUSD,
      isUserSufficient: false, // Always show Smart Solutions for L1 withdrawals (deduct-from-final is preferred)
      purpose: 'gas',
      deductFromFinal: true, // Flag to indicate this fee is deducted from final withdrawal amount
      preferredSolution: 'deduct_from_final' // Preferred payment method for native L1 assets
    };
  }
  
  // Special case: Legacy USDC/USDT (direct Ethereum) - treat as ERC-20
  if (['USDC', 'USDT'].includes(toAsset)) {
    const ethGasAmount = 0.003;
    const ethGasUSD = ethGasAmount * ASSET_PRICES['ckETH'];
    
    return {
      token: 'ckETH',
      amount: ethGasAmount,
      description: 'Ethereum Gas Fee (ERC-20 transfer)',
      usdValue: ethGasUSD,
      isUserSufficient: (portfolio['ckETH'] || 0) >= ethGasAmount,
      purpose: 'gas'
    };
  }
  
  return null;
}

// ===============================================
// SMART SOLUTIONS ENGINE
// ===============================================

/**
 * Generates intelligent solutions for missing fee requirements
 */
export function generateSmartSolutions(
  swapAnalysis: CompleteSwapAnalysis,
  portfolio: Portfolio,
  selectedDEX: string = 'ICPSwap'
): SmartSolution[] {
  const solutions: SmartSolution[] = [];
  const insufficientFees = swapAnalysis.feeRequirements.filter(fee => !fee.isUserSufficient);
  
  if (insufficientFees.length === 0) {
    return solutions;
  }
  
  insufficientFees.forEach(fee => {
    // PRIORITY 1: For Native L1 withdrawals with deductFromFinal flag, offer deduction as easiest option
    const isDeductFromFinalEligible = fee.deductFromFinal && fee.preferredSolution === 'deduct_from_final';
    
    console.log(`🔍 Fee Deduction Check: toAsset=${swapAnalysis.toAsset}, fee.token=${fee.token}, deductFromFinal=${fee.deductFromFinal}, preferredSolution=${fee.preferredSolution}, outputAmount=${swapAnalysis.outputAmount}, feeAmount=${fee.amount}`);
    
    // UNIVERSAL RULE: For BTC/ETH/SOL withdrawals, ALWAYS prioritize "deduct from final" first
    if (isDeductFromFinalEligible && swapAnalysis.outputAmount > fee.amount) {
      const networkName = swapAnalysis.toAsset === 'BTC' ? 'Bitcoin' : 
                          swapAnalysis.toAsset === 'ETH' ? 'Ethereum' : 
                          swapAnalysis.toAsset === 'SOL' ? 'Solana' : 'Network';
      
      solutions.push({
        id: `deduct_from_withdrawal_${fee.token}`,
        type: 'deduct_from_swap',
        title: ``,
        description: `${fee.token} gas fee will be deducted from your final ${swapAnalysis.toAsset} amount.`,
        badge: 'RECOMMENDED',
        userReceives: {
          amount: swapAnalysis.outputAmount - fee.amount,
          asset: swapAnalysis.toAsset
        },
        cost: {
          amount: formatCleanNumber(fee.amount),
          asset: fee.token,
          description: `${networkName} gas fee (deducted automatically)`
        }
      });
    }

    // PRIORITY 2: Check if user already has the required gas token in portfolio
    if ((portfolio[fee.token] || 0) >= fee.amount) {
      solutions.push({
        id: `use_existing_${fee.token}`,
        type: 'auto_swap',
        title: `💰 Use Your Existing ${fee.token}`,
        description: `You have ${formatCleanNumber(portfolio[fee.token] || 0)} ${fee.token} in your portfolio. Use ${formatCleanNumber(fee.amount)} ${fee.token} for ${fee.description}.`,
        badge: 'ALTERNATIVE',
        userReceives: {
          amount: swapAnalysis.outputAmount,
          asset: swapAnalysis.toAsset
        },
        cost: {
          amount: formatCleanNumber(fee.amount),
          asset: fee.token,
          description: 'From your existing balance'
        }
      });
    }

    // PRIORITY 3: Smart suggestions based on logical asset relationships and actual holdings
    // SKIP alternatives for native L1 assets that support deduct-from-final (BTC, ETH, SOL)
    if (!isDeductFromFinalEligible) {
      const logicalAlternatives = getLogicalFeeAlternatives(fee, swapAnalysis, portfolio);
      
      for (const alternative of logicalAlternatives) {
        solutions.push(alternative);
      }
    }

    // PRIORITY 4: Last resort - manual top-up when no other options exist
    if (solutions.length === 0 || !solutions.some(s => s.badge === 'RECOMMENDED')) {
      solutions.push({
        id: `manual_${fee.token}`,
        type: 'manual_topup',
        title: `⚠️ Get ${fee.token} for Fees (Manual DEX Swap)`,
        description: `You need ${formatCleanNumber(fee.amount)} ${fee.token} for ${fee.description}. Swap for ${fee.token} on ${selectedDEX} first, then return to complete this withdrawal.`,
        badge: 'REQUIRED STEP',
        userReceives: {
          amount: swapAnalysis.outputAmount,
          asset: swapAnalysis.toAsset
        },
        cost: {
          amount: `~${fee.usdValue.toFixed(2)}`,
          asset: `USD worth of ${fee.token}`,
          description: `Manual DEX swap required`
        }
      });
    }
  });
  
  return solutions.sort((a, b) => {
    const order = { 'RECOMMENDED': 1, 'ALTERNATIVE': 2, 'REQUIRED STEP': 3 };
    return order[a.badge] - order[b.badge];
  });
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
  const needsSmartSolutions = feeRequirements.some(fee => !fee.isUserSufficient);

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

  // Generate smart solutions if needed
  if (needsSmartSolutions) {
    swapAnalysis.smartSolutions = generateSmartSolutions(swapAnalysis, portfolio, selectedDEX);
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
  
  // Constants
  DEX_OPTIONS
};