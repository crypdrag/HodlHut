# Babylon Integration Research - hodlprotocol
## Complete Technical Architecture for Bitcoin Liquid Staking on ICP

**Created:** 2025-10-12 (DAY 1 - Hours 2-5)
**Status:** Research Complete - Ready for Backend Implementation

---

## Executive Summary

hodlprotocol will be the **first Bitcoin liquid staking protocol on Internet Computer** that integrates:
1. **Babylon Protocol** - Native Bitcoin staking using covenant scripts
2. **REE (Rune Execution Environment)** - Minting BLST Runes on Bitcoin L1
3. **Omnity Hub** - Cross-chain messaging between ICP ↔ Bitcoin ↔ Babylon
4. **ICP Chain Fusion** - Chain Key cryptography for Bitcoin transaction signing

---

## Integration Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Flow                               │
│  1. Connect Bitcoin wallet (Unisat/Xverse)                      │
│  2. Select stake amount + duration                              │
│  3. Sign PSBT                                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              hodlprotocol_backend (ICP Canister)                │
│  - Construct Bitcoin staking transaction (btc-staking-ts)      │
│  - Collect upfront protocol fee                                 │
│  - Submit to Omnity Hub for cross-chain relay                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Omnity Hub (ICP Canister)                    │
│  Canister ID: bkyz2-fmaaa-aaaaa-qaaaq-cai                       │
│  - Route transaction to Bitcoin customs                         │
│  - Cross-chain message verification                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Bitcoin Network (L1)                           │
│  - Broadcast staking transaction (covenant + timelock)         │
│  - Confirm staking UTXO on-chain                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Babylon Chain (Cosmos SDK)                         │
│  RPC: https://rpc.testnet3.babylonchain.io                      │
│  - Register stake with finality provider                        │
│  - Begin earning BABY rewards (epochised)                       │
│  - Submit IBC messages back to ICP                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│            REE Exchange (Runes on Bitcoin L1)                   │
│  - Mint BLST Rune representing liquid staking position         │
│  - Transfer BLST to user's Bitcoin address                      │
│  - Enable BLST trading/lending while BTC remains staked         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│            Runes Indexer (ICP Canister)                         │
│  Mainnet: kzrva-ziaaa-aaaar-qamyq-cai                           │
│  Testnet4: f2dwm-caaaa-aaaao-qjxlq-cai                          │
│  - Index BLST Rune balances                                     │
│  - Provide query API for frontend display                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## SDK Integration Details

### 1. btc-staking-ts SDK (Babylon Staking Transaction Construction)

**Repository:** https://github.com/babylonlabs-io/btc-staking-ts

**Purpose:** Construct Bitcoin covenant-based staking transactions with timelock and slashing conditions.

**Key Class:** `BabylonBtcStakingManager`

**Required Inputs:**
```typescript
interface StakingInputs {
  stakerBtcAddress: string;          // User's Bitcoin address
  stakerCompressedPubKey: string;     // 33-byte compressed public key
  finalityProviderKeys: string[];     // FP public keys (from registry)
  stakingAmount: number;              // Amount in satoshis
  timelockDuration: number;           // Duration in Bitcoin blocks
  btcNetwork: "mainnet" | "testnet";
  stakingParams: GlobalParams;        // From Babylon API
}
```

**Transaction Flow:**
1. **BTC Staking Transaction** - Locks BTC with covenant script
2. **Slashing Transaction** - Enables punishment for misbehavior
3. **Unbonding Transaction** - Initiated by user to exit stake
4. **Unbonding Slashing Transaction** - Protects network during unbonding

**Integration Pattern:**
```typescript
const stakingManager = new BabylonBtcStakingManager(
  btcNetwork,
  stakingParams,
  btcProvider,
  bbnProvider
);

const stakingTx = await stakingManager.createStakingTransaction({
  stakerAddress,
  stakerPubKey,
  finalityProviders,
  amount,
  timelock
});

// Returns PSBT for user to sign
const psbt = stakingTx.toPSBT();
```

