import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usePlugWallet } from '../hooks/usePlugWallet';
import DepositModal from './DepositModal';
import SmartSolutionModal from './SmartSolutionModal';
import TransactionPreviewModal from './TransactionPreviewModal';
import ExecutionProgressModal from './ExecutionProgressModal';
import AuthenticationModal, { AuthStep, TransactionStep } from './AuthenticationModal';
import StakingModal from './StakingModal';
import UnstakingModal from './UnstakingModal';
import NavigationMenu from './NavigationMenu';
import PortfolioOverview from './PortfolioOverview';
import AddAssetsSection from './AddAssetsSection';
import SwapAssetsSection from './SwapAssetsSection';
import MyGardenSection from './MyGardenSection';
import CustomDropdown from './CustomDropdown';
import { MASTER_ASSETS, Portfolio, ASSET_PRICES } from '../../assets/master_asset_data';
import {
  analyzeCompleteSwap,
  needsDEXSelection,
  calculateSwapRoute,
  DEX_OPTIONS,
  CompleteSwapAnalysis
} from '../../assets/master_swap_logic';
import { getBracketConfig, type SwapRoute } from '../../assets/visual_brackets';
import { 
  Settings,      // Slippage Tolerance
  Fuel,          // Gas Optimization
  Lightbulb,     // Smart Solutions / Tips
  CheckCircle,   // Success/Approved
  AlertTriangle, // Warning/Required Step
  Zap,           // Gas/Lightning
  Scale,         // Trade-offs/Balance
  Clock,         // Time/Timer
  Waves,         // Surfer replacement
  PartyPopper,   // Celebration
  ArrowLeftRight, // Swap icon
  ArrowUp,       // Reverse swap up arrow
  ArrowDown,     // Reverse swap down arrow
  Star,          // Best for
  Target,        // Goals/targets
  PieChart,      // Portfolio stats
  Plus,          // Add assets
  DollarSign,    // Money/earnings
  Trophy,        // Achievement/best
  ChevronDown,   // Expandable sections
  TrendingUp,    // Performance metrics
  Rocket,        // Launch/execute
  BarChart3,     // Data/stats
  Wallet,        // Wallet connections
  Circle,        // Generic icons
  Link,          // Connections/links
  Lock,          // Security/authentication
  Menu,          // Hamburger menu
  X,             // Close menu
  Home           // Home icon
} from 'lucide-react';
// Tailwind CSS classes now handle all styling

// Import SVG assets properly for webpack
import ckBTCIcon from '../../assets/images/ckBTC.svg';
import BTCIcon from '../../assets/images/BTC.svg';
import ckETHIcon from '../../assets/images/ckETH.svg';
import ETHIcon from '../../assets/images/ETH.svg';
import ckUSDCIcon from '../../assets/images/ckUSDC.svg';
import USDCIcon from '../../assets/images/USDC.svg';
import ckUSDTIcon from '../../assets/images/ckUSDT.svg';
import USDTIcon from '../../assets/images/USDT.svg';
import ICPIcon from '../../assets/images/ICP.svg';

// Asset SVG icon mapping with proper webpack imports
const ASSET_ICONS: { [key: string]: string } = {
  'ckBTC': ckBTCIcon,
  'BTC': BTCIcon,
  'ckETH': ckETHIcon, 
  'ETH': ETHIcon,
  'ckUSDC': ckUSDCIcon,
  'USDC': USDCIcon,
  'ckUSDT': ckUSDTIcon,
  'USDT': USDTIcon,
  'ICP': ICPIcon,
};

// Helper component for asset icons
const AssetIcon: React.FC<{ asset: string; size?: number }> = ({ asset, size = 16 }) => {
  const iconSrc = ASSET_ICONS[asset];
  if (!iconSrc) return <span>●</span>; // Fallback
  
  return (
    <img 
      src={iconSrc} 
      alt={asset} 
      width={size} 
      height={size} 
      className="flex-shrink-0"
    />
  );
};

// Utility function for formatting amounts
const formatAmount = (amount: number): string => {
  // Handle NaN, undefined, null, or invalid numbers
  if (!amount || isNaN(amount) || amount === null || amount === undefined) {
    return '0';
  }

  if (amount >= 1) {
    // If it's a whole number, show no decimals
    if (amount % 1 === 0) {
      return amount.toString();
    }
    // If it has decimals but >= 1, show up to 6 decimals but remove trailing zeros
    return amount.toFixed(6).replace(/\.?0+$/, '');
  } else {
    // For amounts < 1, show up to 6 decimals but remove trailing zeros
    return amount.toFixed(6).replace(/\.?0+$/, '');
  }
};

// Custom dropdown component with SVG icons

// Import the correct SmartSolution type from master_swap_logic
import { SmartSolution } from '../../assets/master_swap_logic';

// Types for Enhanced Smart Solutions (use the real SmartSolution interface)
type EnhancedSmartSolution = SmartSolution;

// Portfolio scenarios for better demo experience
const PORTFOLIO_SCENARIOS = {
  'empty-hut': {
    ckBTC: 0,
    ckETH: 0,
    ckUSDC: 0,
    ckUSDT: 0,
    ICP: 0
  },
  'bitcoin-hodler': {
    ckBTC: 1.5,
    ckUSDC: 500,
    ckETH: 0,
    ckUSDT: 0,
    ICP: 1000
  },
  'new-user': {
    ICP: 25,
    ckBTC: 0.1,
    ckETH: 0,
    ckUSDC: 0,
    ckUSDT: 0
  },
  'defi-user': {
    ckETH: 1.2,
    ckUSDC: 1000,
    ckBTC: 0.05,
    ckUSDT: 0,
    ICP: 1000
  },
  'gas-poor': {
    ckUSDC: 2000,
    ckUSDT: 500,
    ckBTC: 0,
    ckETH: 0,
    ICP: 1000
  }
};


