# Spec — DEX Routing (ICP Liquidity Bridge Model)

## Goal

Find/execute the **lowest‑cost path** across ICPSwap/KongSwap by evaluating **direct** vs **ICP liquidity bridge** routes (with support for additional hubs like ckUSDC **only if explicitly enabled**).

## API (Candid)

```did
service : {
  get_quote: (record { from: text; to: text; amount: nat }) ->
             (record { route: vec text; expected_price: nat; slippage_bps: nat });
  execute_swap: (record { route: vec text; amount: nat; max_slippage_bps: nat }) ->
                (record { txid: text; exec_price: nat; fee_paid: nat });
}
```

## Constraints

* **Primary candidates:** direct (`A→B`) and **ICP liquidity bridge** (`A→ICP→B`).
* **Optional hubs:** config‑gated (e.g., ckUSDC). Defaults to **disabled**.
* Max **3 hops** total; slippage ≤ configured threshold; re‑quote if staleness > **Q seconds**.

## Invariants

* Route chosen minimizes expected cost across { **direct**, **ICP liquidity bridge** \[, optional hubs] } at decision time.
* If direct `A→B` is thin and **ICP liquidity bridge** reduces expected cost by **≥ Δ bps**, **ICP liquidity bridge must be chosen**.
* Executed price must be within `max_slippage_bps` of quoted price or **abort**.

## Errors

* `ERR_SLIPPAGE`, `ERR_QUOTE_STALE`, `ERR_POOL_UNAVAILABLE`.

## Observability

* Emit `RouteEvaluated`, `QuoteIssued`, `SwapExecuted`, `SwapAborted{reason}` events.

## Acceptance Mapping

* **FR‑002** → Tests: **F.1**, **F.4**