**Critical Notes:**
- Transaction requires 4 signatures across different stages
- Uses PSBT (Partially Signed Bitcoin Transaction) format
- Covenant scripts enforce slashing conditions on Bitcoin L1

---

### 2. ree-exchange-sdk (LST Minting on Bitcoin Runes)

**Repository:** https://github.com/octopus-network/ree-exchange-sdk

**Purpose:** Facilitate Runes-based liquid staking token (BLST) minting via REE Exchange.

**Architecture:**
- Extends Bitcoin programmability using ICP Chain Key cryptography
- Uses PSBT for exchange transaction construction
- Pool UTXOs signed by ICP Chain Key on behalf of exchange

**High-Level Flow:**
1. Construct PSBT with user input + exchange metadata
2. Submit to REE orchestrator for validation
3. Exchange service signs pool UTXO using ICP Chain Key
4. Broadcast validated transaction to Bitcoin network

**Installation:**
```toml
[dependencies]
ree-exchange-sdk = "0.10"
```

**Integration Pattern:**
```rust
// Example: Mint BLST Rune after successful Babylon stake
let exchange_request = ExchangeRequest {
    input_utxo: babylon_stake_utxo,
    output_rune: "BLST",
    output_amount: staked_amount, // 1:1 ratio
    user_address: staker_btc_address,
};

let psbt = ree_exchange_sdk::construct_mint_psbt(exchange_request)?;
let signed_tx = sign_with_chain_key(psbt).await?;
broadcast_to_bitcoin(signed_tx).await?;
```

**Critical Notes:**
- LST minting requires successful Babylon stake confirmation
- BLST Rune is 1:1 representation of staked BTC position
- Exchange metadata embedded in Bitcoin transaction
- REE orchestrator validates exchange logic off-chain before signing

---

### 3. ree-client-ts-sdk (Runes Operations Frontend)

**Repository:** https://github.com/octopus-network/ree-client-ts-sdk

**Purpose:** TypeScript SDK for querying Runes balances, creating Runes transactions, and managing multi-intention swaps.

**Key Features:**
- Bitcoin and Rune protocol integration
- React hooks and providers for frontend
- Type-safe transaction construction
- Support for complex multi-intention transactions

**Initialization:**
```typescript
import { ReeClient, Network } from 'ree-client-ts-sdk';

const config: Config = {
  network: Network.Testnet, // or Network.Mainnet
  maestroApiKey: "your-maestro-api-key",
};

const client = new ReeClient(config);
```

**Runes Query Methods:**
```typescript
// Get BLST Rune UTXOs for user
const blstUtxos = await client.getRuneUtxos(
  userAddress,
  "BLST_RUNE_ID"
);

// Get BLST Rune Balance
const blstBalance = await client.getRuneBalance(
  userAddress,
  "BLST_RUNE_ID"
);

// Get BLST Rune Information
const blstInfo = await client.getRuneInfo("BLST_RUNE_ID");

// Search for BLST Runes
const blstRunes = await client.searchRunes("BLST");
```

**Transaction Creation (for BLST transfers/swaps):**
```typescript
const transaction = await client.createTransaction({
  address: userRuneAddress,       // bc1p... (Taproot)
  paymentAddress: userBtcAddress  // bc1q... (SegWit)
});

transaction.addIntention({
  poolAddress: "bc1p...",
  inputCoins: [{
    coin: { id: "BLST_RUNE_ID", value: BigInt(1000) },
    from: userAddress
  }],
  outputCoins: [{
    coin: { id: "BTC_RUNE_ID", value: BigInt(500) },
    to: userAddress
  }],
  action: "swap",
  nonce: BigInt(Date.now())
});

const { psbt } = await transaction.build();
const signedPsbt = await wallet.signPsbt(psbt);
const result = await transaction.send(signedPsbt.toHex());
```

