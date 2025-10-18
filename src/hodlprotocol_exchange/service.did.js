export const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text });
  const ExecutionResult = IDL.Record({
    'confirmations' : IDL.Nat32,
    'status' : IDL.Text,
    'to_address' : IDL.Text,
    'amount_sats' : IDL.Nat64,
    'from_address' : IDL.Text,
    'nonce' : IDL.Nat64,
    'tx_hash' : IDL.Text,
  });
  const BabylonParams = IDL.Record({
    'min_commission_rate' : IDL.Text,
    'unbonding_time_seconds' : IDL.Nat64,
    'last_updated' : IDL.Nat64,
    'bond_denom' : IDL.Text,
    'max_validators' : IDL.Nat32,
  });
  const Result_3 = IDL.Variant({ 'Ok' : BabylonParams, 'Err' : IDL.Text });
  const BabylonStakingRecord = IDL.Record({
    'accrued_baby_rewards' : IDL.Nat64,
    'last_reward_claim' : IDL.Opt(IDL.Nat64),
    'covenant_quorum' : IDL.Nat32,
    'confirmed_height' : IDL.Opt(IDL.Nat64),
    'timelock_blocks' : IDL.Nat32,
    'created_at' : IDL.Nat64,
    'staking_tx_hash' : IDL.Text,
    'delegation_ticket_id' : IDL.Opt(IDL.Text),
    'covenant_pks' : IDL.Vec(IDL.Text),
    'amount_sats' : IDL.Nat64,
    'delegation_timestamp' : IDL.Opt(IDL.Nat64),
    'finality_provider' : IDL.Text,
    'babylon_delegated' : IDL.Bool,
  });
  const BabylonStakingStats = IDL.Record({
    'total_baby_rewards' : IDL.Nat64,
    'total_staked_to_babylon' : IDL.Nat64,
    'pending_babylon_txs' : IDL.Nat32,
    'active_delegations' : IDL.Nat32,
  });
  const FPDescription = IDL.Record({
    'website' : IDL.Text,
    'details' : IDL.Text,
    'moniker' : IDL.Text,
    'identity' : IDL.Text,
  });
  const FinalityProvider = IDL.Record({
    'description' : FPDescription,
    'commission' : IDL.Text,
    'btc_pk_hex' : IDL.Text,
    'estimated_apy' : IDL.Float64,
    'voting_power' : IDL.Text,
  });
  const Result_4 = IDL.Variant({
    'Ok' : IDL.Vec(FinalityProvider),
    'Err' : IDL.Text,
  });
  const PoolConfig = IDL.Record({
    'total_deposited_sats' : IDL.Nat64,
    'timelock_blocks' : IDL.Nat32,
    'pubkey' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at' : IDL.Nat64,
    'address' : IDL.Text,
    'blst_rune_id' : IDL.Opt(IDL.Text),
    'total_blst_minted' : IDL.Nat64,
    'finality_provider' : IDL.Text,
    'tweaked' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const PoolInfoQuery = IDL.Record({ 'pool_address' : IDL.Text });
  const PoolInfo = IDL.Record({
    'key' : IDL.Vec(IDL.Nat8),
    'name' : IDL.Text,
    'btc_reserved' : IDL.Nat64,
    'key_derivation_path' : IDL.Vec(IDL.Vec(IDL.Nat8)),
    'coin_reserved' : IDL.Vec(IDL.Nat8),
    'attributes' : IDL.Text,
    'address' : IDL.Text,
    'nonce' : IDL.Nat64,
    'utxos' : IDL.Vec(IDL.Nat8),
  });
  const PoolListItem = IDL.Record({ 'name' : IDL.Text, 'address' : IDL.Text });
  const PoolStats = IDL.Record({
    'tvl_sats' : IDL.Nat64,
    'timelock_blocks' : IDL.Nat32,
    'total_blst_minted' : IDL.Nat64,
    'finality_provider' : IDL.Text,
    'pool_address' : IDL.Text,
    'estimated_apy' : IDL.Float64,
  });
  const Result_2 = IDL.Variant({ 'Ok' : PoolStats, 'Err' : IDL.Text });
  const DepositOffer = IDL.Record({
    'expected_blst' : IDL.Nat64,
    'pool_utxo_blst_amount' : IDL.Nat64,
    'nonce' : IDL.Nat64,
    'pool_utxo_amount_sats' : IDL.Nat64,
    'protocol_fee' : IDL.Nat64,
    'pool_utxo_txid' : IDL.Text,
    'pool_address' : IDL.Text,
    'pool_utxo_vout' : IDL.Nat32,
    'estimated_apy' : IDL.Float64,
  });
  const Result_1 = IDL.Variant({ 'Ok' : DepositOffer, 'Err' : IDL.Text });
  return IDL.Service({
    'check_delegation_status' : IDL.Func([IDL.Text], [Result], []),
    'etch_blst_rune' : IDL.Func([], [Result], []),
    'execute_tx' : IDL.Func([IDL.Text, ExecutionResult], [], []),
    'get_babylon_params' : IDL.Func([], [Result_3], []),
    'get_babylon_staking_record' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(BabylonStakingRecord)],
        ['query'],
      ),
    'get_babylon_staking_stats' : IDL.Func(
        [],
        [BabylonStakingStats],
        ['query'],
      ),
    'get_blst_balance' : IDL.Func([IDL.Text], [IDL.Nat64], ['query']),
    'get_finality_providers' : IDL.Func([], [Result_4], []),
    'get_pool_config' : IDL.Func([], [IDL.Opt(PoolConfig)], ['query']),
    'get_pool_info' : IDL.Func([PoolInfoQuery], [IDL.Opt(PoolInfo)], ['query']),
    'get_pool_list' : IDL.Func([], [IDL.Vec(PoolListItem)], ['query']),
    'get_pool_stats' : IDL.Func([], [Result_2], ['query']),
    'init_pool' : IDL.Func([], [Result], []),
    'new_block' : IDL.Func([IDL.Nat64, IDL.Text], [], []),
    'pre_deposit' : IDL.Func([IDL.Text, IDL.Nat64], [Result_1], []),
    'rollback_tx' : IDL.Func([IDL.Text], [], []),
    'stake_pool_to_babylon' : IDL.Func([IDL.Nat64], [Result], []),
    'submit_babylon_delegation' : IDL.Func([IDL.Text], [Result], []),
    'update_pool_pubkeys' : IDL.Func([], [Result], []),
    'update_pool_rune_id' : IDL.Func([IDL.Text], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
