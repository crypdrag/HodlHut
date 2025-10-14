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

  export interface StakeOffer {
    estimated_blst_amount: bigint;
    estimated_apy: number;
    babylon_tx_fee: bigint;
    network_fee: bigint;
  }

  export interface PoolInfo {
    pool_address: string;
    total_liquidity: bigint;
    // Add other pool fields as needed
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

    const StakeOffer = IDL.Record({
      estimated_blst_amount: IDL.Nat64,
      estimated_apy: IDL.Float64,
      babylon_tx_fee: IDL.Nat64,
      network_fee: IDL.Nat64,
    });

    const PoolInfo = IDL.Record({
      pool_address: IDL.Text,
      total_liquidity: IDL.Nat64,
    });

    return IDL.Service({
      get_babylon_params: IDL.Func(
        [],
        [IDL.Variant({ ok: BabylonParams, err: IDL.Text })],
        ['query']
      ),
      get_finality_providers: IDL.Func(
        [],
        [IDL.Variant({ ok: IDL.Vec(FinalityProvider), err: IDL.Text })],
        ['query']
      ),
      get_pool_list: IDL.Func([], [IDL.Vec(PoolInfo)], ['query']),
      get_pool_info: IDL.Func([IDL.Text], [IDL.Opt(PoolInfo)], ['query']),
      pre_stake: IDL.Func(
        [IDL.Text, IDL.Nat64, IDL.Nat64, IDL.Text],
        [IDL.Variant({ ok: StakeOffer, err: IDL.Text })],
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
     * Get stake offer (called from server for validation)
     * Note: Frontend will construct PSBTs locally, but server validates inputs
     */
    async preStake(
      userBtcAddress: string,
      amount: number,
      duration: number,
      finalityProviderKey: string
    ): Promise<StakeOffer> {
      try {
        const actor = await this.getActor();
        const result: Result<StakeOffer, string> = await actor.pre_stake(
          userBtcAddress,
          BigInt(amount),
          BigInt(duration),
          finalityProviderKey
        );

        if ('ok' in result) {
          // Convert BigInt fields to numbers
          return {
            estimated_blst_amount: result.ok.estimated_blst_amount,
            estimated_apy: result.ok.estimated_apy,
            babylon_tx_fee: result.ok.babylon_tx_fee,
            network_fee: result.ok.network_fee,
          };
        } else {
          throw new Error(`Pre-stake validation failed: ${result.err}`);
        }
      } catch (error: any) {
        console.error('Error in pre_stake:', error);
        throw new Error(`Canister call failed: ${error.message}`);
      }
    }

    /**
     * Get list of staking pools
     */
    async getPoolList(): Promise<PoolInfo[]> {
      try {
        const actor = await this.getActor();
        const result: PoolInfo[] = await actor.get_pool_list();
        return result;
      } catch (error: any) {
        console.error('Error fetching pool list:', error);
        throw new Error(`Canister call failed: ${error.message}`);
      }
    }

    /**
     * Get info for specific pool
     */
    async getPoolInfo(poolAddress: string): Promise<PoolInfo | null> {
      try {
        const actor = await this.getActor();
        const result: [PoolInfo] | [] = await actor.get_pool_info(poolAddress);
        return result.length > 0 ? result[0] : null;
      } catch (error: any) {
        console.error('Error fetching pool info:', error);
        throw new Error(`Canister call failed: ${error.message}`);
      }
    }
  }

  // Export singleton instance
  export const hodlprotocolCanisterService = new HodlprotocolCanisterService();
 