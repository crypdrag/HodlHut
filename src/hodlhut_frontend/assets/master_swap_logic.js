// ===============================================
// MASTER SWAP LOGIC - Complete Swap Engine
// ===============================================
// 🛡️ SAFE BACKUP: Contains ALL swap logic from our extraction work
// Includes: Route calculations, Fee management, Smart solutions, 
//          Visual brackets, DEX integration, Price impact
// ✅ Works with: masterAssetData.ts and all existing components
import { ASSET_PRICES, isL1Withdrawal, getDestinationChain, getCkTokenForL1 } from './master_asset_data';
// ===============================================
// ROUTE CALCULATION ENGINE
// ===============================================
/**
 * Main route calculation function - determines optimal swap path
 */
export function calculateSwapRoute(fromAsset, toAsset) {
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
        }
        else if (['ETH', 'USDC', 'USDT'].includes(toAsset)) {
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
export function needsDEXSelection(fromAsset, toAsset) {
    const minterPairs = [
        ['ckBTC', 'BTC'], ['BTC', 'ckBTC'],
        ['ckETH', 'ETH'], ['ETH', 'ckETH'],
        ['ckUSDC', 'USDC'], ['USDC', 'ckUSDC'],
        ['ckUSDT', 'USDT'], ['USDT', 'ckUSDT'],
        ['ckUSDC', 'USDCs'], ['USDCs', 'ckUSDC']
    ];
    const isDirect = minterPairs.some(pair => (pair[0] === fromAsset && pair[1] === toAsset) ||
        (pair[1] === fromAsset && pair[0] === toAsset));
    return !isDirect;
}
// ===============================================
// EXCHANGE RATE & PRICE IMPACT ENGINE
// ===============================================
/**
 * Calculates base exchange rate between two assets
 */
export function calculateExchangeRate(fromAsset, toAsset) {
    // SPECIAL CASE: Stablecoin to stablecoin conversions are always 1:1
    const stablecoins = ['ckUSDC', 'ckUSDT', 'USDC', 'USDT', 'USDCs'];
    
    console.log('🔄 EXCHANGE RATE CALC:', { fromAsset, toAsset, fromIsStable: stablecoins.includes(fromAsset), toIsStable: stablecoins.includes(toAsset) });
    
    if (stablecoins.includes(fromAsset) && stablecoins.includes(toAsset)) {
        console.log('🔄 STABLECOIN 1:1 RATE APPLIED');
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
export function calculatePriceImpact(fromAsset, toAsset, amount) {
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
    const pool = LIQUIDITY_POOLS[poolKey];
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
function getPoolKey(fromAsset, toAsset) {
    const assets = [fromAsset, toAsset].sort();
    return `${assets[0]}-${assets[1]}`;
}
function getDefaultPriceImpact(amount) {
    if (amount < 1)
        return 0.001;
    if (amount < 10)
        return 0.005;
    if (amount < 100)
        return 0.02;
    return 0.05;
}
/**
 * Calculates complete swap details including fees and price impact
 */
export function calculateBaseSwapRate(fromAsset, toAsset, amount) {
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
    
    console.log('🔄 BASE SWAP CALC:', { fromAsset, toAsset, baseRate, priceImpact, effectiveRate, isStablecoinOperation });
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
export function calculateFeeRequirements(fromAsset, toAsset, amount, portfolio, selectedDEX = 'ICPSwap') {
    console.log('🔥 CALCULATE FEE REQUIREMENTS:', { fromAsset, toAsset, amount });
    const fees = [];
    const route = calculateSwapRoute(fromAsset, toAsset);
    const isMinterOp = route.operationType === 'Minter Operation';
    console.log('🔥 ROUTE INFO:', { route, isMinterOp });
    
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
    // DEX Trading Fees (ONLY for heterogeneous token swaps)
    if (!isMinterOp && route.steps.length > 1) {
        const dexFeeRate = selectedDEX === 'KongSwap' ? 0.003 : 0.003;
        const dexFeeAmount = amount * dexFeeRate;
        const dexFeeUSD = dexFeeAmount * ASSET_PRICES[fromAsset];
        fees.push({
            token: fromAsset,
            amount: dexFeeAmount,
            description: `${selectedDEX} Trading Fee (${(dexFeeRate * 100).toFixed(2)}%)`,
            usdValue: dexFeeUSD,
            isUserSufficient: (portfolio[fromAsset] || 0) >= (amount + dexFeeAmount),
            purpose: 'dex'
        });
    }
    // NO CHAIN FUSION BRIDGE FEES - Chain Fusion is free!
    // All fees come from L1 networks (ETH gas, BTC fees, SOL fees)
    // L1 Gas Fees - FIXED: ETH gas required for ALL L1 withdrawals, not just cross-chain
    console.log('🔥 L1 WITHDRAWAL CHECK:', { toAsset, isL1: isL1Withdrawal(toAsset), isCrossChain: route.isCrossChain });
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
function calculateL1GasFee(toAsset, portfolio) {
    console.log('🔍 ETH Gas Fee Debug:', { toAsset });
    
    // Ethereum gas fees - FIXED: Include USDC, USDT 
    if (['ETH', 'USDC', 'USDT'].includes(toAsset)) {
        const ethGasAmount = 0.003;
        const ethGasUSD = ethGasAmount * ASSET_PRICES['ckETH'];
        console.log('🔍 ETH Gas Fee Calculation:', {
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
    // Solana fees
    if (['SOL', 'USDCs'].includes(toAsset)) {
        const solFeeAmount = 0.001;
        const solFeeUSD = solFeeAmount * ASSET_PRICES['ckSOL'];
        return {
            token: 'ckSOL',
            amount: solFeeAmount,
            description: 'Solana Transaction Fee',
            usdValue: solFeeUSD,
            isUserSufficient: (portfolio['ckSOL'] || 0) >= solFeeAmount,
            purpose: 'gas'
        };
    }
    // Bitcoin network fees
    if (toAsset === 'BTC') {
        const btcFeeAmount = 0.0005;
        const btcFeeUSD = btcFeeAmount * ASSET_PRICES['ckBTC'];
        return {
            token: 'ckBTC',
            amount: btcFeeAmount,
            description: 'Bitcoin Network Fee (priority)',
            usdValue: btcFeeUSD,
            isUserSufficient: (portfolio['ckBTC'] || 0) >= btcFeeAmount,
            purpose: 'network'
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
export function generateSmartSolutions(swapAnalysis, portfolio, selectedDEX = 'ICPSwap') {
    const solutions = [];
    const insufficientFees = swapAnalysis.feeRequirements.filter(fee => !fee.isUserSufficient);
    if (insufficientFees.length === 0) {
        return solutions;
    }
    insufficientFees.forEach(fee => {
        // Auto-swap solutions when user has sufficient FROM asset
        if (fee.token !== swapAnalysis.fromAsset) {
            const feeInFromAsset = fee.usdValue / ASSET_PRICES[swapAnalysis.fromAsset];
            if ((portfolio[swapAnalysis.fromAsset] || 0) >= swapAnalysis.amount + feeInFromAsset) {
                solutions.push({
                    id: `auto_swap_${fee.token}`,
                    type: 'auto_swap',
                    title: `Smart Auto-Swap for ${fee.token} Fees`,
                    description: `Use ${feeInFromAsset.toFixed(6)} ${swapAnalysis.fromAsset} to automatically get ${fee.token} for fees, then complete your withdrawal.`,
                    badge: 'RECOMMENDED',
                    userReceives: {
                        amount: swapAnalysis.outputAmount * (1 - (feeInFromAsset / swapAnalysis.amount)),
                        asset: swapAnalysis.toAsset
                    },
                    cost: {
                        amount: feeInFromAsset.toFixed(6),
                        asset: swapAnalysis.fromAsset,
                        description: 'Auto-converted for fees'
                    }
                });
            }
            else {
                // Manual requirement when insufficient balance
                solutions.push({
                    id: `manual_${fee.token}`,
                    type: 'manual_topup',
                    title: `Get ${fee.token} for ${fee.description.split(' ')[0]} Fees (via ${selectedDEX})`,
                    description: `You need ${fee.amount} ${fee.token} for ${fee.description}. Swap some ${swapAnalysis.fromAsset} → ${fee.token} on your selected DEX first, then return to complete this withdrawal.`,
                    badge: 'REQUIRED STEP',
                    userReceives: {
                        amount: swapAnalysis.outputAmount,
                        asset: swapAnalysis.toAsset
                    },
                    cost: {
                        amount: `~${fee.usdValue.toFixed(2)}`,
                        asset: `worth of ${fee.token}`,
                        description: `Manual swap required on ${selectedDEX}`
                    }
                });
            }
        }
        // Alternative: Use other portfolio assets
        const otherAssets = Object.keys(portfolio).filter(asset => asset !== swapAnalysis.fromAsset &&
            asset !== fee.token &&
            (portfolio[asset] || 0) > 0);
        otherAssets.forEach(asset => {
            const feeInOtherAsset = fee.usdValue / ASSET_PRICES[asset];
            if ((portfolio[asset] || 0) >= feeInOtherAsset) {
                solutions.push({
                    id: `swap_${asset}_${fee.token}`,
                    type: 'swap_other_asset',
                    title: `Swap ${feeInOtherAsset.toFixed(6)} ${asset} → ${fee.token}`,
                    description: `Use your ${asset} holdings to cover ${fee.description}`,
                    badge: 'ALTERNATIVE',
                    userReceives: {
                        amount: swapAnalysis.outputAmount,
                        asset: swapAnalysis.toAsset
                    },
                    cost: {
                        amount: feeInOtherAsset.toFixed(6),
                        asset: asset,
                        description: `From ${asset} holdings`
                    }
                });
            }
        });
    });
    return solutions.sort((a, b) => {
        const order = { 'RECOMMENDED': 1, 'REQUIRED STEP': 2, 'ALTERNATIVE': 3 };
        return order[a.badge] - order[b.badge];
    });
}
// ===============================================
// DEX INTEGRATION ENGINE
// ===============================================
export const DEX_OPTIONS = {
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
        advantages: ['Lower trading fees', 'Faster transaction processing', 'Better for smaller trades'],
        stats: {
            'Swap Speed': '5-12s',
            'Trading Fee': '0.3%',
            'Liquidity': 'Medium',
            'Slippage': 'Medium'
        },
        deepLinkBase: 'https://kongswap.io/swap'
    }
};
export function recommendDEX(fromAsset, toAsset, amount) {
    const swapValueUSD = amount * ASSET_PRICES[fromAsset];
    let preferredDEX = 'KongSwap'; // Default to lower fees
    let reasoning = '';
    if (swapValueUSD > 10000) {
        preferredDEX = 'ICPSwap';
        reasoning = `Large trade ($${Math.round(swapValueUSD).toLocaleString()}) - prioritizing liquidity and price discovery`;
    }
    else if (swapValueUSD < 1000) {
        preferredDEX = 'KongSwap';
        reasoning = `Small trade ($${Math.round(swapValueUSD).toLocaleString()}) - prioritizing lower fees`;
    }
    else {
        reasoning = `Medium trade ($${Math.round(swapValueUSD).toLocaleString()}) - balanced approach with lower fees`;
    }
    return {
        recommended: DEX_OPTIONS[preferredDEX],
        reasoning
    };
}
export function getBracketConfiguration(route) {
    const configs = [];
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
    }
    else if (route.operationType === 'DEX Swap') {
        configs.push({
            startIndex: 0,
            endIndex: 2,
            label: 'DEX Swap',
            type: 'dex'
        });
    }
    else if (route.operationType === 'Minter Operation') {
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
export function analyzeCompleteSwap(fromAsset, toAsset, amount, portfolio, selectedDEX = 'ICPSwap') {
    console.log('🔬 MASTER ANALYSIS: Analyzing swap:', { fromAsset, toAsset, amount });
    console.log('🔬 CACHE BUST: File updated at', new Date().toISOString());
    console.log('🔬 ASSET_PRICES check:', { 
        fromAssetPrice: ASSET_PRICES[fromAsset], 
        toAssetPrice: ASSET_PRICES[toAsset],
        fromExists: fromAsset in ASSET_PRICES,
        toExists: toAsset in ASSET_PRICES,
        allPrices: Object.keys(ASSET_PRICES)
    });
    // Validation
    if (!fromAsset || !toAsset || amount <= 0) {
        return {
            success: false,
            errors: ['Invalid swap parameters'],
            fromAsset: '',
            toAsset: '',
            amount: 0,
            outputAmount: 0,
            rate: 0,
            priceImpact: 0,
            route: null,
            feeRequirements: [],
            needsSmartSolutions: false,
            isL1Withdrawal: false,
            destinationChain: '',
            totalFeesUSD: 0
        };
    }
    // Calculate base swap details
    const baseSwap = calculateBaseSwapRate(fromAsset, toAsset, amount);
    if (!baseSwap.isValidPair) {
        return {
            success: false,
            errors: ['Invalid asset pair'],
            fromAsset,
            toAsset,
            amount,
            outputAmount: 0,
            rate: 0,
            priceImpact: 0,
            route: null,
            feeRequirements: [],
            needsSmartSolutions: false,
            isL1Withdrawal: false,
            destinationChain: '',
            totalFeesUSD: 0
        };
    }
    // Generate route and fee requirements
    const route = calculateSwapRoute(fromAsset, toAsset);
    console.log('🚀 ABOUT TO CALL calculateFeeRequirements with:', { fromAsset, toAsset, amount, portfolio, selectedDEX });
    const feeRequirements = calculateFeeRequirements(fromAsset, toAsset, amount, portfolio, selectedDEX);
    console.log('🚀 calculateFeeRequirements RETURNED:', feeRequirements);
    // Calculate total fees and check for smart solutions
    const totalFeesUSD = feeRequirements.reduce((sum, fee) => sum + fee.usdValue, 0);
    const needsSmartSolutions = feeRequirements.some(fee => !fee.isUserSufficient);
    const swapAnalysis = {
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
 * Formats numbers for display
 */
export function formatNumber(num, decimals = 6) {
    if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`;
    }
    else if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
    }
    else {
        return num.toFixed(decimals);
    }
}
/**
 * Validates portfolio sufficiency for a swap
 */
export function validatePortfolioSufficiency(fromAsset, amount, portfolio) {
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
export function estimateSwapTime(route, selectedDEX = 'ICPSwap') {
    if (route.operationType === 'Minter Operation') {
        return route.isCrossChain ? '1-3 min' : '15-45s';
    }
    else if (route.operationType === 'DEX Swap') {
        return selectedDEX === 'KongSwap' ? '5-12s' : '8-15s';
    }
    else {
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
