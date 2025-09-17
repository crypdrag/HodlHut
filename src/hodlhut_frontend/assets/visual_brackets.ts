// ===============================================
// HodlHut Visual Brackets - Intelligent Route Display
// ===============================================

export interface SwapRoute {
    steps: string[];
    operationType: string;
    chainsInvolved: string[];
    estimatedTime: string;
    complexity: string;
    isCrossChain: boolean;
}

export interface BracketConfig {
    startIndex: number;
    endIndex: number;
    label: string;
    type: 'dex' | 'fusion' | 'minter';
    color: string;
    position: 'top' | 'bottom';
}

export interface RouteDisplayConfig {
    showIcons: boolean;
    showEstimatedTime: boolean;
    showComplexity: boolean;
    compactMode: boolean;
}

// Asset icons mapping
const ASSET_ICONS: Record<string, string> = {
    'ckBTC': '₿',
    'BTC': '₿',
    'ckETH': 'Ξ',
    'ETH': 'Ξ',
    'ckUSDC': '💵',
    'USDC': '💵',
    'ckUSDT': '₮',
    'USDT': '₮',
    'USDCs': '💵',
    'ICP': '∞'
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
// React Component Integration Functions
// ===============================================

/**
 * Creates a React-compatible bracket visual component
 */
export function createBracketVisualization(route: SwapRoute): JSX.Element {
    const React = require('react');
    
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        marginBottom: '1rem',
        position: 'relative',
        paddingTop: '45px'
    };

    const stepStyle: React.CSSProperties = {
        background: 'white',
        border: '2px solid var(--tertiary-500)',
        borderRadius: '10px',
        padding: '0.75rem 1rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
        minWidth: '120px',
        textAlign: 'center',
        position: 'relative'
    };

    const arrowStyle: React.CSSProperties = {
        color: 'var(--primary-500)',
        fontSize: '1.5rem',
        fontWeight: 'bold'
    };

    return React.createElement('div', { style: containerStyle }, [
        ...route.steps.map((step, index) => [
            React.createElement('div', { 
                key: `step-${index}`,
                style: stepStyle 
            }, `${ASSET_ICONS[step] || '●'} ${step}`),
            index < route.steps.length - 1 ? React.createElement('div', {
                key: `arrow-${index}`,
                style: arrowStyle
            }, '→') : null
        ]).flat().filter(Boolean),
        React.createElement(BracketOverlay, { route })
    ]);
}

/**
 * Bracket overlay component for React
 */
function BracketOverlay({ route }: { route: SwapRoute }): JSX.Element {
    const React = require('react');
    
    const brackets = getBracketConfig(route);
    
    const overlayStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '40px',
        pointerEvents: 'none',
        zIndex: 10
    };

    return React.createElement('div', { style: overlayStyle }, 
        brackets.map((bracket, index) => 
            React.createElement(BracketElement, { 
                key: index, 
                bracket, 
                stepCount: route.steps.length 
            })
        )
    );
}

/**
 * Individual bracket element for React
 */
