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
  Brain,      // Intelligent Abstraction - AI/Smart features  
  TrendingUp, // Hut Garden Tiki Rewards - Profits/growth
  Shield,     // Full Stack Security - Protection
  PieChart,   // Diverse Portfolio - Portfolio management
  ArrowUpDown,// Swap Assets - Two arrows in opposite directions
  Sprout      // Garden/Plant icon for staking rewards
} from 'lucide-react';
// import HeroBgImage from '../../assets/images/Hero_bg.png';

// Lucide icon components with proper TypeScript support
const PersonalSovereigntyIcon: React.FC = () => <Radio size={48} className="text-primary-500" />;
const UniversalRouterIcon: React.FC = () => <Network size={48} className="text-primary-500" />;
const IntelligentAbstractionIcon: React.FC = () => <Brain size={48} className="text-primary-500" />;
const TikiRewardsIcon: React.FC = () => <TrendingUp size={48} className="text-primary-500" />;
const FullStackSecurityIcon: React.FC = () => <Shield size={48} className="text-primary-500" />;
const DiversePortfolioIcon: React.FC = () => <PieChart size={48} className="text-primary-500" />;

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
        <nav className="container-app flex justify-between items-center pad-section">
          <div className="flex items-center gap-3">
            <AssetIcon asset="logo" size={50} className="w-12 h-12 object-contain" />
            <span className="text-2xl font-bold text-text-primary" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>HodlHut</span>
            {isAuthenticated && principal && (
              <div className="relative ml-6 group">
                <span className="text-sm bg-surface-2 text-text-secondary px-3 py-1 rounded-full border border-white/10 cursor-pointer hover:bg-surface-3 transition-all duration-200">
                  👤 {principal.toString().slice(0, 8)}...
                </span>
                <div className="absolute top-full right-0 mt-1 bg-surface-1 border border-white/10 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 z-50 p-2">
                  <button 
                    className="btn-sienna text-sm w-full"
                    onClick={logout}
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-4">
            {isAuthenticated ? (
              <>
                <button 
                  className="btn-bitcoin"
                  onClick={handleGetHut}
                >
                  {/* Backend: Triggers Internet Identity authentication with custom security options */}
                  Get Hut
                </button>
                <button 
                  className="btn-success"
                  onClick={handleMyHuts}
                >
                  {/* Backend: Triggers Internet Identity authentication with custom security options */}
                  My Huts
                </button>
                <button 
                  className="btn-sienna"
                  onClick={logout}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button 
                  className={`btn-bitcoin ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                  onClick={handleGetHut}
                  disabled={isLoading}
                >
                  {/* Backend: Triggers Internet Identity authentication with custom security options */}
                  {isLoading ? 'Connecting...' : 'Get Hut'}
                </button>
                <button 
                  className={`btn-success ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                  onClick={handleMyHuts}
                  disabled={isLoading}
                >
                  {/* Backend: Triggers Internet Identity authentication with custom security options */}
                  {isLoading ? 'Connecting...' : 'My Huts'}
                </button>
              </>
            )}
            <button 
              className="btn-primary"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-end justify-center overflow-hidden section bg-surface-1">
        {/* Hero Animation */}
        <div className={`absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-2000 ${!showAnimation ? 'opacity-0 pointer-events-none' : ''}`}>
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

        {/* Hero Background - Video with last frame fallback */}
        <div className="absolute inset-0 z-0">
          <video 
            className="w-full h-full object-cover object-center" 
            autoPlay 
            muted 
            loop
            poster="" // Last frame will show when video loads
          >
            <source src={HeroAnimationVideo} type="video/mp4" />
          </video>
        </div>

        {/* Hero Card */}
        <div className="relative z-20 flex justify-center items-center max-w-4xl px-8">
          <div className="rounded-2xl border border-white/10 bg-surface-2 p-6 max-w-lg text-center">
            <h1 className="text-5xl font-bold text-text-primary mb-6" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>HodlHut</h1>
            <p className="text-xl text-text-secondary mb-8 leading-snug">
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
          <h2 className="text-4xl font-bold text-center text-text-primary" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Your Personal Universal Router</h2>
          
          <div className="grid-features">
            <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 text-center">
              <div className="mb-6 flex justify-center">
                <PersonalSovereigntyIcon />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Personal Sovereignty</h3>
              <p className="text-text-secondary leading-relaxed">
                My Hut canisters are personal smart contracts assigned to you. No shared state, no bottlenecks, infinite scalability. Create as many Huts as you need.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 text-center">
              <div className="mb-6 flex justify-center">
                <UniversalRouterIcon />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Universal Router</h3>
              <p className="text-text-secondary leading-relaxed">
                Bitcoin ↔ Ethereum ↔ Solana ↔ ICP bridgeless routing. Move between any asset on any chain trustlessly with Chain Fusion.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 text-center">
              <div className="mb-6 flex justify-center">
                <IntelligentAbstractionIcon />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Intelligent Abstraction</h3>
              <p className="text-text-secondary leading-relaxed">
                Complex multichain operations are easy to understand and transparent. HodlHut's smart fee engine handles gas, routing, and fee optimization automatically giving you options.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 text-center">
              <div className="mb-6 flex justify-center">
                <TikiRewardsIcon />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>My Garden Rewards</h3>
              <p className="text-text-secondary leading-relaxed">
                My Garden is where yield farming rewards for hodling and portfolio diversity happen. Weekly Reef Raffles and Tsunami Sweeps keep things hopping.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 text-center">
              <div className="mb-6 flex justify-center">
                <FullStackSecurityIcon />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Full Stack Security</h3>
              <p className="text-text-secondary leading-relaxed">
                Huts are a meant to be a chill place to hang out without worrying about the security of your assets. HodlHut may have extra log in steps, but funds are safu.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 text-center">
              <div className="mb-6 flex justify-center">
                <DiversePortfolioIcon />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Diverse Portfolio</h3>
              <p className="text-text-secondary leading-relaxed">
                Manage ICP, ckBTC, ckETH, ckUSDC, ckUSDT, and ckSOL all in one place. You can hodl & farm diverse assets for Bounty, or cash out all the way to Bitcoin, Ethereum, or Solana blockchains.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Assets Section */}
      <section className="section bg-bg">
        <div className="container-app">
          <h2 className="text-4xl font-bold text-center text-text-primary mb-12" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Supported Assets</h2>
          
          {/* Chain Fusion Deposits */}
          <div className="mb-16">
            <h3 className="text-3xl font-bold text-center text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Add Assets via Chain Fusion</h3>
            <p className="text-lg text-center text-text-secondary mb-8">Deposit native assets from their L1 chains</p>
            
            <div className="grid-assets">
              <div className="asset-card-compact">
                <div className="mb-3 flex justify-center items-center h-5">
                  <AssetIcon asset="BTC" size={20} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">Bitcoin</div>
                <div className="text-xs text-text-muted">Native BTC → ckBTC</div>
              </div>
              
              <div className="asset-card-compact">
                <div className="mb-3 flex justify-center items-center h-5">
                  <AssetIcon asset="ETH" size={20} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">Ethereum</div>
                <div className="text-xs text-text-muted">Native ETH → ckETH</div>
              </div>

              <div className="asset-card-compact">
                <div className="mb-3 flex justify-center items-center h-5">
                  <AssetIcon asset="USDC" size={20} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">USDC</div>
                <div className="text-xs text-text-muted">Native USDC → ckUSDC</div>
              </div>

              <div className="asset-card-compact">
                <div className="mb-3 flex justify-center items-center h-5">
                  <AssetIcon asset="USDT" size={20} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">USDT</div>
                <div className="text-xs text-text-muted">Native USDT → ckUSDT</div>
              </div>
              
              <div className="asset-card-compact">
                <div className="mb-3 flex justify-center items-center h-5">
                  <AssetIcon asset="SOL" size={20} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">Solana</div>
                <div className="text-xs text-text-muted">Native SOL → ckSOL</div>
              </div>
              
              <div className="asset-card-compact">
                <div className="mb-3 flex justify-center items-center h-5">
                  <AssetIcon asset="USDC_SOL" size={20} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">USDC (SOL)</div>
                <div className="text-xs text-text-muted">Native USDC → ckUSDC</div>
              </div>
            </div>
          </div>

          {/* ICRC/ICP Assets */}
          <div className="mb-16">
            <h3 className="text-3xl font-bold text-center text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>Add ICRC and ICP Assets</h3>
            <p className="text-lg text-center text-text-secondary mb-8">Deposit assets already on the Internet Computer Protocol</p>
            
            <div className="grid-assets">
              <div className="asset-card-compact">
                {/* Backend: ICP wallet interface (Plug, etc.) + ICRC-1 token integration */}
                <div className="mb-3 flex justify-center items-center h-5">
                  <AssetIcon asset="ckBTC" size={20} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">ckBTC</div>
                <div className="text-xs text-text-muted">Chain Key Bitcoin</div>
              </div>
              
              <div className="asset-card-compact">
                {/* Backend: ICP wallet interface (Plug, etc.) + ICRC-1 token integration */}
                <div className="mb-3 flex justify-center items-center h-5">
                  <AssetIcon asset="ckETH" size={20} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">ckETH</div>
                <div className="text-xs text-text-muted">Chain Key Ethereum</div>
              </div>

              <div className="asset-card-compact">
                {/* Backend: ICP wallet interface (Plug, etc.) + ICRC-1 token integration */}
                <div className="mb-3 flex justify-center items-center h-5">
                  <AssetIcon asset="ckUSDC" size={20} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">ckUSDC</div>
                <div className="text-xs text-text-muted">Chain Key USDC</div>
              </div>

              <div className="asset-card-compact">
                {/* Backend: ICP wallet interface (Plug, etc.) + ICRC-1 token integration */}
                <div className="mb-3 flex justify-center items-center h-5">
                  <AssetIcon asset="ckUSDT" size={20} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">ckUSDT</div>
                <div className="text-xs text-text-muted">Chain Key USDT</div>
              </div>

              <div className="asset-card-compact">
                {/* Backend: ICP wallet interface (Plug, etc.) + ICRC-1 token integration */}
                <div className="mb-3 flex justify-center items-center h-5">
                  <AssetIcon asset="ckSOL" size={20} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">ckSOL</div>
                <div className="text-xs text-text-muted">Chain Key Solana</div>
              </div>
              
              <div className="asset-card-compact">
                {/* Backend: ICP wallet interface (Plug, etc.) + native ICP integration */}
                <div className="mb-3 flex justify-center items-center h-5">
                  <AssetIcon asset="ICP" size={20} />
                </div>
                <div className="text-base font-semibold text-text-primary mb-1">ICP</div>
                <div className="text-xs text-text-muted">Internet Computer</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="section-tight bg-bg">
        <div className="container-app">
          <h2 id="how-it-works" className="text-4xl font-bold text-center text-text-primary mb-4" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>How it Works</h2>
          <p className="text-lg text-center text-text-secondary mb-16">Follow these simple steps to activate your personal Hut</p>
          
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
                  <h3 className="font-medium text-text-primary mb-1 text-xl">Log In with your Internet Identity</h3>
                  <p className="leading-relaxed text-text-secondary">Internet Identity is a blockchain authentication system for the Internet Computer that allows users to access Dapps on the Internet Computer securely and anonymously.</p>
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
                  <p className="leading-relaxed text-text-secondary">Deposit any HodlHut supported assets to activate your personal, sovereign, crosschain router.</p>
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
                  <p className="leading-relaxed text-text-secondary">Once within My Hut, you can securely swap assets within and outside of the ICP ecosystem to all supported heterogenous chains while being guided with data to choose the best routes for speed and cost.</p>
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
                  <h3 className="font-medium text-text-primary mb-1 text-xl">Stake, Earn & Play in My Garden</h3>
                  <p className="leading-relaxed text-text-secondary">Stake diverse assets for multiplied yield. Join the daily Reef Raffle for a chance to win and be automatically included in the weekly Tsunami Sweep!.</p>
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
              {/* Backend: Connects to Internet Identity login and starts 30-minute countdown for My Hut activation (user has 30 minutes to deposit assets to activate) */}
              {isLoading ? 'Connecting...' : 'Get My Hut'}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="section bg-surface-1 text-text-primary">
        <div className="container-app">
          <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <AssetIcon asset="logo" size={32} />
              <span className="text-xl font-bold text-text-primary" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>HodlHut</span>
            </div>
            <div className="flex gap-8 flex-wrap">
              <a href="#" className="text-text-muted hover:text-primary-400 transition-colors duration-300">Privacy Policy</a>
              <a href="#" className="text-text-muted hover:text-primary-400 transition-colors duration-300">Terms of Service</a>
              <a href="#" className="text-text-muted hover:text-primary-400 transition-colors duration-300">Documentation</a>
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