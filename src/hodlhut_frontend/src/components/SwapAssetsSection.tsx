import React, { useState } from 'react';
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
  ArrowLeftRight,
  Star,
  Plus,
  Rocket
} from 'lucide-react';
import AssetIcon from './AssetIcon';
import CustomDropdown from './CustomDropdown';
import CompactDEXSelector from './CompactDEXSelector';
import { AuthStep } from './AuthenticationModal';
import { Portfolio, MASTER_ASSETS, ASSET_PRICES } from '../../assets/master_asset_data';
import { CompleteSwapAnalysis, SmartSolution, DEX_OPTIONS } from '../../assets/master_swap_logic';
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
  slippageTolerance: number;
  currentGasPrice: number;
  smartSolutions: EnhancedSmartSolution[];
  selectedSolution: number | null;
  showAllSolutions: boolean;
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
  slippageTolerance,
  currentGasPrice,
  smartSolutions,
  selectedSolution,
  showAllSolutions,
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
  updatePortfolioAfterSwap
}) => {
  // State for execution confirmation and progressive Smart Solutions
  const [showExecutionConfirm, setShowExecutionConfirm] = useState<number | null>(null);
  const [smartSolutionsStep, setSmartSolutionsStep] = useState<number>(1);
  const [rejectedOptions, setRejectedOptions] = useState<Set<string>>(new Set());
  const [showSolutionsLayer, setShowSolutionsLayer] = useState<'primary' | 'alternatives'>('primary');

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
    // Only show assets available in the FROM dropdown that have a balance > 0
    const fromAssets = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'];
    const assetsWithBalance = fromAssets.filter(asset => portfolio[asset] && portfolio[asset] > 0);

    return assetsWithBalance.map(asset => ({
      value: asset,
      label: asset
    }));
  };

  // Render swap action button based on asset types and user portfolio
  const renderSwapActionButton = () => {
    // Asset categorization logic
    const ckAssetsAndICP = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'];
    const isFromCkAsset = ckAssetsAndICP.includes(fromAsset);
    const isToCkAsset = ckAssetsAndICP.includes(toAsset);
    const userOwnsToAsset = portfolio[toAsset] && portfolio[toAsset] > 0;

    // Case 1: Both are ckAssets/ICP AND user owns both - Show active reverse button
    if (fromAsset && toAsset && isFromCkAsset && isToCkAsset && userOwnsToAsset) {
      return (
        <button
          className="text-xs px-2 py-1 rounded-lg bg-primary-600 hover:bg-primary-500 text-on-primary transition-colors"
          onClick={() => {
            const temp = fromAsset;
            setFromAsset(toAsset);
            setToAsset(temp);
            // Don't clear swapAmount to keep What's Happening visible
          }}
          title="Reverse swap direction"
        >
          <ArrowLeftRight size={14} className="rotate-90" />
        </button>
      );
    }

    // Case 2: Both are ckAssets/ICP BUT user doesn't own TO asset - Show "Add Assets" button
    if (fromAsset && toAsset && isFromCkAsset && isToCkAsset && !userOwnsToAsset) {
      return (
        <button
          className="text-xs px-2 py-1 rounded-lg bg-primary-600 hover:bg-primary-500 text-on-primary transition-colors flex items-center gap-1"
          onClick={() => setActiveSection('addAssets')}
          title={`Add ${toAsset} to enable reverse swap`}
        >
          <Plus size={12} />
          Add Assets
        </button>
      );
    }

    // Case 3: TO asset is L1/cross-chain - Show disabled reverse button
    if (fromAsset && toAsset && !isToCkAsset) {
      return (
        <button
          className="p-2 rounded-full bg-surface-3/50 border border-white/5 transition-all duration-200 opacity-50 cursor-default"
          disabled
          title="Cannot reverse to cross-chain assets"
        >
          <ArrowLeftRight size={12} className="text-text-muted rotate-90" />
        </button>
      );
    }

    // Default: Show disabled reverse button when no assets selected
    return (
      <button
        className="p-2 rounded-full bg-surface-3/50 border border-white/5 transition-all duration-200 opacity-50 cursor-default"
        disabled
        title="Select assets to enable reverse swap"
      >
        <ArrowLeftRight size={12} className="text-text-muted rotate-90" />
      </button>
    );
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
      // Determine network-specific message based on destination
      let networkMessage = '';
      if (swapAnalysis && swapAnalysis.destinationChain) {
        if (swapAnalysis.destinationChain === 'Bitcoin') {
          networkMessage = 'Crosschaining to the Bitcoin mainnet requires ckBTC for gas.';
        } else if (swapAnalysis.destinationChain === 'Ethereum') {
          networkMessage = 'Crosschaining to Ethereum requires ckETH for gas.';
        }
      }

      return (
        <div className="mt-4 p-3 bg-primary-600/10 border border-primary-500/20 rounded-lg">
          <div className="text-sm text-primary-400">
            {networkMessage || 'We found easy solutions for your fee payments. The recommended option is usually the best choice.'}
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

  // Simple Route Visualization - Clean and Clear
  const SimpleRouteDisplay: React.FC<{ route: SwapRoute }> = ({ route }) => {
    return (
      <div className="flex items-center justify-center gap-4 mb-4">
        {route.steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="bg-surface-1 border-2 border-primary-500 rounded-2xl w-32 h-16 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <AssetIcon asset={step} size={16} />
                <span className="font-semibold text-text-primary">{step}</span>
              </div>
            </div>
            {index < route.steps.length - 1 && (
              <div className="text-primary-500 font-bold">→</div>
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
    // Only show for L1 withdrawals - hide for ICP-only transactions
    if (!swapAnalysis || !swapAnalysis.isL1Withdrawal || !swapAnalysis.destinationChain) {
      return null;
    }

    const destinationChain = swapAnalysis.destinationChain;
    let recommendation = '';
    let colorClass = '';
    let currentFeeDisplay = '';
    let optimizationTitle = '';

    if (destinationChain === 'Bitcoin') {
      // Bitcoin fee logic (sats/vB or BTC)
      const btcFeeRate = Math.floor(Math.random() * 20) + 10; // 10-30 sats/vB simulation
      optimizationTitle = 'Bitcoin Fee Optimization';
      currentFeeDisplay = `Current: ${btcFeeRate} sats/vB`;

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
    } else if (destinationChain === 'Ethereum') {
      // Ethereum gwei logic (existing logic)
      optimizationTitle = 'Ethereum Gas Optimization';
      currentFeeDisplay = `Current: ${currentGasPrice} gwei`;

      if (currentGasPrice < 20) {
        recommendation = 'Gas is 15% lower than average. Good time to transact!';
        colorClass = 'text-success-400';
      } else if (currentGasPrice < 30) {
        recommendation = 'Gas is average';
        colorClass = 'text-warning-400';
      } else {
        recommendation = 'Gas is high';
        colorClass = 'text-error-400';
      }
    } else {
      // Fallback for other chains or hide
      return null;
    }

    return (
      <div className="w-full max-w-lg mt-6 mx-auto rounded-xl bg-surface-2 p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-2 font-semibold text-text-primary">
            <Fuel size={16} />
            {optimizationTitle}
          </span>
          <span className="text-sm font-medium text-text-secondary">{currentFeeDisplay}</span>
        </div>
        <div className={`text-sm font-medium ${colorClass}`}>
          {recommendation}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center px-4 py-8">
      <div className="text-center mb-4 md:mb-8">
        <div className="heading-2 text-text-primary mb-2">Swap Assets Crosschain</div>
        <p className="text-text-secondary">Swap assets within ICP or out to Bitcoin and Ethereum.</p>
      </div>

      {/* Main Swap Interface */}
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-surface-1 p-4">
        {/* From Asset */}
        <div className="bg-surface-2 border border-white/10 rounded-2xl p-6">
          <div className="mb-4">
            <label className="text-sm font-medium text-text-secondary">From</label>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <input
              type="number"
              value={swapAmount}
              onChange={(e) => setSwapAmount(e.target.value)}
              placeholder="0.0"
              className="flex-1 text-lg sm:text-xl md:text-2xl font-semibold text-text-primary bg-transparent border-none outline-none w-0 min-w-0"
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
              placeholder="Select asset"
              portfolio={portfolio}
              options={getSwapFromAssetOptions()}
            />
          </div>

          <div className="text-center">
            <span className="text-sm text-text-muted">
              Balance: {fromAsset && portfolio[fromAsset] ? formatAmount(portfolio[fromAsset]) : '--'}
            </span>
          </div>
        </div>

        {/* Swap Arrow and MAX Button */}
        <div className="flex justify-between items-center py-6">
          <div className="flex-1"></div>
          {renderSwapActionButton()}
          <div className="flex-1 flex justify-end">
            <button
              className={`text-xs px-2 py-1 rounded-lg bg-primary-600 hover:bg-primary-500 text-on-primary transition-colors ${(!fromAsset || !portfolio[fromAsset]) ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (fromAsset && portfolio[fromAsset]) {
                  setSwapAmount(portfolio[fromAsset].toString());
                }
              }}
              disabled={!fromAsset || !portfolio[fromAsset]}
              title="Set maximum amount"
            >
              MAX
            </button>
          </div>
        </div>

        {/* To Asset */}
        <div className="bg-surface-2 border border-white/10 rounded-2xl p-6">
          <div className="mb-4">
            <label className="text-sm font-medium text-text-secondary">To</label>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 text-lg sm:text-xl md:text-2xl font-semibold text-text-primary min-w-0">
              {swapAnalysis?.outputAmount ? formatAmount(swapAnalysis.outputAmount) : '0.0'}
            </div>
            <CustomDropdown
              className="asset-dropdown min-w-[100px] sm:min-w-[120px] md:min-w-[140px]"
              value={toAsset}
              onChange={setToAsset}
              placeholder="Select asset"
              portfolio={portfolio}
              options={[
                { value: 'ckBTC', label: 'ckBTC' },
                { value: 'ckETH', label: 'ckETH' },
                { value: 'ckUSDC', label: 'ckUSDC' },
                { value: 'ckUSDT', label: 'ckUSDT' },
                { value: 'ICP', label: 'ICP' },
                { value: 'BTC', label: 'Bitcoin' },
                { value: 'ETH', label: 'Ethereum' },
                { value: 'USDC', label: 'USDC' },
                { value: 'USDT', label: 'USDT' },
              ].filter(option => option.value !== fromAsset)}
            />
          </div>

          <div className="text-center">
            <span className="text-sm text-text-muted">
              {getSwapReceiveMessage()}
            </span>
          </div>
        </div>
      </div>

      {/* Exchange Rate Display */}
      <div className="w-full max-w-lg mt-6 text-center py-6 px-8 rounded-xl bg-surface-2">
        <span className="text-text-secondary text-sm">
          {swapAnalysis?.outputAmount && swapAmount ?
            `Rate: 1 ${fromAsset} = ${(swapAnalysis.outputAmount / parseFloat(swapAmount)).toFixed(2)} ${toAsset}` :
            'Enter amount to see exchange rate'
          }
        </span>
      </div>

      {/* STEP 1: What's Happening (Route Explanation) - ALWAYS SHOWN FIRST */}
      {showRouteDetails && swapAnalysis && (
        <div className="w-full max-w-lg mt-6 rounded-2xl border border-white/10 bg-surface-1 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text-primary mb-2">What's Happening?</h1>
            <p className="text-text-secondary">Your transaction explained</p>
          </div>

          {fromAsset === toAsset ? (
            <div className="rounded-xl bg-warning-600/10 border border-warning-500/20 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2 text-warning-400">
                <Waves size={20} />
                <span className="font-semibold">Hold on there surfer!</span>
              </div>
              <p className="text-text-secondary">
                You are trying to swap the same token.<br />
                Please check your swap and try again.
              </p>
            </div>
          ) : (
            <>
              <SimpleRouteDisplay route={swapAnalysis.route} />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-surface-2 rounded-xl p-6">
                  <div className="ui-label text-text-muted mb-2">Operation</div>
                  <div className="body-md text-text-primary font-semibold">
                    {swapAnalysis.route.operationType === 'DEX + Minter' ? 'DEX + Chain Fusion' :
                     swapAnalysis.route.operationType === 'DEX Swap' ? 'DEX' :
                     swapAnalysis.route.operationType === 'Minter Operation' ? 'Chain Fusion' :
                     swapAnalysis.route.operationType}
                  </div>
                </div>
                <div className="bg-surface-2 rounded-xl p-6">
                  <div className="ui-label text-text-muted mb-2">Networks</div>
                  <div className="body-md text-text-primary font-semibold">
                    {swapAnalysis.route.chainsInvolved.map(chain =>
                      chain === 'Internet Computer' ? 'ICP' : chain
                    ).join(' → ')}
                  </div>
                </div>
                <div className="bg-surface-2 rounded-xl p-6">
                  <div className="ui-label text-text-muted mb-2">Est. Time</div>
                  <div className="body-md text-text-primary font-semibold">{swapAnalysis.route.estimatedTime}</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Check if this is a native withdrawal (ckETH->ETH, ckBTC->BTC) */}
      {(() => {
        const isNativeWithdrawal = (fromAsset === 'ckETH' && toAsset === 'ETH') ||
                                  (fromAsset === 'ckBTC' && toAsset === 'BTC');

        if (isNativeWithdrawal) {
          // For native withdrawals: show Gas Optimization immediately, then Execute button
          return (
            <>
              {/* Gas Optimization - moved up for native withdrawals */}
              {renderGasOptimization()}

              {/* Direct Execute Button for Native Withdrawals */}
              {swapAnalysis && parseFloat(swapAmount || '0') > 0 && (
                <div className="w-full max-w-lg mt-6">
                  {/* Balance Preview */}
                  <div className="bg-surface-2 rounded-xl p-4 mb-4">
                    <div className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <Scale size={16} />
                      Balance Preview
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-text-secondary">Current {fromAsset}:</span>
                        <span className="font-medium text-text-primary">{formatAmount(portfolio[fromAsset] || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center text-error-400">
                        <span>After withdrawal {fromAsset}:</span>
                        <span className="font-medium">
                          {formatAmount(Math.max(0, (portfolio[fromAsset] || 0) - parseFloat(swapAmount || '0')))}
                          <span className="text-xs ml-1">(-{formatAmount(parseFloat(swapAmount || '0'))})</span>
                        </span>
                      </div>
                      <div className="border-t border-white/10 pt-2">
                        <div className="flex justify-between items-center text-success-400">
                          <span>You'll receive {toAsset}:</span>
                          <span className="font-medium">
                            {swapAnalysis?.outputAmount
                              ? formatAmount(swapAnalysis.outputAmount)
                              : formatAmount(parseFloat(swapAmount || '0') * 0.95)
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Execute Button */}
                  <button
                    className="w-full btn-success btn-text"
                    onClick={() => {
                      if (swapAnalysis) {
                        setTransactionData(swapAnalysis);
                      }
                      onShowTransactionPreview();
                    }}
                  >
                    <Rocket className="inline w-4 h-4 mr-1" />
                    Execute {toAsset} Withdrawal
                  </button>
                </div>
              )}
            </>
          );
        } else {
          // For other swaps: show slippage settings and DEX selection
          return (
            <>
              {/* Slippage Settings */}
              {renderSlippageSettings()}
            </>
          );
        }
      })()}

      {/* STEP 2: Choose Your Method (DEX Selection) - COMPACT VERSION */}
      {showDEXSelection && swapAnalysis && fromAsset !== toAsset && (
        <div className="w-full max-w-lg mt-6 rounded-2xl border border-white/10 bg-surface-1 p-8">
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

              // Auto-trigger Transaction Preview for DEX + Chain Fusion swaps when DEX is selected
              if (dexId && swapAnalysis && !showSmartSolutions) {
                // Check if this is a DEX + Chain Fusion operation (DEX swap to L1 asset)
                const isDEXPlusChainFusion = swapAnalysis.route.operationType === 'DEX + Minter' ||
                                           (swapAnalysis.route.steps.includes('DEX Swap') &&
                                            ['BTC', 'ETH', 'USDC', 'USDT'].includes(toAsset));

                if (isDEXPlusChainFusion && parseFloat(swapAmount || '0') > 0) {
                  console.log('🚀 Auto-triggering Transaction Preview for DEX + Chain Fusion:', {
                    from: fromAsset,
                    to: toAsset,
                    selectedDEX: dexId,
                    operationType: swapAnalysis.route.operationType
                  });

                  // Set transaction data and show Transaction Preview
                  setTransactionData(swapAnalysis);
                  onShowTransactionPreview();
                }
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

          <div className="mt-6 p-4 bg-primary-600/5 rounded-lg border border-primary-600/20">
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">Your Choice Matters:</span> We show you all options with real data - you decide what's most important for your trade.
            </p>
          </div>
        </div>
      )}

      {/* Gas Optimization for non-native withdrawals */}
      {(() => {
        const isNativeWithdrawal = (fromAsset === 'ckETH' && toAsset === 'ETH') ||
                                  (fromAsset === 'ckBTC' && toAsset === 'BTC');
        // Only show Gas Optimization here for non-native withdrawals (native ones show it earlier)
        return !isNativeWithdrawal ? renderGasOptimization() : null;
      })()}

      {/* STEP 3: Smart Solutions - Simple Mobile-First Design */}
      {showSmartSolutions && smartSolutions.length > 0 && (
        <div className="w-full max-w-lg mt-6 rounded-2xl border border-white/10 bg-surface-1 p-6">
          <div className="flex justify-center items-center gap-3 mb-6">
            <Lightbulb size={20} className="text-primary-500" />
            <span className="text-lg font-semibold text-text-primary">Smart Solutions</span>
          </div>

          <div className="space-y-4">
            {smartSolutions.map((solution, index) => (
              <div key={index} className="bg-surface-2 rounded-xl p-6 border border-white/20">
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 badge-text mb-3 bg-success-400/15 text-success-300">
                  <CheckCircle size={16} />
                  RECOMMENDED
                </div>

                <h3 className="text-lg font-semibold text-text-primary mb-3">{solution.title}</h3>
                <p className="text-sm text-text-secondary mb-4">{solution.description}</p>

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

                <button
                  className="w-full py-3 px-4 rounded-xl font-semibold transition-colors bg-primary-600 hover:bg-primary-500 text-white"
                  onClick={() => handleApproveSolution(index)}
                >
                  ✅ Yes, Execute This
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                            <div className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                              <Scale size={16} />
                              Balance Preview
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-text-secondary">Current {fromAsset}:</span>
                                <span className="font-medium text-text-primary">{formatAmount(portfolio[fromAsset] || 0)}</span>
                              </div>
                              <div className="flex justify-between items-center text-error-400">
                                <span>After swap {fromAsset}:</span>
                                <span className="font-medium">
                                  {formatAmount(Math.max(0, (portfolio[fromAsset] || 0) - parseFloat(swapAmount || '0')))}
                                  <span className="text-xs ml-1">(-{formatAmount(parseFloat(swapAmount || '0'))})</span>
                                </span>
                              </div>
                              <div className="border-t border-white/10 pt-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-text-secondary">Current {toAsset}:</span>
                                  <span className="font-medium text-text-primary">{formatAmount(portfolio[toAsset] || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center text-success-400">
                                  <span>After swap {toAsset}:</span>
                                  <span className="font-medium">
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

    </div>
  );
};

export default SwapAssetsSection;