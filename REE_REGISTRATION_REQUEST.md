# REE Orchestrator Registration Request

## Status: READY FOR REGISTRATION (SUBNET REQUIREMENT MET)

**Date Updated:** 2025-10-18

## Issues Identified

### ✅ Issue #1: Wrong Subnet (RESOLVED)
- **Problem:** REE Orchestrator can ONLY interact with exchange canisters on the SAME subnet
- **Previous canister:** `plkfy-gyaaa-aaaad-achpq-cai` (wrong subnet: `io67a-2jmkw-zup3h...`)
- **Resolution:** NEW canister deployed to correct subnet: `fuqsr-in2lc-zbcjj-ydmcw-pzq7h-4xm2z-pto4i-dcyee-5z4rz-x63ji-nae`
- **NEW canister:** `hz536-gyaaa-aaaao-qkufa-cai` ✅

### ⏳ Issue #2: Exchange Whitelist (PENDING)
- **Problem:** REE Orchestrator requires manual registration/whitelisting by Omnity dev team
- **Status:** Awaiting registration of `exchange_id: "HODL_PROTOCOL"`
- **Note:** Even with correct subnet, exchanges must be whitelisted before use

## Verification Complete
✅ Frontend deployed with correct exchange_id: `"HODL_PROTOCOL"`
✅ Console log confirms payload sent to REE orchestrator
✅ Error persists despite using custom exchange ID (not canister ID)

**Console Evidence:**
```json
{
  "intention_set": {
    "tx_fee_in_sats": "5000",
    "initiator_address": "tb1p7da3gssvntgqn2gsecha2xktth80a4pt3y5uyk42jwvhgz2wkwusdc8a6j",
    "intentions": [{
      "action": "deposit",
      "exchange_id": "HODL_PROTOCOL",  ← CORRECT! But not registered
      "pool_address": "tb1pvpqzteze70ejguajp27reur0q4eynffx8gj39z60vl5cuxa7j9as9lv40c",
      "nonce": "1760759100308010359",
      ...
    }]
  }
}
```

**Error:**
```
409:002 Invalid intention found: Invalid exchange id found
```

## Registration Request Details

**Please register our exchange with REE Orchestrator Testnet:**

### Exchange Information
- **Exchange ID:** `HODL_PROTOCOL`
- **Exchange Canister:** `hz536-gyaaa-aaaao-qkufa-cai` ✅ **NEW** (on correct subnet)
- **Subnet:** `fuqsr-in2lc-zbcjj-ydmcw-pzq7h-4xm2z-pto4i-dcyee-5z4rz-x63ji-nae`
- **Client Canisters:** `[vf7wt-caaaa-aaaad-ab6da-cai]` (frontend)
- **Network:** Bitcoin Signet (testnet)
- **Target Orchestrator:** `hvyp5-5yaaa-aaaao-qjxha-cai` (REE testnet, same subnet)

### Required REE Interface Methods (Implemented)
✅ `get_pool_list() -> (vec PoolBasic)`
✅ `get_pool_info(GetPoolInfoArgs) -> (opt PoolInfo)`
✅ `execute_tx(ExecuteTxArgs) -> (Result)`
✅ `new_block(NewBlockInfo) -> (Result_5)`
✅ `rollback_tx(RollbackTxArgs) -> (Result_5)`

**Verification:**
```bash
# Test our exchange methods work correctly
dfx canister --network ic call hz536-gyaaa-aaaao-qkufa-cai get_pool_list '()'
dfx canister --network ic call hz536-gyaaa-aaaao-qkufa-cai get_pool_info \
  '(record { pool_address = "tb1p97hznaf3sjng0vr5gs8vp0839jmapth7vjchc8uy9wytmxal2awqsy0q92" })'
```

### Pool Details
- **Pool Name:** `BABYLON•LST`
- **Pool Address:** `tb1p97hznaf3sjng0vr5gs8vp0839jmapth7vjchc8uy9wytmxal2awqsy0q92` ✅ **NEW**
- **BLST Rune ID:** `274299:1` (BABYLONLST on testnet4)
- **Pool Type:** Babylon Liquid Staking Token
- **Timelock:** 12,960 blocks (~90 days)

### Frontend
- **URL:** https://vf7wt-caaaa-aaaad-ab6da-cai.icp0.io/stake-btc
- **Status:** Fully functional, awaiting REE registration

## Expected Registration Call

Based on REE types (`ree-types/src/orchestrator_interfaces.rs`):

```rust
RegisterExchangeArgs {
    exchange_id: "HODL_PROTOCOL",
    exchange_canister: Principal::from_text("hz536-gyaaa-aaaao-qkufa-cai").unwrap(),
    client_canisters: vec![
        Principal::from_text("vf7wt-caaaa-aaaad-ab6da-cai").unwrap()
    ],
}
```

## Contact Channels

**REE/Omnity Team:**
- GitHub: https://github.com/octopus-network/ree-types
- Omnity Docs: https://docs.omnity.network/docs/REE/first-exchange
- Support: (Add Omnity Discord/Slack channel if known)

## Timeline
- **Session 7:** Identified root cause (exchange_id vs canister_id)
- **Session 8:** Fixed code, deployed, confirmed still blocked
- **Next:** Contact REE team for manual registration

## References
- **Similar Exchanges:** `RICH_SWAP`, `LENDING_DEMO`, `PIXEL_LAND`, `tyche_testnet`
- **Query registered exchanges:**
  ```bash
  dfx canister call hvyp5-5yaaa-aaaao-qjxha-cai get_registered_exchanges '(null)' --network ic
  ```

## Post-Registration Testing Plan
Once registered:
1. Test deposit flow → Should succeed without 409 error
2. Verify `execute_tx()` callback fires
3. Confirm BLST mints to user address
4. Test complete flow: BTC deposit → BLST receipt → Babylon staking
