import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, MoreVertical, Eye, RefreshCw } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { LimitOrder, OrderStatus, OrderSide } from '../types/orderbook';

interface OpenOrdersListProps {
  /** List of user's open orders */
  orders: LimitOrder[];
  /** Callback when order is cancelled */
  onCancelOrder: (orderId: string) => Promise<void>;
  /** Callback when orders need to be refreshed */
  onRefreshOrders: () => Promise<void>;
  /** Current market prices for price comparison */
  marketPrices: Record<string, number>;
  /** Loading states */
  loading?: {
    orders?: boolean;
    cancelling?: string;  // orderId being cancelled
  };
  /** Compact mode for smaller displays */
  compact?: boolean;
}

const OpenOrdersList: React.FC<OpenOrdersListProps> = ({
  orders,
  onCancelOrder,
  onRefreshOrders,
  marketPrices,
  loading = {},
  compact = false
}) => {
  const { showSuccess, showError } = useToast();

  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'created' | 'price' | 'amount' | 'status'>('created');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');

  // Auto-refresh orders every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading.orders) {
        onRefreshOrders();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loading.orders, onRefreshOrders]);

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-warning-400" />;
      case 'partial':
        return <RefreshCw size={16} className="text-primary-400" />;
      case 'filled':
        return <CheckCircle size={16} className="text-success-400" />;
      case 'cancelled':
        return <X size={16} className="text-text-muted" />;
      case 'failed':
        return <AlertTriangle size={16} className="text-error-400" />;
      default:
        return <Clock size={16} className="text-text-muted" />;
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'text-warning-400';
      case 'partial':
        return 'text-primary-400';
      case 'filled':
        return 'text-success-400';
      case 'cancelled':
        return 'text-text-muted';
      case 'failed':
        return 'text-error-400';
      default:
        return 'text-text-muted';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const calculateProgress = (order: LimitOrder) => {
    return (order.filled / order.amount) * 100;
  };

  const getMarketComparison = (order: LimitOrder) => {
    const marketKey = `${order.fromAsset}/${order.toAsset}`;
    const marketPrice = marketPrices[marketKey];

    if (!marketPrice) return null;

    const diff = ((order.price - marketPrice) / marketPrice) * 100;
    const isAboveMarket = diff > 0;

    return {
      diff: Math.abs(diff),
      isAboveMarket,
      favorable: (order.side === 'buy' && !isAboveMarket) || (order.side === 'sell' && isAboveMarket)
    };
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await onCancelOrder(orderId);
      setShowCancelConfirm(null);
      showSuccess('Order Cancelled', 'Your order has been successfully cancelled');
    } catch (error) {
      showError('Cancellation Failed', 'Unable to cancel order. Please try again.');
    }
  };

  const filteredOrders = orders
    .filter(order => filterStatus === 'all' || order.status === filterStatus)
    .sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return b.createdAt - a.createdAt;
        case 'price':
          return b.price - a.price;
        case 'amount':
          return b.amount - a.amount;
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

  if (loading.orders) {
    return (
      <div className="bg-surface-1 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-text-secondary">Loading orders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-1 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-semibold text-text-primary ${compact ? 'text-lg' : 'text-xl'}`}>
            Open Orders
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={onRefreshOrders}
              disabled={loading.orders}
              className="p-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors"
              title="Refresh orders"
            >
              <RefreshCw size={16} className={loading.orders ? 'animate-spin' : ''} />
            </button>
            <span className="text-sm text-text-secondary">
              {orders.length} order{orders.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-text-muted">Filter:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'all')}
              className="bg-surface-2 border border-white/10 rounded-lg px-3 py-1 text-sm text-text-primary focus:border-primary-500 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="filled">Filled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-text-muted">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-surface-2 border border-white/10 rounded-lg px-3 py-1 text-sm text-text-primary focus:border-primary-500 focus:outline-none"
            >
              <option value="created">Created</option>
              <option value="price">Price</option>
              <option value="amount">Amount</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-surface-2 rounded-full flex items-center justify-center">
              <Eye size={24} className="text-text-muted" />
            </div>
            <h4 className="text-lg font-medium text-text-primary mb-2">No Orders Found</h4>
            <p className="text-sm text-text-secondary">
              {filterStatus === 'all'
                ? "You don't have any open orders yet."
                : `No ${filterStatus} orders found.`
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredOrders.map((order) => {
              const progress = calculateProgress(order);
              const marketComparison = getMarketComparison(order);
              const isSelected = selectedOrder === order.id;
              const isCancelling = loading.cancelling === order.id;
              const canCancel = ['pending', 'partial'].includes(order.status);

              return (
                <div
                  key={order.id}
                  className={`p-4 hover:bg-surface-2/50 transition-colors ${
                    isSelected ? 'bg-surface-2' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {/* Side Indicator */}
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                          order.side === 'buy'
                            ? 'bg-success-600/20 text-success-300'
                            : 'bg-error-600/20 text-error-300'
                        }`}>
                          {order.side === 'buy' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {order.side.toUpperCase()}
                        </div>

                        {/* Asset Pair */}
                        <span className="font-medium text-text-primary">
                          {order.fromAsset}/{order.toAsset}
                        </span>

                        {/* Status */}
                        <div className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          <span className={`text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </div>

                        {/* Time */}
                        <span className="text-xs text-text-muted">
                          {formatTimeAgo(order.createdAt)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        {/* Price */}
                        <div>
                          <div className="text-xs text-text-muted mb-1">Price</div>
                          <div className="font-medium text-text-primary">
                            {order.price.toFixed(6)}
                          </div>
                          {marketComparison && (
                            <div className={`text-xs ${
                              marketComparison.favorable ? 'text-success-400' : 'text-warning-400'
                            }`}>
                              {marketComparison.isAboveMarket ? '+' : '-'}{marketComparison.diff.toFixed(1)}%
                            </div>
                          )}
                        </div>

                        {/* Amount */}
                        <div>
                          <div className="text-xs text-text-muted mb-1">Amount</div>
                          <div className="font-medium text-text-primary">
                            {order.amount.toFixed(4)} {order.fromAsset}
                          </div>
                          <div className="text-xs text-text-secondary">
                            ${(order.amount * order.price).toFixed(2)}
                          </div>
                        </div>

                        {/* Progress */}
                        <div>
                          <div className="text-xs text-text-muted mb-1">Progress</div>
                          <div className="font-medium text-text-primary">
                            {order.filled.toFixed(4)} / {order.amount.toFixed(4)}
                          </div>
                          <div className="w-full bg-surface-3 rounded-full h-1.5 mt-1">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                order.status === 'filled' ? 'bg-success-400' : 'bg-primary-400'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Fees */}
                        <div>
                          <div className="text-xs text-text-muted mb-1">Fees</div>
                          <div className="font-medium text-text-primary">
                            ${order.fees.actual?.toFixed(2) || order.fees.estimated.toFixed(2)}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {order.fees.actual ? 'Paid' : 'Estimated'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {canCancel && (
                        <button
                          onClick={() => setShowCancelConfirm(order.id)}
                          disabled={isCancelling}
                          className="px-3 py-1 text-xs font-medium bg-error-600/20 text-error-300 hover:bg-error-600/30 rounded-md transition-colors disabled:opacity-50"
                        >
                          {isCancelling ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedOrder(isSelected ? null : order.id)}
                        className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-xs text-text-muted mb-1">Order ID</div>
                          <div className="font-mono text-xs text-text-primary">{order.id}</div>
                        </div>
                        <div>
                          <div className="text-xs text-text-muted mb-1">Time in Force</div>
                          <div className="text-text-primary">GTC</div>
                        </div>
                        <div>
                          <div className="text-xs text-text-muted mb-1">Slippage</div>
                          <div className="text-text-primary">{order.slippage?.toFixed(1) || '1.0'}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-text-muted mb-1">Remaining</div>
                          <div className="text-text-primary">{order.remaining.toFixed(4)} {order.fromAsset}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-1 border border-white/20 rounded-xl p-6 max-w-md w-full">
            <h4 className="text-lg font-semibold text-text-primary mb-4">
              Cancel Order
            </h4>
            <p className="text-sm text-text-secondary mb-6">
              Are you sure you want to cancel this order? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(null)}
                className="flex-1 py-2 px-4 text-sm font-medium bg-surface-2 text-text-primary hover:bg-surface-3 rounded-lg transition-colors"
              >
                Keep Order
              </button>
              <button
                onClick={() => handleCancelOrder(showCancelConfirm)}
                disabled={loading.cancelling === showCancelConfirm}
                className="flex-1 py-2 px-4 text-sm font-medium bg-error-600 text-error-50 hover:bg-error-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading.cancelling === showCancelConfirm ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenOrdersList;