import React, { useState, useEffect } from 'react';
import { Zap, Info, Shield, Wallet, TrendingUp, Lock, Activity } from 'lucide-react';
import { bitcoinWalletService, ConnectedWallet, WalletInfo } from '../services/bitcoinWalletService';
import { depositService } from '../services/depositService';
import { hodlprotocolCanisterService, PoolStats, BabylonStakingStats } from '../services/hodlprotocolCanisterService';
import UnisatIcon from '../../assets/images/Unisat.svg';
import XverseIcon from '../../assets/images/Xverse.svg';
import BTCIcon from '../../assets/images/BTC.svg';

const StakeBTCPage: React.FC = () => {
  // State
  const [depositAmount, setDepositAmount] = useState('');
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWallet | null>(null);
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);
  const [blstBalance, setBlstBalance] = useState<number>(0);
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [babylonStats, setBabylonStats] = useState<BabylonStakingStats | null>(null);
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

    // Fetch Babylon staking statistics
    const fetchBabylonStats = async () => {
      try {
        const stats = await hodlprotocolCanisterService.getBabylonStakingStats();
        setBabylonStats(stats);
      } catch (err: any) {
        console.error('Failed to fetch Babylon stats:', err);
        // Non-critical for deposit flow
      }
    };

    fetchPoolData();
    fetchBabylonStats();
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

      // Create a success message with colored tokens (we'll use a simpler approach since this is a string)
      const btcAmount = depositAmount;
      const blstAmount = Number(result.expectedBlst) / 1000;
      setTxStatus(`✓ Success! Deposited ${btcAmount} BTC → Received ${blstAmount} BLST`);

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
    <div className="w-full min-h-screen bg-bg text-text-primary">
      <div className="container-app">
        {/* Hero Section - Compact on mobile */}
        <div className="text-center py-4 md:py-8">
          <h1 className="text-xl md:text-3xl font-bold text-text-primary mb-1 md:mb-2">
            Liquid Staking Pool
          </h1>
          <p className="text-xs md:text-base text-text-secondary">
            Deposit BTC, receive BLST, earn Babylon rewards
          </p>
        </div>

        {/* Wallet Connection (Mobile-Optimized) */}
        {!connectedWallet && (
          <div className="max-w-md mx-auto mb-4 md:mb-6">
            <div className="bg-surface-1 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4">
              <h3 className="text-sm md:text-base font-semibold text-text-primary mb-2 md:mb-3">
                Connect Bitcoin Wallet
              </h3>
              <div className="space-y-2 md:space-y-3">
                {availableWallets.map((wallet) => {
                  // Select wallet icon
                  const WalletIcon = wallet.id === 'unisat' ? UnisatIcon : XverseIcon;

                  return (
                    <button
                      key={wallet.id}
                      onClick={() => handleConnectWallet(wallet.id)}
                      disabled={!wallet.isInstalled || isLoading}
                      className="w-full flex items-center justify-between p-3 md:p-4 bg-surface-2 border border-white/10 rounded-lg md:rounded-xl hover:bg-surface-3 hover:border-primary-500/30 disabled:opacity-50 disabled:hover:bg-surface-2 disabled:hover:border-white/10 min-h-[52px] md:min-h-[56px] transition-all group"
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center">
                          <img src={WalletIcon} alt={wallet.name} className="w-7 h-7 md:w-8 md:h-8 object-contain" />
                        </div>
                        <span className="font-semibold text-sm group-hover:text-primary-400 transition-colors">
                          {wallet.name}
                        </span>
                      </div>
                      {!wallet.isInstalled && (
                        <span className="text-xs text-text-muted bg-surface-3 px-2 py-1 rounded">
                          Not installed
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {error && (
                <div className="mt-2 md:mt-3 p-2.5 md:p-3 bg-error-600/15 border border-error-500/30 rounded-lg md:rounded-xl text-xs text-error-400">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Deposit Interface (Connected) */}
        {connectedWallet && (
          <div className="max-w-2xl mx-auto">
            {/* Connected Wallet Badge - Compact on mobile */}
            <div className="mb-2 md:mb-3 p-2 md:p-3 bg-success-600/15 border border-success-500/30 rounded-lg md:rounded-xl flex items-center justify-between">
              <span className="text-xs text-success-400 font-medium">
                {connectedWallet.walletId} connected
              </span>
              <span className="text-xs text-text-muted font-mono">
                {connectedWallet.address.slice(0, 6)}...{connectedWallet.address.slice(-4)}
              </span>
            </div>

            {/* Main Deposit Interface - Above the fold for mobile thumb navigation */}
            <div className="bg-surface-1 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-6">
              {/* Amount Input - Compact on mobile */}
              <div className="mb-3 md:mb-4">
                <label className="text-xs font-medium text-text-secondary mb-1.5 md:mb-2 block">
                  Amount to Deposit
                </label>
                <div className="bg-surface-2 border border-white/10 rounded-lg md:rounded-xl p-3 md:p-4 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/20 hover:border-primary-400/50 focus-within:border-primary-500 focus-within:shadow-lg focus-within:shadow-primary-500/20 focus-within:scale-[1.01]">
                  <div className="flex items-center gap-2 md:gap-3">
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.0"
                      className="flex-1 text-xl md:text-2xl font-semibold text-text-primary bg-transparent border-none outline-none min-h-[44px]"
                      step="any"
                      min="0.0005"
                    />
                    <div className="px-2 py-1.5 md:px-3 md:py-2 bg-surface-3 rounded-lg flex items-center gap-1">
                      <img src={BTCIcon} alt="BTC" className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-1.5 md:mt-2 text-xs text-text-muted flex items-center gap-1">
                    Min: 0.0005 <img src={BTCIcon} alt="BTC" className="w-3 h-3 inline-block" /> (50 <span className="text-blst">BLST</span>)
                  </div>
                </div>
              </div>

              {/* Pool Info - Compact on mobile */}
              <div className="mb-3 md:mb-4 bg-surface-2 border border-white/10 rounded-lg md:rounded-xl p-3 md:p-4 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/20 hover:border-primary-400/50 hover:scale-[1.01] cursor-default">
                <div className="space-y-2 md:space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Lock className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary-400" />
                      <span className="text-xs md:text-sm text-text-secondary">Lock Period</span>
                    </div>
                    <span className="text-xs md:text-sm font-semibold text-text-primary">90 Days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Shield className="w-3.5 h-3.5 md:w-4 md:h-4 text-success-400" />
                      <span className="text-xs md:text-sm text-text-secondary">Finality Provider</span>
                    </div>
                    <span className="text-xs font-mono text-text-primary">Top Performer</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-xs md:text-sm text-text-secondary">Pool APY</span>
                    <span className="text-base md:text-lg font-bold text-success-400">{getCurrentAPY()}</span>
                  </div>
                </div>
              </div>

              {/* Deposit Summary - Compact on mobile */}
              <div className="bg-surface-2 border border-white/10 rounded-lg md:rounded-xl p-2.5 md:p-3 mb-3 md:mb-4 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/20 hover:border-primary-400/50 hover:scale-[1.01] cursor-default">
                <div className="space-y-1.5 md:space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">You will receive</span>
                    <span className="font-medium text-text-primary">
                      {depositAmount ? (parseFloat(depositAmount) * 100000).toLocaleString() : '0'} <span className="text-blst">BLST</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Exchange Rate</span>
                    <span className="font-medium text-text-primary flex items-center gap-1">
                      100,000 <span className="text-blst">BLST</span> = 1 <img src={BTCIcon} alt="BTC" className="w-3 h-3 inline-block" />
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Estimated APY</span>
                    <span className="font-medium text-success-400">{getCurrentAPY()}</span>
                  </div>
                </div>
              </div>

              {/* Status Messages - Compact on mobile */}
              {txStatus && (
                <div className="mb-3 md:mb-4 p-2.5 md:p-3 bg-primary-600/15 border border-primary-500/30 rounded-lg md:rounded-xl text-xs text-primary-400">
                  {txStatus}
                </div>
              )}

              {error && (
                <div className="mb-3 md:mb-4 p-2.5 md:p-3 bg-error-600/15 border border-error-500/30 rounded-lg md:rounded-xl text-xs text-error-400">
                  {error}
                </div>
              )}

              {/* Deposit Button - Inside Modal, mobile-optimized with inviting green */}
              <button
                onClick={handleDeposit}
                disabled={!depositAmount || parseFloat(depositAmount) === 0 || isDepositing}
                className="w-full bg-success-600 hover:bg-success-500 active:bg-success-700 text-white py-3 md:py-4 text-sm md:text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-success-600 min-h-[52px] md:min-h-[56px] rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-success-600/20 hover:shadow-xl hover:shadow-success-500/40 hover:scale-[1.02] active:scale-[0.98] group"
              >
                <Zap className="w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 group-hover:rotate-12" />
                {isDepositing ? 'Processing...' : 'Deposit BTC'}
              </button>
            </div>

            {/* Babylon Staking Stats Display - Below the fold for mobile (progressive disclosure) */}
            {babylonStats && (
              <div className="mt-3 md:mt-4 bg-gradient-to-r from-primary-600/20 to-primary-500/10 border border-primary-500/30 rounded-lg md:rounded-xl p-3 md:p-4 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/20 hover:border-primary-400/50 hover:scale-[1.01] cursor-default">
                <div className="mb-2 md:mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 md:w-5 md:h-5 text-primary-400" />
                  <span className="text-xs md:text-sm font-semibold text-text-primary">Babylon Staking Status</span>
                </div>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <div className="bg-surface-2/50 rounded-lg p-2 md:p-3">
                    <div className="text-xs text-text-muted mb-0.5 md:mb-1">Total Staked</div>
                    <div className="text-sm md:text-lg font-bold text-text-primary flex items-center gap-1">
                      {(Number(babylonStats.total_staked_to_babylon) / 100000000).toFixed(4)} <img src={BTCIcon} alt="BTC" className="w-3 h-3 md:w-4 md:h-4" />
                    </div>
                  </div>
                  <div className="bg-surface-2/50 rounded-lg p-2 md:p-3">
                    <div className="text-xs text-text-muted mb-0.5 md:mb-1">Active Delegations</div>
                    <div className="text-sm md:text-lg font-bold text-success-400">
                      {babylonStats.active_delegations}
                    </div>
                  </div>
                  <div className="bg-surface-2/50 rounded-lg p-2 md:p-3">
                    <div className="text-xs text-text-muted mb-0.5 md:mb-1">BABY Rewards</div>
                    <div className="text-sm md:text-lg font-bold text-primary-400">
                      {Number(babylonStats.total_baby_rewards).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-surface-2/50 rounded-lg p-2 md:p-3">
                    <div className="text-xs text-text-muted mb-0.5 md:mb-1">Pending Txs</div>
                    <div className="text-sm md:text-lg font-bold text-text-primary">
                      {babylonStats.pending_babylon_txs}
                    </div>
                  </div>
                </div>

                {/* BLST Balance - Integrated as summary row */}
                <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-primary-500/20">
                  <div className="bg-gradient-to-r from-primary-600/30 to-success-600/30 rounded-lg p-2.5 md:p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-blst" />
                      <span className="text-xs md:text-sm font-medium text-text-secondary">Your BLST Balance</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg md:text-xl font-bold text-text-primary">
                        {blstBalance.toLocaleString()} <span className="text-blst">BLST</span>
                      </div>
                      <div className="text-xs text-text-muted flex items-center justify-end gap-1">
                        ≈ {(blstBalance / 100000).toFixed(4)} <img src={BTCIcon} alt="BTC" className="w-3 h-3 inline-block" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StakeBTCPage;
