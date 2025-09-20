// SwapFlow React Component Tests - Complete Swap UI Flow Testing
// Tests SwapRequest building, submission, UI rendering, and toast notifications

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SwapAssetsSection } from '../SwapAssetsSection';
import { TransactionPreviewModal } from '../TransactionPreviewModal';
import { PlugIntegrationService } from '../../services/PlugIntegration';
import { SwapRequest, SwapResponse } from '../../types/myhut';

// Mock the PlugIntegration service
jest.mock('../../services/PlugIntegration');

// Mock React hooks
const mockSetAuthStep = jest.fn();
const mockSetSelectedFromAsset = jest.fn();
const mockSetSelectedToAsset = jest.fn();
const mockSetSwapAmount = jest.fn();
const mockSetSlippageTolerance = jest.fn();
const mockSetIsTransactionPreviewOpen = jest.fn();
const mockSetLastTransactionId = jest.fn();
const mockSetLastReceivedAmount = jest.fn();

// Mock props for SwapAssetsSection
const mockSwapProps = {
  authStep: 'idle' as const,
  setAuthStep: mockSetAuthStep,
  selectedFromAsset: 'ICP',
  setSelectedFromAsset: mockSetSelectedFromAsset,
  selectedToAsset: 'ckBTC',
  setSelectedToAsset: mockSetSelectedToAsset,
  swapAmount: '1.0',
  setSwapAmount: mockSetSwapAmount,
  slippageTolerance: 0.5,
  setSlippageTolerance: mockSetSlippageTolerance,
  portfolio: [
    { symbol: 'ICP', balance: 10.5, usdValue: 126.0 },
    { symbol: 'ckBTC', balance: 0.02, usdValue: 1300.0 }
  ],
  isTransactionPreviewOpen: false,
  setIsTransactionPreviewOpen: mockSetIsTransactionPreviewOpen,
  lastTransactionId: null,
  setLastTransactionId: mockSetLastTransactionId,
  lastReceivedAmount: null,
  setLastReceivedAmount: mockSetLastReceivedAmount
};

