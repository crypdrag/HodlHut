// ===============================================
// HodlHut DEX Integration - Smart DEX Selection
// ===============================================
// ===============================================
// DEX Configuration Database
// ===============================================
export const DEX_OPTIONS = {
    'ICPSwap': {
        id: 'ICPSwap',
        name: 'ICPSwap',
        tradingFee: 0.003, // 0.3%
        advantages: [
            'Higher liquidity pools',
            'Better price discovery',
            'More established trading pairs'
        ],
        tradeoffs: [
            'Slightly higher fees',
            'Can have higher slippage on large trades'
        ],
        stats: {
            'Swap Speed': '8-15 seconds',
            'Trading Fee': '0.3%',
            'Liquidity': 'High',
            'Slippage': 'Low-Medium'
        },
        deepLinkBase: 'https://app.icpswap.com/swap',
        isRecommended: false
    },
    'KongSwap': {
        id: 'KongSwap',
        name: 'KongSwap',
        tradingFee: 0.0025, // 0.25%
        advantages: [
            'Lower trading fees',
            'Faster transaction processing',
            'Better for smaller trades'
        ],
        tradeoffs: [
            'Lower liquidity on some pairs',
            'Newer platform'
        ],
        stats: {
            'Swap Speed': '5-12 seconds',
            'Trading Fee': '0.25%',
            'Liquidity': 'Medium',
            'Slippage': 'Medium'
        },
        deepLinkBase: 'https://kongswap.io/swap',
        isRecommended: true
    }
};
// Liquidity preferences by asset pair
const LIQUIDITY_PREFERENCES = {
    'ckBTC-ckUSDC': 'ICPSwap', // Higher liquidity needed for major pairs
    'ckETH-ckUSDC': 'ICPSwap',
    'ckBTC-ckETH': 'ICPSwap',
    'ICP-ckUSDC': 'KongSwap',
    'ckUSDC-ckUSDT': 'KongSwap' // Stablecoin pairs work well on either
};
// ===============================================
// Smart DEX Selection Engine
// ===============================================
/**
 * Recommends optimal DEX based on swap parameters
 */
export function recommendDEX(swapParams) {
    const { fromAsset, toAsset, amount } = swapParams;
    console.log(`🎯 DEX Selection: ${amount} ${fromAsset} → ${toAsset}`);
    // Check if we have specific preferences for this pair
    const pairKey = `${fromAsset}-${toAsset}`;
    const reversePairKey = `${toAsset}-${fromAsset}`;
    let preferredDEX = LIQUIDITY_PREFERENCES[pairKey] || LIQUIDITY_PREFERENCES[reversePairKey];
    // Apply logic based on swap characteristics
    const swapValueUSD = amount * getAssetPrice(fromAsset);
    if (!preferredDEX) {
        if (swapValueUSD > 10000) {
            // Large trades: prefer higher liquidity
            preferredDEX = 'ICPSwap';
        }
        else if (swapValueUSD < 1000) {
            // Small trades: prefer lower fees
            preferredDEX = 'KongSwap';
        }
        else {
            // Medium trades: use general recommendation
            preferredDEX = 'KongSwap'; // Default to lower fees
        }
    }
    const recommended = DEX_OPTIONS[preferredDEX];
    const alternatives = Object.values(DEX_OPTIONS).filter(dex => dex.id !== preferredDEX);
    const reasoning = generateRecommendationReasoning(swapParams, recommended);
    console.log(`✅ Recommended: ${recommended.name} (${reasoning})`);
    return {
        recommended,
        alternatives,
        reasoning
    };
}
/**
 * Generates human-readable reasoning for DEX recommendation
 */
function generateRecommendationReasoning(swapParams, recommendedDEX) {
    const { fromAsset, toAsset, amount } = swapParams;
    const swapValueUSD = amount * getAssetPrice(fromAsset);
    if (swapValueUSD > 10000) {
        return `Large trade (${formatUSD(swapValueUSD)}) - prioritizing liquidity and price discovery`;
    }
    else if (swapValueUSD < 1000) {
        return `Small trade (${formatUSD(swapValueUSD)}) - prioritizing lower fees`;
    }
    const pairKey = `${fromAsset}-${toAsset}`;
    if (LIQUIDITY_PREFERENCES[pairKey] === recommendedDEX.id) {
        return `Optimized for ${fromAsset}→${toAsset} pair liquidity`;
    }
    return `Best overall performance for this trade size (${formatUSD(swapValueUSD)})`;
}
/**
 * Compares all available DEX options for a swap
 */
