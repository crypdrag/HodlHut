import React from 'react';
import BTCIcon from '../../assets/images/BTC.svg';
import ckBTCIcon from '../../assets/images/ckBTC.svg';
import ETHIcon from '../../assets/images/ETH.svg';
import ckETHIcon from '../../assets/images/ckETH.svg';
import SOLIcon from '../../assets/images/SOL.svg';
import ckSOLIcon from '../../assets/images/ckSOL.svg';
import USDCIcon from '../../assets/images/USDC.svg';
import ckUSDCIcon from '../../assets/images/ckUSDC.svg';
import USDTIcon from '../../assets/images/USDT.svg';
import ckUSDTIcon from '../../assets/images/ckUSDT.svg';
import USDC_SOLIcon from '../../assets/images/USDC_SOL.svg';
import ICPIcon from '../../assets/images/ICP.svg';
import HodlHutLogo from '../../assets/images/hodlhut_logo.svg';

interface AssetIconProps {
  asset: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const assetIconMap: Record<string, string> = {
  'BTC': BTCIcon,
  'ckBTC': ckBTCIcon,
  'ETH': ETHIcon,
  'ckETH': ckETHIcon,
  'SOL': SOLIcon,
  'ckSOL': ckSOLIcon,
  'USDC': USDCIcon,
  'ckUSDC': ckUSDCIcon,
  'USDT': USDTIcon,
  'ckUSDT': ckUSDTIcon,
  'USDC-SOL': ckUSDCIcon,
  'USDC_SOL': USDC_SOLIcon,
  'ICP': ICPIcon,
  'logo': HodlHutLogo
};

const AssetIcon: React.FC<AssetIconProps> = ({ 
  asset, 
  size = 24, 
  className = '',
  style = {}
}) => {
  const iconSrc = assetIconMap[asset];
  
  if (!iconSrc) {
    return (
      <div 
        className={`asset-icon-fallback ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: 'var(--gray-200)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.5,
          color: 'var(--text-secondary)',
          ...style
        }}
      >
        ?
      </div>
    );
  }

  return (
    <img
      src={iconSrc}
      alt={asset}
      className={`asset-icon ${className}`}
      style={{
        width: size,
        height: size,
        ...style
      }}
    />
  );
};

export default AssetIcon;