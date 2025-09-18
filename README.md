# HodlHut 🏡

**Sovereign Multichain DeFi Router on the Internet Computer (ICP)**

HodlHut is a prototype BTCFi platform that uses a **Multi‑agent intelligence layer** on ICP to optimize fees and route liquidity across Bitcoin and Ethereum — anchored by **dynamic routing with an ICP liquidity bridge** (choosing between direct and ICP liquidity bridge paths at runtime). The HodlHut interface abstracts complexity for multi-hopping trades while transparently advising the user exactly what is happening behind the scenes with simple language and charts. Yield Farming and games are built into the roadmap.

> **Note:** Solana integration was removed based on DFINITY's roadmap decision not to create ckSOL or ckUSDC(SOL) chain-key tokens, making Solana integration unnecessary for the HodlHut architecture. 

> **Hackathon TL;DR**
>
> * **Demo:** local prototype + read‑only mainnet checks (Boundary‑NET)
> * **What's novel:** ICP as a fast L2 coordination layer for BTC/ETH via agents + canisters
> * **Tests:** 36 unit + 6 integration scenarios (see *Testing (Canonical)*)

---

## Demo

### Local (prototype UI + agents)

```bash
# prerequisites (recommended)
# - Node.js 22 LTS (Node 18+ works)
# - npm 10+
# - DFX ≥ 0.24.x (only needed for canister calls/examples)
# - Rust toolchain (only if you build Rust canisters)

# clone & install
git clone https://github.com/crypdrag/HodlHut.git
cd HodlHut
npm install

# run the webpack dev server (prototype)
npm start
# UI: http://localhost:8082
```

### Boundary‑NET (read‑only)

Runs agent checks against public providers / IC canisters without state changes.

```bash
# (optional) env for providers (redacted values)
export EVM_PROVIDERS="<urls or json>"
export BTC_PROVIDERS="<urls or json>"

# run agent test aggregator (prototype)
node src/agents/test_all_agents.js
```

> See **/docs/hodlhut-developer-notes.md** for full *Testing (Canonical)* with commands and assertions.

---

## How It Works (at a glance)

```
User → Frontend (React) → MasterAgent
                     ├─ BitcoinRPCAgent  ─▶ Bitcoin Canister (read) ─▶ ckBTC Minter/Ledger (read)
                     ├─ EVMRPCAgent      ─▶ EVM RPC canister/providers (quorum)
                     ├─ DEXRoutingAgent  ─▶ ICPSwap/KongSwap (direct vs ICP liquidity bridge; optional extra hubs)
                     ├─ HutFactoryAgent  ─▶ Governance + MyHut canister lifecycle
                     └─ TransactionMonitorAgent ─▶ Correlates deposit→mint→swap→settle
```

* **Agents (Node/TS):** fetch network state, build quotes, orchestrate flows.
* **Canisters (Rust/Motoko):** (planned/partial) custody/DEX adapters/governance.
* **ICP Role:** low‑latency coordination + ckBTC/ckUSDC ledger reads; sovereign user canisters (MyHut) for guarded ops.

---

## Key Features (current prototype)

* **Dynamic Fee Intelligence:** BTC/EVM fee and health snapshots.
* **Dynamic Routing with ICP Liquidity Bridge:** cross‑DEX quote/route selection (ICPSwap & KongSwap), choosing between **direct** and **ICP liquidity bridge** paths.
* **Sovereign Accounts (design):** per‑user **MyHut** canister + **HutFactory** governance window (30‑min gate).
* **Observability:** JSONL operation logs, phase transitions, reorg handling.

> Status: **prototype**. Integration paths and guards are validated in tests; production canisters are WIP.

---

## Quick Start for Judges

* **See it run:** `npm start` → UI at `http://localhost:8082` (mock data + live reads where available)
* **See it think:** `node src/agents/test_all_agents.js` (prints fee/quote/quorum decisions)
* **Deeper:** open **/docs/hodlhut-developer-notes.md** → *Testing (Canonical)* (F.1–F.6 scenarios)

---

## Testing (Canonical) — highlights

* **F.1 Deposit→Mint→Swap→Settle:** multi‑canister & DEX flow (**route selection: direct vs ICP liquidity bridge**)
* **F.2 Agent Coordination:** MasterAgent orchestrates multi‑agent fan‑out/fan‑in + health gates
* **F.3 Chain‑Key Readiness:** threshold signer checks (ECDSA/Ed25519), quorum under load
* **F.4 Route Optimization:** **direct vs ICP liquidity bridge** (slippage guards; optional extra hubs)
* **F.5 Failure Injection:** provider 429/5xx, BTC reorg (depth 1–2), stale quotes, closed governance window
* **F.6 Governance Window:** 30‑minute activation gate for sensitive ops

