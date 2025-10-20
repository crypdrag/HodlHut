import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface BabylonParams {
  'min_commission_rate' : string,
  'unbonding_time_seconds' : bigint,
  'last_updated' : bigint,
  'bond_denom' : string,
  'max_validators' : number,
}
export interface BabylonStakingRecord {
  'accrued_baby_rewards' : bigint,
  'last_reward_claim' : [] | [bigint],
  'covenant_quorum' : number,
  'confirmed_height' : [] | [bigint],
  'timelock_blocks' : number,
  'created_at' : bigint,
  'staking_tx_hash' : string,
  'delegation_ticket_id' : [] | [string],
  'covenant_pks' : Array<string>,
  'amount_sats' : bigint,
  'delegation_timestamp' : [] | [bigint],
  'finality_provider' : string,
  'babylon_delegated' : boolean,
}
export interface BabylonStakingStats {
  'total_baby_rewards' : bigint,
  'total_staked_to_babylon' : bigint,
  'pending_babylon_txs' : number,
  'active_delegations' : number,
}
export interface CoinBalance { 'id' : string, 'value' : bigint }
export interface DepositOffer {
  'expected_blst' : bigint,
  'pool_utxo_blst_amount' : bigint,
  'nonce' : bigint,
  'pool_utxo_amount_sats' : bigint,
  'protocol_fee' : bigint,
  'pool_utxo_txid' : string,
  'pool_address' : string,
  'pool_utxo_vout' : number,
  'estimated_apy' : number,
}
export interface ExecuteTxArgs {
  'zero_confirmed_tx_queue_length' : number,
  'txid' : string,
  'intention_set' : IntentionSet,
  'intention_index' : number,
  'psbt_hex' : string,
}
export interface ExecutionResult {
  'confirmations' : number,
  'status' : string,
  'to_address' : string,
  'amount_sats' : bigint,
  'from_address' : string,
  'nonce' : bigint,
  'tx_hash' : string,
}
export interface FPDescription {
  'website' : string,
  'details' : string,
  'moniker' : string,
  'identity' : string,
}
export interface FinalityProvider {
  'description' : FPDescription,
  'commission' : string,
  'btc_pk_hex' : string,
  'estimated_apy' : number,
  'voting_power' : string,
}
export interface GetMinimalTxValueArgs {
  'zero_confirmed_tx_queue_length' : number,
  'pool_address' : string,
}
export interface GetPoolInfoArgs { 'pool_address' : string }
export interface InputCoin { 'coin' : CoinBalance, 'from' : string }
export interface Intention {
  'input_coins' : Array<InputCoin>,
  'output_coins' : Array<OutputCoin>,
  'action' : string,
  'exchange_id' : string,
  'pool_utxo_spent' : Array<string>,
  'action_params' : string,
  'nonce' : bigint,
  'pool_address' : string,
  'pool_utxo_received' : Array<Utxo>,
}
export interface IntentionSet {
  'tx_fee_in_sats' : bigint,
  'initiator_address' : string,
  'intentions' : Array<Intention>,
}
export interface NewBlockInfo {
  'block_hash' : string,
  'confirmed_txids' : Array<string>,
  'block_timestamp' : bigint,
  'block_height' : number,
}
export interface OutputCoin { 'to' : string, 'coin' : CoinBalance }
export interface PoolBasic { 'name' : string, 'address' : string }
export interface PoolConfig {
  'total_deposited_sats' : bigint,
  'timelock_blocks' : number,
  'pubkey' : [] | [Uint8Array | number[]],
  'created_at' : bigint,
  'address' : string,
  'blst_rune_id' : [] | [string],
  'total_blst_minted' : bigint,
  'finality_provider' : string,
  'tweaked' : [] | [Uint8Array | number[]],
}
export interface PoolInfo {
  'key' : string,
  'name' : string,
  'btc_reserved' : bigint,
  'key_derivation_path' : Array<Uint8Array | number[]>,
  'coin_reserved' : Array<CoinBalance>,
  'attributes' : string,
  'address' : string,
  'nonce' : bigint,
  'utxos' : Array<Utxo>,
}
export interface PoolStats {
  'tvl_sats' : bigint,
  'timelock_blocks' : number,
  'total_blst_minted' : bigint,
  'finality_provider' : string,
  'pool_address' : string,
  'estimated_apy' : number,
}
export type Result = { 'Ok' : string } |
  { 'Err' : string };
export type Result_1 = { 'Ok' : DepositOffer } |
  { 'Err' : string };
export type Result_2 = { 'Ok' : PoolStats } |
  { 'Err' : string };
export type Result_3 = { 'Ok' : BabylonParams } |
  { 'Err' : string };
export type Result_4 = { 'Ok' : Array<FinalityProvider> } |
  { 'Err' : string };
export type Result_5 = { 'Ok' : null } |
  { 'Err' : string };
export interface RollbackTxArgs { 'txid' : string }
export interface Utxo {
  'coins' : Array<CoinBalance>,
  'sats' : bigint,
  'txid' : string,
  'vout' : number,
}
export interface _SERVICE {
  'check_delegation_status' : ActorMethod<[string], Result>,
  'etch_blst_rune' : ActorMethod<[], Result>,
  'execute_tx' : ActorMethod<[ExecuteTxArgs], Result>,
  'get_babylon_params' : ActorMethod<[], Result_3>,
  'get_babylon_staking_record' : ActorMethod<
    [string],
    [] | [BabylonStakingRecord]
  >,
  'get_babylon_staking_stats' : ActorMethod<[], BabylonStakingStats>,
  'get_blst_balance' : ActorMethod<[string], bigint>,
  'get_finality_providers' : ActorMethod<[], Result_4>,
  'get_pool_config' : ActorMethod<[], [] | [PoolConfig]>,
  'get_pool_info' : ActorMethod<[GetPoolInfoArgs], [] | [PoolInfo]>,
  'get_pool_list' : ActorMethod<[], Array<PoolBasic>>,
  'get_pool_stats' : ActorMethod<[], Result_2>,
  'init_pool' : ActorMethod<[], Result>,
  'new_block' : ActorMethod<[NewBlockInfo], Result_5>,
  'pre_deposit' : ActorMethod<[string, bigint], Result_1>,
  'rollback_tx' : ActorMethod<[RollbackTxArgs], Result_5>,
  'stake_pool_to_babylon' : ActorMethod<[bigint], Result>,
  'submit_babylon_delegation' : ActorMethod<[string], Result>,
  'update_pool_pubkeys' : ActorMethod<[], Result>,
  'update_pool_rune_id' : ActorMethod<[string], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
