# Architecture Decisions - hodlprotocol
**Created:** 2025-10-14 (DAY 3)
**Status:** Definitive Reference - No Second-Guessing Required

---

## Critical Architecture Decision: Where PSBT Construction Happens

### Decision: PSBT Construction is CLIENT-SIDE (Frontend)

**Confirmed by Official Documentation Research (2025-10-14):**

### 1. ree-client-ts-sdk (TypeScript - Frontend)
**Repository:** https://github.com/octopus-network/ree-client-ts-sdk

**Key Finding:** PSBTs are constructed entirely client-side
- Uses `createTransaction()` → `addIntention()` → `build()` flow
- User signs PSBT via wallet
- Then sends signed transaction to REE Orchestrator

**Transaction Flow:**
```typescript
1. Create transaction (client-side)
2. Add intention(s) (client-side)
3. Build PSBT (client-side)
4. Sign PSBT (via wallet)
5. Send signed transaction (to REE Orchestrator)
```

**IntentionSet Structure:**
```typescript
{
  poolAddress: string,
  poolUtxos: [],
  inputCoins: [{ coin: { id: string, value: BigInt }, from: string }],
  outputCoins: [{ coin: { id: string, value: BigInt }, to: string }],
  action: "swap" | "deposit" | "stake_babylon",
  nonce: BigInt
}
```

### 2. ree-exchange-sdk (Rust - Backend)
**Repository:** https://github.com/octopus-network/ree-exchange-sdk

**Key Finding:** Backend canister does NOT construct PSBTs
- Backend signs pool UTXOs using ICP Chain Key
- REE Orchestrator validates and forwards to exchange service
- Exchange service role: Sign pool UTXOs, not construct user PSBTs

**Backend Flow:**
1. Client submits PSBT with exchange metadata
2. Orchestrator validates PSBT (checks UTXO details, input/output relationships)
3. Forwards validated request to Exchange service
4. Exchange signs pool UTXO using ICP Chain Key
5. Transforms PSBT into valid Bitcoin transaction
6. Broadcast to Bitcoin network

### 3. Omnity Hub CosmWasm Integration (Babylon Connection)
**Repository:** https://github.com/octopus-network/omnity-docs/blob/443003bc524aa886117ca3dad276d8662e8ec63b/docs/Omnity-Hub/cosmwasm.md

**Key Finding:** Cross-chain routing after Bitcoin confirmation

**Babylon Integration Flow:**
1. `get_btc_mint_address()` - Generate Bitcoin receiving address
2. Transfer BTC to address (via staking transaction)
3. `update_balance_after_finalization()` - After 6 block confirmations
4. `generate_ticket()` - Creates cross-chain ticket to Babylon
5. Light client verification for Cosmos chains
6. Transaction routed to Babylon chain

**API Methods:**
- `redeem()` - Generate ticket and send to Hub
- `get_chain_list()` - Retrieve connected chains
- `get_token_list()` - List available tokens
- `get_fee()` - Get transaction fees

---

## hodlprotocol Architecture (Confirmed)

### Frontend (bitcoinStakingService.ts)
**Responsibilities:**
1. ✅ Construct Babylon staking PSBT using btc-staking-ts SDK
2. ✅ Create IntentionSet with staking metadata
3. ✅ Prompt user to sign PSBT via wallet (Unisat/Xverse)
4. ✅ Submit signed PSBT to REE Orchestrator

**Why Frontend:**
- User must sign PSBT before backend receives it
- btc-staking-ts is a TypeScript SDK (runs in browser)
- REE architecture expects client-constructed PSBTs
- Backend only signs pool UTXOs, not user PSBTs

### Backend (hodlprotocol_exchange canister)
**Responsibilities:**
1. ✅ Provide `pre_stake()` for validation and Babylon params
2. ✅ Implement `execute_tx()` callback from REE Orchestrator
3. ✅ After Bitcoin confirmation, submit to Babylon via Omnity Hub
4. ✅ Mint BLST Runes after Babylon confirmation
5. ✅ Manage pool UTXOs and sign with ICP Chain Key

**Why Backend:**
- Validation and security checks
- Cross-chain coordination (ICP → Bitcoin → Babylon)
- State management and monitoring
- BLST minting orchestration

---

## Complete Transaction Flow (Step-by-Step)

### Phase 1: Staking Preparation (Frontend + Backend)
1. **Frontend** fetches Babylon params from backend (`get_babylon_params()`)
2. **Frontend** fetches finality providers from backend (`get_finality_providers()`)
3. **User** selects amount, duration, finality provider
4. **Frontend** calls backend `pre_stake()` for validation
5. **Backend** validates inputs, returns StakeOffer with params

### Phase 2: PSBT Construction (Frontend Only)
6. **Frontend** constructs Babylon staking PSBT using btc-staking-ts:
   - Staking transaction (locks BTC with covenant script)
   - Slashing transaction (enables punishment for misbehavior)
   - Unbonding transaction (early exit)
   - Unbonding slashing transaction (penalty for early unbonding)
