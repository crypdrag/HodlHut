import React from 'react';
import AssetIcon from './AssetIcon';
import { MASTER_ASSETS } from '../../assets/master_asset_data';

interface PortfolioOverviewProps {
  portfolio: { [key: string]: number };
  portfolioExpanded: boolean;
  setPortfolioExpanded: (expanded: boolean) => void;
  calculatePortfolioValue: () => number;
  formatAmount: (amount: number) => string;
}

const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({
  portfolio,
  portfolioExpanded,
  setPortfolioExpanded,
  calculatePortfolioValue,
  formatAmount
}) => {
  // Only show assets available in the FROM dropdown that have a balance > 0
  const fromAssets = ['ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ICP'];
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

export default PortfolioOverview;