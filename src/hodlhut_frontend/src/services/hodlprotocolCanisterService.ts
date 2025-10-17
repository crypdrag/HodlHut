 // ===============================================
  // hodlprotocol Exchange Canister Service
  // ===============================================
  // Provides typed interface to hodlprotocol_exchange canister APIs

  import { Actor, HttpAgent } from '@dfinity/agent';
  import { Principal } from '@dfinity/principal';

  // ===============================================
  // Canister Configuration
  // ===============================================

  const HODLPROTOCOL_EXCHANGE_CANISTER_ID = 'plkfy-gyaaa-aaaad-achpq-cai';
  const IC_HOST = process.env.DFX_NETWORK === 'local'
    ? 'http://localhost:4943'
    : 'https://icp0.io';

  // ===============================================
  // Type Definitions (matching Candid interface)
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

  // Result types
  type ResultOk<T> = { ok: T };
  type ResultErr<E> = { err: E };
  type Result<T, E> = ResultOk<T> | ResultErr<E>;

  // ===============================================
  // Candid IDL Factory
  // ===============================================

  const idlFactory = ({ IDL }: any) => {
    const BabylonParams = IDL.Record({
      unbonding_time: IDL.Nat64,
      max_validators: IDL.Nat32,
      min_commission_rate: IDL.Text,
      bond_denom: IDL.Text,
    });

    const FinalityProvider = IDL.Record({
      moniker: IDL.Text,
      operator_address: IDL.Text,
      consensus_pubkey: IDL.Text,
      commission_rate: IDL.Text,
      voting_power: IDL.Text,
      apy: IDL.Float64,
    });

    const DepositOffer = IDL.Record({
      pool_address: IDL.Text,
      nonce: IDL.Nat64,
      expected_blst: IDL.Nat64,
      protocol_fee: IDL.Nat64,
      estimated_apy: IDL.Float64,
      // Atomic swap fields
      pool_utxo_txid: IDL.Text,
      pool_utxo_vout: IDL.Nat32,
      pool_utxo_amount_sats: IDL.Nat64,
      pool_utxo_blst_amount: IDL.Nat64,
    });

    const PoolStats = IDL.Record({
      pool_address: IDL.Text,
      tvl_sats: IDL.Nat64,
      total_blst_minted: IDL.Nat64,
      finality_provider: IDL.Text,
      timelock_blocks: IDL.Nat32,
      estimated_apy: IDL.Float64,
    });

    const PoolConfig = IDL.Record({
      address: IDL.Text,
      finality_provider: IDL.Text,
      timelock_blocks: IDL.Nat32,
      blst_rune_id: IDL.Opt(IDL.Text),
      total_deposited_sats: IDL.Nat64,
      total_blst_minted: IDL.Nat64,
      created_at: IDL.Nat64,
    });

    const BabylonStakingStats = IDL.Record({
      total_staked_to_babylon: IDL.Nat64,
      active_delegations: IDL.Nat32,
      total_baby_rewards: IDL.Nat64,
      pending_babylon_txs: IDL.Nat32,
    });

    return IDL.Service({
      get_babylon_params: IDL.Func(
        [],
        [IDL.Variant({ ok: BabylonParams, err: IDL.Text })],
        []
      ),
      get_finality_providers: IDL.Func(
        [],
        [IDL.Variant({ ok: IDL.Vec(FinalityProvider), err: IDL.Text })],
        []
      ),
      get_pool_stats: IDL.Func(
        [],
        [IDL.Variant({ ok: PoolStats, err: IDL.Text })],
        ['query']
      ),
      get_pool_config: IDL.Func(
        [],
        [IDL.Opt(PoolConfig)],
        ['query']
      ),
      get_blst_balance: IDL.Func(
        [IDL.Text],
        [IDL.Nat64],
        ['query']
      ),
      pre_deposit: IDL.Func(
        [IDL.Text, IDL.Nat64],
        [IDL.Variant({ ok: DepositOffer, err: IDL.Text })],
        []
      ),
      get_babylon_staking_stats: IDL.Func(
        [],
        [BabylonStakingStats],
        ['query']
      ),
      stake_pool_to_babylon: IDL.Func(
        [],
        [IDL.Variant({ ok: IDL.Text, err: IDL.Text })],
        []
      ),
    });
  };

  // ===============================================
  // Canister Service Class
  // ===============================================

  class HodlprotocolCanisterService {
    private agent: HttpAgent | null = null;
    private actor: any = null;

    /**
     * Initialize the agent and actor
     */
    private async getActor() {
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

      // Create actor
      this.actor = Actor.createActor(idlFactory, {
        agent: this.agent,
        canisterId: HODLPROTOCOL_EXCHANGE_CANISTER_ID,
      });

      return this.actor;
    }

    /**
     * Get Babylon staking parameters
     */
    async getBabylonParams(): Promise<BabylonParams> {
      try {
        const actor = await this.getActor();
        const result: Result<BabylonParams, string> = await actor.get_babylon_params();

        if ('ok' in result) {
          // Convert BigInt fields to numbers for JavaScript compatibility
          return {
            unbonding_time: Number(result.ok.unbonding_time),
            max_validators: Number(result.ok.max_validators),
            min_commission_rate: result.ok.min_commission_rate,
            bond_denom: result.ok.bond_denom,
          };
        } else {
          throw new Error(`Failed to fetch Babylon params: ${result.err}`);
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
        const result: Result<FinalityProvider[], string> = await actor.get_finality_providers();

        if ('ok' in result) {
          // Return providers (already in correct format)
          return result.ok;
        } else {
          throw new Error(`Failed to fetch finality providers: ${result.err}`);
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
        const result: Result<DepositOffer, string> = await actor.pre_deposit(
          userBtcAddress,
          BigInt(amountSats)
        );

        if ('ok' in result) {
          return result.ok;
        } else {
          throw new Error(`Pre-deposit validation failed: ${result.err}`);
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
        const result: Result<PoolStats, string> = await actor.get_pool_stats();

        if ('ok' in result) {
          return result.ok;
        } else {
          throw new Error(`Failed to fetch pool stats: ${result.err}`);
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
        const result: [PoolConfig] | [] = await actor.get_pool_config();
        return result.length > 0 ? result[0] : null;
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
        const stats: BabylonStakingStats = await actor.get_babylon_staking_stats();
        return stats;
      } catch (error: any) {
        console.error('Error fetching Babylon staking stats:', error);
        throw new Error(`Canister call failed: ${error.message}`);
      }
    }

    /**
     * Stake pool funds to Babylon
     * Triggers the pool to stake aggregated BTC to Babylon protocol
     */
    async stakePoolToBabylon(): Promise<string> {
      try {
        const actor = await this.getActor();
        const result: Result<string, string> = await actor.stake_pool_to_babylon();

        if ('ok' in result) {
          return result.ok;
        } else {
          throw new Error(`Failed to stake to Babylon: ${result.err}`);
        }
      } catch (error: any) {
        console.error('Error staking pool to Babylon:', error);
        throw new Error(`Canister call failed: ${error.message}`);
      }
    }
  }

  // Export singleton instance
  export const hodlprotocolCanisterService = new HodlprotocolCanisterService();
 