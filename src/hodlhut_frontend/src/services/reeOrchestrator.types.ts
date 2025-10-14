/**
 * REE Orchestrator TypeScript Types
 * Generated from Candid interface: hvyp5-5yaaa-aaaao-qjxha-cai
 */

export interface CoinBalance {
  id: string;
  value: bigint;
}

export interface InputCoin {
  coin: CoinBalance;
  from: string;
}

export interface OutputCoin {
  to: string;
  coin: CoinBalance;
}

export interface Utxo {
  coins: CoinBalance[];
  sats: bigint;
  txid: string;
  vout: number;
}

export interface Intention {
  input_coins: InputCoin[];
  output_coins: OutputCoin[];
  action: string;
  exchange_id: string;
  pool_utxo_spent: string[];
  action_params: string;
  nonce: bigint;
  pool_address: string;
  pool_utxo_received: Utxo[];
}

export interface IntentionSet {
  tx_fee_in_sats: bigint;
  initiator_address: string;
  intentions: Intention[];
}

export interface InvokeArgs {
  client_info: [] | [string]; // opt text
  intention_set: IntentionSet;
  initiator_utxo_proof: Uint8Array;
  psbt_hex: string;
}

export type Result_3 =
  | { Ok: string }
  | { Err: string };

export interface ReeOrchestratorService {
  invoke: (args: InvokeArgs) => Promise<Result_3>;
}
