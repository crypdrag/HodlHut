# Spec — Transaction Monitor Agent

## Summary
Correlates cross‑chain events (Bitcoin/EVM/Solana) and multi‑canister lifecycles (Bitcoin Canister → ckBTC Minter → Ledger → DEX → settlement) into a single **operation state machine** with durable checkpoints and rollback signaling.

## API (Candid — sketch)
```did
service : {
  start_watch : (record { operation_id: text; hints: opt record { btc_txid: opt text; evm_tx: opt text; svm_sig: opt text } }) -> (bool);
  get_operation : (record { operation_id: text }) -> (
    opt record { id: text; phase: variant { Pending; Confirmed; Completed; RolledBack; Failed : text };
                 btc: opt record { txid: text; confs: nat32 };
                 ckbtc_mint: opt record { block: nat32; index: nat32 };
                 dex: opt record { route: vec text; txid: opt text };
                 ledger: opt record { balance_delta: int };
                 last_update_ms: nat64 });
  recent_events : (opt nat32) -> (vec record { ts_ms: nat64; operation_id: text; event: text });
  resume_all : () -> (nat32);
  purge_completed_before : (nat64) -> (nat32);
}
```

## State Model
- Durable map `operation_id → Operation` in **stable memory**.
- **FSM phases:** `Pending → Confirmed → Completed` with side‑path `→ RolledBack` on reorg/abort.
- **Correlation keys:** `(btc_txid, mint_block:index, dex_txid, ledger_delta)`.

## Preconditions & Guards
- `start_watch` idempotent; re‑invocation returns `true` if already tracked.
- Read‑only calls to providers; no writes to ledgers/DEXes.

## Invariants
- **INV‑TXM‑001:** Phase transitions are **monotonic** except for `→ RolledBack` on explicit reorg/abort signal.
- **INV‑TXM‑002:** `Completed` requires ledger delta recorded and DEX step (if present) reconciled.
- **INV‑TXM‑003:** On restart, the agent resumes from the last durable checkpoint.

## Errors
- `ERR_NOT_FOUND`, `ERR_PROVIDER_UNAVAILABLE`, `ERR_CORRELATION_TIMEOUT`, `ERR_REORG`.

## Observability
- Emits `PhaseChanged{operation_id, from, to}`, `ReorgDetected{txid, depth}`, `RollbackEmitted{reason}`.
- JSONL stream for all decisions; `/docs/test-results/<date>/agents/txmon.junit.json` for suites.

## Metrics
- `operations_inflight`, `phase_change_total{phase}`, `reorg_events_total`, `resume_recovered_total`.

## Acceptance Mapping
- **FR‑005** (observable correlation) → Agent suite, **F.1** (deposit→mint→swap), **F.2** (orchestration), **F.5** (reorg & rollback).

