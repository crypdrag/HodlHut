import React, { useState, useEffect } from 'react';
import { ArrowUpDown, AlertTriangle, TrendingUp, TrendingDown, Info, CheckCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { LimitOrderInput as OrderInput, OrderValidation, OrderSide, OrderType, OrderbookError } from '../types/orderbook';

interface LimitOrderInputProps {
  /** Available assets for trading */
  availableAssets: string[];
  /** Current asset balances */
  balances: Record<string, number>;
  /** Current market prices */
  marketPrices: Record<string, number>;
  /** Orderbook data for price guidance */
  orderbookData?: {
    bestBid: number;
    bestAsk: number;
    spread: number;
  };
  /** Callback when order is submitted */
  onSubmitOrder: (order: OrderInput) => Promise<void>;
  /** Loading state */
  isSubmitting?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

const LimitOrderInput: React.FC<LimitOrderInputProps> = ({
  availableAssets,
  balances,
  marketPrices,
  orderbookData,
  onSubmitOrder,
  isSubmitting = false,
  compact = false
}) => {
  const { showError, showWarning } = useToast();

  // Order input state
  const [orderInput, setOrderInput] = useState<OrderInput>({
    side: 'buy',
    fromAsset: availableAssets[0] || '',
    toAsset: availableAssets[1] || '',
    price: '',
    amount: '',
    orderType: 'limit',
    slippage: 1.0,
    timeInForce: 'GTC'
  });

  // Validation state
  const [validation, setValidation] = useState<OrderValidation>({
    isValid: false,
    errors: {},
    warnings: {}
  });

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [priceMode, setPriceMode] = useState<'manual' | 'market' | 'best'>('manual');

  // Calculate derived values
  const totalValue = orderInput.price && orderInput.amount ?
    parseFloat(orderInput.price) * parseFloat(orderInput.amount) : 0;

  const marketPrice = marketPrices[`${orderInput.fromAsset}/${orderInput.toAsset}`] ||
                     marketPrices[`${orderInput.toAsset}/${orderInput.fromAsset}`];

  const priceImpact = marketPrice && orderInput.price ?
    Math.abs((parseFloat(orderInput.price) - marketPrice) / marketPrice * 100) : 0;

  // Validate order input
  useEffect(() => {
    validateOrder();
  }, [orderInput, balances, orderbookData]);

  const validateOrder = () => {
    const errors: OrderValidation['errors'] = {};
    const warnings: OrderValidation['warnings'] = {};

    // Price validation
    const price = parseFloat(orderInput.price);
    if (!orderInput.price || isNaN(price) || price <= 0) {
      errors.price = 'Please enter a valid price';
    }

    // Amount validation
    const amount = parseFloat(orderInput.amount);
    if (!orderInput.amount || isNaN(amount) || amount <= 0) {
      errors.amount = 'Please enter a valid amount';
    }

    // Balance validation
    const requiredBalance = orderInput.side === 'buy' ? totalValue : amount;
    const availableBalance = balances[orderInput.side === 'buy' ? orderInput.toAsset : orderInput.fromAsset] || 0;

    if (requiredBalance > availableBalance) {
      errors.balance = `Insufficient ${orderInput.side === 'buy' ? orderInput.toAsset : orderInput.fromAsset} balance`;
    }

    // Slippage validation
    if (orderInput.slippage < 0.1 || orderInput.slippage > 50) {
      errors.slippage = 'Slippage must be between 0.1% and 50%';
    }

    // Price impact warnings
    if (priceImpact > 5) {
      warnings.priceImpact = `Price impact of ${priceImpact.toFixed(2)}% is significant`;
    }

    // High slippage warning
    if (orderInput.slippage > 5) {
      warnings.highSlippage = 'High slippage tolerance may result in unfavorable execution';
    }

    // Liquidity warnings (simulated)
    if (orderbookData && amount > 1000) {
      warnings.lowLiquidity = 'Large order may experience partial fills';
    }

    setValidation({
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    });
  };

  const handleSwapAssets = () => {
    setOrderInput(prev => ({
      ...prev,
      fromAsset: prev.toAsset,
      toAsset: prev.fromAsset,
      side: prev.side === 'buy' ? 'sell' : 'buy'
    }));
  };

  const handlePriceModeChange = (mode: typeof priceMode) => {
    setPriceMode(mode);

    if (mode === 'market' && marketPrice) {
      setOrderInput(prev => ({ ...prev, price: marketPrice.toString() }));
    } else if (mode === 'best' && orderbookData) {
      const bestPrice = orderInput.side === 'buy' ? orderbookData.bestBid : orderbookData.bestAsk;
      setOrderInput(prev => ({ ...prev, price: bestPrice.toString() }));
    }
  };

  const handleSubmit = async () => {
    if (!validation.isValid) {
      showError('Invalid Order', 'Please fix the errors before submitting');
      return;
    }

    try {
      await onSubmitOrder(orderInput);
    } catch (error) {
      const orderError = error as OrderbookError;
      showError('Order Failed', orderError.message);
    }
  };

  return (
    <div className={`bg-surface-1 border border-white/10 rounded-xl ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className={`font-semibold text-text-primary ${compact ? 'text-lg' : 'text-xl'}`}>
          Limit Order
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">ICDEX</span>
          <div className="w-2 h-2 bg-success-400 rounded-full"></div>
        </div>
      </div>

      {/* Order Side Toggle */}
      <div className="flex bg-surface-2 rounded-lg p-1 mb-6">
        <button
          className={`flex-1 text-sm font-medium py-2 px-4 rounded-md transition-colors ${
            orderInput.side === 'buy'
              ? 'bg-success-600 text-success-50'
              : 'text-text-muted hover:text-text-primary'
          }`}
          onClick={() => setOrderInput(prev => ({ ...prev, side: 'buy' }))}
        >
          <TrendingUp size={16} className="inline mr-2" />
          Buy
        </button>
        <button
          className={`flex-1 text-sm font-medium py-2 px-4 rounded-md transition-colors ${
            orderInput.side === 'sell'
              ? 'bg-error-600 text-error-50'
              : 'text-text-muted hover:text-text-primary'
          }`}
          onClick={() => setOrderInput(prev => ({ ...prev, side: 'sell' }))}
        >
          <TrendingDown size={16} className="inline mr-2" />
          Sell
        </button>
      </div>

      {/* Asset Selection */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-text-muted mb-2">From</label>
            <select
              value={orderInput.fromAsset}
              onChange={(e) => setOrderInput(prev => ({ ...prev, fromAsset: e.target.value }))}
              className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none"
            >
              {availableAssets.map(asset => (
                <option key={asset} value={asset}>{asset}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSwapAssets}
            className="mt-6 w-8 h-8 rounded-full bg-surface-3 hover:bg-surface-2 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowUpDown size={16} />
          </button>

          <div className="flex-1">
            <label className="block text-xs font-medium text-text-muted mb-2">To</label>
            <select
              value={orderInput.toAsset}
              onChange={(e) => setOrderInput(prev => ({ ...prev, toAsset: e.target.value }))}
              className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none"
            >
              {availableAssets.map(asset => (
                <option key={asset} value={asset}>{asset}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Price Input */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-text-muted">Price ({orderInput.toAsset})</label>
          <div className="flex gap-1">
            {['manual', 'market', 'best'].map((mode) => (
              <button
                key={mode}
                onClick={() => handlePriceModeChange(mode as typeof priceMode)}
                className={`text-xs px-2 py-1 rounded ${
                  priceMode === mode
                    ? 'bg-primary-600 text-primary-50'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <input
          type="number"
          value={orderInput.price}
          onChange={(e) => setOrderInput(prev => ({ ...prev, price: e.target.value }))}
          placeholder="0.00"
          className={`w-full bg-surface-2 border rounded-lg px-3 py-2 text-text-primary focus:outline-none ${
            validation.errors.price
              ? 'border-error-500 focus:border-error-400'
              : 'border-white/10 focus:border-primary-500'
          }`}
        />
        {validation.errors.price && (
          <p className="text-xs text-error-400 mt-1">{validation.errors.price}</p>
        )}
        {marketPrice && (
          <p className="text-xs text-text-secondary mt-1">
            Market: {marketPrice.toFixed(6)} {orderInput.toAsset}
            {priceImpact > 0 && (
              <span className={`ml-2 ${priceImpact > 5 ? 'text-warning-400' : 'text-text-muted'}`}>
                ({priceImpact > 0 ? '+' : ''}{priceImpact.toFixed(2)}%)
              </span>
            )}
          </p>
        )}
      </div>

      {/* Amount Input */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-text-muted">Amount ({orderInput.fromAsset})</label>
          <span className="text-xs text-text-secondary">
            Balance: {(balances[orderInput.fromAsset] || 0).toFixed(4)}
          </span>
        </div>
        <input
          type="number"
          value={orderInput.amount}
          onChange={(e) => setOrderInput(prev => ({ ...prev, amount: e.target.value }))}
          placeholder="0.00"
          className={`w-full bg-surface-2 border rounded-lg px-3 py-2 text-text-primary focus:outline-none ${
            validation.errors.amount
              ? 'border-error-500 focus:border-error-400'
              : 'border-white/10 focus:border-primary-500'
          }`}
        />
        {validation.errors.amount && (
          <p className="text-xs text-error-400 mt-1">{validation.errors.amount}</p>
        )}
        {totalValue > 0 && (
          <p className="text-xs text-text-secondary mt-1">
            Total: {totalValue.toFixed(6)} {orderInput.toAsset}
          </p>
        )}
      </div>

      {/* Advanced Settings */}
      <div className="mb-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          <Info size={16} />
          Advanced Settings
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 p-4 bg-surface-2 rounded-lg">
            {/* Slippage Tolerance */}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2">
                Slippage Tolerance (%)
              </label>
              <input
                type="number"
                value={orderInput.slippage}
                onChange={(e) => setOrderInput(prev => ({ ...prev, slippage: parseFloat(e.target.value) || 0 }))}
                step="0.1"
                min="0.1"
                max="50"
                className="w-full bg-surface-1 border border-white/10 rounded-lg px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none"
              />
              {validation.errors.slippage && (
                <p className="text-xs text-error-400 mt-1">{validation.errors.slippage}</p>
              )}
            </div>

            {/* Time in Force */}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2">
                Time in Force
              </label>
              <select
                value={orderInput.timeInForce}
                onChange={(e) => setOrderInput(prev => ({ ...prev, timeInForce: e.target.value as any }))}
                className="w-full bg-surface-1 border border-white/10 rounded-lg px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none"
              >
                <option value="GTC">Good Till Cancelled</option>
                <option value="IOC">Immediate Or Cancel</option>
                <option value="FOK">Fill Or Kill</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Warnings */}
      {Object.keys(validation.warnings).length > 0 && (
        <div className="mb-6 p-4 bg-warning-600/10 border border-warning-500/20 rounded-lg">
          {Object.entries(validation.warnings).map(([key, warning]) => (
            <div key={key} className="flex items-start gap-2 text-sm">
              <AlertTriangle size={16} className="text-warning-400 mt-0.5 flex-shrink-0" />
              <span className="text-warning-300">{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!validation.isValid || isSubmitting}
        className={`w-full py-3 rounded-lg font-semibold transition-colors ${
          orderInput.side === 'buy'
            ? 'bg-success-600 hover:bg-success-700 text-success-50'
            : 'bg-error-600 hover:bg-error-700 text-error-50'
        } ${
          (!validation.isValid || isSubmitting)
            ? 'opacity-50 cursor-not-allowed'
            : ''
        }`}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            Submitting Order...
          </span>
        ) : (
          `${orderInput.side === 'buy' ? 'Buy' : 'Sell'} ${orderInput.fromAsset}`
        )}
      </button>

      {/* Order Summary */}
      {validation.isValid && (
        <div className="mt-4 p-3 bg-surface-2 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-success-400 mb-2">
            <CheckCircle size={16} />
            <span className="font-medium">Order Ready</span>
          </div>
          <div className="text-xs text-text-secondary space-y-1">
            <div>Type: {orderInput.orderType.charAt(0).toUpperCase() + orderInput.orderType.slice(1)} Order</div>
            <div>Estimated Fees: ~$2.50</div>
            <div>Time in Force: {orderInput.timeInForce}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LimitOrderInput;