import React, { useState, useEffect } from 'react';
import { Zap, Info, Shield, Wallet, TrendingUp, Lock } from 'lucide-react';
import { bitcoinWalletService, ConnectedWallet, WalletInfo } from '../services/bitcoinWalletService';
import { depositService } from '../services/depositService';
import { hodlprotocolCanisterService, PoolStats } from '../services/hodlprotocolCanisterService';

const StakeBTCPage: React.FC = () => {
  // State
  const [depositAmount, setDepositAmount] = useState('');
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWallet | null>(null);
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);
  const [blstBalance, setBlstBalance] = useState<number>(0);
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // Initialize: Detect wallets and fetch pool stats
  useEffect(() => {
    const wallets = bitcoinWalletService.getAvailableWallets();
    setAvailableWallets(wallets);

    // Fetch pool statistics
    const fetchPoolData = async () => {
      setIsLoading(true);
      try {
        const stats = await depositService.getPoolStats();
        setPoolStats(stats as PoolStats);
      } catch (err: any) {
        console.error('Failed to fetch pool stats:', err);
        // Don't set error - pool stats are non-critical for deposit flow
      } finally {
        setIsLoading(false);
      }
    };

    fetchPoolData();
  }, []);

  // Fetch BLST balance when wallet connects
  useEffect(() => {
    const fetchBalance = async () => {
      if (!connectedWallet) return;

      try {
        const balance = await depositService.getBlstBalance(connectedWallet.address);
        setBlstBalance(balance);
      } catch (err: any) {
        console.error('Failed to fetch BLST balance:', err);
      }
    };

    fetchBalance();
  }, [connectedWallet]);

  // Handle wallet connection
  const handleConnectWallet = async (walletId: 'unisat' | 'xverse') => {
    setIsLoading(true);
    setError(null);
    try {
      const wallet = await bitcoinWalletService.connect(walletId);
      setConnectedWallet(wallet);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deposit to pool
  const handleDeposit = async () => {
    if (!connectedWallet) {
      setError('Please connect your wallet');
      return;
    }

    if (!depositAmount || parseFloat(depositAmount) === 0) {
      setError('Please enter a deposit amount');
      return;
    }

    setIsDepositing(true);
    setError(null);
    setTxStatus('Preparing deposit...');

    try {
      // Convert BTC to sats
      const amountSats = Math.floor(parseFloat(depositAmount) * 100000000);

      // Validate minimum deposit (0.0005 BTC = 50,000 sats)
      if (amountSats < 50000) {
        throw new Error('Minimum deposit is 0.0005 BTC (50 BLST)');
      }

      // Call depositService
      setTxStatus('Calling deposit service...');
      const result = await depositService.depositToPool(
        {
          userBtcAddress: connectedWallet.address,
          amountSats,
        },
        // Pass wallet signing function
        async (psbtHex: string) => {
          setTxStatus('Please sign in your wallet...');
          const signed = await bitcoinWalletService.signPsbt(psbtHex);
          return signed.signedPsbtHex;
        }
      );

      setTxStatus(`✓ Success! Deposited ${depositAmount} BTC. You received ${Number(result.expectedBlst) / 1000} BLST`);

      // Refresh balance
      const newBalance = await depositService.getBlstBalance(connectedWallet.address);
      setBlstBalance(newBalance);

      setTimeout(() => {
        setTxStatus(null);
        setDepositAmount('');
      }, 5000);
    } catch (err: any) {
      console.error('Deposit error:', err);
      setError(err.message);
      setTxStatus(null);
    } finally {
      setIsDepositing(false);
    }
  };

  // Get current pool APY (hardcoded for MVP - will be dynamic in production)
  const getCurrentAPY = () => {
    return '8.5%'; // TODO: Fetch from Babylon rewards data
  };

  return (
    <div className="w-full min-h-screen bg-bg text-text-primary pb-32">
      <div className="container-app">
        {/* Hero Section */}
        <div className="text-center py-6 md:py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">
            Liquid Staking Pool
          </h1>
          <p className="text-sm md:text-base text-text-secondary">
            Deposit BTC, receive BLST, earn Babylon rewards
          </p>
        </div>

        {/* Wallet Connection (Mobile-Optimized) */}
        {!connectedWallet && (
          <div className="max-w-md mx-auto mb-6">
            <div className="bg-surface-1 border border-white/10 rounded-2xl p-4">
              <h3 className="text-base font-semibold text-text-primary mb-3">
                Connect Bitcoin Wallet
              </h3>
              <div className="space-y-2">
                {availableWallets.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => handleConnectWallet(wallet.id)}
                    disabled={!wallet.isInstalled || isLoading}
                    className="w-full flex items-center justify-between p-4 bg-surface-2 border border-white/10 rounded-xl hover:bg-surface-3 disabled:opacity-50 min-h-[48px] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5" />
                      <span className="font-medium text-sm">{wallet.name}</span>
                    </div>
                    {!wallet.isInstalled && (
                      <span className="text-xs text-text-muted">Not installed</span>
                    )}
                  </button>
                ))}
              </div>
              {error && (
                <div className="mt-3 p-3 bg-error-600/15 border border-error-500/30 rounded-xl text-xs text-error-400">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Deposit Interface (Connected) */}
        {connectedWallet && (
          <div className="max-w-2xl mx-auto">
            {/* Connected Wallet Badge */}
            <div className="mb-4 p-3 bg-success-600/15 border border-success-500/30 rounded-xl flex items-center justify-between">
              <span className="text-xs text-success-400 font-medium">
                {connectedWallet.walletId} connected
              </span>
              <span className="text-xs text-text-muted font-mono">
                {connectedWallet.address.slice(0, 6)}...{connectedWallet.address.slice(-4)}
              </span>
            </div>

            {/* BLST Balance Display */}
            <div className="mb-4 bg-gradient-to-r from-primary-600/20 to-success-600/20 border border-primary-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary-400" />
                  <span className="text-sm font-medium text-text-secondary">Your BLST Balance</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-text-primary">
                    {blstBalance.toLocaleString()} BLST
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    ≈ {(blstBalance / 100000).toFixed(4)} BTC
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface-1 border border-white/10 rounded-2xl p-4 md:p-6">
              {/* Amount Input */}
              <div className="mb-4">
                <label className="text-xs font-medium text-text-secondary mb-2 block">
                  Amount to Deposit
                </label>
                <div className="bg-surface-2 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.0"
                      className="flex-1 text-xl md:text-2xl font-semibold text-text-primary bg-transparent border-none outline-none min-h-[44px]"
                      step="any"
                      min="0.0005"
                    />
                    <div className="px-3 py-2 bg-surface-3 rounded-lg">
                      <span className="text-sm font-semibold">BTC</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-text-muted">
                    Min: 0.0005 BTC (50 BLST)
                  </div>
                </div>
              </div>

              {/* Pool Info (Read-only) */}
              <div className="mb-4 bg-surface-2 border border-white/10 rounded-xl p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary-400" />
                      <span className="text-sm text-text-secondary">Lock Period</span>
                    </div>
                    <span className="text-sm font-semibold text-text-primary">90 Days (12,960 blocks)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-success-400" />
                      <span className="text-sm text-text-secondary">Finality Provider</span>
                    </div>
                    <span className="text-xs font-mono text-text-primary">Top Performer</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-sm text-text-secondary">Pool APY</span>
                    <span className="text-lg font-bold text-success-400">{getCurrentAPY()}</span>
                  </div>
                </div>
              </div>

              {/* Deposit Summary */}
              <div className="bg-surface-2 border border-white/10 rounded-xl p-3 mb-4">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">You will receive</span>
                    <span className="font-medium text-text-primary">
                      {depositAmount ? (parseFloat(depositAmount) * 100000).toLocaleString() : '0'} BLST
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Exchange Rate</span>
                    <span className="font-medium text-text-primary">100,000 BLST = 1 BTC</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Estimated APY</span>
                    <span className="font-medium text-success-400">{getCurrentAPY()}</span>
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              {txStatus && (
                <div className="mb-4 p-3 bg-primary-600/15 border border-primary-500/30 rounded-xl text-xs text-primary-400">
                  {txStatus}
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-error-600/15 border border-error-500/30 rounded-xl text-xs text-error-400">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Zone (Mobile UX Best Practice) */}
      {connectedWallet && (
        <div className="fixed bottom-0 left-0 right-0 bg-surface-1/95 backdrop-blur-lg border-t border-white/10 p-4 safe-area-inset-bottom">
          <div className="container-app max-w-2xl mx-auto">
            <button
              onClick={handleDeposit}
              disabled={!depositAmount || parseFloat(depositAmount) === 0 || isDepositing}
              className="w-full btn-primary py-4 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px] flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              {isDepositing ? 'Processing...' : 'Deposit BTC'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StakeBTCPage;
