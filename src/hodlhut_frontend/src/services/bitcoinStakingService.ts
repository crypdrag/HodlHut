// ===============================================
// Bitcoin Staking Service - Babylon Pre-Staking Registration
// ===============================================
// Implements Pre-Staking flow for REE + Omnity + Babylon integration
// Architecture: Construct PSBT → User signs → REE broadcasts → Babylon registers

import { stakingTransaction } from '@babylonlabs-io/btc-staking-ts';
import { hodlprotocolCanisterService } from './hodlprotocolCanisterService';

// ===============================================
// TypeScript Interfaces
// ===============================================

export interface BabylonParams {
  unbonding_time: number;
  max_validators: number;
  min_commission_rate: string;
  bond_denom: string;
}

export interface FinalityProvider {
  moniker: string;
  operator_address: string;
  consensus_pubkey: string;
  commission_rate: string;
  voting_power: string;
  apy: number;
}

export interface StakingInputs {
  amount: number; // In satoshis
  duration: number; // In blocks
  finalityProvider: FinalityProvider;
  userBtcAddress: string; // Taproot address (tb1p... for testnet)
  userBtcPublicKey: string; // 33-byte hex public key
}

export interface StakingPSBTs {
  stakingPsbtHex: string; // Main staking transaction
  slashingPsbtHex: string; // Slashing transaction (covenant enforcement)
  unbondingPsbtHex: string; // Early unbonding transaction
  unbondingSlashingPsbtHex: string; // Unbonding slashing transaction
}

export interface StakeOffer {
  psbts: StakingPSBTs;
  estimatedBlstAmount: number; // BLST tokens to receive (1:1 with BTC amount)
  estimatedApy: number; // From finality provider
  babylonTxFee: number; // Protocol fee in satoshis
  networkFee: number; // Bitcoin network fee in satoshis
}

// ===============================================
// Bitcoin Staking Service
// ===============================================

class BitcoinStakingService {
  private babylonParams: BabylonParams | null = null;
  private finalityProviders: FinalityProvider[] = [];

  /**
   * Fetch Babylon parameters from hodlprotocol_exchange canister
   */
  async fetchBabylonParams(): Promise<BabylonParams> {
    try {
      // Fetch real Babylon params from deployed canister
      const params = await hodlprotocolCanisterService.getBabylonParams();

      // Cache the params
      this.babylonParams = params;

      return params;
    } catch (error) {
      console.error('Error fetching Babylon params from canister:', error);
      throw new Error(`Failed to fetch Babylon parameters: ${error.message}`);
    }
  }

  /**
   * Fetch top finality providers from hodlprotocol_exchange canister
   */
  async fetchFinalityProviders(): Promise<FinalityProvider[]> {
    try {
      // Fetch real finality providers from deployed canister
      const providers = await hodlprotocolCanisterService.getFinalityProviders();

      // Cache the providers
      this.finalityProviders = providers;

      return providers;
    } catch (error) {
      console.error('Error fetching finality providers from canister:', error);
      throw new Error(`Failed to fetch finality providers: ${error.message}`);
    }
  }

  /**
   * Construct staking PSBTs using Pre-Staking Registration flow
   * This is the critical method for Babylon integration
   */
  async constructStakingPSBTs(inputs: StakingInputs): Promise<StakeOffer> {
    // Ensure we have Babylon parameters
    if (!this.babylonParams) {
      await this.fetchBabylonParams();
    }

    try {
      // ===================================
      // Step 1: Prepare Babylon Parameters
      // ===================================

      // Convert user inputs to Babylon SDK format
      const covenantKeys = [
        // TODO: Fetch real covenant keys from Babylon testnet
        "0x...", // Placeholder - will be fetched from canister
      ];

      const minUnbondingTime = Math.floor(this.babylonParams!.unbonding_time / 10); // Convert to blocks

      // ===================================
      // Step 2: Construct PSBTs using btc-staking-ts SDK
      // ===================================

      // ===================================
      // Step 2A: Fetch Babylon staking parameters from backend
      // ===================================

      const stakingParams = await this.fetchBabylonStakingParams();

      // ===================================
      // Step 2B: Build Babylon staking scripts using btc-staking-ts SDK
      // ===================================

      const { Staking } = await import('@babylonlabs-io/btc-staking-ts');
      const { networks } = await import('bitcoinjs-lib');

      // Prepare staker info
      const stakerInfo = {
        address: inputs.userBtcAddress,
        publicKeyNoCoordHex: inputs.userBtcPublicKey,
      };

      // Create Staking instance
      const stakingInstance = new Staking(
        networks.testnet, // Bitcoin Signet uses testnet network params
        stakerInfo,
        stakingParams,
        [inputs.finalityProvider.consensus_pubkey], // FP public key array
        inputs.duration // staking timelock in blocks
      );

      // Build staking scripts (timelock, unbonding, slashing, unbonding timelock)
      const scripts = stakingInstance.buildScripts();

      // ===================================
      // Step 2C: Fetch user's Bitcoin UTXOs
      // ===================================

      const inputUTXOs = await this.fetchUserUTXOs(inputs.userBtcAddress);

      // ===================================
      // Step 2D: Get fee rate for Bitcoin transaction
      // ===================================

      const feeRate = await this.estimateFeeRate();

      // ===================================
      // Step 2E: Create unsigned staking transaction
      // ===================================

      const { transaction: stakingTx, fee: stakingFee } = stakingInstance.createStakingTransaction(
        inputs.amount,
        inputUTXOs,
        feeRate
      );

      // ===================================
      // Step 2F: Create unbonding transaction
      // ===================================

      const { transaction: unbondingTx, fee: unbondingFee } = stakingInstance.createUnbondingTransaction(
        stakingTx
      );

      // ===================================
      // Step 2G: Create slashing PSBTs
      // ===================================

      const { psbt: stakingSlashingPsbt, fee: stakingSlashingFee } =
        stakingInstance.createStakingOutputSlashingPsbt(stakingTx);

      const { psbt: unbondingSlashingPsbt, fee: unbondingSlashingFee } =
        stakingInstance.createUnbondingOutputSlashingPsbt(unbondingTx);

      // ===================================
      // Step 2H: Convert transactions to PSBTs
      // ===================================

      const stakingPsbt = stakingInstance.toStakingPsbt(stakingTx, inputUTXOs);
      const unbondingPsbt = stakingInstance.toUnbondingPsbt(unbondingTx, stakingTx);

      // ===================================
      // Step 3: Package PSBTs into StakeOffer
      // ===================================

      const estimatedBlstAmount = inputs.amount; // 1:1 backing
      const protocolFee = Math.floor(inputs.amount * 0.02); // 2% protocol fee (TODO: Calculate from APY)
      const totalNetworkFee = stakingFee + unbondingFee + stakingSlashingFee + unbondingSlashingFee;

      const stakeOffer: StakeOffer = {
        psbts: {
          stakingPsbtHex: stakingPsbt.toHex(),
          slashingPsbtHex: stakingSlashingPsbt.toHex(),
          unbondingPsbtHex: unbondingPsbt.toHex(),
          unbondingSlashingPsbtHex: unbondingSlashingPsbt.toHex(),
        },
        estimatedBlstAmount: estimatedBlstAmount,
        estimatedApy: inputs.finalityProvider.apy,
        babylonTxFee: protocolFee,
        networkFee: totalNetworkFee,
      };

      return stakeOffer;

    } catch (error) {
      console.error("Error constructing staking PSBTs:", error);
      throw new Error(`Failed to construct staking transactions: ${error.message}`);
    }
  }

  /**
   * Validate staking inputs before constructing PSBTs
   */
  validateStakingInputs(inputs: StakingInputs): { isValid: boolean; error?: string } {
    // Minimum stake: 0.0005 BTC (50,000 sats) per Babylon testnet
    if (inputs.amount < 50000) {
      return { isValid: false, error: "Minimum stake is 0.0005 BTC (50,000 sats)" };
    }

    // Maximum stake: 350 BTC (35,000,000 sats) per Babylon testnet
    if (inputs.amount > 35000000) {
      return { isValid: false, error: "Maximum stake is 350 BTC" };
    }

    // Minimum duration: 30 days (~4,320 blocks)
    if (inputs.duration < 4320) {
      return { isValid: false, error: "Minimum staking duration is 30 days (~4,320 blocks)" };
    }

    // Validate Taproot address (must start with tb1p for testnet)
    if (!inputs.userBtcAddress.startsWith('tb1p')) {
      return { isValid: false, error: "Address must be a Taproot address (tb1p...) on Bitcoin Signet" };
    }

    // Validate public key is 33 bytes hex (66 characters)
    if (inputs.userBtcPublicKey.length !== 66) {
      return { isValid: false, error: "Public key must be 33 bytes (66 hex characters)" };
    }

    return { isValid: true };
  }

