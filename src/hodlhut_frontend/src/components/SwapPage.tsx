import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { bitcoinWalletService, ConnectedWallet } from '../services/bitcoinWalletService';
import { simpleEthereumWallet } from '../services/simpleEthereumWallet';
import { simplePlugWallet } from '../services/simplePlugWallet';
import SwapAssetsSection from './SwapAssetsSection';
import SmartSolutionModal from './SmartSolutionModal';
import ExecutionProgressModal from './ExecutionProgressModal';
import { Portfolio, MASTER_ASSETS, ASSET_PRICES } from '../../assets/master_asset_data';
import {
  analyzeCompleteSwap,
  needsDEXSelection,
  CompleteSwapAnalysis,
  SmartSolution
} from '../../assets/master_swap_logic';
import { AuthStep } from './AuthenticationModal';

// Declare MetaMask types
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Mock portfolio for demo (will be replaced with real state management)
const MOCK_PORTFOLIO: Portfolio = {
  ckBTC: 0.5,
  ckETH: 2.0,
  ckUSDC: 1000,
  ckUSDT: 500,
  ICP: 100,
  // Mock L1 wallet balances for testing Bitcoin-only onramp (pre-wallet integration)
  ETH: 1.5,
  USDC: 2500,
  USDT: 1500
};

const SwapPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // Portfolio state (will be integrated with global state later)
  const [portfolio, setPortfolio] = useState<Portfolio>(MOCK_PORTFOLIO);

  // Wallet connection state
  const [connectedMetaMask, setConnectedMetaMask] = useState<string | null>(null);
  const [connectedPlug, setConnectedPlug] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);

  // Swap state
  const [fromAsset, setFromAsset] = useState('ETH'); // Default to first asset in list
  const [toAsset, setToAsset] = useState('BTC'); // Bitcoin-only onramp: TO asset always BTC
  const [swapAmount, setSwapAmount] = useState('');
  const [selectedDEX, setSelectedDEX] = useState<string | null>(null);
  const [slippageTolerance, setSlippageTolerance] = useState(5.0);
  const [currentGasPrice, setCurrentGasPrice] = useState(25);

  // Swap analysis state
  const [swapAnalysis, setSwapAnalysis] = useState<CompleteSwapAnalysis | null>(null);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const [showDEXSelection, setShowDEXSelection] = useState(false);
  const [showSmartSolutions, setShowSmartSolutions] = useState(false);

  // UI state - Compact mode (DEX selector replaces swap interface)
  const [showCompactMode, setShowCompactMode] = useState(false);

  // Smart Solutions state
  const [smartSolutions, setSmartSolutions] = useState<SmartSolution[]>([]);
  const [selectedSolution, setSelectedSolution] = useState<number | null>(null);
  const [showAllSolutions, setShowAllSolutions] = useState(false);
  const [currentSolutionIndex, setCurrentSolutionIndex] = useState(0);
  const [pendingApproval, setPendingApproval] = useState<SmartSolution | null>(null);
  const [approvedSmartSolution, setApprovedSmartSolution] = useState<SmartSolution | null>(null);

  // Modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showExecutionProgressModal, setShowExecutionProgressModal] = useState(false);
  const [transactionData, setTransactionData] = useState<CompleteSwapAnalysis | null>(null);

  // Auth modal state (not used in this simplified version)
  const [authStep, setAuthStep] = useState<AuthStep>('authenticate');
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Portfolio update function
  const updatePortfolioAfterSwap = (fromAsset: string, toAsset: string, fromAmount: number, toAmount: number) => {
    setPortfolio(prev => ({
      ...prev,
      [fromAsset]: Math.max(0, (prev[fromAsset] || 0) - fromAmount),
      [toAsset]: (prev[toAsset] || 0) + toAmount
    }));
  };

  // Wallet connection handlers
  const handleConnectMetaMask = async () => {
    setIsConnectingWallet(true);
    try {
      const address = await simpleEthereumWallet.connect();
      setConnectedMetaMask(address);
      showSuccess(`Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      showError(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const handleDisconnectMetaMask = () => {
    simpleEthereumWallet.disconnect();
    setConnectedMetaMask(null);
    showSuccess('Ethereum wallet disconnected');
  };

  const handleConnectPlug = async () => {
    setIsConnectingWallet(true);
    try {
      const principal = await simplePlugWallet.connect();
      setConnectedPlug(principal);
      showSuccess(`Plug Wallet connected: ${principal.slice(0, 8)}...`);
    } catch (error: any) {
      console.error('Plug connection error:', error);
      showError(error.message || 'Failed to connect Plug Wallet');
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const handleDisconnectPlug = async () => {
    try {
      await simplePlugWallet.disconnect();
      setConnectedPlug(null);
      showSuccess('Plug Wallet disconnected');
    } catch (error: any) {
      console.error('Plug disconnection error:', error);
    }
  };

  // Determine which wallet is needed based on FROM asset
  const getRequiredWallet = (asset: string): 'metamask' | 'plug' | null => {
    if (['ETH', 'USDC', 'USDT'].includes(asset)) {
      return 'metamask';
    } else if (['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'].includes(asset)) {
      return 'plug';
    }
    return null;
  };

  // Subscribe to wallet state changes
  useEffect(() => {
    // Subscribe to Plug wallet state
    const unsubscribePlug = simplePlugWallet.subscribe((state) => {
      setConnectedPlug(state.isConnected ? state.principal : null);
    });

    // Initialize with current state
    const plugState = simplePlugWallet.getState();
    if (plugState.isConnected && plugState.principal) {
      setConnectedPlug(plugState.principal);
    }

    return () => {
      unsubscribePlug();
    };
  }, []);

  // Check if wallet is connected for selected asset
  const isWalletConnectedForAsset = (asset: string): boolean => {
    const requiredWallet = getRequiredWallet(asset);
    if (requiredWallet === 'metamask') {
      return !!connectedMetaMask;
    } else if (requiredWallet === 'plug') {
      return !!connectedPlug;
    }
    return false;
  };

  // Auto-analyze swap when parameters change
  useEffect(() => {
    if (fromAsset && toAsset && swapAmount && parseFloat(swapAmount) > 0) {
      if (fromAsset === toAsset) {
        setSwapAnalysis(null);
        setShowRouteDetails(false);
        setShowDEXSelection(false);
        setShowSmartSolutions(false);
        return;
      }

      const timeoutId = setTimeout(() => {
        updateAdvancedSwapDetails();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSwapAnalysis(null);
      setShowRouteDetails(false);
      setShowDEXSelection(false);
      setShowSmartSolutions(false);
      setSmartSolutions([]);
      setSelectedSolution(null);
      setShowAllSolutions(false);
      setCurrentSolutionIndex(0);
    }
  }, [fromAsset, toAsset, swapAmount, selectedDEX, portfolio, connectedMetaMask, connectedPlug]);

  // Gas price monitoring
  useEffect(() => {
    const updateGasPrice = () => {
      const randomGas = Math.floor(Math.random() * 20) + 15;
      setCurrentGasPrice(randomGas);
    };

    updateGasPrice();
    const gasTimer = setInterval(updateGasPrice, 30000);

    return () => clearInterval(gasTimer);
  }, []);

  const updateAdvancedSwapDetails = () => {
    if (!fromAsset || !toAsset || !swapAmount || parseFloat(swapAmount) <= 0) {
      return;
    }

    const amount = parseFloat(swapAmount);
    const analysis = analyzeCompleteSwap(fromAsset, toAsset, amount, portfolio, selectedDEX || 'ICPSwap');

    if (!analysis.success) {
      setSwapAnalysis(null);
      setShowRouteDetails(false);
      setShowDEXSelection(false);
      setShowSmartSolutions(false);
      return;
    }

    setSwapAnalysis(analysis);
    setShowRouteDetails(true);

    // Bitcoin-only onramp: Only ckBTC → BTC is direct Chain Fusion (no DEX needed)
    // All other assets need DEX routing (e.g., ckETH → ckBTC → BTC requires DEX for ckETH → ckBTC)
    const isDirectChainFusion = (fromAsset === 'ckBTC' && toAsset === 'BTC') ||
                                (fromAsset === 'ckETH' && toAsset === 'ETH') ||
                                (fromAsset === 'ckUSDC' && toAsset === 'USDC') ||
                                (fromAsset === 'ckUSDT' && toAsset === 'USDT');
    const isWalletConnected = isWalletConnectedForAsset(fromAsset);

    // Set showDEXSelection to true so compact mode knows DEX is needed
    // Compact mode will only trigger when BOTH wallets are connected (handled in SwapAssetsSection)
    if (needsDEXSelection(fromAsset, toAsset) && !isDirectChainFusion) {
      setShowDEXSelection(true);
    } else {
      setSelectedDEX(null);
      setShowDEXSelection(false);
    }

    if (analysis.needsSmartSolutions && analysis.smartSolutions && analysis.smartSolutions.length > 0) {
      setSmartSolutions(analysis.smartSolutions);
      setShowAllSolutions(false);
      setCurrentSolutionIndex(0);

      const requiresDEXFirst = (analysis.route.operationType === 'DEX + Minter') && needsDEXSelection(fromAsset, toAsset);
      if (requiresDEXFirst && !selectedDEX) {
        setShowSmartSolutions(false);
      } else {
        setShowSmartSolutions(true);
      }
    } else {
      setShowSmartSolutions(false);
      setSmartSolutions([]);
      setSelectedSolution(null);
      setShowAllSolutions(false);
      setCurrentSolutionIndex(0);
    }
  };

  // Smart Solutions handlers
  const handleApproveSolution = (solutionIndex: number) => {
    const solution = smartSolutions[solutionIndex];
    setPendingApproval(solution);
    setShowApprovalModal(true);
  };

  const handleRejectSolution = (solutionIndex: number) => {
    const nextIndex = currentSolutionIndex + 1;
    const isLastSolution = nextIndex >= smartSolutions.length;

    if (!isLastSolution) {
      setCurrentSolutionIndex(nextIndex);
      setSelectedSolution(null);
    } else {
      // User rejected all solutions - cancel transaction
      resetSwapPage();
    }
  };

  const resetSolutionsView = () => {
    setSelectedSolution(null);
    setShowAllSolutions(false);
    setCurrentSolutionIndex(0);
  };

  const handleConfirmApproval = () => {
    if (pendingApproval && swapAnalysis) {
      setSelectedSolution(smartSolutions.indexOf(pendingApproval));
      setShowAllSolutions(false);
      setTransactionData(swapAnalysis);
      setApprovedSmartSolution(pendingApproval);
      // Skip Transaction Preview modal - go straight to execution
      setShowExecutionProgressModal(true);
    }
    setShowApprovalModal(false);
    setPendingApproval(null);
  };

  const handleCancelApproval = () => {
    setShowApprovalModal(false);
    setPendingApproval(null);
  };

  const resetSwapPage = () => {
    setFromAsset('ETH'); // Default to first asset in list
    setToAsset('BTC'); // Bitcoin-only onramp: TO asset always BTC
    setSwapAmount('');
    setSelectedDEX(null);
    setSwapAnalysis(null);
    setShowRouteDetails(false);
    setShowSmartSolutions(false);
    setShowDEXSelection(false);
    setShowCompactMode(false); // Reset compact mode to show swap interface again
    setSmartSolutions([]);
    setSelectedSolution(null);
    setShowAllSolutions(false);
    setPendingApproval(null);
    setTransactionData(null);
  };

  const handleDEXSelectedForICPSwap = (dexId: string) => {
    setSelectedDEX(dexId);

    if (fromAsset && toAsset && swapAmount && parseFloat(swapAmount) > 0) {
      const amount = parseFloat(swapAmount);
      const analysis = analyzeCompleteSwap(fromAsset, toAsset, amount, portfolio, dexId);

      if (analysis.success) {
        setSwapAnalysis(analysis);
        setTransactionData(analysis);

        if (analysis.needsSmartSolutions && analysis.smartSolutions && analysis.smartSolutions.length > 0) {
          setSmartSolutions(analysis.smartSolutions);
          setShowAllSolutions(false);
          setCurrentSolutionIndex(0);
          setShowSmartSolutions(true);
          setShowDEXSelection(false);
          return;
        }

        // Skip Transaction Preview modal - go straight to execution
        setTimeout(() => {
          setShowExecutionProgressModal(true);
        }, 100);
      }
    }
  };

  // Utility functions
  const formatAmount = (amount: number): string => {
    if (!amount || isNaN(amount) || amount === null || amount === undefined) {
      return '0';
    }
    if (amount >= 1) {
      if (amount % 1 === 0) return amount.toString();
      return amount.toFixed(6).replace(/\.?0+$/, '');
    } else {
      return amount.toFixed(6).replace(/\.?0+$/, '');
    }
  };

  const formatNumber = (num: number): string => {
    if (num === 0) return '0';
    if (num < 0.001) return num.toFixed(6).replace(/\.?0+$/, '');
    if (num < 1) return num.toFixed(4).replace(/\.?0+$/, '');
    if (num < 1000) return num.toFixed(2).replace(/\.?0+$/, '');
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-bg text-text-primary min-h-screen">
      <div className="container-app">
        <div className="main-content pt-4 md:pt-8">
          <SwapAssetsSection
            portfolio={portfolio}
            fromAsset={fromAsset}
            toAsset={toAsset}
            swapAmount={swapAmount}
            selectedDEX={selectedDEX}
            swapAnalysis={swapAnalysis}
            showRouteDetails={showRouteDetails}
            showSmartSolutions={showSmartSolutions}
            showDEXSelection={showDEXSelection}
            showCompactMode={showCompactMode}
            setShowCompactMode={setShowCompactMode}
            slippageTolerance={slippageTolerance}
            currentGasPrice={currentGasPrice}
            smartSolutions={smartSolutions}
            selectedSolution={selectedSolution}
            showAllSolutions={showAllSolutions}
            currentSolutionIndex={currentSolutionIndex}
            setFromAsset={setFromAsset}
            setToAsset={setToAsset}
            setSwapAmount={setSwapAmount}
            setSelectedDEX={setSelectedDEX}
            setSlippageTolerance={setSlippageTolerance}
            formatAmount={formatAmount}
            setActiveSection={() => {}} // Not used in standalone page
            setTransactionData={setTransactionData}
            setAuthStep={setAuthStep}
            setShowAuthModal={setShowAuthModal}
            handleApproveSolution={handleApproveSolution}
            handleRejectSolution={handleRejectSolution}
            resetSolutionsView={resetSolutionsView}
            formatNumber={formatNumber}
            onShowTransactionPreview={() => setShowExecutionProgressModal(true)}
            onDEXSelectedForICPSwap={handleDEXSelectedForICPSwap}
            executeSwap={null}
            updatePortfolioAfterSwap={updatePortfolioAfterSwap}
            connectedMetaMask={connectedMetaMask}
            isPlugConnected={!!connectedPlug}
            isConnectingWallet={isConnectingWallet}
            onConnectMetaMask={handleConnectMetaMask}
            onDisconnectMetaMask={handleDisconnectMetaMask}
            onConnectPlug={handleConnectPlug}
            onDisconnectPlug={handleDisconnectPlug}
            getRequiredWallet={getRequiredWallet}
            isWalletConnectedForAsset={isWalletConnectedForAsset}
          />
        </div>
      </div>

      {/* Smart Solutions Approval Modal */}
      <SmartSolutionModal
        isOpen={showApprovalModal}
        pendingApproval={pendingApproval}
        onConfirm={handleConfirmApproval}
        onCancel={handleCancelApproval}
        fromAsset={fromAsset}
        toAsset={toAsset}
        swapAmount={swapAmount}
        swapValueUSD={parseFloat(swapAmount) * (ASSET_PRICES[fromAsset] || 0)}
        onOpenDeposit={() => {}} // Not used in standalone page
      />

      {/* Transaction Preview Modal REMOVED - inline execution now */}

      {/* Execution Progress Modal */}
      <ExecutionProgressModal
        isOpen={showExecutionProgressModal}
        transactionData={transactionData}
        onClose={() => setShowExecutionProgressModal(false)}
        onComplete={() => {
          setShowExecutionProgressModal(false);
          resetSwapPage();
        }}
      />
    </div>
  );
};

export default SwapPage;
