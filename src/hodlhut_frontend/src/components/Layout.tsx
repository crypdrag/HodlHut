import React from 'react';
import { useNavigate } from 'react-router-dom';
import AssetIcon from './AssetIcon';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-bg text-text-primary min-h-screen overflow-x-hidden flex flex-col">
      {/* Header */}
      <header className="nav-header">
        <div className="container-app pad-section">
          {/* Mobile: Logo and brand name on top row */}
          <div className="flex justify-center items-center gap-3 mb-3 sm:hidden">
            <AssetIcon asset="logo" size={50} className="w-12 h-12 object-contain" />
            <span className="text-2xl font-bold text-text-primary" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>hodl protocol</span>
          </div>

          {/* Navigation row */}
          <nav className="flex justify-between items-center">
            {/* Desktop: Logo and brand name on left */}
            <div className="hidden sm:flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <AssetIcon asset="logo" size={50} className="w-12 h-12 object-contain" />
              <span className="text-2xl font-bold text-text-primary" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>hodl protocol</span>
            </div>

            {/* Navigation links - simple text-based modern DEX style */}
            <div className="flex gap-6 sm:gap-8 items-center mx-auto sm:mx-0">
              <a
                href="/stake"
                className="text-sm sm:text-base font-medium text-text-primary hover:text-primary-400 transition-colors duration-200"
                onClick={(e) => { e.preventDefault(); navigate('/stake'); }}
              >
                Stake
              </a>
              <span className="text-text-muted">|</span>
              <a
                href="/swap"
                className="text-sm sm:text-base font-medium text-text-primary hover:text-primary-400 transition-colors duration-200"
                onClick={(e) => { e.preventDefault(); navigate('/swap'); }}
              >
                Swap
              </a>
            </div>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="section bg-surface-1 text-text-primary">
        <div className="container-app">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            {/* Brand - centered on mobile, left on desktop */}
            <div className="flex items-center gap-2 mx-auto sm:mx-0 cursor-pointer" onClick={() => navigate('/')}>
              <AssetIcon asset="logo" size={32} />
              <span className="text-xl font-bold text-text-primary" style={{fontFamily: 'Lilita One, system-ui, sans-serif'}}>hodl protocol</span>
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
    </div>
  );
};

export default Layout;