const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { showSuccess, showError, showMyHutFallback } = useToast();
  const { executeSwap } = usePlugWallet();

  // Portfolio balance update function after successful swaps
  const updatePortfolioAfterSwap = (fromAsset: string, toAsset: string, fromAmount: number, toAmount: number) => {
    setPortfolio(prev => {
      const updated = {
        ...prev,
        [fromAsset]: Math.max(0, (prev[fromAsset] || 0) - fromAmount), // Deduct from source
        [toAsset]: (prev[toAsset] || 0) + toAmount // Add to destination
      };

      console.log(`✅ Portfolio updated: -${fromAmount} ${fromAsset}, +${toAmount} ${toAsset}`);
      console.log('New portfolio balances:', updated);

      return updated;
    });
  };
  
  // Check if navigation state specifies an active section and user flow
  const initialSection = (location.state as any)?.activeSection || 'addAssets';
  const userFlow = (location.state as any)?.userFlow || 'newUser';
  const [activeSection, setActiveSection] = useState(initialSection);
  // Initialize scenario based on user flow
  const initialScenario = userFlow === 'returningUser' ? 'defi-user' : 'empty-hut';
  const [currentScenario, setCurrentScenario] = useState<keyof typeof PORTFOLIO_SCENARIOS>(initialScenario);
  const [portfolio, setPortfolio] = useState<Portfolio>(PORTFOLIO_SCENARIOS[initialScenario]);
  
  // Advanced Swap State
  const [fromAsset, setFromAsset] = useState('');
  const [toAsset, setToAsset] = useState('');
  const [swapAmount, setSwapAmount] = useState('');
  const [selectedDEX, setSelectedDEX] = useState<string | null>(null);
  
  // Portfolio collapse state - always default to closed on page load
  const [portfolioExpanded, setPortfolioExpanded] = useState(false);
  const [swapAnalysis, setSwapAnalysis] = useState<CompleteSwapAnalysis | null>(null);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const [showSmartSolutions, setShowSmartSolutions] = useState(false);
  const [showDEXSelection, setShowDEXSelection] = useState(false);
  const [slippageTolerance, setSlippageTolerance] = useState(5.0);
  const [currentGasPrice, setCurrentGasPrice] = useState(25);
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes for Hut activation
  const [hasEverHadAssets, setHasEverHadAssets] = useState(userFlow === 'returningUser'); // Track if user ever had assets

  // Enhanced Smart Solutions State
  const [smartSolutions, setSmartSolutions] = useState<EnhancedSmartSolution[]>([]);
  const [selectedSolution, setSelectedSolution] = useState<number | null>(null);
  const [showAllSolutions, setShowAllSolutions] = useState(true);
  
  // Mobile Navigation State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Unified Deposit Interface State
  const [selectedDepositAssetUnified, setSelectedDepositAssetUnified] = useState('');

  
  // Smart Solutions Approval Modal State
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<EnhancedSmartSolution | null>(null);

  // Transaction Preview Modal State
  const [showTransactionPreviewModal, setShowTransactionPreviewModal] = useState(false);
  const [approvedSmartSolution, setApprovedSmartSolution] = useState<EnhancedSmartSolution | null>(null);

  // Smart Solutions deposit state
  const [isSmartSolutionDeposit, setIsSmartSolutionDeposit] = useState(false);

  // Execution Progress Modal State
  const [showExecutionProgressModal, setShowExecutionProgressModal] = useState(false);


  // Update portfolio when scenario changes
  const switchScenario = (scenario: keyof typeof PORTFOLIO_SCENARIOS) => {
    setCurrentScenario(scenario);
    setPortfolio(PORTFOLIO_SCENARIOS[scenario]);
    // Reset swap state when switching scenarios
    setFromAsset('');
    setToAsset('');
    setSwapAmount('');
    setSelectedSolution(null);
    setShowAllSolutions(true);
  };

  
  // Deposit Modal State
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);
  const [selectedDepositAsset, setSelectedDepositAsset] = useState<string>('');
  
  // Internet Identity Authentication Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>('authenticate');
  const [transactionData, setTransactionData] = useState<CompleteSwapAnalysis | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [transactionSteps, setTransactionSteps] = useState<TransactionStep[]>([]);
  
  // My Garden Claim Yield State
  const [claimedAssets, setClaimedAssets] = useState<Set<string>>(new Set());
  const [sparklingAssets, setSparklingAssets] = useState<Set<string>>(new Set());
  const [statsExpanded, setStatsExpanded] = useState(false);
  
  // Asset Detail Expansion State
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());

  // Phase 2: Real Staking State Management
  const [stakedAmounts, setStakedAmounts] = useState<Record<string, number>>({});
  const [stakingHistory, setStakingHistory] = useState<Record<string, Array<{
    amount: number;
    timestamp: number;
    type: 'stake' | 'unstake' | 'claim';
    txHash?: string;
  }>>>({});
  const [pendingStaking, setPendingStaking] = useState<Set<string>>(new Set());
  const [selectedStakingAsset, setSelectedStakingAsset] = useState<string | null>(null);
  const [stakingModalOpen, setStakingModalOpen] = useState(false);
  
  // Phase 3: Staking Confirmation Flow
  const [stakingConfirmationOpen, setStakingConfirmationOpen] = useState(false);
  const [pendingStakingAmount, setPendingStakingAmount] = useState<number>(0);
  const [stakingTransactionState, setStakingTransactionState] = useState<'confirming' | 'processing' | 'success'>('confirming');
  
  // Phase 3: Unstaking Flow
  const [unstakingModalOpen, setUnstakingModalOpen] = useState(false);
  const [selectedUnstakingAsset, setSelectedUnstakingAsset] = useState<string | null>(null);
  const [unstakingConfirmationOpen, setUnstakingConfirmationOpen] = useState(false);
  const [pendingUnstakingAmount, setPendingUnstakingAmount] = useState<number>(0);
  const [unstakingTransactionState, setUnstakingTransactionState] = useState<'confirming' | 'processing' | 'success'>('confirming');
  
  // Ethereum Wallet Options for Transaction
  const ETH_WALLET_OPTIONS = [
    { id: 'metamask', name: 'MetaMask', icon: <Wallet className="w-4 h-4 text-warning-400" /> },
    { id: 'coinbase', name: 'Coinbase Wallet', icon: <Circle className="w-4 h-4 text-primary-400" /> },
    { id: 'walletconnect', name: 'WalletConnect', icon: <Link className="w-4 h-4" /> },
    { id: 'rainbow', name: 'Rainbow', icon: <Zap className="w-4 h-4 text-secondary-400" /> }
  ];

  // Execute transaction steps with timing and MyHut integration
  const executeTransactionSteps = async () => {
    const stepTimings = [2000, 1500, 1000, 2000, 4000]; // Different timing for each step

    try {
      // Simulate MyHut canister integration
      // In production, this would call the actual MyHut service
      const isProduction = process.env.NODE_ENV === 'production';
      const isMyHutAvailable = Math.random() > 0.1; // 90% success rate simulation

      if (!isMyHutAvailable) {
        // MyHut service failure - show fallback toast
        showMyHutFallback('Connection timeout to user canister. Please check your network connection.');
        return;
      }

      stepTimings.forEach((timing, index) => {
        setTimeout(() => {
          setTransactionSteps(prev => prev.map((step, i) => {
            if (i === index) {
              return { ...step, completed: true, current: false };
            } else if (i === index + 1) {
              return { ...step, current: true };
            }
            return step;
          }));

          // If this is the last step, move to success and show completion toast
          if (index === stepTimings.length - 1) {
            setTimeout(() => {
              setAuthStep('success');

              // Show success toast with simulation indicator
              showSuccess(
                'Transaction Completed Successfully',
                `Swap executed via ${selectedDEX || 'DEX'} routing. Transaction ID: tx_${Date.now()}`,
                { isSimulated: !isProduction }
              );
            }, 1500);
          }
        }, stepTimings.slice(0, index + 1).reduce((acc, curr) => acc + curr, 0));
      });

    } catch (error) {
      // Handle unexpected errors
      console.error('Transaction execution error:', error);
      showError(
        'Transaction Failed',
        'An unexpected error occurred during transaction execution. Please try again.'
      );
    }
  };

  // Handle Claim Yield with sparkling animation
  const handleClaimYield = (asset: string) => {
    // Start sparkling animation
    setSparklingAssets(prev => new Set([...prev, asset]));
    
    // After animation duration, mark as claimed and stop sparkling
    setTimeout(() => {
      setClaimedAssets(prev => new Set([...prev, asset]));
      setSparklingAssets(prev => {
        const newSet = new Set(prev);
        newSet.delete(asset);
        return newSet;
      });
    }, 2000); // 2 second sparkling animation
  };

  // Phase 2: Real Staking Functions
  const handleStakeAsset = (asset: string, amount: number) => {
    // Add to pending state
    setPendingStaking(prev => new Set([...prev, asset]));
    
    // Simulate staking transaction
    setTimeout(() => {
      // Update staked amounts
      setStakedAmounts(prev => ({
        ...prev,
        [asset]: (prev[asset] || 0) + amount
      }));
      
      // Add to staking history
      setStakingHistory(prev => ({
        ...prev,
        [asset]: [
          ...(prev[asset] || []),
          {
            amount,
            timestamp: Date.now(),
            type: 'stake' as const,
            txHash: `0x${Math.random().toString(16).substring(2, 10)}`
          }
        ]
      }));
      
      // Remove from pending
      setPendingStaking(prev => {
        const newSet = new Set(prev);
        newSet.delete(asset);
        return newSet;
      });
      
      // Close modal
      setStakingModalOpen(false);
      setSelectedStakingAsset(null);
    }, 2000);
  };

  const handleUnstakeAsset = (asset: string, amount: number) => {
    setPendingStaking(prev => new Set([...prev, asset]));
    
    setTimeout(() => {
      setStakedAmounts(prev => ({
        ...prev,
        [asset]: Math.max(0, (prev[asset] || 0) - amount)
      }));
      
      setStakingHistory(prev => ({
        ...prev,
        [asset]: [
          ...(prev[asset] || []),
          {
            amount,
            timestamp: Date.now(),
            type: 'unstake' as const,
            txHash: `0x${Math.random().toString(16).substring(2, 10)}`
          }
        ]
      }));
      
      setPendingStaking(prev => {
        const newSet = new Set(prev);
        newSet.delete(asset);
        return newSet;
      });
    }, 2000);
  };

  const openStakingModal = (asset: string) => {
    setSelectedStakingAsset(asset);
    setStakingModalOpen(true);
    // Reset any previous transaction state
    setStakingTransactionState('confirming');
    setStakingConfirmationOpen(false);
  };

  // Phase 3: Staking Confirmation Functions
  const openStakingConfirmation = (asset: string, amount: number) => {
    // Set the amount first, then other states
    setPendingStakingAmount(amount);
    setSelectedStakingAsset(asset);
    setStakingModalOpen(false);
    setStakingTransactionState('confirming');
    setStakingConfirmationOpen(true);
  };

  const confirmStakingTransaction = () => {
    if (!selectedStakingAsset) return;
    
    setStakingTransactionState('processing');
    
    // Call the existing staking function
    handleStakeAsset(selectedStakingAsset, pendingStakingAmount);
    
    // Show success state after transaction completes
    setTimeout(() => {
      setStakingTransactionState('success');
    }, 2000);
  };

  const closeStakingConfirmation = () => {
    setStakingConfirmationOpen(false);
    setSelectedStakingAsset(null);
    setPendingStakingAmount(0);
    setStakingTransactionState('confirming');
  };

  // Phase 3: Unstaking Functions
  const openUnstakingModal = (asset: string) => {
    setSelectedUnstakingAsset(asset);
    setUnstakingModalOpen(true);
    // Reset any previous transaction state
    setUnstakingTransactionState('confirming');
    setUnstakingConfirmationOpen(false);
  };

  const openUnstakingConfirmation = (asset: string, amount: number) => {
    // Set the amount first, then other states
    setPendingUnstakingAmount(amount);
    setSelectedUnstakingAsset(asset);
    setUnstakingModalOpen(false);
    setUnstakingTransactionState('confirming');
    setUnstakingConfirmationOpen(true);
  };

  const confirmUnstakingTransaction = () => {
    if (!selectedUnstakingAsset) return;
    
    setUnstakingTransactionState('processing');
    
    // Call the existing unstaking function
    handleUnstakeAsset(selectedUnstakingAsset, pendingUnstakingAmount);
    
    // Show success state after transaction completes
    setTimeout(() => {
      setUnstakingTransactionState('success');
    }, 2000);
  };

  const closeUnstakingConfirmation = () => {
    setUnstakingConfirmationOpen(false);
    setSelectedUnstakingAsset(null);
    setPendingUnstakingAmount(0);
    setUnstakingTransactionState('confirming');
  };

  const closeUnstakingModal = () => {
    setUnstakingModalOpen(false);
    setSelectedUnstakingAsset(null);
    // Reset transaction state when closing modal
    setUnstakingTransactionState('confirming');
    setUnstakingConfirmationOpen(false);
  };
  
  // Enhanced DEX Options with Real Stats - FIXED STATS


  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Track when user first gets assets
  useEffect(() => {
    if (calculatePortfolioValue() > 0 && !hasEverHadAssets) {
      setHasEverHadAssets(true);
    }
  }, [portfolio, hasEverHadAssets]);

  
  // Auto-analyze swap when parameters change
  useEffect(() => {
    
    if (fromAsset && toAsset && swapAmount && parseFloat(swapAmount) > 0) {
      // Check for same token swap (user error)
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
      setShowAllSolutions(true);
    }
  }, [fromAsset, toAsset, swapAmount, selectedDEX, portfolio]);

  // Gas price monitoring
  useEffect(() => {
    const updateGasPrice = () => {
      const randomGas = Math.floor(Math.random() * 20) + 15; // 15-35 gwei
      setCurrentGasPrice(randomGas);
    };
    
    updateGasPrice();
    const gasTimer = setInterval(updateGasPrice, 30000); // Update every 30 seconds
    
    return () => clearInterval(gasTimer);
  }, []);


  const updateAdvancedSwapDetails = () => {

    if (!fromAsset || !toAsset || !swapAmount || parseFloat(swapAmount) <= 0) {
      return;
    }

    const amount = parseFloat(swapAmount);

    // STEP 1: Get complete swap analysis (includes comprehensive Smart Solutions)
    const analysis = analyzeCompleteSwap(fromAsset, toAsset, amount, portfolio, selectedDEX || 'ICPSwap');

    if (!analysis.success) {
      setSwapAnalysis(null);
      setShowRouteDetails(false);
      setShowDEXSelection(false);
      setShowSmartSolutions(false);
      return;
    }

    setSwapAnalysis(analysis);

    // STEP 2: Always show route explanation FIRST
    setShowRouteDetails(true);

    // STEP 3: Show DEX selection ONLY if needed (exclude direct Chain Fusion)
    const isDirectChainFusion = analysis.route.operationType === 'Minter Operation' && analysis.isL1Withdrawal;
    if (needsDEXSelection(fromAsset, toAsset) && !isDirectChainFusion) {
      setShowDEXSelection(true);
    } else {
      setSelectedDEX(null);
      setShowDEXSelection(false);
    }

    // STEP 4: Use comprehensive Smart Solutions from analyzeCompleteSwap
    if (analysis.needsSmartSolutions && analysis.smartSolutions && analysis.smartSolutions.length > 0) {
      console.log('🔥 Smart Solutions Available:', analysis.smartSolutions);
      setSmartSolutions(analysis.smartSolutions);
      setShowSmartSolutions(true);
    } else {
      console.log('🔥 No Smart Solutions needed for this swap');
      setShowSmartSolutions(false);
      setSmartSolutions([]);
      setSelectedSolution(null);
      setShowAllSolutions(true);
    }
  };

  // Smart Solutions interaction handlers
  const handleApproveSolution = (solutionIndex: number) => {
    const solution = smartSolutions[solutionIndex];

    // Show approval modal for ALL solution types (including manual_topup)
    // The SmartSolutionModal now handles wallet selection inline for manual_topup
    setPendingApproval(solution);
    setShowApprovalModal(true);
  };

  const handleRejectSolution = (solutionIndex: number) => {
    if (solutionIndex === 0) {
      // If rejecting the first (recommended) solution, show all alternatives
      setShowAllSolutions(true);
      setSelectedSolution(null);

      // Additionally, if user rejects ALL Smart Solutions, offer deposit alternatives
      // This creates a deposit solution for the gas asset they need
      if (smartSolutions.length > 0) {
        const rejectedSolution = smartSolutions[0];
        const description = rejectedSolution.description || rejectedSolution.cost?.description || '';

        // Extract what gas asset they need
        let neededAsset = 'ckETH'; // default
        if (description.includes('ckBTC')) neededAsset = 'ckBTC';
        else if (description.includes('ckETH')) neededAsset = 'ckETH';
        else if (description.includes('ckUSDC')) neededAsset = 'ckUSDC';
        else if (description.includes('ICP')) neededAsset = 'ICP';

        // Create deposit alternative solution
        const depositSolution = {
          id: `deposit_${neededAsset}`,
          type: 'manual_topup' as const,
          title: `Deposit ${neededAsset} to Your Portfolio`,
          description: `Transfer ${neededAsset} from your ICP wallet to your HodlHut portfolio to have sufficient balance for gas fees.`,
          badge: 'ALTERNATIVE' as const,
          userReceives: {
            amount: 0, // No immediate receive since this is a deposit
            asset: neededAsset
          },
          cost: {
            asset: neededAsset,
            amount: rejectedSolution.cost?.amount || '0',
            description: `Deposit ${neededAsset} to portfolio`
          },
          portfolioImpact: {},
          userNeedsTopup: true
        };

        // Add deposit alternative to solutions
        setSmartSolutions(prev => [...prev, depositSolution]);
      }
    } else {
      // For other solutions, just close this specific one
      const updatedSolutions = smartSolutions.filter((_, index) => index !== solutionIndex);
      setSmartSolutions(updatedSolutions);
    }
  };

  const resetSolutionsView = () => {
    setSelectedSolution(null);
    setShowAllSolutions(true);
  };

  // Number formatting helper
  const formatNumber = (num: number): string => {
    if (num === 0) return '0';
    
    // For very small numbers, show up to 6 decimal places but remove trailing zeros
    if (num < 0.001) {
      return num.toFixed(6).replace(/\.?0+$/, '');
    }
    
    // For small numbers, show up to 4 decimal places but remove trailing zeros  
    if (num < 1) {
      return num.toFixed(4).replace(/\.?0+$/, '');
    }
    
    // For larger numbers, show up to 2 decimal places but remove trailing zeros
    if (num < 1000) {
      return num.toFixed(2).replace(/\.?0+$/, '');
    }
    
    // For very large numbers, use locale string with commas
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // Format text with numbers properly (removes unnecessary zeros)
  const formatTextWithNumbers = (text: string): string => {
    // Match numbers with excessive decimal places and format them
    return text.replace(/(\d+\.\d{2,})/g, (match) => {
      const num = parseFloat(match);
      return formatNumber(num);
    });
  };

  // Smart Solutions Approval Modal Handlers
  const handleConfirmApproval = () => {
    if (pendingApproval && swapAnalysis) {
      setSelectedSolution(smartSolutions.indexOf(pendingApproval));
      setShowAllSolutions(false);

      // Direct transition to Transaction Preview modal
      setTransactionData(swapAnalysis);
      setApprovedSmartSolution(pendingApproval); // Pass the approved Smart Solution
      setShowTransactionPreviewModal(true);
    }

    setShowApprovalModal(false);
    setPendingApproval(null);
  };

  const handleCancelApproval = () => {
    setShowApprovalModal(false);
    setPendingApproval(null);
  };

  // Reset swap assets page to fresh state
  const resetSwapAssetsPage = () => {
    setFromAsset('');
    setToAsset('');
    setSwapAmount('');
    setSelectedDEX(null); // Reset DEX selection to show "Select" instead of "Selected"
    setSwapAnalysis(null);
    setShowRouteDetails(false);
    setShowSmartSolutions(false);
    setShowDEXSelection(false);
    setSmartSolutions([]);
    setSelectedSolution(null);
    setShowAllSolutions(false);
    setPendingApproval(null);
    setTransactionData(null);
  };

  // Handle DEX selection for ICP ecosystem swaps (direct to Transaction Preview)
  const handleDEXSelectedForICPSwap = (dexId: string) => {
    console.log('🎯 DEX selected for ICP ecosystem swap:', dexId);

    // Update selected DEX
    setSelectedDEX(dexId);

    // Generate swap analysis with selected DEX
    if (fromAsset && toAsset && swapAmount && parseFloat(swapAmount) > 0) {
      const amount = parseFloat(swapAmount);
      const analysis = analyzeCompleteSwap(fromAsset, toAsset, amount, portfolio, dexId);

      if (analysis.success) {
        setSwapAnalysis(analysis);
        setTransactionData(analysis);

        // Immediately open Transaction Preview modal
        setTimeout(() => {
          setShowTransactionPreviewModal(true);
        }, 100); // Small delay to ensure state is set
      } else {
        console.error('Failed to generate swap analysis for DEX selection');
      }
    }
  };



  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const calculatePortfolioValue = (): number => {
    return Object.entries(portfolio).reduce((total, [asset, amount]) => {
      const assetData = MASTER_ASSETS[asset];
      return total + (assetData?.price || 0) * amount;
    }, 0);
  };

  const calculatePortfolioDiversity = () => {
    const assetCount = Object.keys(portfolio).filter(asset => portfolio[asset] > 0).length;
    if (assetCount >= 6) return 2.2;
    if (assetCount >= 4) return 1.8;
    if (assetCount >= 2) return 1.3;
    return 1.0;
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Navigate to home and reload page to clear all connections
      navigate('/');
      window.location.reload();
    } catch (error) {
    }
  };

  const renderIntegratedHeader = () => (
    <div className="bg-surface-2/90 border border-white/10 rounded-xl mb-3 md:mb-6">
      {/* Mobile Integrated Header */}
      <div className="md:hidden">
        <div className="flex items-center justify-between p-3">
          {/* Left: Hamburger Menu */}
          <button
            className="btn-primary min-h-[44px] px-3"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          
          {/* Center: Status Info */}
          <div className="flex-1 mx-3 text-center">
            {calculatePortfolioValue() > 0 ? (
              <div className="text-success-400 text-sm font-medium">
                <PieChart className="inline w-4 h-4 mr-1" />
                ${calculatePortfolioValue().toLocaleString()}
              </div>
            ) : hasEverHadAssets ? (
              <div className="text-error-400 text-xs font-medium">
                <Clock className="inline w-4 h-4 mr-1" />
                Add Assets to Keep Activated: {formatTime(timeRemaining)}
              </div>
            ) : (
              <div className="text-warning-400 text-xs font-medium">
                <Clock className="inline w-4 h-4 mr-1" />
                Activate: {formatTime(timeRemaining)}
              </div>
            )}
          </div>
          
          {/* Right: Connection Status */}
          <div className="flex items-center text-warning-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-warning-400 mr-1"></span>
            Live
          </div>
        </div>
        
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-overlay-1" onClick={() => setMobileMenuOpen(false)}>
            <div 
              className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-surface-1 shadow-2xl transform transition-transform duration-300 ease-in-out"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Menu Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-lg font-bold text-text-primary">My Hut</h2>
                <button
                  className="btn-secondary p-2"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Mobile Menu Items */}
              <nav className="p-6 space-y-4">
                <button
                  className={`w-full text-left p-4 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                    activeSection === 'addAssets' 
                      ? 'bg-primary-600/15 border border-primary-500 text-primary-400' 
                      : 'bg-surface-2 hover:bg-surface-3 text-text-primary border border-white/10'
                  }`}
                  onClick={() => {
                    setActiveSection('addAssets');
                    setMobileMenuOpen(false);
                  }}
                >
                  <Plus size={20} />
                  <span className="font-medium">Add Assets</span>
                </button>
                
                <button
                  className={`w-full text-left p-4 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                    activeSection === 'swapAssets'
                      ? 'bg-warning-400/15 border border-warning-400 text-warning-300'
                      : 'bg-surface-2 hover:bg-surface-3 text-text-primary border border-white/10'
                  }`}
                  onClick={() => {
                    setActiveSection('swapAssets');
                    setMobileMenuOpen(false);
                  }}
                >
                  <ArrowLeftRight size={20} />
                  <span className="font-medium">Swap Assets</span>
                </button>
                
                <button
                  className={`w-full text-left p-4 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                    activeSection === 'myGarden'
                      ? 'bg-success-600/15 border border-success-500 text-success-400'
                      : 'bg-surface-2 hover:bg-surface-3 text-text-primary border border-white/10'
                  }`}
                  onClick={() => {
                    setActiveSection('myGarden');
                    setMobileMenuOpen(false);
                  }}
                >
                  <div className="w-5 h-5 flex items-center justify-center">🌱</div>
                  <span className="font-medium">My Garden</span>
                </button>
                
                <button
                  className={`w-full text-left p-4 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                    activeSection === 'transactionHistory'
                      ? 'bg-error-600/15 border border-error-500 text-error-400'
                      : 'bg-surface-2 hover:bg-surface-3 text-text-primary border border-white/10'
                  }`}
                  onClick={() => {
                    setActiveSection('transactionHistory');
                    setMobileMenuOpen(false);
                  }}
                >
                  <BarChart3 size={20} />
                  <span className="font-medium">History</span>
                </button>
                
                <button
                  className="w-full text-left p-4 rounded-xl flex items-center gap-3 transition-all duration-200 bg-surface-2 hover:bg-surface-3 text-text-primary border border-white/10"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                >
                  <Lock size={20} />
                  <span className="font-medium">LogOut</span>
                </button>
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Status Bar - Hidden on Mobile */}
      <div className="hidden md:block">
        <div className="flex justify-between items-center flex-wrap gap-4 text-sm text-text-secondary p-3">
          {calculatePortfolioValue() > 0 ? (
            // Assets deposited: Show Portfolio value + Connected status
            <>
              <div className="flex items-center text-success-400"><PieChart className="inline w-4 h-4 mr-1" /> Portfolio: ${calculatePortfolioValue().toLocaleString()}</div>
              <div className="flex items-center text-warning-400"><span className="w-2 h-2 rounded-full bg-warning-400 mr-2"></span> Connected Live Onchain (Demo Mode)</div>
            </>
          ) : hasEverHadAssets ? (
            // Had assets but swapped everything out: Warning message
            <>
              <div className="flex items-center text-error-400"><Clock className="inline w-4 h-4 mr-1" /> Add Assets to My Hut to Keep Activated: {formatTime(timeRemaining)}</div>
              <div className="flex items-center text-error-400"><span className="w-2 h-2 rounded-full bg-error-400 mr-2"></span> Connected Live Onchain (Demo Mode)</div>
            </>
          ) : (
            // No assets yet: Show Activation countdown + Connected status
            <>
              <div className="flex items-center text-warning-400"><Clock className="inline w-4 h-4 mr-1" /> Add Assets to activate your Sovereign Hut: {formatTime(timeRemaining)}</div>
              <div className="flex items-center text-warning-400"><span className="w-2 h-2 rounded-full bg-warning-400 mr-2"></span> Connected Live Onchain (Demo Mode)</div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderTransactionHistorySection = () => {
    const mockTransactions = [
      {
        id: 1,
        type: 'Chain Fusion',
        from: 'ckBTC',
        to: 'USDC',
        amount: '0.05',
        value: '$4,875.12',
        fee: '$9.60',
        time: '2 hours ago',
        status: 'Completed'
      },
      {
        id: 2,
        type: 'DEX Swap',
        from: 'ckUSDT',
        to: 'ckUSDC',
        amount: '2,500',
        value: '$2,500.00',
        fee: '$7.50',
        time: '1 day ago',
        status: 'Completed'
      },
      {
        id: 3,
        type: 'Chain Fusion',
        from: 'ckUSDC',
        to: 'USDC',
        amount: '10.5',
        value: '$2,520.00',
        fee: '$0.24',
        time: '2 days ago',
        status: 'Completed'
      },
      {
        id: 4,
        type: 'DEX + Chain Fusion',
        from: 'ckUSDC',
        to: 'BTC',
        amount: '48,800',
        value: '$48,800.00',
        fee: '$48.80',
        time: '3 days ago',
        status: 'Completed'
      },
      {
        id: 5,
        type: 'Deposit',
        from: 'ETH',
        to: 'ckETH',
        amount: '1.25',
        value: '$4,000.00',
        fee: '$12.00',
        time: '5 days ago',
        status: 'Completed'
      }
    ];

    return (
      <div className="rounded-2xl border border-white/10 bg-surface-1 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-text-primary mb-2">Transaction History</h2>
          <p className="text-text-secondary">View all your trading and deposit activity</p>
        </div>
        
        <div className="space-y-4">
          {mockTransactions.map((tx) => (
            <div key={tx.id} className="rounded-xl border border-white/10 bg-surface-2 p-4 hover:bg-surface-3 transition-all duration-300">
              <div className="flex justify-between items-start mb-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-primary-600/15 text-primary-400 px-3 py-1 text-xs font-semibold">
                  {tx.type}
                </span>
                <span className="text-text-muted text-sm">{tx.time}</span>
              </div>
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <AssetIcon asset={tx.from} size={20} />
                  <span className="text-text-primary font-medium">{tx.amount} {tx.from}</span>
                  <span className="text-text-muted">→</span>
                  <AssetIcon asset={tx.to} size={20} />
                  <span className="text-text-primary font-medium">{tx.to}</span>
                </div>
                
                <div className="text-right">
                  <div className="text-text-primary font-semibold">{tx.value}</div>
                  <div className="text-text-muted text-sm">Fee: {tx.fee}</div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <span className="inline-flex items-center gap-1 text-success-400 text-sm font-medium">
                  ✅ {tx.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };


  // Deposit Modal Functions
  const startDeposit = (asset: string) => {
    setSelectedDepositAsset(asset);
    setIsDepositModalOpen(true);
  };
  
  const closeDepositModal = () => {
    setIsDepositModalOpen(false);
    setSelectedDepositAsset('');
  };
  
  const handleDepositComplete = (asset: string, amount: number) => {
    // Update portfolio with deposited asset
    setPortfolio(prev => ({
      ...prev,
      [asset]: (prev[asset] || 0) + amount
    }));

    // Show success message
    showSuccess(`Successfully deposited ${amount} ${asset}`);

    // Close deposit modal
    setIsDepositModalOpen(false);
    setSelectedDepositAsset('');

    // If this was a Smart Solution deposit, continue to Transaction Preview
    if (isSmartSolutionDeposit && swapAnalysis && approvedSmartSolution) {
      setTimeout(() => {
        setIsSmartSolutionDeposit(false);
        setTransactionData(swapAnalysis);
        setShowTransactionPreviewModal(true);
      }, 500); // Small delay for better UX
    }
  };

  // Handler for Smart Solution deposits
  const handleSmartSolutionDeposit = (asset: string) => {
    setIsSmartSolutionDeposit(true);
    setSelectedDepositAsset(asset);
    setIsDepositModalOpen(true);
    setShowApprovalModal(false); // Close Smart Solution modal
  };

  // Reset Add Assets component to initial state
  const resetAddAssetsComponent = () => {
    setSelectedDepositAssetUnified('');
  };

  // Balance display logic for deposit assets
  const renderBalanceDisplay = () => {
    if (!selectedDepositAssetUnified) {
      return '';
    }
    
    // Check if selected asset is from ICP Ecosystem (has balances in portfolio)
    const icpEcosystemAssets = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'];
    const isIcpEcosystemAsset = icpEcosystemAssets.includes(selectedDepositAssetUnified);
    
    if (isIcpEcosystemAsset) {
      const balance = portfolio[selectedDepositAssetUnified] || 0;
      if (balance > 0) {
        return (
          <>
            Balance: {formatAmount(balance)} {selectedDepositAssetUnified}
            <span className="mx-2">•</span>
            <span className="text-success-400">
              ${(balance * (MASTER_ASSETS[selectedDepositAssetUnified]?.price || 0)).toLocaleString()}
            </span>
          </>
        );
      } else {
        return `Balance: 0 ${selectedDepositAssetUnified}`;
      }
    } else {
      // For L1 assets (BTC, ETH, etc.), show deposit flow message
      return 'Deposit to receive chain-key tokens in your portfolio';
    }
  };

  // Generate swap FROM asset options based on portfolio balances




  // Render staking benefits display with diversity multiplier
  const renderStakingBenefits = () => {
    // Calculate diversity multiplier for modal context
    const modalAssetsList = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'];
    const modalAssetsWithBalance = modalAssetsList.filter(asset => portfolio[asset] && portfolio[asset] > 0);
    const modalCalculateDiversityMultiplier = () => {
      const stakedCount = modalAssetsWithBalance.filter(asset => stakedAmounts[asset] > 0).length;
      const multipliers = [1.0, 1.5, 2.0, 2.25, 2.5, 2.5];
      return multipliers[stakedCount] || 1.0;
    };
    const currentMultiplier = modalCalculateDiversityMultiplier();
    
    return (
      <div className="bg-surface-2 border border-white/10 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-medium text-text-primary mb-3">Staking Benefits</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-text-secondary">Base APY</span>
            <span className="text-success-400 font-medium">3.0%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Current Diversity Multiplier</span>
            <span className="text-warning-400 font-medium">{currentMultiplier.toFixed(2)}x</span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-2">
            <span className="text-text-primary font-medium">Effective APY</span>
            <span className="text-success-400 font-bold">
              {(3.0 * currentMultiplier).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render diversity boost notice for staking modal
  const renderDiversityBoostNotice = () => {
    const modalAssetsList = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'];
    const modalAssetsWithBalance = modalAssetsList.filter(asset => portfolio[asset] && portfolio[asset] > 0);
    const modalCalculateDiversityMultiplier = () => {
      const stakedCount = modalAssetsWithBalance.filter(asset => stakedAmounts[asset] > 0).length;
      const multipliers = [1.0, 1.5, 2.0, 2.25, 2.5, 2.5];
      return multipliers[stakedCount] || 1.0;
    };
    
    const currentStakedCount = modalAssetsWithBalance.filter(asset => stakedAmounts[asset] > 0).length;
    const willHaveStaked = stakedAmounts[selectedStakingAsset] > 0;
    const newStakedCount = willHaveStaked ? currentStakedCount : currentStakedCount + 1;
    const currentMultiplier = modalCalculateDiversityMultiplier();
    const newMultiplier = [1.0, 1.5, 2.0, 2.25, 2.5, 2.5][newStakedCount] || 1.0;
    
    if (newMultiplier > currentMultiplier) {
      return (
        <div className="bg-warning-400/15 border border-warning-400/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-warning-400" />
            <span className="text-sm font-medium text-warning-300">Diversity Bonus!</span>
          </div>
          <p className="text-xs text-warning-200">
            This will be your first stake in {selectedStakingAsset}, boosting your diversity multiplier from {currentMultiplier.toFixed(2)}x to {newMultiplier.toFixed(2)}x!
          </p>
        </div>
      );
    }
    return null;
  };

  // Render staking transaction details with diversity multiplier calculations
  const renderStakingTransactionDetails = () => {
    const modalAssetsList = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'];
    const modalAssetsWithBalance = modalAssetsList.filter(asset => portfolio[asset] && portfolio[asset] > 0);
    const modalCalculateDiversityMultiplier = () => {
      const stakedCount = modalAssetsWithBalance.filter(asset => stakedAmounts[asset] > 0).length;
      const multipliers = [1.0, 1.5, 2.0, 2.25, 2.5, 2.5];
      return multipliers[stakedCount] || 1.0;
    };
    
    const currentMultiplier = modalCalculateDiversityMultiplier();
    const willHaveStaked = stakedAmounts[selectedStakingAsset] > 0;
    const newStakedCount = willHaveStaked ? modalAssetsWithBalance.filter(asset => stakedAmounts[asset] > 0).length : modalAssetsWithBalance.filter(asset => stakedAmounts[asset] > 0).length + 1;
    const newMultiplier = [1.0, 1.5, 2.0, 2.25, 2.5, 2.5][newStakedCount] || 1.0;
    const assetPrice = MASTER_ASSETS[selectedStakingAsset]?.price || 0;
    const weeklyYield = pendingStakingAmount * assetPrice * (3.0/100/52) * newMultiplier;
    
    return (
      <div className="bg-surface-2 border border-white/10 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-medium text-text-primary mb-3">Transaction Details</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Amount</span>
            <span className="text-text-primary font-medium">{formatAmount(pendingStakingAmount)} {selectedStakingAsset}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Network Fee</span>
            <span className="text-success-400 font-medium">FREE</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Base APY</span>
            <span className="text-success-400 font-medium">3.0%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Diversity Multiplier</span>
            <span className="text-warning-400 font-medium">
              {currentMultiplier.toFixed(2)}x → {newMultiplier.toFixed(2)}x
            </span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-3 font-medium">
            <span className="text-text-primary">Weekly Yield</span>
            <span className="text-success-400">${weeklyYield.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render unstaking impact analysis showing current position and yield details
  const renderUnstakingImpactAnalysis = () => {
    const modalAssetsList = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'];
    const modalAssetsWithBalance = modalAssetsList.filter(asset => portfolio[asset] && portfolio[asset] > 0);
    const modalCalculateDiversityMultiplier = () => {
      const stakedCount = modalAssetsWithBalance.filter(asset => stakedAmounts[asset] > 0).length;
      const multipliers = [1.0, 1.5, 2.0, 2.25, 2.5, 2.5];
      return multipliers[stakedCount] || 1.0;
    };
    
    const currentMultiplier = modalCalculateDiversityMultiplier();
    const currentStaked = stakedAmounts[selectedUnstakingAsset] || 0;
    const assetPrice = MASTER_ASSETS[selectedUnstakingAsset]?.price || 0;
    const currentWeeklyYield = currentStaked * assetPrice * (3.0/100/52) * currentMultiplier;
    
    return (
      <div className="bg-surface-2 border border-white/10 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-medium text-text-primary mb-3">Current Position</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-text-secondary">Staked Amount</span>
            <span className="text-text-primary font-medium">{formatAmount(currentStaked)} {selectedUnstakingAsset}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Current APY</span>
            <span className="text-success-400 font-medium">{(3.0 * currentMultiplier).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Diversity Multiplier</span>
            <span className="text-warning-400 font-medium">{currentMultiplier.toFixed(2)}x</span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-2 font-medium">
            <span className="text-text-primary">Weekly Yield</span>
            <span className="text-success-400">${currentWeeklyYield.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render unstaking transaction impact analysis with yield loss calculation
  const renderUnstakingTransactionImpact = () => {
    const modalAssetsList = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'];
    const modalAssetsWithBalance = modalAssetsList.filter(asset => portfolio[asset] && portfolio[asset] > 0);
    const modalCalculateDiversityMultiplier = () => {
      const stakedCount = modalAssetsWithBalance.filter(asset => stakedAmounts[asset] > 0).length;
      const multipliers = [1.0, 1.5, 2.0, 2.25, 2.5, 2.5];
      return multipliers[stakedCount] || 1.0;
    };
    
    const currentMultiplier = modalCalculateDiversityMultiplier();
    const currentStaked = stakedAmounts[selectedUnstakingAsset] || 0;
    const newStaked = currentStaked - (pendingUnstakingAmount || 0);
    const assetPrice = MASTER_ASSETS[selectedUnstakingAsset]?.price || 0;
    const yieldLoss = (pendingUnstakingAmount || 0) * assetPrice * (3.0/100/52) * currentMultiplier;
    
    return (
      <div className="bg-surface-2 border border-white/10 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-medium text-text-primary mb-3">Impact Analysis</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Amount to Unstake</span>
            <span className="text-text-primary font-medium">{formatAmount(pendingUnstakingAmount || 0)} {selectedUnstakingAsset}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Remaining Staked</span>
            <span className="text-text-primary font-medium">{formatAmount(newStaked)} {selectedUnstakingAsset}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Network Fee</span>
            <span className="text-success-400 font-medium">FREE</span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-3 font-medium">
            <span className="text-text-primary">Weekly Yield Loss</span>
            <span className="text-error-400">-${yieldLoss.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  // Smart decimal formatting - remove decimals for whole numbers >= 1

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'addAssets':
        return (
          <AddAssetsSection
            portfolio={portfolio}
            selectedDepositAssetUnified={selectedDepositAssetUnified}
            setSelectedDepositAssetUnified={setSelectedDepositAssetUnified}
            renderBalanceDisplay={renderBalanceDisplay}
            startDeposit={startDeposit}
            formatAmount={formatAmount}
          />
        );
      case 'swapAssets':
        return (
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
            slippageTolerance={slippageTolerance}
            currentGasPrice={currentGasPrice}
            smartSolutions={smartSolutions}
            selectedSolution={selectedSolution}
            showAllSolutions={showAllSolutions}
            setFromAsset={setFromAsset}
            setToAsset={setToAsset}
            setSwapAmount={setSwapAmount}
            setSelectedDEX={setSelectedDEX}
            setSlippageTolerance={setSlippageTolerance}
            formatAmount={formatAmount}
            setActiveSection={setActiveSection}
            setTransactionData={setTransactionData}
            setAuthStep={setAuthStep}
            setShowAuthModal={setShowAuthModal}
            handleApproveSolution={handleApproveSolution}
            handleRejectSolution={handleRejectSolution}
            resetSolutionsView={resetSolutionsView}
            formatNumber={formatNumber}
            onShowTransactionPreview={() => setShowTransactionPreviewModal(true)}
            onDEXSelectedForICPSwap={handleDEXSelectedForICPSwap}
            executeSwap={executeSwap}
            updatePortfolioAfterSwap={updatePortfolioAfterSwap}
          />
        );
      case 'myGarden':
        return (
          <MyGardenSection
            portfolio={portfolio}
            stakedAmounts={stakedAmounts}
            pendingStaking={pendingStaking}
            expandedAssets={expandedAssets}
            claimedAssets={claimedAssets}
            sparklingAssets={sparklingAssets}
            statsExpanded={statsExpanded}
            setExpandedAssets={setExpandedAssets}
            setStatsExpanded={setStatsExpanded}
            handleClaimYield={handleClaimYield}
            openStakingModal={openStakingModal}
            openUnstakingModal={openUnstakingModal}
            formatAmount={formatAmount}
          />
        );
      case 'transactionHistory':
        return renderTransactionHistorySection();
      default:
        return (
          <AddAssetsSection
            portfolio={portfolio}
            selectedDepositAssetUnified={selectedDepositAssetUnified}
            setSelectedDepositAssetUnified={setSelectedDepositAssetUnified}
            renderBalanceDisplay={renderBalanceDisplay}
            startDeposit={startDeposit}
            formatAmount={formatAmount}
          />
        );
    }
  };

  return (
    <div className="bg-bg text-text-primary min-h-screen">
      <div className="container-app">
        {renderIntegratedHeader()}
        
        <NavigationMenu
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          onLogout={handleLogout}
        />
        
        {/* Portfolio Overview - Now above main content */}
        <PortfolioOverview
          portfolio={portfolio}
          portfolioExpanded={portfolioExpanded}
          setPortfolioExpanded={setPortfolioExpanded}
          calculatePortfolioValue={calculatePortfolioValue}
          formatAmount={formatAmount}
        />
        
        <div className="main-content pt-4 md:pt-8">
          <div className="content-area">
            {renderActiveSection()}
          </div>
        </div>
      </div>
      
      {/* Deposit Modal */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={closeDepositModal}
        selectedAsset={selectedDepositAsset}
        onDepositComplete={handleDepositComplete}
        onContinue={isSmartSolutionDeposit ? undefined : resetAddAssetsComponent}
        isSmartSolutionDeposit={isSmartSolutionDeposit}
      />

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
        onOpenDeposit={handleSmartSolutionDeposit}
      />

      {/* Transaction Preview Modal */}
      <TransactionPreviewModal
        isOpen={showTransactionPreviewModal}
        transactionData={transactionData}
        approvedSmartSolution={approvedSmartSolution}
        onClose={() => {
          setShowTransactionPreviewModal(false);
          setApprovedSmartSolution(null); // Clear approved Smart Solution
          // Reset entire swap page when transaction is cancelled
          resetSwapAssetsPage();
        }}
        onExecute={() => {
          console.log('🚀 TransactionPreviewModal onExecute called!');

          // Execute the swap and update portfolio in demo mode
          if (transactionData) {
            const isDemoMode = !(window as any).ic || process.env.NODE_ENV === 'development';

            if (isDemoMode) {
              console.log('🎮 Demo mode: Executing swap from TransactionPreviewModal');

              // Update portfolio balances after successful demo swap
              if (fromAsset && toAsset && swapAmount && transactionData) {
                const fromAmount = parseFloat(swapAmount);

                console.log('📊 Demo portfolio update from TransactionPreviewModal:', {
                  fromAsset,
                  toAsset,
                  fromAmount,
                  isL1Withdrawal: transactionData.isL1Withdrawal,
                  feeRequirements: transactionData.feeRequirements
                });

                // Use the comprehensive fee breakdown from Transaction Preview
                setPortfolio(prev => {
                  const updated = { ...prev };

                  // Calculate total deduction for source asset (sent amount + fees in same asset)
                  let totalSourceAssetDeduction = fromAmount;

                  // Add any fees that are paid in the same asset as the source
                  if (transactionData.feeRequirements) {
                    transactionData.feeRequirements.forEach(fee => {
                      if (fee.token === fromAsset && fee.amount) {
                        totalSourceAssetDeduction += fee.amount;
                        console.log(`💸 Adding ${fee.amount} ${fee.token} fee to source asset deduction (${fee.description})`);
                      }
                    });
                  }

                  // Deduct total from source asset
                  updated[fromAsset] = Math.max(0, (prev[fromAsset] || 0) - totalSourceAssetDeduction);
                  console.log(`💸 Total deducted from ${fromAsset}: ${totalSourceAssetDeduction} (${fromAmount} sent + ${totalSourceAssetDeduction - fromAmount} fees)`);

                  // Deduct fees that are paid in different assets
                  if (transactionData.feeRequirements) {
                    transactionData.feeRequirements.forEach(fee => {
                      if (fee.token !== fromAsset && fee.token && fee.amount) {
                        const feeAmount = fee.amount;
                        updated[fee.token] = Math.max(0, (prev[fee.token] || 0) - feeAmount);
                        console.log(`💸 Deducted ${feeAmount} ${fee.token} for ${fee.description}`);
                      }
                    });
                  }

                  // For L1 withdrawals, do NOT add destination asset (goes to external wallet)
                  // For ICP ecosystem swaps, add destination asset
                  if (!transactionData.isL1Withdrawal && swapAnalysis?.outputAmount) {
                    const toAmount = swapAnalysis.outputAmount;
                    updated[toAsset] = (prev[toAsset] || 0) + toAmount;
                    console.log(`💰 Added ${toAmount} ${toAsset} (destination asset)`);
                  } else if (transactionData.isL1Withdrawal) {
                    console.log('🌉 L1 withdrawal: Destination asset sent to external wallet, not added to portfolio');
                  }

                  console.log('✅ Portfolio updated with all fees deducted:', updated);
                  return updated;
                });

                console.log('✅ Demo portfolio updated successfully from TransactionPreviewModal');
              }
            }
          }

          setShowTransactionPreviewModal(false);
          // Open ExecutionProgressModal to show transaction progress
          setShowExecutionProgressModal(true);
        }}
      />

      {/* Internet Identity Authentication Modal */}
      <AuthenticationModal
        isOpen={showAuthModal}
        transactionData={transactionData}
        authStep={authStep}
        selectedWallet={selectedWallet}
        selectedDEX={selectedDEX || 'ICPSwap'}
        transactionSteps={transactionSteps}
        onClose={() => setShowAuthModal(false)}
        onStepChange={setAuthStep}
        onReset={() => {
          setAuthStep('authenticate');
          setTransactionData(null);
          setSelectedWallet('');
          setTransactionSteps([]);
        }}
        onSetTransactionSteps={setTransactionSteps}
      />

      {/* Staking Modal */}
      <StakingModal
        isOpen={stakingModalOpen}
        selectedAsset={selectedStakingAsset}
        portfolio={portfolio}
        stakedAmounts={stakedAmounts}
        onClose={() => {
          setStakingModalOpen(false);
          setSelectedStakingAsset(null);
          // Reset transaction state when closing modal
          setStakingTransactionState('confirming');
          setStakingConfirmationOpen(false);
        }}
        onStakingConfirmation={openStakingConfirmation}
      />

      {/* Staking Confirmation Modal */}
      {stakingConfirmationOpen && selectedStakingAsset && (
        <div className="fixed inset-0 bg-overlay-1 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-1 rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/10">
            {stakingTransactionState === 'confirming' && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="heading-3 text-text-primary m-0">
                    Confirm Staking
                  </h2>
                  <button 
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-2 text-text-secondary hover:bg-surface-3 transition-colors"
                    onClick={closeStakingConfirmation}
                  >
                    <X size={18} />
                  </button>
                </div>
                
                {/* Transaction Summary */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-surface-2 rounded-full">
                    <AssetIcon asset={selectedStakingAsset} size={40} />
                  </div>
                  <div className="text-lg font-bold text-text-primary mb-2">
                    Staking {formatAmount(pendingStakingAmount)} {selectedStakingAsset}
                  </div>
                  <div className="text-sm text-text-muted">
                    ~${formatAmount(pendingStakingAmount * (MASTER_ASSETS[selectedStakingAsset]?.price || 0))}
                  </div>
                </div>
                
                {/* Transaction Details */}
                {renderStakingTransactionDetails()}
                
                {/* Estimated Processing Time */}
                <div className="bg-primary-600/10 border border-primary-400/20 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-primary-400" />
                    <span className="text-sm font-medium text-primary-300">Processing Time</span>
                  </div>
                  <p className="text-xs text-primary-200">
                    Staking typically completes in ~2-3 seconds. You'll receive a transaction hash for tracking.
                  </p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button 
                    className="flex-1 btn-secondary py-3"
                    onClick={closeStakingConfirmation}
                  >
                    Cancel
                  </button>
                  <button 
                    className="flex-1 btn-primary py-3"
                    onClick={confirmStakingTransaction}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Stake
                  </button>
                </div>
              </>
            )}
            
            {stakingTransactionState === 'processing' && (
              <>
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-primary-600 rounded-full animate-pulse">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mb-2">Processing Transaction</h3>
                  <p className="text-text-secondary mb-4">
                    Staking {formatAmount(pendingStakingAmount)} {selectedStakingAsset}...
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-400"></div>
                    <span>Please wait while we process your transaction</span>
                  </div>
                </div>
              </>
            )}
            
            {stakingTransactionState === 'success' && (
              <>
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-success-600 rounded-full">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mb-2">Staking Successful!</h3>
                  <p className="text-text-secondary mb-4">
                    Successfully staked {formatAmount(pendingStakingAmount)} {selectedStakingAsset}
                  </p>
                  
                  <div className="bg-surface-2 border border-white/10 rounded-xl p-4 mb-6 text-left">
                    <div className="text-xs text-text-muted mb-2">Transaction Hash:</div>
                    <div className="font-mono text-xs text-text-primary break-all">
                      0x{Math.random().toString(16).substring(2, 10)}...{Math.random().toString(16).substring(2, 6)}
                    </div>
                  </div>
                  
                  <div className="text-sm text-success-400 mb-6">
                    🌱 Your assets are now growing! Check back regularly to claim your yield.
                  </div>
                  
                  <button 
                    className="w-full btn-primary py-3"
                    onClick={closeStakingConfirmation}
                  >
                    <PartyPopper className="w-4 h-4 mr-2" />
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Unstaking Modal */}
      <UnstakingModal
        isOpen={unstakingModalOpen}
        selectedAsset={selectedUnstakingAsset}
        portfolio={portfolio}
        stakedAmounts={stakedAmounts}
        onClose={closeUnstakingModal}
        onUnstakingConfirmation={openUnstakingConfirmation}
      />

      {/* Execution Progress Modal */}
      <ExecutionProgressModal
        isOpen={showExecutionProgressModal}
        transactionData={transactionData}
        onClose={() => setShowExecutionProgressModal(false)}
        onComplete={() => {
          setShowExecutionProgressModal(false);
          // Reset entire swap page when execution is complete
          resetSwapAssetsPage();
        }}
      />

      {/* Unstaking Confirmation Modal */}
      {unstakingConfirmationOpen && selectedUnstakingAsset && (
        <div className="fixed inset-0 bg-overlay-1 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-1 rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/10">
            {unstakingTransactionState === 'confirming' && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="heading-3 text-text-primary m-0">
                    Confirm Unstaking
                  </h2>
                  <button 
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-2 text-text-secondary hover:bg-surface-3 transition-colors"
                    onClick={closeUnstakingConfirmation}
                  >
                    <X size={18} />
                  </button>
                </div>
                
                {/* Transaction Summary */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-error-600/20 rounded-full">
                    <AssetIcon asset={selectedUnstakingAsset} size={40} />
                  </div>
                  <div className="text-lg font-bold text-text-primary mb-2">
                    Unstaking {formatAmount(pendingUnstakingAmount || 0)} {selectedUnstakingAsset}
                  </div>
                  <div className="text-sm text-text-muted">
                    ~${formatAmount((pendingUnstakingAmount || 0) * (MASTER_ASSETS[selectedUnstakingAsset]?.price || 0))}
                  </div>
                </div>
                
                {/* Transaction Impact */}
                {renderUnstakingTransactionImpact()}
                
                {/* Processing Time */}
                <div className="bg-primary-600/10 border border-primary-400/20 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-primary-400" />
                    <span className="text-sm font-medium text-primary-300">Processing Time</span>
                  </div>
                  <p className="text-xs text-primary-200">
                    Unstaking typically completes in ~2-3 seconds. Your assets will be available immediately after confirmation.
                  </p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button 
                    className="flex-1 btn-secondary py-3"
                    onClick={closeUnstakingConfirmation}
                  >
                    Cancel
                  </button>
                  <button 
                    className="flex-1 btn-error py-3"
                    onClick={confirmUnstakingTransaction}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Unstake
                  </button>
                </div>
              </>
            )}
            
            {unstakingTransactionState === 'processing' && (
              <>
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-error-600 rounded-full animate-pulse">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mb-2">Processing Unstaking</h3>
                  <p className="text-text-secondary mb-4">
                    Unstaking {formatAmount(pendingUnstakingAmount || 0)} {selectedUnstakingAsset}...
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-error-400"></div>
                    <span>Please wait while we process your transaction</span>
                  </div>
                </div>
              </>
            )}
            
            {unstakingTransactionState === 'success' && (
              <>
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-success-600 rounded-full">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mb-2">Unstaking Complete!</h3>
                  <p className="text-text-secondary mb-4">
                    Successfully unstaked {formatAmount(pendingUnstakingAmount || 0)} {selectedUnstakingAsset}
                  </p>
                  
                  <div className="bg-surface-2 border border-white/10 rounded-xl p-4 mb-6 text-left">
                    <div className="text-xs text-text-muted mb-2">Transaction Hash:</div>
                    <div className="font-mono text-xs text-text-primary break-all">
                      0x{Math.random().toString(16).substring(2, 10)}...{Math.random().toString(16).substring(2, 6)}
                    </div>
                  </div>
                  
                  <div className="text-sm text-success-400 mb-6">
                    💰 Your assets are now available in your portfolio balance.
                  </div>
                  
                  <button 
                    className="w-full btn-primary py-3"
                    onClick={closeUnstakingConfirmation}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;