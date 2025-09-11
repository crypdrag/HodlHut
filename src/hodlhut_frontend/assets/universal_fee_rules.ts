// ===============================================
// UNIVERSAL FEE RULES ENGINE
// ===============================================
// Clean, simple rules based on transaction types
// No more confusion - just universal rules
//
// DEVELOPMENT NOTE: For mainnet deployment, network fees should be 
// dynamically pulled from RPC canisters. See DEVELOPMENT_NOTES.md
// for detailed implementation plan.

import { Portfolio } from './master_asset_data';

// Clean number formatting - removes unnecessary decimal places
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

export interface UniversalFeeRule {
  shouldShowSmartSolutions: boolean;
  primarySolution?: {
    type: 'deduct_from_final' | 'use_existing' | 'manual_swap';
    title: string;
    description: string;
    feeAmount: number;
    feeToken: string;
  };
  dexFeeIncluded: boolean; // DEX fees are always automatic, never require Smart Solutions
}

/**
 * UNIVERSAL RULES BASED ON TRANSACTION TYPES
 */
export function getUniversalFeeRules(
  fromAsset: string,
  toAsset: string,
  amount: number,
  portfolio: Portfolio
): UniversalFeeRule {
  
  console.log('🔥 UNIVERSAL FEE RULES:', { fromAsset, toAsset, amount, portfolio });
  
  // ============================================
  // RULE 1: DIRECT CHAIN FUSION - SAME ASSET GAS
  // ============================================
  // ckBTC → BTC, ckETH → ETH, ckSOL → SOL (can deduct from final)
  if (isDirectChainFusion(fromAsset, toAsset)) {
    const gasAmount = getL1GasAmount(toAsset);
    const networkName = getNetworkName(toAsset);
    
    return {
      shouldShowSmartSolutions: true,
      primarySolution: {
        type: 'deduct_from_final',
        title: `✅ ${networkName} gas fees can be deducted from your final ${toAsset} balance. Deduct gas fees from ${toAsset}?`,
        description: `The ${gasAmount} ${fromAsset} network fee will be automatically deducted from your withdrawal. You'll receive ${formatCleanNumber(amount - gasAmount)} ${toAsset} (instead of ${formatCleanNumber(amount)} ${toAsset}).`,
        feeAmount: gasAmount,
        feeToken: fromAsset
      },
      dexFeeIncluded: false
    };
  }
  
  // ============================================
  // RULE 2: DEX + CHAIN FUSION 
  // ============================================
  // ckBTC → ckETH → ETH, ckUSDT → ckSOL → SOL (involves DEX swap first)
  if (isDexPlusChainFusion(fromAsset, toAsset)) {
    const gasAmount = getL1GasAmount(toAsset);
    const bridgeToken = getBridgeToken(toAsset);
    const networkName = getNetworkName(toAsset);
    
    return {
      shouldShowSmartSolutions: true,
      primarySolution: {
        type: 'deduct_from_final',
        title: `✅ ${networkName} gas fees can be deducted from your final ${toAsset} balance. Deduct gas fees from ${toAsset}?`,
        description: `After your ${fromAsset} → ${bridgeToken} → ${toAsset} swap, the ${formatCleanNumber(gasAmount)} ${bridgeToken} network fee will be deducted from your final ${toAsset} amount.`,
        feeAmount: gasAmount,
        feeToken: bridgeToken
      },
      dexFeeIncluded: true // DEX fee automatically included, no Smart Solution needed
    };
  }
  
  // ============================================
  // RULE 3: DIRECT CHAIN FUSION - DIFFERENT GAS TOKEN
  // ============================================
  // ckUSDC → USDC, ckUSDT → USDT, ckUSDC → USDCs
  // Direct minter operations requiring separate gas tokens (not deduct-from-final)
  const isDirectDifferentGas = isDirectChainFusionDifferentGas(toAsset);
  console.log('🔥 Direct Different Gas Check:', { toAsset, isDirectDifferentGas });
  
  if (isDirectDifferentGas) {
    console.log('🔥 ENTERING DIRECT DIFFERENT GAS RULE FOR:', toAsset);
    // Determine which gas token and amount based on destination
    let gasAmount: number;
    let gasToken: string;
    let networkName: string;
    let gasPrice: number;
    
    if (['USDC', 'USDT'].includes(toAsset)) {
      gasAmount = 0.003;
      gasToken = 'ckETH';
      networkName = 'ETH';
      gasPrice = 3200; // ETH price
    } else if (['USDCs'].includes(toAsset)) {
      gasAmount = 0.001;
      gasToken = 'ckSOL';
      networkName = 'SOL';
      gasPrice = 240; // SOL price
    } else {
      gasAmount = 0.003;
      gasToken = 'ckETH';
      networkName = 'ETH';
      gasPrice = 3200;
    }
    
    const userHasGasToken = (portfolio[gasToken] || 0) >= gasAmount;
    
    console.log('🔥 RETURNING DIRECT DIFFERENT GAS RESULT:', { gasToken, gasAmount, userHasGasToken, shouldShowSmartSolutions: true });
    
    return {
      shouldShowSmartSolutions: true, // Always show Smart Solutions for these withdrawals
      primarySolution: userHasGasToken ? {
        type: 'use_existing',
        title: `Use ${gasToken} $${Math.round(gasAmount * gasPrice)} for ${networkName} gas fees?`,
        description: `You have ${formatCleanNumber(portfolio[gasToken] || 0)} ${gasToken}. Use ${formatCleanNumber(gasAmount)} ${gasToken} for ${getNetworkName(toAsset)} gas fees to withdraw ${toAsset}.`,
        feeAmount: gasAmount,
        feeToken: gasToken
      } : {
        type: 'manual_swap',
        title: `⚠️ Get ${gasToken} for ${getNetworkName(toAsset)} Gas Fees`,
        description: `You need ${formatCleanNumber(gasAmount)} ${gasToken} for ${getNetworkName(toAsset)} gas to withdraw ${toAsset}. Swap some assets for ${gasToken} first.`,
        feeAmount: gasAmount,
        feeToken: gasToken
      },
      dexFeeIncluded: false
    };
  }
  
  // ============================================
  // RULE 4: PURE DEX SWAPS
  // ============================================
  // ckBTC → ckUSDC, ckETH → ckSOL (no L1 withdrawal)
  return {
    shouldShowSmartSolutions: false, // DEX fees are automatic, no Smart Solutions needed
    dexFeeIncluded: true
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function isDirectChainFusion(fromAsset: string, toAsset: string): boolean {
  const directPairs = [
    ['ckBTC', 'BTC'],
    ['ckETH', 'ETH'], 
    ['ckSOL', 'SOL']
  ];
  return directPairs.some(([from, to]) => fromAsset === from && toAsset === to);
}

function isDexPlusChainFusion(fromAsset: string, toAsset: string): boolean {
  const l1Assets = ['BTC', 'ETH', 'SOL'];
  const ckTokens = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ckSOL', 'ICP'];
  
  return ckTokens.includes(fromAsset) && l1Assets.includes(toAsset) && 
         !isDirectChainFusion(fromAsset, toAsset) && 
         !isDirectChainFusionDifferentGas(toAsset);
}

function isDirectChainFusionDifferentGas(toAsset: string): boolean {
  // Direct Chain Fusion operations that require separate gas tokens
  // USDC/USDT require ckETH, USDCs requires ckSOL
  return ['USDC', 'USDT', 'USDCs'].includes(toAsset);
}

function getL1GasAmount(toAsset: string): number {
  // TODO: MAINNET INTEGRATION - Replace hardcoded values with RPC canister calls
  // - Bitcoin fees: Query Bitcoin RPC canister for current mempool fee rates
  // - Ethereum fees: Query Ethereum RPC canister for current gas prices (EIP-1559)
  // - Solana fees: Query Solana RPC canister for current network fee structure
  // See DEVELOPMENT_NOTES.md for detailed implementation plan
  
  const gasAmounts: Record<string, number> = {
    'BTC': 0.0005,  // TODO: Replace with Bitcoin RPC canister call
    'ETH': 0.003,   // TODO: Replace with Ethereum RPC canister call  
    'SOL': 0.001,   // TODO: Replace with Solana RPC canister call
    'USDCs': 0.001  // TODO: Replace with Solana RPC canister call
  };
  return gasAmounts[toAsset] || 0;
}

function getBridgeToken(toAsset: string): string {
  const bridges: Record<string, string> = {
    'BTC': 'ckBTC',
    'ETH': 'ckETH',
    'SOL': 'ckSOL',
    'USDCs': 'ckUSDC'
  };
  return bridges[toAsset] || 'ckUSDC';
}

function getNetworkName(toAsset: string): string {
  if (['BTC'].includes(toAsset)) return 'Bitcoin';
  if (['ETH', 'USDC', 'USDT'].includes(toAsset)) return 'Ethereum';
  if (['SOL', 'USDCs'].includes(toAsset)) return 'Solana';
  return 'Network';
}