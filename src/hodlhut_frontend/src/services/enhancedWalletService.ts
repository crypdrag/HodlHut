// ===============================================
// Enhanced Wallet Service - Complete Demo Integration  
// ===============================================

export interface WalletBalance {
  [asset: string]: number;
}

export interface SwapValidation {
  isValid: boolean;
  error?: string;
  warning?: string;
  maxAmount?: number;
  smartSolutions?: string[];
}

export interface SwapDetails {
  fromAsset: string;
  toAsset: string;
  amount: number;
  toAmount: number;
  rate: number;
  priceImpact: number;
  isCrossChain: boolean;
  needsGas: boolean;
  needsSmartSolutions: boolean;
  feeToken?: string;
  feeAmount?: number;
  route: string[];
  fees: FeeItem[];
}

export interface FeeItem {
  type: string;
  description: string;
  amount: number;
  asset: string;
  usd: number;
}

export interface SmartSolution {
  type: string;
  title: string;
  description: string;
  receive: string;
  cost: string;
  badge: string;
  priority: number;
}

// Mock portfolio from demo HTML
export const MOCK_PORTFOLIO: WalletBalance = {
  'ckBTC': 0.15,
  'ckETH': 2.8,
  'ckUSDC': 5420.50,
  'ckUSDT': 1200.00,
  'ckSOL': 18.7,
  'ICP': 145.3
};

// Asset prices from demo
const ASSET_PRICES: Record<string, number> = {
  'BTC': 97600,
  'ETH': 3800,
  'USDC': 1.00,
  'USDT': 1.00,
  'ckBTC': 97600,
  'ckETH': 3800,
  'ckUSDC': 1.00,
  'ckUSDT': 1.00,
  'ckSOL': 200,
  'SOL': 200,
  'ICP': 12.50
};

const ASSET_ICONS: Record<string, string> = {
  'BTC': '₿',
  'ETH': 'Ξ',
  'USDC': '💵',
  'USDT': '💲',
  'ckBTC': '₿',
  'ckETH': 'Ξ',
  'ckUSDC': '💵',
  'ckUSDT': '💲',
  'ckSOL': '☀️',
  'SOL': '☀️',
  'ICP': '∞'
};

// All available assets for swapping TO (including L1 withdrawal options)
const ALL_SWAP_DESTINATIONS = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ckSOL', 'ICP', 'BTC', 'ETH', 'USDC', 'USDT', 'SOL'];

// Assets that can actually be held in portfolio (only ck-tokens and ICP)
const PORTFOLIO_ASSETS = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ckSOL', 'ICP'];

export class EnhancedWalletService {
  private portfolio: WalletBalance;
  private selectedSlippage: number = 0.5;
  private selectedSolution: SmartSolution | null = null;

  constructor(portfolio: WalletBalance = MOCK_PORTFOLIO) {
    this.portfolio = portfolio;
  }

  /**
   * Get balance for a specific asset (enhanced version from demo)
   */
  getBalance(asset: string): number {
    return this.portfolio[asset] || 0;
  }

  /**
   * Get formatted balance display (from demo HTML)
   */
  getFormattedBalance(asset: string): string {
    const balance = this.getBalance(asset);
    if (balance === 0) return 'Balance: --';
    
    if (balance >= 1000) {
      return `Balance: ${balance.toLocaleString()} ${asset}`;
    } else if (balance >= 1) {
      return `Balance: ${balance.toFixed(2)} ${asset}`;
    } else {
      return `Balance: ${balance.toFixed(6)} ${asset}`;
    }
  }

  /**
   * Enhanced balance checking from demo - updateFromBalanceEnhanced equivalent
   */
  updateFromBalanceEnhanced(fromAsset: string): string {
    if (fromAsset && this.portfolio[fromAsset]) {
      return `Balance: ${this.portfolio[fromAsset]} ${fromAsset}`;
    }
    return 'Balance: --';
  }

  /**
   * Get maximum swappable amount - setMaxAmountEnhanced equivalent
   */
  getMaxAmountEnhanced(fromAsset: string): number {
    if (!fromAsset || !this.portfolio[fromAsset]) return 0;
    return this.portfolio[fromAsset];
  }

