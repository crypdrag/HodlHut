import React from 'react';
// Import wallet logos
import UnisatIcon from '../../assets/images/Unisat.svg';
import XverseIcon from '../../assets/images/Xverse.svg';
import OKXIcon from '../../assets/images/OKX.svg';

interface WalletIconProps {
  wallet: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  showLabel?: boolean;
  labelPosition?: 'bottom' | 'right';
}

// Wallet icon mapping
const walletIconMap: Record<string, string> = {
  'unisat': UnisatIcon,
  'xverse': XverseIcon,
  'okx': OKXIcon,
  // Ethereum wallets (to be added when available)
  // 'metamask': MetaMaskIcon,
  // 'coinbase': CoinbaseIcon,
  // 'walletconnect': WalletConnectIcon,
  // ICP wallets (to be added when available)
  // 'plug': PlugIcon,
  // 'stoic': StoicIcon,
  // 'nfid': NFIDIcon
};

// Wallet display names for consistent branding
const walletNames: Record<string, string> = {
  'unisat': 'Unisat',
  'xverse': 'Xverse',
  'okx': 'OKX',
  'metamask': 'MetaMask',
  'coinbase': 'Coinbase Wallet',
  'walletconnect': 'WalletConnect',
  'plug': 'Plug',
  'stoic': 'Stoic',
  'nfid': 'NFID'
};

// Brand colors for fallback display
const walletColors: Record<string, string> = {
  'unisat': '#F7931A', // Bitcoin orange
  'xverse': '#6366F1', // Purple/blue gradient
  'okx': '#000000',    // Black
  'metamask': '#F6851B', // MetaMask orange
  'coinbase': '#0052FF', // Coinbase blue
  'walletconnect': '#3B99FC', // WalletConnect blue
  'plug': '#4ADE80',   // Green
  'stoic': '#3B82F6',  // Blue
  'nfid': '#6B7280'    // Gray
};

const WalletIcon: React.FC<WalletIconProps> = ({
  wallet,
  size = 24,
  className = '',
  style = {},
  showLabel = false,
  labelPosition = 'bottom'
}) => {
  const iconSrc = walletIconMap[wallet.toLowerCase()];
  const walletName = walletNames[wallet.toLowerCase()] || wallet;
  const brandColor = walletColors[wallet.toLowerCase()] || '#6B7280';

  // Mobile-first responsive sizing
  const responsiveSize = {
    width: size,
    height: size,
    minWidth: size, // Prevent crushing on mobile
    minHeight: size
  };

  // Fallback component when SVG is not available
  const FallbackIcon = () => (
    <div
      className={`
        wallet-icon-fallback
        flex items-center justify-center
        rounded-lg
        font-bold text-white
        transition-all duration-200
        hover:scale-105 active:scale-95
        ${className}
      `}
      style={{
        ...responsiveSize,
        backgroundColor: brandColor,
        fontSize: size * 0.35,
        ...style
      }}
    >
      {walletName.slice(0, 2).toUpperCase()}
    </div>
  );

  // Main icon component
  const IconComponent = iconSrc ? (
    <img
      src={iconSrc}
      alt={`${walletName} logo`}
      className={`
        wallet-icon
        rounded-lg
        transition-all duration-200
        hover:scale-105 active:scale-95
        ${className}
      `}
      style={{
        ...responsiveSize,
        objectFit: 'contain',
        ...style
      }}
      // Mobile-friendly touch targets
      onError={(e) => {
        // Fallback to initials if image fails to load
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
      }}
    />
  ) : (
    <FallbackIcon />
  );

  // If no label needed, return just the icon
  if (!showLabel) {
    return IconComponent;
  }

  // Layout classes for label positioning (mobile-first)
  const containerClasses = labelPosition === 'bottom'
    ? 'flex flex-col items-center gap-1.5'
    : 'flex flex-row items-center gap-2';

  return (
    <div className={`wallet-icon-container ${containerClasses}`}>
      {IconComponent}
      <span
        className="
          wallet-label
          text-xs font-medium text-text-secondary
          leading-tight text-center
          max-w-[4rem] truncate
          sm:max-w-[5rem]
        "
        title={walletName} // Full name on hover for accessibility
      >
        {walletName}
      </span>
    </div>
  );
};

export default WalletIcon;