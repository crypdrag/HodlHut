# REE Architecture - Corrected Understanding for hodlprotocol

**Created:** 2025-10-12 (DAY 1 - Post Omnity Docs Review)
**Status:** Definitive Architecture Guide

---

## Critical Clarification: What is REE?

**REE (Runes Exchange Environment)** is the **infrastructure protocol**, NOT a specific exchange.

### Analogy:
- **REE** = Ethereum (protocol/platform)
- **hodlprotocol** = Uniswap (dApp built ON the protocol)
- **RichSwap** = Another dApp built ON REE (like SushiSwap on Ethereum)

### What This Means for hodlprotocol:
- We ARE building a "REE Exchange" (an exchange/dApp on REE infrastructure)
- We ARE NOT "integrating with REE Exchange" (there's no separate entity)
- We USE ree-exchange-sdk to build our exchange canister
- We ETCH our own BLST Rune on Bitcoin L1
- We MANAGE our own pools and transaction logic

---

## REE Infrastructure Components

### 1. REE Orchestrator (Core Infrastructure)
**Canister IDs:**
- **Mainnet:** `kqs64-paaaa-aaaar-qamza-cai`
- **Testnet:** `hvyp5-5yaaa-aaaao-qjxha-cai`

**Purpose:** Manages exchange program execution, validates requests, schedules execution, reports results

**Key APIs:**
```rust
// Core transaction execution
invoke(InvokeArgs) -> InvokeResult

// UTXO queries
get_zero_confirmed_utxos_of_address(address: String) -> Vec<Utxo>

// Fee estimation
estimate_min_tx_fee(EstimateMinTxFeeArgs) -> u64
```

**Transaction Flow:**
1. Exchange canister (hodlprotocol) constructs IntentionSet
2. User signs PSBT via Bitcoin wallet
3. Exchange submits to Orchestrator via `invoke()`
4. Orchestrator validates transaction
5. Orchestrator coordinates DPS (Decentralized PSBT Signing)
6. Orchestrator broadcasts to Bitcoin network
7. Orchestrator reports execution result to exchange canister

### 2. Runes Indexer (Query Infrastructure)
**Canister IDs:**
- **Mainnet:** `kzrva-ziaaa-aaaar-qamyq-cai`
- **Testnet4:** `f2dwm-caaaa-aaaao-qjxlq-cai`

**Purpose:** Index Runes on Bitcoin L1, provide balance and metadata queries

**Key APIs:**
```rust
// Get latest indexed block
get_latest_block() -> BlockInfo

// Get Rune metadata
get_rune(spaced_rune_name: String) -> RuneInfo
get_rune_by_id(rune_id: String) -> RuneInfo

// Get balances for specific UTXOs
get_rune_balances_for_outputs(outpoints: Vec<String>) -> Vec<RuneBalance>

// Get etching transaction info
get_etching(tx_id: String) -> EtchingInfo
```

**Integration for hodlprotocol:**
```rust
// Query user's BLST Rune balance
let user_utxos = get_bitcoin_utxos(user_address);
let outpoints: Vec<String> = user_utxos.iter()
    .map(|u| format!("{}:{}", u.txid, u.vout))
    .collect();

let balances = runes_indexer_canister
    .get_rune_balances_for_outputs(outpoints)
    .await?;

let blst_balance = balances.iter()
    .find(|b| b.rune_id == BLST_RUNE_ID)
    .map(|b| b.amount)
    .unwrap_or(0);
```

### 3. Omnity Hub (Cross-Chain Infrastructure)
**Hub Canister:** `bkyz2-fmaaa-aaaaa-qaaaq-cai`

**Purpose:** Cross-chain interoperability routing between ICP, Bitcoin, Solana, EVM, Cosmos chains (including Babylon)

**Supported Settlement Chains:**
- Bitcoin Runes
- ICP
- Solana
- Dogecoin
- Ton

**Supported Execution Chains:**
- ICP
- Solana
- EVM networks (Ethereum, etc.)
- CosmWasm (Babylon, Osmosis, etc.)
- Ton

**Key APIs:**
```rust
// Submit cross-chain transaction
generate_ticket(ticket_args: TicketArgs) -> TicketId

// Query transaction status
sync_tickets(offset: u64, limit: u64) -> Vec<Ticket>
release_token_status(ticket_id: String) -> ReleaseStatus

// Chain metadata
get_chain_metas() -> Vec<ChainMeta>
get_token_metas() -> Vec<TokenMeta>
```

**Cross-Chain Transaction Lifecycle:**
1. **Submitting** - Ticket created
2. **Pending** - Awaiting blockchain confirmation
3. **Signing** - Multi-party signing in progress
4. **Sending** - Transaction being broadcast
5. **Submitted** - Transaction sent to destination chain
6. **Confirmed** - Final confirmation received

**CosmWasm Integration (for Babylon):**
- Canister ID: `ystyg-kaaaa-aaaar-qaieq-cai`
- Light client verification for Cosmos chains
- IBC protocol support
- Methods:
  - `get_btc_mint_address()` - Generate cross-chain deposit address
  - `update_balance_after_finalization()` - Confirm transaction
  - `redeem()` - Withdraw assets
  - `generate_ticket()` - Create cross-chain tx

---

## hodlprotocol Exchange Canister Architecture

### Required Canister Structure

**hodlprotocol IS a REE Exchange**, therefore our canister must implement the REE Exchange API:

#### Required Methods (REE Exchange Interface):
```rust
// Pool management
#[query]
fn get_pool_list() -> Vec<PoolInfo>;

#[query]
fn get_pool_info(pool_address: String) -> Option<PoolInfo>;

// Transaction preparation
#[update]
fn pre_stake(
    user_btc_address: String,
    amount: u64,
    duration: u32,
    finality_provider: String
) -> StakeOffer;

// Transaction execution callback (called by REE Orchestrator)
#[update]
fn execute_tx(tx_id: String, execution_result: ExecutionResult) -> ();

// Blockchain state management (called by REE Orchestrator)
#[update]
fn new_block(block_height: u64, block_hash: String) -> ();

#[update]
fn rollback_tx(tx_id: String) -> ();
```

### Pool Architecture for hodlprotocol

**Pool Types:**
1. **Staking Pool** - Receives BTC for Babylon staking
2. **Unbonding Pool** - Receives BTC from Babylon unbonding
3. **BLST/BTC Liquidity Pool** (future) - AMM pool for BLST trading

**Pool State Management:**
```rust
#[derive(CandidType, Deserialize, Clone)]
pub struct StakingPool {
    pub pool_address: String,        // Bitcoin address (Taproot P2TR)
    pub total_staked: u64,            // Total BTC staked (satoshis)
    pub active_stakes: Vec<StakePosition>,
    pub pending_stakes: Vec<PendingStake>,
    pub babylon_finality_provider: String,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct StakePosition {
    pub user_principal: Principal,
    pub btc_address: String,
    pub stake_amount: u64,
    pub stake_tx_id: String,
    pub babylon_tx_proof: String,     // Proof of Babylon registration
    pub blst_rune_utxo: String,       // UTXO holding BLST Rune
    pub timelock_duration: u32,
    pub unbonding_block: Option<u64>,
    pub status: StakeStatus,
}

#[derive(CandidType, Deserialize, Clone)]
pub enum StakeStatus {
    PendingBitcoinConfirmation,
    PendingBabylonRegistration,
    Active,
    Unbonding,
    Completed,
}
```

### Transaction Flow for Babylon Staking

#### 1. User Initiates Stake
```rust
#[update]
async fn pre_stake(
    user_btc_address: String,
    amount: u64,
    duration: u32,
    finality_provider: String
) -> StakeOffer {
    // Validate inputs
    validate_stake_params(amount, duration)?;

    // Collect protocol fee upfront
    let protocol_fee = calculate_protocol_fee(amount, duration);

    // Construct Babylon staking transaction
    let staking_tx = construct_babylon_staking_tx(
        user_btc_address.clone(),
        amount - protocol_fee,
        duration,
        finality_provider.clone()
    ).await?;

    // Get staking pool address
    let pool_address = get_staking_pool_address()?;

    // Construct IntentionSet for REE
    let intention_set = IntentionSet {
        pool_address: pool_address.clone(),
        input_coins: vec![Coin {
            id: "BTC".to_string(),
            value: amount,
        }],
        output_coins: vec![],  // BTC goes to Babylon covenant script
        action: "stake_babylon".to_string(),
        metadata: serde_json::to_string(&BabylonStakeMetadata {
            finality_provider,
            timelock_duration: duration,
            staking_tx_psbt: staking_tx.to_base64(),
        })?,
    };

    // Return offer for user to sign
    StakeOffer {
        intention_set,
        expected_blst: amount - protocol_fee,
        protocol_fee,
        estimated_apy: get_babylon_apy().await?,
    }
}
```

#### 2. User Signs PSBT in Wallet
```typescript
// Frontend code
const offer = await hodlprotocolCanister.pre_stake(
  userBtcAddress,
  amount,
  duration,
  selectedFP
);

// User signs PSBT via Bitcoin wallet
const signedPsbt = await window.unisat.signPsbt(offer.psbt_base64);

// Submit to REE Orchestrator
const result = await reeOrchestrator.invoke({
  exchange_canister: hodlprotocolCanisterId,
  intention_set: offer.intention_set,
  signed_psbt: signedPsbt,
});
```

#### 3. REE Orchestrator Executes Transaction
- Validates PSBT signatures
- Coordinates additional signatures via DPS
- Broadcasts to Bitcoin network
- Monitors for confirmations
- Calls hodlprotocol's `execute_tx()` with result

#### 4. hodlprotocol Processes Confirmation
```rust
#[update]
async fn execute_tx(tx_id: String, execution_result: ExecutionResult) -> () {
    match execution_result.status {
        ExecutionStatus::Confirmed => {
            // Bitcoin transaction confirmed
            let stake = get_pending_stake(&tx_id)?;

            // Submit to Babylon via Omnity Hub
            let babylon_ticket = submit_to_babylon(
                stake.clone(),
                execution_result.bitcoin_tx_id
            ).await?;

            // Update state
            update_stake_status(
                &tx_id,
                StakeStatus::PendingBabylonRegistration
            );

            // Store Babylon ticket for monitoring
            store_babylon_ticket(tx_id.clone(), babylon_ticket);
        },
        ExecutionStatus::Failed(error) => {
            // Handle failure, refund user if needed
            handle_stake_failure(&tx_id, error);
        },
    }
}
```

#### 5. Monitor Babylon Registration
```rust
async fn monitor_babylon_tickets() {
    let pending_tickets = get_pending_babylon_tickets();

    for ticket in pending_tickets {
        let status = omnity_hub_canister
            .release_token_status(ticket.id)
            .await?;

        match status {
            ReleaseStatus::Confirmed => {
                // Babylon registration confirmed
                // Mint BLST Rune
                mint_blst_rune(ticket.stake_id).await?;
            },
            ReleaseStatus::Failed(error) => {
                // Handle Babylon registration failure
                handle_babylon_failure(ticket.stake_id, error);
            },
            _ => {
                // Still pending, continue monitoring
            }
        }
    }
}
```

#### 6. Mint BLST Rune
```rust
async fn mint_blst_rune(stake_id: String) -> Result<String, String> {
    let stake = get_stake_position(&stake_id)?;

    // Construct BLST minting transaction
    let mint_intention = IntentionSet {
        pool_address: get_blst_mint_pool_address()?,
        input_coins: vec![],  // No input (minting new Rune)
        output_coins: vec![Coin {
            id: BLST_RUNE_ID.to_string(),
            value: stake.stake_amount,
        }],
        action: "mint_blst".to_string(),
        metadata: serde_json::to_string(&BLSTMetadata {
            stake_tx_id: stake.stake_tx_id.clone(),
            babylon_tx_proof: stake.babylon_tx_proof.clone(),
            timelock_duration: stake.timelock_duration,
            unbonding_block: None,
        })?,
    };

    // Submit to REE Orchestrator
    let result = ree_orchestrator_canister
        .invoke(InvokeArgs {
            exchange_canister: ic_cdk::id(),
            intention_set: mint_intention,
        })
        .await?;

    // Update stake record with BLST UTXO
    update_stake_blst_utxo(&stake_id, result.output_utxo);

    Ok(result.tx_id)
}
```

---

## Unbonding Flow with BLST Metadata

### BLST Rune Metadata Structure
```rust
#[derive(CandidType, Deserialize, Clone)]
pub struct BLSTMetadata {
    pub stake_tx_id: String,          // Bitcoin staking tx
    pub babylon_tx_proof: String,     // Proof of Babylon registration
    pub timelock_duration: u32,       // Lock duration in blocks
    pub unbonding_block: Option<u64>, // Block when unbonding initiated
}
```

### Unbonding Process

#### 1. User Initiates Unbonding
```rust
#[update]
async fn initiate_unbonding(
    user_principal: Principal,
    blst_rune_utxo: String
) -> Result<UnbondingOffer, String> {
    // Query Runes Indexer for BLST balance
    let rune_balance = runes_indexer_canister
        .get_rune_balances_for_outputs(vec![blst_rune_utxo.clone()])
        .await?
        .into_iter()
        .find(|b| b.rune_id == BLST_RUNE_ID)
        .ok_or("BLST Rune not found")?;

    // Get stake position from our records
    let stake = get_stake_by_blst_utxo(&blst_rune_utxo)?;

    // Verify ownership
    if stake.user_principal != user_principal {
        return Err("Unauthorized".to_string());
    }

    // Construct Babylon unbonding transaction
    let unbonding_tx = construct_babylon_unbonding_tx(
        stake.babylon_tx_proof.clone(),
        stake.stake_amount,
    ).await?;

    // Construct BLST burn intention
    let burn_intention = IntentionSet {
        pool_address: get_blst_burn_pool_address()?,
        input_coins: vec![Coin {
            id: BLST_RUNE_ID.to_string(),
            value: stake.stake_amount,
        }],
        output_coins: vec![],  // Burning BLST
        action: "burn_blst".to_string(),
        metadata: serde_json::to_string(&UnbondingMetadata {
            stake_tx_id: stake.stake_tx_id.clone(),
            unbonding_tx_psbt: unbonding_tx.to_base64(),
        })?,
    };

    Ok(UnbondingOffer {
        burn_intention,
        unbonding_duration: stake.timelock_duration,
        expected_btc_return: stake.stake_amount,
    })
}
```

#### 2. Execute Unbonding (Burn BLST + Submit to Babylon)
```rust
#[update]
async fn execute_unbonding(tx_id: String, execution_result: ExecutionResult) -> () {
    if execution_result.status != ExecutionStatus::Confirmed {
        return handle_unbonding_failure(&tx_id, execution_result.error);
    }

    // BLST successfully burned
    let stake = get_stake_by_tx_id(&tx_id)?;

    // Submit unbonding to Babylon via Omnity Hub
    let babylon_unbonding_ticket = submit_unbonding_to_babylon(
        stake.babylon_tx_proof.clone(),
    ).await?;

    // Update stake status
    update_stake_status(&stake.stake_tx_id, StakeStatus::Unbonding);

    // Store unbonding ticket for monitoring
    store_babylon_unbonding_ticket(stake.stake_tx_id.clone(), babylon_unbonding_ticket);
}
```

#### 3. Monitor Unbonding Completion
```rust
async fn monitor_babylon_unbonding() {
    let pending_unbonding = get_pending_unbonding_tickets();

    for ticket in pending_unbonding {
        let status = omnity_hub_canister
            .release_token_status(ticket.id)
            .await?;

        if status == ReleaseStatus::Confirmed {
            // Unbonding complete, BTC unlocked
            // Return BTC to user
            return_btc_to_user(ticket.stake_id).await?;
        }
    }
}
```

---

## Key Architectural Decisions

### 1. hodlprotocol IS a REE Exchange
- We implement REE Exchange API interface
- We manage our own pools on REE infrastructure
- We etch our own BLST Rune on Bitcoin L1
- We coordinate with REE Orchestrator for transaction execution

### 2. BLST Metadata is Critical
- Each BLST Rune encodes full Babylon staking metadata
- Metadata enables autonomous unbonding without external database
- Burning BLST = contract fulfillment (prevents double-spending)

### 3. Cross-Chain Orchestration
- REE Orchestrator handles Bitcoin transaction execution
- Omnity Hub handles cross-chain routing to Babylon
- hodlprotocol canister orchestrates the entire flow

### 4. State Management
- Canister tracks stake positions in stable memory
- Runes Indexer provides BLST balance queries
- Omnity Hub provides cross-chain transaction status

### 5. Security Model
- Protocol fee collected upfront (protects against user abandonment)
- BLST can only be burned by authorized unbonding flow
- Babylon covenant scripts enforce timelock on Bitcoin L1
- Multi-layer validation: Canister → REE Orchestrator → Bitcoin Network

---

## Integration Checklist (Revised)

### Phase 1: Exchange Canister Setup
- [ ] Implement REE Exchange API interface (get_pool_list, get_pool_info, etc.)
- [ ] Initialize staking pool (request pool address from REE)
- [ ] Implement pre_stake() method
- [ ] Implement execute_tx() callback
- [ ] Implement new_block() and rollback_tx() callbacks

### Phase 2: Babylon Integration
- [ ] Integrate btc-staking-ts logic (construct covenant transactions)
- [ ] Query Babylon testnet for global parameters
- [ ] Query finality provider registry (filter top 40)
- [ ] Implement Babylon transaction construction

### Phase 3: Omnity Hub Integration
- [ ] Integrate with Omnity Hub canister (bkyz2-fmaaa-aaaaa-qaaaq-cai)
- [ ] Implement submit_to_babylon() function
- [ ] Implement ticket status monitoring
- [ ] Handle cross-chain confirmation callbacks

### Phase 4: BLST Rune Management
- [ ] Etch BLST Rune on Bitcoin L1 at launch
- [ ] Implement BLST minting flow (after Babylon confirmation)
- [ ] Embed Babylon metadata in BLST Rune
- [ ] Integrate with Runes Indexer for balance queries

### Phase 5: Unbonding Flow
- [ ] Implement initiate_unbonding() method
- [ ] Read BLST metadata from Runes Indexer
- [ ] Construct Babylon unbonding transaction
- [ ] Implement BLST burn flow
- [ ] Monitor Babylon unbonding completion
- [ ] Return BTC to user after timelock

### Phase 6: Platform Treasury Integration
- [ ] Calculate protocol fee (upfront at staking)
- [ ] Call platform_treasury.deposit_fees() with BabylonStaking source
- [ ] Research optimal fee structure (doesn't erode APY promise)

---

## Next Steps

1. **DAY 1 Hours 6-7: Testnet Setup**
   - Get Signet BTC from faucet
   - Test REE Orchestrator testnet (hvyp5-5yaaa-aaaao-qjxha-cai)
   - Test Omnity Hub testnet access
   - Test Runes Indexer testnet (f2dwm-caaaa-aaaao-qjxlq-cai)
   - Configure Bitcoin wallets for testnet

2. **DAY 2: Implement Exchange Canister**
   - Set up Rust canister with REE Exchange API
   - Implement pool initialization
   - Implement pre_stake() with Babylon tx construction
   - Implement execution callbacks

3. **DAY 3: Cross-Chain Integration**
   - Integrate Omnity Hub for Babylon submission
   - Implement BLST minting flow
   - Test end-to-end staking flow on testnet

---

*Last Updated: 2025-10-12 - Post Omnity Documentation Review*
*Status: Definitive architecture guide for hodlprotocol implementation*