  /**
   * Validate swap amount with enhanced logic from demo
   */
  validateSwapAmount(fromAsset: string, amount: number): SwapValidation {
    const balance = this.getBalance(fromAsset);
    
    if (!fromAsset) {
      return {
        isValid: false,
        error: 'Please select an asset to swap from'
      };
    }

    if (amount <= 0) {
      return {
        isValid: false,
        error: 'Amount must be greater than 0'
      };
    }

    if (balance === 0) {
      return {
        isValid: false,
        error: `No ${fromAsset} balance available`
      };
    }

    if (amount > balance) {
      const smartSolutions = this.getSmartSolutions(fromAsset, amount);
      return {
        isValid: false,
        error: `Insufficient balance. Maximum: ${balance} ${fromAsset}`,
        maxAmount: balance,
        smartSolutions
      };
    }

    // Check if amount is very close to max (within 1%)
    if (amount > balance * 0.99) {
      return {
        isValid: true,
        warning: `Using most of your ${fromAsset} balance`
      };
    }

    return { isValid: true };
  }

  /**
   * Calculate enhanced swap details (from demo HTML calculateEnhancedSwapDetails)
   */
  calculateEnhancedSwapDetails(fromAsset: string, toAsset: string, amount: number): SwapDetails {
    const fromPrice = ASSET_PRICES[fromAsset] || 1;
    const toPrice = ASSET_PRICES[toAsset] || 1;
    const baseRate = fromPrice / toPrice;
    
    // Add slippage
    const rate = baseRate * (1 - this.selectedSlippage / 100);
    const toAmount = amount * rate;
    
    // Determine if this is cross-chain
    const isL1Destination = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL'].includes(toAsset);
    const isCrossChain = isL1Destination;
    
    // Build route
    let route: string[] = [];
    if (isCrossChain) {
      if (toAsset === 'BTC') {
        route = [fromAsset, 'ICPSwap', 'ckBTC', 'Chain Fusion', 'BTC (Bitcoin L1)'];
      } else if (toAsset === 'SOL') {
        route = [fromAsset, 'ICPSwap', 'ckSOL', 'Chain Fusion', 'SOL (Solana L1)'];
      } else if (['ETH', 'USDC', 'USDT'].includes(toAsset)) {
        const intermediateAsset = toAsset === 'ETH' ? 'ckETH' : `ck${toAsset}`;
        route = [fromAsset, 'ICPSwap', intermediateAsset, 'Chain Fusion', `${toAsset} (Ethereum L1)`];
      }
    } else {
      route = [fromAsset, 'ICPSwap', toAsset];
    }

    // Determine fee requirements based on destination
    let needsSmartSolutions = false;
    let feeToken: string | undefined;
    let feeAmount: number | undefined;
    
    if (toAsset === 'BTC') {
      feeToken = 'ckBTC';
      feeAmount = 0.0005;
      const userCkBTC = this.portfolio['ckBTC'] || 0;
      needsSmartSolutions = userCkBTC < feeAmount;
    } else if (toAsset === 'SOL') {
      feeToken = 'ckSOL';
      feeAmount = 0.001;
      const userCkSOL = this.portfolio['ckSOL'] || 0;
      needsSmartSolutions = userCkSOL < feeAmount;
    } else if (['ETH', 'USDC', 'USDT'].includes(toAsset)) {
      feeToken = 'ckETH';
      feeAmount = 0.003;
      const userCkETH = this.portfolio['ckETH'] || 0;
      needsSmartSolutions = userCkETH < feeAmount;
    }

    // Calculate fees
    const fees = this.calculateFeesEnhanced(fromAsset, toAsset, amount, isCrossChain);

    return {
      fromAsset,
      toAsset,
      amount,
      toAmount,
      rate,
      priceImpact: 0.1, // Mock price impact
      isCrossChain,
      needsGas: isL1Destination,
      needsSmartSolutions,
      feeToken,
      feeAmount,
      route,
      fees
    };
  }