describe('SwapFlow React Component Tests', () => {
  let mockPlugService: jest.Mocked<PlugIntegrationService>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();

    // Create mock PlugIntegrationService
    mockPlugService = {
      connectPlug: jest.fn(),
      getUserHut: jest.fn(),
      executeSwap: jest.fn(),
      isConnected: jest.fn(),
      getPrincipal: jest.fn(),
      disconnect: jest.fn()
    } as any;

    // Mock the singleton instance
    (PlugIntegrationService.getInstance as jest.Mock).mockReturnValue(mockPlugService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('SwapRequest Building and Submission', () => {
    it('should build correct SwapRequest when SELECT button is clicked', async () => {
      mockPlugService.isConnected.mockReturnValue(true);
      mockPlugService.getPrincipal.mockReturnValue('rdmx6-jaaaa-aaaaa-aaadq-cai');
      mockPlugService.getUserHut.mockResolvedValue('rrkah-fqaaa-aaaaa-aaaaq-cai');

      const mockSwapResponse: SwapResponse = {
        success: true,
        transactionId: 'tx_test_12345',
        actualAmountReceived: '153846', // 0.00153846 ckBTC
        actualSlippage: 0.3,
        actualFee: '2000000' // 0.02 ICP
      };

      mockPlugService.executeSwap.mockResolvedValue(mockSwapResponse);

      render(<SwapAssetsSection {...mockSwapProps} />);

      // Find and click the SELECT button (or main swap action button)
      const selectButton = screen.getByRole('button', { name: /swap|select|execute/i });
      await user.click(selectButton);

      await waitFor(() => {
        expect(mockPlugService.executeSwap).toHaveBeenCalledWith(
          'rrkah-fqaaa-aaaaa-aaaaq-cai',
          expect.objectContaining({
            fromAsset: 'ICP',
            toAsset: 'ckBTC',
            amount: '100000000', // 1.0 ICP in smallest units
            slippage: 0.5,
            urgency: expect.any(String)
          })
        );
      });
    });

    it('should handle different asset selections in SwapRequest', async () => {
      const updatedProps = {
        ...mockSwapProps,
        selectedFromAsset: 'ckETH',
        selectedToAsset: 'ckUSDC',
        swapAmount: '0.5',
        slippageTolerance: 1.0
      };

      mockPlugService.isConnected.mockReturnValue(true);
      mockPlugService.executeSwap.mockResolvedValue({
        success: true,
        transactionId: 'tx_eth_swap',
        actualAmountReceived: '1600000000', // 1600 ckUSDC
        actualSlippage: 0.8,
        actualFee: '5000000000000000' // 0.005 ckETH
      });

      render(<SwapAssetsSection {...updatedProps} />);

      const selectButton = screen.getByRole('button', { name: /swap|select|execute/i });
      await user.click(selectButton);

      await waitFor(() => {
        expect(mockPlugService.executeSwap).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            fromAsset: 'ckETH',
            toAsset: 'ckUSDC',
            amount: '500000000000000000', // 0.5 ckETH in smallest units
            slippage: 1.0,
            urgency: expect.any(String)
          })
        );
      });
    });

    it('should handle urgency levels correctly in SwapRequest', async () => {
      mockPlugService.isConnected.mockReturnValue(true);
      mockPlugService.executeSwap.mockResolvedValue({
        success: true,
        transactionId: 'tx_urgent',
        actualAmountReceived: '153846',
        actualSlippage: 0.3,
        actualFee: '2000000'
      });

      // Test with high urgency (fast execution needed)
      render(<SwapAssetsSection {...mockSwapProps} />);

      // Look for urgency selection UI element
      const urgencySelector = screen.queryByLabelText(/urgency|priority|speed/i);
      if (urgencySelector) {
        await user.selectOptions(urgencySelector, 'high');
      }

      const selectButton = screen.getByRole('button', { name: /swap|select|execute/i });
      await user.click(selectButton);

      await waitFor(() => {
        expect(mockPlugService.executeSwap).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            urgency: expect.stringMatching(/high|medium|low/)
          })
        );
      });
    });

    it('should validate input before building SwapRequest', async () => {
      const invalidProps = {
        ...mockSwapProps,
        swapAmount: '', // Empty amount should be invalid
        selectedFromAsset: '',
        selectedToAsset: ''
      };

      render(<SwapAssetsSection {...invalidProps} />);

      const selectButton = screen.getByRole('button', { name: /swap|select|execute/i });

      // Button should be disabled or clicking should show validation error
      if (selectButton.hasAttribute('disabled')) {
        expect(selectButton).toBeDisabled();
      } else {
        await user.click(selectButton);

        // Should show validation error instead of making API call
        expect(mockPlugService.executeSwap).not.toHaveBeenCalled();

        // Look for error messages
        await waitFor(() => {
          expect(screen.getByText(/invalid|required|empty/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('UI Rendering of Transaction Results', () => {
    it('should render tx_id when swap succeeds', async () => {
      const mockResponse: SwapResponse = {
        success: true,
        transactionId: 'tx_success_67890',
        actualAmountReceived: '307692', // 0.00307692 ckBTC
        actualSlippage: 0.25,
        actualFee: '1500000' // 0.015 ICP
      };

      mockPlugService.isConnected.mockReturnValue(true);
      mockPlugService.executeSwap.mockResolvedValue(mockResponse);

      render(<SwapAssetsSection {...mockSwapProps} />);

      const selectButton = screen.getByRole('button', { name: /swap|select|execute/i });
      await user.click(selectButton);

      await waitFor(() => {
        // Should display transaction ID
        expect(screen.getByText(/tx_success_67890/i)).toBeInTheDocument();
      });

      // Should also show transaction ID in a copyable format
      const txIdElement = screen.getByText(/tx_success_67890/i);
      expect(txIdElement).toBeInTheDocument();
    });

    it('should render received_amount with proper formatting', async () => {
      const mockResponse: SwapResponse = {
        success: true,
        transactionId: 'tx_amount_test',
        actualAmountReceived: '123456789', // Large amount for testing formatting
        actualSlippage: 0.4,
        actualFee: '3000000'
      };

      mockPlugService.executeSwap.mockResolvedValue(mockResponse);
      mockPlugService.isConnected.mockReturnValue(true);

      render(<SwapAssetsSection {...mockSwapProps} />);

      const selectButton = screen.getByRole('button', { name: /swap|select|execute/i });
      await user.click(selectButton);

      await waitFor(() => {
        // Should display received amount with proper decimal formatting
        // For ckBTC (8 decimals): 123456789 = 1.23456789 ckBTC
        expect(screen.getByText(/1\.23456789|123,456,789/i)).toBeInTheDocument();
      });

      // Should also show the asset symbol
      expect(screen.getByText(/ckBTC/i)).toBeInTheDocument();
    });

    it('should render additional transaction details', async () => {
      const mockResponse: SwapResponse = {
        success: true,
        transactionId: 'tx_details_test',
        actualAmountReceived: '200000',
        actualSlippage: 0.35,
        actualFee: '2500000',
        route: {
          dexUsed: 'KongSwap',
          steps: ['ICP', 'ckBTC'],
          estimatedTime: '12 seconds',
          complexity: 'simple'
        }
      };

      mockPlugService.executeSwap.mockResolvedValue(mockResponse);
      mockPlugService.isConnected.mockReturnValue(true);

      render(<SwapAssetsSection {...mockSwapProps} />);

      const selectButton = screen.getByRole('button', { name: /swap|select|execute/i });
      await user.click(selectButton);

      await waitFor(() => {
        // Should show DEX used
        expect(screen.getByText(/KongSwap/i)).toBeInTheDocument();

        // Should show actual slippage
        expect(screen.getByText(/0\.35%|0\.35/i)).toBeInTheDocument();

        // Should show fee information
        expect(screen.getByText(/fee|cost/i)).toBeInTheDocument();

        // Should show execution time
        expect(screen.getByText(/12 seconds/i)).toBeInTheDocument();
      });
    });

    it('should show error state when swap fails', async () => {
      const mockErrorResponse: SwapResponse = {
        success: false,
        error: 'Insufficient liquidity for this trade size',
        transactionId: undefined,
        actualAmountReceived: '0',
        actualSlippage: 0,
        actualFee: '0'
      };

      mockPlugService.executeSwap.mockResolvedValue(mockErrorResponse);
      mockPlugService.isConnected.mockReturnValue(true);

      render(<SwapAssetsSection {...mockSwapProps} />);

      const selectButton = screen.getByRole('button', { name: /swap|select|execute/i });
      await user.click(selectButton);

      await waitFor(() => {
        // Should show error message
        expect(screen.getByText(/insufficient liquidity/i)).toBeInTheDocument();

        // Should not show transaction ID
        expect(screen.queryByText(/tx_/)).not.toBeInTheDocument();

        // Should show zero received amount or hide it
        expect(screen.queryByText(/received.*0/i)).toBeInTheDocument();
      });
    });
  });

  describe('Toast Notifications', () => {
    it('should show success toast on successful swap', async () => {
      const mockResponse: SwapResponse = {
        success: true,
        transactionId: 'tx_toast_success',
        actualAmountReceived: '154000',
        actualSlippage: 0.3,
        actualFee: '2000000'
      };

      mockPlugService.executeSwap.mockResolvedValue(mockResponse);
      mockPlugService.isConnected.mockReturnValue(true);

      render(<SwapAssetsSection {...mockSwapProps} />);

      const selectButton = screen.getByRole('button', { name: /swap|select|execute/i });
      await user.click(selectButton);

      await waitFor(() => {
        // Look for success toast/notification
        expect(screen.getByText(/success|completed|confirmed/i)).toBeInTheDocument();

        // Should include transaction details in toast
        expect(screen.getByText(/tx_toast_success/i)).toBeInTheDocument();
      });
    });

    it('should show error toast on swap failure', async () => {
      const mockErrorResponse: SwapResponse = {
        success: false,
        error: 'Network timeout - please try again',
        transactionId: undefined,
        actualAmountReceived: '0',
        actualSlippage: 0,
        actualFee: '0'
      };

      mockPlugService.executeSwap.mockResolvedValue(mockErrorResponse);
      mockPlugService.isConnected.mockReturnValue(true);

      render(<SwapAssetsSection {...mockSwapProps} />);

      const selectButton = screen.getByRole('button', { name: /swap|select|execute/i });
      await user.click(selectButton);

      await waitFor(() => {
        // Look for error toast/notification
        expect(screen.getByText(/error|failed|timeout/i)).toBeInTheDocument();

        // Should include error message in toast
        expect(screen.getByText(/network timeout/i)).toBeInTheDocument();
      });
    });

    it('should show fallback toast on network error', async () => {
      mockPlugService.executeSwap.mockRejectedValue(new Error('Connection failed'));
      mockPlugService.isConnected.mockReturnValue(true);

      render(<SwapAssetsSection {...mockSwapProps} />);

      const selectButton = screen.getByRole('button', { name: /swap|select|execute/i });
      await user.click(selectButton);

      await waitFor(() => {
        // Look for fallback error toast
        expect(screen.getByText(/connection failed|network error|try again/i)).toBeInTheDocument();
      });
    });

    it('should auto-dismiss success toasts after delay', async () => {
      const mockResponse: SwapResponse = {
        success: true,
        transactionId: 'tx_auto_dismiss',
        actualAmountReceived: '150000',
        actualSlippage: 0.3,
        actualFee: '2000000'
      };

      mockPlugService.executeSwap.mockResolvedValue(mockResponse);
      mockPlugService.isConnected.mockReturnValue(true);

      render(<SwapAssetsSection {...mockSwapProps} />);

      const selectButton = screen.getByRole('button', { name: /swap|select|execute/i });
      await user.click(selectButton);

      // Should initially show toast
      await waitFor(() => {
        expect(screen.getByText(/success|completed/i)).toBeInTheDocument();
      });

      // Should auto-dismiss after timeout (if implemented)
      await waitFor(() => {
        expect(screen.queryByText(/success|completed/i)).not.toBeInTheDocument();
      }, { timeout: 6000 }); // Give 6 seconds for auto-dismiss
    });
  });

  describe('SIMULATED vs REAL Result Display', () => {
    it('should clearly show SIMULATED results during development', async () => {
      const mockResponse: SwapResponse = {
        success: true,
        transactionId: 'tx_simulated_123',
        actualAmountReceived: '160000',
        actualSlippage: 0.3,
        actualFee: '2000000'
      };

      mockPlugService.executeSwap.mockResolvedValue(mockResponse);
      mockPlugService.isConnected.mockReturnValue(true);

      // Mock development environment
      process.env.NODE_ENV = 'development';

      render(<SwapAssetsSection {...mockSwapProps} />);

      const selectButton = screen.getByRole('button', { name: /swap|select|execute/i });
      await user.click(selectButton);

      await waitFor(() => {
        // Should clearly indicate simulated results
        expect(screen.getByText(/simulated|demo|test|mock/i)).toBeInTheDocument();

        // Should show warning about simulation
        expect(screen.getByText(/not a real transaction|simulation only/i)).toBeInTheDocument();
      });
    });

    it('should show REAL result indicators in production', async () => {
      const mockResponse: SwapResponse = {
        success: true,
        transactionId: 'tx_real_production',
        actualAmountReceived: '158000',
        actualSlippage: 0.3,
        actualFee: '2000000'
      };

      mockPlugService.executeSwap.mockResolvedValue(mockResponse);
      mockPlugService.isConnected.mockReturnValue(true);

      // Mock production environment
      process.env.NODE_ENV = 'production';

      render(<SwapAssetsSection {...mockSwapProps} />);

      const selectButton = screen.getByRole('button', { name: /swap|select|execute/i });
      await user.click(selectButton);

      await waitFor(() => {
        // Should indicate real transaction
        expect(screen.getByText(/confirmed|real|live/i)).toBeInTheDocument();

        // Should NOT show simulation warnings
        expect(screen.queryByText(/simulated|demo|test|mock/i)).not.toBeInTheDocument();
      });
    });

    it('should have different styling for SIMULATED vs REAL results', async () => {
      const mockResponse: SwapResponse = {
        success: true,
        transactionId: 'tx_styling_test',
        actualAmountReceived: '155000',
        actualSlippage: 0.3,
        actualFee: '2000000'
      };

      mockPlugService.executeSwap.mockResolvedValue(mockResponse);
      mockPlugService.isConnected.mockReturnValue(true);

      render(<SwapAssetsSection {...mockSwapProps} />);

      const selectButton = screen.getByRole('button', { name: /swap|select|execute/i });
      await user.click(selectButton);

      await waitFor(() => {
        // Look for different CSS classes or styling indicators
        const resultContainer = screen.getByTestId('swap-result') ||
                               screen.getByText(/tx_styling_test/i).closest('div');

        if (process.env.NODE_ENV === 'development') {
          expect(resultContainer).toHaveClass(/simulated|demo|test/);
        } else {
          expect(resultContainer).toHaveClass(/real|live|confirmed/);
        }
      });
    });
  });

  describe('Loading States and User Feedback', () => {
    it('should show loading state during swap execution', async () => {
      // Mock slow response
      mockPlugService.executeSwap.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            success: true,
            transactionId: 'tx_loading_test',
            actualAmountReceived: '152000',
            actualSlippage: 0.3,
            actualFee: '2000000'
          }), 2000)
        )
      );

      mockPlugService.isConnected.mockReturnValue(true);

      render(<SwapAssetsSection {...mockSwapProps} />);

      const selectButton = screen.getByRole('button', { name: /swap|select|execute/i });
      await user.click(selectButton);

      // Should show loading indicator
      expect(screen.getByText(/loading|executing|processing/i)).toBeInTheDocument();

      // Button should be disabled during execution
      expect(selectButton).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/tx_loading_test/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle transaction preview modal integration', async () => {
      const previewProps = {
        ...mockSwapProps,
        isTransactionPreviewOpen: true
      };

      const mockTransactionData = {
        fromAsset: 'ICP',
        toAsset: 'ckBTC',
        amount: '1.0',
        estimatedReceived: '0.00154',
        slippage: 0.5,
        fees: '0.02 ICP',
        route: 'KongSwap',
        estimatedTime: '15 seconds'
      };

      render(
        <>
          <SwapAssetsSection {...previewProps} />
          <TransactionPreviewModal
            isOpen={true}
            onClose={() => mockSetIsTransactionPreviewOpen(false)}
            transactionData={mockTransactionData}
            onExecute={jest.fn()}
          />
        </>
      );

      // Should show preview modal
      expect(screen.getByText(/transaction preview|confirm swap/i)).toBeInTheDocument();

      // Should show transaction details in modal
      expect(screen.getByText(/1\.0.*ICP/i)).toBeInTheDocument();
      expect(screen.getByText(/0\.00154.*ckBTC/i)).toBeInTheDocument();
      expect(screen.getByText(/KongSwap/i)).toBeInTheDocument();
    });
  });
});