function BracketElement({ bracket, stepCount }: { bracket: BracketConfig; stepCount: number }): JSX.Element {
    const React = require('react');
    
    // Calculate position based on step indices
    const stepWidth = 140; // Approximate width of each step including gap
    const startPos = bracket.startIndex * stepWidth;
    const endPos = bracket.endIndex * stepWidth;
    const width = endPos - startPos;
    
    const bracketConfig = BRACKET_TYPES[bracket.type];
    
    const containerStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${startPos}px`,
        top: '0px',
        width: `${width}px`,
        height: '40px'
    };

    const labelStyle: React.CSSProperties = {
        position: 'absolute',
        top: '0px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'white',
        color: bracketConfig.color,
        padding: '0.25rem 0.75rem',
        borderRadius: '12px',
        fontSize: '0.8rem',
        fontWeight: 600,
        border: `2px solid ${bracketConfig.borderColor}`,
        boxShadow: '0 2px 8px var(--gray-300)',
        whiteSpace: 'nowrap'
    };

    const lineStyle: React.CSSProperties = {
        position: 'absolute',
        top: '25px',
        left: '0',
        right: '0',
        height: '2px',
        background: bracketConfig.color
    };

    const hookStyle: React.CSSProperties = {
        position: 'absolute',
        top: '25px',
        width: '2px',
        height: '8px',
        background: bracketConfig.color
    };

    return React.createElement('div', { style: containerStyle }, [
        React.createElement('div', { key: 'label', style: labelStyle }, bracket.label),
        React.createElement('div', { key: 'line', style: lineStyle }),
        React.createElement('div', { key: 'left-hook', style: { ...hookStyle, left: '0' } }),
        React.createElement('div', { key: 'right-hook', style: { ...hookStyle, right: '0' } })
    ]);
}

// ===============================================
// Route Display Engine
// ===============================================

/**
 * Renders complete route visualization with smart bracket placement
 */
export function renderRouteDisplay(
    route: SwapRoute, 
    containerId: string, 
    config: Partial<RouteDisplayConfig> = {}
): void {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ Route display container not found: ${containerId}`);
        return;
    }
    
    const fullConfig: RouteDisplayConfig = {
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
function createRouteHeader(route: SwapRoute, config: RouteDisplayConfig): HTMLElement {
    const header = document.createElement('div');
    header.className = 'route-header';
    
    let headerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: black; font-weight: 600;">
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
function createRouteStepsContainer(route: SwapRoute, config: RouteDisplayConfig): HTMLElement {
    const container = document.createElement('div');
    container.className = 'route-steps-enhanced';
    container.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        margin-bottom: 1rem;
        position: relative;
        padding-top: 45px;
    `;
    
    let stepsHTML = '';
    
    // Generate route steps with arrows
    route.steps.forEach((step, index) => {
        const icon = config.showIcons ? ASSET_ICONS[step] || '●' : '';
        
        stepsHTML += `
            <div class="route-step-enhanced" data-step-index="${index}" style="
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
                <div class="route-arrow-enhanced" style="
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
function createRouteDetails(route: SwapRoute): HTMLElement {
    const details = document.createElement('div');
    details.className = 'route-details-enhanced';
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
            <div class="route-detail-enhanced" style="
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
function addIntelligentBrackets(route: SwapRoute, container: HTMLElement): void {
    console.log(`🎯 Adding brackets for ${route.operationType}`);
    
    // Clear any existing brackets
    clearExistingBrackets(container);
    
    if (route.operationType === 'DEX + Minter' && route.steps.length === 3) {
        // Multi-step route: Asset → Bridge → L1
        // Example: ckBTC → ckUSDC → USDC (ETH)
        addRouteBracket(container, 0, 2, 'Choose DEX', 'dex');
        addRouteBracket(container, 2, 4, 'Chain Fusion', 'fusion');
        
    } else if (route.operationType === 'DEX Swap') {
        // Simple DEX swap: ckBTC → ckETH
        addRouteBracket(container, 0, 2, 'DEX Swap', 'dex');
        
    } else if (route.operationType === 'Minter Operation') {
        // Direct minter operation: ckBTC → BTC
        addRouteBracket(container, 0, 2, route.isCrossChain ? 'Chain Fusion' : 'IC Minter', 
                       route.isCrossChain ? 'fusion' : 'minter');
    }
}

/**
 * Adds a single bracket to the route display
 */
function addRouteBracket(
    container: HTMLElement, 
    startIndex: number, 
    endIndex: number, 
    label: string, 
    type: 'dex' | 'fusion' | 'minter'
): void {
    
    const steps = container.querySelectorAll('.route-step-enhanced');
    if (startIndex >= steps.length || endIndex > steps.length * 2) {
        console.warn(`⚠️ Invalid bracket indices: ${startIndex}-${endIndex} for ${steps.length} steps`);
        return;
    }
    
    // Calculate bracket position
    const startElement = container.children[startIndex] as HTMLElement;
    const endElement = container.children[endIndex] as HTMLElement;
    
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
        top: -40px;
        width: ${width}px;
        height: 35px;
        pointer-events: none;
        z-index: 10;
    `;
    
    // Create bracket label
    const bracketConfig = BRACKET_TYPES[type];
    const labelElement = document.createElement('div');
    labelElement.className = 'bracket-label';
    labelElement.style.cssText = `
        position: absolute;
        top: 0px;
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
        position: absolute;
        top: 25px;
        left: 0;
        right: 0;
        height: 2px;
        background: ${bracketConfig.color};
    `;
    
    // Add corner hooks
    const leftHook = document.createElement('div');
    leftHook.style.cssText = `
        position: absolute;
        left: 0;
        top: 25px;
        width: 2px;
        height: 8px;
        background: ${bracketConfig.color};
    `;
    
    const rightHook = document.createElement('div');
    rightHook.style.cssText = `
        position: absolute;
        right: 0;
        top: 25px;
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
function clearExistingBrackets(container: HTMLElement): void {
    const existingBrackets = container.querySelectorAll('.route-bracket');
    existingBrackets.forEach(bracket => bracket.remove());
}

/**
 * Gets bracket configuration for route type
 */
export function getBracketConfig(route: SwapRoute): BracketConfig[] {
    const configs: BracketConfig[] = [];
    
    if (route.operationType === 'DEX + Minter' && route.steps.length === 3) {
        configs.push({
            startIndex: 0,
            endIndex: 1,
            label: 'Choose DEX',
            type: 'dex',
            color: BRACKET_TYPES.dex.color,
            position: 'top'
        });
        
        configs.push({
            startIndex: 1,
            endIndex: 2,
            label: 'Chain Fusion',
            type: 'fusion',
            color: BRACKET_TYPES.fusion.color,
            position: 'top'
        });
    } else if (route.operationType === 'DEX Swap') {
        configs.push({
            startIndex: 0,
            endIndex: 1,
            label: 'DEX Swap',
            type: 'dex',
            color: BRACKET_TYPES.dex.color,
            position: 'top'
        });
    } else if (route.operationType === 'Minter Operation') {
        configs.push({
            startIndex: 0,
            endIndex: 1,
            label: route.isCrossChain ? 'Chain Fusion' : 'IC Minter',
            type: route.isCrossChain ? 'fusion' : 'minter',
            color: BRACKET_TYPES[route.isCrossChain ? 'fusion' : 'minter'].color,
            position: 'top'
        });
    }
    
    return configs;
}