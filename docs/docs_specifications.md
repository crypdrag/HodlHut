# HodlHut — Product & Technical Specifications (ICP Liquidity Bridge Update)

> **Scope:** Contract‑level specs for MVP → pre‑prod. Authoritative for requirements, interfaces, invariants, and SLOs.
> **Non‑goals:** Design rationale (see Developer Notes), step‑by‑step testing (see Testing (Canonical)).

## 1. Functional Requirements (FR)

| ID         | Requirement                                                          | Priority | Acceptance Criteria                                                                                                         | Tests                    |
| ---------- | -------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **FR‑001** | User can deposit BTC and receive ckBTC                               | P0       | Deposit→Mint confirmed within N confirmations; ledger balance increases by exact satoshis/10^8                              | F.1                      |
| **FR‑002** | Swap **ckX↔ckY** with **ICP liquidity bridge** fallback/optimization | P0       | Router chooses min expected cost between **direct** (A→B) and **ICP liquidity bridge** (A→ICP→B), subject to slippage guard | F.1, F.4                 |
| **FR‑003** | Orchestrate multi‑agent flow with rollback                           | P0       | On injected failure, workflow aborts and emits rollback events                                                              | F.2, F.5                 |
| **FR‑004** | Governance **Activation Window** gates sensitive ops                 | P0       | Calls outside window are rejected with explicit reason                                                                      | F.6                      |
| **FR‑005** | Cross‑chain txn correlation is observable                            | P1       | Operation shows Pending→Confirmed→Completed with txids                                                                      | TxMonitor suite          |
| **FR‑006** | EVM/SVM provider quorum                                              | P1       | n‑of‑m quorum enforced; divergent results rejected                                                                          | EVMRPCAgent, SVMRPCAgent |
| **FR‑007** | DEX quote parity vs on‑chain pools                                   | P1       | Quotes within tolerance of pool state                                                                                       | DEXRoutingAgent          |

## 2. Non‑Functional Requirements (NFR)

* **Performance (SLO targets):**

  * Deposit→Mint correlation: **p95 ≤ X seconds** after required BTC confirmations.
  * Quote→Execute latency: **p95 ≤ Y ms**; DEX price error **≤ Z%**.
* **Reliability:** No data loss across upgrades; orchestrations resume after restart.
* **Security/Compliance:** No secrets in canister state; guarded ops require Activation Window; KYT/AML hooks documented.
* **Cost:** Cycle burn per operation **≤ C cycles** (target), alert at **C\_warn**.

## 3. External Interfaces (APIs)

* **Candid:** canonical `.did` for each canister (see `/docs/specs/*.md`).
* **HTTP/gateway:** public asset routes (frontend), Internet Identity auth flows.
* **DEX adapters:** ICPSwap / KongSwap interfaces (function names, args, fees).
* **Providers:** EVM/SVM/Bitcoin RPC quorum policies (n‑of‑m, retry/backoff).

## 4. Data & State

* **Stable memory layouts:** schema versions, upgrade plan, certified data usage.
* **Invariants (must always hold):**

  * **INV‑001:** Sum(ckBTC minted via app paths) == Sum(BTC deposits observed) ± fees (where applicable).
  * **INV‑002:** Governance window must be **Open** for role mutations/upgrades.
  * **INV‑003:** Orchestration state is idempotent; retries do not duplicate effects.

## 5. Error Model

* Standard error codes: `ERR_UNAVAILABLE`, `ERR_QUORUM`, `ERR_SLIPPAGE`, `ERR_WINDOW_CLOSED`, `ERR_REORG`, `ERR_UPGRADE_GUARD`.
* Each API lists its error cases in its component spec.

## 6. Observability

* **Events:** standardized types (`ActivationOpened`, `Executed`, `Expired`, `RollbackEmitted`, etc.).
* **Metrics (proto):** counters for quotes requested, routes executed, reorgs handled, rollback count.
* **Logs:** JSON lines with correlation IDs `operation_id`, `agent`, `phase`.

## 7. Constraints & Limits

* Candidate routes: **direct** and **ICP liquidity bridge** (optional extra hubs **off by default**).
* Max route length (hops): **3** (e.g., A→ICP→B).
* Max quote staleness: **Q seconds**.
* BTC reorg depth tolerance: **2 blocks** (beyond → rollback).

## 8. Security Requirements

* No secrets persisted in canister state; providers via env/secret store.
* All privileged entrypoints gated by Activation Window + controller checks.
* Upgrade guard: reject schema‑incompatible upgrades without migrator.

## 9. Compliance Hooks

* KYT/AML webhooks (read‑only): call before mint/settle; blocklist cache TTL.

## 10. Cross‑References

* Developer Notes: `docs/hodlhut-developer-notes.md`
* Testing (Canonical): section **F.**\* maps back to FR/NFR IDs.
* Tech Stack: `docs/tech-stack.md`, Infra: `docs/infra-tech-stack.md`