**Integration for hodlprotocol:**
- Query user's BLST balance for "My Stakes" page
- Display BLST value in BTC equivalent
- Enable BLST → BTC unbonding transactions
- Show BLST transaction history

---

### 4. Runes Indexer (Balance & Transaction Queries)

**Repository:** https://github.com/octopus-network/runes-indexer

**Purpose:** Index and query Runes balances, transaction history, and token metadata.

**Canister IDs:**
- **Mainnet:** `kzrva-ziaaa-aaaar-qamyq-cai`
- **Testnet4:** `f2dwm-caaaa-aaaao-qjxlq-cai`

**Key API Methods:**

#### Get Latest Block
```rust
get_latest_block() -> BlockInfo
```
Returns: Block height and hash of latest indexed Bitcoin block

#### Get Rune Details
```rust
get_rune(spaced_rune_name: String) -> RuneInfo
get_rune_by_id(rune_id: String) -> RuneInfo
```
Returns: Comprehensive rune information including:
- Confirmations
- Mints
- Etching transaction
- Divisibility
- Block details
- Symbol

#### Get Rune Balances
```rust
get_rune_balances_for_outputs(outpoints: Vec<String>) -> Vec<RuneBalance>
```
Returns: Rune balance details for specific UTXOs including:
- Confirmations
- Amount
- Rune ID
- Symbol

**Integration for hodlprotocol:**
```typescript
// Query BLST balance for user
const userUtxos = await bitcoin.getUtxos(userAddress);
const outpoints = userUtxos.map(u => `${u.txid}:${u.vout}`);

const balances = await indexerCanister.get_rune_balances_for_outputs(outpoints);
const blstBalance = balances.find(b => b.rune_id === BLST_RUNE_ID);

// Display in UI
const blstAmount = blstBalance.amount / Math.pow(10, blstBalance.divisibility);
```

---

### 5. Omnity Hub (Cross-Chain Messaging)

**Repository:** https://github.com/octopus-network/omnity-indexer

**Canister IDs:**
- **Omnity Hub:** `bkyz2-fmaaa-aaaaa-qaaaq-cai`
- **Customs Bitcoin:** `be2us-64aaa-aaaaa-qaabq-cai`
- **Routes ICP:** `br5f7-7uaaa-aaaaa-qaaca-cai`

**Architecture:**
The Omnity Indexer has three components:
1. **Synchronizer** - Syncs data from Omnity canisters to database
2. **Index Database** - Stores cross-chain transaction states
3. **API Service** - Provides query interface for transaction status

**Purpose:** Route Bitcoin staking transactions from ICP to Babylon chain.

**Integration Pattern:**
```rust
// Submit Bitcoin staking transaction via Omnity Hub
let omnity_request = OmnityRequest {
    source_chain: "ICP",
    destination_chain: "Babylon",
    transaction_data: signed_staking_tx,
    callback: "hodlprotocol_backend.on_stake_confirmed",
};

let tx_id = omnity_hub_canister.submit_cross_chain_tx(omnity_request).await?;

// Query transaction status
let status = omnity_hub_canister.get_tx_status(tx_id).await?;
```

**Cross-Chain Transaction Lifecycle:**
1. ICP canister submits Bitcoin tx to Omnity Hub
2. Omnity Hub validates and routes to Bitcoin Customs canister
3. Bitcoin Customs broadcasts to Bitcoin network
4. Babylon chain monitors Bitcoin network for stake confirmation
5. Babylon chain sends IBC message back to ICP via Omnity Hub
6. ICP canister receives confirmation and triggers BLST minting

---

### 6. IBC Protocol (Inter-Blockchain Communication)

**Repository:** https://github.com/octopus-network/ibc-proto-rs

**Purpose:** Rust crate for Cosmos SDK IBC structs used in cross-chain messaging.

**Use Cases:**
- Building IBC relayers
- Developing IBC modules
- Consuming IBC data structures in Rust canisters

