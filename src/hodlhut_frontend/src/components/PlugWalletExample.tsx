// Example component demonstrating Plug wallet integration
// This can be used as a reference for integrating Plug into existing components

import React, { useState } from 'react';
import { usePlugWallet, useSwapOperations } from '../hooks/usePlugWallet';
import { SwapRequest } from '../types/myhut';

const PlugWalletExample: React.FC = () => {
  const {
    isConnected,
    isConnecting,
    principal,
    userHutId,
    error,
    connectWallet,
    disconnectWallet,
    getUserHut,
    hasHut,
    getTestPrincipal,
    clearError
  } = usePlugWallet();

  const {
    isSwapping,
    lastSwapResult,
    performSwap
  } = useSwapOperations();

  const [swapForm, setSwapForm] = useState({
    fromAsset: 'ICP' as const,
    toAsset: 'ckBTC' as const,
    amount: '1.0',
    slippage: 0.5,
    urgency: 'medium' as const
  });

  // Handle wallet connection
  const handleConnect = async () => {
    const principal = await connectWallet();
    if (principal) {
      // Automatically get user's Hut after connection
      await getUserHut(principal);
    }
  };

  // Handle swap execution
  const handleSwap = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    const swapRequest: SwapRequest = {
      fromAsset: swapForm.fromAsset,
      toAsset: swapForm.toAsset,
      amount: (parseFloat(swapForm.amount) * 100_000_000).toString(), // Convert to smallest units
      slippage: swapForm.slippage,
      urgency: swapForm.urgency,
      dexPreference: 'KongSwap'
    };

    const success = await performSwap(swapRequest);
    if (success) {
      alert('Swap executed successfully!');
    } else {
      alert('Swap failed. Check console for details.');
    }
  };

  // Test functions
  const handleTestPrincipal = async () => {
    const testPrincipal = await getTestPrincipal();
    if (testPrincipal) {
      alert(`Test principal: ${testPrincipal.toString()}`);
    }
  };

  const handleCheckHut = async () => {
    if (principal) {
      const userHasHut = await hasHut(principal);
      alert(`User has Hut: ${userHasHut}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-surface-1 rounded-xl border border-white/10">
      <h2 className="text-2xl font-bold text-text-primary mb-6">Plug Wallet Integration</h2>

      {/* Connection Status */}
      <div className="mb-6 p-4 bg-surface-2 rounded-lg">
        <h3 className="text-lg font-semibold text-text-primary mb-3">Connection Status</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Connected:</span>
            <span className={`font-medium ${isConnected ? 'text-success-400' : 'text-error-400'}`}>
              {isConnected ? 'Yes' : 'No'}
            </span>
          </div>

          {principal && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Principal:</span>
              <span className="text-text-primary font-mono text-xs">
                {principal.toString().slice(0, 20)}...
              </span>
            </div>
          )}

          {userHutId && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Hut ID:</span>
              <span className="text-text-primary font-mono text-xs">
                {userHutId.toString().slice(0, 20)}...
              </span>
            </div>
          )}

          {error && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Error:</span>
              <span className="text-error-400 text-xs">{error}</span>
            </div>
          )}
        </div>

        {/* Connection Controls */}
        <div className="flex gap-3 mt-4">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="btn-primary btn-text"
            >
              {isConnecting ? 'Connecting...' : 'Connect Plug Wallet'}
            </button>
          ) : (
            <button
              onClick={disconnectWallet}
              className="btn-secondary btn-text"
            >
              Disconnect
            </button>
          )}

          {error && (
            <button
              onClick={clearError}
              className="btn-secondary btn-text"
            >
              Clear Error
            </button>
          )}
        </div>
      </div>

      {/* Swap Interface */}
      {isConnected && (
        <div className="mb-6 p-4 bg-surface-2 rounded-lg">
          <h3 className="text-lg font-semibold text-text-primary mb-3">Test Swap</h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-text-secondary text-sm mb-1">From Asset</label>
              <select
                value={swapForm.fromAsset}
                onChange={(e) => setSwapForm(prev => ({ ...prev, fromAsset: e.target.value as any }))}
                className="w-full p-2 bg-surface-3 border border-white/10 rounded text-text-primary"
              >
                <option value="ICP">ICP</option>
                <option value="ckBTC">ckBTC</option>
                <option value="ckETH">ckETH</option>
              </select>
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-1">To Asset</label>
              <select
                value={swapForm.toAsset}
                onChange={(e) => setSwapForm(prev => ({ ...prev, toAsset: e.target.value as any }))}
                className="w-full p-2 bg-surface-3 border border-white/10 rounded text-text-primary"
              >
                <option value="ckBTC">ckBTC</option>
                <option value="ckETH">ckETH</option>
                <option value="ckUSDC">ckUSDC</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-text-secondary text-sm mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                value={swapForm.amount}
                onChange={(e) => setSwapForm(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full p-2 bg-surface-3 border border-white/10 rounded text-text-primary"
              />
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-1">Slippage (%)</label>
              <input
                type="number"
                step="0.1"
                value={swapForm.slippage}
                onChange={(e) => setSwapForm(prev => ({ ...prev, slippage: parseFloat(e.target.value) }))}
                className="w-full p-2 bg-surface-3 border border-white/10 rounded text-text-primary"
              />
            </div>
          </div>

          <button
            onClick={handleSwap}
            disabled={isSwapping}
            className="w-full btn-primary btn-text"
          >
            {isSwapping ? 'Executing Swap...' : 'Execute Test Swap'}
          </button>

          {/* Swap Result */}
          {lastSwapResult && (
            <div className="mt-4 p-3 bg-surface-3 rounded">
              <h4 className="text-sm font-medium text-text-primary mb-2">Last Swap Result:</h4>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Success:</span>
                  <span className={lastSwapResult.success ? 'text-success-400' : 'text-error-400'}>
                    {lastSwapResult.success ? 'Yes' : 'No'}
                  </span>
                </div>
                {lastSwapResult.transactionId && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Transaction ID:</span>
                    <span className="text-text-primary font-mono">{lastSwapResult.transactionId}</span>
                  </div>
                )}
                {lastSwapResult.errorMessage && (
                  <div className="text-error-400 text-xs">
                    Error: {lastSwapResult.errorMessage}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Test Functions */}
      {isConnected && (
        <div className="p-4 bg-surface-2 rounded-lg">
          <h3 className="text-lg font-semibold text-text-primary mb-3">Test Functions</h3>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTestPrincipal}
              className="btn-secondary btn-text"
            >
              Get Test Principal
            </button>

            <button
              onClick={handleCheckHut}
              className="btn-secondary btn-text"
            >
              Check Has Hut
            </button>

            <button
              onClick={() => getUserHut()}
              className="btn-secondary btn-text"
            >
              Refresh Hut ID
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlugWalletExample;