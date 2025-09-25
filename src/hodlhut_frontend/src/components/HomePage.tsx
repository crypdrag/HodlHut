import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AssetIcon from './AssetIcon';
import InternetIdentityLogin from './InternetIdentityLogin';
// Tailwind CSS classes now handle all styling
import HeroAnimationVideo from '../../assets/images/Hero_Animation.mp4';
import {
  Radio,      // Personal Sovereignty - Broadcasting personal control
  Network,    // Universal Router - Network/routing
  Brain,      // Smart Abstraction - AI/Smart features
  TrendingUp, // My Garden Rewards - Profits/growth
  Shield,     // Full Stack Security - Protection
  PieChart,   // Diverse Portfolio - Portfolio management
  ArrowUpDown,// Swap Assets - Two arrows in opposite directions
  Sprout,     // Garden/Plant icon for staking rewards
  Zap,        // DEX Aggregation Agent - Lightning/speed
  Gamepad2    // My Dog Park - Gaming
} from 'lucide-react';
// import HeroBgImage from '../../assets/images/Hero_bg.png';

// Lucide icon components with color variety
const PersonalSovereigntyIcon: React.FC = () => <Radio size={48} className="text-primary-500" />; // Blue 1
const UniversalRouterIcon: React.FC = () => <Network size={48} className="text-primary-500" />; // Blue 2
const SmartAbstractionIcon: React.FC = () => <Brain size={48} className="text-warning-500" />; // Yellow 1
const DEXAggregationIcon: React.FC = () => <Zap size={48} className="text-warning-500" />; // Yellow 2
const MyGardenRewardsIcon: React.FC = () => <TrendingUp size={48} className="text-success-500" />; // Green 1
const MyDogParkIcon: React.FC = () => <Gamepad2 size={48} className="text-success-500" />; // Green 2
const FullStackSecurityIcon: React.FC = () => <Shield size={48} className="text-error-500" />; // Orange 1
const DiversePortfolioIcon: React.FC = () => <PieChart size={48} className="text-error-500" />; // Orange 2

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login, logout, principal, isLoading } = useAuth();
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [showAnimation, setShowAnimation] = useState(true);
  const [showIILogin, setShowIILogin] = useState(false);

  useEffect(() => {
    // Hide animation after 4 seconds
    const timer = setTimeout(() => {
      setShowAnimation(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleGetHut = async () => {
    if (isAuthenticated) {
      // User is already authenticated, navigate to Add Assets with new user flow
      navigate('/dashboard', { state: { activeSection: 'addAssets', userFlow: 'newUser' } });
    } else {
      // DEMO MODE: Skip login modal, simulate direct login
      console.log('Demo mode: Bypassing Internet Identity modal');
      const success = await login();
      if (success) {
        navigate('/dashboard', { state: { activeSection: 'addAssets', userFlow: 'newUser' } });
      }
    }
  };

  const handleMyHuts = async () => {
    if (isAuthenticated) {
      // User is authenticated, navigate to Add Assets with returning user flow
      navigate('/dashboard', { state: { activeSection: 'addAssets', userFlow: 'returningUser' } });
    } else {
      // DEMO MODE: Skip login modal, simulate direct login
      console.log('Demo mode: Bypassing Internet Identity modal');
      const success = await login();
      if (success) {
        navigate('/dashboard', { state: { activeSection: 'addAssets', userFlow: 'returningUser' } });
      }
    }
  };

  const handleIILogin = async () => {
    try {
      const success = await login();
      if (success) {
        setShowIILogin(false);
        // Navigate to Dashboard with Add Assets section active
        navigate('/dashboard', { state: { activeSection: 'addAssets', userFlow: 'newUser' } });
      }
    } catch (error) {
      console.error('Internet Identity login failed:', error);
      // Handle error - could show toast or error message
    }
  };

  const handleCancelLogin = () => {
    setShowIILogin(false);
  };

  return (
    <div className="bg-bg text-text-primary min-h-screen overflow-x-hidden">
      {/* Header */}
      <header className="nav-header">
        <div className="container-app pad-section">
          {/* Mobile: Logo and brand name on top row */}
          <div className="flex justify-center items-center gap-3 mb-3 sm:hidden">
            <AssetIcon asset="logo" size={50} className="w-12 h-12 object-contain" />
            <span className="text-2xl font-bold text-text-primary" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>HodlHut</span>
          </div>

          {/* Navigation row */}
          <nav className="flex justify-between items-center">
            {/* Desktop: Logo and brand name on left */}
            <div className="hidden sm:flex items-center gap-3">
              <AssetIcon asset="logo" size={50} className="w-12 h-12 object-contain" />
              <span className="text-2xl font-bold text-text-primary" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>HodlHut</span>
            </div>

            {/* Navigation buttons - mobile centered, desktop right */}
            <div className="flex gap-1 sm:gap-4 items-center mx-auto sm:mx-0">
            {isAuthenticated ? (
              <>
                <button
                  className="btn-bitcoin text-xs sm:text-base px-2 py-1 sm:px-4 sm:py-2 whitespace-nowrap"
                  onClick={handleGetHut}
                >
                  Get Hut
                </button>
                <button
                  className="btn-success text-xs sm:text-base px-2 py-1 sm:px-4 sm:py-2 whitespace-nowrap"
                  onClick={handleMyHuts}
                >
                  My Huts
                </button>
                <div className="relative group">
                  <button
                    className="btn-sienna text-xs sm:text-base px-2 py-1 sm:px-4 sm:py-2 whitespace-nowrap"
                    onClick={logout}
                  >
                    Logout
                  </button>
                  {principal && (
                    <div className="absolute top-full right-0 mt-1 bg-surface-1 border border-white/10 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 z-50 p-2 min-w-max">
                      <span className="text-xs text-text-secondary px-2 py-1 rounded bg-surface-2">
                        👤 {principal.toString().slice(0, 8)}...
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  className={`btn-bitcoin text-xs sm:text-base px-2 py-1 sm:px-4 sm:py-2 whitespace-nowrap transition-colors ${isLoading ? 'bg-primary-600' : ''}`}
                  onClick={handleGetHut}
                  disabled={isLoading}
                >
                  Get Hut
                </button>
                <button
                  className={`btn-success text-xs sm:text-base px-2 py-1 sm:px-4 sm:py-2 whitespace-nowrap transition-colors ${isLoading ? 'bg-success-600' : ''}`}
                  onClick={handleMyHuts}
                  disabled={isLoading}
                >
                  My Huts
                </button>
              </>
            )}
            <button
              className="btn-primary text-xs sm:text-base px-2 py-1 sm:px-4 sm:py-2 whitespace-nowrap"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn
            </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[40vh] sm:min-h-[70vh] flex items-center justify-center overflow-hidden section bg-surface-1">
        {/* Hero Animation - Desktop only */}
        <div className={`hidden sm:block absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-2000 ${!showAnimation ? 'opacity-0 pointer-events-none' : ''}`}>
          <video
            className={`absolute w-full h-full object-cover object-center transition-opacity duration-500 ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
            autoPlay
            muted
            loop
            playsInline
            onLoadedData={() => setIsVideoLoaded(true)}
          >
            <source src={HeroAnimationVideo} type="video/mp4" />
          </video>
        </div>

        {/* Hero Background - Desktop only */}
        <div className="hidden sm:block absolute inset-0 z-0">
          <video
            className="w-full h-full object-cover object-center"
            autoPlay
            muted
            loop
            poster=""
          >
            <source src={HeroAnimationVideo} type="video/mp4" />
          </video>
        </div>

        {/* Mobile Hero Content - CTA Card */}
        <div className="sm:hidden z-20 flex flex-col items-center justify-center text-center px-4">
          <div className="rounded-2xl border border-white/10 bg-surface-2 p-6 max-w-sm">
            <h1 className="text-4xl font-bold text-text-primary mb-6" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>
              HodlHut
            </h1>
            <p className="text-sm sm:text-lg text-text-secondary mb-6 leading-snug">
              Your Sovereign Multichain Paradise
            </p>
            <button
              className="btn-bitcoin btn-lg"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Start Your Journey
            </button>
          </div>
        </div>

        {/* Hero Card - Desktop only */}
        <div className="hidden sm:flex relative z-20 justify-center items-center max-w-4xl px-8">
          <div className="rounded-2xl border border-white/10 bg-surface-2 p-6 max-w-lg text-center">
            <h1 className="text-5xl font-bold text-text-primary mb-6" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>HodlHut</h1>
            <p className="text-sm sm:text-xl text-text-secondary mb-8 leading-snug">
              Your Sovereign Multichain Paradise
            </p>
            <button 
              className="btn-bitcoin btn-lg"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Start Your Journey
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section bg-surface-2">
        <div className="container-app stack-lg">
          <h2 className="text-xl sm:text-4xl font-bold text-center text-text-primary mb-6 sm:mb-0" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Your Personal Universal Router</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 text-center">
              <div className="mb-6 flex justify-center">
                <PersonalSovereigntyIcon />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Personal Sovereignty</h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                My Hut canisters are personal smart contracts assigned to you. No shared state, no bottlenecks, infinite scalability. Create as many Huts as you need.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 text-center">
              <div className="mb-6 flex justify-center">
                <UniversalRouterIcon />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Universal Router</h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Bitcoin ↔ Ethereum ↔ ICP bridgeless routing. Move assets between legacy chains trustlessly with Chain Fusion.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 text-center">
              <div className="mb-6 flex justify-center">
                <SmartAbstractionIcon />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Smart Abstraction</h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Crosschain swaps are easy to understand and transparent. HodlHut's Smart Solutions Agents optimize routing, gas, and fees.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 text-center">
              <div className="mb-6 flex justify-center">
                <DEXAggregationIcon />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>DEX Aggregation Agent</h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                HodlHut's DEX Aggregation Agent pulls live ICP DEX data including liquidity levels, cost, and speed to recommend the best route based upon the users trade and amount.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 text-center">
              <div className="mb-6 flex justify-center">
                <MyGardenRewardsIcon />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>My Garden Rewards</h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Hodl and stake legacy assets for portfolio diversity yield multipliers. Daily Reef Raffles and Tsunami Sweeps keep things growing.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 text-center">
              <div className="mb-6 flex justify-center">
                <MyDogParkIcon />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>My Dog Park</h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                My Dog Park is a DAO-governed permissionless gaming zone for Bitcoin Runes and Ordinals fans on Bitcoin mainnet.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 text-center">
              <div className="mb-6 flex justify-center">
                <FullStackSecurityIcon />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Full Stack Security</h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Users authenticate via Internet Identity v2, a WebAuthn-based system with passkey support. VetKD encryption ensures each user's personal Hut is protected and recoverable, even if a device is lost.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 text-center">
              <div className="mb-6 flex justify-center">
                <DiversePortfolioIcon />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Diverse Portfolio</h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Manage ICP, ckBTC, ckETH, ckUSDC, and ckUSDT all in one place. You can hodl & farm diverse assets for Bounty, or cash out all the way to Bitcoin and Ethereum blockchains.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Assets Section */}
      <section className="section-tight sm:section bg-bg">
        <div className="container-app">
          <h2 className="text-4xl font-bold text-center text-text-primary mb-8 sm:mb-12" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Supported Crosschain Assets</h2>
          
          {/* Chain Fusion Deposits */}
          <div className="mb-8 sm:mb-16">
            <h3 className="text-2xl font-semibold text-center text-text-secondary mb-8">Legacy assets from their native L1 chains</h3>
            
            <div className="grid-assets">
              <div className="asset-card-compact">
                <div className="mb-3 flex justify-center items-center h-8">
                  <AssetIcon asset="BTC" size={30} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">Bitcoin</div>
                <div className="text-xs text-text-muted">Native BTC → ckBTC</div>
              </div>

              <div className="asset-card-compact">
                <div className="mb-3 flex justify-center items-center h-8">
                  <AssetIcon asset="ETH" size={30} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">Ethereum</div>
                <div className="text-xs text-text-muted">Native ETH → ckETH</div>
              </div>

              <div className="asset-card-compact">
                <div className="mb-3 flex justify-center items-center h-8">
                  <AssetIcon asset="USDC" size={30} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">USDC</div>
                <div className="text-xs text-text-muted">Native USDC → ckUSDC</div>
              </div>

              <div className="asset-card-compact">
                <div className="mb-3 flex justify-center items-center h-8">
                  <AssetIcon asset="USDT" size={30} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">USDT</div>
                <div className="text-xs text-text-muted">Native USDT → ckUSDT</div>
              </div>

            </div>
          </div>

          {/* ICRC/ICP Assets */}
          <div className="mb-6 sm:mb-16">
            <h3 className="text-2xl font-semibold text-center text-text-secondary mb-8">ICP ecosystem assets</h3>

            {/* All ICP Assets - Unified Grid */}
            <div className="grid-assets">
              <div className="asset-card-compact">
                {/* Backend: ICP wallet interface (Plug, etc.) + native ICP integration */}
                <div className="mb-3 flex justify-center items-center h-8">
                  <AssetIcon asset="ICP" size={30} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">ICP</div>
                <div className="text-xs text-text-muted">Internet Computer</div>
              </div>

              <div className="asset-card-compact">
                {/* Backend: ICP wallet interface (Plug, etc.) + ICRC-1 token integration */}
                <div className="mb-3 flex justify-center items-center h-8">
                  <AssetIcon asset="ckBTC" size={30} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">ckBTC</div>
                <div className="text-xs text-text-muted">Chain Key Bitcoin</div>
              </div>

              <div className="asset-card-compact">
                {/* Backend: ICP wallet interface (Plug, etc.) + ICRC-1 token integration */}
                <div className="mb-3 flex justify-center items-center h-8">
                  <AssetIcon asset="ckETH" size={30} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">ckETH</div>
                <div className="text-xs text-text-muted">Chain Key Ethereum</div>
              </div>

              <div className="asset-card-compact">
                {/* Backend: ICP wallet interface (Plug, etc.) + ICRC-1 token integration */}
                <div className="mb-3 flex justify-center items-center h-8">
                  <AssetIcon asset="ckUSDC" size={30} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">ckUSDC</div>
                <div className="text-xs text-text-muted">Chain Key USDC</div>
              </div>

              <div className="asset-card-compact">
                {/* Backend: ICP wallet interface (Plug, etc.) + ICRC-1 token integration */}
                <div className="mb-3 flex justify-center items-center h-8">
                  <AssetIcon asset="ckUSDT" size={30} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">ckUSDT</div>
                <div className="text-xs text-text-muted">Chain Key USDT</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="section-tight bg-bg">
        <div className="container-app">
          <h2 id="how-it-works" className="text-4xl font-bold text-center text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>How it Works</h2>
          <p className="text-sm sm:text-lg text-center text-text-secondary mb-16">Follow these simple steps to activate your personal Hut</p>
          
          <div className="flex flex-wrap">
            <div className="flex relative pt-10 pb-20 sm:items-center md:w-2/3 mx-auto">
              <div className="h-full w-6 absolute inset-0 flex items-center justify-center">
                <div className="h-full w-1 bg-surface-3 pointer-events-none"></div>
              </div>
              <div className="flex-shrink-0 w-6 h-6 rounded-full mt-10 sm:mt-0 inline-flex items-center justify-center bg-primary-400 text-white relative z-10 font-medium text-sm">1</div>
              <div className="flex-grow md:pl-8 pl-6 flex sm:items-center items-start flex-col sm:flex-row">
                <div className="flex-shrink-0 w-24 h-24 bg-black/80 text-primary-400 rounded-full inline-flex items-center justify-center">
                  <Shield size={48} />
                </div>
                <div className="flex-grow sm:pl-6 mt-6 sm:mt-0">
                  <h3 className="font-medium text-text-primary mb-1 text-xl">Log In with your Internet Identity V2</h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-text-secondary">Internet Identity V2 is an authentication system that allows users to access Dapps on the Internet Computer securely and anonymously.</p>
                </div>
              </div>
            </div>

            <div className="flex relative pb-20 sm:items-center md:w-2/3 mx-auto">
              <div className="h-full w-6 absolute inset-0 flex items-center justify-center">
                <div className="h-full w-1 bg-surface-3 pointer-events-none"></div>
              </div>
              <div className="flex-shrink-0 w-6 h-6 rounded-full mt-10 sm:mt-0 inline-flex items-center justify-center relative z-10 font-medium text-sm text-white" style={{backgroundColor: 'rgb(202, 138, 4)'}}>2</div>
              <div className="flex-grow md:pl-8 pl-6 flex sm:items-center items-start flex-col sm:flex-row">
                <div className="flex-shrink-0 w-24 h-24 bg-black/80 rounded-full inline-flex items-center justify-center" style={{color: 'rgb(202, 138, 4)'}}>
                  <TrendingUp size={48} />
                </div>
                <div className="flex-grow sm:pl-6 mt-6 sm:mt-0">
                  <h3 className="font-medium text-text-primary mb-1 text-xl">Add Assets to Activate My Hut</h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-text-secondary">Deposit any HodlHut supported assets to activate your personal, sovereign, crosschain router.</p>
                </div>
              </div>
            </div>

            <div className="flex relative pb-20 sm:items-center md:w-2/3 mx-auto">
              <div className="h-full w-6 absolute inset-0 flex items-center justify-center">
                <div className="h-full w-1 bg-surface-3 pointer-events-none"></div>
              </div>
              <div className="flex-shrink-0 w-6 h-6 rounded-full mt-10 sm:mt-0 inline-flex items-center justify-center relative z-10 font-medium text-sm text-white" style={{backgroundColor: '#A0522D'}}>3</div>
              <div className="flex-grow md:pl-8 pl-6 flex sm:items-center items-start flex-col sm:flex-row">
                <div className="flex-shrink-0 w-24 h-24 bg-black/80 rounded-full inline-flex items-center justify-center" style={{color: '#A0522D'}}>
                  <ArrowUpDown size={48} style={{transform: 'rotate(90deg)'}} />
                </div>
                <div className="flex-grow sm:pl-6 mt-6 sm:mt-0">
                  <h3 className="font-medium text-text-primary mb-1 text-xl">Swap Assets</h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-text-secondary">Once within My Hut, you can securely swap assets within and outside of the ICP ecosystem to all supported heterogenous chains while being guided with data to choose the best routes for speed and cost.</p>
                </div>
              </div>
            </div>

            <div className="flex relative pb-10 sm:items-center md:w-2/3 mx-auto">
              <div className="h-full w-6 absolute inset-0 flex items-center justify-center">
                <div className="h-full w-1 bg-surface-3 pointer-events-none"></div>
              </div>
              <div className="flex-shrink-0 w-6 h-6 rounded-full mt-10 sm:mt-0 inline-flex items-center justify-center bg-success-600 text-on-success relative z-10 font-medium text-sm">4</div>
              <div className="flex-grow md:pl-8 pl-6 flex sm:items-center items-start flex-col sm:flex-row">
                <div className="flex-shrink-0 w-24 h-24 bg-black/80 text-success-400 rounded-full inline-flex items-center justify-center">
                  <Sprout size={48} />
                </div>
                <div className="flex-grow sm:pl-6 mt-6 sm:mt-0">
                  <h3 className="font-medium text-text-primary mb-1 text-xl">Stake, Earn & Play in My Garden & My Dog Park</h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-text-secondary">Stake diverse assets for multiplied yield in My Garden. Join the daily Reef Raffle for a chance to win and be automatically included in the weekly Tsunami Sweep! Play Bitcoin metaprotocol games and contests in My Dog Park on the Bitcoin mainnet.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Button Section */}
      <section className="section bg-bg">
        <div className="container-app">
          <div className="md:w-2/3 mx-auto flex justify-center">
            <button
              className="btn-bitcoin btn-lg"
              onClick={handleGetHut}
              disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : 'Get My Hut'}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="section bg-surface-1 text-text-primary">
        <div className="container-app">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            {/* Brand - centered on mobile, left on desktop */}
            <div className="flex items-center gap-2 mx-auto sm:mx-0">
              <AssetIcon asset="logo" size={32} />
              <span className="text-xl font-bold text-text-primary" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>HodlHut</span>
            </div>
            {/* Navigation - centered on mobile, right on desktop */}
            <div className="flex gap-4 sm:gap-8 mx-auto sm:mx-0">
              <a href="#" className="text-text-muted hover:text-primary-400 transition-colors duration-300">Privacy</a>
              <a href="#" className="text-text-muted hover:text-primary-400 transition-colors duration-300">Terms</a>
              <a href="#" className="text-text-muted hover:text-primary-400 transition-colors duration-300">DOCS</a>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-center">
            <p className="text-sm text-text-muted">
              © 2024 HodlHut. Built on the Internet Computer. Powered by Chain Fusion.
            </p>
          </div>
        </div>
      </footer>

      {/* Internet Identity Login Modal */}
      {showIILogin && (
        <InternetIdentityLogin
          onLogin={handleIILogin}
          onCancel={handleCancelLogin}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default HomePage;