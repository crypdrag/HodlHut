// ===============================================
// HodlHut Visual Brackets - Intelligent Route Display
// ===============================================
// Asset icons mapping
const ASSET_ICONS = {
    'ckBTC': './assets/images/ckBTC.svg',
    'BTC': './assets/images/BTC.svg',
    'ckETH': './assets/images/ckETH.svg',
    'ETH': './assets/images/ETH.svg',
    'ckUSDC': './assets/images/ckUSDC.svg',
    'USDC': './assets/images/ckUSDC.svg',
    'ckUSDT': './assets/images/ckUSDT.svg',
    'USDT': './assets/images/ckUSDT.svg',
    'USDCs': './assets/images/ckUSDC.svg',
    'ICP': './assets/images/ICP.svg'
};
// Bracket type configurations
const BRACKET_TYPES = {
    dex: {
        color: 'var(--info)',
        backgroundColor: 'var(--info-bg)',
        borderColor: 'var(--info)'
    },
    fusion: {
        color: 'var(--primary-500)',
        backgroundColor: 'var(--primary-50)',
        borderColor: 'var(--primary-500)'
    },
    minter: {
        color: 'var(--secondary-500)',
        backgroundColor: 'var(--secondary-50)',
        borderColor: 'var(--secondary-500)'
    }
};
// ===============================================
// Route Display Engine
// ===============================================
/**
 * Renders complete route visualization with smart bracket placement
 */
export function renderRouteDisplay(route, containerId, config = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ Route display container not found: ${containerId}`);
        return;
    }
    const fullConfig = {
        showIcons: true,
        showEstimatedTime: true,
        showComplexity: true,
        compactMode: false,
        ...config
    };
    console.log(`🎨 Rendering route: ${route.steps.join(' → ')} (${route.operationType})`);
    // Clear existing content
    container.innerHTML = '';
    // Create route header
    if (!fullConfig.compactMode) {
        const header = createRouteHeader(route, fullConfig);
        container.appendChild(header);
    }
    // Create main route steps container
    const stepsContainer = createRouteStepsContainer(route, fullConfig);
    container.appendChild(stepsContainer);
    // Add brackets after DOM is ready
    setTimeout(() => {
        addIntelligentBrackets(route, stepsContainer);
    }, 10);
    // Add route details if not compact
    if (!fullConfig.compactMode) {
        const details = createRouteDetails(route);
        container.appendChild(details);
    }
}
/**
 * Creates route header with metadata
 */
function createRouteHeader(route, config) {
    const header = document.createElement('div');
    header.className = 'route-header';
    let headerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: var(--text-primary); font-weight: 600;">
            <span>🗺️</span>
            <span>${route.operationType}</span>
    `;
    if (config.showComplexity) {
        headerHTML += `<span style="color: var(--gray-600); font-weight: normal;">(${route.complexity})</span>`;
    }
    if (config.showEstimatedTime) {
        headerHTML += `<span style="color: var(--primary-500); margin-left: auto;">⏱️ ${route.estimatedTime}</span>`;
    }
    headerHTML += `</div>`;
    header.innerHTML = headerHTML;
    return header;
}
/**
 * Creates route steps visualization
 */
