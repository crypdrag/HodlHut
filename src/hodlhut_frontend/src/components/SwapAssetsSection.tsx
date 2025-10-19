import React, { useState, useEffect } from 'react';
import {
  Settings,
  Fuel,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  Zap,
  Scale,
  Waves,
  PartyPopper,
  ArrowRight,
  Star,
  Plus,
  Rocket,
  Wallet
} from 'lucide-react';
import AssetIcon from './AssetIcon';
import CustomDropdown from './CustomDropdown';
import CompactDEXSelector from './CompactDEXSelector';
import WalletSelectionModal from './WalletSelectionModal';
import { AuthStep } from './AuthenticationModal';
import { Portfolio, MASTER_ASSETS, ASSET_PRICES } from '../../assets/master_asset_data';
import { CompleteSwapAnalysis, SmartSolution, DEX_OPTIONS, autoSelectOptimalDEX } from '../../assets/master_swap_logic';
import { type SwapRoute } from '../../assets/visual_brackets';
import { SwapRequest, SwapResponse } from '../types/myhut';

const DEX_OPTIONS_ENHANCED = {
  KongSwap: {
    name: 'KongSwap',
    badge: 'speed',
    stats: {
      'Swap Speed': '5-12 seconds',
      'Trading Fee': '0.3%',
      'Liquidity': 'Medium',
      'Slippage': 'Medium'
    },
    advantages: DEX_OPTIONS.KongSwap.advantages,
    tradeoffs: ['Lower liquidity pools', 'Newer platform']
  },
  ICPSwap: {
    name: 'ICPSwap',
    badge: 'liquidity',
    stats: DEX_OPTIONS.ICPSwap.stats,
    advantages: DEX_OPTIONS.ICPSwap.advantages,
    tradeoffs: ['Slightly slower', 'Higher fees']
  },
  ICDEX: {
    name: 'ICDEX',
    badge: 'orderbook',
    stats: {
      'Order Type': 'Limit/Market',
      'Trading Fee': '0.1-0.2%',
      'Liquidity': 'Deep pools',
      'Slippage': 'Minimal'
    },
    advantages: ['Professional orderbook', 'Large trade support', 'Price discovery', 'Multiple order types'],
    tradeoffs: ['Learning curve', 'Orderbook complexity', 'Market/limit orders required']
  }
};

// Types for Enhanced Smart Solutions
type EnhancedSmartSolution = SmartSolution;

interface SwapAssetsSectionProps {
  portfolio: Portfolio;
  fromAsset: string;
  toAsset: string;
  swapAmount: string;
  selectedDEX: string | null;
  swapAnalysis: CompleteSwapAnalysis | null;
  showRouteDetails: boolean;
  showSmartSolutions: boolean;
  showDEXSelection: boolean;
  showCompactMode: boolean;
  setShowCompactMode: (show: boolean) => void;
  slippageTolerance: number;
  currentGasPrice: number;
  smartSolutions: EnhancedSmartSolution[];
  selectedSolution: number | null;
  showAllSolutions: boolean;
  currentSolutionIndex: number; // Mobile-first: track which single solution to show
  setFromAsset: (asset: string) => void;
  setToAsset: (asset: string) => void;
  setSwapAmount: (amount: string) => void;
  setSelectedDEX: (dex: string | null) => void;
  setSlippageTolerance: (tolerance: number) => void;
  formatAmount: (amount: number) => string;
  setActiveSection: (section: string) => void;
  setTransactionData: (data: CompleteSwapAnalysis) => void;
  setAuthStep: (step: AuthStep) => void;
  setShowAuthModal: (show: boolean) => void;
  handleApproveSolution: (index: number) => void;
  handleRejectSolution: (index: number) => void;
  resetSolutionsView: () => void;
  formatNumber: (num: number) => string;
  onShowTransactionPreview: () => void;
  onDEXSelectedForICPSwap?: (dexId: string) => void;
  executeSwap?: (request: SwapRequest) => Promise<SwapResponse | null>;
  updatePortfolioAfterSwap?: (fromAsset: string, toAsset: string, fromAmount: number, toAmount: number) => void;
  connectedMetaMask: string | null;
  isPlugConnected: boolean;
  isConnectingWallet: boolean;
  onConnectMetaMask: () => void;
  onDisconnectMetaMask: () => void;
  onConnectPlug: () => void;
  onDisconnectPlug: () => void;
  getRequiredWallet: (asset: string) => 'metamask' | 'plug' | null;
  isWalletConnectedForAsset: (asset: string) => boolean;
}

