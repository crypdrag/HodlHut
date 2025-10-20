export const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text });
  const CoinBalance = IDL.Record({ 'id' : IDL.Text, 'value' : IDL.Nat });
  const InputCoin = IDL.Record({ 'coin' : CoinBalance, 'from' : IDL.Text });
  const OutputCoin = IDL.Record({ 'to' : IDL.Text, 'coin' : CoinBalance });
  const Utxo = IDL.Record({
    'coins' : IDL.Vec(CoinBalance),
    'sats' : IDL.Nat64,
    'txid' : IDL.Text,
    'vout' : IDL.Nat32,
  });
  const Intention = IDL.Record({
    'input_coins' : IDL.Vec(InputCoin),
    'output_coins' : IDL.Vec(OutputCoin),
    'action' : IDL.Text,
    'exchange_id' : IDL.Text,
    'pool_utxo_spent' : IDL.Vec(IDL.Text),
    'action_params' : IDL.Text,
    'nonce' : IDL.Nat64,
    'pool_address' : IDL.Text,
    'pool_utxo_received' : IDL.Vec(Utxo),
  });
  const IntentionSet = IDL.Record({
    'tx_fee_in_sats' : IDL.Nat64,
    'initiator_address' : IDL.Text,
    'intentions' : IDL.Vec(Intention),
  });
  const ExecuteTxArgs = IDL.Record({
    'zero_confirmed_tx_queue_length' : IDL.Nat32,
    'txid' : IDL.Text,
    'intention_set' : IntentionSet,
    'intention_index' : IDL.Nat32,
    'psbt_hex' : IDL.Text,
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
  const GetPoolInfoArgs = IDL.Record({ 'pool_address' : IDL.Text });
  const PoolInfo = IDL.Record({
    'key' : IDL.Text,
    'name' : IDL.Text,
    'btc_reserved' : IDL.Nat64,
    'key_derivation_path' : IDL.Vec(IDL.Vec(IDL.Nat8)),
    'coin_reserved' : IDL.Vec(CoinBalance),
    'attributes' : IDL.Text,
    'address' : IDL.Text,
    'nonce' : IDL.Nat64,
    'utxos' : IDL.Vec(Utxo),
  });
  const PoolBasic = IDL.Record({ 'name' : IDL.Text, 'address' : IDL.Text });
  const PoolStats = IDL.Record({
    'tvl_sats' : IDL.Nat64,
    'timelock_blocks' : IDL.Nat32,
    'total_blst_minted' : IDL.Nat64,
    'finality_provider' : IDL.Text,
    'pool_address' : IDL.Text,
    'estimated_apy' : IDL.Float64,
  });
  const Result_2 = IDL.Variant({ 'Ok' : PoolStats, 'Err' : IDL.Text });
  const NewBlockInfo = IDL.Record({
    'block_hash' : IDL.Text,
    'confirmed_txids' : IDL.Vec(IDL.Text),
    'block_timestamp' : IDL.Nat64,
    'block_height' : IDL.Nat32,
  });
  const Result_5 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
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
  const RollbackTxArgs = IDL.Record({ 'txid' : IDL.Text });
  return IDL.Service({
    'check_delegation_status' : IDL.Func([IDL.Text], [Result], []),
    'etch_blst_rune' : IDL.Func([], [Result], []),
    'execute_tx' : IDL.Func([ExecuteTxArgs], [Result], []),
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
    'get_pool_info' : IDL.Func(
        [GetPoolInfoArgs],
        [IDL.Opt(PoolInfo)],
        ['query'],
      ),
    'get_pool_list' : IDL.Func([], [IDL.Vec(PoolBasic)], ['query']),
    'get_pool_stats' : IDL.Func([], [Result_2], ['query']),
    'init_pool' : IDL.Func([], [Result], []),
    'new_block' : IDL.Func([NewBlockInfo], [Result_5], []),
    'pre_deposit' : IDL.Func([IDL.Text, IDL.Nat64], [Result_1], []),
    'rollback_tx' : IDL.Func([RollbackTxArgs], [Result_5], []),
    'stake_pool_to_babylon' : IDL.Func([IDL.Nat64], [Result], []),
    'submit_babylon_delegation' : IDL.Func([IDL.Text], [Result], []),
    'update_pool_pubkeys' : IDL.Func([], [Result], []),
    'update_pool_rune_id' : IDL.Func([IDL.Text], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