function createRouteStepsContainer(route, config) {
    const container = document.createElement('div');
    container.className = 'route-steps';
    container.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        margin-bottom: 1rem;
        position: relative;
        padding-top: 25px;
    `;
    let stepsHTML = '';
    // Generate route steps with arrows
    route.steps.forEach((step, index) => {
        const icon = config.showIcons ? ASSET_ICONS[step] || '●' : '';
        stepsHTML += `
            <div class="route-step" data-step-index="${index}" style="
                background: white;
                border: 2px solid var(--tertiary-500);
                border-radius: 10px;
                padding: 0.75rem 1rem;
                font-weight: 600;
                color: var(--text-primary);
                min-width: 120px;
                text-align: center;
                position: relative;
            ">
                ${icon} ${step}
            </div>
        `;
        // Add arrow between steps (except after last step)
        if (index < route.steps.length - 1) {
            stepsHTML += `
                <div class="route-arrow" style="
                    color: var(--primary-500);
                    font-size: 1.5rem;
                    font-weight: bold;
                ">→</div>
            `;
        }
    });
    container.innerHTML = stepsHTML;
    return container;
}
/**
 * Creates route details section
 */
function createRouteDetails(route) {
    const details = document.createElement('div');
    details.className = 'route-details';
    details.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    `;
    const detailsData = [
        { label: 'Chains Involved', value: route.chainsInvolved.join(' → ') },
        { label: 'Complexity', value: route.complexity },
        { label: 'Cross-Chain', value: route.isCrossChain ? 'Yes' : 'No' }
    ];
    let detailsHTML = '';
    detailsData.forEach(detail => {
        detailsHTML += `
            <div class="route-detail" style="
                background: white;
                padding: 0.75rem;
                border-radius: 8px;
                border-left: 4px solid var(--primary-500);
            ">
                <div style="font-size: 0.8rem; color: var(--gray-600); margin-bottom: 0.25rem;">
                    ${detail.label}
                </div>
                <div style="font-weight: 600; color: var(--text-primary);">
                    ${detail.value}
                </div>
            </div>
        `;
    });
    details.innerHTML = detailsHTML;
    return details;
}
// ===============================================
// Intelligent Bracket System
// ===============================================
/**
 * Adds intelligent brackets based on route type and complexity
 */
function addIntelligentBrackets(route, container) {
    console.log(`🎯 Adding brackets for ${route.operationType}`);
    // Clear any existing brackets
    clearExistingBrackets(container);
    if (route.operationType === 'DEX + Minter' && route.steps.length === 3) {
        // Multi-step route: Asset → Bridge → L1
        // Example: ckBTC → ckUSDC → USDC (ETH)
        addRouteBracket(container, 0, 2, 'Choose DEX', 'dex');
        addRouteBracket(container, 2, 4, 'Chain Fusion', 'fusion');
    }
    else if (route.operationType === 'DEX Swap') {
        // Simple DEX swap: ckBTC → ckETH
        addRouteBracket(container, 0, 2, 'DEX Swap', 'dex');
    }
    else if (route.operationType === 'Minter Operation') {
        // Direct minter operation: ckBTC → BTC
        addRouteBracket(container, 0, 2, route.isCrossChain ? 'Chain Fusion' : 'IC Minter', route.isCrossChain ? 'fusion' : 'minter');
    }
}
/**
 * Adds a single bracket to the route display
 */
function addRouteBracket(container, startIndex, endIndex, label, type) {
    const steps = container.querySelectorAll('.route-step');
    if (startIndex >= steps.length || endIndex > steps.length * 2) {
        console.warn(`⚠️ Invalid bracket indices: ${startIndex}-${endIndex} for ${steps.length} steps`);
        return;
    }
    // Calculate bracket position
    const startElement = container.children[startIndex];
    const endElement = container.children[endIndex];
    if (!startElement || !endElement) {
        console.warn(`⚠️ Bracket elements not found: ${startIndex}-${endIndex}`);
        return;
    }
    const containerRect = container.getBoundingClientRect();
    const startRect = startElement.getBoundingClientRect();
    const endRect = endElement.getBoundingClientRect();
    // Calculate positions relative to container
    const left = startRect.left - containerRect.left;
    const right = endRect.right - containerRect.left;
    const width = right - left;
    // Create bracket element
    const bracket = document.createElement('div');
    bracket.className = `route-bracket bracket-${type}`;
    bracket.style.cssText = `
        position: absolute;
        left: ${left}px;
        top: -20px;
        width: ${width}px;
        height: 15px;
        pointer-events: none;
        z-index: 10;
    `;
    // Create bracket label
    const bracketConfig = BRACKET_TYPES[type];
    const labelElement = document.createElement('div');
    labelElement.className = 'bracket-label';
    labelElement.style.cssText = `
        position: absolute;
        top: -25px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        color: ${bracketConfig.color};
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 600;
        border: 2px solid ${bracketConfig.borderColor};
        box-shadow: 0 2px 8px var(--gray-300);
        white-space: nowrap;
    `;
    labelElement.textContent = label;
    // Create bracket line
    const lineElement = document.createElement('div');
    lineElement.style.cssText = `
        width: 100%;
        height: 2px;
        background: ${bracketConfig.color};
        margin-top: 13px;
    `;
    // Add corner hooks
    const leftHook = document.createElement('div');
    leftHook.style.cssText = `
        position: absolute;
        left: 0;
        top: 13px;
        width: 2px;
        height: 8px;
        background: ${bracketConfig.color};
    `;
    const rightHook = document.createElement('div');
    rightHook.style.cssText = `
        position: absolute;
        right: 0;
        top: 13px;
        width: 2px;
        height: 8px;
        background: ${bracketConfig.color};
    `;
    // Assemble bracket
    bracket.appendChild(labelElement);
    bracket.appendChild(lineElement);
    bracket.appendChild(leftHook);
    bracket.appendChild(rightHook);
    // Add to container
    container.appendChild(bracket);
    console.log(`✅ Added ${type} bracket: "${label}" (${startIndex}-${endIndex})`);
}
/**
 * Clears existing brackets from container
 */