**Technical Requirements:**
- Rust 1.56.1+
- Buf CLI

**Integration for hodlprotocol:**
- Receive IBC acknowledgments from Babylon chain
- Parse Babylon staking confirmation messages
- Handle Babylon reward distribution messages
- Process unbonding completion notifications

**Documentation:** https://docs.rs/ibc-proto/

---

## Babylon Protocol Technical Details

### Network Configuration

**Babylon Testnet (Phase-2):**
- **RPC Endpoint:** https://rpc.testnet3.babylonchain.io
- **Status Endpoint:** https://rpc.testnet3.babylonchain.io/status
- **Testnet Name:** `bbn-test-5`
- **Launch Date:** January 8, 2025 (block production started 9AM UTC)

**Token Details:**
- **Denomination:** `ubbn` (micro BABY)
- **Decimals:** 6
- **Human-Readable:** `BABY`

**Staking Limits (Testnet):**
- **Minimum Stake:** 0.0005 Signet BTC (~50,000 satoshis)
- **Maximum Stake:** 350 Signet BTC per transaction

**Finality Providers:**
- **Active Set Size:** 100 slots (capped)
- **Registration:** Required before stakes can delegate
- **Commission:** Configurable by FP operator

**Unbonding:**
- **Duration:** ~100 Bitcoin blocks (~16-17 hours average)
- **Mechanism:** Bitcoin Timestamping protocol enables fast unbonding
- **Confirmation:** Depends on Bitcoin block confirmations

### Staking Mechanism

**Epochised Staking:**
- Staking transactions execute at epoch's end
- Epoch interval defined in `x/epoching` module
- Staking messages queued in delayed execution queue

**Critical UX Consideration:**
- Warn users that staking activates only at epoch end
- Transferring funds before epoch completion causes staking failure
- Use `LastEpochMsgs` query to display pending stakes

**Staking Lifecycle:**
1. **Stake Creation:**
   - User constructs PSBT with btc-staking-ts
   - Signs with Bitcoin wallet
   - Broadcasts to Bitcoin network
   - Babylon monitors for confirmation

2. **Stake Activation:**
   - Bitcoin transaction confirmed (minimum 6 confirmations)
   - Babylon chain registers stake at next epoch boundary
   - Stake becomes active and starts earning BABY rewards

3. **Reward Distribution:**
   - Rewards distributed via Cosmos SDK staking module
   - Epochised distribution (not per-block)
   - Rewards claimable via Babylon wallet

4. **Unbonding:**
   - User initiates unbonding transaction
   - Unbonding period: ~100 Bitcoin blocks
   - Bitcoin Timestamping provides proof of unbonding state
   - BTC unlocked after unbonding period + confirmation

5. **Slashing:**
   - Automatic stake slashing for protocol violations
   - Slashing transaction broadcasted to Bitcoin network
   - Slashed funds sent to burn address
   - Configurable slashing penalties

### Finality Provider Selection

