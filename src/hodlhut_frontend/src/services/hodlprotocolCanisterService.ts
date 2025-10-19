// ===============================================
// hodlprotocol Exchange Canister Service
// ===============================================
// Provides typed interface to hodlprotocol_exchange canister APIs

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// Import generated Candid IDL factory
import { idlFactory } from '../../../declarations/hodlprotocol_exchange';

// Import generated Candid types
import type {
  _SERVICE,
  BabylonParams as GeneratedBabylonParams,
  FinalityProvider as GeneratedFinalityProvider,
  DepositOffer as GeneratedDepositOffer,
  PoolStats as GeneratedPoolStats,
  PoolConfig as GeneratedPoolConfig,
  BabylonStakingStats as GeneratedBabylonStakingStats,
  FPDescription as GeneratedFPDescription,
  Result,
  Result_1,
  Result_2,
  Result_3,
  Result_4
} from '../../../declarations/hodlprotocol_exchange/hodlprotocol_exchange.did';

// Re-export FPDescription
export type FPDescription = GeneratedFPDescription;

// ===============================================
// Canister Configuration
// ===============================================

const HODLPROTOCOL_EXCHANGE_CANISTER_ID = 'hz536-gyaaa-aaaao-qkufa-cai';
const IC_HOST = process.env.DFX_NETWORK === 'local'
  ? 'http://localhost:4943'
  : 'https://icp0.io';

// ===============================================
// Re-export Types for Easy Import
// ===============================================

export interface BabylonParams {
  unbonding_time_seconds: number;
  max_validators: number;
  min_commission_rate: string;
  bond_denom: string;
  last_updated: bigint;
}

export interface FinalityProvider {
  btc_pk_hex: string;
  description: FPDescription;
  commission: string;
  voting_power: string;
  estimated_apy: number;
}

export interface DepositOffer {
  pool_address: string;
  nonce: bigint;
  expected_blst: bigint;
  protocol_fee: bigint;
  estimated_apy: number;
  // Atomic swap fields (for PSBT construction)
  pool_utxo_txid: string;
  pool_utxo_vout: number;
  pool_utxo_amount_sats: bigint;
  pool_utxo_blst_amount: bigint;
}

export interface PoolStats {
  pool_address: string;
  tvl_sats: bigint;
  total_blst_minted: bigint;
  finality_provider: string;
  timelock_blocks: number;
  estimated_apy: number;
}

export interface PoolConfig {
  address: string;
  finality_provider: string;
  timelock_blocks: number;
  blst_rune_id: string | null;
  total_deposited_sats: bigint;
  total_blst_minted: bigint;
  created_at: bigint;
}

export interface BabylonStakingStats {
  total_staked_to_babylon: bigint;
  active_delegations: number;
  total_baby_rewards: bigint;
  pending_babylon_txs: number;
}

// ===============================================
// Canister Service Class
// ===============================================

class HodlprotocolCanisterService {
  private agent: HttpAgent | null = null;
  private actor: _SERVICE | null = null;