function clearExistingBrackets(container) {
    const existingBrackets = container.querySelectorAll('.route-bracket');
    existingBrackets.forEach(bracket => bracket.remove());
}
// ===============================================
// Route Display Utilities
// ===============================================
/**
 * Shows route display with animation
 */
export function showRouteDisplay(containerId) {
    const display = document.getElementById(containerId);
    if (!display)
        return;
    display.style.display = 'block';
    display.style.opacity = '0';
    display.style.transform = 'translateY(-10px)';
    // Animate in
    requestAnimationFrame(() => {
        display.style.transition = 'all 0.3s ease';
        display.style.opacity = '1';
        display.style.transform = 'translateY(0)';
    });
}
/**
 * Hides route display with animation
 */
export function hideRouteDisplay(containerId) {
    const display = document.getElementById(containerId);
    if (!display)
        return;
    display.style.transition = 'all 0.3s ease';
    display.style.opacity = '0';
    display.style.transform = 'translateY(-10px)';
    setTimeout(() => {
        display.style.display = 'none';
        // Reset styles
        display.style.background = 'var(--primary-50)';
        display.style.borderColor = 'var(--tertiary-500)';
    }, 300);
}
/**
 * Updates route display for same-token error
 */
export function showSameTokenError(containerId) {
    const display = document.getElementById(containerId);
    if (!display)
        return;
    // Change styling to indicate error
    display.style.background = 'linear-gradient(135deg, var(--error-bg), var(--error-bg))';
    display.style.borderColor = 'var(--error)';
    display.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-primary);">
            <div style="font-size: 2rem; margin-bottom: 1rem;">🏄‍♂️</div>
            <div style="font-weight: 600; margin-bottom: 0.5rem;">
                You are trying to swap the same token.
            </div>
            <div>Please check your swap and try again.</div>
        </div>
    `;
    display.style.display = 'block';
}
/**
 * Gets bracket configuration for route type
 */
export function getBracketConfig(route) {
    const configs = [];
    if (route.operationType === 'DEX + Minter' && route.steps.length === 3) {
        configs.push({
            startIndex: 0,
            endIndex: 2,
            label: 'Choose DEX',
            type: 'dex',
            color: BRACKET_TYPES.dex.color,
            position: 'top'
        });
        configs.push({
            startIndex: 2,
            endIndex: 4,
            label: 'Chain Fusion',
            type: 'fusion',
            color: BRACKET_TYPES.fusion.color,
            position: 'top'
        });
    }
    else if (route.operationType === 'DEX Swap') {
        configs.push({
            startIndex: 0,
            endIndex: 2,
            label: 'DEX Swap',
            type: 'dex',
            color: BRACKET_TYPES.dex.color,
            position: 'top'
        });
    }
    else if (route.operationType === 'Minter Operation') {
        configs.push({
            startIndex: 0,
            endIndex: 2,
            label: route.isCrossChain ? 'Chain Fusion' : 'IC Minter',
            type: route.isCrossChain ? 'fusion' : 'minter',
            color: BRACKET_TYPES[route.isCrossChain ? 'fusion' : 'minter'].color,
            position: 'top'
        });
    }
    return configs;
}
