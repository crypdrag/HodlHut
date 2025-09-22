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
  executeSwap
}) => {
  // State for execution confirmation
  const [showExecutionConfirm, setShowExecutionConfirm] = useState<number | null>(null);

  // Execute the actual swap using backend MyHut canister
  const handleExecuteSwap = async () => {
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

      const response = await executeSwap(swapRequest);

      if (response?.success) {
        console.log('✅ Swap executed successfully:', response);
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
        <div className="mt-4 p-3 bg-warning-600/10 border border-warning-500/20 rounded-lg">
          <div className="text-sm text-warning-400 flex items-center gap-2">
            <AlertTriangle size={16} />
            <span><strong>Manual Steps Required:</strong> You'll need to complete some DEX swaps first to get the required fee tokens.</span>
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

      {/* Slippage Settings */}
      {renderSlippageSettings()}

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
            setSelectedDEX={setSelectedDEX}
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

      {/* Gas Optimization */}
      {renderGasOptimization()}

      {/* STEP 3: Smart Solutions with Progressive Yes/No Interactions */}
      {showSmartSolutions && smartSolutions.length > 0 && (
        <div className="w-full max-w-lg mt-6 rounded-2xl border border-white/10 bg-surface-1 p-8">
          <div className="flex justify-center items-center gap-3 mb-8">
            <Lightbulb size={24} className="text-primary-500" />
            <span className="heading-4 text-text-primary">Smart Solutions</span>
            {selectedSolution !== null && (
              <button
                onClick={resetSolutionsView}
                className="ml-auto btn-secondary btn-sm"
              >
                ↶ Back to All Options
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Show only selected solution when approved, or all when exploring */}
            {(selectedSolution !== null && !showAllSolutions ?
              [smartSolutions[selectedSolution]] :
              (showAllSolutions ? smartSolutions : [smartSolutions[0]])
            ).map((solution, displayIndex) => {
              const actualIndex = selectedSolution !== null && !showAllSolutions ? selectedSolution :
                                  (showAllSolutions ? displayIndex : 0);
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
                      const getBalanceToken = () => {
                        if (toAsset === 'BTC') return 'ckBTC';
                        if (['ETH', 'USDC', 'USDT'].includes(toAsset)) return 'ckETH';
                        return solution.cost.asset; // fallback to the cost asset
                      };

                      const balanceToken = getBalanceToken();
                      const userBalance = portfolio[balanceToken] || 0;

                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="body-sm text-text-secondary">Balance</span>
                            <span className="body-sm font-semibold text-text-primary">{formatNumber(userBalance)} {balanceToken}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="body-sm text-text-secondary">Gas required</span>
                            <span className="body-sm font-semibold text-text-primary">{solution.cost.amount} {solution.cost.asset}</span>
                          </div>
                          <div className="border-t border-white/10 pt-3">
                            <div className="flex justify-between items-center">
                              <span className="body-sm text-text-secondary">You'll receive</span>
                              <span className="body-sm font-semibold text-success-400">{formatNumber(solution.userReceives.amount)} {solution.userReceives.asset}</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Progressive Yes/No Buttons */}
                  {!isSelected && (
                    <div className="flex gap-3">
                      <button
                        className={`flex-1 btn-text ${
                          solution.badge === 'RECOMMENDED'
                            ? 'btn-primary'
                            : 'btn-secondary'
                        }`}
                        onClick={() => handleApproveSolution(actualIndex)}
                      >
                        {solution.badge === 'RECOMMENDED' ? 'Yes, Use This' :
                         solution.badge === 'REQUIRED STEP' ? 'Complete This Step' :
                         'Choose This Option'}
                      </button>

                      <button
                        className="flex-1 btn-secondary btn-text"
                        onClick={() => handleRejectSolution(actualIndex)}
                      >
                        {isFirstSolution ? 'See Other Options' : 'Skip This'}
                      </button>
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
                        // Initial execute button
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
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dynamic contextual footer message */}
          {renderSmartSolutionsFooter()}
        </div>
      )}

    </div>
  );
};

export default SwapAssetsSection;