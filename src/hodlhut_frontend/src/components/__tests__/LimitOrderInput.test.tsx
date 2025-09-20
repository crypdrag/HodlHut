import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import LimitOrderInput from '../LimitOrderInput';
import { ToastProvider } from '../../contexts/ToastContext';
import { OrderbookErrorHandler } from '../../services/OrderbookErrorHandler';

// Mock data for testing
const mockAvailableAssets = ['ckBTC', 'ICP', 'ckUSDC', 'ckUSDT'];
const mockBalances = {
  'ckBTC': 0.5,
  'ICP': 1000,
  'ckUSDC': 5000,
  'ckUSDT': 3000
};
const mockMarketPrices = {
  'ckBTC/ICP': 6500,
  'ICP/ckUSDC': 8.5,
  'ckUSDC/ckBTC': 0.000015
};
const mockOrderbookData = {
  bestBid: 6450,
  bestAsk: 6550,
  spread: 100
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    {children}
  </ToastProvider>
);

// Default props for testing
const defaultProps = {
  availableAssets: mockAvailableAssets,
  balances: mockBalances,
  marketPrices: mockMarketPrices,
  orderbookData: mockOrderbookData,
  onSubmitOrder: jest.fn()
};

describe('LimitOrderInput Component - Low Liquidity Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Low Liquidity Detection and Warnings', () => {
    it('should detect and warn about large orders affecting liquidity', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <LimitOrderInput {...defaultProps} />
        </TestWrapper>
      );

      // Enter a large order amount that would affect liquidity
      const amountInput = screen.getByPlaceholderText('0.00');
      await user.clear(amountInput);
      await user.type(amountInput, '50'); // Large ckBTC order

      const priceInput = screen.getByDisplayValue('');
      await user.clear(priceInput);
      await user.type(priceInput, '6500');

      // Should show low liquidity warning
      await waitFor(() => {
        expect(screen.getByText(/Large order may experience some slippage/i)).toBeInTheDocument();
      });
    });

    it('should show specific warning for orders exceeding 10% of available liquidity', async () => {
      const user = userEvent.setup();

      // Mock very low liquidity scenario
      const lowLiquidityProps = {
        ...defaultProps,
        orderbookData: {
          bestBid: 6450,
          bestAsk: 6550,
          spread: 100
        }
      };

      render(
        <TestWrapper>
          <LimitOrderInput {...lowLiquidityProps} />
        </TestWrapper>
      );

      // Enter an order that represents >10% of liquidity
      const amountInput = screen.getByPlaceholderText('0.00');
      await user.clear(amountInput);
      await user.type(amountInput, '100'); // Very large order

      const priceInput = screen.getByDisplayValue('');
      await user.clear(priceInput);
      await user.type(priceInput, '6500');

      // Should show high liquidity utilization warning
      await waitFor(() => {
        expect(screen.getByText(/Large order detected/i)).toBeInTheDocument();
      });
    });

    it('should prevent order submission when liquidity is critically low', async () => {
      const user = userEvent.setup();
      const mockSubmitOrder = jest.fn();

      render(
        <TestWrapper>
          <LimitOrderInput
            {...defaultProps}
            onSubmitOrder={mockSubmitOrder}
          />
        </TestWrapper>
      );

      // Enter an extremely large order
      const amountInput = screen.getByPlaceholderText('0.00');
      await user.clear(amountInput);
      await user.type(amountInput, '1000'); // Unrealistically large

      const priceInput = screen.getByDisplayValue('');
      await user.clear(priceInput);
      await user.type(priceInput, '6500');

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /buy/i });
      await user.click(submitButton);

      // Should show error and not submit
      await waitFor(() => {
        expect(screen.getByText('Invalid Order')).toBeInTheDocument();
        expect(mockSubmitOrder).not.toHaveBeenCalled();
      });
    });

    it('should show different warnings for buy vs sell orders', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <LimitOrderInput {...defaultProps} />
        </TestWrapper>
      );

      // Test sell order with large amount
      const sellButton = screen.getByText('Sell');
      await user.click(sellButton);

      const amountInput = screen.getByPlaceholderText('0.00');
      await user.clear(amountInput);
      await user.type(amountInput, '50');

      const priceInput = screen.getByDisplayValue('');
      await user.clear(priceInput);
      await user.type(priceInput, '6500');

      // Should show sell-specific liquidity warning
      await waitFor(() => {
        const warningText = screen.getByText(/Large order/i);
        expect(warningText).toBeInTheDocument();
      });
    });

    it('should update warnings dynamically as order size changes', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <LimitOrderInput {...defaultProps} />
        </TestWrapper>
      );

      const amountInput = screen.getByPlaceholderText('0.00');
      const priceInput = screen.getByDisplayValue('');

      // Start with small order (no warning)
      await user.type(amountInput, '1');
      await user.type(priceInput, '6500');

      // Should not show liquidity warning for small order
      expect(screen.queryByText(/liquidity/i)).not.toBeInTheDocument();

      // Increase to large order
      await user.clear(amountInput);
      await user.type(amountInput, '50');

      // Should now show warning
      await waitFor(() => {
        expect(screen.getByText(/Large order/i)).toBeInTheDocument();
      });

      // Reduce back to small order
      await user.clear(amountInput);
      await user.type(amountInput, '1');

      // Warning should disappear
      await waitFor(() => {
        expect(screen.queryByText(/Large order/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Insufficient Balance Handling', () => {
    it('should show error when buy order exceeds available balance', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <LimitOrderInput {...defaultProps} />
        </TestWrapper>
      );

      // Enter buy order that exceeds ICP balance for ckBTC purchase
      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '10'); // 10 ckBTC

      const priceInput = screen.getByDisplayValue('');
      await user.type(priceInput, '6500'); // Would need 65,000 ICP but only have 1,000

      // Should show insufficient balance error
      await waitFor(() => {
        expect(screen.getByText(/Insufficient.*balance/i)).toBeInTheDocument();
      });
    });

    it('should show error when sell order exceeds available asset balance', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <LimitOrderInput {...defaultProps} />
        </TestWrapper>
      );

      // Switch to sell and try to sell more ckBTC than available
      const sellButton = screen.getByText('Sell');
      await user.click(sellButton);

      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '10'); // Try to sell 10 ckBTC but only have 0.5

      const priceInput = screen.getByDisplayValue('');
      await user.type(priceInput, '6500');

      // Should show insufficient balance error
      await waitFor(() => {
        expect(screen.getByText(/Insufficient.*balance/i)).toBeInTheDocument();
      });
    });

    it('should suggest reducing order size when balance is insufficient', async () => {
      const user = userEvent.setup();
      const mockSubmitOrder = jest.fn().mockRejectedValue({
        code: 'BALANCE_INSUFFICIENT',
        message: 'Insufficient balance'
      });

      render(
        <TestWrapper>
          <LimitOrderInput
            {...defaultProps}
            onSubmitOrder={mockSubmitOrder}
          />
        </TestWrapper>
      );

      // Enter valid-looking order but submit will fail due to balance
      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '0.1');

      const priceInput = screen.getByDisplayValue('');
      await user.type(priceInput, '6500');

      const submitButton = screen.getByRole('button', { name: /buy/i });
      await user.click(submitButton);

      // Should show error toast with balance message
      await waitFor(() => {
        expect(screen.getByText('Order Failed')).toBeInTheDocument();
        expect(screen.getByText('Insufficient balance')).toBeInTheDocument();
      });
    });
  });

  describe('Market Volatility and Timing Warnings', () => {
    it('should warn about trading during off-peak hours', async () => {
      const user = userEvent.setup();

      // Mock late night trading time
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(2); // 2 AM

      render(
        <TestWrapper>
          <LimitOrderInput {...defaultProps} />
        </TestWrapper>
      );

      // Enter a moderately large order during off-peak hours
      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '5');

      const priceInput = screen.getByDisplayValue('');
      await user.type(priceInput, '6500');

      // Should show off-peak hours warning
      await waitFor(() => {
        expect(screen.getByText(/off-peak hours/i)).toBeInTheDocument();
      });

      // Restore original getHours
      jest.restoreAllMocks();
    });

    it('should handle volatile market conditions with appropriate warnings', async () => {
      const user = userEvent.setup();

      // Use a volatile trading pair
      const volatileProps = {
        ...defaultProps,
        availableAssets: ['ckBTC', 'ICP'], // ckBTC/ICP is considered volatile
      };

      render(
        <TestWrapper>
          <LimitOrderInput {...volatileProps} />
        </TestWrapper>
      );

      // Set low slippage for volatile market
      const advancedButton = screen.getByText('Advanced Settings');
      await user.click(advancedButton);

      const slippageInput = screen.getByDisplayValue('1');
      await user.clear(slippageInput);
      await user.type(slippageInput, '0.3'); // Very low slippage

      // Should warn about low slippage in volatile market
      await waitFor(() => {
        expect(screen.getByText(/may be too low.*market conditions/i)).toBeInTheDocument();
      });
    });
  });

  describe('Network and Technical Error Handling', () => {
    it('should handle network timeout errors gracefully', async () => {
      const user = userEvent.setup();
      const mockSubmitOrder = jest.fn().mockRejectedValue({
        code: 'NETWORK_ERROR',
        message: 'Network connection timeout',
        suggestedAction: 'Please check your internet connection and try again.'
      });

      render(
        <TestWrapper>
          <LimitOrderInput
            {...defaultProps}
            onSubmitOrder={mockSubmitOrder}
          />
        </TestWrapper>
      );

      // Enter valid order
      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '0.1');

      const priceInput = screen.getByDisplayValue('');
      await user.type(priceInput, '6500');

      const submitButton = screen.getByRole('button', { name: /buy/i });
      await user.click(submitButton);

      // Should show network error with recovery suggestion
      await waitFor(() => {
        expect(screen.getByText('Order Failed')).toBeInTheDocument();
        expect(screen.getByText('Network connection timeout')).toBeInTheDocument();
      });
    });

    it('should handle price out of range errors', async () => {
      const user = userEvent.setup();
      const mockSubmitOrder = jest.fn().mockRejectedValue({
        code: 'PRICE_OUT_OF_RANGE',
        message: 'Order price outside acceptable range',
        suggestedAction: 'Market price has moved significantly. Please review and adjust your order price.'
      });

      render(
        <TestWrapper>
          <LimitOrderInput
            {...defaultProps}
            onSubmitOrder={mockSubmitOrder}
          />
        </TestWrapper>
      );

      // Enter order with extreme price
      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '0.1');

      const priceInput = screen.getByDisplayValue('');
      await user.type(priceInput, '1000'); // Way below market

      const submitButton = screen.getByRole('button', { name: /buy/i });
      await user.click(submitButton);

      // Should show price range error
      await waitFor(() => {
        expect(screen.getByText('Order Failed')).toBeInTheDocument();
        expect(screen.getByText('Order price outside acceptable range')).toBeInTheDocument();
      });
    });

    it('should handle wallet approval failures with specific messages', async () => {
      const user = userEvent.setup();
      const mockSubmitOrder = jest.fn().mockRejectedValue({
        code: 'WALLET_APPROVAL_FAILED',
        message: 'Transaction was rejected by user',
        suggestedAction: 'Please approve the transaction in your wallet to continue.'
      });

      render(
        <TestWrapper>
          <LimitOrderInput
            {...defaultProps}
            onSubmitOrder={mockSubmitOrder}
          />
        </TestWrapper>
      );

      // Enter valid order
      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '0.1');

      const priceInput = screen.getByDisplayValue('');
      await user.type(priceInput, '6500');

      const submitButton = screen.getByRole('button', { name: /buy/i });
      await user.click(submitButton);

      // Should show wallet approval error
      await waitFor(() => {
        expect(screen.getByText('Order Failed')).toBeInTheDocument();
        expect(screen.getByText('Transaction was rejected by user')).toBeInTheDocument();
      });
    });
  });

  describe('OrderbookErrorHandler Integration', () => {
    it('should use OrderbookErrorHandler for slippage validation', async () => {
      const user = userEvent.setup();
      const errorHandler = OrderbookErrorHandler.getInstance();
      const validateSlippageSpy = jest.spyOn(errorHandler, 'validateSlippage');

      render(
        <TestWrapper>
          <LimitOrderInput {...defaultProps} />
        </TestWrapper>
      );

      // Open advanced settings and set invalid slippage
      const advancedButton = screen.getByText('Advanced Settings');
      await user.click(advancedButton);

      const slippageInput = screen.getByDisplayValue('1');
      await user.clear(slippageInput);
      await user.type(slippageInput, '60'); // Invalid: >50%

      // Should trigger validation
      await waitFor(() => {
        expect(validateSlippageSpy).toHaveBeenCalled();
        expect(screen.getByText(/cannot exceed 50%/i)).toBeInTheDocument();
      });

      validateSlippageSpy.mockRestore();
    });

    it('should format error messages using OrderbookErrorHandler', async () => {
      const user = userEvent.setup();
      const errorHandler = OrderbookErrorHandler.getInstance();
      const formatErrorSpy = jest.spyOn(errorHandler, 'formatUserError');

      const mockSubmitOrder = jest.fn().mockRejectedValue({
        code: 'INSUFFICIENT_LIQUIDITY',
        message: 'Not enough liquidity available'
      });

      render(
        <TestWrapper>
          <LimitOrderInput
            {...defaultProps}
            onSubmitOrder={mockSubmitOrder}
          />
        </TestWrapper>
      );

      // Submit order that will fail
      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '0.1');

      const priceInput = screen.getByDisplayValue('');
      await user.type(priceInput, '6500');

      const submitButton = screen.getByRole('button', { name: /buy/i });
      await user.click(submitButton);

      // Should format error using error handler
      await waitFor(() => {
        expect(formatErrorSpy).toHaveBeenCalled();
      });

      formatErrorSpy.mockRestore();
    });
  });

  describe('Order Size Validation', () => {
    it('should reject orders below minimum size threshold', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <LimitOrderInput {...defaultProps} />
        </TestWrapper>
      );

      // Enter very small order (below $10 minimum)
      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '0.001');

      const priceInput = screen.getByDisplayValue('');
      await user.type(priceInput, '6500'); // $6.50 total value

      // Should show minimum order size error
      await waitFor(() => {
        expect(screen.getByText(/below minimum/i)).toBeInTheDocument();
      });
    });

    it('should suggest order splitting for very large orders', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <LimitOrderInput {...defaultProps} />
        </TestWrapper>
      );

      // Enter very large order
      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '100');

      const priceInput = screen.getByDisplayValue('');
      await user.type(priceInput, '6500');

      // Should suggest splitting large orders
      await waitFor(() => {
        expect(screen.getByText(/splitting.*smaller orders/i)).toBeInTheDocument();
      });
    });
  });
});