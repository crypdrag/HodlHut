/**
 * REE Orchestrator IDL Factory
 * Candid interface for REE Orchestrator canister
 */

export const idlFactory = ({ IDL }: any) => {
  const CoinBalance = IDL.Record({ 'id': IDL.Text, 'value': IDL.Nat });
  const InputCoin = IDL.Record({ 'coin': CoinBalance, 'from': IDL.Text });
  const OutputCoin = IDL.Record({ 'to': IDL.Text, 'coin': CoinBalance });
  const Utxo = IDL.Record({
    'coins': IDL.Vec(CoinBalance),
    'sats': IDL.Nat64,
    'txid': IDL.Text,
    'vout': IDL.Nat32,
  });
  const Intention = IDL.Record({
    'input_coins': IDL.Vec(InputCoin),
    'output_coins': IDL.Vec(OutputCoin),
    'action': IDL.Text,
    'exchange_id': IDL.Text,
    'pool_utxo_spent': IDL.Vec(IDL.Text),
    'action_params': IDL.Text,
    'nonce': IDL.Nat64,
    'pool_address': IDL.Text,
    'pool_utxo_received': IDL.Vec(Utxo),
  });
  const IntentionSet = IDL.Record({
    'tx_fee_in_sats': IDL.Nat64,
    'initiator_address': IDL.Text,
    'intentions': IDL.Vec(Intention),
  });
  const InvokeArgs = IDL.Record({
    'client_info': IDL.Opt(IDL.Text),
    'intention_set': IntentionSet,
    'initiator_utxo_proof': IDL.Vec(IDL.Nat8),
    'psbt_hex': IDL.Text,
  });
  const Result_3 = IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text });

  return IDL.Service({
    'invoke': IDL.Func([InvokeArgs], [Result_3], []),
  });
};
