import { OrderbookError, LimitOrderInput, OrderValidation } from '../types/orderbook';

export class OrderbookErrorHandler {
  private static instance: OrderbookErrorHandler;

  public static getInstance(): OrderbookErrorHandler {
    if (!OrderbookErrorHandler.instance) {
      OrderbookErrorHandler.instance = new OrderbookErrorHandler();
    }
    return OrderbookErrorHandler.instance;
  }

  /**
   * Enhanced slippage validation with detailed error messages
   */
  validateSlippage(slippage: number, orderInput: LimitOrderInput): OrderValidation['errors'] {
    const errors: OrderValidation['errors'] = {};

    // Basic range validation
    if (slippage < 0.1) {
      errors.slippage = 'Slippage tolerance cannot be less than 0.1%. This may cause order failures.';
    } else if (slippage > 50) {
      errors.slippage = 'Slippage tolerance cannot exceed 50%. Please use a more reasonable value.';
    }

    // Context-specific slippage validation
    if (slippage > 5 && slippage <= 50) {
      const amount = parseFloat(orderInput.amount);
      const price = parseFloat(orderInput.price);

      if (amount > 1000) {
        errors.slippage = `High slippage (${slippage}%) on large orders can result in significant losses. Consider reducing to 2-3%.`;
      } else if (orderInput.orderType === 'limit' && slippage > 10) {
        errors.slippage = `Limit orders typically don't require high slippage. ${slippage}% may indicate a pricing error.`;
      }
    }

    // Market conditions validation
    if (slippage < 0.5 && this.isVolatileMarket(orderInput.fromAsset, orderInput.toAsset)) {
      errors.slippage = `${slippage}% slippage may be too low for ${orderInput.fromAsset}/${orderInput.toAsset} in current market conditions. Consider 1-2%.`;
    }

    return errors;
  }

  /**
   * Generate insufficient liquidity warnings based on order size and market conditions
   */
  generateLiquidityWarnings(
    orderInput: LimitOrderInput,
    availableLiquidity: number,
    orderbookDepth: { bids: number; asks: number }
  ): OrderValidation['warnings'] {
    const warnings: OrderValidation['warnings'] = {};
    const amount = parseFloat(orderInput.amount);
    const price = parseFloat(orderInput.price);
    const orderValue = amount * price;

    // Check order size vs available liquidity
    const liquidityUtilization = orderValue / availableLiquidity;

    if (liquidityUtilization > 0.1) {
      warnings.lowLiquidity = `Your order represents ${(liquidityUtilization * 100).toFixed(1)}% of available liquidity. Expect partial fills and price impact.`;
    } else if (liquidityUtilization > 0.05) {
      warnings.lowLiquidity = `Large order detected. May experience some slippage due to limited orderbook depth.`;
    }

    // Orderbook depth analysis
    const relevantDepth = orderInput.side === 'buy' ? orderbookDepth.asks : orderbookDepth.bids;

    if (orderValue > relevantDepth * 0.5) {
      warnings.lowLiquidity = `Order size exceeds 50% of ${orderInput.side === 'buy' ? 'ask' : 'bid'} side depth. Consider splitting into smaller orders.`;
    }

    // Time-based liquidity warnings
    const currentHour = new Date().getHours();
    if ((currentHour < 6 || currentHour > 22) && liquidityUtilization > 0.03) {
      warnings.lowLiquidity = `${warnings.lowLiquidity || ''} Trading during off-peak hours may result in reduced liquidity.`.trim();
    }

    return warnings;
  }

  /**
   * Handle wallet approval failures with specific recovery suggestions
   */
  handleWalletFailure(error: any, orderInput: LimitOrderInput): OrderbookError {
    // Parse common wallet error types
    if (error.message?.includes('User rejected')) {
      return {
        code: 'WALLET_APPROVAL_FAILED',
        message: 'Transaction was rejected by user',
        details: error,
        recoverable: true,
        suggestedAction: 'Please approve the transaction in your wallet to continue.'
      };
    }

    if (error.message?.includes('insufficient funds') || error.message?.includes('balance')) {
      const requiredAsset = orderInput.side === 'buy' ? orderInput.toAsset : orderInput.fromAsset;
      return {
        code: 'BALANCE_INSUFFICIENT',
        message: `Insufficient ${requiredAsset} balance`,
        details: error,
        recoverable: true,
        suggestedAction: `Please ensure you have enough ${requiredAsset} in your wallet. Consider reducing order size.`
      };
    }

    if (error.message?.includes('timeout') || error.message?.includes('network')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection timeout',
        details: error,
        recoverable: true,
        suggestedAction: 'Please check your internet connection and try again. The order was not submitted.'
      };
    }

    if (error.message?.includes('slippage') || error.message?.includes('price')) {
      return {
        code: 'PRICE_OUT_OF_RANGE',
        message: 'Order price outside acceptable range',
        details: error,
        recoverable: true,
        suggestedAction: 'Market price has moved significantly. Please review and adjust your order price.'
      };
    }