  /**
   * Initialize the agent and actor
   */
  private async getActor(): Promise<_SERVICE> {
    if (this.actor) {
      return this.actor;
    }

    // Create agent
    this.agent = new HttpAgent({ host: IC_HOST });

    // Fetch root key for local development
    if (process.env.DFX_NETWORK !== 'ic') {
      try {
        await this.agent.fetchRootKey();
      } catch (err) {
        console.warn('Unable to fetch root key. Check your local replica is running.');
      }
    }

    // Create actor using generated IDL factory
    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: HODLPROTOCOL_EXCHANGE_CANISTER_ID,
    }) as _SERVICE;

    return this.actor;
  }

  /**
   * Get Babylon staking parameters
   */
  async getBabylonParams(): Promise<BabylonParams> {
    try {
      const actor = await this.getActor();
      const result: Result_3 = await actor.get_babylon_params();

      if ('Ok' in result) {
        // Convert BigInt fields to numbers for JavaScript compatibility
        return {
          unbonding_time_seconds: Number(result.Ok.unbonding_time_seconds),
          max_validators: Number(result.Ok.max_validators),
          min_commission_rate: result.Ok.min_commission_rate,
          bond_denom: result.Ok.bond_denom,
          last_updated: result.Ok.last_updated,
        };
      } else {
        throw new Error(`Failed to fetch Babylon params: ${result.Err}`);
      }
    } catch (error: any) {
      console.error('Error fetching Babylon params:', error);
      throw new Error(`Canister call failed: ${error.message}`);
    }
  }

  /**
   * Get top finality providers from Babylon testnet
   */
  async getFinalityProviders(): Promise<FinalityProvider[]> {
    try {
      const actor = await this.getActor();
      const result: Result_4 = await actor.get_finality_providers();

      if ('Ok' in result) {
        // Return providers (already in correct format)
        return result.Ok as FinalityProvider[];
      } else {
        throw new Error(`Failed to fetch finality providers: ${result.Err}`);
      }
    } catch (error: any) {
      console.error('Error fetching finality providers:', error);
      throw new Error(`Canister call failed: ${error.message}`);
    }
  }

  /**
   * Pre-deposit: Validate deposit and get nonce for REE tracking
   * Returns pool address where user should send BTC
   */
  async preDeposit(
    userBtcAddress: string,
    amountSats: number
  ): Promise<DepositOffer> {
    try {
      const actor = await this.getActor();
      const result: Result_1 = await actor.pre_deposit(
        userBtcAddress,
        BigInt(amountSats)
      );

      if ('Ok' in result) {
        return result.Ok as DepositOffer;
      } else {
        throw new Error(`Pre-deposit validation failed: ${result.Err}`);
      }
    } catch (error: any) {
      console.error('Error in pre_deposit:', error);
      throw new Error(`Canister call failed: ${error.message}`);
    }
  }

  /**
   * Get pool statistics
   */
  async getPoolStats(): Promise<PoolStats> {
    try {
      const actor = await this.getActor();
      const result: Result_2 = await actor.get_pool_stats();

      if ('Ok' in result) {
        return result.Ok as PoolStats;
      } else {
        throw new Error(`Failed to fetch pool stats: ${result.Err}`);
      }
    } catch (error: any) {
      console.error('Error fetching pool stats:', error);
      throw new Error(`Canister call failed: ${error.message}`);
    }
  }

  /**
   * Get pool configuration
   */
  async getPoolConfig(): Promise<PoolConfig | null> {
    try {
      const actor = await this.getActor();
      const result = await actor.get_pool_config();

      if (result.length > 0) {
        const config = result[0] as GeneratedPoolConfig;
        // Convert opt string ([] | [string]) to string | null for easier TypeScript usage
        return {
          ...config,
          blst_rune_id: config.blst_rune_id.length > 0 ? config.blst_rune_id[0] : null
        } as PoolConfig;
      }

      return null;
    } catch (error: any) {
      console.error('Error fetching pool config:', error);
      throw new Error(`Canister call failed: ${error.message}`);
    }
  }

  /**
   * Get user's BLST balance
   */
  async getBlstBalance(userBtcAddress: string): Promise<bigint> {
    try {
      const actor = await this.getActor();
      const balance: bigint = await actor.get_blst_balance(userBtcAddress);
      return balance;
    } catch (error: any) {
      console.error('Error fetching BLST balance:', error);
      throw new Error(`Canister call failed: ${error.message}`);
    }
  }

  /**
   * Get Babylon staking statistics
   */
  async getBabylonStakingStats(): Promise<BabylonStakingStats> {
    try {
      const actor = await this.getActor();
      const stats = await actor.get_babylon_staking_stats();
      return stats as BabylonStakingStats;
    } catch (error: any) {
      console.error('Error fetching Babylon staking stats:', error);
      throw new Error(`Canister call failed: ${error.message}`);
    }
  }

  /**
   * Stake pool funds to Babylon
   * Triggers the pool to stake aggregated BTC to Babylon protocol
   * @param amountSats - Amount in satoshis to stake (0 = stake all available)
   */
  async stakePoolToBabylon(amountSats: bigint = BigInt(0)): Promise<string> {
    try {
      const actor = await this.getActor();
      const result: Result = await actor.stake_pool_to_babylon(amountSats);

      if ('Ok' in result) {
        return result.Ok;
      } else {
        throw new Error(`Failed to stake to Babylon: ${result.Err}`);
      }
    } catch (error: any) {
      console.error('Error staking pool to Babylon:', error);
      throw new Error(`Canister call failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export const hodlprotocolCanisterService = new HodlprotocolCanisterService();
