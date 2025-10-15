import React, { useState, useEffect } from 'react';
import { Zap, Info, Shield, Wallet, ChevronDown, CheckCircle } from 'lucide-react';
import { bitcoinWalletService, ConnectedWallet, WalletInfo } from '../services/bitcoinWalletService';
import { bitcoinStakingService, StakingInputs } from '../services/bitcoinStakingService';
import { reeOrchestratorService } from '../services/reeOrchestratorService';

// Mock types for now - will be replaced with actual canister imports
interface FinalityProvider {
  consensus_pubkey: string; // Changed from btc_pk_hex to match service interface
  description: { moniker: string; website: string };
  commission: string;
  voting_power: string;
  estimated_apy: number;
}

const StakeBTCPage: React.FC = () => {
  // State
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakingDuration, setStakingDuration] = useState<30 | 90 | 180>(90);
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWallet | null>(null);
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);
  const [finalityProviders, setFinalityProviders] = useState<FinalityProvider[]>([]);
  const [selectedFP, setSelectedFP] = useState<FinalityProvider | null>(null);
  const [showFPSelector, setShowFPSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // Initialize: Detect wallets and fetch FPs
  useEffect(() => {
    const wallets = bitcoinWalletService.getAvailableWallets();
    setAvailableWallets(wallets);

    // Fetch real FPs from canister
    const fetchFPs = async () => {
      setIsLoading(true);
      try {
        const fps = await bitcoinStakingService.fetchFinalityProviders();

        // Convert to FinalityProvider format expected by UI
        const formattedFPs: FinalityProvider[] = fps.map(fp => ({
          consensus_pubkey: fp.consensus_pubkey,
          description: {
            moniker: fp.moniker,
            website: '' // Not provided by Babylon API
          },
          commission: fp.commission_rate,
          voting_power: fp.voting_power,
          estimated_apy: fp.apy,
        }));

        setFinalityProviders(formattedFPs);
        if (formattedFPs.length > 0) {
          setSelectedFP(formattedFPs[0]); // Auto-select top FP by voting power
        }
      } catch (err: any) {
        console.error('Failed to fetch finality providers:', err);
        setError(`Failed to load finality providers: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFPs();
  }, []);

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

  // Handle staking
  const handleStake = async () => {
    if (!connectedWallet || !selectedFP) {
      setError('Please connect wallet and select a finality provider');
      return;
    }

    setIsStaking(true);
    setError(null);
    setTxStatus('Preparing staking transaction...');

    try {
      // Convert inputs
      const amountSats = Math.floor(parseFloat(stakeAmount) * 100000000); // BTC to sats
      const durationBlocks = stakingDuration * 144; // Days to blocks (~144 blocks/day)

      // Validate
      const validation = bitcoinStakingService.validateStakingInputs({
        amount: amountSats,
        duration: durationBlocks,
        finalityProvider: selectedFP as any,
        userBtcAddress: connectedWallet.address,
        userBtcPublicKey: connectedWallet.publicKey,
      });

      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      setTxStatus('Constructing PSBTs...');

      // Construct PSBTs
      const stakeOffer = await bitcoinStakingService.constructStakingPSBTs({
        amount: amountSats,
        duration: durationBlocks,
        finalityProvider: selectedFP as any,
        userBtcAddress: connectedWallet.address,
        userBtcPublicKey: connectedWallet.publicKey,
      });

      setTxStatus('Please sign in your wallet...');

      // Sign PSBT
      const signedPsbtResult = await bitcoinWalletService.signPsbt(stakeOffer.psbts.stakingPsbtHex);

      setTxStatus('Transaction signed! Submitting to Bitcoin network...');

      // Submit to REE Orchestrator
      const result = await reeOrchestratorService.submitSignedPsbt(signedPsbtResult.signedPsbtHex, {
        action: 'stake_babylon',
        finality_provider: selectedFP.consensus_pubkey,
        timelock_blocks: durationBlocks,
        amount_sats: amountSats,
      });

      setTxStatus(`✓ Success! Transaction submitted: ${result.tx_id.slice(0, 16)}...`);

      setTimeout(() => {
        setTxStatus(null);
        setStakeAmount('');
      }, 3000);
    } catch (err: any) {
      setError(err.message);
      setTxStatus(null);
    } finally {
      setIsStaking(false);
    }
  };

  // Get APY for selected FP
  const getCurrentAPY = () => {
    return selectedFP ? `${selectedFP.estimated_apy.toFixed(1)}%` : '8.0%';
  };

  return (
    <div className="w-full min-h-screen bg-bg text-text-primary pb-32">
      <div className="container-app">
        {/* Hero Section */}
        <div className="text-center py-6 md:py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">
            Stake Bitcoin
          </h1>
          <p className="text-sm md:text-base text-text-secondary">
            Earn rewards via Babylon Protocol
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

        {/* Main Staking Interface (Connected) */}
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

            <div className="bg-surface-1 border border-white/10 rounded-2xl p-4 md:p-6">
              {/* Amount Input */}
              <div className="mb-4">
                <label className="text-xs font-medium text-text-secondary mb-2 block">
                  Amount to Stake
                </label>
                <div className="bg-surface-2 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      placeholder="0.0"
                      className="flex-1 text-xl md:text-2xl font-semibold text-text-primary bg-transparent border-none outline-none min-h-[44px]"
                      step="any"
                      min="0"
                    />
                    <div className="px-3 py-2 bg-surface-3 rounded-lg">
                      <span className="text-sm font-semibold">BTC</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-text-muted">
                    Min: 0.0005 BTC • Max: 350 BTC
                  </div>
                </div>
              </div>

              {/* Duration Selection (Mobile Touch Targets) */}
              <div className="mb-4">
                <label className="text-xs font-medium text-text-secondary mb-2 block">
                  Staking Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 90, 180].map((days) => (
                    <button
                      key={days}
                      onClick={() => setStakingDuration(days as 30 | 90 | 180)}
                      className={`p-3 rounded-xl border transition-all min-h-[56px] ${
                        stakingDuration === days
                          ? 'border-primary-500 bg-primary-600/15'
                          : 'border-white/10 bg-surface-2 hover:bg-surface-3'
                      }`}
                    >
                      <div className="text-sm font-bold text-text-primary">{days} Days</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Finality Provider Selector (Mobile-First) */}
              <div className="mb-4">
                <label className="text-xs font-medium text-text-secondary mb-2 block">
                  Finality Provider
                </label>
                <button
                  onClick={() => setShowFPSelector(!showFPSelector)}
                  className="w-full p-4 bg-surface-2 border border-white/10 rounded-xl hover:bg-surface-3 transition-all min-h-[56px]"
                >
                  {selectedFP ? (
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <div className="text-sm font-semibold text-text-primary">
                          {selectedFP.description.moniker}
                        </div>
                        <div className="text-xs text-success-400 mt-0.5">
                          APY: {selectedFP.estimated_apy.toFixed(1)}%
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 transition-transform ${showFPSelector ? 'rotate-180' : ''}`} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-muted">Select provider...</span>
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  )}
                </button>

                {/* FP List (Progressive Disclosure) */}
                {showFPSelector && (
                  <div className="mt-2 bg-surface-2 border border-white/10 rounded-xl overflow-hidden">
                    {finalityProviders.map((fp) => (
                      <button
                        key={fp.consensus_pubkey}
                        onClick={() => {
                          setSelectedFP(fp);
                          setShowFPSelector(false);
                        }}
                        className="w-full p-4 hover:bg-surface-3 transition-all min-h-[64px] border-b border-white/5 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-left flex-1">
                            <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
                              {fp.description.moniker}
                              {selectedFP?.consensus_pubkey === fp.consensus_pubkey && (
                                <CheckCircle className="w-4 h-4 text-success-400" />
                              )}
                            </div>
                            <div className="text-xs text-text-muted mt-0.5">
                              Commission: {fp.commission}%
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-success-400">
                              {fp.estimated_apy.toFixed(1)}%
                            </div>
                            <div className="text-xs text-text-muted">APY</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Staking Summary */}
              <div className="bg-surface-2 border border-white/10 rounded-xl p-3 mb-4">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">You will receive</span>
                    <span className="font-medium text-text-primary">
                      {stakeAmount || '0.0'} BLST
                    </span>
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
              onClick={handleStake}
              disabled={!stakeAmount || parseFloat(stakeAmount) === 0 || !selectedFP || isStaking}
              className="w-full btn-primary py-4 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px] flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              {isStaking ? 'Processing...' : 'Stake BTC'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StakeBTCPage;
