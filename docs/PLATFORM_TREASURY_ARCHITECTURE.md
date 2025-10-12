# Platform Treasury Architecture - hodlprotocol

## Overview
Platform Treasury is the central fee collection and distribution hub for hodlprotocol, managing protocol fees from both swap operations and Babylon staking operations.

**Created:** 2025-10-12 (DAY 1 - Architecture Planning)
**Status:** Design Phase

---

## Core Principles

1. **Dual Revenue Streams:**
   - Swap fees (hodlprotocol_backend)
   - Babylon staking fees (upfront, must balance with user APY promises)

2. **Efficient Fee Collection:**
   - Single cross-canister call per transaction
   - hodlprotocol_backend → platform_treasury.deposit_fees()

3. **Gas Optimization:**
   - Auto-stake to Babylon when treasury hits X BTC threshold (saves BTC gas)
   - Batch operations where possible

4. **Governance Roadmap:**
   - Launch: Fixed allocation ratios (centralized control)
   - Phase 1: Transparent reporting + milestones
   - Phase 2: DAO governance enabled
   - Phase 3: Community proposals for allocation changes

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Flow                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              hodlprotocol_backend (Swap + Stake)            │
│  - Execute swap with DEX routing                            │
│  - Calculate protocol fee (0.X%)                            │
│  - Execute Babylon stake (collect upfront fee)              │
└─────────────────────────────────────────────────────────────┘
                              ↓
              ┌───────────────────────────┐
              │   platform_treasury       │
              │   (Fee Distribution Hub)  │
              └───────────────────────────┘
                      ↓         ↓         ↓
        ┌─────────────┼─────────┼─────────┼─────────────┐
        ↓             ↓         ↓         ↓             ↓
   Cycles        Team      DAO       Babylon      Community
   Reserve      Wallet   Treasury  Reinvest       Rewards
   (ops)      (allocation) (gov)   (auto-stake)   (baby/sats)
```

---

## Canister Dependencies

```json
{
  "canisters": {
    "hodlprotocol_frontend": {
      "dependencies": ["hodlprotocol_backend"]
    },
    "hodlprotocol_backend": {
      "dependencies": ["platform_treasury"],
      "type": "motoko"
    },
    "platform_treasury": {
      "dependencies": ["btc_staking_backend"],
      "type": "rust",
      "main": "src/platform_treasury/src/lib.rs"
    },
    "btc_staking_backend": {
      "type": "rust",
      "main": "src/btc_staking_backend/src/lib.rs"
    },
    "lst_exchange_backend": {
      "type": "rust",
      "main": "src/lst_exchange_backend/src/lib.rs"
    }
  }
}
```

---

## Fee Collection Points

### 1. Swap Fees (hodlprotocol_backend)
```motoko
// After successful swap execution
public shared(msg) func execute_swap(request: SwapRequest) : async SwapResponse {
  // Execute swap via DEX routing
  let swapResult = await dex_router.execute(...);

  // Calculate protocol fee
  let protocolFee = calculate_protocol_fee(swapResult.amount);

  // Collect fee via treasury
  let treasuryResult = await platform_treasury.deposit_fees({
    amount = protocolFee;
    asset = request.from_asset;
    source = #Swap;
  });

  // Return swap result to user
}
```

### 2. Babylon Staking Fees (btc_staking_backend)
```rust
// Upfront fee collection when user stakes BTC
pub async fn stake_btc(amount: u64, duration: u32) -> Result<StakeResponse> {
    // Calculate upfront fee (must balance with promised APY)
    let staking_fee = calculate_babylon_fee(amount, duration);

    // CRITICAL: Ensure fee doesn't erode user APY promise
    // If advertised APY = 8%, fee must leave room for 8%+ returns

    // Collect fee
    platform_treasury::deposit_fees(FeeDeposit {
        amount: staking_fee,
        asset: Asset::BTC,
        source: FeeSource::BabylonStaking,
    }).await?;

    // Execute Babylon staking with remaining amount
    let net_stake_amount = amount - staking_fee;
    babylon_stake(net_stake_amount, duration).await
}
```

---

## Platform Treasury Canister (Rust)

### Core Data Structures

```rust
#[derive(CandidType, Deserialize, Clone)]
pub struct FeeAllocation {
    pub cycles_reserve: u8,      // Operational cycles (%)
    pub team: u8,                // Team allocation (%)
    pub dao_treasury: u8,        // DAO controlled (%)
    pub babylon_reinvestment: u8, // Auto-stake in Babylon (%)
    pub community_rewards: u8,   // Baby runes / sats rewards (%)
}

#[derive(CandidType, Deserialize)]
pub struct FeeDeposit {
    pub amount: u64,
    pub asset: Asset,
    pub source: FeeSource, // Swap | BabylonStaking
}

#[derive(CandidType, Deserialize)]
pub enum FeeSource {
    Swap,
    BabylonStaking,
}

#[derive(CandidType, Deserialize)]
pub struct TreasuryState {
    pub btc_balance: u64,           // Accumulated BTC
    pub babylon_reinvest_threshold: u64, // Auto-stake when hit
    pub total_collected: HashMap<Asset, u64>,
    pub total_distributed: HashMap<Destination, u64>,
    pub allocation_ratios: FeeAllocation,
}
```

### Core Functions

```rust
#[update]
pub async fn deposit_fees(deposit: FeeDeposit) -> Result<(), String> {
    // Record fee collection
    record_fee_deposit(&deposit);

    // Distribute based on allocation ratios
    distribute_fees(&deposit).await?;

    // Check if Babylon reinvestment threshold reached
    if should_auto_reinvest_babylon() {
        trigger_babylon_reinvestment().await?;
    }

    Ok(())
}