export function compareDEXOptions(swapParams) {
    const { fromAsset, toAsset, amount } = swapParams;
    const comparison = {};
    Object.values(DEX_OPTIONS).forEach(dex => {
        comparison[dex.id] = analyzeDEXForSwap(dex, swapParams);
    });
    const bestDEX = Object.entries(comparison)
        .sort(([, a], [, b]) => b.score - a.score)[0];
    const summary = `${bestDEX[0]} offers the best combination of fees, liquidity, and speed for this swap.`;
    return { comparison, summary };
}
/**
 * Analyzes a specific DEX for a swap
 */
function analyzeDEXForSwap(dex, swapParams) {
    const { fromAsset, toAsset, amount } = swapParams;
    const swapValueUSD = amount * getAssetPrice(fromAsset);
    // Calculate estimated output (simplified)
    const baseRate = getAssetPrice(fromAsset) / getAssetPrice(toAsset);
    const feeAmount = amount * dex.tradingFee;
    const netAmount = amount - feeAmount;
    const estimatedOutput = netAmount * baseRate;
    // Calculate total cost
    const totalCost = feeAmount * getAssetPrice(fromAsset);
    // Calculate score (higher is better)
    let score = 100;
    // Penalize higher fees
    score -= (dex.tradingFee * 1000); // 0.3% = -3 points
    // Boost for liquidity match
    const pairKey = `${fromAsset}-${toAsset}`;
    if (LIQUIDITY_PREFERENCES[pairKey] === dex.id) {
        score += 10;
    }
    // Boost for trade size compatibility
    if (swapValueUSD > 10000 && dex.id === 'ICPSwap') {
        score += 5; // Better for large trades
    }
    else if (swapValueUSD < 1000 && dex.id === 'KongSwap') {
        score += 5; // Better for small trades
    }
    // Determine strengths and concerns
    const strengths = [...dex.advantages];
    const concerns = [...dex.tradeoffs];
    if (totalCost > swapValueUSD * 0.01) {
        concerns.push('Fees are significant portion of trade value');
    }
    return {
        dex,
        estimatedOutput,
        totalCost,
        score,
        strengths,
        concerns
    };
}
// ===============================================
// DEX Deep Link Generation
// ===============================================
/**
 * Generates deep link to DEX with pre-filled swap parameters
 */
export function generateDEXLink(dexId, swapParams) {
    const dex = DEX_OPTIONS[dexId];
    if (!dex) {
        console.error(`❌ Unknown DEX: ${dexId}`);
        return '#';
    }
    const { fromAsset, toAsset, amount } = swapParams;
    // Build query parameters (DEX-specific format)
    const params = new URLSearchParams();
    if (dexId === 'ICPSwap') {
        params.append('inputCurrency', fromAsset);
        params.append('outputCurrency', toAsset);
        params.append('exactAmount', amount.toString());
        params.append('exactField', 'input');
    }
    else if (dexId === 'KongSwap') {
        params.append('from', fromAsset);
        params.append('to', toAsset);
        params.append('amount', amount.toString());
    }
    const fullLink = `${dex.deepLinkBase}?${params.toString()}`;
    console.log(`🔗 Generated ${dexId} link: ${fullLink}`);
    return fullLink;
}
/**
 * Generates DEX button HTML for UI integration
 */
