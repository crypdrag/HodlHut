# HODL Protocol
**Bitcoin Liquid Staking Exchange on Internet Computer**

> Stake BTC, earn BTC, onboard with multiple assets via DEX Aggregation + Chain Fusion

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![ICP](https://img.shields.io/badge/ICP-Canister-blue)](https://internetcomputer.org)
[![Bitcoin](https://img.shields.io/badge/Bitcoin-Testnet4-orange)](https://mempool.space/testnet4)

**Live Demo:** https://hodlprotocol.xyz
**Exchange Canister:** `hz536-gyaaa-aaaao-qkufa-cai`
**Network:** Bitcoin Testnet4, ICP REE Testnet

---

## Overview

HODL Protocol is a Bitcoin liquid staking exchange that enables users to stake Bitcoin and receive tradeable BLST runes representing their staked position. The protocol integrates 5 layers of cross-chain infrastructure to stake Bitcoin on Babylon and distribute rewards via Omnity Hub's integration with Cosmos.

Users can deposit Bitcoin directly or use the integrated DEX aggregator to find optimal routes for converting other assets (ETH, USDC, USDT, ckTokens) to BTC before staking.

---

## Technology Stack

### 1. Internet Computer (ICP)
**Role:** Custody and transaction signing
- Chain Key threshold ECDSA for decentralized Bitcoin signing
- Bitcoin Canister API for UTXO queries and transaction broadcast
- Rust canister smart contracts for pool management

### 2. REE (Runes Exchange Environment)
**Role:** Bitcoin Runes infrastructure
- Runes Indexer (`f2dwm-caaaa-aaaao-qjxlq-cai`) - tracks BLST balances
- REE Orchestrator (`hvyp5-5yaaa-aaaao-qjxha-cai`) - minting/burning
- DEX Aggregator UI - shows optimal routes across ICP DEXs

### 3. Babylon Protocol
**Role:** Bitcoin Layer 1 staking
- Accepts staking transactions on Bitcoin Testnet4
- Manages finality provider delegation
- Distributes BABY token rewards on Babylon chain

### 4. Omnity Hub
**Role:** Cross-chain messaging bridge
- Light client verification for Bitcoin → ICP → Cosmos
- Bridges staking proofs from Bitcoin to Babylon chain
- Routes reward queries from Babylon back to ICP
- Osmosis ckBTC integration for cross-chain liquidity

### 5. Osmosis DEX
**Role:** Reward conversion
- BABY/BTC liquidity pool for reward swaps
- Alloyed Bitcoin basket (includes ckBTC)
- Used in reward distribution: BABY → ckBTC → BTC

---

## Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                   HODL PROTOCOL (ICP)                        │
│            Exchange Canister + DEX Aggregator                │
└──────────────────────────────────────────────────────────────┘
                          |    |    |
        ┌─────────────────┼────┼────┼─────────────────┐
        |                 |    |    |                 |
        |                 |    |    |                 |
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Bitcoin    │  │  REE Layer   │  │  Omnity Hub  │  │   Osmosis    │
│  Testnet4    │  │              │  │              │  │    DEX       │
├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤
│ BLST Runes   │  │ Orchestrator │  │ Light Client │  │ BABY/BTC     │
│ Pool UTXOs   │  │ Indexer      │  │ ckBTC Bridge │  │ Pool         │
│ Staking TXs  │  │ DEX Agg UI   │  │ CosmWasm Msg │  │ Alloyed BTC  │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
        |                 |                 |                 |
        └─────────────────┴─────────────────┴─────────────────┘
                                |
                                |
                      ┌──────────────────┐
                      │  Babylon Chain   │
                      │   (Cosmos)       │
                      ├──────────────────┤
                      │ Staking Proofs   │
                      │ BABY Rewards     │
                      │ Finality Provider│
                      └──────────────────┘
```

### Transaction Flows

#### Flow 1: Deposit → BLST Minting

```
User sends BTC to pool address (tb1p97hz...)
  |
ICP Bitcoin Canister detects deposit (6 confirmations)
  |
Exchange canister calls REE Orchestrator
  |
REE Orchestrator mints BLST runes to user
  |
User receives 100,000 BLST per BTC deposited
```

**Status:** Core deposit flow functional, BLST minting in progress

#### Flow 2: Pool → Babylon Staking (5-Layer Integration)

```
Exchange aggregates pooled BTC UTXOs
  |
[Layer 1: ICP] Canister constructs Babylon staking PSBT
  |
[Layer 1: ICP] Signs PSBT with Chain Key threshold ECDSA
  |
[Layer 2: REE] Submits signed tx to REE Orchestrator
  |
[Layer 2: REE] REE broadcasts to Bitcoin Testnet4
  |
Bitcoin miners confirm staking transaction (6+ blocks)
  |
[Layer 4: Omnity Hub] Exchange submits staking proof to Omnity Hub
  |
[Layer 4: Omnity Hub] Light client verifies Bitcoin tx on-chain
  |
[Layer 4: Omnity Hub] Bridges proof to Babylon chain via CosmWasm Route
  |
[Layer 3: Babylon] Babylon chain activates delegation
  |
BABY rewards begin accruing on Babylon chain
```

**Status:** Skeleton implemented in `stake_to_babylon()` and `submit_staking_proof_to_omnity()` (lines 1929-2102, lib.rs)

#### Flow 3: BABY Rewards → BTC Distribution (Full Cross-Chain Route)

```
[Layer 3: Babylon] Query BABY rewards from Babylon chain
  |
[Layer 4: Omnity Hub] Omnity Hub routes query via CosmWasm
  |
[Layer 1: ICP] Exchange canister receives BABY reward amount
  |
[Layer 1: ICP] Pool BTC → Omnity Hub → ckBTC
  |
[Layer 4: Omnity Hub] Bridge ckBTC to Osmosis (Alloyed BTC basket)
  |
[Layer 5: Osmosis] Swap BABY → ckBTC on Osmosis DEX
  |
[Layer 4: Omnity Hub] Bridge ckBTC back: Osmosis → Omnity Hub → ICP
  |
[Layer 1: ICP] Convert ckBTC → native BTC via ICP Bitcoin canister
  |
[Layer 1: ICP] Distribute BTC proportionally to BLST holders
```

**Status:** Architecture documented in `distribute_rewards()` (lines 2104-2146, lib.rs), implementation pending

---

## BLST Token Specification

| Property | Value |
|----------|-------|
| **Rune ID** | `107266:20` |
| **Etch TX** | [b7652fe...41c6](https://mempool.space/testnet4/tx/b7652fe24527e6dfa6470252bddc0149b21c4bf877265810a644e76563e441c6) |
| **Technical Name** | `BABYLONLST` |
| **Display Name** | `BABYLON•LST` |
| **Symbol** | `BLST` |
| **Decimals** | 3 |
| **Denomination** | 100,000 BLST = 1 BTC |
| **Minimum Deposit** | 0.0005 BTC = 50 BLST |
| **Total Supply** | 100,000,000 BLST |

**Pool Address:**
```
tb1p97hznaf3sjng0vr5gs8vp0839jmapth7vjchc8uy9wytmxal2awqsy0q92
```

**Derivation Path:**
```rust
vec![b"hodlprotocol_blst_pool".to_vec()]
```

---

## DEX Aggregator (Multi-Asset Onboarding)

### Supported Assets

- **Native Bitcoin:** BTC
- **Ethereum Mainnet:** ETH, USDC, USDT
- **ICP Wrapped:** ckBTC, ckETH, ckUSDC, ckUSDT
- **Internet Computer:** ICP

### Functionality

The DEX aggregator provides:
- Real-time quotes from ICP DEXs (ICPSwap, Kong, Sonic)
- Slippage analysis and liquidity warnings
- Optimal route recommendations
- Fee comparison


### Implementation

Frontend: `src/hodlhut_frontend/src/components/CompactDEXSelector.tsx`
- Fetches quotes from `DEXRoutingAgent`
- Displays slippage estimates and liquidity analysis
- Sorts DEXs by score (liquidity, speed, fees)

---

## API Reference

### Core Functions

#### `pre_deposit(amount_sats: u64) → Result<DepositInfo, String>`

Get deposit address and expected BLST amount.

**Parameters:**
- `amount_sats` - Deposit amount in satoshis

**Returns:**
```rust
{
  pool_address: String,
  nonce: u64,
  expected_blst_amount: u64
}
```

#### `query_pool_blst_utxos() → Vec<BitcoinUtxo>`

Get pool UTXOs with BLST rune balances.

**Returns:**
```rust
Vec<{
  txid: String,
  vout: u32,
  value: u64,        // sats
  rune_balance: u128 // BLST base units
}>
```

#### `consolidate_pool_utxos() → Result<String, String>`

Consolidate pool UTXOs (admin only).

**Implementation:** Lines 984-1086, lib.rs
**Status:** Working (tested Session 32)

### Babylon Integration (Skeleton)

#### `stake_to_babylon(amount_sats: u64, fp_pubkey_hex: String) → Result<String, String>`

Construct and broadcast Babylon staking transaction.

**Parameters:**
- `amount_sats` - Amount to stake
- `fp_pubkey_hex` - Finality provider public key

**Implementation:** Lines 1929-2020, lib.rs
**Status:** Skeleton with TODO blocks

#### `submit_staking_proof_to_omnity(staking_tx_hash: String, babylon_account_id: String) → Result<String, String>`

Submit Bitcoin staking proof to Omnity Hub for Babylon delegation.

**Implementation:** Lines 2022-2102, lib.rs
**Status:** Skeleton with TODO blocks

#### `distribute_rewards() → Result<String, String>`

Execute full BABY → BTC reward conversion via Omnity Hub + Osmosis.

**Implementation:** Lines 2104-2146, lib.rs
**Status:** Architecture documented, implementation pending

---

## Setup & Development

### Prerequisites

```bash
rustup target add wasm32-unknown-unknown
sudo apt-get install -y clang
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
```

### Build

```bash
npm install
dfx build hodlprotocol_exchange
npm run build
```

### Deploy

```bash
# Backend
dfx deploy hodlprotocol_exchange --network ic

# Frontend
dfx deploy hodlprotocol_frontend --network ic
```

---

## Testing

### Query Pool

```bash
dfx canister call hz536-gyaaa-aaaao-qkufa-cai query_pool_blst_utxos '()' --network ic
```

### Test Deposit

```bash
# 1. Get deposit address
dfx canister call hz536-gyaaa-aaaao-qkufa-cai pre_deposit '(50_000 : nat64)' --network ic

# 2. Send BTC
bitcoin-cli -testnet4 sendtoaddress "tb1p97hz..." 0.0005

# 3. Wait for 6 confirmations and check minting
```

---

## Fee Structure

| Operation | Fee | Notes |
|-----------|-----|-------|
| BTC Deposit | 0% | No deposit fees |
| Asset Swaps | 2% | Applied on ETH/USDC/USDT → BTC conversions |
| BLST Minting | 0% | Gas absorbed by protocol |
| Staking Rewards | 2% | Deducted from BABY distribution | 50% Revenue fees from Staking are Staked on Babylon, rewards distributed to BLST holders.
| Redemption | 0% | No exit fees | (See Babylon unbonding rules)

---

## Infrastructure

### Bitcoin Testnet4
- **Faucet:** https://mempool.space/testnet4/faucet
- **Explorer:** https://mempool.space/testnet4

### ICP Canisters
- **Exchange:** `hz536-gyaaa-aaaao-qkufa-cai`
- **Frontend:** `vf7wt-caaaa-aaaad-ab6da-cai`
- **Subnet:** `fuqsr-in2lc-zbcjj-ydmcw-pzq7h-4xm2z-pto4i-dcyee-5z4rz-x63ji-nae` (required for REE)

### REE Infrastructure
- **Orchestrator:** `hvyp5-5yaaa-aaaao-qjxha-cai`
- **Runes Indexer:** `f2dwm-caaaa-aaaao-qjxlq-cai`

### Omnity Network
- **Hub:** `bkyz2-fmaaa-aaaaa-qaaaq-cai`
- **Bitcoin Customs:** `be2us-64aaa-aaaaa-qaabq-cai`
- **CosmWasm Route:** `ystyg-kaaaa-aaaar-qaieq-cai`

### Babylon Testnet
- **RPC:** https://babylon-testnet-rpc.polkachu.com
- **API:** https://babylon-testnet-api.polkachu.com
- **Network:** bbn-test-6

---

## Implementation Status

### Completed
- ✅ BLST Rune etched ()
- ✅ Pool UTXO consolidation (multi-input signing)
- ✅ ICP Chain Key Bitcoin signing
- ✅ DEX Aggregator UI

### In Progress
- 🔄 Deposit detection and BLST minting
- 🔄 Babylon staking integration (skeleton complete)

### Planned
- ⏳ Omnity Hub staking proof submission
- ⏳ BABY reward querying via Omnity
- ⏳ Reward distribution (BABY → BTC conversion)
- ⏳ Redemption flow (burn BLST → receive BTC + rewards)
- ⏳ Internet Identity authentication

---

## Known Limitations

This is a testnet:
- Hardcoded UTXO references (production needs dynamic management)
- Manual consolidation trigger (production automates)
- Single pool (production supports multiple pools/durations)
- Demo authentication (production uses Internet Identity)
- DEX swaps (aggregator shows routes)

---

## Security

### Trustless Design
- **Custody:** ICP Chain Key threshold ECDSA (no single point of failure)
- **Bridge:** Omnity Hub light client verification (no oracles)
- **Enforcement:** Bitcoin L1 timelock scripts (consensus-enforced)

### Audit Status
⚠️ **NOT AUDITED** - Testnet only. Do not use on mainnet without professional security audit.

---

## References

### Documentation
- **ICP Bitcoin Integration:** https://internetcomputer.org/docs/build-on-btc/btc-api
- **ICP Bitcoin Runes:** https://internetcomputer.org/docs/build-on-btc/runes
- **REE First Exchange:** https://docs.omnity.network/docs/REE/first-exchange
- **Omnity CosmWasm:** https://docs.omnity.network/docs/Omnity-Hub/cosmwasm
- **Babylon Staking:** https://docs.babylonlabs.io/developers/dapps/simple_staking_dapp/

### Repositories
- **ree-client-ts-sdk:** https://github.com/octopus-network/ree-client-ts-sdk
- **ree-exchange-sdk:** https://github.com/octopus-network/ree-exchange-sdk
- **btc-staking-ts:** https://github.com/babylonlabs-io/btc-staking-ts
- **richswap-canister:** https://github.com/octopus-network/richswap-canister

---

## License

MIT License

---

**Built with:** Internet Computer + REE + Babylon + Omnity + Osmosis
