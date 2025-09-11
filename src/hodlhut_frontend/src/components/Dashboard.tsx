import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DepositModal from './DepositModal';
import { MASTER_ASSETS, Portfolio } from '../../assets/master_asset_data';
import { 
  analyzeCompleteSwap,
  needsDEXSelection,
  calculateSwapRoute,
  DEX_OPTIONS,
  CompleteSwapAnalysis
} from '../../assets/master_swap_logic';
import { getUniversalFeeRules } from '../../assets/universal_fee_rules';
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
import ckSOLIcon from '../../assets/images/ckSOL.svg';
import SOLIcon from '../../assets/images/SOL.svg';
import ckUSDCIcon from '../../assets/images/ckUSDC.svg';
import USDCIcon from '../../assets/images/USDC.svg';
import ckUSDTIcon from '../../assets/images/ckUSDT.svg';
import USDTIcon from '../../assets/images/USDT.svg';
import ICPIcon from '../../assets/images/ICP.svg';
import USDCSOLIcon from '../../assets/images/USDC_SOL.svg';

// Asset SVG icon mapping with proper webpack imports
const ASSET_ICONS: { [key: string]: string } = {
  'ckBTC': ckBTCIcon,
  'BTC': BTCIcon,
  'ckETH': ckETHIcon, 
  'ETH': ETHIcon,
  'ckSOL': ckSOLIcon,
  'SOL': SOLIcon,
  'ckUSDC': ckUSDCIcon,
  'USDC': USDCIcon,
  'ckUSDT': ckUSDTIcon,
  'USDT': USDTIcon,
  'ICP': ICPIcon,
  'USDCs': USDCSOLIcon
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
interface DropdownOption {
  value: string;
  label: string;
}

const CustomDropdown: React.FC<{
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  portfolio?: Portfolio;
  showBalances?: (asset: string) => boolean; // Function to determine if balance should be shown
}> = ({ options, value, onChange, placeholder, className, portfolio = {}, showBalances }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  
  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const selectedOption = options.find(opt => opt.value === value);
  
  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div ref={dropdownRef} className={`custom-dropdown relative ${className || ''}`}>
      <div 
        className="dropdown-trigger flex items-center px-3 py-1.5 border-2 border-primary-500 rounded-lg bg-surface-1 cursor-pointer h-8"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedOption ? (
          <>
            <AssetIcon asset={selectedOption.value} size={20} />
            <span className="ml-2">{selectedOption.label}</span>
          </>
        ) : (
          <span className="text-primary-600">{placeholder}</span>
        )}
        <span className="ml-auto text-xs">▼</span>
      </div>
      
      {isOpen && (
        <div 
          className="dropdown-container"
        >
          <input
            type="text"
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="dropdown-search w-full"
            onClick={(e) => e.stopPropagation()}
          />
          {filteredOptions.map(option => {
            const balance = portfolio[option.value] || 0;
            const hasBalance = balance > 0;
            const balanceUSD = balance * (MASTER_ASSETS[option.value]?.price || 0);
            const shouldShowBalance = showBalances ? showBalances(option.value) : true; // Default to showing balances
            
            return (
              <div
                key={option.value}
                className={`dropdown-option-enhanced ${
                  value === option.value ? 'selected' : ''
                } ${hasBalance ? 'has-balance' : 'zero-balance'}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                <div className="dropdown-option-left">
                  <AssetIcon asset={option.value} size={20} />
                  <span className="dropdown-asset-name">{option.label}</span>
                </div>
                {shouldShowBalance && (
                  <div className="dropdown-option-right">
                    <div className="dropdown-balance-amount">
                      {hasBalance ? formatAmount(balance) : '0'}
                    </div>
                    <div className="dropdown-balance-usd">
                      ${balanceUSD.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Import the correct SmartSolution type from master_swap_logic
import { SmartSolution } from '../../assets/master_swap_logic';

// Types for Enhanced Smart Solutions (use the real SmartSolution interface)
type EnhancedSmartSolution = SmartSolution;

// Portfolio scenarios for better demo experience
const PORTFOLIO_SCENARIOS = {
  'bitcoin-hodler': {
    ckBTC: 1.5,
    ckUSDC: 500,
    ckETH: 0,
    ckSOL: 0,
    ckUSDT: 0,
    ICP: 1000
  },
  'new-user': {
    ICP: 25,
    ckBTC: 0.1,
    ckETH: 0,
    ckSOL: 0,
    ckUSDC: 0,
    ckUSDT: 0
  },
  'defi-user': {
    ckETH: 1.2,
    ckUSDC: 1000,
    ckBTC: 0.05,
    ckSOL: 0,
    ckUSDT: 0,
    ICP: 1000
  },
  'gas-poor': {
    ckUSDC: 2000,
    ckUSDT: 500,
    ckBTC: 0,
    ckETH: 0,
    ckSOL: 0,
    ICP: 1000
  }
};

// Unified Deposit Assets Configuration
const DEPOSIT_ASSETS_CONFIG = {
  "Cross-Chain Deposits": [
    { 
      asset: "BTC", 
      label: "Bitcoin", 
      description: "Native BTC → ckBTC",
      walletType: "Bitcoin Wallet",
      backendNote: "Bitcoin wallet interface + Bitcoin RPC canister"
    },
    { 
      asset: "ETH", 
      label: "Ethereum", 
      description: "Native ETH → ckETH",
      walletType: "Ethereum Wallet",
      backendNote: "Ethereum wallet interface + Ethereum RPC canister"
    },
    { 
      asset: "SOL", 
      label: "Solana", 
      description: "Native SOL → ckSOL",
      walletType: "Solana Wallet",
      backendNote: "Solana wallet interface + Solana RPC canister"
    },
    { 
      asset: "USDC", 
      label: "USDC (Ethereum)", 
      description: "ERC-20 USDC → ckUSDC",
      walletType: "Ethereum Wallet",
      backendNote: "Ethereum wallet interface + Ethereum RPC canister (ERC-20 USDC)"
    },
    { 
      asset: "USDT", 
      label: "USDT (Ethereum)", 
      description: "ERC-20 USDT → ckUSDT",
      walletType: "Ethereum Wallet",
      backendNote: "Ethereum wallet interface + Ethereum RPC canister (ERC-20 USDT)"
    },
    { 
      asset: "USDCs", 
      label: "USDC (Solana)", 
      description: "SPL USDC → ckUSDC",
      walletType: "Solana Wallet",
      backendNote: "Solana wallet interface + Solana RPC canister (SPL USDC)"
    }
  ],
  "ICP Ecosystem": [
    { 
      asset: "ckBTC", 
      label: "ckBTC", 
      description: "Chain Key Bitcoin",
      walletType: "ICP Wallet",
      backendNote: "ICP wallet interface (Plug, etc.) + ICRC-1 token integration"
    },
    { 
      asset: "ckETH", 
      label: "ckETH", 
      description: "Chain Key Ethereum",
      walletType: "ICP Wallet",
      backendNote: "ICP wallet interface (Plug, etc.) + ICRC-1 token integration"
    },
    { 
      asset: "ckSOL", 
      label: "ckSOL", 
      description: "Chain Key Solana",
      walletType: "ICP Wallet",
      backendNote: "ICP wallet interface (Plug, etc.) + ICRC-1 token integration"
    },
    { 
      asset: "ckUSDC", 
      label: "ckUSDC", 
      description: "Chain Key USDC",
      walletType: "ICP Wallet",
      backendNote: "ICP wallet interface (Plug, etc.) + ICRC-1 token integration"
    },
    { 
      asset: "ckUSDT", 
      label: "ckUSDT", 
      description: "Chain Key USDT",
      walletType: "ICP Wallet",
      backendNote: "ICP wallet interface (Plug, etc.) + ICRC-1 token integration"
    },
    { 
      asset: "ICP", 
      label: "ICP", 
      description: "Internet Computer",
      walletType: "ICP Wallet",
      backendNote: "ICP wallet interface (Plug, etc.) + native ICP integration"
    }
  ]
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  
  // Check if navigation state specifies an active section and user flow
  const initialSection = (location.state as any)?.activeSection || 'addAssets';
  const userFlow = (location.state as any)?.userFlow || 'newUser';
  const [activeSection, setActiveSection] = useState(initialSection);
  const [currentScenario, setCurrentScenario] = useState<keyof typeof PORTFOLIO_SCENARIOS>('defi-user');
  const [portfolio, setPortfolio] = useState<Portfolio>(PORTFOLIO_SCENARIOS[currentScenario]);
  
  // Advanced Swap State
  const [fromAsset, setFromAsset] = useState('');
  const [toAsset, setToAsset] = useState('');
  const [swapAmount, setSwapAmount] = useState('');
  const [selectedDEX, setSelectedDEX] = useState<string | null>(null);
  
  // Portfolio collapse state - remember user preference, default based on user flow
  const [portfolioExpanded, setPortfolioExpanded] = useState(() => {
    const savedPreference = localStorage.getItem('portfolioExpanded');
    if (savedPreference !== null) {
      return JSON.parse(savedPreference);
    }
    // Default: expanded for returning users, collapsed for new users
    return userFlow === 'returningUser';
  });
  const [swapAnalysis, setSwapAnalysis] = useState<CompleteSwapAnalysis | null>(null);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const [showSmartSolutions, setShowSmartSolutions] = useState(false);
  const [showDEXSelection, setShowDEXSelection] = useState(false);
  const [slippageTolerance, setSlippageTolerance] = useState(1.0);
  const [currentGasPrice, setCurrentGasPrice] = useState(25);
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes for Hut activation
  
  // Enhanced Smart Solutions State
  const [smartSolutions, setSmartSolutions] = useState<EnhancedSmartSolution[]>([]);
  const [selectedSolution, setSelectedSolution] = useState<number | null>(null);
  const [showAllSolutions, setShowAllSolutions] = useState(true);
  
  // Mobile Navigation State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Unified Deposit Interface State
  const [selectedDepositAssetUnified, setSelectedDepositAssetUnified] = useState('');

  // Save portfolio expansion preference to localStorage
  useEffect(() => {
    localStorage.setItem('portfolioExpanded', JSON.stringify(portfolioExpanded));
  }, [portfolioExpanded]);
  
  // Smart Solutions Approval Modal State
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<EnhancedSmartSolution | null>(null);


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
  
  // Deposit Modal State
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);
  const [selectedDepositAsset, setSelectedDepositAsset] = useState<string>('');
  
  // Internet Identity Authentication Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authStep, setAuthStep] = useState<'authenticate' | 'confirming' | 'wallet_connect' | 'wallet_connecting' | 'executing' | 'success'>('authenticate');
  const [transactionData, setTransactionData] = useState<CompleteSwapAnalysis | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [transactionSteps, setTransactionSteps] = useState<Array<{message: string, completed: boolean, current: boolean}>>([]);
  
  // My Garden Claim Yield State
  const [claimedAssets, setClaimedAssets] = useState<Set<string>>(new Set());
  const [sparklingAssets, setSparklingAssets] = useState<Set<string>>(new Set());
  
  // Ethereum Wallet Options for Transaction
  const ETH_WALLET_OPTIONS = [
    { id: 'metamask', name: 'MetaMask', icon: <Wallet className="w-4 h-4 text-orange-500" /> },
    { id: 'coinbase', name: 'Coinbase Wallet', icon: <Circle className="w-4 h-4 text-blue-500" /> },
    { id: 'walletconnect', name: 'WalletConnect', icon: <Link className="w-4 h-4" /> },
    { id: 'rainbow', name: 'Rainbow', icon: <Zap className="w-4 h-4 text-purple-500" /> }
  ];

  // Execute transaction steps with timing
  const executeTransactionSteps = () => {
    const stepTimings = [2000, 1500, 1000, 2000, 4000]; // Different timing for each step
    
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
        
        // If this is the last step, move to success after ethereum confirmation
        if (index === stepTimings.length - 1) {
          setTimeout(() => {
            setAuthStep('success');
          }, 1500);
        }
      }, stepTimings.slice(0, index + 1).reduce((acc, curr) => acc + curr, 0));
    });
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
  
  // Enhanced DEX Options with Real Stats - FIXED STATS
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
    }
  };


  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  
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
    console.log('🔄 UPDATE ADVANCED SWAP DETAILS CALLED:', { fromAsset, toAsset, swapAmount });
    
    if (!fromAsset || !toAsset || !swapAmount || parseFloat(swapAmount) <= 0) {
      console.log('⚠️ Early return - invalid parameters');
      return;
    }

    const amount = parseFloat(swapAmount);
    
    // STEP 1: Get basic swap analysis
    console.log('🚀 CALLING analyzeCompleteSwap FROM DASHBOARD:', { fromAsset, toAsset, amount });
    const analysis = analyzeCompleteSwap(fromAsset, toAsset, amount, portfolio, selectedDEX || 'ICPSwap');
    console.log('🚀 DASHBOARD RECEIVED ANALYSIS:', analysis);
    
    if (!analysis.success) {
      console.warn('Swap analysis failed:', analysis.errors);
      setSwapAnalysis(null);
      setShowRouteDetails(false);
      setShowDEXSelection(false);
      setShowSmartSolutions(false);
      return;
    }
    
    // STEP 2: Apply universal fee rules
    const feeRules = getUniversalFeeRules(fromAsset, toAsset, amount, portfolio);
    console.log('📊 DASHBOARD FEE RULES RESULT:', feeRules);
    
    setSwapAnalysis(analysis);
    
    // STEP 3: Always show route explanation FIRST
    setShowRouteDetails(true);
    
    // STEP 4: Show DEX selection ONLY if needed (exclude direct Chain Fusion)
    const isDirectChainFusion = analysis.route.operationType === 'Minter Operation' && analysis.isL1Withdrawal;
    if (needsDEXSelection(fromAsset, toAsset) && !isDirectChainFusion) {
      setShowDEXSelection(true);
    } else {
      setSelectedDEX(null);
      setShowDEXSelection(false);
    }
    
    // STEP 5: Handle Smart Solutions using universal rules
    console.log('📊 SMART SOLUTIONS CHECK:', { 
      shouldShow: feeRules.shouldShowSmartSolutions, 
      hasPrimarySolution: !!feeRules.primarySolution,
      primarySolution: feeRules.primarySolution 
    });
    
    if (feeRules.shouldShowSmartSolutions && feeRules.primarySolution) {
      const solution = feeRules.primarySolution;
      
      // Map universal fee rule types to SmartSolution types
      const typeMapping: Record<string, SmartSolution['type']> = {
        'deduct_from_final': 'deduct_from_swap',
        'use_existing': 'auto_swap',
        'manual_swap': 'manual_topup'
      };
      
      const enhancedSolutions = [{
        id: 'universal_fee_solution',
        type: typeMapping[solution.type] || 'auto_swap',
        title: solution.title,
        description: solution.description,
        badge: 'RECOMMENDED' as 'RECOMMENDED',
        userReceives: {
          amount: analysis.outputAmount,
          asset: analysis.toAsset
        },
        cost: {
          amount: solution.feeAmount.toString(),
          asset: solution.feeToken,
          description: 'Gas fee'
        }
      }];
      setSmartSolutions(enhancedSolutions);
      setShowSmartSolutions(true);
    } else {
      setShowSmartSolutions(false);
      setSelectedSolution(null);
      setShowAllSolutions(true);
    }
  };

  // Smart Solutions interaction handlers
  const handleApproveSolution = (solutionIndex: number) => {
    const solution = smartSolutions[solutionIndex];
    console.log(`User approved solution: ${solution.title}`);
    
    // Show approval modal instead of alert
    setPendingApproval(solution);
    setShowApprovalModal(true);
  };

  const handleRejectSolution = (solutionIndex: number) => {
    if (solutionIndex === 0) {
      // If rejecting the first (recommended) solution, show all alternatives
      setShowAllSolutions(true);
      setSelectedSolution(null);
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
    if (pendingApproval) {
      setSelectedSolution(smartSolutions.indexOf(pendingApproval));
      setShowAllSolutions(false);
      console.log(`Solution executed: ${pendingApproval.title}`);
      
      // Here you would normally execute the actual solution logic
      // For now, we'll just close the modal and mark as approved
    }
    
    setShowApprovalModal(false);
    setPendingApproval(null);
  };

  const handleCancelApproval = () => {
    setShowApprovalModal(false);
    setPendingApproval(null);
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
      console.error('Logout failed:', error);
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
            {userFlow === 'returningUser' ? (
              <div className="text-success-400 text-sm font-medium">
                <PieChart className="inline w-4 h-4 mr-1" />
                ${calculatePortfolioValue().toLocaleString()}
              </div>
            ) : (
              <div className="text-warning-400 text-xs font-medium">
                <Clock className="inline w-4 h-4 mr-1" />
                Activate: {formatTime(timeRemaining)}
              </div>
            )}
          </div>
          
          {/* Right: Connection Status */}
          <div className="flex items-center text-yellow-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-yellow-400 mr-1"></span>
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
          {userFlow === 'returningUser' ? (
            // Returning user: Show Portfolio + Connected status
            <>
              <div className="flex items-center text-success-400"><PieChart className="inline w-4 h-4 mr-1" /> Portfolio: ${calculatePortfolioValue().toLocaleString()}</div>
              <div className="flex items-center text-yellow-400"><span className="w-2 h-2 rounded-full bg-yellow-400 mr-2"></span> Connected Live Onchain (Demo Mode)</div>
            </>
          ) : (
            // New user: Show Activation countdown + Connected status  
            <>
              <div className="flex items-center text-warning-400"><Clock className="inline w-4 h-4 mr-1" /> Add Assets to activate your Sovereign Hut: {formatTime(timeRemaining)}</div>
              <div className="flex items-center text-yellow-400"><span className="w-2 h-2 rounded-full bg-yellow-400 mr-2"></span> Connected Live Onchain (Demo Mode)</div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderNavigation = () => (
    <div className="mb-8 md:mb-16">
      {/* Desktop Navigation - Hidden on Mobile */}
      <div className="hidden md:block">
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            className={activeSection === 'addAssets' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveSection('addAssets')}
          >
            <Plus className="w-5 h-5" /> Add Assets
          </button>
          <button
            className={activeSection === 'swapAssets' ? 'btn-bitcoin' : 'btn-secondary'}
            onClick={() => setActiveSection('swapAssets')}
          >
            <ArrowLeftRight size={20} />Swap Assets
          </button>
          <button
            className={activeSection === 'myGarden' ? 'btn-success' : 'btn-secondary'}
            onClick={() => setActiveSection('myGarden')}
          >
            🌱 My Garden
          </button>
          <button
            className={activeSection === 'transactionHistory' ? 'btn-error' : 'btn-secondary'}
            onClick={() => setActiveSection('transactionHistory')}
          >
            History
          </button>
          <button
            className="btn-secondary"
            onClick={handleLogout}
          >
            <Lock size={20} />
            LogOut
          </button>
        </div>
      </div>
    </div>
  );

  const renderAddAssetsSection = () => {
    // Generate dropdown options from asset configuration
    const generateDropdownOptions = () => {
      const options: Array<{value: string, label: string, category: string}> = [];
      
      Object.entries(DEPOSIT_ASSETS_CONFIG).forEach(([category, assets]) => {
        assets.forEach(asset => {
          options.push({
            value: asset.asset,
            label: asset.label,
            category: category
          });
        });
      });
      
      return options;
    };

    // Find selected asset details
    const getSelectedAssetDetails = () => {
      if (!selectedDepositAssetUnified) return null;
      
      for (const [category, assets] of Object.entries(DEPOSIT_ASSETS_CONFIG)) {
        const asset = assets.find(a => a.asset === selectedDepositAssetUnified);
        if (asset) {
          return { ...asset, category };
        }
      }
      return null;
    };

    const selectedAssetDetails = getSelectedAssetDetails();

    return (
      <div className="w-full flex flex-col items-center px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Add Assets to Your Portfolio</h2>
          <p className="text-lg text-text-secondary">Choose an asset to deposit from L1 chains or ICP ecosystem</p>
        </div>
        
        {/* Unified Deposit Interface */}
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-surface-1 p-6">
          {/* Asset Selection Dropdown */}
          <div className="mb-6">
            <label className="text-sm font-medium text-text-secondary mb-3 block">Select Asset to Deposit</label>
            <CustomDropdown
              className="w-full min-h-[50px]"
              value={selectedDepositAssetUnified}
              onChange={(value) => setSelectedDepositAssetUnified(value)}
              placeholder="Choose an asset..."
              options={generateDropdownOptions()}
              portfolio={portfolio}
              showBalances={(asset: string) => {
                // Only show balances for ICP Ecosystem assets
                const icpEcosystemAssets = ['ckBTC', 'ckETH', 'ckSOL', 'ckUSDC', 'ckUSDT', 'ICP'];
                return icpEcosystemAssets.includes(asset);
              }}
            />
            
            {/* Balance Display - Only show for ICP Ecosystem assets */}
            <div className="text-center mt-2">
              <span className="text-sm text-text-muted">
                {(() => {
                  if (!selectedDepositAssetUnified) {
                    return 'Select an asset to view balance';
                  }
                  
                  // Check if selected asset is from ICP Ecosystem (has balances in portfolio)
                  const icpEcosystemAssets = ['ckBTC', 'ckETH', 'ckSOL', 'ckUSDC', 'ckUSDT', 'ICP'];
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
                    // For L1 assets (BTC, ETH, SOL, etc.), show deposit flow message
                    return 'Deposit to receive chain-key tokens in your portfolio';
                  }
                })()}
              </span>
            </div>
          </div>

          {/* Asset Preview */}
          {selectedAssetDetails && (
            <div className="mb-6 p-4 bg-surface-2 border border-white/10 rounded-2xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 flex items-center justify-center bg-surface-3 rounded-xl">
                  <AssetIcon asset={selectedAssetDetails.asset} size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text-primary">{selectedAssetDetails.label}</h3>
                  <p className="text-sm text-text-secondary">{selectedAssetDetails.description}</p>
                </div>
              </div>
              
              {/* Wallet Type Info */}
              <div className="flex items-center justify-between p-3 bg-surface-1 rounded-lg border border-white/5">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-primary-400" />
                  <span className="text-sm font-medium text-text-secondary">Wallet Required:</span>
                </div>
                <span className="text-sm font-semibold text-primary-400">{selectedAssetDetails.walletType}</span>
              </div>
              
              {/* Category Badge */}
              <div className="flex justify-between items-center mt-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  selectedAssetDetails.category === 'Cross-Chain Deposits' 
                    ? 'bg-warning-400/15 text-warning-300 border border-warning-400/30'
                    : 'bg-success-400/15 text-success-300 border border-success-400/30'
                }`}>
                  {selectedAssetDetails.category}
                </span>
              </div>
            </div>
          )}

          {/* Connect Wallet Button */}
          {selectedAssetDetails ? (
            <button
              className="w-full btn-primary min-h-[60px] text-base font-semibold flex items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.02]"
              onClick={() => {
                // BACKEND NOTE: Preserve all wallet integration backend notes
                console.log(`Backend integration: ${selectedAssetDetails.backendNote}`);
                startDeposit(selectedAssetDetails.asset);
              }}
            >
              <Wallet size={20} />
              Connect {selectedAssetDetails.walletType}
            </button>
          ) : (
            <div className="w-full min-h-[60px] flex items-center justify-center text-text-muted bg-surface-2 rounded-xl border border-white/5">
              <div className="text-center">
                <p className="text-sm font-medium">Select an asset above to continue</p>
                <p className="text-xs mt-1">Connect your wallet to start depositing</p>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-text-muted">
              Choose from {Object.values(DEPOSIT_ASSETS_CONFIG).flat().length} supported assets across Bitcoin, Ethereum, Solana, and ICP
            </p>
          </div>
        </div>

        {/* Quick Access Cards (Mobile Optimized) */}
        <div className="w-full max-w-lg mt-8">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-text-primary">Popular Assets</h3>
            <p className="text-sm text-text-secondary">Quick access to commonly deposited assets</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {['BTC', 'ETH', 'ckBTC', 'ICP'].map(asset => {
              const assetDetails = Object.values(DEPOSIT_ASSETS_CONFIG)
                .flat()
                .find(a => a.asset === asset);
              
              if (!assetDetails) return null;
              
              // Only show balances for ICP Ecosystem assets
              const icpEcosystemAssets = ['ckBTC', 'ckETH', 'ckSOL', 'ckUSDC', 'ckUSDT', 'ICP'];
              const isIcpEcosystemAsset = icpEcosystemAssets.includes(asset);
              const hasBalance = isIcpEcosystemAsset && portfolio[asset] && portfolio[asset] > 0;
              const balance = portfolio[asset] || 0;
              const balanceUSD = balance * (MASTER_ASSETS[asset]?.price || 0);
              
              return (
                <button
                  key={asset}
                  className={`p-4 border border-white/10 rounded-xl hover:bg-surface-3 transition-all duration-200 text-left ${
                    hasBalance ? 'bg-surface-2' : 'bg-surface-1'
                  }`}
                  onClick={() => setSelectedDepositAssetUnified(asset)}
                >
                  <div className="flex items-center gap-3">
                    <AssetIcon asset={asset} size={20} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-text-primary">{assetDetails.label}</div>
                      <div className="text-xs text-text-muted">{assetDetails.walletType}</div>
                      {hasBalance && (
                        <div className="text-xs text-success-400 mt-1">
                          {formatAmount(balance)} • ${balanceUSD.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderSwapAssetsSection = () => (
    <div className="w-full flex flex-col items-center px-4 py-8">
      <div className="text-center mb-4 md:mb-8">
        <div className="text-3xl font-bold text-text-primary mb-2" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Swap Assets Crosschain</div>
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
              options={(() => {
                // Only show assets available in the FROM dropdown that have a balance > 0
                const fromAssets = ['ckBTC', 'ckETH', 'ckSOL', 'ckUSDC', 'ckUSDT', 'ICP'];
                const assetsWithBalance = fromAssets.filter(asset => portfolio[asset] && portfolio[asset] > 0);
                
                return assetsWithBalance.map(asset => ({
                  value: asset,
                  label: asset
                }));
              })()}
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
          {(() => {
            // Asset categorization logic
            const ckAssetsAndICP = ['ckBTC', 'ckETH', 'ckSOL', 'ckUSDC', 'ckUSDT', 'ICP'];
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
          })()}
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
                { value: 'ckSOL', label: 'ckSOL' },
                { value: 'ckUSDC', label: 'ckUSDC' },
                { value: 'ckUSDT', label: 'ckUSDT' },
                { value: 'ICP', label: 'ICP' },
                { value: 'BTC', label: 'Bitcoin' },
                { value: 'ETH', label: 'Ethereum' },
                { value: 'SOL', label: 'Solana' },
                { value: 'USDC', label: 'USDC' },
                { value: 'USDT', label: 'USDT' },
                { value: 'USDCs', label: 'USDCs' }
              ].filter(option => option.value !== fromAsset)}
            />
          </div>
          
          <div className="text-center">
            <span className="text-sm text-text-muted">
              {(() => {
                // Show dynamic "You'll receive" message based on swap analysis
                if (fromAsset && toAsset && swapAmount && swapAnalysis?.outputAmount) {
                  return `You'll receive: ${toAsset} ${formatAmount(swapAnalysis.outputAmount)}`;
                }
                return "You'll receive:";
              })()}
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

      {/* STEP 2: Choose Your Method (DEX Selection) - ONLY WHEN NEEDED */}
      {showDEXSelection && swapAnalysis && fromAsset !== toAsset && (
        <div className="w-full max-w-lg mt-6 rounded-2xl border border-white/10 bg-surface-1 p-8">
          <div className="flex justify-center mb-8">
            <span className="heading-4 text-text-primary">
              {swapAnalysis.route.operationType === 'DEX + Minter'
                ? 'First choose your DEX' 
                : 'Choose your DEX'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Backend: KongSwap onclick calls KongSwap API, ICPSwap onclick calls ICPSwap API */}
            {Object.entries(DEX_OPTIONS_ENHANCED).map(([key, dex]) => (
              <div 
                key={key}
                className={`rounded-xl border p-6 cursor-pointer transition-all duration-300 ${
                  selectedDEX === key 
                    ? 'border-primary-500 bg-primary-600/10' 
                    : 'border-white/20 bg-surface-2 hover:bg-surface-3'
                }`}
                onClick={() => setSelectedDEX(key)}
              >
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 badge-text mb-3 ${
                  dex.badge === 'speed' 
                    ? 'bg-warning-400/15 text-warning-300' 
                    : 'bg-primary-600/15 text-primary-400'
                }`}>
                  {dex.badge === 'speed' ? <><Zap className="inline w-4 h-4 mr-1" /> SPEED FOCUSED</> : <><Waves className="inline w-4 h-4 mr-1" /> LIQUIDITY FOCUSED</>}
                </div>
                <div className="heading-4 text-text-primary mb-4">{dex.name}</div>
                
                {/* Improved Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {Object.entries(dex.stats).map(([stat, value]) => (
                    <div key={stat} className="text-center">
                      <div className="ui-label text-text-muted mb-1">{stat}</div>
                      <div className="body-sm text-text-primary font-semibold">{value}</div>
                    </div>
                  ))}
                </div>
                
                {/* Clean Advantages/Trade-offs */}
                <div className="space-y-2 body-sm">
                  <div className="flex items-start gap-2">
                    <Star size={16} className="text-success-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="ui-label text-text-primary">Best for:</span>
                      <span className="text-text-secondary ml-1">{dex.advantages.join(' • ')}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Scale size={16} className="text-warning-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-text-primary">Trade-offs:</span>
                      <span className="text-text-secondary ml-1">{dex.tradeoffs.join(' • ')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

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
          {(() => {
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
          })()}
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

  const renderMyGardenSection = () => {
    // Use same asset filtering as Portfolio Overview - only swappable assets with balance > 0
    const fromAssets = ['ckBTC', 'ckETH', 'ckSOL', 'ckUSDC', 'ckUSDT', 'ICP'];
    const assetsWithBalance = fromAssets.filter(asset => portfolio[asset] && portfolio[asset] > 0);
    
    // Mock planted amounts for demo (in real app, this would be separate state)
    const plantedAmounts: Record<string, number> = {
      'ckBTC': portfolio.ckBTC * 0.6, // 60% planted
      'ckETH': portfolio.ckETH * 0.8, // 80% planted  
      'ckUSDC': portfolio.ckUSDC * 0.5, // 50% planted
      'ckUSDT': portfolio.ckUSDT * 0.7, // 70% planted
      'ckSOL': portfolio.ckSOL * 0.3, // 30% planted
      'ICP': portfolio.ICP * 0.9 // 90% planted
    };

    const calculateTotalYield = () => {
      let totalYield = 0;
      assetsWithBalance.forEach(asset => {
        const planted = plantedAmounts[asset] || 0;
        const assetPrice = MASTER_ASSETS[asset]?.price || 0;
        totalYield += planted * assetPrice * 0.05; // 5% weekly yield
      });
      return totalYield;
    };

    const calculateDiversityMultiplier = () => {
      const plantedCount = assetsWithBalance.filter(asset => plantedAmounts[asset] > 0).length;
      const multipliers = [1.0, 1.25, 1.5, 1.75, 2.0, 2.2];
      return multipliers[plantedCount] || 1.0;
    };

    const renderPlantField = (asset: string) => {
      const planted = plantedAmounts[asset] || 0;
      const available = portfolio[asset] || 0;
      const isPlanted = planted > 0;
      const assetPrice = MASTER_ASSETS[asset]?.price || 0;
      const weeklyYield = planted * assetPrice * 0.05;

      return (
        <div key={asset} className={`rounded-xl p-6 text-center transition-all duration-300 ${
          isPlanted 
            ? 'bg-success-600/20 border border-success-400/30 hover:bg-success-600/30' 
            : 'bg-surface-2 border border-white/10 hover:bg-surface-3'
        }`}>
          <div className="flex justify-center mb-4">
            <AssetIcon asset={asset} size={48} />
          </div>
          
          <div className="text-lg font-bold text-text-primary mb-2">
            {asset}
          </div>
          
          <div className="text-sm font-semibold text-text-secondary mb-2">
            {isPlanted ? `${formatAmount(planted)} ${asset}` : 'Ready to plant'}
          </div>
          
          <div className="text-xs text-text-muted leading-relaxed mb-4">
            {isPlanted ? (
              <>
                🌱 Growing (45 days)
                <br />Yield/Week: ${weeklyYield.toFixed(2)}
              </>
            ) : (
              <>
                Plant {asset} to boost diversity
                <br />Available: {formatAmount(available)} {asset}
              </>
            )}
          </div>
          
          {isPlanted ? (
            <button 
              className={`w-full px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                claimedAssets.has(asset)
                  ? 'bg-surface-3 text-text-muted cursor-not-allowed'
                  : sparklingAssets.has(asset)
                  ? 'bg-success-600 hover:bg-success-500 text-on-success animate-pulse'
                  : 'bg-success-600 hover:bg-success-500 text-on-success'
              }`}
              onClick={() => !claimedAssets.has(asset) && handleClaimYield(asset)}
              disabled={claimedAssets.has(asset)}
            >
              {claimedAssets.has(asset) ? 'Claimed ✓' : 'Claim Yield'}
            </button>
          ) : (
            <button 
              className="w-full px-4 py-2 rounded-xl text-sm font-semibold bg-primary-600 hover:bg-primary-500 text-on-primary transition-all duration-200"
              onClick={() => alert(`🌱 Plant ${asset} feature coming soon!`)}
            >
              Plant {asset} 🌱
            </button>
          )}
        </div>
      );
    };

    return (
      <div className="rounded-2xl border border-white/10 bg-surface-1 p-6">
        {/* Garden Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-4">🌱 My Garden 🌱</h1>
          <p className="text-text-secondary mb-4">Hodl Longevity & Asset Diversity Claimable Rewards</p>
          <div className="inline-flex items-center gap-2 rounded-full bg-success-600/15 text-success-400 px-4 py-2 text-sm font-semibold">
            🌿 Sprout Gardener
          </div>
        </div>

        {/* Current Yield Stats Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-text-primary">
            Your Current Yield Stats
          </h2>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-surface-2 rounded-xl p-4 text-center">
            <div className="flex justify-center mb-3">
              <DollarSign className="w-6 h-6 text-primary-400" />
            </div>
            <div className="text-2xl font-bold text-text-primary mb-1">${calculateTotalYield().toFixed(0)}</div>
            <div className="text-text-secondary text-sm font-medium mb-2">Total Garden Yield</div>
            <div className="text-text-muted text-xs">This week: +${(calculateTotalYield() * 0.1).toFixed(0)}</div>
          </div>
          
          <div className="bg-surface-2 rounded-xl p-4 text-center">
            <div className="flex justify-center mb-3">
              <Clock className="w-6 h-6 text-warning-400" />
            </div>
            <div className="text-2xl font-bold text-text-primary mb-1">42</div>
            <div className="text-text-secondary text-sm font-medium mb-2">Average Hodl Days</div>
            <div className="text-text-muted text-xs">Longest: 127 days</div>
          </div>
          
          <div className="bg-surface-2 rounded-xl p-4 text-center">
            <div className="flex justify-center mb-3">
              <Target className="w-6 h-6 text-success-400" />
            </div>
            <div className="text-2xl font-bold text-text-primary mb-1">{assetsWithBalance.filter(asset => plantedAmounts[asset] > 0).length}/6</div>
            <div className="text-text-secondary text-sm font-medium mb-2">Asset Diversity</div>
            <div className="text-text-muted text-xs">{calculateDiversityMultiplier()}x multiplier active</div>
          </div>
          
          <div className="bg-surface-2 rounded-xl p-4 text-center">
            <div className="flex justify-center mb-3">
              <Trophy className="w-6 h-6 text-warning-500" />
            </div>
            <div className="text-2xl font-bold text-text-primary mb-1">{calculateDiversityMultiplier()}x</div>
            <div className="text-text-secondary text-sm font-medium mb-2">Total Multiplier</div>
            <div className="text-text-muted text-xs">Next level: 15 days</div>
          </div>
        </div>

        {/* Garden Fields */}
        <div>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-text-primary mb-2">🪴 Your Biodiversity</h2>
            <p className="text-text-secondary">Plant assets to start earning yield • Greater diversity = Higher rewards</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assetsWithBalance.map(asset => renderPlantField(asset))}
          </div>
        </div>
      </div>
    );
  };

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
        to: 'ckSOL',
        amount: '2,500',
        value: '$2,500.00',
        fee: '$7.50',
        time: '1 day ago',
        status: 'Completed'
      },
      {
        id: 3,
        type: 'Chain Fusion',
        from: 'ckSOL',
        to: 'SOL',
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

  const renderPortfolioOverview = () => {
    // Only show assets available in the FROM dropdown that have a balance > 0
    const fromAssets = ['ckBTC', 'ckETH', 'ckSOL', 'ckUSDC', 'ckUSDT', 'ICP'];
    const assetsWithBalance = fromAssets.filter(asset => portfolio[asset] && portfolio[asset] > 0);
    
    return (
      <div className="mb-4 md:mb-8 rounded-2xl border border-white/10 bg-surface-1 overflow-hidden transition-all duration-200 hover:bg-surface-2/50">
        {/* Collapsible Portfolio Compact Row */}
        <div 
          className="portfolio-compact-header"
          onClick={() => setPortfolioExpanded(!portfolioExpanded)}
        >
          <div className="portfolio-compact-content">
            <div className="portfolio-compact-title">Portfolio Overview</div>
          </div>
          <div className="portfolio-compact-value">
            <div className="portfolio-compact-amount">${calculatePortfolioValue().toLocaleString()}</div>
            <div className="portfolio-compact-change">+2.4% today</div>
          </div>
          <div className={`portfolio-expand-icon ${portfolioExpanded ? 'expanded' : ''}`}>
            ▼
          </div>
        </div>

        {/* Collapsible Content */}
        <div className={`collapsible-content ${portfolioExpanded ? 'expanded' : 'collapsed'}`}>
          <div className="portfolio-table-wrapper">
            <div className="portfolio-table-content">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-text-secondary text-sm font-medium pb-3">Asset</th>
                      <th className="text-left text-text-secondary text-sm font-medium pb-3">Token</th>
                      <th className="text-right text-text-secondary text-sm font-medium pb-3">Amount</th>
                      <th className="text-right text-text-secondary text-sm font-medium pb-3">Value (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetsWithBalance.map((asset) => {
                      const amount = portfolio[asset];
                      const usdValue = (MASTER_ASSETS[asset]?.price || 0) * amount;
                      return (
                        <tr key={asset} className="border-b border-white/5 hover:bg-surface-2/50 transition-colors">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <AssetIcon asset={asset} size={24} />
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="text-text-primary font-medium">{asset}</div>
                          </td>
                          <td className="py-4 text-right">
                            <div className="text-text-primary font-medium">{formatAmount(amount)}</div>
                          </td>
                          <td className="py-4 text-right">
                            <div className="text-text-primary font-medium">${usdValue.toLocaleString()}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
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
    
    console.log(`✅ Deposit completed: ${amount} ${asset}`);
  };

  // Reset Add Assets component to initial state
  const resetAddAssetsComponent = () => {
    setSelectedDepositAssetUnified('');
    console.log('🔄 Add Assets component reset to initial state');
  };

  // Smart decimal formatting - remove decimals for whole numbers >= 1

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'addAssets':
        return renderAddAssetsSection();
      case 'swapAssets':
        return renderSwapAssetsSection();
      case 'myGarden':
        return renderMyGardenSection();
      case 'transactionHistory':
        return renderTransactionHistorySection();
      default:
        return renderAddAssetsSection();
    }
  };

  return (
    <div className="bg-bg text-text-primary min-h-screen">
      <div className="container-app">
        {renderIntegratedHeader()}
        
        {renderNavigation()}
        
        {/* Portfolio Overview - Now above main content */}
        {renderPortfolioOverview()}
        
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
        onContinue={resetAddAssetsComponent}
      />

      {/* Smart Solutions Approval Modal */}
      {showApprovalModal && pendingApproval && (
        <div className="modal-overlay" onClick={handleCancelApproval}>
          <div className="smart-solution-modal" onClick={(e) => e.stopPropagation()}>
            <div className="smart-solution-header">
              <div className="smart-solution-icon">
                <Lightbulb size={24} color="#f1760f" />
              </div>
              <h3 className="smart-solution-title">Approve Smart Solution</h3>
              <button 
                className="modal-close-btn" 
                onClick={handleCancelApproval}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="smart-solution-content">
              <div className="solution-details">
                <h4>{formatTextWithNumbers(pendingApproval.title)}</h4>
                <p className="solution-description">{formatTextWithNumbers(pendingApproval.description)}</p>
                
                <div className="solution-breakdown">
                  <div className="cost-item">
                    <span className="label">Cost:</span>
                    <span className="value cost">
                      {formatNumber(parseFloat(pendingApproval.cost.amount))} {pendingApproval.cost.asset}
                      {pendingApproval.cost.description && (
                        <div className="cost-description">{pendingApproval.cost.description}</div>
                      )}
                    </span>
                  </div>
                  <div className="receive-item">
                    <span className="label">You'll receive:</span>
                    <span className="value receive">
                      {formatNumber(pendingApproval.userReceives.amount)} {pendingApproval.userReceives.asset}
                    </span>
                  </div>
                </div>
              </div>

              <div className="solution-actions">
                <button 
                  className="btn btn-decline" 
                  onClick={handleCancelApproval}
                >
                  Decline
                </button>
                <button 
                  className="btn btn-approve" 
                  onClick={handleConfirmApproval}
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Internet Identity Authentication Modal */}
      {showAuthModal && transactionData && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            {authStep === 'authenticate' && (
              <>
                <div className="auth-modal-header">
                  <h3 className="auth-modal-title">Authenticate Internet Identity to Perform Transaction</h3>
                  <button 
                    className="modal-close-btn" 
                    onClick={() => setShowAuthModal(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                
                <div className="auth-modal-content">
                  {/* Pancake-style swap interface */}
                  <div className="swap-confirmation-card">
                    <div className="swap-confirmation-header">
                      <span>🔄</span>
                      <h4>Confirm Swap</h4>
                    </div>
                    
                    <div className="swap-details">
                      <div className="swap-from-to">
                        <div className="swap-asset">
                          <span className="asset-amount">{formatAmount(transactionData.amount)}</span>
                          <span className="text-lg font-semibold text-text-primary mb-2">{transactionData.fromAsset}</span>
                        </div>
                        <div className="swap-arrow">→</div>
                        <div className="swap-asset">
                          <span className="asset-amount">{formatAmount(transactionData.outputAmount)}</span>
                          <span className="text-lg font-semibold text-text-primary mb-2">{transactionData.toAsset}</span>
                        </div>
                      </div>
                      
                      <div className="swap-route-info">
                        <div className="route-item">
                          <span>Route:</span>
                          <span>{transactionData.route.operationType}</span>
                        </div>
                        <div className="route-item">
                          <span>DEX:</span>
                          <span>{selectedDEX || 'Auto-Select'}</span>
                        </div>
                        <div className="route-item">
                          <span>Estimated Time:</span>
                          <span>{transactionData.route.estimatedTime}</span>
                        </div>
                        <div className="route-item">
                          <span>Total Fees:</span>
                          <span>${transactionData.totalFeesUSD.toFixed(2)}</span>
                        </div>
                        <div className="route-item">
                          <span>Slippage:</span>
                          <span>{slippageTolerance}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="auth-buttons">
                    <button 
                      className="btn btn-decline"
                      onClick={() => setShowAuthModal(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn btn-approve auth-btn"
                      onClick={() => {
                        setAuthStep('confirming');
                        // Simulate authentication delay
                        setTimeout(() => {
                          setAuthStep('wallet_connect');
                        }, 1500);
                      }}
                    >
                      🔐 Authenticate with Internet Identity
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {authStep === 'confirming' && (
              <div className="auth-modal-content">
                <div className="transaction-status">
                  <div className="status-icon spinning"><Lock className="w-12 h-12 text-blue-500" /></div>
                  <h3>Authenticating...</h3>
                  <p>Please complete the Internet Identity authentication in the popup window.</p>
                </div>
              </div>
            )}
            
            {authStep === 'wallet_connect' && (
              <>
                <div className="auth-modal-header">
                  <h3 className="auth-modal-title">Connect Ethereum Wallet</h3>
                  <button 
                    className="modal-close-btn" 
                    onClick={() => setShowAuthModal(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                
                <div className="auth-modal-content">
                  <div className="wallet-selection">
                    <p className="wallet-instruction">Choose your Ethereum wallet to complete the transaction:</p>
                    <div className="wallet-options">
                      {ETH_WALLET_OPTIONS.map((wallet) => (
                        <button
                          key={wallet.id}
                          className="wallet-option"
                          onClick={() => {
                            setSelectedWallet(wallet.name);
                            setAuthStep('wallet_connecting');
                            // Simulate wallet connection
                            setTimeout(() => {
                              setAuthStep('executing');
                              // Initialize transaction steps
                              setTransactionSteps([
                                { message: `MyHut Fees (0.1%) extracted`, completed: false, current: true },
                                { message: `SWAP ${transactionData?.fromAsset}→${transactionData?.toAsset} ${selectedDEX || 'ICPSwap'}`, completed: false, current: false },
                                { message: `${selectedDEX || 'ICPSwap'} 0.3% Fee extracted`, completed: false, current: false },
                                { message: `Sending ${transactionData?.toAsset}+ckETH (gas) to ICP EVM RPC`, completed: false, current: false },
                                { message: `Ethereum transaction confirmation`, completed: false, current: false }
                              ]);
                              // Start executing transaction steps
                              executeTransactionSteps();
                            }, 2000);
                          }}
                        >
                          {wallet.icon}
                          <span>{wallet.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {authStep === 'wallet_connecting' && (
              <div className="auth-modal-content">
                <div className="transaction-status">
                  <div className="status-icon spinning"><Wallet className="w-12 h-12 text-orange-500" /></div>
                  <h3>Connecting to {selectedWallet}...</h3>
                  <p>Please approve the connection request in your {selectedWallet} extension.</p>
                </div>
              </div>
            )}
            
            {authStep === 'executing' && (
              <div className="auth-modal-content">
                <div className="transaction-execution">
                  <h3>Executing Transaction</h3>
                  <p className="execution-subtitle">Processing your {transactionData.fromAsset} → {transactionData.toAsset} swap</p>
                  
                  <div className="transaction-steps">
                    {transactionSteps.map((step, index) => (
                      <div key={index} className={`transaction-step ${step.completed ? 'completed' : ''} ${step.current ? 'current' : ''}`}>
                        <div className="step-indicator">
                          {step.completed ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : step.current ? (
                            <div className="spinner"><Circle className="w-5 h-5 text-blue-500" /></div>
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <div className="step-content">
                          <span className={step.completed ? 'text-green-700' : step.current ? 'text-blue-700' : 'text-gray-500'}>
                            {step.message}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Show Ethereum confirmation meter when on the final step */}
                  {transactionSteps.length > 0 && transactionSteps[4]?.current && (
                    <div className="ethereum-confirmation-meter">
                      <div className="confirmation-icon">
                        <Circle className="w-8 h-8 text-blue-500" />
                      </div>
                      <h4>Ethereum Transaction Confirmation</h4>
                      <div className="confirmation-progress">
                        <div className="confirmation-bar">
                          <div className="confirmation-fill ethereum-executing"></div>
                        </div>
                        <div className="confirmation-status">
                          <Zap className="inline w-4 h-4 mr-1" /> Waiting for 65 confirmations...
                        </div>
                        <div className="confirmation-count">
                          <Lock className="inline w-4 h-4 mr-1" /> ICP requires 65 confirmations for Ethereum finality (~13 min)
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {authStep === 'success' && (
              <div className="auth-modal-content">
                <div className="transaction-success">
                  <div className="success-icon">
                    <PartyPopper className="w-16 h-16 text-green-500" />
                  </div>
                  <h3>Transaction Successful!</h3>
                  <p className="success-message">Your swap has been completed successfully.</p>
                  
                  <div className="success-details">
                    <div className="swap-summary">
                      <div className="summary-row">
                        <span>Swapped:</span>
                        <span><strong>{formatAmount(transactionData.amount)} {transactionData.fromAsset}</strong></span>
                      </div>
                      <div className="summary-row">
                        <span>Received:</span>
                        <span><strong>{formatAmount(transactionData.outputAmount)} {transactionData.toAsset}</strong></span>
                      </div>
                      <div className="summary-row">
                        <span>Total fees:</span>
                        <span><strong>${transactionData.totalFeesUSD.toFixed(2)}</strong></span>
                      </div>
                      <div className="summary-row">
                        <span>Via:</span>
                        <span><strong>{selectedDEX || 'ICPSwap'} + Ethereum</strong></span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="success-actions">
                    <button 
                      className="btn btn-approve success-btn"
                      onClick={() => {
                        setShowAuthModal(false);
                        setAuthStep('authenticate');
                        setTransactionData(null);
                        setSelectedWallet('');
                        setTransactionSteps([]);
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Continue Trading
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;