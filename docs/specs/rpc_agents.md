# Spec — RPC Agents (Bitcoin / EVM / SVM)

## Summary
Provides read‑only, provider‑abstracted access to Bitcoin, EVM, and Solana networks for pricing, health, and state queries. EVM/SVM enforce **n‑of‑m** provider quorum; Bitcoin validates header continuity and mempool/fee data consistency.

## Shared Requirements
- **Read‑only** calls only; no private key material.
- **Provider catalog:** ordered list with rate‑limit/burst settings and timeouts per provider.
- **Retry/backoff:** exponential with jitter; circuit breaker per provider.
- **Clock tolerance:** handle skew; record provider timestamps.
- **Observability:** structured JSON logs, `agent`, `provider`, `attempt`, `elapsed_ms`.

## BitcoinRPCAgent

### API (Candid — sketch)
```did
service : {
  get_fee_percentiles : (record { blocks: opt nat32 }) -> (vec nat32);
  get_block_header    : (record { height: nat32 }) -> (record { hash: text; prev_hash: text; nbits: nat32; time: nat64 });
  get_tx_status       : (record { txid: text }) -> (variant { Unconfirmed; Confirmed : record { height: nat32; n_confirmations: nat32 } });
  get_mempool_snapshot: () -> (record { count: nat32; bytes: nat64; fee_histogram: vec record { feerate_sats_vb: nat32; weight: nat64 } });
}
```

### Preconditions & Guards
- Queries are **read‑only**; reject state‑changing RPCs.
- Reject responses that fail **header chain continuity** checks.

### Invariants
- **INV‑BTC‑001:** Reported header `(height)` links to `(height‑1)` by `prev_hash`.
- **INV‑BTC‑002:** `n_confirmations >= 0` and consistent with best height.

### Errors
- `ERR_UNAVAILABLE`, `ERR_REORG_DETECTED`, `ERR_RATE_LIMITED`, `ERR_PARSE`.

### Metrics
- `btc_provider_success_total{provider}`
- `btc_reorg_signals_total`
- `btc_fee_histogram_samples_total`

### Acceptance Mapping
- **FR‑006** (provider reliability via validation) → Agent suite; **F.1** (deposit→mint) sanity; **F.5** (reorg injection).

---

## EVMRPCAgent

### API (Candid — sketch)
```did
service : {
  get_block_number : () -> (nat64);
  get_block_by_num : (record { number: nat64; full: bool }) -> (record { hash: text; parent_hash: text; tx_count: nat32; timestamp: nat64 });
  eth_call_quorum  : (record { to: text; data: blob; quorum: nat8 }) -> (record { result: blob; providers_agree: bool; decided_by: nat8 });
}
```

### Quorum & Decision
- **Quorum:** `q = ceil(n/2)+1` by default (configurable). Reject if providers diverge.
- **Normalization:** compare normalized hex payloads; ignore non‑semantic fields.

### Preconditions & Guards
- Only **whitelisted** JSON‑RPC methods are allowed.
- Payload size and latency recorded per provider.

### Errors
- `ERR_QUORUM`, `ERR_DIVERGENT`, `ERR_RATE_LIMITED`, `ERR_TIMEOUT`.

### Metrics
- `evm_quorum_success_total`, `evm_quorum_fail_total`
- `provider_latency_p95_ms{provider}`
- `payload_bytes_max`

### Acceptance Mapping
- **FR‑006** → EVM agent suite; **F.3** (consensus under load); **F.5** (throttling fault).

---

## SVMRPCAgent (Solana)

### API (Candid — sketch)
```did
service : {
  get_health     : (variant { Mainnet; Devnet; Custom : vec record { network: text } }, opt nat64) -> (text);
  get_slot       : () -> (nat64);
  get_balance    : (record { account: text }) -> (nat64);
  get_transaction: (record { signature: text }) -> (opt record { slot: nat64; err: opt text });
}
```

### Quorum & Decision
- **n‑of‑m** provider voting on `slot`, `getHealth`, and selected reads; accept if `|slot_i − median(slot)| ≤ k`.

### Preconditions & Guards
- If threshold Ed25519 not available, **signing is client‑side**; agent remains read‑only.

### Errors
- `ERR_QUORUM`, `ERR_SLOT_DRIFT`, `ERR_PROVIDER_INCOMPATIBLE`.

### Metrics
- `svm_slot_drift_histogram`
- `svm_quorum_success_total`

### Acceptance Mapping
- **FR‑006** → SVM agent suite; **F.3** (consensus), **F.5** (quorum degrade).

---

## Shared Observability & Logs
- Event fields: `ts`, `agent`, `provider`, `op`, `attempt`, `elapsed_ms`, `status`, `error?`.
- Sample decisions serialized to JSONL for offline triage.