  /**
   * Calculate fees (from demo HTML calculateFeesEnhanced)
   */
  private calculateFeesEnhanced(fromAsset: string, toAsset: string, amount: number, isCrossChain: boolean): FeeItem[] {
    const fees: FeeItem[] = [];
    
    // ICPSwap fee
    const swapFeeAmount = amount * 0.003; // 0.3%
    const swapFeeUSD = swapFeeAmount * (ASSET_PRICES[fromAsset] || 1);
    fees.push({
      type: 'swap',
      description: 'ICPSwap Fee (0.3%)',
      amount: swapFeeAmount,
      asset: fromAsset,
      usd: swapFeeUSD
    });

    if (isCrossChain) {
      // Chain Fusion fee
      fees.push({
        type: 'bridge',
        description: 'Chain Fusion Fee',
        amount: 0.001,
        asset: fromAsset,
        usd: 2.00
      });

      // Gas fees for Ethereum
      if (['ETH', 'USDC', 'USDT'].includes(toAsset)) {
        fees.push({
          type: 'gas',
          description: 'Ethereum Gas',
          amount: 0.003,
          asset: 'ckETH',
          usd: 7.50
        });
      }

      // Bitcoin network fee
      if (toAsset === 'BTC') {
        fees.push({
          type: 'network',
          description: 'Bitcoin Network Fee',
          amount: 0.0005,
          asset: 'ckBTC',
          usd: 48.80
        });
      }

      // Solana network fee
      if (toAsset === 'SOL') {
        fees.push({
          type: 'network',
          description: 'Solana Network Fee',
          amount: 0.001,
          asset: 'ckSOL',
          usd: 0.20
        });
      }
    }

    return fees;
  }