async fn distribute_fees(deposit: &FeeDeposit) -> Result<()> {
    let allocation = get_allocation_ratios();

    // Calculate distribution amounts
    let cycles_amount = deposit.amount * allocation.cycles_reserve / 100;
    let team_amount = deposit.amount * allocation.team / 100;
    let dao_amount = deposit.amount * allocation.dao_treasury / 100;
    let babylon_amount = deposit.amount * allocation.babylon_reinvestment / 100;
    let community_amount = deposit.amount * allocation.community_rewards / 100;

    // Execute distributions
    send_to_cycles_reserve(cycles_amount).await?;
    send_to_team_wallet(team_amount, deposit.asset).await?;
    send_to_dao_treasury(dao_amount, deposit.asset).await?;
    accumulate_babylon_reserve(babylon_amount).await?; // Hold until threshold
    accumulate_community_rewards(community_amount).await?;

    Ok(())
}

async fn trigger_babylon_reinvestment() -> Result<()> {
    let btc_balance = get_btc_balance();

    // Call btc_staking_backend to stake treasury BTC
    let stake_result = btc_staking_backend::treasury_stake_btc(
        btc_balance,
        TREASURY_STAKING_DURATION
    ).await?;

    // Minted BLST goes to DAO treasury for governance
    record_babylon_reinvestment(stake_result);

    Ok(())
}

#[query]
pub fn get_treasury_stats() -> TreasuryStats {
    // Return transparent treasury metrics
    // - Total collected (by asset, by source)
    // - Total distributed (by destination)
    // - Current BTC balance
    // - Next auto-reinvest threshold
    // - Historical Babylon reinvestments
}
```

---

## Research Required (Before Launch)

### 1. Babylon Fee Structure Research
**Critical Question:** What upfront fee can we charge without eroding promised APY?

**Research Tasks:**
- Study Babylon testnet APY ranges (current: ~8-12%)
- Calculate fee that leaves room for advertised APY
- Example:
  - If Babylon APY = 10%
  - If we advertise 8% to users
  - We have 2% margin for protocol fees
  - Upfront fee must be < 2% of stake amount

**Documentation:** Create `docs/BABYLON_FEE_RESEARCH.md`

### 2. Allocation Ratio Discovery
**Bootstrapping Considerations:**
- Early stage: Higher cycles reserve % (keep canisters running)
- Growth stage: Higher Babylon reinvestment % (grow TVL)
- Mature stage: Higher DAO treasury % (decentralization)

**Go-to-Market Strategy:**
- What allocation ratios attract users?
- What ratios sustain operations?
- What ratios incentivize team?

**Documentation:** Create `docs/TOKENOMICS_DISCOVERY.md`

---

## Governance Roadmap

### Phase 1: Launch (Centralized)
- **Timeline:** Month 1-3
- **Control:** Core team sets allocation ratios
- **Transparency:** Public dashboard showing all treasury activity
- **Milestone:** Achieve X TVL, Y active users

### Phase 2: Hybrid (Reporting + Milestones)
- **Timeline:** Month 4-6
- **Control:** Core team with community input
- **Transparency:** Weekly treasury reports
- **Milestone:** Community governance framework drafted

### Phase 3: DAO Enabled (Gradual)
- **Timeline:** Month 7-12
- **Control:** DAO proposals for allocation changes
- **Transparency:** On-chain voting records
- **Milestone:** First successful DAO allocation vote

### Phase 4: Full Decentralization
- **Timeline:** Year 2+
- **Control:** 100% DAO governed
- **Transparency:** Autonomous treasury operations
- **Milestone:** Multi-sig DAO treasury control

---

## Gas Optimization Strategy

### Babylon Auto-Reinvestment Threshold
**Problem:** BTC transaction fees are expensive
**Solution:** Batch treasury stakes when economical

```rust
const BABYLON_REINVEST_THRESHOLD: u64 = 100_000_000; // 1 BTC

// Only auto-stake when accumulated BTC makes gas fee worth it
// Example: If BTC tx fee = 0.0001 BTC (~$5)
// Threshold of 1 BTC makes fee only 0.01% of stake
```

**Configurable via governance later**

---

## Integration Checklist

- [ ] Add platform_treasury to dfx.json
- [ ] Create platform_treasury Rust canister
- [ ] Implement deposit_fees() in platform_treasury
- [ ] Integrate fee collection in hodlprotocol_backend (swap)
- [ ] Integrate fee collection in btc_staking_backend (Babylon)
- [ ] Implement auto-reinvestment threshold logic
- [ ] Create treasury stats dashboard (frontend)
- [ ] Set initial allocation ratios (post-research)
- [ ] Document Babylon fee structure (post-research)
- [ ] Create tokenomics discovery document

---

## Next Steps (DAY 1-2)

1. **Research Babylon APY ranges** (testnet data)
2. **Calculate sustainable fee structure**
3. **Draft initial allocation ratios** (bootstrapping phase)
4. **Add platform_treasury to dfx.json**
5. **Begin Rust canister implementation** (DAY 2-3)

---

*Last Updated: 2025-10-12 - DAY 1 Architecture Planning*
