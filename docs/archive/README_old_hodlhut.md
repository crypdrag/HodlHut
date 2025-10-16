# HodlHut 🏡

**Sovereign Multichain DeFi Router on the Internet Computer (ICP)**

HodlHut is a BTCFi platform that uses a **Multi‑agent intelligence layer** on ICP to optimize fees and route liquidity across ICP, Bitcoin, and Ethereum — anchored by **dynamic routing**. The HodlHut interface abstracts complexity for multi-hopping trades while transparently advising the user exactly what is happening behind the scenes with simple language and charts. 

My Hut canister performs Agent assisted comprehensive swaps involving both ICP DEXs and Chain Fusion. While complexity is abstracted as much as possible for the user, transparency is not. Users are given swap options if DEXs are involved [ckBTC ->ckUSDC-> USDC (ETH)] advising them of slippage, liquidity risk, and DEX fees prior to choosing which ICP DEX to perform the swap. (Custom Agents check ICP as the liquidity bridge for any ckX ↔ ckY swap when the direct pool is thin.) Chain Fusion gas fees are always real-time and visible. HoldHut Smart Solutions advise the user of any gas necessary for crosschain resolutions on Bitcoin and Ethereum, and offers solutions for the easiest way to obtain the appropriate gas if they don't hold ckBTC or ckETH.

My Garden is a user's private yield farm where multipliers reward users based on staking diversity. Reef Raffle and Tsunami Sweep are DAO controlled daily lotteries, and monthly lotteries. (The ReefRaffleAgent and MyGarden Agent have not been prototyped yet.) DAO and tokenomics designs are on the RoadMap. HodlHut's future build plans to incorporate Bitcoin metaprotocols via Runes Exchange Environment. HodlHut's DAO will launch on RichSwap. Hodlhut was created to highlight ICP Dapps' USPS and bridge the BTCFi and ICP community. 

> **Note:** Solana integration was removed until further notice and more support for ckSOL on DFINITY's roadmap.
> 
> **Hackathon TL;DR**
>
> * **🚀 LIVE DEMO:** HodlHut deployed and running on IC mainnet with Smart Solutions:   https://vf7wt-caaaa-aaaad-ab6da-cai.icp0.io/
> * **What's novel:** ICP as a fast compute layer for multichain growth via agents + canisters
> * **Demo:** DEX DATA AS OF September 21, 2025. Live data e.g. liquidity & slippage may vary over time.
> * **Tests:** 36 unit + 6 integration scenarios (see *Testing (Canonical)*)

---

## 🚀 Live Mainnet Demo

**HodlHut is LIVE on Internet Computer mainnet:**

🌐 **Dapp URL:** `https://vf7wt-caaaa-aaaad-ab6da-cai.icp0.io/` (or `dapp.hodlhut.app` when DNS propagates)

**Deployed Canisters:**
- **Frontend:** `vf7wt-caaaa-aaaad-ab6da-cai`
- **Backend:** `vm45p-uiaaa-aaaad-ab6cq-cai`
- **Candid Interface:** https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=vm45p-uiaaa-aaaad-ab6cq-cai

**✅ Working Features:**
- Smart Solutions system with in-modal wallet selection
- CompactDEX integration with live quotes across ICPSwap, KongSwap, ICDEX
- Transaction Preview with "What's Happening" breakdowns
- Mobile-first Tailwind v4 design
- Complete mock data demonstrating sophisticated DeFi routing

## Local Development

### Setup (for developers)

```bash
# prerequisites
# - Node.js 22 LTS (Node 18+ works), npm 10+, DFX ≥ 0.24.x

git clone https://github.com/crypdrag/HodlHut.git
cd HodlHut
npm install

# run local development server
npm start
# UI: http://localhost:8082
```

### Agent Testing

```bash
# run agent test aggregator
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

## Key Features (current implementation)

* **Smart Solutions System:** Automated gas fee resolution with in-modal wallet selection (Plug, MetaMask).
* **Dynamic Fee Intelligence:** BTC/EVM fee and health snapshots.
* **CompactDEX Integration:** Quote comparison across ICPSwap, KongSwap, and ICDEX with scoring.
* **Dynamic Routing with ICP Liquidity Bridge:** cross‑DEX route selection, choosing between **direct** and **ICP liquidity bridge** paths.
* **Sovereign Accounts (design):** per‑user **MyHut** canister + **HutFactory** governance window (30‑min gate).
* **Observability:** JSONL operation logs, phase transitions, reorg handling.

> Status: **🚀 LIVE ON MAINNET**. Frontend and backend canisters successfully deployed to Internet Computer with full Smart Solutions functionality.

---

## Quick Start for Judges

* **🌐 Try it live:** `https://vf7wt-caaaa-aaaad-ab6da-cai.icp0.io/` (full Smart Solutions + CompactDEX on IC mainnet)
* **🔍 Backend API:** `https://a4gq6-oaaaa-aaaad-ab6cq-cai.raw.icp0.io/?id=vm45p-uiaaa-aaaad-ab6cq-cai` (Candid interface)
* **💻 Local demo:** `npm start` → `http://localhost:8082` (development environment)
* **🤖 Agent tests:** `node src/agents/test_all_agents.js` (fee/quote/quorum decisions)
* **📚 Deep dive:** **/docs/hodlhut-developer-notes.md** → *Testing (Canonical)* (F.1–F.6 scenarios)

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

* **Frontend:** React + TypeScript, Webpack dev server, Tailwind v4 mobile-first design
* **Agents:** Node.js (TypeScript/JavaScript)
* **Backend:** Motoko canisters with .did interfaces for Smart Solutions and DEX routing
* **ICP:** ckBTC/ckUSDC ledgers (read), DEX adapters (mock implementation)
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
* **Phase 2 — Implementation (current):** Smart Solutions system, backend .did interfaces, CompactDEX integration, mainnet canister deployment
* **Phase 3 — Productize:** Real DEX integration, II auth, metrics canister, CI promotions

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