  /**
   * Fetch Babylon staking parameters (covenant keys, quorum, limits, etc.)
   * This fetches the real-time parameters from Babylon testnet API
   */
  private async fetchBabylonStakingParams(): Promise<any> {
    try {
      // Fetch Babylon params from testnet API
      const response = await fetch('https://babylon-testnet-api.polkachu.com/babylon/btcstaking/v1/params');

      if (!response.ok) {
        throw new Error(`Failed to fetch Babylon params: ${response.statusText}`);
      }

      const data = await response.json();
      const params = data.params;

      // Convert to btc-staking-ts SDK format
      return {
        covenantNoCoordPks: params.covenant_pks, // Array of hex public keys
        covenantQuorum: params.covenant_quorum,
        unbondingTime: params.min_unbonding_time_blocks,
        unbondingFeeSat: 1000, // Fixed unbonding fee (TODO: Make configurable)
        maxStakingAmountSat: parseInt(params.max_staking_amount_sat),
        minStakingAmountSat: parseInt(params.min_staking_amount_sat),
        maxStakingTimeBlocks: params.max_staking_time_blocks,
        minStakingTimeBlocks: params.min_staking_time_blocks,
        slashing: params.slashing_pk_script ? {
          slashingPkScriptHex: params.slashing_pk_script,
          slashingRate: parseFloat(params.slashing_rate),
          minSlashingTxFeeSat: 1000, // Fixed slashing fee (TODO: Make configurable)
        } : undefined,
      };
    } catch (error) {
      console.error('Error fetching Babylon staking params:', error);
      throw new Error(`Failed to fetch Babylon staking parameters: ${error.message}`);
    }
  }

  /**
   * Fetch user's Bitcoin UTXOs from their wallet
   * This queries the connected Bitcoin wallet (Unisat/Xverse) for available UTXOs
   */
  private async fetchUserUTXOs(userBtcAddress: string): Promise<any[]> {
    try {
      // Check if Unisat wallet is available
      if (typeof window !== 'undefined' && (window as any).unisat) {
        const unisat = (window as any).unisat;

        // Get UTXOs from Unisat wallet
        const utxos = await unisat.getBitcoinUtxos();

        // Convert Unisat UTXO format to btc-staking-ts format
        return utxos.map((utxo: any) => ({
          txid: utxo.txid,
          vout: utxo.vout,
          value: utxo.satoshis || utxo.value,
          scriptPubKey: utxo.scriptPubKey,
          rawTxHex: utxo.rawTxHex,
        }));
      }

      // Check if Xverse wallet is available
      if (typeof window !== 'undefined' && (window as any).XverseProviders) {
        // TODO: Implement Xverse UTXO fetching
        throw new Error('Xverse wallet UTXO fetching not yet implemented');
      }

      throw new Error('No Bitcoin wallet detected. Please install Unisat or Xverse wallet.');
    } catch (error) {
      console.error('Error fetching user UTXOs:', error);
      throw new Error(`Failed to fetch Bitcoin UTXOs: ${error.message}`);
    }
  }

  /**
   * Estimate fee rate for Bitcoin transaction
   * Uses mempool.space API for Bitcoin Signet testnet
   */
  private async estimateFeeRate(): Promise<number> {
    try {
      // Fetch recommended fee rates from mempool.space Signet API
      const response = await fetch('https://mempool.space/signet/api/v1/fees/recommended');

      if (!response.ok) {
        // Fallback to fixed rate if API fails
        console.warn('Failed to fetch fee rates from mempool.space, using fallback rate');
        return 5; // 5 sat/vB fallback rate for testnet
      }

      const feeRates = await response.json();

      // Use "halfHourFee" for reasonable confirmation time
      // Available: fastestFee, halfHourFee, hourFee, economyFee, minimumFee
      return feeRates.halfHourFee || 5;
    } catch (error) {
      console.error('Error estimating fee rate:', error);
      // Return fallback rate
      return 5; // 5 sat/vB fallback rate for testnet
    }
  }
}

// Export singleton instance
export const bitcoinStakingService = new BitcoinStakingService();
