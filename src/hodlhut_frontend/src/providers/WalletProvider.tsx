// ===============================================
// Wallet Provider - Simple Passthrough
// ===============================================
// Simple wrapper component (wagmi/WalletConnect removed)
// We now use direct wallet integrations:
// - simpleEthereumWallet for Ethereum (MetaMask, Trust, etc.)
// - usePlugWallet for ICP
// - Bitcoin wallet for BTC

import React from 'react';

interface WalletProviderProps {
  children: React.ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  return <>{children}</>;
};
