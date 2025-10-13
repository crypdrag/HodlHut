import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AssetIcon from './AssetIcon';
import InternetIdentityLogin from './InternetIdentityLogin';
// Tailwind CSS classes now handle all styling
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
  const [showIILogin, setShowIILogin] = useState(false);

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
    <div>
      {/* Hero Section */}
      <section className="relative min-h-[40vh] sm:min-h-[70vh] flex items-center justify-center overflow-hidden section bg-gradient-to-br from-surface-1 via-surface-2 to-surface-3">

        {/* Mobile Hero Content - CTA Cards */}
        <div className="sm:hidden z-20 flex flex-col items-center justify-center text-center px-4 gap-6">
          {/* HODL Card */}
          <div className="rounded-2xl border border-white/10 bg-surface-2 p-6 max-w-sm">
            <h1 className="text-4xl font-bold text-text-primary mb-6" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>
              HODL
            </h1>
            <p className="text-sm sm:text-lg text-text-secondary mb-6 leading-snug">
              Stake Sats, Earn Sats, Stack Sats
            </p>
            <button
              className="btn-bitcoin btn-lg w-40"
              onClick={() => navigate('/stake')}
            >
              Stake BTC
            </button>
          </div>

          {/* SWAP Card */}
          <div className="rounded-2xl border border-white/10 bg-surface-2 p-6 max-w-sm">
            <h1 className="text-4xl font-bold text-text-primary mb-6" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>
              SWAP
            </h1>
            <p className="text-sm sm:text-lg text-text-secondary mb-6 leading-snug">
              Crosschain Swaps via Bridgeless Routing.
            </p>
            <button
              className="btn-bitcoin btn-lg w-40"
              onClick={() => navigate('/swap')}
            >
              Swap
            </button>
          </div>
        </div>

        {/* Desktop Hero Content - Two Rows */}
        <div className="hidden sm:flex flex-col w-full gap-0">
          {/* Row 1 - HODL with Bitcoin logo background */}
          <div className="relative w-full min-h-[50vh] flex items-center justify-center overflow-hidden">
            {/* Background Bitcoin logos - will add blur effect */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              {/* Bitcoin logo grid - we'll populate this with repeating logos */}
              <div className="grid grid-cols-8 gap-8 w-full h-full p-8">
                {[...Array(24)].map((_, i) => (
                  <div key={i} className="flex items-center justify-center blur-sm hover:blur-none transition-all duration-300">
                    <AssetIcon asset="BTC" size={60} />
                  </div>
                ))}
              </div>
            </div>

            {/* HODL Card - centered */}
            <div className="relative z-20 rounded-2xl border border-white/10 bg-surface-2 p-8 max-w-lg text-center">
              <h1 className="text-5xl font-bold text-text-primary mb-6" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>HODL</h1>
              <p className="text-xl text-text-secondary mb-8 leading-snug">
                Stake Sats, Earn Sats, Stack Sats
              </p>
              <button
                className="btn-bitcoin btn-lg w-40"
                onClick={() => navigate('/stake')}
              >
                Stake BTC
              </button>
            </div>
          </div>

          {/* Row 2 - SWAP with token icons background */}
          <div className="relative w-full min-h-[50vh] flex items-center justify-center overflow-hidden">
            {/* Background token icons - will add blur effect */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              {/* Token icons grid - cycling through supported assets */}
              <div className="grid grid-cols-8 gap-8 w-full h-full p-8">
                {[...Array(24)].map((_, i) => {
                  const assets = ['BTC', 'ETH', 'ICP', 'ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT'];
                  const asset = assets[i % assets.length];
                  return (
                    <div key={i} className="flex items-center justify-center blur-sm hover:blur-none transition-all duration-300">
                      <AssetIcon asset={asset} size={60} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SWAP Card - centered */}
            <div className="relative z-20 rounded-2xl border border-white/10 bg-surface-2 p-8 max-w-lg text-center">
              <h1 className="text-5xl font-bold text-text-primary mb-6" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>SWAP</h1>
              <p className="text-xl text-text-secondary mb-8 leading-snug">
                Crosschain Swaps via Bridgeless Routing.
              </p>
              <button
                className="btn-bitcoin btn-lg w-40"
                onClick={() => navigate('/swap')}
              >
                Swap
              </button>
            </div>
          </div>
        </div>
      </section>

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