const SwapAssetsSection: React.FC<SwapAssetsSectionProps> = ({
  portfolio,
  fromAsset,
  toAsset,
  swapAmount,
  selectedDEX,
  swapAnalysis,
  showRouteDetails,
  showSmartSolutions,
  showDEXSelection,
  showCompactMode,
  setShowCompactMode,
  slippageTolerance,
  currentGasPrice,
  smartSolutions,
  selectedSolution,
  showAllSolutions,
  currentSolutionIndex,
  setFromAsset,
  setToAsset,
  setSwapAmount,
  setSelectedDEX,
  setSlippageTolerance,
  formatAmount,
  setActiveSection,
  setTransactionData,
  setAuthStep,
  setShowAuthModal,
  handleApproveSolution,
  handleRejectSolution,
  resetSolutionsView,
  formatNumber,
  onShowTransactionPreview,
  onDEXSelectedForICPSwap,
  executeSwap,
  updatePortfolioAfterSwap,
  connectedMetaMask,
  isPlugConnected,
  isConnectingWallet,
  onConnectMetaMask,
  onDisconnectMetaMask,
  onConnectPlug,
  onDisconnectPlug,
  getRequiredWallet,
  isWalletConnectedForAsset
}) => {
  // State for execution confirmation and progressive Smart Solutions
  const [showExecutionConfirm, setShowExecutionConfirm] = useState<number | null>(null);
  const [smartSolutionsStep, setSmartSolutionsStep] = useState<number>(1);
  const [rejectedOptions, setRejectedOptions] = useState<Set<string>>(new Set());
  const [showSolutionsLayer, setShowSolutionsLayer] = useState<'primary' | 'alternatives'>('primary');

  // Wallet selection modal state (deprecated - using inline expansion now)
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletModalType, setWalletModalType] = useState<'ethereum' | 'icp' | 'bitcoin'>('ethereum');

  // Inline wallet expansion state
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  // Bitcoin wallet state (destination address)
  const [showBTCWalletOptions, setShowBTCWalletOptions] = useState(false);
  const [connectedBTCWallet, setConnectedBTCWallet] = useState<string | null>(null);
  const [btcAddress, setBtcAddress] = useState<string>('');

  // DEX cycling ref - will be set by CompactDEXSelector
  const dexCycleRef = React.useRef<(() => void) | null>(null);
  const handleCycleDEX = () => {
    if (dexCycleRef.current) {
      dexCycleRef.current();
    }
  };

  // Auto-enable compact mode when BTC wallet is connected and DEX selection is ready
  useEffect(() => {
    const isFromWalletConnected = isWalletConnectedForAsset(fromAsset);
    const isBTCWalletConnected = !!connectedBTCWallet;
    const isReadyForDEX = showDEXSelection && fromAsset && toAsset && swapAmount && parseFloat(swapAmount) > 0;

    // Only trigger compact mode when BOTH wallets are connected
    if (isFromWalletConnected && isBTCWalletConnected && isReadyForDEX) {
      setShowCompactMode(true);
    }
  }, [showDEXSelection, fromAsset, toAsset, swapAmount, connectedBTCWallet, isWalletConnectedForAsset, setShowCompactMode]);

  // Execute the actual swap using backend MyHut canister
  const handleExecuteSwap = async () => {
    console.log('🚀 handleExecuteSwap called!', {
      executeSwap: !!executeSwap,
      fromAsset,
      toAsset,
      swapAmount,
      selectedDEX
    });

    if (!executeSwap || !fromAsset || !toAsset || !swapAmount || !selectedDEX) {
      console.warn('Missing required data for swap execution:', {
        executeSwap: !!executeSwap,
        fromAsset,
        toAsset,
        swapAmount,
        selectedDEX
      });
      return;
    }

    try {
      // Map frontend DEX selection to backend-compatible format
      const getIntermediateAsset = (mainnetAsset: string): string => {
        const mapping: Record<string, string> = {
          'BTC': 'ckBTC',
          'ETH': 'ckETH',
          'USDC': 'ckUSDC',
          'USDT': 'ckUSDT'
        };
        return mapping[mainnetAsset] || mainnetAsset;
      };

      // For cross-chain swaps, backend needs the intermediate ckAsset
      const backendToAsset = ['BTC', 'ETH', 'USDC', 'USDT'].includes(toAsset)
        ? getIntermediateAsset(toAsset)
        : toAsset;

      const swapRequest: SwapRequest = {
        fromAsset: fromAsset as any,
        toAsset: backendToAsset as any,
        amount: swapAmount,
        slippage: slippageTolerance,
        dexPreference: selectedDEX,
        urgency: 'medium'
      };

      console.log('🔄 Executing swap with request:', swapRequest);

      // Check if we're in demo mode (Internet Identity disabled)
      const isDemoMode = !(window as any).ic || process.env.NODE_ENV === 'development';

      if (isDemoMode) {
        console.log('🎮 Demo mode: Simulating successful swap execution');

        // Simulate successful swap for demo mode
        const simulatedResponse = {
          success: true,
          transactionId: `demo_${Date.now()}`,
          outputAmount: swapAnalysis?.outputAmount || (parseFloat(swapAmount) * 0.95)
        };

        console.log('✅ Demo swap executed successfully:', simulatedResponse);

        // Update portfolio balances after successful demo swap
        if (updatePortfolioAfterSwap && swapAnalysis) {
          const fromAmount = parseFloat(swapAmount);
          const toAmount = swapAnalysis.outputAmount || (fromAmount * 0.95);

          console.log('📊 Demo portfolio update:', {
            fromAsset,
            toAsset,
            fromAmount,
            toAmount
          });

          updatePortfolioAfterSwap(fromAsset, toAsset, fromAmount, toAmount);
          console.log('✅ Demo portfolio updated successfully');
        }

        // Continue with transaction preview/progress
        onShowTransactionPreview();
        return;
      }

      // Real swap execution for production
      const response = await executeSwap(swapRequest);

      if (response?.success) {
        console.log('✅ Swap executed successfully:', response);

        // Update portfolio balances after successful swap
        if (updatePortfolioAfterSwap && swapAnalysis) {
          const fromAmount = parseFloat(swapAmount);
          const toAmount = swapAnalysis.outputAmount || (fromAmount * 0.95); // Use analysis output or fallback

          updatePortfolioAfterSwap(fromAsset, toAsset, fromAmount, toAmount);
        }

        // Continue with transaction preview/progress
        onShowTransactionPreview();
      } else {
        console.error('❌ Swap failed:', response?.errorMessage);
        // Handle error - could show toast or error modal
      }
    } catch (error) {
      console.error('❌ Swap execution error:', error);
      // Handle error - could show toast or error modal
    }
  };

  // Helper functions moved from Dashboard
  const getSwapFromAssetOptions = () => {
    // Bitcoin-only onramp: Show ALL assets (no portfolio filter)
    // Users connect wallet to see their balances
    const fromAssets = ['ETH', 'USDC', 'USDT', 'ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'];

    return fromAssets.map(asset => ({
      value: asset,
      label: asset
    }));
  };

  // Generate "You'll receive" message for swap interface
  const getSwapReceiveMessage = () => {
    // Show dynamic "You'll receive" message based on swap analysis
    if (fromAsset && toAsset && swapAmount && swapAnalysis?.outputAmount) {
      return `You'll receive: ${toAsset} ${formatAmount(swapAnalysis.outputAmount)}`;
    }
    return "You'll receive:";
  };

  // Render contextual footer message for smart solutions
  const renderSmartSolutionsFooter = () => {
    if (selectedSolution !== null && !showAllSolutions) {
      return (
        <div className="mt-4 p-3 bg-success-600/10 border border-success-500/20 rounded-lg">
          <div className="text-sm text-success-400 flex items-center gap-2">
            <PartyPopper size={16} />
            <span><strong>Perfect!</strong> You've chosen your fee payment method. Click "Execute & Continue Swap" above to proceed.</span>
          </div>
        </div>
      );
    }

    const hasRecommended = smartSolutions.some(s => s.badge === 'RECOMMENDED');
    const hasRequiredSteps = smartSolutions.some(s => s.badge === 'REQUIRED STEP');
    const hasAlternatives = smartSolutions.some(s => s.badge === 'ALTERNATIVE');

    if (!showAllSolutions && smartSolutions.length > 0) {
      // Showing only first solution
      const firstSolution = smartSolutions[0];
      if (firstSolution.badge === 'RECOMMENDED') {
        return (
          <div className="mt-4 p-3 bg-primary-600/10 border border-primary-500/20 rounded-lg">
            <div className="text-sm text-primary-400">
              ✅ <strong>Best Option Found!</strong> This is the easiest way to handle your fee payment. Approve it or see alternatives.
            </div>
          </div>
        );
      }
    }

    if (hasRecommended) {
      // Bitcoin-only message
      return (
        <div className="mt-4 p-3 bg-primary-600/10 border border-primary-500/20 rounded-lg">
          <div className="text-sm text-primary-400">
            Sending Bitcoin to mainnet requires ckBTC for gas fees. We found easy solutions to help you.
          </div>
        </div>
      );
    } else if (hasRequiredSteps) {
      return (
        <div className="mt-4 p-3 bg-primary-600/10 border border-primary-500/20 rounded-lg">
          <div className="text-sm text-primary-300 flex items-center gap-2">
            <Lightbulb size={16} />
            <span><strong>Smart Solutions Available:</strong> HodlHut can handle the required gas fees automatically.</span>
          </div>
        </div>
      );
    } else if (hasAlternatives) {
      return (
        <div className="mt-4 p-3 bg-warning-600/10 border border-warning-500/20 rounded-lg">
          <div className="text-sm text-warning-400 flex items-center gap-2">
            <Lightbulb size={16} />
            <span><strong>Alternative Options:</strong> Here are different ways to handle fee payments based on your portfolio.</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Handle wallet selection from modal
  const handleWalletSelection = async (walletId: string) => {
    if (walletId === 'metamask') {
      await onConnectMetaMask();
    } else if (walletId === 'plug') {
      await onConnectPlug();
    } else if (walletId === 'uniswap' || walletId === 'trust') {
      // TODO: Implement Uniswap Wallet and Trust Wallet connections
      console.log(`${walletId} connection not yet implemented`);
    }
  };

  // Render INLINE wallet connection UI with expansion
  const renderWalletConnectionUI = () => {
    if (!fromAsset) {
      return null;
    }

    const requiredWallet = getRequiredWallet(fromAsset);
    const isConnected = isWalletConnectedForAsset(fromAsset);

    // No wallet required (shouldn't happen in Bitcoin-only onramp)
    if (!requiredWallet) {
      return (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-text-muted">
            Balance: {fromAsset && portfolio[fromAsset] ? formatAmount(portfolio[fromAsset]) : '--'}
          </span>
        </div>
      );
    }

    // Wallet connected - show balance and disconnect option
    if (isConnected) {
      const balance = portfolio[fromAsset] || 0;
      const walletAddress = requiredWallet === 'metamask' ? connectedMetaMask : null;
      const disconnectHandler = requiredWallet === 'metamask' ? onDisconnectMetaMask : onDisconnectPlug;

      return (
        <div className="success-state-mobile">
          <div className="flex-1 text-left">
            <div className="body-sm font-semibold text-success-400 flex items-center gap-2">
              <CheckCircle size={16} />
              Wallet Connected
            </div>
            <div className="caption text-text-muted mt-1">
              Balance: {formatAmount(balance)} {fromAsset}
            </div>
            {walletAddress && (
              <div className="caption text-text-secondary code">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </div>
            )}
          </div>
          <button
            onClick={disconnectHandler}
            className="btn-secondary btn-sm"
          >
            Disconnect
          </button>
        </div>
      );
    }

    // Wallet not connected - show connect button with inline expansion
    // Determine button text and styling based on asset type
    const getWalletButtonConfig = () => {
      // ICP assets (ICP, ckETH, ckUSDC, ckUSDT, ckBTC, etc.)
      if (requiredWallet === 'plug') {
        return {
          text: 'Connect ICP Wallet',
          icon: null, // No icon for ICP
          buttonClass: 'w-full btn-primary btn-text'
        };
      }
      // Ethereum assets (ETH, USDC, USDT)
      else if (requiredWallet === 'metamask') {
        return {
          text: 'Connect ETH Wallet',
          icon: null, // No icon for ETH
          buttonClass: 'w-full btn-primary btn-text'
        };
      }
      // Bitcoin (for future BTC direct deposits)
      else if (requiredWallet === 'unisat' || requiredWallet === 'xverse') {
        return {
          text: 'Connect BTC Wallet',
          icon: <AssetIcon asset="BTC" size={16} />,
          buttonClass: 'w-full btn-bitcoin btn-text'
        };
      }
      // Fallback
      return {
        text: 'Connect Wallet',
        icon: <Wallet size={16} />,
        buttonClass: 'w-full btn-primary btn-text'
      };
    };

    const walletConfig = getWalletButtonConfig();

    return (
      <div>
        {!showWalletOptions ? (
          <button
            onClick={() => setShowWalletOptions(true)}
            disabled={isConnectingWallet}
            className={walletConfig.buttonClass}
          >
            {walletConfig.icon}
            {isConnectingWallet ? 'Connecting...' : walletConfig.text}
          </button>
        ) : (
          <div className="modal-section">
            <div className="caption text-text-secondary mb-3 flex items-center justify-between">
              <span>Select Wallet</span>
              <button
                onClick={() => setShowWalletOptions(false)}
                className="caption text-text-muted hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Wallet options based on asset */}
            <div className="space-y-2">
              {requiredWallet === 'metamask' && (
                <button
                  onClick={async () => {
                    await onConnectMetaMask();
                    setShowWalletOptions(false);
                  }}
                  className="wallet-option"
                >
                  <span className="text-lg">🦊</span>
                  <span className="body-sm font-semibold text-text-primary">MetaMask</span>
                </button>
              )}

              {requiredWallet === 'plug' && (
                <button
                  onClick={async () => {
                    await onConnectPlug();
                    setShowWalletOptions(false);
                  }}
                  className="wallet-option"
                >
                  <span className="text-lg">🔌</span>
                  <span className="body-sm font-semibold text-text-primary">Plug Wallet</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Simple Route Visualization - Mobile-First Responsive
  const SimpleRouteDisplay: React.FC<{ route: SwapRoute }> = ({ route }) => {
    return (
      <div className="flex items-center justify-center gap-0 sm:gap-2 md:gap-3 mb-3 overflow-x-auto px-1 py-1">
        {route.steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="token-display-container flex-shrink-0">
              <div className="token-display-content">
                <AssetIcon asset={step} size={12} className="flex-shrink-0 sm:w-4 sm:h-4" />
                <span className="token-display-text">{step}</span>
              </div>
            </div>
            {index < route.steps.length - 1 && (
              <ArrowRight className="text-primary-500 flex-shrink-0 w-3 h-3 sm:w-4 sm:h-4 mx-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Rendering functions
  const renderSlippageSettings = () => {
    return (
      <div className="w-full max-w-lg mt-6 mx-auto rounded-xl bg-surface-2 p-6">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold text-text-primary">
            <Settings size={16} />
            Slippage Tolerance
          </span>
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 rounded text-sm font-medium transition-colors duration-200 ${
                slippageTolerance === 0.5
                  ? 'bg-primary-600 text-on-primary'
                  : 'bg-surface-3 text-text-secondary hover:bg-surface-1'
              }`}
              onClick={() => setSlippageTolerance(0.5)}
            >
              0.5%
            </button>
            <button
              className={`px-3 py-1 rounded text-sm font-medium transition-colors duration-200 ${
                slippageTolerance === 1.0
                  ? 'bg-primary-600 text-on-primary'
                  : 'bg-surface-3 text-text-secondary hover:bg-surface-1'
              }`}
              onClick={() => setSlippageTolerance(1.0)}
            >
              1.0%
            </button>
            <button
              className={`px-3 py-1 rounded text-sm font-medium transition-colors duration-200 ${
                slippageTolerance === 3.0
                  ? 'bg-primary-600 text-on-primary'
                  : 'bg-surface-3 text-text-secondary hover:bg-surface-1'
              }`}
              onClick={() => setSlippageTolerance(3.0)}
            >
              3.0%
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderGasOptimization = () => {
    // Only show for Bitcoin withdrawals
    if (!swapAnalysis || !swapAnalysis.isL1Withdrawal || swapAnalysis.destinationChain !== 'Bitcoin') {
      return null;
    }

    // Bitcoin fee logic (sats/vB)
    const btcFeeRate = Math.floor(Math.random() * 20) + 10; // 10-30 sats/vB simulation
    const currentFeeDisplay = `Current: ${btcFeeRate} sats/vB`;

    let recommendation = '';
    let colorClass = '';

    if (btcFeeRate < 15) {
      recommendation = 'Bitcoin fees are low. Good time to transact!';
      colorClass = 'text-success-400';
    } else if (btcFeeRate < 25) {
      recommendation = 'Bitcoin fees are average';
      colorClass = 'text-warning-400';
    } else {
      recommendation = 'Bitcoin fees are high';
      colorClass = 'text-error-400';
    }

    return (
      <div className="w-full max-w-lg mt-6 mx-auto rounded-xl bg-surface-2 p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-2 font-semibold text-text-primary">
            <Fuel size={16} />
            Bitcoin Fee Optimization
          </span>
          <span className="text-xs sm:text-sm font-medium text-text-secondary">{currentFeeDisplay}</span>
        </div>
        <div className={`caption ${colorClass}`}>
          {recommendation}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center px-4 py-2 sm:py-4">
      {!showCompactMode && (
        <div className="text-center mb-2 sm:mb-4">
          <div className="text-lg sm:text-xl font-bold text-text-primary mb-1">Get Bitcoin for Staking</div>
          <p className="text-xs sm:text-sm text-text-secondary hidden sm:block">Convert your crypto to Bitcoin and earn Babylon rewards.</p>
        </div>
      )}

      {/* Main Swap Interface - Only show when not in compact mode */}
      {!showCompactMode && (
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-surface-1 p-2 sm:p-3 md:p-4 space-y-3">
        {/* From Asset */}
        <div className="bg-surface-2 border border-white/10 rounded-xl p-3 sm:p-4 md:p-6">
          <div className="mb-2">
            <label className="text-xs sm:text-sm font-medium text-text-secondary">From</label>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
            <input
              type="number"
              value={swapAmount}
              onChange={(e) => setSwapAmount(e.target.value)}
              placeholder="0.0"
              className="flex-1 text-base sm:text-lg md:text-xl font-semibold text-text-primary bg-transparent border-none outline-none w-0 min-w-0"
              step="any"
              min="0"
            />
            <CustomDropdown
              className="asset-dropdown min-w-[100px] sm:min-w-[120px] md:min-w-[140px]"
              value={fromAsset}
              onChange={(value) => {
                setFromAsset(value);
                setSwapAmount('');
              }}
              placeholder=""
              portfolio={portfolio}
              options={getSwapFromAssetOptions()}
            />
          </div>

          {renderWalletConnectionUI()}
        </div>

        {/* To Asset - Bitcoin Only (BTC Onramp) */}
        <div className="bg-surface-2 border border-white/10 rounded-xl p-3 sm:p-4 md:p-6">
          <div className="mb-2">
            <label className="text-xs sm:text-sm font-medium text-text-secondary">Get Bitcoin</label>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
            <div className="flex-1 text-base sm:text-lg md:text-xl font-semibold text-text-primary min-w-0">
              {swapAnalysis?.outputAmount ? formatAmount(swapAnalysis.outputAmount) : '0.0'}
            </div>
            <div className="px-4 py-2 bg-surface-3/50 border border-white/10 rounded-lg min-w-[100px] sm:min-w-[120px] md:min-w-[140px]">
              <div className="flex items-center gap-2 justify-center">
                <span className="text-sm font-semibold text-text-primary">Bitcoin</span>
              </div>
            </div>
          </div>

          {swapAnalysis?.outputAmount && swapAmount && (
            <div className="text-center mb-2 sm:mb-3">
              <span className="text-xs sm:text-sm text-text-muted">
                Rate: 1 {fromAsset} ≈ {(swapAnalysis.outputAmount / parseFloat(swapAmount)).toFixed(4)} BTC
              </span>
            </div>
          )}

          {/* BTC Wallet Connection - Only show when FROM wallet is connected AND amount is entered */}
          {swapAnalysis && parseFloat(swapAmount || '0') > 0 && isWalletConnectedForAsset(fromAsset) && (
            <>
              {!connectedBTCWallet ? (
                // BTC Wallet Connection UI
                <>
                  {!showBTCWalletOptions ? (
                    <button
                      onClick={() => setShowBTCWalletOptions(true)}
                      className="w-full btn-bitcoin btn-text"
                    >
                      <AssetIcon asset="BTC" size={16} />
                      Connect BTC Wallet
                    </button>
                  ) : (
                    <div className="modal-section">
                      <div className="caption text-text-secondary mb-3 flex items-center justify-between">
                        <span>Select Bitcoin Wallet</span>
                        <button
                          onClick={() => setShowBTCWalletOptions(false)}
                          className="caption text-text-muted hover:text-text-primary transition-colors"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="space-y-2">
                        {/* Unisat Wallet */}
                        <button
                          onClick={async () => {
                            try {
                              // TODO: Implement actual Unisat wallet connection
                              console.log('Connecting to Unisat wallet...');
                              // Placeholder: simulate connection
                              const mockAddress = 'tb1q...demo...unisat';
                              setConnectedBTCWallet('unisat');
                              setBtcAddress(mockAddress);
                              setShowBTCWalletOptions(false);
                            } catch (error) {
                              console.error('Failed to connect Unisat:', error);
                            }
                          }}
                          className="wallet-option"
                        >
                          <span className="text-lg">🔶</span>
                          <span className="body-sm font-semibold text-text-primary">Unisat Wallet</span>
                        </button>

                        {/* Xverse Wallet */}
                        <button
                          onClick={async () => {
                            try {
                              // TODO: Implement actual Xverse wallet connection
                              console.log('Connecting to Xverse wallet...');
                              // Placeholder: simulate connection
                              const mockAddress = 'tb1q...demo...xverse';
                              setConnectedBTCWallet('xverse');
                              setBtcAddress(mockAddress);
                              setShowBTCWalletOptions(false);
                            } catch (error) {
                              console.error('Failed to connect Xverse:', error);
                            }
                          }}
                          className="wallet-option"
                        >
                          <span className="text-lg">⚡</span>
                          <span className="body-sm font-semibold text-text-primary">Xverse Wallet</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // BTC Wallet Connected State
                <div className="success-state-mobile">
                  <div className="flex-1 text-left">
                    <div className="body-sm font-semibold text-success-400 flex items-center gap-2">
                      <CheckCircle size={16} />
                      {connectedBTCWallet === 'unisat' ? 'Unisat' : 'Xverse'} Connected
                    </div>
                    <div className="caption text-text-secondary code mt-1 truncate">
                      {btcAddress}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setConnectedBTCWallet(null);
                      setBtcAddress('');
                    }}
                    className="btn-secondary btn-sm"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* INLINE FEE PREVIEW - Shows upfront (before wallet connection) */}
        {swapAnalysis && parseFloat(swapAmount || '0') > 0 && (
          <div className="info-important">
            <div className="space-y-2">
              {/* Bitcoin Gas Fee */}
              {(() => {
                const bitcoinGasFee = swapAnalysis.feeRequirements.find(
                  fee => fee.purpose === 'gas' || fee.purpose === 'network'
                );
                if (bitcoinGasFee) {
                  return (
                    <div className="fee-item-mobile">
                      <span className="text-text-secondary flex items-center gap-1.5">
                        <Fuel size={14} />
                        BTC Gas Fee
                      </span>
                      <span className="font-semibold text-text-primary">
                        {formatNumber(bitcoinGasFee.amount)} {bitcoinGasFee.token}
                        <span className="text-text-muted text-xs ml-1">(${bitcoinGasFee.usdValue.toFixed(2)})</span>
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* HODL Protocol Fee */}
              <div className="fee-item-mobile">
                <span className="text-text-secondary">HODL Fee (0.1%)</span>
                <span className="font-semibold text-text-primary">
                  {formatNumber(parseFloat(swapAmount) * 0.001)} {fromAsset}
                </span>
              </div>

              {/* Auto-selected DEX (if route requires DEX) */}
              {swapAnalysis.route.operationType !== 'Minter Operation' && (
                <div className="fee-item-mobile">
                  <span className="text-text-secondary">DEX</span>
                  <span className="chip-info text-xs">
                    {selectedDEX || 'KongSwap'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* EXECUTE SWAP BUTTON - Only show if both wallets are connected */}
        {swapAnalysis && parseFloat(swapAmount || '0') > 0 && connectedBTCWallet && isWalletConnectedForAsset(fromAsset) && (
          <button
            className="w-full btn-bitcoin btn-text"
            onClick={() => {
              // Auto-select DEX if not already selected
              if (!selectedDEX && swapAnalysis.route.operationType !== 'Minter Operation') {
                const autoDEX = autoSelectOptimalDEX(fromAsset, toAsset, parseFloat(swapAmount));
                setSelectedDEX(autoDEX);
              }

              // Skip Transaction Preview modal - go straight to execution
              setTransactionData(swapAnalysis);
              onShowTransactionPreview();
            }}
          >
            <Rocket size={16} />
            Execute Swap to BTC
          </button>
        )}
      </div>
      )}

      {/* Compact Mode: DEX Selector replaces swap interface after wallet connection */}
      {showCompactMode && showDEXSelection && swapAnalysis && (
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-surface-1 p-4 sm:p-6">
          {/* Header with DEX Options button */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-bold text-text-primary">Recommended DEX</h2>
            <button
              onClick={handleCycleDEX}
              className="px-3 py-1.5 text-xs sm:text-sm bg-surface-3 hover:bg-surface-2 text-text-secondary rounded-lg transition-colors"
            >
              DEX Options
            </button>
          </div>

          <CompactDEXSelector
            selectedDEX={selectedDEX}
            setSelectedDEX={(dexId: string | null) => {
              setSelectedDEX(dexId);
              if (dexId && swapAnalysis && parseFloat(swapAmount || '0') > 0) {
                onDEXSelectedForICPSwap?.(dexId);
              }
            }}
            dexData={DEX_OPTIONS_ENHANCED}
            fromAsset={fromAsset}
            toAsset={toAsset}
            swapAmount={swapAmount}
            swapValueUSD={parseFloat(swapAmount || '0') * (ASSET_PRICES[fromAsset] || 0)}
            slippageTolerance={slippageTolerance}
            onShowTransactionPreview={onShowTransactionPreview}
            swapAnalysis={swapAnalysis}
            onDEXSelectedForICPSwap={onDEXSelectedForICPSwap}
            onCycleDEX={(cycleFunc) => {
              dexCycleRef.current = cycleFunc;
            }}
          />
        </div>
      )}

      {/* OLD Balance Preview and Execute Button REMOVED - replaced with inline fee preview below */}

      {/* STEP 2/3: DEX Selection OR Smart Solutions (Mobile-First Single Container) */}
      {/* DISABLED - This old vertical DEX selector is replaced by compact mode triggered after BTC wallet connection */}
      {false && !showCompactMode && (showDEXSelection || showSmartSolutions) && swapAnalysis && fromAsset !== toAsset && (
        <div className="w-full max-w-lg mt-6 rounded-2xl border border-white/10 bg-surface-1 p-6">
          {/* DEX Selection Content - Only show if Smart Solutions are NOT showing */}
          {showDEXSelection && !showSmartSolutions && (
            <>
              <div className="flex justify-center mb-8">
                <span className="heading-4 text-text-primary">
                  {swapAnalysis.route.operationType === 'DEX + Minter'
                    ? 'First choose your DEX'
                    : 'Choose your DEX'}
                </span>
              </div>

              {/* Backend: KongSwap onclick calls KongSwap API, ICPSwap onclick calls ICPSwap API */}
          <CompactDEXSelector
            selectedDEX={selectedDEX}
            setSelectedDEX={(dexId: string | null) => {
              setSelectedDEX(dexId);

              // Call the parent DEX selection handler to properly handle Smart Solutions
              if (dexId && swapAnalysis && parseFloat(swapAmount || '0') > 0) {
                onDEXSelectedForICPSwap(dexId);
              }
            }}
            dexData={DEX_OPTIONS_ENHANCED}
            fromAsset={fromAsset}
            toAsset={toAsset}
            swapAmount={swapAmount}
            swapValueUSD={parseFloat(swapAmount || '0') * (ASSET_PRICES[fromAsset] || 0)}
            slippageTolerance={slippageTolerance}
            onShowTransactionPreview={onShowTransactionPreview}
            swapAnalysis={swapAnalysis}
            onDEXSelectedForICPSwap={onDEXSelectedForICPSwap}
          />

            </>
          )}

          {/* Smart Solutions Content */}
          {showSmartSolutions && smartSolutions.length > 0 && (
            <>
              <div className="flex justify-center items-center gap-3 mb-6">
                <Lightbulb size={20} className="text-primary-500" />
                <span className="text-lg font-semibold text-text-primary">Smart Solutions</span>
              </div>

          <div className="space-y-4">
            {/* Mobile-first: Show only current solution, not all solutions */}
            {!showAllSolutions && smartSolutions[currentSolutionIndex] && (() => {
              const solution = smartSolutions[currentSolutionIndex];
              const index = currentSolutionIndex;
              return (
                <div key={index} className="bg-surface-2 rounded-xl p-6 border border-white/20">
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 badge-text mb-3 ${
                    solution.badge === 'RECOMMENDED' ? 'bg-success-400/15 text-success-300' :
                    solution.badge === 'REQUIRED STEP' ? 'bg-warning-400/15 text-warning-300' :
                    'bg-primary-600/15 text-primary-400'
                  }`}>
                    {solution.badge === 'RECOMMENDED' ? <><CheckCircle size={16} className="inline mr-1" />RECOMMENDED</> :
                     solution.badge === 'REQUIRED STEP' ? <><AlertTriangle size={16} className="inline mr-1" />REQUIRED STEP</> :
                     solution.badge === 'ALTERNATIVE' ? <><Lightbulb size={16} className="inline mr-1" />ALTERNATIVE</> :
                     <><Lightbulb size={16} className="inline mr-1" />{solution.badge}</>}
                  </div>

                  <h3 className="text-lg font-semibold text-text-primary mb-3">{solution.title}</h3>
                  <p className="text-xs sm:text-sm text-text-secondary mb-4 leading-snug sm:leading-relaxed">{solution.description}</p>

                  <div className="bg-surface-3 rounded-lg p-3 mb-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-text-secondary">Cost:</span>
                      <span className="text-sm font-semibold text-error-400">
                        {formatNumber(parseFloat(solution.cost.amount))} {solution.cost.asset}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-text-secondary">You'll receive:</span>
                      <span className="text-sm font-semibold text-success-400">
                        {formatNumber(solution.userReceives.amount)} {solution.userReceives.asset}
                      </span>
                    </div>
                  </div>

                  {/* Mobile UX: Show progress indicator */}
                  {smartSolutions.length > 1 && (
                    <div className="text-xs text-text-secondary text-center mb-3">
                      Option {currentSolutionIndex + 1} of {smartSolutions.length}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      className="flex-1 bg-error-600 hover:bg-error-700 text-white rounded-xl py-3 px-4 font-semibold text-sm transition-colors"
                      onClick={() => handleRejectSolution(index)}
                    >
                      No
                    </button>
                    <button
                      className="flex-1 bg-success-600 hover:bg-success-700 text-white rounded-xl py-3 px-4 font-semibold text-sm transition-colors"
                      onClick={() => handleApproveSolution(index)}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Fallback: Desktop mode with all solutions */}
            {showAllSolutions && smartSolutions.map((solution, index) => (
              <div key={index} className="bg-surface-2 rounded-xl p-6 border border-white/20">
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 badge-text mb-3 ${
                  solution.badge === 'RECOMMENDED' ? 'bg-success-400/15 text-success-300' :
                  solution.badge === 'REQUIRED STEP' ? 'bg-warning-400/15 text-warning-300' :
                  'bg-primary-600/15 text-primary-400'
                }`}>
                  {solution.badge === 'RECOMMENDED' ? <><CheckCircle size={16} className="inline mr-1" />RECOMMENDED</> :
                   solution.badge === 'REQUIRED STEP' ? <><AlertTriangle size={16} className="inline mr-1" />REQUIRED STEP</> :
                   solution.badge === 'ALTERNATIVE' ? <><Lightbulb size={16} className="inline mr-1" />ALTERNATIVE</> :
                   <><Lightbulb size={16} className="inline mr-1" />{solution.badge}</>}
                </div>

                <h3 className="text-lg font-semibold text-text-primary mb-3">{solution.title}</h3>
                <p className="text-xs sm:text-sm text-text-secondary mb-4 leading-snug sm:leading-relaxed">{solution.description}</p>

                <div className="bg-surface-3 rounded-lg p-3 mb-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-text-secondary">Cost:</span>
                    <span className="text-sm font-semibold text-error-400">
                      {formatNumber(parseFloat(solution.cost.amount))} {solution.cost.asset}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-text-secondary">You'll receive:</span>
                    <span className="text-sm font-semibold text-success-400">
                      {formatNumber(solution.userReceives.amount)} {solution.userReceives.asset}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    className="flex-1 bg-error-600 hover:bg-error-700 text-white rounded-xl py-3 px-4 font-semibold text-sm transition-colors"
                    onClick={() => handleRejectSolution(index)}
                  >
                    No
                  </button>
                  <button
                    className="flex-1 bg-success-600 hover:bg-success-700 text-white rounded-xl py-3 px-4 font-semibold text-sm transition-colors"
                    onClick={() => handleApproveSolution(index)}
                  >
                    Yes
                  </button>
                </div>
              </div>
            ))}
          </div>
            </>
          )}
        </div>
      )}

      {/* What's Happening modal REMOVED - ExecutionProgressModal shows route in real-time */}

      {/* OLD Smart Solutions - Keep as backup for now */}
      {false /* DISABLED - Old Complex Smart Solutions UI */ && showSmartSolutions && smartSolutions.length > 0 && (
        <div className="w-full max-w-lg mt-6 rounded-2xl border border-white/10 bg-surface-1 p-6">
          <div className="flex justify-center items-center gap-3 mb-6">
            <Lightbulb size={20} className="text-primary-500" />
            <span className="text-lg font-semibold text-text-primary">Smart Solutions</span>
            {(selectedSolution !== null || showSolutionsLayer === 'alternatives') && (
              <button
                onClick={() => {
                  resetSolutionsView();
                  setShowSolutionsLayer('primary');
                }}
                className="ml-auto text-sm px-3 py-1 rounded-lg bg-surface-3 text-text-secondary hover:bg-surface-2 transition-colors"
              >
                ↶ Back
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Layered Display Logic */}
            {(() => {
              // When a solution is selected, show only that solution
              if (selectedSolution !== null) {
                return [smartSolutions[selectedSolution]];
              }

              // Primary layer: show only the first (recommended) solution
              if (showSolutionsLayer === 'primary') {
                return [smartSolutions[0]];
              }

              // Alternatives layer: show remaining solutions
              return smartSolutions.slice(1);
            })().map((solution, displayIndex) => {
              // Calculate actual index based on current layer
              const actualIndex = selectedSolution !== null ? selectedSolution :
                                  (showSolutionsLayer === 'primary' ? 0 : displayIndex + 1);
              const isSelected = selectedSolution === actualIndex;
              const isFirstSolution = actualIndex === 0;

              return (
                <div key={actualIndex} className={`bg-surface-2 rounded-xl p-6 border transition-all duration-300 ${isSelected ? 'border-primary-500 bg-primary-600/10' : 'border-white/20 hover:bg-surface-3'}`}>
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 badge-text mb-3 ${
                    solution.badge === 'RECOMMENDED' ? 'bg-success-400/15 text-success-300' :
                    solution.badge === 'REQUIRED STEP' ? 'bg-warning-400/15 text-warning-300' :
                    'bg-primary-600/15 text-primary-400'
                  }`}>
                    {solution.badge === 'RECOMMENDED' ? <><CheckCircle size={16} className="inline mr-1" />RECOMMENDED</> :
                     solution.badge === 'REQUIRED STEP' ? <><AlertTriangle size={16} className="inline mr-1" />REQUIRED STEP</> :
                     solution.badge === 'ALTERNATIVE' ? <><Lightbulb size={16} className="inline mr-1" />ALTERNATIVE</> :
                     <><Lightbulb size={16} className="inline mr-1" />{solution.badge}</>}
                  </div>

                  {/* Simplified Smart Solutions Display */}
                  <div className="space-y-3 mb-4">
                    {(() => {
                      // Determine balance token based on destination
                      // Always show the actual source asset balance (what user is paying FROM)
                      const sourceAsset = solution.cost.asset; // This is the asset user is paying from
                      const userBalance = portfolio[sourceAsset] || 0;

                      return (
                        <>
                          {/* Problem Statement */}
                          <div className="flex justify-between items-center">
                            <span className="body-sm text-text-secondary">Balance</span>
                            <span className="body-sm font-semibold text-text-primary">{formatNumber(userBalance)} {sourceAsset}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="body-sm text-text-secondary">Gas required</span>
                            <span className="body-sm font-semibold text-text-primary">
                              {(() => {
                                const gasAsset = solution.cost.asset; // Smart Solutions now have correct gas asset

                                // For solutions that use existing balance, show the gas token directly
                                if (solution.id?.includes('use_balance_')) {
                                  return `${solution.cost.amount} ${solution.cost.asset}`;
                                }

                                // For swap solutions, extract the target gas amount from description
                                const description = solution.description || '';
                                const gasMatch = description.match(/for ([\d.]+) (ck\w+|ICP)/);
                                if (gasMatch) {
                                  return `${gasMatch[1]} ${gasMatch[2]}`;
                                }

                                // Fallback to cost amount with correct gas asset
                                return `${solution.cost.amount} ${gasAsset}`;
                              })()}
                            </span>
                          </div>

                          {/* Clear Execution Question - REQUIRED */}
                          <div className="bg-primary-600/10 border border-primary-500/20 rounded-lg p-3 my-3">
                            <div className="text-sm font-semibold text-primary-300 mb-2">
                              {(() => {
                                // Use clean utility function for gas information extraction
                                // Smart Solutions now have correct gas asset and network info
                                const gasAsset = solution.cost.asset;
                                const network = solution.cost.description?.includes('Bitcoin') ? 'Bitcoin' : 'Ethereum';
                                const sourceAsset = solution.cost.asset; // Same as gas asset for use_balance solutions
                                const dexName = 'ICPSwap'; // Default DEX

                                // Generate proper execution question
                                if (solution.type === 'auto_swap') {
                                  // Check if this is a "use balance" solution
                                  if (solution.id?.includes('use_balance_')) {
                                    return `🔄 Use ${sourceAsset} balance for ${network} gas fees?`;
                                  }
                                  // This is a swap solution
                                  else if (sourceAsset && sourceAsset !== gasAsset) {
                                    return `🔄 Get ${gasAsset} for ${network} gas fees from ${sourceAsset} balance? (${dexName})`;
                                  } else {
                                    return `🔄 Use ${gasAsset} balance for ${network} gas fees?`;
                                  }
                                } else {
                                  return `💰 Get ${gasAsset} for ${network} gas fees from ${sourceAsset || 'balance'}?`;
                                }
                              })()}
                            </div>
                            <div className="text-xs text-text-secondary">
                              {solution.type === 'auto_swap'
                                ? `HodlHut will automatically execute this swap during your withdrawal.`
                                : solution.type === 'manual_topup'
                                ? `Navigate to Add Assets section to deposit the required tokens.`
                                : `HodlHut will guide you through this process.`
                              }
                            </div>
                          </div>

                          {/* Portfolio Impact Preview */}
                          <div className="bg-surface-3 rounded-lg p-3 space-y-2">
                            <div className="text-xs font-medium text-text-secondary mb-2">New Portfolio Balances:</div>

                            {/* Show impact on source asset */}
                            {solution.cost.asset && (
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-text-secondary">{solution.cost.asset}:</span>
                                <span className="text-xs font-medium text-error-400">
                                  {(() => {
                                    const costAmount = parseFloat(solution.cost.amount) || 0;
                                    const currentBalance = portfolio[solution.cost.asset] || 0;
                                    const newBalance = Math.max(0, currentBalance - costAmount);
                                    return formatNumber(newBalance);
                                  })()}
                                  <span className="text-text-muted ml-1">(-{formatNumber(parseFloat(solution.cost.amount) || 0)})</span>
                                </span>
                              </div>
                            )}

                            {/* Show impact on gas token received from swap */}
                            {(() => {
                              if (solution.type === 'auto_swap' && solution.description && solution.description.includes('for')) {
                                const gasTokenName = solution.cost.asset; // Smart Solutions now have correct gas asset
                                const sourceAmount = parseFloat(solution.cost.amount) || 0;
                                return (
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-text-secondary">{gasTokenName}:</span>
                                    <span className="text-xs font-medium text-success-400">
                                      +{formatNumber(sourceAmount * 0.1)} {gasTokenName}
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Final withdrawal amount */}
                            <div className="border-t border-white/10 pt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-text-secondary">You'll receive:</span>
                                <span className="text-xs font-semibold text-success-400">
                                  {formatNumber(solution.userReceives.amount)} {solution.userReceives.asset}
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Progressive Yes/No Buttons - Mobile Optimized */}
                  {!isSelected && (
                    <div className="space-y-3">
                      <button
                        className={`w-full py-3 px-4 rounded-xl font-medium transition-colors ${
                          solution.badge === 'RECOMMENDED'
                            ? 'bg-primary-600 hover:bg-primary-500 text-white'
                            : 'bg-surface-3 hover:bg-surface-2 text-text-primary border border-white/10'
                        }`}
                        onClick={() => handleApproveSolution(actualIndex)}
                      >
                        {solution.type === 'manual_topup' ? '💰 Go to Add Assets' :
                         solution.badge === 'RECOMMENDED' ? '✅ Yes, Execute This' :
                         solution.badge === 'REQUIRED STEP' ? '✅ Yes, Execute This' :
                         '✅ Choose This Option'}
                      </button>

                      <div className="flex gap-2">
                        {showSolutionsLayer === 'primary' && smartSolutions.length > 1 && (
                          <button
                            className="flex-1 py-2 px-3 rounded-lg text-sm bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 transition-colors"
                            onClick={() => setShowSolutionsLayer('alternatives')}
                          >
                            🔍 See Other Options
                          </button>
                        )}

                        <button
                          className="flex-1 py-2 px-3 rounded-lg text-sm bg-surface-3 text-text-secondary hover:bg-surface-2 transition-colors"
                          onClick={() => handleRejectSolution(actualIndex)}
                        >
                          {showSolutionsLayer === 'primary' ? '❌ Not This One' : '⏭️ Skip This'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Show confirmation when selected */}
                  {isSelected && (
                    <div className="bg-success-600/10 border border-success-500/20 rounded-xl p-4">
                      <div className="text-success-400 font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle size={16} />
                        Solution Approved
                      </div>

                      {showExecutionConfirm === actualIndex ? (
                        // Execution confirmation dialog
                        <div className="bg-warning-600/10 border border-warning-500/20 rounded-lg p-4 mb-3">
                          <div className="text-warning-400 font-semibold mb-2 flex items-center gap-2">
                            <AlertTriangle size={16} />
                            Confirm Execution
                          </div>
                          <div className="text-sm text-text-secondary mb-4">
                            This will execute: <strong>{solution.title}</strong>
                            <br />
                            Are you ready to proceed with your fee payment solution and continue the swap?
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="flex-1 btn-success btn-text"
                              onClick={() => {
                                // Set transaction data and show transaction preview modal
                                if (swapAnalysis) {
                                  setTransactionData(swapAnalysis);
                                }
                                setShowExecutionConfirm(null);
                                onShowTransactionPreview();
                              }}
                            >
                              Yes, Execute
                            </button>
                            <button
                              className="flex-1 btn-secondary btn-text"
                              onClick={() => setShowExecutionConfirm(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Portfolio balance preview before execution */}
                          <div className="bg-surface-2 rounded-xl p-4 mb-4">
                            <div className="text-xs sm:text-sm font-semibold text-text-primary mb-2 sm:mb-3 flex items-center gap-2">
                              <Scale size={14} className="sm:w-4 sm:h-4" />
                              Balance Preview
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs sm:text-sm text-text-secondary">Current {fromAsset}:</span>
                                <span className="text-xs sm:text-sm font-medium text-text-primary">{formatAmount(portfolio[fromAsset] || 0)}</span>
                              </div>
                              <div className="flex justify-between items-center text-error-400">
                                <span className="text-xs sm:text-sm">After swap {fromAsset}:</span>
                                <span className="text-xs sm:text-sm font-medium">
                                  {formatAmount(Math.max(0, (portfolio[fromAsset] || 0) - parseFloat(swapAmount || '0')))}
                                  <span className="text-xs ml-1">(-{formatAmount(parseFloat(swapAmount || '0'))})</span>
                                </span>
                              </div>
                              <div className="border-t border-white/10 pt-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs sm:text-sm text-text-secondary">Current {toAsset}:</span>
                                  <span className="text-xs sm:text-sm font-medium text-text-primary">{formatAmount(portfolio[toAsset] || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center text-success-400">
                                  <span className="text-xs sm:text-sm">After swap {toAsset}:</span>
                                  <span className="text-xs sm:text-sm font-medium">
                                    {swapAnalysis?.outputAmount
                                      ? formatAmount((portfolio[toAsset] || 0) + swapAnalysis.outputAmount)
                                      : formatAmount((portfolio[toAsset] || 0) + (parseFloat(swapAmount || '0') * 0.95))
                                    }
                                    <span className="text-xs ml-1">
                                      (+{swapAnalysis?.outputAmount
                                          ? formatAmount(swapAnalysis.outputAmount)
                                          : formatAmount(parseFloat(swapAmount || '0') * 0.95)
                                       })
                                    </span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Execute button */}
                          <button
                            className="w-full btn-success btn-text"
                            onClick={() => {
                              // Set transaction data and execute the actual swap
                              if (swapAnalysis) {
                                setTransactionData(swapAnalysis);
                              }
                              // Execute the swap with selected DEX
                              handleExecuteSwap();
                            }}
                          >
                            <Rocket className="inline w-4 h-4 mr-1" /> Execute Swap via {selectedDEX || 'DEX'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dynamic contextual footer message - Mobile Optimized */}
          {(() => {
            if (selectedSolution !== null) {
              return (
                <div className="mt-4 p-3 bg-success-600/10 border border-success-500/20 rounded-lg">
                  <div className="text-sm text-success-400 flex items-center gap-2">
                    <PartyPopper size={16} />
                    <span><strong>Perfect!</strong> Click "Execute Swap" above to proceed.</span>
                  </div>
                </div>
              );
            }

            if (showSolutionsLayer === 'primary') {
              const firstSolution = smartSolutions[0];
              if (firstSolution?.badge === 'RECOMMENDED') {
                return (
                  <div className="mt-4 p-3 bg-primary-600/10 border border-primary-500/20 rounded-lg">
                    <div className="text-sm text-primary-400">
                      ✅ <strong>Best Option Found!</strong> This is our recommended solution.
                      {smartSolutions.length > 1 && ' Tap "See Other Options" for alternatives.'}
                    </div>
                  </div>
                );
              }
            }

            if (showSolutionsLayer === 'alternatives') {
              return (
                <div className="mt-4 p-3 bg-warning-600/10 border border-warning-500/20 rounded-lg">
                  <div className="text-sm text-warning-400">
                    💡 <strong>Alternative Options:</strong> Here are other ways to handle fee payments.
                  </div>
                </div>
              );
            }

            return null;
          })()}
        </div>
      )}

      {/* Wallet Selection Modal */}
      <WalletSelectionModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSelectWallet={handleWalletSelection}
        walletType={walletModalType}
        onEthereumConnected={(address) => {
          // Handle successful Ethereum wallet connection
          console.log('Ethereum wallet connected:', address);
          // Trigger the connection handler to update Dashboard state
          onConnectMetaMask();
        }}
      />
    </div>
  );
};

export default SwapAssetsSection;