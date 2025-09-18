import React from 'react';
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
  formatNumber
}) => {
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
        <div className="contextual-message">
          <PartyPopper className="inline w-4 h-4 mr-1" /> <strong>Perfect!</strong> You've chosen your fee payment method. Click "Execute & Continue Swap" above to proceed.
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
          <div className="solution-message">
            ✅ <strong>Best Option Found!</strong> This is the easiest way to handle your fee payment. Approve it or see alternatives.
          </div>
        );
      }
    }

    if (hasRecommended) {
      return (
        <div className="solution-message">
          ✅ <strong>Great news!</strong> We found easy solutions for your fee payments. The recommended option is usually the best choice.
        </div>
      );
    } else if (hasRequiredSteps) {
      return (
        <div className="warning-message">
          <AlertTriangle className="inline w-4 h-4 mr-1" /> <strong>Manual Steps Required:</strong> You'll need to complete some DEX swaps first to get the required fee tokens.
        </div>
      );
    } else if (hasAlternatives) {
      return (
        <div className="warning-message">
          <Lightbulb className="inline w-4 h-4 mr-1" /> <strong>Alternative Options:</strong> Here are different ways to handle fee payments based on your portfolio.
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
    let recommendation = '';
    if (currentGasPrice < 20) {
      recommendation = 'Gas is 15% lower than average. Good time to transact!';
    } else if (currentGasPrice < 30) {
      recommendation = 'Gas is average. Consider waiting for lower fees.';
    } else {
      recommendation = 'Gas is high. Consider delaying or using smart solutions.';
    }

    return (
      <div className="w-full max-w-lg mt-6 mx-auto rounded-xl bg-surface-2 p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-2 font-semibold text-text-primary">
            <Fuel size={16} />
            Gas Optimization
          </span>
          <span className="text-sm font-medium text-text-secondary">Current: {currentGasPrice} gwei</span>
        </div>
        <div className="text-sm text-text-secondary">
          {recommendation}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center px-4 py-8">
      <div className="text-center mb-4 md:mb-8">
        <div className="heading-2 text-text-primary mb-2">Swap Assets Crosschain</div>
        <p className="text-text-secondary">Swap assets within ICP or out to Bitcoin, Ethereum, and Solana</p>
      </div>

      {/* Main Swap Interface */}
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-surface-1 p-4">
        {/* From Asset */}
        <div className="bg-surface-2 border border-white/10 rounded-2xl p-6">
          <div className="mb-4">
            <label className="text-sm font-medium text-text-secondary">From</label>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 text-2xl font-semibold text-text-primary">
              {swapAmount || '0.0'}
            </div>
            <CustomDropdown
              className="asset-dropdown min-w-[140px]"
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
            <div className="flex-1 text-2xl font-semibold text-text-primary">
              {swapAnalysis?.outputAmount ? formatAmount(swapAnalysis.outputAmount) : '0.0'}
            </div>
            <CustomDropdown
              className="asset-dropdown min-w-[140px]"
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
          />

          <div className="mt-6 p-4 bg-primary-600/5 rounded-lg border border-primary-600/20">
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">Your Choice Matters:</span> We show you all options with real data - you decide what's most important for your trade.
            </p>
          </div>
        </div>
      )}

      {/* STEP 3: Smart Solutions with Progressive Yes/No Interactions */}
      {showSmartSolutions && smartSolutions.length > 0 && (
        <div className="w-full max-w-lg mt-6 rounded-2xl border border-white/10 bg-surface-1 p-8">
          <div className="flex justify-center items-center gap-3 mb-8">
            <Lightbulb size={24} className="text-primary-500" />
            <span className="heading-4 text-text-primary">Smart Solutions for Fee Payment</span>
            {selectedSolution !== null && (
              <button
                onClick={resetSolutionsView}
                className="ml-auto bg-surface-2 border border-white/20 rounded px-2 py-1 text-xs cursor-pointer hover:bg-surface-3 transition-colors duration-200 text-text-secondary"
              >
                ↶ Back to All Options
              </button>
            )}
          </div>

          <div className="solutions-grid">
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

                  <div className="heading-4 text-text-primary mb-3">{solution.title}</div>
                  <div className="body-md text-text-secondary mb-4">{solution.description}</div>

                  <div className="space-y-2 mb-4">
                    <div className="body-sm text-text-primary">
                      You'll receive: <span className="ui-label">{formatNumber(solution.userReceives.amount)} {solution.userReceives.asset}</span>
                    </div>
                    <div className="body-sm text-text-primary">
                      Cost: <span className="ui-label">{solution.cost.amount} {solution.cost.asset}</span>
                    </div>
                  </div>

                  {/* Progressive Yes/No Buttons */}
                  {!isSelected && (
                    <div className="flex gap-3">
                      <button
                        className={`flex-1 py-3 px-4 rounded-xl btn-text font-semibold transition-all duration-200 ${
                          solution.badge === 'RECOMMENDED'
                            ? 'bg-primary-600 hover:bg-primary-500 text-on-primary focus:ring-2 focus:ring-primary-400 focus:outline-none'
                            : 'bg-surface-3 hover:bg-surface-2 text-text-primary border border-white/20'
                        }`}
                        onClick={() => handleApproveSolution(actualIndex)}
                      >
                        {solution.badge === 'RECOMMENDED' ? 'Yes, Use This' :
                         solution.badge === 'REQUIRED STEP' ? 'Complete This Step' :
                         'Choose This Option'}
                      </button>

                      <button
                        className="flex-1 py-3 px-4 rounded-xl btn-text font-semibold transition-all duration-200 bg-surface-3 hover:bg-surface-2 text-text-secondary border border-white/20"
                        onClick={() => handleRejectSolution(actualIndex)}
                      >
                        {isFirstSolution ? 'See Other Options' : 'Skip This'}
                      </button>
                    </div>
                  )}

                  {/* Show confirmation when selected */}
                  {isSelected && (
                    <div className="solution-confirmation">
                      <div className="solution-approved-text">
                        ✅ Solution Approved
                      </div>
                      <button
                        className="solution-btn execute"
                        onClick={() => {
                          alert(`Executing: ${solution.title}\n\nThis would now execute the selected fee payment solution and proceed with your swap.`);
                        }}
                      >
                        <Rocket className="inline w-4 h-4 mr-1" /> Execute & Continue Swap
                      </button>
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

      {/* Slippage Settings */}
      {renderSlippageSettings()}

      {/* Gas Optimization */}
      {renderGasOptimization()}

      {/* Transaction Preview */}
      {swapAnalysis && fromAsset !== toAsset && (
        <div className="w-full max-w-lg mt-6 rounded-2xl border border-white/10 bg-surface-1 p-8">
          <div className="flex items-center justify-center mb-8">
            <span className="heading-4 text-text-primary">📋 Transaction Preview</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-surface-2 rounded-xl p-6">
              <div className="ui-label text-text-muted mb-2">From</div>
              <div className="body-md text-text-primary font-semibold">{formatAmount(swapAnalysis.amount)} {swapAnalysis.fromAsset}</div>
            </div>
            <div className="bg-surface-2 rounded-xl p-6">
              <div className="ui-label text-text-muted mb-2">To</div>
              <div className="body-md text-text-primary font-semibold">{formatAmount(swapAnalysis.outputAmount)} {swapAnalysis.toAsset}</div>
            </div>
            <div className="bg-surface-2 rounded-xl p-6">
              <div className="ui-label text-text-muted mb-2">Rate</div>
              <div className="body-md text-text-primary font-semibold">1 {swapAnalysis.fromAsset} = {formatAmount(swapAnalysis.rate)} {swapAnalysis.toAsset}</div>
            </div>
            <div className="bg-surface-2 rounded-xl p-6">
              <div className="ui-label text-text-muted mb-2">Route</div>
              <div className="body-md text-text-primary font-semibold">{swapAnalysis.route.steps.join(' → ')}</div>
            </div>
          </div>

          {swapAnalysis.feeRequirements.length > 0 && (
            <div className="bg-surface-2 rounded-xl p-6 mb-6">
              <div className="ui-label text-text-muted mb-4">Fee Breakdown</div>
              {/* Backend: DEX trading fees should pull live data from KongSwap API or ICPSwap API */}
              <div className="space-y-2">
                {swapAnalysis.feeRequirements.map((fee: any, index: number) => (
                  <div key={index} className="flex justify-between items-center body-sm">
                    <span className="text-text-secondary">{fee.description}</span>
                    <span className="text-text-primary ui-label">${fee.usdValue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-surface-3 rounded-xl p-6 mb-8">
            <div className="flex justify-between items-center">
              <span className="body-md text-text-primary font-semibold">Total Fees</span>
              <span className="body-md text-text-primary font-bold">${swapAnalysis.totalFeesUSD.toFixed(2)}</span>
            </div>
          </div>

          <button
            className="w-full px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-500 text-on-primary font-semibold transition-all duration-200"
            onClick={() => {
              // Set transaction data and trigger authentication modal
              setTransactionData(swapAnalysis);
              setAuthStep('authenticate');
              setShowAuthModal(true);
            }}
          >
            Execute Swap
          </button>
        </div>
      )}
    </div>
  );
};

export default SwapAssetsSection;