export function generateDEXButtons(swapParams) {
    const comparison = recommendDEX(swapParams);
    let buttonsHTML = '<div class="dex-link-buttons">';
    // Add recommended DEX first
    const recommendedLink = generateDEXLink(comparison.recommended.id, swapParams);
    buttonsHTML += `
        <a href="${recommendedLink}" target="_blank" class="dex-link-btn ${comparison.recommended.id.toLowerCase()}" rel="noopener noreferrer">
            <span>🎯</span>
            <span>${comparison.recommended.name}</span>
            <span style="font-size: 0.8rem;">(Recommended)</span>
        </a>
    `;
    // Add alternative DEX options
    comparison.alternatives.forEach(dex => {
        const link = generateDEXLink(dex.id, swapParams);
        buttonsHTML += `
            <a href="${link}" target="_blank" class="dex-link-btn ${dex.id.toLowerCase()}" rel="noopener noreferrer">
                <span>⚡</span>
                <span>${dex.name}</span>
            </a>
        `;
    });
    buttonsHTML += '</div>';
    return buttonsHTML;
}
// ===============================================
// DEX Statistics & Analytics
// ===============================================
/**
 * Gets real-time DEX statistics (mock data - replace with API calls)
 */
export function getDEXStatistics(dexId) {
    // Mock data - in production, fetch from DEX APIs
    const mockStats = {
        'ICPSwap': {
            volume24h: 12500000,
            totalLiquidity: 85000000,
            averageSlippage: 0.008,
            uptime: 0.997
        },
        'KongSwap': {
            volume24h: 8200000,
            totalLiquidity: 45000000,
            averageSlippage: 0.006,
            uptime: 0.995
        }
    };
    return mockStats[dexId] || {
        volume24h: 0,
        totalLiquidity: 0,
        averageSlippage: 0.01,
        uptime: 0.99
    };
}
/**
 * Tracks DEX selection analytics
 */
export function trackDEXSelection(dexId, swapParams, wasRecommended) {
    console.log(`📊 DEX Selection: ${dexId} for ${swapParams.fromAsset}→${swapParams.toAsset}`);
    console.log(`📊 Was Recommended: ${wasRecommended}`);
    // In production, send to analytics service
    const analyticsEvent = {
        event: 'dex_selected',
        dexId,
        fromAsset: swapParams.fromAsset,
        toAsset: swapParams.toAsset,
        amount: swapParams.amount,
        wasRecommended,
        timestamp: Date.now()
    };
    // Store locally for now
    const existingEvents = JSON.parse(localStorage.getItem('hodlhut_analytics') || '[]');
    existingEvents.push(analyticsEvent);
    localStorage.setItem('hodlhut_analytics', JSON.stringify(existingEvents.slice(-100))); // Keep last 100
}
// ===============================================
// Helper Functions
// ===============================================
/**
 * Gets current asset price (mock data)
 */
function getAssetPrice(asset) {
    const prices = {
        'ckBTC': 97000,
        'BTC': 97000,
        'ckETH': 2500,
        'ETH': 2500,
        'ckUSDC': 1.00,
        'USDC': 1.00,
        'ckUSDT': 1.00,
        'USDT': 1.00,
        'USDCs': 1.00,
        'ICP': 12.50
    };
    return prices[asset] || 1;
}
/**
 * Formats USD value for display
 */
function formatUSD(value) {
    if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
    }
    else if (value >= 1000) {
        return `$${(value / 1000).toFixed(1)}K`;
    }
    else {
        return `$${value.toFixed(0)}`;
    }
}
/**
 * Gets all supported trading pairs for a DEX
 */
export function getSupportedPairs(dexId) {
    // Mock data - in production, fetch from DEX APIs
    const supportedPairs = {
        'ICPSwap': [
            'ckBTC-ckUSDC', 'ckETH-ckUSDC', 'ckBTC-ckETH',
            'ICP-ckUSDC', 'ckUSDC-ckUSDT'
        ],
        'KongSwap': [
            'ckBTC-ckUSDC', 'ckETH-ckUSDC',
            'ICP-ckUSDC', 'ckUSDC-ckUSDT'
        ]
    };
    return supportedPairs[dexId] || [];
}
/**
 * Checks if a DEX supports a specific trading pair
 */
export function supportsPair(dexId, fromAsset, toAsset) {
    const pairs = getSupportedPairs(dexId);
    const pairKey = `${fromAsset}-${toAsset}`;
    const reversePairKey = `${toAsset}-${fromAsset}`;
    return pairs.includes(pairKey) || pairs.includes(reversePairKey);
}
