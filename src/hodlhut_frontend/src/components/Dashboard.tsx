import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Star,          // Best for
  Target,        // Goals/targets
  PieChart,      // Portfolio stats
  Plus,          // Add assets
  DollarSign,    // Money/earnings
  Trophy,        // Achievement/best
  Rocket,        // Launch/execute
  BarChart3      // Data/stats
} from 'lucide-react';
import '../styles/Dashboard.css';

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
  'USDC-ETH': USDCIcon,
  'ckUSDT': ckUSDTIcon,
  'USDT': USDTIcon,
  'USDT-ETH': USDTIcon,
  'ICP': ICPIcon,
  'USDC-SOL': USDCSOLIcon
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
      style={{ marginRight: '8px', verticalAlign: 'middle' }}
    />
  );
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
}> = ({ options, value, onChange, placeholder, className }) => {
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
    <div ref={dropdownRef} className={`custom-dropdown ${className || ''}`} style={{ position: 'relative' }}>
      <div 
        className="dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          border: '2px solid var(--tertiary-500)',
          borderRadius: '8px',
          background: 'white',
          cursor: 'pointer',
          minHeight: '40px'
        }}
      >
        {selectedOption ? (
          <>
            <AssetIcon asset={selectedOption.value} size={20} />
            <span>{selectedOption.label}</span>
          </>
        ) : (
          <span style={{ color: '#d65309' }}>{placeholder}</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '12px' }}>▼</span>
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
            className="dropdown-search"
            style={{ width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          />
          {filteredOptions.map(option => (
            <div
              key={option.value}
              className={`dropdown-option ${value === option.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
                setSearchTerm('');
              }}
            >
              <AssetIcon asset={option.value} size={20} />
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Types for Enhanced Smart Solutions
interface EnhancedSmartSolution {
  title: string;
  description: string;
  badge: string;
  receive: string;
  cost: string;
}

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

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('addAssets');
  const [currentScenario, setCurrentScenario] = useState<keyof typeof PORTFOLIO_SCENARIOS>('defi-user');
  const [portfolio, setPortfolio] = useState<Portfolio>(PORTFOLIO_SCENARIOS[currentScenario]);
  
  // Advanced Swap State
  const [fromAsset, setFromAsset] = useState('');
  const [toAsset, setToAsset] = useState('');
  const [swapAmount, setSwapAmount] = useState('');
  const [selectedDEX, setSelectedDEX] = useState<string | null>(null);
  const [swapAnalysis, setSwapAnalysis] = useState<CompleteSwapAnalysis | null>(null);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const [showSmartSolutions, setShowSmartSolutions] = useState(false);
  const [showDEXSelection, setShowDEXSelection] = useState(false);
  const [slippageTolerance, setSlippageTolerance] = useState(1.0);
  const [currentGasPrice, setCurrentGasPrice] = useState(25);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
  
  // Enhanced Smart Solutions State
  const [smartSolutions, setSmartSolutions] = useState<EnhancedSmartSolution[]>([]);
  const [selectedSolution, setSelectedSolution] = useState<number | null>(null);
  const [showAllSolutions, setShowAllSolutions] = useState(true);


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
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        {route.steps.map((step, index) => (
          <React.Fragment key={index}>
            <div style={{
              background: 'white',
              border: '2px solid var(--tertiary-500)',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              fontWeight: 600,
              textAlign: 'center',
              minWidth: '120px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'center'
            }}>
              <span className="swap-asset-box-text">
                <AssetIcon asset={step} size={16} /> {step}
              </span>
            </div>
            {index < route.steps.length - 1 && (
              <div className="primary-arrow">→</div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };
  
  // Deposit Modal State
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);
  const [selectedDepositAsset, setSelectedDepositAsset] = useState<string>('');
  
  // Enhanced DEX Options with Real Stats - FIXED STATS
  const DEX_OPTIONS_ENHANCED = {
    KongSwap: {
      name: 'KongSwap',
      badge: 'speed',
      stats: {
        'Swap Speed': '5-12 seconds',
        'Trading Fee': '0.25%',
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
    if (!fromAsset || !toAsset || !swapAmount || parseFloat(swapAmount) <= 0) {
      return;
    }

    const amount = parseFloat(swapAmount);
    
    // STEP 1: Get basic swap analysis
    const analysis = analyzeCompleteSwap(fromAsset, toAsset, amount, portfolio, selectedDEX || 'ICPSwap');
    
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
      const enhancedSolutions = [{
        title: solution.title,
        description: solution.description,
        badge: 'RECOMMENDED',
        receive: `${formatAmount(analysis.outputAmount)} ${analysis.toAsset}`,
        cost: `${formatAmount(solution.feeAmount)} ${solution.feeToken}`
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
    setSelectedSolution(solutionIndex);
    setShowAllSolutions(false);
    
    const solution = smartSolutions[solutionIndex];
    console.log(`User approved solution: ${solution.title}`);
    
    // Here you would normally execute the solution logic
    alert(`Solution Approved!\n\n${solution.title}\n\n${solution.description}\n\nCost: ${solution.cost}\nYou'll receive: ${solution.receive}`);
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


  // Rendering functions
  const renderSlippageSettings = () => {
    return (
      <div className="slippage-settings">
        <div className="slippage-header">
          <span className="text-primary-bold"><Settings size={16} style={{marginRight: '8px', verticalAlign: 'middle'}} />Slippage Tolerance</span>
          <div className="slippage-buttons">
            <button 
              className={`slippage-btn ${slippageTolerance === 0.5 ? 'active' : ''}`}
              onClick={() => setSlippageTolerance(0.5)}
            >
              0.5%
            </button>
            <button 
              className={`slippage-btn ${slippageTolerance === 1.0 ? 'active' : ''}`}
              onClick={() => setSlippageTolerance(1.0)}
            >
              1.0%
            </button>
            <button 
              className={`slippage-btn ${slippageTolerance === 3.0 ? 'active' : ''}`}
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
      <div className="gas-optimization">
        <div className="gas-header">
          <span className="text-primary-bold"><Fuel size={16} style={{marginRight: '8px', verticalAlign: 'middle'}} />Gas Optimization</span>
          <span className="gas-price">Current: {currentGasPrice} gwei</span>
        </div>
        <div className="gas-recommendation">
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

  const handleBackToHome = () => {
    navigate('/');
  };

  const renderStatusBar = () => (
    <div className="status-bar">
      <div className="status-items">
        <div><PieChart className="inline w-4 h-4 mr-1" /> Portfolio: ${calculatePortfolioValue().toLocaleString()}</div>
        <div>⏰ Session: {formatTime(timeRemaining)}</div>
        <div><span className="status-indicator"></span> Connected Live Onchain (Demo Mode)</div>
      </div>
    </div>
  );

  const renderNavigation = () => (
    <div className="navigation">
      <div className="nav-buttons">
        <button
          className={`nav-btn ${activeSection === 'addAssets' ? 'active' : ''}`}
          onClick={() => setActiveSection('addAssets')}
        >
          <Plus className="inline w-4 h-4 mr-1" /> Add Assets
        </button>
        <button
          className={`nav-btn ${activeSection === 'swapAssets' ? 'active' : ''}`}
          onClick={() => setActiveSection('swapAssets')}
        >
          <ArrowLeftRight size={20} style={{marginRight: '8px', verticalAlign: 'middle'}} />Swap Assets
        </button>
        <button
          className={`nav-btn ${activeSection === 'myGarden' ? 'active' : ''}`}
          onClick={() => setActiveSection('myGarden')}
        >
          🌱 My Garden
        </button>
        <button
          className={`nav-btn ${activeSection === 'transactionHistory' ? 'active' : ''}`}
          onClick={() => setActiveSection('transactionHistory')}
        >
          📋 History
        </button>
        <button
          className="nav-btn"
          onClick={handleBackToHome}
        >
          🏠 Home
        </button>
      </div>
    </div>
  );

  const renderAddAssetsSection = () => (
    <div className="section-content">
      <h2 className="add-assets-main-title">Add Assets to Your Portfolio</h2>
      
      {/* Chain Fusion Deposits */}
      <div className="deposit-category">
        <h3 className="add-assets-section-title">Chain Fusion Deposits</h3>
        <p className="add-assets-section-subtitle">Deposit native assets from their L1 chains</p>
        
        <div className="asset-grid">
          {/* BACKEND NOTE: Bitcoin wallet interface + Bitcoin RPC canister */}
          <div className="asset-card" onClick={() => startDeposit('BTC')}>
            <div className="asset-icon-container">
              <AssetIcon asset="BTC" size={48} />
            </div>
            <div className="asset-name">Bitcoin</div>
            <div className="asset-balance">Native BTC → ckBTC</div>
          </div>
          
          {/* BACKEND NOTE: Ethereum wallet interface + Ethereum RPC canister */}
          <div className="asset-card" onClick={() => startDeposit('ETH')}>
            <div className="asset-icon-container">
              <AssetIcon asset="ETH" size={48} />
            </div>
            <div className="asset-name">Ethereum</div>
            <div className="asset-balance">Native ETH → ckETH</div>
          </div>
          
          {/* BACKEND NOTE: Solana wallet interface + Solana RPC canister */}
          <div className="asset-card" onClick={() => startDeposit('SOL')}>
            <div className="asset-icon-container">
              <AssetIcon asset="SOL" size={48} />
            </div>
            <div className="asset-name">Solana</div>
            <div className="asset-balance">Native SOL → ckSOL</div>
          </div>
          
          {/* BACKEND NOTE: Ethereum wallet interface + Ethereum RPC canister (ERC-20 USDC) */}
          <div className="asset-card" onClick={() => startDeposit('USDC')}>
            <div className="asset-icon-container">
              <AssetIcon asset="USDC" size={48} />
            </div>
            <div className="asset-name">USDC</div>
            <div className="asset-balance">Ethereum USDC → ckUSDC</div>
          </div>
          
          {/* BACKEND NOTE: Ethereum wallet interface + Ethereum RPC canister (ERC-20 USDT) */}
          <div className="asset-card" onClick={() => startDeposit('USDT')}>
            <div className="asset-icon-container">
              <AssetIcon asset="USDT" size={48} />
            </div>
            <div className="asset-name">USDT</div>
            <div className="asset-balance">Ethereum USDT → ckUSDT</div>
          </div>
          
          {/* BACKEND NOTE: Solana wallet interface + Solana RPC canister (SPL USDC) */}
          <div className="asset-card" onClick={() => startDeposit('USDC-SOL')}>
            <div className="asset-icon-container">
              <AssetIcon asset="USDC-SOL" size={48} />
            </div>
            <div className="asset-name">USDC (SOL)</div>
            <div className="asset-balance">Solana USDC → ckUSDC</div>
          </div>
        </div>
      </div>

      {/* ICRC/ICP Assets */}
      <div className="deposit-category">
        <h3 className="add-assets-section-title">Add ICRC and ICP Assets</h3>
        <p className="add-assets-section-subtitle">Deposit assets already on the Internet Computer Protocol</p>
        
        <div className="asset-grid">
          <div className="asset-card" onClick={() => startDeposit('ckBTC')}>
            {/* Backend: ICP wallet interface (Plug, etc.) + ICRC-1 token integration */}
            <div className="asset-icon-container">
              <AssetIcon asset="ckBTC" size={48} />
            </div>
            <div className="asset-name">ckBTC</div>
            <div className="asset-balance">Chain Key Bitcoin</div>
          </div>
          
          <div className="asset-card" onClick={() => startDeposit('ckETH')}>
            {/* Backend: ICP wallet interface (Plug, etc.) + ICRC-1 token integration */}
            <div className="asset-icon-container">
              <AssetIcon asset="ckETH" size={48} />
            </div>
            <div className="asset-name">ckETH</div>
            <div className="asset-balance">Chain Key Ethereum</div>
          </div>
          
          <div className="asset-card" onClick={() => startDeposit('ckUSDC')}>
            {/* Backend: ICP wallet interface (Plug, etc.) + ICRC-1 token integration */}
            <div className="asset-icon-container">
              <AssetIcon asset="ckUSDC" size={48} />
            </div>
            <div className="asset-name">ckUSDC</div>
            <div className="asset-balance">Chain Key USDC</div>
          </div>
          
          <div className="asset-card" onClick={() => startDeposit('ckUSDT')}>
            {/* Backend: ICP wallet interface (Plug, etc.) + ICRC-1 token integration */}
            <div className="asset-icon-container">
              <AssetIcon asset="ckUSDT" size={48} />
            </div>
            <div className="asset-name">ckUSDT</div>
            <div className="asset-balance">Chain Key USDT</div>
          </div>
          
          <div className="asset-card" onClick={() => startDeposit('ckSOL')}>
            {/* Backend: ICP wallet interface (Plug, etc.) + ICRC-1 token integration */}
            <div className="asset-icon-container">
              <AssetIcon asset="ckSOL" size={48} />
            </div>
            <div className="asset-name">ckSOL</div>
            <div className="asset-balance">Chain Key Solana</div>
          </div>
          
          <div className="asset-card" onClick={() => startDeposit('ICP')}>
            {/* Backend: ICP wallet interface (Plug, etc.) + native ICP integration */}
            <div className="asset-icon-container">
              <AssetIcon asset="ICP" size={48} />
            </div>
            <div className="asset-name">ICP</div>
            <div className="asset-balance">Internet Computer</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSwapAssetsSection = () => (
    <div className="section-content">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className="card-title">Sovereign Multichain Custom Routing</div>
      </div>
      
      <div className="enhanced-swap-interface">
        <div className="swap-grid">
          {/* From Asset (Left) */}
          <div className="asset-selector from">
            <label className="asset-label swap-white-label">From (Your Assets)</label>
            {/* Backend: Pulls user assets from their sovereign canister (MyHut) */}
            <CustomDropdown
              className="asset-dropdown"
              value={fromAsset}
              onChange={(value) => {
                setFromAsset(value);
                setSwapAmount('');
              }}
              placeholder="Select asset to swap"
              options={[
                { value: 'ckBTC', label: 'ckBTC (Bitcoin)' },
                { value: 'ckETH', label: 'ckETH (Ethereum)' },
                { value: 'ckSOL', label: 'ckSOL (Solana)' },
                { value: 'ckUSDC', label: 'ckUSDC (Multi-chain)' },
                { value: 'ckUSDT', label: 'ckUSDT (Multi-chain)' },
                { value: 'ICP', label: 'ICP (Internet Computer)' }
              ]}
            />
            
            <div>
              <label className="asset-label swap-white-label">Amount</label>
              <input 
                type="number" 
                className="amount-input" 
                placeholder="0.00" 
                step="0.000001" 
                min="0"
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
              />
              <div className="balance-row">
                <span className="balance-text">
                  Balance: {fromAsset && portfolio[fromAsset] ? portfolio[fromAsset] : '--'}
                </span>
                <button 
                  className="max-button" 
                  onClick={() => {
                    if (fromAsset && portfolio[fromAsset]) {
                      setSwapAmount(portfolio[fromAsset].toString());
                    }
                  }}
                  disabled={!fromAsset || !portfolio[fromAsset]}
                >
                  MAX
                </button>
              </div>
            </div>
          </div>
          
          {/* Swap Arrow (Center) */}
          <div className="swap-arrow">
            <button 
              className="arrow-button" 
              onClick={() => {
                if (fromAsset && toAsset && portfolio[toAsset]) {
                  const temp = fromAsset;
                  setFromAsset(toAsset);
                  setToAsset(temp);
                  setSwapAmount('');
                } else {
                  alert('You can only reverse swap if you own both assets!');
                }
              }}
              title="Reverse swap direction"
            >
              ⇄
            </button>
          </div>
          
          {/* To Asset (Right) */}
          <div className="asset-selector to">
            <label className="asset-label swap-white-label">To (Multichain Destination)</label>
            {/* Backend: BTC triggers Bitcoin RPC, ETH/USDC/USDT triggers EVM RPC, SOL/USDC-SOL triggers Solana RPC */}
            <CustomDropdown
              className="asset-dropdown"
              value={toAsset}
              onChange={setToAsset}
              placeholder="Select destination"
              options={[
                { value: 'ckBTC', label: 'ckBTC (Bitcoin L2)' },
                { value: 'ckETH', label: 'ckETH (Ethereum L2)' },
                { value: 'ckSOL', label: 'ckSOL (Solana L2)' },
                { value: 'ckUSDC', label: 'ckUSDC (ICP)' },
                { value: 'ckUSDT', label: 'ckUSDT (ICP)' },
                { value: 'ICP', label: 'ICP' },
                { value: 'BTC', label: 'Bitcoin L1' }, // Bitcoin RPC canister
                { value: 'ETH', label: 'Ethereum L1' }, // EVM RPC canister
                { value: 'SOL', label: 'Solana L1' }, // Solana RPC canister
                { value: 'USDC-ETH', label: 'USDC (ETH)' }, // EVM RPC canister
                { value: 'USDT-ETH', label: 'USDT (ETH)' }, // EVM RPC canister
                { value: 'USDC-SOL', label: 'USDC (Solana)' } // Solana RPC canister
              ].filter(option => option.value !== fromAsset)}
            />
            
            <div>
              <label className="asset-label swap-white-label">You'll Receive</label>
              <div className="amount-input equivalent-amount">
                {swapAnalysis?.outputAmount ? formatAmount(swapAnalysis.outputAmount) : '0'}
              </div>
              <div className="balance-row">
                <span className="balance-text">
                  Balance: You'll receive {toAsset}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exchange Rate Display */}
      <div className="exchange-rate-display">
        {swapAnalysis?.outputAmount && swapAmount ? 
          `Rate: 1 ${fromAsset} = ${(swapAnalysis.outputAmount / parseFloat(swapAmount)).toFixed(2)} ${toAsset}` : 
          'Enter amount to see exchange rate'
        }
      </div>

      {/* STEP 1: What's Happening (Route Explanation) - ALWAYS SHOWN FIRST */}
      {showRouteDetails && swapAnalysis && (
        <div className="route-display" style={{
          background: fromAsset === toAsset ? 'var(--gradient-secondary)' : 'var(--tertiary-50)',
          borderColor: fromAsset === toAsset ? 'var(--secondary-500)' : 'var(--tertiary-500)'
        }}>
          <div className="route-header" style={{ justifyContent: 'center' }}>
            <span className="swap-transaction-title">What's Happening: Your Transaction Explained</span>
          </div>
          
          {fromAsset === toAsset ? (
            <div className="same-token-warning">
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px'}}><Waves size={20} />Hold on there surfer!</div>
              You are trying to swap the same token.<br />
              Please check your swap and try again.
            </div>
          ) : (
            <>
              <SimpleRouteDisplay route={swapAnalysis.route} />

              <div className="route-details">
                <div className="route-detail">
                  <div className="route-detail-label">Operation</div>
                  <div className="route-detail-value">
                    {swapAnalysis.route.operationType === 'DEX + Minter' ? 'DEX + Chain Fusion' :
                     swapAnalysis.route.operationType === 'DEX Swap' ? 'DEX' :
                     swapAnalysis.route.operationType === 'Minter Operation' ? 'Chain Fusion' :
                     swapAnalysis.route.operationType}
                  </div>
                </div>
                <div className="route-detail">
                  <div className="route-detail-label">Networks</div>
                  <div className="route-detail-value">
                    {swapAnalysis.route.chainsInvolved.map(chain => 
                      chain === 'Internet Computer' ? 'ICP' : chain
                    ).join(' → ')}
                  </div>
                </div>
                <div className="route-detail">
                  <div className="route-detail-label">Est. Time</div>
                  <div className="route-detail-value">{swapAnalysis.route.estimatedTime}</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 2: Choose Your Method (DEX Selection) - ONLY WHEN NEEDED */}
      {showDEXSelection && swapAnalysis && fromAsset !== toAsset && (
        <div className="dex-selection-panel">
          <div className="dex-header" style={{ justifyContent: 'center' }}>
            <span className="swap-dex-title">
              {swapAnalysis.route.operationType === 'DEX + Minter'
                ? 'First choose your DEX' 
                : 'Choose your DEX'}
            </span>
          </div>
          
          <div className="dex-options">
            {/* Backend: KongSwap onclick calls KongSwap API, ICPSwap onclick calls ICPSwap API */}
            {Object.entries(DEX_OPTIONS_ENHANCED).map(([key, dex]) => (
              <div 
                key={key}
                className={`dex-option ${selectedDEX === key ? 'selected' : ''}`}
                onClick={() => setSelectedDEX(key)}
              >
                <div className={`dex-badge ${dex.badge}`}>
                  {dex.badge === 'speed' ? <><Zap className="inline w-4 h-4 mr-1" /> SPEED FOCUSED</> : <><Waves className="inline w-4 h-4 mr-1" /> LIQUIDITY FOCUSED</>}
                </div>
                <div className="dex-name">{dex.name}</div>
                
                {/* Improved Stats Grid */}
                <div className="dex-stats-grid">
                  {Object.entries(dex.stats).map(([stat, value]) => (
                    <div key={stat} className="stat-item">
                      <div className="stat-label">{stat}</div>
                      <div className="stat-value">{value}</div>
                    </div>
                  ))}
                </div>
                
                {/* Clean Advantages/Trade-offs */}
                <div className="dex-info-section">
                  <div className="dex-advantages">
                    <strong><Star size={16} style={{marginRight: '4px', verticalAlign: 'middle'}} />Best for:</strong>
                    <span>{dex.advantages.join(' • ')}</span>
                  </div>
                  <div className="dex-tradeoffs">
                    <strong><Scale size={16} style={{marginRight: '4px', verticalAlign: 'middle'}} />Trade-offs:</strong>
                    <span>{dex.tradeoffs.join(' • ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="choice-matters-text">
            <strong>Your Choice Matters:</strong> We show you all options with real data - you decide what's most important for your trade.
          </div>
        </div>
      )}

      {/* STEP 3: Smart Solutions with Progressive Yes/No Interactions */}
      {showSmartSolutions && smartSolutions.length > 0 && (
        <div className="smart-solutions-panel">
          <div className="solutions-header" style={{justifyContent: 'center', alignItems: 'center'}}>
            <Lightbulb size={20} style={{color: 'white'}} />
            <span className="swap-smart-solutions-title">Smart Solutions for Fee Payment</span>
            {selectedSolution !== null && (
              <button 
                onClick={resetSolutionsView}
                style={{ 
                  marginLeft: 'auto', 
                  background: 'var(--surface-primary)', 
                  border: '1px solid var(--border-primary)', 
                  borderRadius: '4px', 
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
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
                <div key={actualIndex} className={`solution-card ${solution.badge.toLowerCase().replace(/\s+/g, '-')} ${isSelected ? 'selected' : ''}`}>
                  <div className={`solution-badge ${solution.badge.toLowerCase().replace(/\s+/g, '-')}`}>
                    {solution.badge === 'RECOMMENDED' ? <><CheckCircle size={16} style={{marginRight: '4px', verticalAlign: 'middle', color: '#10b981'}} />RECOMMENDED</> : 
                     solution.badge === 'REQUIRED STEP' ? <><AlertTriangle size={16} style={{marginRight: '4px', verticalAlign: 'middle', color: '#f59e0b'}} />REQUIRED STEP</> : 
                     solution.badge === 'ALTERNATIVE' ? <><Lightbulb size={16} style={{marginRight: '4px', verticalAlign: 'middle', color: '#6366f1'}} />ALTERNATIVE</> : 
                     <><Lightbulb size={16} style={{marginRight: '4px', verticalAlign: 'middle', color: '#6366f1'}} />{solution.badge}</>}
                  </div>
                  
                  <div className="solution-title">{solution.title}</div>
                  <div className="solution-description">{solution.description}</div>
                  
                  <div className="solution-details">
                    <div className="solution-receive">
                      You'll receive: <strong>{solution.receive}</strong>
                    </div>
                    <div className="solution-cost">
                      Cost: <strong>{solution.cost}</strong>
                    </div>
                  </div>

                  {/* Progressive Yes/No Buttons */}
                  {!isSelected && (
                    <div className="solution-actions">
                      <button 
                        className={`solution-btn approve ${solution.badge === 'RECOMMENDED' ? 'primary' : 'secondary'}`}
                        onClick={() => handleApproveSolution(actualIndex)}
                      >
                        {solution.badge === 'RECOMMENDED' ? <><CheckCircle className="inline w-4 h-4 mr-1" /> Yes, Use This</> : 
                         solution.badge === 'REQUIRED STEP' ? <><AlertTriangle className="inline w-4 h-4 mr-1" /> Complete This Step</> : 
                         <><Lightbulb className="inline w-4 h-4 mr-1" /> Choose This Option</>}
                      </button>
                      
                      <button 
                        className="solution-btn reject"
                        onClick={() => handleRejectSolution(actualIndex)}
                      >
                        {isFirstSolution ? '❌ See Other Options' : '❌ Skip This'}
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
        <div className="transaction-preview-enhanced">
          <div className="preview-header">
            📋 Transaction Preview
          </div>
          
          <div className="preview-grid">
            <div className="preview-item">
              <div className="preview-label">From</div>
              <div className="preview-value">{formatAmount(swapAnalysis.amount)} {swapAnalysis.fromAsset}</div>
            </div>
            <div className="preview-item">
              <div className="preview-label">To</div>
              <div className="preview-value">{formatAmount(swapAnalysis.outputAmount)} {swapAnalysis.toAsset}</div>
            </div>
            <div className="preview-item">
              <div className="preview-label">Rate</div>
              <div className="preview-value">1 {swapAnalysis.fromAsset} = {formatAmount(swapAnalysis.rate)} {swapAnalysis.toAsset}</div>
            </div>
            <div className="preview-item">
              <div className="preview-label">Route</div>
              <div className="preview-value">{swapAnalysis.route.steps.join(' → ')}</div>
            </div>
          </div>

          {swapAnalysis.feeRequirements.length > 0 && (
            <div className="fees-breakdown">
              <div className="preview-label">Fee Breakdown</div>
              {/* Backend: DEX trading fees should pull live data from KongSwap API or ICPSwap API */}
              {swapAnalysis.feeRequirements.map((fee: any, index: number) => (
                <div key={index} className="fee-item">
                  <span>{fee.description}</span>
                  <span>${fee.usdValue.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="total-section">
            <div className="total-item">
              <span>Total Fees</span>
              <span>${swapAnalysis.totalFeesUSD.toFixed(2)}</span>
            </div>
          </div>

          <button 
            className="execute-swap-btn"
            onClick={() => {
              if (swapAnalysis.needsSmartSolutions) {
                alert('Fee Requirements Not Met\n\nYou need additional assets for fees. Please use one of the Smart Solutions above.');
                return;
              }
              
              alert(`✅ Swap Executed Successfully!\n\n${formatAmount(swapAnalysis.amount)} ${swapAnalysis.fromAsset} → ${formatAmount(swapAnalysis.outputAmount)} ${swapAnalysis.toAsset}\n\nRoute: ${swapAnalysis.route.operationType}\nEstimated Time: ${swapAnalysis.route.estimatedTime}\nTotal Fees: $${swapAnalysis.totalFeesUSD.toFixed(2)}`);
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
        <div key={asset} className={`plant-field ${isPlanted ? 'planted' : 'empty'}`}>
          <div className="field-icon">
            <AssetIcon asset={asset} size={48} />
          </div>
          <div className={`field-asset ${isPlanted ? 'planted' : 'empty'}`}>
            {asset}
          </div>
          <div className={`field-amount ${isPlanted ? 'planted' : ''}`}>
            {isPlanted ? `${formatAmount(planted)} ${asset}` : 'Ready to plant'}
          </div>
          <div className={`field-growth ${isPlanted ? 'planted' : ''}`}>
            {isPlanted ? (
              <>
                🌱 Growing (45 days)
                <br />Yield/Week
              </>
            ) : (
              <>
                Plant {asset} to boost diversity
                <br />Available: {formatAmount(available)} {asset}
              </>
            )}
          </div>
          {isPlanted ? (
            <button className="harvest-btn" onClick={() => alert(`🌾 Harvested from ${asset}!`)} style={{ color: '#440f04', textAlign: 'center' }}>
              Claim Yield
            </button>
          ) : (
            <button className="plant-btn" onClick={() => alert(`🌱 Plant ${asset} feature coming soon!`)}>
              Plant {asset} 🌱
            </button>
          )}
        </div>
      );
    };

    return (
      <div className="garden-container">
        {/* Garden Header */}
        <div className="garden-header">
          <h1 className="garden-title" style={{ color: '#440f04' }}>🌱 My Garden 🌱</h1>
          <p className="garden-subtitle">Hodl Longevity & Asset Diversity Claimable Rewards</p>
          <div className="garden-level-display" style={{ color: 'white' }}>
            🌿 Sprout Gardener
          </div>
        </div>

        {/* Current Yield Stats Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: 'var(--text-3xl)', 
            background: 'var(--gradient-primary)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent', 
            margin: 0 
          }}>
            Your Current Yield Stats
          </h2>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><DollarSign className="w-6 h-6" style={{ color: 'white' }} /></div>
            <div className="stat-value">${calculateTotalYield().toFixed(0)}</div>
            <div className="stat-label">Total Garden Yield</div>
            <div className="stat-details">This week: +${(calculateTotalYield() * 0.1).toFixed(0)}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon"><Clock className="w-6 h-6" style={{ color: 'white' }} /></div>
            <div className="stat-value">42</div>
            <div className="stat-label">Average Hodl Days</div>
            <div className="stat-details">Longest: 127 days</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon"><Target className="w-6 h-6" style={{ color: 'white' }} /></div>
            <div className="stat-value">{assetsWithBalance.filter(asset => plantedAmounts[asset] > 0).length}/6</div>
            <div className="stat-label">Asset Diversity</div>
            <div className="stat-details">{calculateDiversityMultiplier()}x multiplier active</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon"><Trophy className="w-6 h-6" style={{ color: 'white' }} /></div>
            <div className="stat-value">{calculateDiversityMultiplier()}x</div>
            <div className="stat-label">Total Multiplier</div>
            <div className="stat-details">Next level: 15 days</div>
          </div>
        </div>

        {/* Garden Fields */}
        <div className="garden-fields">
          <div className="fields-header">
            <h2 className="fields-title" style={{ color: '#440f04' }}>🪴 Your Biodiversity</h2>
            <p className="fields-subtitle">Plant assets to start earning yield • Greater diversity = Higher rewards</p>
          </div>

          <div className="planting-grid">
            {assetsWithBalance.map(asset => renderPlantField(asset))}
          </div>
        </div>
      </div>
    );
  };

  const renderTransactionHistorySection = () => (
    <div className="section-content">
      <h2>📋 Transaction History</h2>
      <p>View all your trading and deposit activity</p>
      <div className="history-placeholder">
        <div>📋 Transaction history coming soon!</div>
        <div>Complete audit trail of all your DeFi activities...</div>
      </div>
    </div>
  );

  const renderPortfolioOverview = () => {
    // Only show assets available in the FROM dropdown that have a balance > 0
    const fromAssets = ['ckBTC', 'ckETH', 'ckSOL', 'ckUSDC', 'ckUSDT', 'ICP'];
    const assetsWithBalance = fromAssets.filter(asset => portfolio[asset] && portfolio[asset] > 0);
    
    return (
      <div className="portfolio-overview-horizontal">
        <div className="portfolio-header">
          <h3>Portfolio Overview</h3>
          <div className="portfolio-value">
            <div className="total-value">${calculatePortfolioValue().toLocaleString()}</div>
            <div className="value-change">+2.4% today</div>
          </div>
        </div>
        
        <div className="portfolio-assets-grid">
          {assetsWithBalance.map((asset) => {
            const amount = portfolio[asset];
            return (
              <div key={asset} className="portfolio-asset-card">
                <div className="asset-icon-center">
                  <AssetIcon asset={asset} size={24} />
                </div>
                <div className="asset-name">{asset}</div>
                <div className="asset-amount">{amount}</div>
                <div className="asset-value">
                  ${((MASTER_ASSETS[asset]?.price || 0) * amount).toLocaleString()}
                </div>
              </div>
            );
          })}
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

  // Smart decimal formatting - remove decimals for whole numbers >= 1
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
    <div className="dashboard">
      <div className="dashboard-container">
        {renderStatusBar()}
        
        <div className="hero-section">
          <h1>My Hut</h1>
          <p>Deposit, Swap, Stake, Play, & Score!</p>
        </div>
        {renderNavigation()}
        
        {/* Portfolio Overview - Now above main content */}
        {renderPortfolioOverview()}
        
        <div className="main-content">
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
      />
    </div>
  );
};

export default Dashboard;