import React from 'react';
import { Plus, ArrowLeftRight, Lock } from 'lucide-react';

interface NavigationMenuProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  onLogout: () => void;
}

const NavigationMenu: React.FC<NavigationMenuProps> = ({
  activeSection,
  setActiveSection,
  onLogout
}) => {
  return (
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
            onClick={onLogout}
          >
            <Lock size={20} />
            LogOut
          </button>
        </div>
      </div>
    </div>
  );
};

export default NavigationMenu;