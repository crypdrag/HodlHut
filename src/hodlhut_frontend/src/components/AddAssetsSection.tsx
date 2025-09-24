import React from 'react';
import { Wallet } from 'lucide-react';
import AssetIcon from './AssetIcon';
import CustomDropdown from './CustomDropdown';
import { MASTER_ASSETS } from '../../assets/master_asset_data';

// Import the deposit assets configuration
const DEPOSIT_ASSETS_CONFIG = {
  'Cross-Chain Deposits': [
    { asset: 'BTC', label: 'Bitcoin', description: 'Native Bitcoin from the Bitcoin network', walletType: 'Bitcoin Wallet' },
    { asset: 'ETH', label: 'Ethereum', description: 'Native Ethereum from the Ethereum network', walletType: 'Ethereum Wallet' },
    { asset: 'USDC', label: 'USDC (Ethereum)', description: 'USDC stablecoin from Ethereum network', walletType: 'Ethereum Wallet' },
    { asset: 'USDT', label: 'USDT (Ethereum)', description: 'USDT stablecoin from Ethereum network', walletType: 'Ethereum Wallet' },
  ],
  'ICP Ecosystem': [
    { asset: 'ckBTC', label: 'ckBTC', description: 'Chain-key Bitcoin on ICP', walletType: 'ICP' },
    { asset: 'ckETH', label: 'ckETH', description: 'Chain-key Ethereum on ICP', walletType: 'ICP' },
    { asset: 'ckUSDC', label: 'ckUSDC', description: 'Chain-key USDC on ICP', walletType: 'ICP' },
    { asset: 'ckUSDT', label: 'ckUSDT', description: 'Chain-key USDT on ICP', walletType: 'ICP' },
    { asset: 'ICP', label: 'ICP', description: 'Native Internet Computer token', walletType: 'ICP' }
  ]
};

interface AddAssetsSectionProps {
  portfolio: { [key: string]: number };
  selectedDepositAssetUnified: string;
  setSelectedDepositAssetUnified: (asset: string) => void;
  renderBalanceDisplay: () => React.ReactNode;
  startDeposit: (asset: string) => void;
  formatAmount: (amount: number) => string;
}

const AddAssetsSection: React.FC<AddAssetsSectionProps> = ({
  portfolio,
  selectedDepositAssetUnified,
  setSelectedDepositAssetUnified,
  renderBalanceDisplay,
  startDeposit,
  formatAmount
}) => {
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

  // Calculate portfolio value to determine if Hut is activated
  const calculatePortfolioValue = (): number => {
    return Object.entries(portfolio).reduce((total, [asset, amount]) => {
      const assetData = MASTER_ASSETS[asset];
      return total + (amount * (assetData?.price || 0));
    }, 0);
  };

  // Determine if this is an activated Hut (has assets deposited)
  const isHutActivated = calculatePortfolioValue() > 0;

  return (
    <div className="w-full flex flex-col items-center px-4 py-4 sm:py-8">
      <div className="text-center mb-3 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-1 sm:mb-2">
          {isHutActivated ? "Add Assets" : "Add Assets to Activate Your Hut"}
        </h2>
        <p className="text-sm sm:text-base text-text-secondary">Choose an asset to deposit from Bitcoin, Ethereum or ICP ecosystem</p>
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
              const icpEcosystemAssets = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'];
              return icpEcosystemAssets.includes(asset);
            }}
          />

          {/* Balance Display - Only show for ICP Ecosystem assets */}
          <div className="text-center mt-2">
            <span className="text-sm text-text-muted">
              {renderBalanceDisplay()}
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
              <span className="text-sm font-semibold text-primary-400">{selectedAssetDetails.walletType} Wallet</span>
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
        {selectedAssetDetails && (
          <button
            className="w-full btn-primary min-h-[60px] text-base font-semibold flex items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.02]"
            onClick={() => {
              // BACKEND NOTE: Preserve all wallet integration backend notes
              startDeposit(selectedAssetDetails.asset);
            }}
          >
            <Wallet size={20} />
            Connect {selectedAssetDetails.walletType} Wallet
          </button>
        )}
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
            const icpEcosystemAssets = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'];
            const isIcpEcosystemAsset = icpEcosystemAssets.includes(asset);
            const balance = portfolio[asset] || 0;
            const hasBalance = isIcpEcosystemAsset && balance > 0;
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
                  <AssetIcon asset={asset} size={30} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-text-primary">{assetDetails.label}</div>
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

export default AddAssetsSection;