    if (error.message?.includes('gas') || error.message?.includes('fee')) {
      return {
        code: 'WALLET_APPROVAL_FAILED',
        message: 'Transaction fee estimation failed',
        details: error,
        recoverable: true,
        suggestedAction: 'Network congestion detected. Please increase gas price or try again later.'
      };
    }

    // Generic wallet error
    return {
      code: 'WALLET_APPROVAL_FAILED',
      message: 'Wallet transaction failed',
      details: error,
      recoverable: true,
      suggestedAction: 'Please check your wallet connection and try again. Ensure you have approved the necessary permissions.'
    };
  }

  /**
   * Validate order size constraints
   */
  validateOrderSize(orderInput: LimitOrderInput): OrderValidation['errors'] {
    const errors: OrderValidation['errors'] = {};
    const amount = parseFloat(orderInput.amount);
    const price = parseFloat(orderInput.price);
    const orderValue = amount * price;

    // Minimum order size validation (example: $10 minimum)
    if (orderValue < 10) {
      errors.amount = `Order value ($${orderValue.toFixed(2)}) is below minimum of $10.00`;
    }

    // Maximum order size validation (example: $100k maximum for regular users)
    if (orderValue > 100000) {
      errors.amount = `Order value ($${orderValue.toLocaleString()}) exceeds maximum of $100,000 for retail orders.`;
    }

    // Asset-specific minimums
    const assetMinimums: Record<string, number> = {
      'ckBTC': 0.001,
      'ICP': 0.1,
      'ckUSDC': 1.0,
      'ckUSDT': 1.0
    };

    const minAmount = assetMinimums[orderInput.fromAsset];
    if (minAmount && amount < minAmount) {
      errors.amount = `Minimum ${orderInput.fromAsset} order size is ${minAmount}`;
    }

    return errors;
  }

  /**
   * Check if a trading pair is in volatile market conditions
   */
  private isVolatileMarket(fromAsset: string, toAsset: string): boolean {
    // This would typically check recent price volatility data
    // For now, we'll use a simple heuristic
    const volatilePairs = ['ckBTC/ICP', 'ICP/ckUSDC', 'ckETH/ICP'];
    const pair = `${fromAsset}/${toAsset}`;
    return volatilePairs.includes(pair) || volatilePairs.includes(`${toAsset}/${fromAsset}`);
  }

  /**
   * Generate user-friendly error messages for common scenarios
   */
  formatUserError(error: OrderbookError): string {
    switch (error.code) {
      case 'INSUFFICIENT_LIQUIDITY':
        return 'Not enough liquidity available for this order size. Try reducing the amount or splitting into multiple orders.';

      case 'INVALID_SLIPPAGE':
        return 'Slippage tolerance is outside acceptable range. Please adjust between 0.1% and 50%.';

      case 'WALLET_APPROVAL_FAILED':
        return 'Wallet transaction failed. Please check your connection and try again.';

      case 'BALANCE_INSUFFICIENT':
        return 'Insufficient balance to complete this order. Please check your wallet balance.';

      case 'PRICE_OUT_OF_RANGE':
        return 'Order price is significantly different from market price. Please review and adjust.';

      case 'ORDER_SIZE_TOO_SMALL':
        return 'Order size is below minimum requirements. Please increase the order amount.';

      case 'MARKET_CLOSED':
        return 'Market is currently closed or experiencing high volatility. Please try again later.';

      case 'NETWORK_ERROR':
        return 'Network connection issue. Please check your internet and try again.';

      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Generate recovery suggestions based on error type
   */
  getRecoverySuggestions(error: OrderbookError): string[] {
    const suggestions: string[] = [];

    switch (error.code) {
      case 'INSUFFICIENT_LIQUIDITY':
        suggestions.push('Reduce order size');
        suggestions.push('Split order into multiple smaller orders');
        suggestions.push('Use market order instead of limit order');
        suggestions.push('Wait for better market conditions');
        break;

      case 'INVALID_SLIPPAGE':
        suggestions.push('Adjust slippage to 1-3% for most trades');
        suggestions.push('Use lower slippage for stable pairs');
        suggestions.push('Use higher slippage for volatile markets');
        break;

      case 'WALLET_APPROVAL_FAILED':
        suggestions.push('Check wallet connection');
        suggestions.push('Refresh the page and try again');
        suggestions.push('Ensure sufficient gas/fees in wallet');
        suggestions.push('Try connecting to a different network');
        break;

      case 'BALANCE_INSUFFICIENT':
        suggestions.push('Deposit more funds to your wallet');
        suggestions.push('Reduce order amount');
        suggestions.push('Check if funds are locked in other orders');
        break;

      case 'PRICE_OUT_OF_RANGE':
        suggestions.push('Use current market price');
        suggestions.push('Increase slippage tolerance');
        suggestions.push('Wait for price to stabilize');
        break;

      default:
        suggestions.push('Refresh the page and try again');
        suggestions.push('Contact support if issue persists');
    }

    return suggestions;
  }
}