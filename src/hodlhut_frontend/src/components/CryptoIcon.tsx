import React from "react";

type CryptoIconProps = {
  symbol: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

const sizeClasses = {
  sm: "text-sm", // 14px
  md: "text-base", // 16px  
  lg: "text-lg", // 18px
  xl: "text-xl", // 20px
};

// Map your app's tokens to cryptocoins icon symbols
const TOKEN_ICON_MAP: Record<string, string> = {
  // Core crypto assets
  'BTC': 'BTC',
  'ckBTC': 'BTC', // Use Bitcoin icon for chain key Bitcoin
  'ETH': 'ETH', 
  'ckETH': 'ETH', // Use Ethereum icon for chain key Ethereum
  'ICP': 'ICP',
  
  // Stablecoins
  'USDC': 'USDC', // Ethereum USDC uses USDC icon
  'ckUSDC': 'USDC', // Use USDC icon for chain key USDC
  'USDT': 'USDT', // Ethereum USDT uses USDT icon
  'ckUSDT': 'USDT', // Use USDT icon for chain key USDT
};

export function CryptoIcon({ 
  symbol, 
  className = "", 
  size = "md" 
}: CryptoIconProps) {
  const iconSymbol = TOKEN_ICON_MAP[symbol] || symbol;
  const iconClass = `cc ${iconSymbol.toUpperCase()} ${sizeClasses[size]} ${className}`;
  return <i className={iconClass} aria-label={`${symbol} icon`} />;
}

// Your app's supported tokens:
// BTC, ckBTC, ETH, ckETH, ICP
// USDC, ckUSDC, USDT, ckUSDT
// Usage: <CryptoIcon symbol="ckBTC" size="lg" className="text-warning-400" />