  /**
   * Generate smart solutions (from demo HTML generateSolutionsEnhanced)
   */
  generateSmartSolutions(swapDetails: SwapDetails): SmartSolution[] {
    const solutions: SmartSolution[] = [];
    
    // Determine the correct fee token and amount based on destination
    let feeToken: string | undefined;
    let feeAmount: number | undefined;
    let feeDescription: string;
    
    if (swapDetails.toAsset === 'BTC') {
      feeToken = 'ckBTC';
      feeAmount = 0.0005;
      feeDescription = 'Bitcoin network fees';
    } else if (swapDetails.toAsset === 'SOL') {
      feeToken = 'ckSOL';
      feeAmount = 0.001;
      feeDescription = 'Solana network fees';
    } else if (['ETH', 'USDC', 'USDT'].includes(swapDetails.toAsset)) {
      feeToken = 'ckETH';
      feeAmount = 0.003;
      feeDescription = 'Ethereum gas fees';
    } else {
      return []; // Internal ICP swap - minimal fees, no smart solutions needed
    }
    
    const feeUSD = feeAmount * (ASSET_PRICES[feeToken] || 1);
    const userFeeTokenBalance = this.portfolio[feeToken] || 0;
    
    // Only show solutions if user doesn't have enough fee token
    if (userFeeTokenBalance >= feeAmount) {
      return []; // User already has sufficient fee token
    }
    
    // RECOMMENDED: Use the FROM asset for fees
    if (swapDetails.fromAsset !== feeToken && ASSET_PRICES[swapDetails.fromAsset]) {
      const feeInFromAsset = feeUSD / ASSET_PRICES[swapDetails.fromAsset];
      
      if (this.portfolio[swapDetails.fromAsset] >= swapDetails.amount + feeInFromAsset) {
        solutions.push({
          type: 'deduct_from_swap',
          title: `Swap ${feeInFromAsset.toFixed(6)} ${swapDetails.fromAsset} → ${feeToken} (deducted from swap amount)`,
          description: `Use part of your ${swapDetails.fromAsset} for ${feeDescription}, send the rest to ${swapDetails.toAsset}`,
          receive: `${(swapDetails.toAmount - (feeInFromAsset * swapDetails.rate)).toFixed(6)} ${swapDetails.toAsset}`,
          cost: `${feeInFromAsset.toFixed(6)} ${swapDetails.fromAsset} for fees`,
          badge: 'RECOMMENDED',
          priority: 1
        });
      }
    }
    
    // OPTIONS: Swap from other assets for fees
    const otherAssets = Object.keys(this.portfolio).filter(asset => 
      asset !== swapDetails.fromAsset && 
      asset !== feeToken && 
      this.portfolio[asset] > 0 &&
      ASSET_PRICES[asset]
    );
    
    otherAssets.forEach(asset => {
      const feeInOtherAsset = feeUSD / ASSET_PRICES[asset];
      
      if (this.portfolio[asset] >= feeInOtherAsset) {
        solutions.push({
          type: 'swap_other_asset',
          title: `Swap ${feeInOtherAsset.toFixed(6)} ${asset} → ${feeToken}`,
          description: `Use your ${asset} holdings to cover ${feeDescription}`,
          receive: `${swapDetails.toAmount.toFixed(6)} ${swapDetails.toAsset}`,
          cost: `${feeInOtherAsset.toFixed(6)} ${asset} for fees`,
          badge: 'OPTION',
          priority: 2
        });
      }
    });
    
    // OPTION: Manual top-up
    solutions.push({
      type: 'manual_topup',
      title: `Add ${feeToken} to your Hut`,
      description: `Deposit ${feeAmount.toFixed(6)} ${feeToken} manually to cover ${feeDescription}`,
      receive: `${swapDetails.toAmount.toFixed(6)} ${swapDetails.toAsset}`,
      cost: 'External deposit required',
      badge: 'OPTION',
      priority: 3
    });
    
    return solutions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get smart solutions for insufficient balance scenarios
   */
  getSmartSolutions(fromAsset: string, requestedAmount: number): string[] {
    const balance = this.getBalance(fromAsset);
    const solutions: string[] = [];

    if (requestedAmount > balance) {
      // Suggest using max available
      solutions.push(`Use maximum available: ${balance} ${fromAsset}`);
      
      // Suggest alternative assets
      const alternatives = this.getPortfolioAssets()
        .filter(asset => asset !== fromAsset)
        .filter(asset => this.getBalance(asset) > 0);
      
      if (alternatives.length > 0) {
        solutions.push(`Consider swapping from: ${alternatives.slice(0, 2).join(', ')}`);
      }

      // Suggest partial amount
      const suggestedAmount = Math.floor(balance * 0.8 * 1000000) / 1000000;
      if (suggestedAmount > 0) {
        solutions.push(`Try smaller amount: ${suggestedAmount} ${fromAsset}`);
      }
    }

    return solutions;
  }

  /**
   * Get portfolio assets (assets with non-zero balance)
   */
  getPortfolioAssets(): string[] {
    return Object.keys(this.portfolio).filter(asset => this.portfolio[asset] > 0);
  }

  /**
   * Get all available swap destinations
   */
  getAllSwapDestinations(): string[] {
    return ALL_SWAP_DESTINATIONS;
  }

  /**
   * Get portfolio assets for FROM dropdown
   */
  getFromAssetOptions(): string[] {
    return PORTFOLIO_ASSETS.filter(asset => this.portfolio[asset] > 0);
  }

  /**
   * Get asset icon
   */
  getAssetIcon(asset: string): string {
    return ASSET_ICONS[asset] || '❓';
  }

  /**
   * Get asset price
   */
  getAssetPrice(asset: string): number {
    return ASSET_PRICES[asset] || 1;
  }

  /**
   * Get total portfolio value in USD
   */
  getTotalPortfolioValue(): number {
    return Object.entries(this.portfolio).reduce((total, [asset, amount]) => {
      return total + (amount * this.getAssetPrice(asset));
    }, 0);
  }

  /**
   * Calculate portfolio diversity bonus
   */
  getPortfolioDiversityBonus(): number {
    const assetCount = this.getPortfolioAssets().length;
    if (assetCount >= 6) return 2.2;
    if (assetCount >= 4) return 1.8;
    if (assetCount >= 2) return 1.3;
    return 1.0;
  }

  /**
   * Update portfolio balance
   */
  updateBalance(asset: string, amount: number): void {
    this.portfolio[asset] = Math.max(0, amount);
  }

  /**
   * Set slippage tolerance
   */
  setSlippage(slippage: number): void {
    this.selectedSlippage = slippage;
  }

  /**
   * Get current slippage
   */
  getSlippage(): number {
    return this.selectedSlippage;
  }

  /**
   * Format USD value for display
   */
  formatUSD(value: number): string {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  }
}

// Export singleton instance
export const enhancedWalletService = new EnhancedWalletService();