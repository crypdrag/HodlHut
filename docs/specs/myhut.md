# Spec — MyHut Canister (ICP Liquidity Bridge Model)

## Summary

User‑scoped canister for permissioned DEX actions (quote, **dynamic route optimization via direct vs ICP liquidity bridge**, optional extra hubs if enabled, LP ops) and integration with governance gates enforced by **HutFactory**.

## API (Candid — sketch)

```did
service : {
  get_quote : (record { from_token: text; to_token: text; amount: nat }) ->
              (record { route: vec text; expected_price: nat; slippage_bps: nat });
  optimize_trade_route : (record { from_token: text; to_token: text; amount: nat }) ->
                         (record { route: vec text; dexes: vec text; expected_price: nat });
  execute_swap : (record { route: vec text; amount: nat; max_slippage_bps: nat }) ->
                 (record { txid: text; exec_price: nat; fee_paid: nat });
  manage_liquidity_position : (record { action: variant { Add; Remove }; dex: variant { KongSwap; ICPSwap }; pool_id: text; amount: opt nat }) -> () ;
  get_state : () -> (record { owner: principal; roles: vec record { user: principal; role: text } });
}
```

## Preconditions & Guards

* `execute_swap` and `manage_liquidity_position` require caller with `Trader` or `Admin` role.
* Sensitive ops may require **Activation Window = Open** (if HutFactory policy attached).
* Enforce `max_slippage_bps` and **re‑quote** if quote staleness > `Q` seconds.

## Constraints

* Max **3 hops** total. **Primary** candidates = direct and **ICP liquidity bridge**.
* Extra hubs (e.g., ckUSDC) are **opt‑in** via config and **off by default**.

## Invariants

* **INV‑MH‑001:** Executed price within `max_slippage_bps` of last valid quote; otherwise **abort**.
* **INV‑MH‑002:** Role checks are enforced on all state‑changing methods.

## Errors

* `ERR_UNAUTHORIZED`, `ERR_SLIPPAGE`, `ERR_QUOTE_STALE`, `ERR_POOL_UNAVAILABLE`.

## Observability

* Emit `RouteEvaluated`, `QuoteIssued`, `SwapExecuted`, `SwapAborted{reason}`, `LPChanged{action}` events.

## Metrics

* `quotes_total`, `route_graph_size`, `swaps_executed_total`, `lp_ops_total`.

## Acceptance Mapping

* **FR‑002** (direct vs ICP liquidity bridge routing) → **F.1**, **F.4**; role/guard checks verified in **E. HutFactoryAgent** and **F.6**.