7. **Frontend** creates IntentionSet with PSBT metadata
8. **Frontend** prompts user to sign PSBT via wallet

### Phase 3: REE Orchestrator Submission (Frontend → REE)
9. **Frontend** submits signed PSBT to REE Orchestrator (`invoke()`)
10. **REE Orchestrator** validates PSBT
11. **REE Orchestrator** coordinates DPS (Decentralized PSBT Signing)
12. **REE Orchestrator** broadcasts to Bitcoin network
13. **REE Orchestrator** monitors for confirmations

### Phase 4: Bitcoin Confirmation (REE → Backend)
14. **REE Orchestrator** calls backend `execute_tx()` with result
15. **Backend** receives Bitcoin transaction confirmation
16. **Backend** stores stake in pending state

### Phase 5: Babylon Registration (Backend → Omnity Hub → Babylon)
17. **Backend** submits to Babylon via Omnity Hub `generate_ticket()`
18. **Omnity Hub** routes transaction to Babylon chain (CosmWasm)
19. **Babylon Chain** registers stake with finality provider
20. **Omnity Hub** reports confirmation back to backend

### Phase 6: BLST Minting (Backend → REE)
21. **Backend** monitors Babylon confirmation
22. **Backend** constructs BLST minting IntentionSet
23. **Backend** submits to REE Orchestrator
24. **REE Orchestrator** broadcasts BLST mint to Bitcoin
25. **Backend** updates stake record with BLST Rune UTXO

---

## Key Canister IDs

### REE Infrastructure
- **REE Orchestrator (Testnet):** `hvyp5-5yaaa-aaaao-qjxha-cai`
- **REE Orchestrator (Mainnet):** `kqs64-paaaa-aaaar-qamza-cai`
- **Runes Indexer (Testnet4):** `f2dwm-caaaa-aaaao-qjxlq-cai`
- **Runes Indexer (Mainnet):** `kzrva-ziaaa-aaaar-qamyq-cai`

### Omnity Hub Infrastructure
- **Omnity Hub:** `bkyz2-fmaaa-aaaaa-qaaaq-cai`
- **Bitcoin Customs:** `be2us-64aaa-aaaaa-qaabq-cai`
- **CosmWasm Route:** `ystyg-kaaaa-aaaar-qaieq-cai`

### hodlprotocol Canisters
- **hodlprotocol_exchange:** `plkfy-gyaaa-aaaad-achpq-cai`
- **hodlprotocol_frontend:** `vf7wt-caaaa-aaaad-ab6da-cai`
- **hodlprotocol_backend:** `vm45p-uiaaa-aaaad-ab6cq-cai`

### Babylon Testnet
- **RPC:** https://babylon-testnet-rpc.polkachu.com
- **API:** https://babylon-testnet-api.polkachu.com
- **Network:** bbn-test-6
- **Testnet:** Bitcoin Signet (tb1... addresses)

---

## Reference Documentation

### Official Repositories
1. **ree-client-ts-sdk:** https://github.com/octopus-network/ree-client-ts-sdk
2. **ree-exchange-sdk:** https://github.com/octopus-network/ree-exchange-sdk
3. **omnity-docs (CosmWasm):** https://github.com/octopus-network/omnity-docs/blob/443003bc524aa886117ca3dad276d8662e8ec63b/docs/Omnity-Hub/cosmwasm.md
4. **btc-staking-ts:** https://github.com/babylonlabs-io/btc-staking-ts
5. **runes-indexer:** https://github.com/octopus-network/runes-indexer
6. **omnity-indexer:** https://github.com/octopus-network/omnity-indexer

### Internal Documentation
- **REE_ARCHITECTURE_CORRECTED.md** - Definitive architecture guide
- **BABYLON_INTEGRATION_RESEARCH.md** - Babylon SDK integration details
- **PLATFORM_TREASURY_ARCHITECTURE.md** - Fee collection architecture

---

## Decision Log

### 2025-10-14: PSBT Construction Location
**Decision:** Frontend constructs PSBTs using btc-staking-ts SDK

**Reasoning:**
1. ree-client-ts-sdk explicitly shows client-side PSBT construction
2. User must sign PSBT before backend receives it
3. Backend's role is pool UTXO signing, not user PSBT construction
4. btc-staking-ts is TypeScript (runs in browser, not Rust canister)

**Rejected Alternative:** Backend PSBT construction via HTTP outcalls
- Would require porting btc-staking-ts logic to Rust
- Inconsistent with REE architecture patterns
- Adds unnecessary complexity and cycles cost

**Status:** ✅ Confirmed - No further debate needed

---

*Last Updated: 2025-10-14 - DAY 3*
*Next Review: Only if official documentation contradicts this*
