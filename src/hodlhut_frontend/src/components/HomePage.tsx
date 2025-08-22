import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AssetIcon from './AssetIcon';
import '../styles/HomePage.css';
import HeroAnimationVideo from '../../assets/images/Hero_Animation.mp4';
import HeroBgSvg from '../../assets/images/HERO_bg.svg';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login, logout, principal, isLoading } = useAuth();
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [showAnimation, setShowAnimation] = useState(true);

  useEffect(() => {
    // Hide animation after 4 seconds
    const timer = setTimeout(() => {
      setShowAnimation(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleGetHut = async () => {
    // TODO: RESTORE INTERNET IDENTITY LOGIN - Currently bypassed for testing
    // Original auth flow: Check isAuthenticated, then login() via Internet Identity canister
    // Canister call will go to: rdmx6-jaaaa-aaaaa-aaadq-cai (from dfx.json)
    
    // TEMPORARY: Direct navigation for testing Smart Solutions interface
    navigate('/dashboard');
    
    /* ORIGINAL AUTHENTICATION CODE - RESTORE LATER:
    if (isAuthenticated) {
      // User is already authenticated, navigate to dashboard
      navigate('/dashboard');
    } else {
      // Trigger Internet Identity login
      const success = await login();
      if (success) {
        // After successful login, navigate to dashboard
        navigate('/dashboard');
      }
    }
    */
  };

  const handleMyHuts = async () => {
    // TODO: RESTORE INTERNET IDENTITY LOGIN - Currently bypassed for testing
    // Original auth flow: Check isAuthenticated, then login() via Internet Identity canister  
    // Canister call will go to: rdmx6-jaaaa-aaaaa-aaadq-cai (from dfx.json)
    
    // TEMPORARY: Direct navigation for testing Smart Solutions interface
    navigate('/dashboard');
    
    /* ORIGINAL AUTHENTICATION CODE - RESTORE LATER:
    if (isAuthenticated) {
      // User is authenticated, show their huts (for now, navigate to dashboard)
      navigate('/dashboard');
    } else {
      // Trigger Internet Identity login
      const success = await login();
      if (success) {
        navigate('/dashboard');
      }
    }
    */
  };

  return (
    <div className="homepage">
      {/* Header */}
      <header className="header">
        <nav className="nav">
          <div className="logo">
            <AssetIcon asset="logo" size={50} className="logo-image" />
            <span className="logo-text">HodlHut</span>
            {isAuthenticated && principal && (
              <span className="user-principal">
                👤 {principal.toString().slice(0, 8)}...
              </span>
            )}
          </div>
          <div className="nav-buttons">
            {isAuthenticated ? (
              <>
                <button 
                  className="nav-btn primary"
                  onClick={handleGetHut}
                >
                  {/* Backend: Triggers Internet Identity authentication with custom security options */}
                  Get Hut
                </button>
                <button 
                  className="nav-btn secondary"
                  onClick={handleMyHuts}
                >
                  {/* Backend: Triggers Internet Identity authentication with custom security options */}
                  My Huts
                </button>
                <button 
                  className="nav-btn tertiary"
                  onClick={logout}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button 
                  className="nav-btn primary"
                  onClick={handleGetHut}
                  disabled={isLoading}
                >
                  {/* Backend: Triggers Internet Identity authentication with custom security options */}
                  {isLoading ? 'Connecting...' : 'Get Hut'}
                </button>
                <button 
                  className="nav-btn secondary"
                  onClick={handleMyHuts}
                  disabled={isLoading}
                >
                  {/* Backend: Triggers Internet Identity authentication with custom security options */}
                  {isLoading ? 'Connecting...' : 'My Huts'}
                </button>
              </>
            )}
            <div className="nav-dropdown">
              <button className="nav-btn tertiary">
                Learn ▼
              </button>
              <div className="dropdown-content">
                <a href="https://internetcomputer.org/docs/" target="_blank" rel="noopener noreferrer">
                  📚 Documentation
                </a>
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero">
        {/* Hero Animation */}
        <div className={`hero-animation-container ${!showAnimation ? 'fade-out' : ''}`}>
          <video
            className={`hero-animation-landscape ${isVideoLoaded ? 'loaded' : ''}`}
            autoPlay
            muted
            loop
            playsInline
            onLoadedData={() => setIsVideoLoaded(true)}
          >
            <source src={HeroAnimationVideo} type="video/mp4" />
          </video>
        </div>

        {/* Hero Background */}
        <div className="hero-background">
          <img src={HeroBgSvg} alt="Hero Background" className="hero-bg-svg" />
        </div>

        {/* Hero Card */}
        <div className="hero-content">
          <div className="hero-card">
            <div className="hero-card-content">
              <h1 className="hero-card-title title-font">HodlHut</h1>
              <p className="hero-card-subtitle subtitle-font">
                Your Sovereign Multichain Paradise
              </p>
              <button 
                className="hero-card-button"
                onClick={() => window.open('https://internetcomputer.org/docs/', '_blank')}
              >
                Start Your Journey
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="section-title title-font">Your Personal Universal Router</h2>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <AssetIcon asset="ICP" size={48} />
              </div>
              <h3 className="feature-title subtitle-font">Personal Sovereignty</h3>
              <p className="feature-description body-font">
                My Hut canisters are personal smart contracts assigned to you. No shared state, no bottlenecks, infinite scalability. Create as many Huts as you need.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <AssetIcon asset="BTC" size={48} />
              </div>
              <h3 className="feature-title subtitle-font">Universal Router</h3>
              <p className="feature-description body-font">
                Bitcoin ↔ Ethereum ↔ Solana ↔ ICP bridgeless routing. Move between any asset on any chain trustlessly with Chain Fusion.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <AssetIcon asset="ETH" size={48} />
              </div>
              <h3 className="feature-title subtitle-font">Intelligent Abstraction</h3>
              <p className="feature-description body-font">
                Complex multichain operations are easy to understand and transparent. HodlHut's smart fee engine handles gas, routing, and fee optimization automatically giving you options.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <AssetIcon asset="SOL" size={48} />
              </div>
              <h3 className="feature-title subtitle-font">Hut Garden Tiki Rewards</h3>
              <p className="feature-description body-font">
                Gardens offer gamified yield farming rewards for hodling and portfolio diversity. Weekly Reef Raffles and Tsunami Sweeps keep things hopping in the Tiki Tent.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <AssetIcon asset="ckBTC" size={48} />
              </div>
              <h3 className="feature-title subtitle-font">Full Stack Security</h3>
              <p className="feature-description body-font">
                Huts are a meant to be a chill place to hang out without worrying about the security of your assets. HodlHut may have extra log in steps, but funds are safu.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <AssetIcon asset="ckUSDC" size={48} />
              </div>
              <h3 className="feature-title subtitle-font">Diverse Portfolio</h3>
              <p className="feature-description body-font">
                Manage ICP, ckBTC, ckETH, ckUSDC, ckUSDT, and ckSOL all in one place. You can hodl & farm diverse assets for Bounty, or cash out all the way to Bitcoin, Ethereum, or Solana blockchains.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Assets Section */}
      <section className="supported-assets">
        <div className="container">
          <h2 className="section-title title-font">Supported Assets</h2>
          
          {/* Chain Fusion Deposits */}
          <div className="deposit-category">
            <h3 className="category-title subtitle-font">Add Assets via Chain Fusion</h3>
            <p className="category-description">Deposit native assets from their L1 chains</p>
            
            <div className="asset-grid">
              <div className="asset-card">
                <div className="asset-icon-container">
                  <AssetIcon asset="BTC" size={48} />
                </div>
                <div className="asset-name">Bitcoin</div>
                <div className="asset-balance">Native BTC → ckBTC</div>
              </div>
              
              <div className="asset-card">
                <div className="asset-icon-container">
                  <AssetIcon asset="ETH" size={48} />
                </div>
                <div className="asset-name">Ethereum</div>
                <div className="asset-balance">Native ETH → ckETH</div>
              </div>

              <div className="asset-card">
                <div className="asset-icon-container">
                  <AssetIcon asset="USDC" size={48} />
                </div>
                <div className="asset-name">USDC</div>
                <div className="asset-balance">Native USDC → ckUSDC</div>
              </div>

              <div className="asset-card">
                <div className="asset-icon-container">
                  <AssetIcon asset="USDT" size={48} />
                </div>
                <div className="asset-name">USDT</div>
                <div className="asset-balance">Native USDT → ckUSDT</div>
              </div>
              
              <div className="asset-card">
                <div className="asset-icon-container">
                  <AssetIcon asset="SOL" size={48} />
                </div>
                <div className="asset-name">Solana</div>
                <div className="asset-balance">Native SOL → ckSOL</div>
              </div>
            </div>
          </div>

          {/* ICRC/ICP Assets */}
          <div className="deposit-category">
            <h3 className="category-title subtitle-font">Add ICRC and ICP Assets</h3>
            <p className="category-description">Deposit assets already on the Internet Computer Protocol</p>
            
            <div className="asset-grid">
              <div className="asset-card">
                <div className="asset-icon-container">
                  <AssetIcon asset="ckBTC" size={48} />
                </div>
                <div className="asset-name">ckBTC</div>
                <div className="asset-balance">Chain Key Bitcoin</div>
              </div>
              
              <div className="asset-card">
                <div className="asset-icon-container">
                  <AssetIcon asset="ckETH" size={48} />
                </div>
                <div className="asset-name">ckETH</div>
                <div className="asset-balance">Chain Key Ethereum</div>
              </div>

              <div className="asset-card">
                <div className="asset-icon-container">
                  <AssetIcon asset="ckUSDC" size={48} />
                </div>
                <div className="asset-name">ckUSDC</div>
                <div className="asset-balance">Chain Key USDC</div>
              </div>

              <div className="asset-card">
                <div className="asset-icon-container">
                  <AssetIcon asset="ckUSDT" size={48} />
                </div>
                <div className="asset-name">ckUSDT</div>
                <div className="asset-balance">Chain Key USDT</div>
              </div>

              <div className="asset-card">
                <div className="asset-icon-container">
                  <AssetIcon asset="ckSOL" size={48} />
                </div>
                <div className="asset-name">ckSOL</div>
                <div className="asset-balance">Chain Key Solana</div>
              </div>
              
              <div className="asset-card">
                <div className="asset-icon-container">
                  <AssetIcon asset="ICP" size={48} />
                </div>
                <div className="asset-name">ICP</div>
                <div className="asset-balance">Internet Computer</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title title-font">Ready to Set up Your Hut?</h2>
            <p className="cta-subtitle subtitle-font">
              Sign into Get Hut with your Internet Identity
            </p>
            <button 
              className="cta-button"
              onClick={handleGetHut}
              disabled={isLoading}
            >
              {/* Backend: Main CTA - Triggers Internet Identity authentication with custom security options */}
              {isLoading ? 'Connecting...' : 'Get Hut'}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <AssetIcon asset="logo" size={32} />
              <span className="footer-title subtitle-font">HodlHut</span>
            </div>
            <div className="footer-links">
              <a href="#" className="footer-link body-font">Privacy Policy</a>
              <a href="#" className="footer-link body-font">Terms of Service</a>
              <a href="#" className="footer-link body-font">Documentation</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-text body-font">
              © 2024 HodlHut. Built on the Internet Computer. Powered by Chain Fusion.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;