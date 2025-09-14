import React, { useState } from 'react';
import AssetIcon from './AssetIcon';
import { MASTER_ASSETS, Portfolio } from '../../assets/master_asset_data';

interface DropdownOption {
  value: string;
  label: string;
}

const formatAmount = (amount: number): string => {
  if (!amount || isNaN(amount) || amount === null || amount === undefined) {
    return '0';
  }
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K';
  return amount.toFixed(4);
};

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  portfolio?: Portfolio;
  showBalances?: (asset: string) => boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder,
  className,
  portfolio = {},
  showBalances
}) => {
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
        <div className="dropdown-container">
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
            const shouldShowBalance = showBalances ? showBalances(option.value) : true;

            return (
              <div
                key={option.value}
                className={`dropdown-option-enhanced ${value === option.value ? 'selected' : ''
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

export default CustomDropdown;