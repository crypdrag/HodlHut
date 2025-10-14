export const idlFactory = ({ IDL }) => {
  const ExecutionResult = IDL.Record({
    'status' : IDL.Text,
    'tx_id' : IDL.Text,
    'bitcoin_tx_id' : IDL.Opt(IDL.Text),
    'error' : IDL.Opt(IDL.Text),
  });
  const PoolInfo = IDL.Record({
    'pool_type' : IDL.Text,
    'total_staked' : IDL.Nat64,
    'active_stakes' : IDL.Nat32,
    'pool_address' : IDL.Text,
  });
  const StakeOffer = IDL.Record({
    'duration' : IDL.Nat32,
    'expected_blst' : IDL.Nat64,
    'nonce' : IDL.Nat64,
    'finality_provider' : IDL.Text,
    'protocol_fee' : IDL.Nat64,
    'amount' : IDL.Nat64,
    'pool_address' : IDL.Text,
    'estimated_apy' : IDL.Float64,
  });
  return IDL.Service({
    'execute_tx' : IDL.Func([IDL.Text, ExecutionResult], [], []),
    'get_pool_info' : IDL.Func([IDL.Text], [IDL.Opt(PoolInfo)], ['query']),
    'get_pool_list' : IDL.Func([], [IDL.Vec(PoolInfo)], ['query']),
    'new_block' : IDL.Func([IDL.Nat64, IDL.Text], [], []),
    'pre_stake' : IDL.Func(
        [IDL.Text, IDL.Nat64, IDL.Nat32, IDL.Text],
        [StakeOffer],
        [],
      ),
    'rollback_tx' : IDL.Func([IDL.Text], [], []),
  });
};
export const init = ({ IDL }) => { return []; };
