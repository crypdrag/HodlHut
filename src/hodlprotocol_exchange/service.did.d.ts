import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface ExecutionResult {
  'status' : string,
  'tx_id' : string,
  'bitcoin_tx_id' : [] | [string],
  'error' : [] | [string],
}
export interface PoolInfo {
  'pool_type' : string,
  'total_staked' : bigint,
  'active_stakes' : number,
  'pool_address' : string,
}
export interface StakeOffer {
  'duration' : number,
  'expected_blst' : bigint,
  'nonce' : bigint,
  'finality_provider' : string,
  'protocol_fee' : bigint,
  'amount' : bigint,
  'pool_address' : string,
  'estimated_apy' : number,
}
export interface _SERVICE {
  'execute_tx' : ActorMethod<[string, ExecutionResult], undefined>,
  'get_pool_info' : ActorMethod<[string], [] | [PoolInfo]>,
  'get_pool_list' : ActorMethod<[], Array<PoolInfo>>,
  'new_block' : ActorMethod<[bigint, string], undefined>,
  'pre_stake' : ActorMethod<[string, bigint, number, string], StakeOffer>,
  'rollback_tx' : ActorMethod<[string], undefined>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