> Full details (playbooks, assertions, artifacts) live in **/docs/hodlhut-developer-notes.md**.

---

## Tech Stack

* **Frontend:** React + TypeScript, Webpack dev server (prototype)
* **Agents:** Node.js (TypeScript/JavaScript)
* **ICP:** ckBTC/ckUSDC ledgers (read), governance & DEX adapters (planned canisters)
* **Styling:** Tailwind‑style utility approach (CSS modules in repo), Lucide icons
* **Auth (planned):** Internet Identity (II)

> See **/docs/tech-stack.md** and **/docs/infra-tech-stack.md** for deeper details and CI/CD.

---

## Repository Structure

```text
HodlHut/
├─ src/
│  ├─ agents/                      # Node/TS agents (Master, BTC/EVM RPC, DEX, HutFactory, TxMonitor)
│  │  └─ test_all_agents.js        # prototype aggregator
│  └─ scripts/
│     └─ integration/              # F.* runners (skeletons)
│        ├─ deposit-mint-swap.ts   # F.1
│        └─ chainkey-readiness.ts  # F.3
├─ docs/
│  ├─ hodlhut-developer-notes.md   # **canonical** deep documentation (Testing, env, etc.)
│  ├─ tech-stack.md                # product tech stack
│  ├─ infra-tech-stack.md          # infra-only stack (ops)
│  ├─ specifications.md            # FR/NFR/SLOs + invariants
│  └─ specs/
│     ├─ hutfactory.md, myhut.md, dex-routing.md
│     ├─ rpc-agents.md, tx-monitor.md
│     └─ api-stubs/*.did          # Candid stubs (optional; generate later)
├─ dfx.json                         # IC project config (if/when canisters are added)
├─ package.json / webpack.config.js # prototype build
└─ README.md                        # this file
```

---

## CI/CD (prototype)

* **GitHub Actions** stubs ready: lint/test, build artifacts, staging (dry‑run).
* Boundary‑NET read‑only agent tests can run nightly for trend lines.
* Mainnet deploy stays **gated** until governance/keys are configured.

See **/docs/infra-tech-stack.md** for workflow names and secrets.

---

## Roadmap (abridged)

* **Phase 1 — Intelligence (done):** 6 agents, fee/quote logic, tests
* **Phase 2 — Canisters (WIP):** RPC adapters, DEX router, HutFactory/MyHut, governance gates
* **Phase 3 — Productize:** real DEX trades, II auth, metrics canister, CI promotions

---

## Developer Deep‑Dive (appendix)

### 6‑Agent System

| Agent                       | Purpose                                             | Selected Assertions                                       |
| --------------------------- | --------------------------------------------------- | --------------------------------------------------------- |
| **MasterAgent**             | Orchestration & health                              | Fan‑out/fan‑in across ≥3 agents; rollback on stale quotes |
| **BitcoinRPCAgent**         | Fee/mempool/headers                                 | POW & height continuity; reorg tolerance                  |
| **EVMRPCAgent**             | Quorum reads                                        | n‑of‑m agreement; reject divergent payloads               |
| **DEXRoutingAgent**         | Route optimization (direct vs ICP liquidity bridge) | chosen path = lowest expected cost; slippage guard        |
| **HutFactoryAgent**         | MyHut lifecycle & roles                             | Activation Window required for role changes               |
| **TransactionMonitorAgent** | Correlate flows                                     | Pending→Confirmed→Completed; rollback on reorg            |

### Invariants & Guards (samples)

* **INV‑001:** Sum(ckBTC minted via app paths) == Sum(BTC deposits observed) ± fees.
* **INV‑002:** Activation Window must be **Open** for privileged mutations.
* **INV‑003:** Orchestration is idempotent; retries don't duplicate effects.

### Example Calls

```bash
# DEX routing via MyHut (quote)
dfx canister call my_hut get_kongswap_quote '(record {from_token="ICP"; to_token="ckBTC"; amount=1000000})'

# Bitcoin fee estimation
dfx canister call btc_rpc get_current_fee_percentiles '(variant{Mainnet}, null)'
```

> Many more examples in *Testing (Canonical)* and component specs under `/docs/specs/`.

---

## Contributing

PRs welcome! See issues or propose an agent/canister you'd like to extend. Please skim **/docs/hodlhut-developer-notes.md** before large changes.

## License

MIT — see `LICENSE`.
