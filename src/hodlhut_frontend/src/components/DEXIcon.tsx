import React from 'react';
import KongSwapIcon from '../../assets/images/KongSwap.svg';
import ICPSwapIcon from '../../assets/images/ICPSwap.svg';

interface DEXIconProps {
  dex: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const dexIconMap: Record<string, string> = {
  'KongSwap': KongSwapIcon,
  'ICPSwap': ICPSwapIcon
};

const DEXIcon: React.FC<DEXIconProps> = ({
  dex,
  size = 24,
  className = '',
  style = {}
}) => {
  const iconSrc = dexIconMap[dex];

  if (!iconSrc) {
    return (
      <div
        className={`dex-icon-fallback ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: 'var(--surface-3)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.4,
          color: 'var(--text-secondary)',
          fontWeight: 'bold',
          ...style
        }}
      >
        {dex.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={iconSrc}
      alt={`${dex} logo`}
      className={`dex-icon ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '8px',
        ...style
      }}
    />
  );
};

export default DEXIcon;