**Frontend Requirements:**
- Query finality provider registry from Babylon RPC
- Display FP details: name, commission rate, voting power, uptime
- Allow user to select FP for delegation
- Warn if FP is not in active set (stake won't be active)

**Backend Requirements:**
- Validate FP public key before constructing staking transaction
- Ensure FP is registered on Babylon chain
- Check FP status (active, jailed, unbonding)

**API Endpoint:**
```bash
curl https://rpc.testnet3.babylonchain.io/finality_providers
```

---

## Covenant Script Architecture

**Babylon Staking Script:**
Bitcoin staking uses covenant scripts that enforce:
1. **Timelock Constraint:** BTC locked until specified block height
2. **Slashing Path:** Alternative spending path if validator misbehaves
3. **Unbonding Path:** User-initiated early exit with penalty period

**Script Structure:**
```
OP_IF
  <timelock_blocks> OP_CHECKSEQUENCEVERIFY OP_DROP
  <staker_pubkey> OP_CHECKSIG
OP_ELSE
  <covenant_committee_multisig> OP_CHECKSIG
OP_ENDIF
```

**Security Properties:**
- BTC remains on Bitcoin L1 (no bridging)
- Slashing enforced by Bitcoin consensus
- Covenant committee provides additional security
- No trust assumptions beyond Bitcoin network

---

## Integration Checklist for Backend Implementation

### Phase 1: Core Staking (DAY 2-3)
- [ ] Integrate btc-staking-ts SDK in Rust canister (via IC HTTP outcalls)
- [ ] Implement PSBT construction endpoint
- [ ] Query Babylon global parameters (staking limits, timelock ranges)
- [ ] Query finality provider registry
- [ ] Validate user inputs (amount, duration, FP selection)
- [ ] Store pending stake state in canister stable memory

### Phase 2: Omnity Hub Integration (DAY 3-4)
- [ ] Integrate with Omnity Hub canister (`bkyz2-fmaaa-aaaaa-qaaaq-cai`)
- [ ] Submit signed Bitcoin staking tx to Omnity Hub
- [ ] Poll transaction status via Omnity Hub API
- [ ] Handle cross-chain confirmation callbacks
- [ ] Implement retry logic for failed submissions

### Phase 3: BLST Minting (DAY 4-5)
- [ ] Integrate ree-exchange-sdk for LST minting
- [ ] Construct BLST mint PSBT after stake confirmation
- [ ] Submit to REE orchestrator for validation
- [ ] Sign with ICP Chain Key
- [ ] Broadcast BLST mint transaction to Bitcoin network
- [ ] Update user stake record with BLST Rune ID

### Phase 4: Runes Indexer Integration (DAY 5)
- [ ] Integrate with Runes Indexer canister (testnet4: `f2dwm-caaaa-aaaao-qjxlq-cai`)
- [ ] Query BLST balance for user address
- [ ] Display BLST holdings in "My Stakes" page
- [ ] Implement BLST → BTC unbonding flow
- [ ] Show BLST transaction history

### Phase 5: Babylon Chain Integration (DAY 5-6)
- [ ] Configure Babylon RPC endpoint (`https://rpc.testnet3.babylonchain.io`)
- [ ] Query epochised staking state
- [ ] Display pending stakes (not yet activated)
- [ ] Query BABY reward balance
- [ ] Implement reward claim flow (if in scope)

### Phase 6: Platform Treasury Integration (DAY 6)
- [ ] Calculate upfront protocol fee (research required)
- [ ] Collect fee before Babylon stake submission
- [ ] Call `platform_treasury.deposit_fees()` with BabylonStaking source
- [ ] Ensure fee doesn't erode promised APY

### Phase 7: Error Handling & UX (DAY 6-7)
- [ ] Handle Bitcoin transaction failures
- [ ] Handle Omnity Hub routing failures
- [ ] Handle REE orchestrator rejections
- [ ] Handle Babylon epoch boundary delays
- [ ] Implement stake status polling for frontend
- [ ] Display clear error messages for each failure mode

---

## Research Gaps & Next Steps

### 1. Protocol Fee Structure (CRITICAL)
**Question:** What upfront fee can we charge without eroding promised APY?

**Variables:**
- Babylon testnet APY: ~8-12% (needs verification)
- hodlprotocol advertised APY: TBD (e.g., 8%)
- Protocol fee margin: Difference between actual and advertised APY

**Example Calculation:**
```
Actual Babylon APY: 10%
hodlprotocol Advertised APY: 8%
Protocol Fee Margin: 2%

For 1 BTC staked for 1 year:
User receives: 0.08 BTC (8% APY)
Protocol collects: 0.02 BTC (2% upfront)
```

**Action:** Create `docs/BABYLON_FEE_RESEARCH.md` with detailed analysis

### 2. Finality Provider Selection Strategy
**Question:** Should we:
- Let users choose FP (decentralized)?
- Auto-select highest-performing FP (UX optimized)?
- Distribute stakes across multiple FPs (risk mitigation)?

**Action:** Decide UX pattern for FP selection in frontend design

### 3. BLST Rune Etching
**Question:** Who etches the BLST Rune on Bitcoin L1?

**Options:**
- hodlprotocol etches BLST at launch (centralized, cheaper)
- REE Exchange etches BLST (decentralized, integrated)

**Action:** Coordinate with Omnity team on BLST etching strategy

### 4. Unbonding UX Flow
**Question:** How do users unbond?

**Options:**
- Burn BLST Rune → Trigger Bitcoin unbonding tx
- Direct Bitcoin unbonding tx (bypassing BLST)
- Both options available (user choice)

**Action:** Design unbonding user flow in frontend mockups

---

## Testnet Setup Requirements (Hours 6-7)

### 1. Bitcoin Testnet/Signet Faucet
- Get testnet BTC from: https://signet.bc-2.jp/ (Signet faucet)
- Need minimum 0.001 BTC for testing stakes
- Additional BTC for transaction fees

### 2. Babylon Testnet Access
- No registration required for testnet3
- RPC endpoint: https://rpc.testnet3.babylonchain.io
- Verify connectivity via `/status` endpoint

### 3. REE Testnet Access
- Verify REE Exchange testnet availability
- Coordinate with Omnity team for testnet onboarding

### 4. Omnity Hub Testnet
- Hub canister: `bkyz2-fmaaa-aaaaa-qaaaq-cai`
- Bitcoin customs: `be2us-64aaa-aaaaa-qaabq-cai`
- Test cross-chain message submission

### 5. Wallet Setup
- Install Unisat wallet (testnet mode)
- Install Xverse wallet (testnet mode)
- Configure testnet Bitcoin addresses
- Test PSBT signing flow

---

## Critical Technical Decisions

### 1. Where to Run btc-staking-ts?
**Options:**
- **Option A:** Frontend constructs PSBT, backend validates
  - Pros: Less backend complexity
  - Cons: Exposes staking logic to client, security risk

- **Option B:** Backend constructs PSBT via IC HTTP outcalls
  - Pros: Secure, backend controls fee calculation
  - Cons: More complex, HTTP outcalls cost cycles

**Recommendation:** Option B (backend-controlled PSBT construction)

### 2. How to Store Stake State?
**Options:**
- **Option A:** Canister stable memory only
  - Pros: Simple, no external dependencies
  - Cons: Limited query performance

- **Option B:** Canister stable memory + Omnity Indexer queries
  - Pros: Fast queries, cross-chain visibility
  - Cons: Dependency on external indexer

**Recommendation:** Option B (hybrid approach)

### 3. How to Handle Epoch Boundaries?
**Question:** Staking activates at epoch end. How to communicate this to users?

**UX Pattern:**
- Display "Pending Activation" state in "My Stakes"
- Show countdown to next epoch boundary
- Query `LastEpochMsgs` from Babylon RPC
- Update state when epoch completes

**Backend:**
- Store epoch boundary timestamps in canister
- Poll Babylon RPC for epoch updates
- Trigger state transitions when epoch completes

---

## Next Steps (Hours 6-7)

1. **Testnet Setup**
   - Get testnet BTC from Signet faucet
   - Test Babylon RPC connectivity
   - Verify Omnity Hub canister access
   - Test Bitcoin wallet PSBT signing

2. **Frontend Shell** (Hour 8)
   - Create Landing page structure
   - Create Stake BTC page structure
   - Add navigation menu
   - Verify Tailwind v4 styling

3. **Backend Implementation** (DAY 2-7)
   - Follow integration checklist above
   - Implement Rust canisters step-by-step
   - Test each integration point thoroughly

---

*Last Updated: 2025-10-12 - DAY 1 Hours 2-5 Research Complete*
