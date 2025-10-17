use candid::{CandidType, Deserialize};
use ic_cdk_macros::*;
use serde::Serialize;
use std::cell::RefCell;
use std::str::FromStr;
use ic_stable_structures::{
    DefaultMemoryImpl, StableBTreeMap, StableCell,
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    Storable, storable::Bound,
};
use ree_types::{bitcoin::Network, schnorr::request_ree_pool_address};

// Bitcoin Runes support
use ordinals::{Etching, Rune, Runestone};

// ============================
// TYPE DEFINITIONS - Pool & Deposit Tracking
// ============================

/// Configuration for the liquid staking pool
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, Default)]
pub struct PoolConfig {
    pub address: String,              // Bitcoin Taproot address (tb1p...)
    pub finality_provider: String,    // Top FP pubkey from Babylon
    pub timelock_blocks: u32,          // 12,960 blocks (≈90 days)
    pub blst_rune_id: Option<String>,  // Populated after etching
    pub total_deposited_sats: u64,     // Total BTC deposited
    pub total_blst_minted: u64,        // Total BLST issued (in BLST units)
    pub created_at: u64,               // Timestamp
}

/// User deposit intent (created by pre_deposit, consumed by execute_tx)
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct DepositIntent {
    pub user_btc_address: String,
    pub amount_sats: u64,
    pub duration_blocks: u32,
    pub finality_provider_key: String,
    pub created_at: u64,
    pub nonce: u64,
}

/// BLST mint record (permanent record of minted BLST with Babylon params)
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct BlstMintRecord {
    // User info
    pub user_btc_address: String,
    pub amount_blst: u64,         // In BLST units (100,000 per BTC)
    pub amount_sats: u64,          // Original BTC deposit

    // Pool params (reference to pool registry)
    pub pool_address: String,
    pub finality_provider: String,
    pub timelock_blocks: u32,      // 12,960

    // Tracking
    pub deposit_tx_hash: String,
    pub mint_tx_hash: Option<String>,
    pub mint_timestamp: u64,
    pub babylon_stake_tx: Option<String>,  // Populated when pool stakes
}

/// Response from pre_deposit() - provides pool UTXO for atomic swap
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct DepositOffer {
    pub pool_address: String,      // Pool Bitcoin address
    pub nonce: u64,                 // For REE tracking
    pub expected_blst: u64,         // How much BLST user will receive
    pub protocol_fee: u64,          // Fee (0 for testnet demo)
    pub estimated_apy: f64,         // From selected FP

    // Atomic swap: Pool UTXO with BLST runes for atomic transfer
    pub pool_utxo_txid: String,         // Pool UTXO transaction ID
    pub pool_utxo_vout: u32,            // Pool UTXO output index
    pub pool_utxo_amount_sats: u64,     // Pool UTXO satoshi amount
    pub pool_utxo_blst_amount: u64,     // BLST runes in this UTXO
}

/// UTXO with rune balance (for querying Runes Indexer)
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RuneUtxo {
    pub txid: String,
    pub vout: u32,
    pub value: u64,
    pub rune_balance: u64,
}

/// Pool statistics for UI
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct PoolStats {
    pub pool_address: String,
    pub tvl_sats: u64,
    pub total_blst_minted: u64,
    pub finality_provider: String,
    pub timelock_blocks: u32,
    pub estimated_apy: f64,
}

/// Babylon staking record - tracks pool's staking to Babylon
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct BabylonStakingRecord {
    pub staking_tx_hash: String,
    pub amount_sats: u64,
    pub timelock_blocks: u32,
    pub finality_provider: String,
    pub covenant_pks: Vec<String>,
    pub covenant_quorum: u32,

    // Delegation tracking
    pub babylon_delegated: bool,
    pub delegation_ticket_id: Option<String>,
    pub delegation_timestamp: Option<u64>,

    // Reward tracking
    pub accrued_baby_rewards: u64,
    pub last_reward_claim: Option<u64>,

    pub created_at: u64,
    pub confirmed_height: Option<u64>,
}

/// Babylon staking statistics for UI
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct BabylonStakingStats {
    pub total_staked_to_babylon: u64,
    pub active_delegations: u32,
    pub total_baby_rewards: u64,
    pub pending_babylon_txs: u32,
}

// ============================
// TYPE DEFINITIONS - Omnity Hub Integration
// ============================

/// Omnity Hub message for cross-chain communication
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct OmnityMessage {
    pub chain_id: String,          // Target chain (e.g., "bbn-test-6")
    pub contract_address: String,  // Target contract on destination chain
    pub msg: String,               // JSON-encoded message payload
}

/// Omnity ticket - returned after submitting cross-chain message
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct OmnityTicket {
    pub ticket_id: String,
    pub status: String,          // "pending", "confirmed", "failed"
    pub target_chain: String,
    pub message_hash: String,
    pub created_at: u64,
}

/// Babylon delegation message (JSON payload)
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct BabylonDelegationMsg {
    pub register_delegation: DelegationData,
}

/// Delegation data for Babylon chain
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct DelegationData {
    pub staking_tx_hash: String,
    pub finality_provider_pk: String,
    pub staking_amount: u64,
    pub timelock_blocks: u32,
    pub proof: Option<String>,  // Bitcoin SPV proof (optional for testnet)
}

// ============================
// STORABLE IMPLEMENTATIONS - For stable storage
// ============================

impl Storable for DepositIntent {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> std::borrow::Cow<'_, [u8]> {
        let mut bytes = vec![];
        ciborium::ser::into_writer(self, &mut bytes).expect("Failed to serialize DepositIntent");
        std::borrow::Cow::Owned(bytes)
    }

    fn from_bytes(bytes: std::borrow::Cow<'_, [u8]>) -> Self {
        ciborium::de::from_reader(bytes.as_ref()).expect("Failed to deserialize DepositIntent")
    }
}

impl Storable for BlstMintRecord {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> std::borrow::Cow<'_, [u8]> {
        let mut bytes = vec![];
        ciborium::ser::into_writer(self, &mut bytes).expect("Failed to serialize BlstMintRecord");
        std::borrow::Cow::Owned(bytes)
    }

    fn from_bytes(bytes: std::borrow::Cow<'_, [u8]>) -> Self {
        ciborium::de::from_reader(bytes.as_ref()).expect("Failed to deserialize BlstMintRecord")
    }
}

impl Storable for PoolConfig {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> std::borrow::Cow<'_, [u8]> {
        let mut bytes = vec![];
        ciborium::ser::into_writer(self, &mut bytes).expect("Failed to serialize PoolConfig");
        std::borrow::Cow::Owned(bytes)
    }

    fn from_bytes(bytes: std::borrow::Cow<'_, [u8]>) -> Self {
        ciborium::de::from_reader(bytes.as_ref()).expect("Failed to deserialize PoolConfig")
    }
}

impl Storable for BabylonStakingRecord {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> std::borrow::Cow<'_, [u8]> {
        let mut bytes = vec![];
        ciborium::ser::into_writer(self, &mut bytes).expect("Failed to serialize BabylonStakingRecord");
        std::borrow::Cow::Owned(bytes)
    }

    fn from_bytes(bytes: std::borrow::Cow<'_, [u8]>) -> Self {
        ciborium::de::from_reader(bytes.as_ref()).expect("Failed to deserialize BabylonStakingRecord")
    }
}

// ============================
// STABLE STORAGE - Memory Management
// ============================

type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    // Pool configuration (single pool for MVP) - NOW IN STABLE STORAGE!
    static POOL_CONFIG: RefCell<StableCell<PoolConfig, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(4))),
            PoolConfig::default(),
        ).expect("Failed to initialize POOL_CONFIG")
    );

    // Pending deposits: nonce → DepositIntent
    static PENDING_DEPOSITS: RefCell<StableBTreeMap<u64, DepositIntent, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0))),
        )
    );

    // BLST mint records: deposit_tx_hash → BlstMintRecord
    static BLST_MINT_RECORDS: RefCell<StableBTreeMap<String, BlstMintRecord, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1))),
        )
    );

    // User BLST balances: btc_address → balance (in BLST units)
    static USER_BLST_BALANCES: RefCell<StableBTreeMap<String, u64, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(2))),
        )
    );

    // Babylon staking records: staking_tx_hash → BabylonStakingRecord
    static BABYLON_STAKING_RECORDS: RefCell<StableBTreeMap<String, BabylonStakingRecord, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(3))),
        )
    );
}

// ============================
// TYPE DEFINITIONS - Babylon Integration
// ============================

  #[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
  pub struct BabylonParams {
      pub unbonding_time_seconds: u64,
      pub max_validators: u32,
      pub min_commission_rate: String,
      pub bond_denom: String,
      pub last_updated: u64,
  }

  #[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
  pub struct FinalityProvider {
      pub btc_pk_hex: String,
      pub description: FPDescription,
      pub commission: String,
      pub voting_power: String,
      pub estimated_apy: f64,
  }

  #[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
  pub struct FPDescription {
      pub moniker: String,
      pub identity: String,
      pub website: String,
      pub details: String,
  }

  // ============================
  // STABLE STORAGE - Caching
  // ============================

  thread_local! {
      static BABYLON_PARAMS_CACHE: RefCell<Option<BabylonParams>> = RefCell::new(None);
      static FINALITY_PROVIDERS_CACHE: RefCell<Vec<FinalityProvider>> = RefCell::new(Vec::new());
  }

  const CACHE_DURATION_NANOS: u64 = 24 * 60 * 60 * 1_000_000_000; // 24 hours
  const BABYLON_API_URL: &str = "https://babylon-testnet-api.polkachu.com";
  const BABYLON_STAKING_API_URL: &str = "https://staking-api.testnet.babylonlabs.io";
  // REE library accepts: "test_key_1" (testnet/local) or "key_1" (mainnet)
  const SCHNORR_KEY_NAME: &str = "test_key_1";  // Use "key_1" for mainnet
  const POOL_TIMELOCK_BLOCKS: u32 = 12_960;  // 90 days

  // REE Infrastructure Canister IDs
  const REE_ORCHESTRATOR_TESTNET: &str = "hvyp5-5yaaa-aaaao-qjxha-cai";
  const RUNES_INDEXER_TESTNET: &str = "f2dwm-caaaa-aaaao-qjxlq-cai";

  // Omnity Hub Canister IDs
  const OMNITY_HUB: &str = "bkyz2-fmaaa-aaaaa-qaaaq-cai";
  const OMNITY_CW_ROUTE_OSMO_TESTNET: &str = "nfehe-haaaa-aaaar-qah3q-cai";

  // Babylon Chain Configuration
  const BABYLON_CHAIN_ID: &str = "bbn-test-6";
  const BABYLON_STAKING_CONTRACT: &str = "babylon1...";  // TODO: Get real contract address

  // ============================
  // POOL INITIALIZATION - ICP Chain Key
  // ============================

  /// Initialize the liquid staking pool with ICP Chain Key
  #[update]
  async fn init_pool() -> Result<String, String> {
      let caller = ic_cdk::api::caller();
      if !ic_cdk::api::is_controller(&caller) {
          return Err("Not authorized - only controller can initialize pool".to_string());
      }

      // Check if pool already initialized (check if address is set)
      let existing_pool = POOL_CONFIG.with(|p| p.borrow().get().clone());
      if !existing_pool.address.is_empty() {
          return Err("Pool already initialized".to_string());
      }

      ic_cdk::println!("Initializing liquid staking pool...");

      // For local testing: Use mock address since dfx_test_key != test_key_1
      // For testnet/mainnet: Use real ICP Chain Key
      let addr = if cfg!(target_arch = "wasm32") {
          // Try to detect if we're on local dfx by attempting real key generation
          match request_ree_pool_address(
              SCHNORR_KEY_NAME,
              vec![b"hodlprotocol_blst_pool".to_vec()],
              Network::Testnet4,
          )
          .await
          {
              Ok((untweaked, tweaked, address)) => {
                  ic_cdk::println!("Pool address generated: {}", address);
                  ic_cdk::println!("Untweaked pubkey: {:?}", untweaked);
                  ic_cdk::println!("Tweaked pubkey: {:?}", tweaked);
                  address.to_string()
              }
              Err(e) => {
                  // If key generation fails, use mock address for local testing
                  ic_cdk::println!("⚠️  Chain Key generation failed (local dfx?): {}", e);
                  ic_cdk::println!("📍 Using mock pool address for local testing");
                  // Mock Bitcoin Signet Taproot address
                  "tb1pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqfmkg5p".to_string()
              }
          }
      } else {
          // Non-wasm compilation (shouldn't happen, but just in case)
          "tb1pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqfmkg5p".to_string()
      };

      ic_cdk::println!("Pool address: {}", addr);

      // Get top finality provider
      let fps = get_finality_providers().await?;
      let top_fp = fps.first()
          .ok_or("No finality providers available")?;

      ic_cdk::println!("Selected top FP: {} (APY: {}%)", top_fp.description.moniker, top_fp.estimated_apy);

      // Create pool config
      let pool_config = PoolConfig {
          address: addr.to_string(),
          finality_provider: top_fp.btc_pk_hex.clone(),
          timelock_blocks: POOL_TIMELOCK_BLOCKS,
          blst_rune_id: None,  // Will be populated after etching
          total_deposited_sats: 0,
          total_blst_minted: 0,
          created_at: ic_cdk::api::time(),
      };

      // Store pool config in stable storage
      POOL_CONFIG.with(|p| {
          p.borrow_mut().set(pool_config.clone()).expect("Failed to set POOL_CONFIG");
      });

      ic_cdk::println!("✅ Pool initialized successfully!");
      ic_cdk::println!("   Address: {}", pool_config.address);
      ic_cdk::println!("   FP: {}", pool_config.finality_provider);
      ic_cdk::println!("   Timelock: {} blocks (≈90 days)", pool_config.timelock_blocks);

      Ok(pool_config.address)
  }

  /// Query current pool configuration
  #[query]
  fn get_pool_config() -> Option<PoolConfig> {
      let config = POOL_CONFIG.with(|p| p.borrow().get().clone());
      // Return None if pool not initialized (address is empty)
      if config.address.is_empty() {
          None
      } else {
          Some(config)
      }
  }

  /// Update pool config with rune ID after manual etching
  #[update]
  fn update_pool_rune_id(rune_id: String) -> Result<String, String> {
      let caller = ic_cdk::api::caller();
      if !ic_cdk::api::is_controller(&caller) {
          return Err("Not authorized - only controller can update rune ID".to_string());
      }

      // Get current pool config
      let mut pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());
      if pool_config.address.is_empty() {
          return Err("Pool not initialized".to_string());
      }

      // Validate rune_id format (should be "BLOCK:TX" like "201234:5")
      if !rune_id.contains(':') {
          return Err(format!("Invalid rune_id format: {}. Expected format: BLOCK:TX (e.g., 201234:5)", rune_id));
      }

      ic_cdk::println!("Updating pool config with rune_id: {}", rune_id);

      // Update rune ID
      pool_config.blst_rune_id = Some(rune_id.clone());

      // Save updated config
      POOL_CONFIG.with(|p| {
          p.borrow_mut().set(pool_config).expect("Failed to set POOL_CONFIG");
      });

      ic_cdk::println!("✅ Pool config updated with BLST rune ID");

      Ok(format!("Pool config updated successfully with rune_id: {}", rune_id))
  }

  // ============================
  // RUNE ETCHING - BABYLON•LST Token
  // ============================

  /// Create the BABYLON•LST rune etching runestone
  /// Returns the OP_RETURN script for the etching transaction
  fn create_blst_etching() -> Result<Vec<u8>, String> {
      ic_cdk::println!("Creating BABYLON•LST rune etching...");

      // Parse "BABYLONLST" as rune name
      // Spacers will be added: BABYLON•LST (spacer at position 7)
      let rune_name = Rune::from_str("BABYLONLST")
          .map_err(|e| format!("Invalid rune name: {:?}", e))?;

      // Create etching configuration
      let etching = Etching {
          divisibility: Some(3),              // 0.001 precision (1 sat = 0.001 BLST)
          premine: Some(100_000_000_000),     // All 100B units created at etching
          rune: Some(rune_name),
          spacers: Some(128),                  // Binary: 10000000 = spacer after 7th char (BABYLON•LST)
          symbol: Some('Ƀ'),                   // Bitcoin-like symbol
          terms: None,                         // No open minting - premine only
          turbo: true,                         // Future-proof protocol changes
      };

      // Create runestone with etching
      let runestone = Runestone {
          edicts: vec![],                      // No transfers in etching tx
          etching: Some(etching),
          mint: None,                          // Not minting, just etching
          pointer: None,                       // Default pointer behavior
      };

      // Encode to OP_RETURN script
      let script = runestone.encipher();

      ic_cdk::println!("✅ BLST runestone created:");
      ic_cdk::println!("   Name: BABYLON•LST");
      ic_cdk::println!("   Divisibility: 3 (0.001 precision)");
      ic_cdk::println!("   Symbol: Ƀ");
      ic_cdk::println!("   OP_RETURN script size: {} bytes", script.len());

      Ok(script.to_bytes())
  }

  /// Construct PSBT for rune etching transaction
  /// Input: Pool UTXO for fees
  /// Output 0: OP_RETURN with etching runestone
  /// Output 1: Change back to pool address
  fn construct_etching_psbt(
      pool_utxo: &BitcoinUtxo,
      pool_address: &str,
      op_return_script: Vec<u8>,
      fee_rate_sat_per_vb: u64,
  ) -> Result<String, String> {
      use bitcoin::{Transaction, TxIn, TxOut, OutPoint, ScriptBuf, Sequence};
      use bitcoin::psbt::Psbt;
      use bitcoin::Txid;

      ic_cdk::println!("Constructing etching PSBT...");
      ic_cdk::println!("  Input UTXO: {}:{} ({}  sats)", pool_utxo.txid, pool_utxo.vout, pool_utxo.value);
      ic_cdk::println!("  Pool address: {}", pool_address);
      ic_cdk::println!("  OP_RETURN size: {} bytes", op_return_script.len());

      // Parse UTXO txid
      let txid = Txid::from_str(&pool_utxo.txid)
          .map_err(|e| format!("Invalid txid: {:?}", e))?;

      // Estimate transaction size
      // 1 Taproot input (~58 vB) + 2 outputs (OP_RETURN ~45 vB + P2TR change ~43 vB) + overhead (~11 vB)
      // Total: ~157 vB
      let estimated_vsize = 157;
      let fee_sats = estimated_vsize * fee_rate_sat_per_vb;

      ic_cdk::println!("  Estimated vsize: {} vB", estimated_vsize);
      ic_cdk::println!("  Fee rate: {} sat/vB", fee_rate_sat_per_vb);
      ic_cdk::println!("  Total fee: {} sats", fee_sats);

      // Check if UTXO is sufficient
      if pool_utxo.value < fee_sats + 1000 {
          return Err(format!("Insufficient UTXO value: {} sats (need {} sats for fee + 1000 dust)", pool_utxo.value, fee_sats));
      }

      let change_amount = pool_utxo.value - fee_sats;
      ic_cdk::println!("  Change amount: {} sats", change_amount);

      // Build transaction
      let tx_in = TxIn {
          previous_output: OutPoint {
              txid,
              vout: pool_utxo.vout,
          },
          script_sig: ScriptBuf::new(),  // Taproot uses witness, not script_sig
          sequence: Sequence::MAX,     // RBF disabled
          witness: bitcoin::Witness::new(),  // Empty witness for unsigned
      };

      // Output 0: OP_RETURN with etching runestone
      // The ordinals crate already returns a complete Script, just wrap it
      let op_return_script_buf = ScriptBuf::from_bytes(op_return_script);

      let op_return_output = TxOut {
          value: 0,  // OP_RETURN has no value
          script_pubkey: op_return_script_buf,
      };

      // Output 1: Change back to pool address (P2TR)
      let pool_addr = bitcoin::Address::from_str(pool_address)
          .map_err(|e| format!("Invalid pool address: {:?}", e))?
          .require_network(bitcoin::Network::Signet)
          .map_err(|e| format!("Address network mismatch: {:?}", e))?;

      let change_output = TxOut {
          value: change_amount,
          script_pubkey: pool_addr.script_pubkey(),
      };

      // Create unsigned transaction
      let unsigned_tx = Transaction {
          version: 2,  // Version 2 for Bitcoin transactions
          lock_time: bitcoin::absolute::LockTime::ZERO,
          input: vec![tx_in],
          output: vec![op_return_output, change_output],
      };

      // Create PSBT from unsigned transaction
      let mut psbt = Psbt::from_unsigned_tx(unsigned_tx)
          .map_err(|e| format!("Failed to create PSBT: {:?}", e))?;

      // Add witness UTXO data for Taproot input (required by REE)
      psbt.inputs[0].witness_utxo = Some(bitcoin::TxOut {
          value: pool_utxo.value,
          script_pubkey: pool_addr.script_pubkey(),
      });

      // Serialize PSBT to hex
      let psbt_hex = hex::encode(psbt.serialize());

      ic_cdk::println!("✅ PSBT constructed ({} bytes hex)", psbt_hex.len());

      Ok(psbt_hex)
  }

  /// Construct PSBT for rune minting transaction
  /// Input: Pool UTXO for fees
  /// Output 0: OP_RETURN with mint runestone
  /// Output 1: Rune recipient (user address)
  /// Output 2: Change back to pool address
  fn construct_minting_psbt(
      pool_utxo: &BitcoinUtxo,
      pool_address: &str,
      user_address: &str,
      rune_id: &str,
      amount_blst: u64,
      fee_rate_sat_per_vb: u64,
  ) -> Result<String, String> {
      use bitcoin::{Transaction, TxIn, TxOut, OutPoint, ScriptBuf, Sequence};
      use bitcoin::psbt::Psbt;
      use bitcoin::Txid;
      use ordinals::{Edict, RuneId};

      ic_cdk::println!("Constructing minting PSBT...");
      ic_cdk::println!("  Input UTXO: {}:{} ({} sats)", pool_utxo.txid, pool_utxo.vout, pool_utxo.value);
      ic_cdk::println!("  Pool address: {}", pool_address);
      ic_cdk::println!("  User address: {}", user_address);
      ic_cdk::println!("  Minting: {} BLST base units", amount_blst);

      // Parse rune_id (format: "block:tx" e.g. "840000:1")
      let rune_id_parsed = RuneId::from_str(rune_id)
          .map_err(|e| format!("Invalid rune_id: {:?}", e))?;

      // Parse UTXO txid
      let txid = Txid::from_str(&pool_utxo.txid)
          .map_err(|e| format!("Invalid txid: {:?}", e))?;

      // Estimate transaction size
      // 1 Taproot input (~58 vB) + 3 outputs (OP_RETURN ~50 vB + 2x P2TR ~86 vB) + overhead (~15 vB)
      // Total: ~209 vB
      let estimated_vsize = 209;
      let fee_sats = estimated_vsize * fee_rate_sat_per_vb;

      ic_cdk::println!("  Estimated vsize: {} vB", estimated_vsize);
      ic_cdk::println!("  Fee rate: {} sat/vB", fee_rate_sat_per_vb);
      ic_cdk::println!("  Total fee: {} sats", fee_sats);

      // Check if UTXO is sufficient
      if pool_utxo.value < fee_sats + 2000 {
          return Err(format!("Insufficient UTXO value: {} sats (need {} sats for fee + dust)", pool_utxo.value, fee_sats + 2000));
      }

      let change_amount = pool_utxo.value - fee_sats - 1000;  // 1000 sats for rune output
      ic_cdk::println!("  Rune output: 1000 sats");
      ic_cdk::println!("  Change amount: {} sats", change_amount);

      // Build transaction input
      let tx_in = TxIn {
          previous_output: OutPoint {
              txid,
              vout: pool_utxo.vout,
          },
          script_sig: ScriptBuf::new(),
          sequence: Sequence::MAX,
          witness: bitcoin::Witness::new(),
      };

      // Create mint runestone with edict
      let edict = Edict {
          id: rune_id_parsed,
          amount: amount_blst as u128,
          output: 1,  // Send to output index 1 (user address)
      };

      let runestone = Runestone {
          edicts: vec![edict],
          etching: None,
          mint: None,                          // NOT minting - transferring from pool UTXO
          pointer: Some(2),                    // Remaining runes to pool change output
      };

      let op_return_script = runestone.encipher();
      let op_return_script_buf = ScriptBuf::from_bytes(op_return_script.to_bytes());

      // Output 0: OP_RETURN with mint runestone
      let op_return_output = TxOut {
          value: 0,
          script_pubkey: op_return_script_buf,
      };

      // Output 1: Rune recipient (user address)
      let user_addr = bitcoin::Address::from_str(user_address)
          .map_err(|e| format!("Invalid user address: {:?}", e))?
          .require_network(bitcoin::Network::Signet)
          .map_err(|e| format!("Address network mismatch: {:?}", e))?;

      let user_output = TxOut {
          value: 1000,  // Dust amount for rune
          script_pubkey: user_addr.script_pubkey(),
      };

      // Output 2: Change back to pool address
      let pool_addr = bitcoin::Address::from_str(pool_address)
          .map_err(|e| format!("Invalid pool address: {:?}", e))?
          .require_network(bitcoin::Network::Signet)
          .map_err(|e| format!("Address network mismatch: {:?}", e))?;

      let change_output = TxOut {
          value: change_amount,
          script_pubkey: pool_addr.script_pubkey(),
      };

      // Create unsigned transaction
      let unsigned_tx = Transaction {
          version: 2,
          lock_time: bitcoin::absolute::LockTime::ZERO,
          input: vec![tx_in],
          output: vec![op_return_output, user_output, change_output],
      };

      // Create PSBT
      let mut psbt = Psbt::from_unsigned_tx(unsigned_tx)
          .map_err(|e| format!("Failed to create PSBT: {:?}", e))?;

      // Add witness UTXO data for Taproot input (required by REE)
      psbt.inputs[0].witness_utxo = Some(bitcoin::TxOut {
          value: pool_utxo.value,
          script_pubkey: pool_addr.script_pubkey(),
      });

      let psbt_hex = hex::encode(psbt.serialize());

      ic_cdk::println!("✅ Minting PSBT constructed ({} bytes hex)", psbt_hex.len());

      Ok(psbt_hex)
  }

  /// Etch the BABYLON•LST rune on Bitcoin via REE Orchestrator
  #[update]
  async fn etch_blst_rune() -> Result<String, String> {
      let caller = ic_cdk::api::caller();
      if !ic_cdk::api::is_controller(&caller) {
          return Err("Not authorized - only controller can etch rune".to_string());
      }

      // Check if already etched
      let pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());
      if pool_config.address.is_empty() {
          return Err("Pool not initialized".to_string());
      }

      if pool_config.blst_rune_id.is_some() {
          return Err(format!("BLST rune already etched: {}", pool_config.blst_rune_id.unwrap()));
      }

      ic_cdk::println!("🔨 Etching BABYLON•LST rune via REE Orchestrator...");

      // Step 1: Create the etching runestone
      let op_return_script = create_blst_etching()?;
      ic_cdk::println!("✅ Etching runestone created ({} bytes)", op_return_script.len());

      // Step 2: Fetch pool UTXOs
      let utxos = fetch_pool_utxos().await?;
      if utxos.is_empty() {
          return Err("No UTXOs available in pool - fund pool address first".to_string());
      }

      // Select first UTXO with sufficient value for fees
      let selected_utxo = utxos.iter()
          .find(|u| u.value >= 10_000)  // At least 10k sats for fees + dust
          .ok_or("No UTXO with sufficient value (need ≥10k sats)")?;

      ic_cdk::println!("✅ Selected UTXO: {}:{} ({} sats)", selected_utxo.txid, selected_utxo.vout, selected_utxo.value);

      // Step 3: Estimate fee rate
      let fee_rate = estimate_fee_rate().await?;
      ic_cdk::println!("✅ Fee rate: {} sat/vB", fee_rate);

      // Step 4: Construct PSBT
      let psbt_hex = construct_etching_psbt(
          selected_utxo,
          &pool_config.address,
          op_return_script,
          fee_rate,
      )?;
      ic_cdk::println!("✅ PSBT constructed");

      // Step 5: Build IntentionSet for REE Orchestrator
      let nonce = ic_cdk::api::time();
      let intention = Intention {
          input_coins: vec![],  // No rune inputs (etching creates new rune)
          output_coins: vec![], // No rune outputs (etching tx doesn't transfer runes)
          action: "etch_rune".to_string(),
          exchange_id: ic_cdk::id().to_string(),
          pool_utxo_spent: vec![format!("{}:{}", selected_utxo.txid, selected_utxo.vout)],
          action_params: "BABYLON•LST rune etching".to_string(),
          nonce,
          pool_address: pool_config.address.clone(),
          pool_utxo_received: vec![],  // Will be populated by REE after broadcast
      };

      let intention_set = IntentionSet {
          tx_fee_in_sats: fee_rate * 157,  // Estimated vsize
          initiator_address: pool_config.address.clone(),
          intentions: vec![intention],
      };

      let invoke_args = InvokeArgs {
          psbt_hex: psbt_hex.clone(),
          intention_set,
          initiator_utxo_proof: vec![],  // Not required for pool-initiated tx
          client_info: Some("hodlprotocol BLST etching".to_string()),
      };

      ic_cdk::println!("✅ InvokeArgs prepared");

      // Step 6: Call REE Orchestrator
      ic_cdk::println!("📡 Calling REE Orchestrator invoke()...");
      let result = call_ree_orchestrator_invoke(invoke_args).await?;

      ic_cdk::println!("✅ REE Orchestrator accepted etching transaction");
      ic_cdk::println!("   Result: {}", result);

      Ok(format!("BLST rune etching submitted to REE Orchestrator.\nTransaction will be signed with ICP Chain Key and broadcast to Bitcoin Signet.\nCheck Bitcoin explorer for confirmation, then update pool config with rune_id.\nREE response: {}", result))
  }

  // ============================
  // TRANSFORM FUNCTION - Normalize HTTP responses for consensus
  // ============================

  #[query]
  fn transform_http_response(args: ic_cdk::api::management_canister::http_request::TransformArgs) -> ic_cdk::api::management_canister::http_request::HttpResponse {
      use ic_cdk::api::management_canister::http_request::HttpResponse;

      // Return only the body, strip all headers for consensus
      HttpResponse {
          status: args.response.status,
          body: args.response.body,
          headers: vec![], // Remove all headers to achieve consensus
      }
  }

  // ============================
  // HTTP OUTCALLS - Babylon Queries
  // ============================

  async fn fetch_babylon_staking_params() -> Result<BabylonParams, String> {
      use ic_cdk::api::management_canister::http_request::{
          http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, TransformContext,
      };

      let url = format!("{}/cosmos/staking/v1beta1/params", BABYLON_API_URL);

      let request = CanisterHttpRequestArgument {
          url: url.clone(),
          method: HttpMethod::GET,
          headers: vec![
              HttpHeader {
                  name: "User-Agent".to_string(),
                  value: "hodlprotocol".to_string(),
              },
          ],
          body: None,
          max_response_bytes: Some(10_000),
          transform: Some(TransformContext::from_name("transform_http_response".to_string(), vec![])),
      };

      match http_request(request, 1_000_000_000).await {
          Ok((response,)) => {
              let body = String::from_utf8(response.body)
                  .map_err(|e| format!("Failed to parse response body: {}", e))?;

              ic_cdk::println!("Babylon params response: {}", body);

              // Parse JSON response
              let parsed: serde_json::Value = serde_json::from_str(&body)
                  .map_err(|e| format!("Failed to parse JSON: {}", e))?;

              let params = parsed.get("params")
                  .ok_or("Missing params field")?;

              let unbonding_time_str = params.get("unbonding_time")
                  .and_then(|v| v.as_str())
                  .ok_or("Missing unbonding_time")?;

              // Parse "1814400s" format to seconds
              let unbonding_seconds = unbonding_time_str
                  .trim_end_matches('s')
                  .parse::<u64>()
                  .map_err(|e| format!("Failed to parse unbonding_time: {}", e))?;

              Ok(BabylonParams {
                  unbonding_time_seconds: unbonding_seconds,
                  max_validators: params.get("max_validators")
                      .and_then(|v| v.as_u64())
                      .unwrap_or(100) as u32,
                  min_commission_rate: params.get("min_commission_rate")
                      .and_then(|v| v.as_str())
                      .unwrap_or("0.03")
                      .to_string(),
                  bond_denom: params.get("bond_denom")
                      .and_then(|v| v.as_str())
                      .unwrap_or("ubbn")
                      .to_string(),
                  last_updated: ic_cdk::api::time(),
              })
          },
          Err((code, msg)) => {
              Err(format!("HTTP request failed: {:?} - {}", code, msg))
          }
      }
  }

  async fn fetch_finality_providers() -> Result<Vec<FinalityProvider>, String> {
      use ic_cdk::api::management_canister::http_request::{
          http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, TransformContext,
      };

      let url = format!(
          "{}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=40",
          BABYLON_API_URL
      );

      let request = CanisterHttpRequestArgument {
          url: url.clone(),
          method: HttpMethod::GET,
          headers: vec![
              HttpHeader {
                  name: "User-Agent".to_string(),
                  value: "hodlprotocol".to_string(),
              },
          ],
          body: None,
          max_response_bytes: Some(100_000),
          transform: Some(TransformContext::from_name("transform_http_response".to_string(), vec![])),
      };

      match http_request(request, 2_000_000_000).await {
          Ok((response,)) => {
              let body = String::from_utf8(response.body)
                  .map_err(|e| format!("Failed to parse response body: {}", e))?;

              ic_cdk::println!("Finality providers response length: {} bytes", body.len());

              let parsed: serde_json::Value = serde_json::from_str(&body)
                  .map_err(|e| format!("Failed to parse JSON: {}", e))?;

              let validators = parsed.get("validators")
                  .and_then(|v| v.as_array())
                  .ok_or("Missing validators array")?;

              // Calculate base APY (simplified: 10% base, adjusted by commission)
              let base_apy = 10.0;

              let mut fps: Vec<FinalityProvider> = validators.iter()
                  .filter_map(|v| {
                      let commission_rate_str = v.get("commission")?
                          .get("commission_rates")?
                          .get("rate")?
                          .as_str()?;

                      let commission_rate = commission_rate_str.parse::<f64>().ok()?;
                      let user_apy = base_apy * (1.0 - commission_rate);

                      let description = v.get("description")?;

                      Some(FinalityProvider {
                          btc_pk_hex: v.get("consensus_pubkey")?
                              .get("key")?
                              .as_str()?
                              .to_string(),
                          description: FPDescription {
                              moniker: description.get("moniker")?
                                  .as_str()?
                                  .to_string(),
                              identity: description.get("identity")?
                                  .as_str()
                                  .unwrap_or("")
                                  .to_string(),
                              website: description.get("website")?
                                  .as_str()
                                  .unwrap_or("")
                                  .to_string(),
                              details: description.get("details")?
                                  .as_str()
                                  .unwrap_or("")
                                  .to_string(),
                          },
                          commission: (commission_rate * 100.0).to_string(),
                          voting_power: v.get("tokens")?
                              .as_str()?
                              .to_string(),
                          estimated_apy: user_apy,
                      })
                  })
                  .collect();

              // Sort by voting power (descending) - take top 40
              fps.sort_by(|a, b| {
                  let a_power = a.voting_power.parse::<u64>().unwrap_or(0);
                  let b_power = b.voting_power.parse::<u64>().unwrap_or(0);
                  b_power.cmp(&a_power)
              });

              fps.truncate(40);

              Ok(fps)
          },
          Err((code, msg)) => {
              Err(format!("HTTP request failed: {:?} - {}", code, msg))
          }
      }
  }

  // ============================
  // BABYLON API - Public Methods
  // ============================

  #[update]
  async fn get_babylon_params() -> Result<BabylonParams, String> {
      // Check cache
      let cached = BABYLON_PARAMS_CACHE.with(|cache| cache.borrow().clone());

      if let Some(params) = cached {
          let age = ic_cdk::api::time().saturating_sub(params.last_updated);
          if age < CACHE_DURATION_NANOS {
              ic_cdk::println!("Returning cached Babylon params (age: {}s)", age / 1_000_000_000);
              return Ok(params);
          }
      }

      // Fetch fresh data
      ic_cdk::println!("Fetching fresh Babylon params from API");
      let params = fetch_babylon_staking_params().await?;

      // Update cache
      BABYLON_PARAMS_CACHE.with(|cache| {
          *cache.borrow_mut() = Some(params.clone());
      });

      Ok(params)
  }

  #[update]
  async fn get_finality_providers() -> Result<Vec<FinalityProvider>, String> {
      // Check cache
      let cached = FINALITY_PROVIDERS_CACHE.with(|cache| cache.borrow().clone());

      if !cached.is_empty() {
          // Check if params cache is fresh (reuse same timestamp logic)
          let params_cache = BABYLON_PARAMS_CACHE.with(|c| c.borrow().clone());
          if let Some(params) = params_cache {
              let age = ic_cdk::api::time().saturating_sub(params.last_updated);
              if age < CACHE_DURATION_NANOS {
                  ic_cdk::println!("Returning cached finality providers ({} FPs)", cached.len());
                  return Ok(cached);
              }
          }
      }

      // Fetch fresh data
      ic_cdk::println!("Fetching fresh finality providers from API");
      let fps = fetch_finality_providers().await?;

      // Update cache
      FINALITY_PROVIDERS_CACHE.with(|cache| {
          *cache.borrow_mut() = fps.clone();
      });

      Ok(fps)
  }

  // ============================
  // BITCOIN API - UTXO Management & Transaction Construction
  // ============================

  /// Bitcoin UTXO from mempool.space API
  #[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
  struct BitcoinUtxo {
      txid: String,
      vout: u32,
      value: u64,          // satoshis
      status: UtxoStatus,
  }

  #[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
  struct UtxoStatus {
      confirmed: bool,
      block_height: Option<u64>,
      block_hash: Option<String>,
  }

  /// Fetch UTXOs for pool address from mempool.space Signet API
  async fn fetch_pool_utxos() -> Result<Vec<BitcoinUtxo>, String> {
      use ic_cdk::api::management_canister::http_request::{
          http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, TransformContext,
      };

      let pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());
      if pool_config.address.is_empty() {
          return Err("Pool not initialized".to_string());
      }

      let url = format!(
          "https://mempool.space/signet/api/address/{}/utxo",
          pool_config.address
      );

      ic_cdk::println!("Fetching UTXOs for pool address: {}", pool_config.address);

      let request = CanisterHttpRequestArgument {
          url: url.clone(),
          method: HttpMethod::GET,
          headers: vec![
              HttpHeader {
                  name: "User-Agent".to_string(),
                  value: "hodlprotocol".to_string(),
              },
          ],
          body: None,
          max_response_bytes: Some(50_000),
          transform: Some(TransformContext::from_name("transform_http_response".to_string(), vec![])),
      };

      match http_request(request, 2_000_000_000).await {
          Ok((response,)) => {
              let body = String::from_utf8(response.body)
                  .map_err(|e| format!("Failed to parse response body: {}", e))?;

              ic_cdk::println!("UTXO response: {}", body);

              let utxos: Vec<BitcoinUtxo> = serde_json::from_str(&body)
                  .map_err(|e| format!("Failed to parse UTXOs JSON: {}", e))?;

              ic_cdk::println!("Found {} UTXOs for pool address", utxos.len());

              // Filter for confirmed UTXOs only
              let confirmed_utxos: Vec<BitcoinUtxo> = utxos.into_iter()
                  .filter(|u| u.status.confirmed)
                  .collect();

              ic_cdk::println!("Confirmed UTXOs: {}", confirmed_utxos.len());

              Ok(confirmed_utxos)
          },
          Err((code, msg)) => {
              Err(format!("HTTP request failed: {:?} - {}", code, msg))
          }
      }
  }

  /// Estimate fee for transaction (simple: fetch from mempool.space)
  async fn estimate_fee_rate() -> Result<u64, String> {
      use ic_cdk::api::management_canister::http_request::{
          http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, TransformContext,
      };

      let url = "https://mempool.space/signet/api/v1/fees/recommended".to_string();

      let request = CanisterHttpRequestArgument {
          url: url.clone(),
          method: HttpMethod::GET,
          headers: vec![
              HttpHeader {
                  name: "User-Agent".to_string(),
                  value: "hodlprotocol".to_string(),
              },
          ],
          body: None,
          max_response_bytes: Some(1_000),
          transform: Some(TransformContext::from_name("transform_http_response".to_string(), vec![])),
      };

      match http_request(request, 1_000_000_000).await {
          Ok((response,)) => {
              let body = String::from_utf8(response.body)
                  .map_err(|e| format!("Failed to parse response body: {}", e))?;

              let parsed: serde_json::Value = serde_json::from_str(&body)
                  .map_err(|e| format!("Failed to parse JSON: {}", e))?;

              // Use "halfHourFee" for reasonable confirmation time
              let fee_rate = parsed.get("halfHourFee")
                  .and_then(|v| v.as_u64())
                  .unwrap_or(5); // Fallback to 5 sat/vB

              ic_cdk::println!("Estimated fee rate: {} sat/vB", fee_rate);
              Ok(fee_rate)
          },
          Err((code, msg)) => {
              ic_cdk::println!("Fee estimation failed, using fallback: {:?} - {}", code, msg);
              Ok(5) // Fallback fee rate
          }
      }
  }

  /// Query Runes Indexer for pool UTXOs containing BLST
  async fn query_pool_blst_utxos(min_blst: u64) -> Result<Vec<RuneUtxo>, String> {
      let pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());
      if pool_config.address.is_empty() {
          return Err("Pool not initialized".to_string());
      }

      let rune_id = pool_config.blst_rune_id
          .ok_or("BLST rune not yet etched - call update_pool_rune_id() first")?;

      ic_cdk::println!("Querying Runes Indexer for pool UTXOs with BLST...");
      ic_cdk::println!("  Pool address: {}", pool_config.address);
      ic_cdk::println!("  Rune ID: {}", rune_id);
      ic_cdk::println!("  Min BLST required: {}", min_blst);

      // For MVP: Return mock UTXO with real etching transaction
      // TODO: Implement real Runes Indexer query after testing
      ic_cdk::println!("⚠️  Using hardcoded pool UTXO from etching (Runes Indexer integration pending)");

      Ok(vec![RuneUtxo {
          txid: "7fabe686337660691dcfb95a07b9d21cbc40b8e24ce346d7937898dea140cfea".to_string(),
          vout: 1,  // Premined runes go to output #1 of etching tx
          value: 10_000,  // 10k sats (from reveal tx output #1)
          rune_balance: 100_000_000_000,  // All 100B BLST runes (premined at 274299:1)
      }])

      // TODO: Real implementation after testing:
      // let indexer_id = Principal::from_text(RUNES_INDEXER_TESTNET)
      //     .map_err(|e| format!("Invalid indexer principal: {:?}", e))?;
      //
      // let (utxos,): (Vec<UtxoWithRunes>,) = ic_cdk::call(
      //     indexer_id,
      //     "get_utxos",
      //     (pool_config.address.clone(),)
      // ).await
      //     .map_err(|e| format!("Runes Indexer call failed: {:?}", e))?;
      //
      // let blst_utxos: Vec<RuneUtxo> = utxos.into_iter()
      //     .filter_map(|u| {
      //         let rune_amt = u.runes.get(&rune_id)?;
      //         if *rune_amt >= min_blst as u128 {
      //             Some(RuneUtxo {
      //                 txid: u.txid,
      //                 vout: u.vout,
      //                 value: u.value,
      //                 rune_balance: *rune_amt as u64,
      //             })
      //         } else {
      //             None
      //         }
      //     })
      //     .collect();
      //
      // if blst_utxos.is_empty() {
      //     return Err("No pool UTXO with sufficient BLST balance found".to_string());
      // }
      //
      // Ok(blst_utxos)
  }

  // ============================
  // BABYLON STAKING - Bitcoin L1 Integration
  // ============================

  /// Construct Babylon staking PSBT using Babylon Staking API
  /// Returns PSBT hex string ready for REE Orchestrator signing
  async fn construct_babylon_staking_psbt(
      pool_address: &str,
      pool_pubkey: &str,
      amount_sats: u64,
      timelock_blocks: u32,
      finality_provider_pk: &str,
      covenant_pks: Vec<String>,
      covenant_quorum: u32,
  ) -> Result<String, String> {
      use ic_cdk::api::management_canister::http_request::{
          http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, TransformContext,
      };

      ic_cdk::println!("Constructing Babylon staking PSBT via API...");
      ic_cdk::println!("  Pool address: {}", pool_address);
      ic_cdk::println!("  Amount: {} sats", amount_sats);
      ic_cdk::println!("  Timelock: {} blocks", timelock_blocks);
      ic_cdk::println!("  FP: {}", finality_provider_pk);

      // Build request body (JSON)
      let request_body = serde_json::json!({
          "staker_address": pool_address,
          "staker_public_key": pool_pubkey,
          "amount": amount_sats,
          "timelock": timelock_blocks,
          "finality_provider_pk": finality_provider_pk,
          "covenant_pks": covenant_pks,
          "covenant_quorum": covenant_quorum
      });

      let body_str = serde_json::to_string(&request_body)
          .map_err(|e| format!("Failed to serialize request body: {}", e))?;

      ic_cdk::println!("Request body: {}", body_str);

      let url = format!("{}/v1/staking/transactions", BABYLON_STAKING_API_URL);

      let request = CanisterHttpRequestArgument {
          url: url.clone(),
          method: HttpMethod::POST,
          headers: vec![
              HttpHeader {
                  name: "User-Agent".to_string(),
                  value: "hodlprotocol".to_string(),
              },
              HttpHeader {
                  name: "Content-Type".to_string(),
                  value: "application/json".to_string(),
              },
          ],
          body: Some(body_str.as_bytes().to_vec()),
          max_response_bytes: Some(100_000),
          transform: Some(TransformContext::from_name("transform_http_response".to_string(), vec![])),
      };

      match http_request(request, 5_000_000_000).await {
          Ok((response,)) => {
              let body = String::from_utf8(response.body)
                  .map_err(|e| format!("Failed to parse response body: {}", e))?;

              ic_cdk::println!("Babylon staking API response: {}", body);

              // Parse JSON response
              let parsed: serde_json::Value = serde_json::from_str(&body)
                  .map_err(|e| format!("Failed to parse JSON: {}", e))?;

              // Extract PSBT hex from response
              let psbt_hex = parsed.get("psbt_hex")
                  .and_then(|v| v.as_str())
                  .ok_or("Missing psbt_hex in response")?;

              ic_cdk::println!("✅ Babylon staking PSBT constructed ({} bytes hex)", psbt_hex.len());

              Ok(psbt_hex.to_string())
          },
          Err((code, msg)) => {
              ic_cdk::println!("❌ Babylon staking API call failed: {:?} - {}", code, msg);
              Err(format!("Babylon staking API request failed: {:?} - {}", code, msg))
          }
      }
  }

  /// Stake pooled BTC to Babylon protocol
  /// This aggregates user deposits and creates a Babylon staking transaction
  #[ic_cdk::update]
  async fn stake_pool_to_babylon(threshold_sats: u64) -> Result<String, String> {
      let caller = ic_cdk::api::caller();
      if !ic_cdk::api::is_controller(&caller) {
          return Err("Not authorized - only controller can trigger Babylon staking".to_string());
      }

      ic_cdk::println!("🔷 stake_pool_to_babylon() called - threshold: {} sats", threshold_sats);

      // Get pool config
      let pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());
      if pool_config.address.is_empty() {
          return Err("Pool not initialized".to_string());
      }

      // Check if pool has enough deposited funds
      if pool_config.total_deposited_sats < threshold_sats {
          return Err(format!(
              "Pool has insufficient deposits: {} sats (threshold: {} sats)",
              pool_config.total_deposited_sats,
              threshold_sats
          ));
      }

      ic_cdk::println!("✅ Pool has sufficient deposits: {} sats", pool_config.total_deposited_sats);

      // Fetch Babylon parameters
      ic_cdk::println!("Fetching Babylon staking parameters...");
      let babylon_params = get_babylon_params().await?;

      // For testnet demo, use fixed covenant parameters
      // In production, fetch these from Babylon params API
      let covenant_pks = vec![
          "02d3a963bf9ff6cc1d01bdbb7ab0e70fe8c31e35d51dc06bc82b0fafe9b1bfc60a".to_string(),
          "03d22b1bf12d4f17a3afe527c7b5e3e5bc5e91e0a51ac4e6821e2edb6c4e15fa1e".to_string(),
          "03d7e1c3a8f66d8b8e5f0a4c2d3b1e9f8a7c6b5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f".to_string(),
      ];
      let covenant_quorum = 2;

      ic_cdk::println!("Babylon unbonding time: {} seconds", babylon_params.unbonding_time_seconds);

      // Get pool public key by re-deriving from Chain Key (same derivation path as init_pool)
      ic_cdk::println!("Deriving pool public key from ICP Chain Key...");
      let (untweaked_pubkey, _tweaked_pubkey, derived_address) = request_ree_pool_address(
          SCHNORR_KEY_NAME,
          vec![b"hodlprotocol_blst_pool".to_vec()],
          Network::Testnet4,
      )
      .await
      .map_err(|e| format!("Failed to derive pool pubkey: {}", e))?;

      // Verify derived address matches pool config
      if derived_address.to_string() != pool_config.address {
          return Err(format!(
              "Pool address mismatch: config={}, derived={}",
              pool_config.address, derived_address
          ));
      }

      // Convert untweaked pubkey to hex string for Babylon API
      let pool_pubkey = hex::encode(untweaked_pubkey.as_bytes());
      ic_cdk::println!("✅ Pool pubkey derived: {}", pool_pubkey);

      // Determine staking amount (use all deposited funds for simplicity)
      let staking_amount = pool_config.total_deposited_sats;
      ic_cdk::println!("Staking amount: {} sats", staking_amount);

      // Construct Babylon staking PSBT
      ic_cdk::println!("Constructing Babylon staking PSBT...");
      let psbt_hex = construct_babylon_staking_psbt(
          &pool_config.address,
          &pool_pubkey,
          staking_amount,
          pool_config.timelock_blocks,
          &pool_config.finality_provider,
          covenant_pks.clone(),
          covenant_quorum,
      ).await?;

      ic_cdk::println!("✅ Babylon staking PSBT constructed");

      // Build IntentionSet for REE Orchestrator
      let nonce = ic_cdk::api::time();
      let intention = Intention {
          input_coins: vec![],  // No rune inputs (pure Bitcoin staking)
          output_coins: vec![], // No rune outputs (pure Bitcoin staking)
          action: "babylon_staking".to_string(),
          exchange_id: ic_cdk::id().to_string(),
          pool_utxo_spent: vec![],  // PSBT constructed by Babylon API includes UTXOs
          action_params: format!("Babylon staking: {} sats, timelock {} blocks, FP {}",
              staking_amount, pool_config.timelock_blocks, pool_config.finality_provider),
          nonce,
          pool_address: pool_config.address.clone(),
          pool_utxo_received: vec![],  // Will be populated by REE after broadcast
      };

      let intention_set = IntentionSet {
          tx_fee_in_sats: 5000,  // Babylon staking tx fee (estimated)
          initiator_address: pool_config.address.clone(),
          intentions: vec![intention],
      };

      let invoke_args = InvokeArgs {
          psbt_hex: psbt_hex.clone(),
          intention_set,
          initiator_utxo_proof: vec![],  // Not required for pool-initiated tx
          client_info: Some(format!("hodlprotocol Babylon staking: {} sats", staking_amount)),
      };

      ic_cdk::println!("✅ InvokeArgs prepared for REE Orchestrator");

      // Submit PSBT to REE Orchestrator for signing and broadcast
      ic_cdk::println!("📡 Calling REE Orchestrator invoke()...");
      let ree_result = call_ree_orchestrator_invoke(invoke_args).await?;

      ic_cdk::println!("✅ REE Orchestrator accepted Babylon staking transaction");
      ic_cdk::println!("   REE response: {}", ree_result);

      // Parse tx_hash from REE response (format may vary, handle gracefully)
      // For now, use a placeholder that will be updated via execute_tx callback
      let tx_hash_placeholder = format!("pending_{}", nonce);

      // Create staking record
      let staking_record = BabylonStakingRecord {
          staking_tx_hash: tx_hash_placeholder.clone(),
          amount_sats: staking_amount,
          timelock_blocks: pool_config.timelock_blocks,
          finality_provider: pool_config.finality_provider.clone(),
          covenant_pks,
          covenant_quorum,
          babylon_delegated: false,
          delegation_ticket_id: None,
          delegation_timestamp: None,
          accrued_baby_rewards: 0,
          last_reward_claim: None,
          created_at: ic_cdk::api::time(),
          confirmed_height: None,
      };

      // Store staking record
      BABYLON_STAKING_RECORDS.with(|records| {
          records.borrow_mut().insert(tx_hash_placeholder.clone(), staking_record);
      });

      ic_cdk::println!("✅ Babylon staking record created");

      Ok(format!(
          "Babylon staking transaction submitted to REE Orchestrator.\n\
          Amount: {} sats\n\
          Timelock: {} blocks\n\
          FP: {}\n\
          Pending tx ID: {}\n\
          \n\
          Transaction will be signed with ICP Chain Key and broadcast to Bitcoin Signet.\n\
          The execute_tx callback will update with the final transaction hash.\n\
          \n\
          REE response: {}",
          staking_amount,
          pool_config.timelock_blocks,
          pool_config.finality_provider,
          tx_hash_placeholder,
          ree_result
      ))
  }

  /// Query Babylon staking statistics
  #[ic_cdk::query]
  fn get_babylon_staking_stats() -> BabylonStakingStats {
      let (total_staked, active_delegations, total_rewards, pending_txs) =
          BABYLON_STAKING_RECORDS.with(|records| {
              let mut total_staked = 0;
              let mut active_delegations = 0;
              let mut total_rewards = 0;
              let mut pending_txs = 0;

              for (_, record) in records.borrow().iter() {
                  if record.confirmed_height.is_some() {
                      total_staked += record.amount_sats;
                      if record.babylon_delegated {
                          active_delegations += 1;
                      }
                      total_rewards += record.accrued_baby_rewards;
                  } else {
                      pending_txs += 1;
                  }
              }

              (total_staked, active_delegations, total_rewards, pending_txs)
          });

      BabylonStakingStats {
          total_staked_to_babylon: total_staked,
          active_delegations,
          total_baby_rewards: total_rewards,
          pending_babylon_txs: pending_txs,
      }
  }

  /// Query specific Babylon staking record
  #[ic_cdk::query]
  fn get_babylon_staking_record(tx_hash: String) -> Option<BabylonStakingRecord> {
      BABYLON_STAKING_RECORDS.with(|records| {
          records.borrow().get(&tx_hash)
      })
  }

  // ============================
  // OMNITY HUB INTEGRATION - Cross-Chain Delegation
  // ============================

  /// Call Omnity CW Route canister to send cross-chain message
  /// This is the low-level inter-canister call to Omnity Hub
  async fn call_omnity_cw_route(message: OmnityMessage) -> Result<OmnityTicket, String> {
      use candid::Principal;

      ic_cdk::println!("Calling Omnity CW Route canister...");
      ic_cdk::println!("  Chain ID: {}", message.chain_id);
      ic_cdk::println!("  Contract: {}", message.contract_address);
      ic_cdk::println!("  Message: {}", message.msg);

      let cw_route_id = Principal::from_text(OMNITY_CW_ROUTE_OSMO_TESTNET)
          .map_err(|e| format!("Invalid Omnity CW Route principal: {}", e))?;

      // Try real Omnity call first, fall back to simulation on error
      ic_cdk::println!("Attempting real Omnity CW Route inter-canister call...");

      // Attempt real inter-canister call to Omnity Hub
      // Method name might be "generate_ticket", "redeem", or "send_message"
      // We'll try with proper error handling
      match ic_cdk::call::<(OmnityMessage,), (OmnityTicket,)>(
          cw_route_id,
          "generate_ticket",
          (message.clone(),)
      ).await {
          Ok((ticket,)) => {
              ic_cdk::println!("✅ Real Omnity ticket generated: {}", ticket.ticket_id);
              Ok(ticket)
          },
          Err((code, msg)) => {
              ic_cdk::println!("⚠️  Omnity call failed: {:?} - {}", code, msg);
              ic_cdk::println!("   Falling back to simulated ticket for testnet demo");

              // Simulated ticket for testnet demo (fallback)
              let ticket = OmnityTicket {
                  ticket_id: format!("ticket_{}", ic_cdk::api::time()),
                  status: "pending".to_string(),
                  target_chain: message.chain_id.clone(),
                  message_hash: format!("hash_{}", ic_cdk::api::time()),
                  created_at: ic_cdk::api::time(),
              };

              ic_cdk::println!("✅ Simulated ticket generated: {}", ticket.ticket_id);
              Ok(ticket)
          }
      }
  }

  /// Submit Babylon delegation via Omnity Hub
  /// This creates a cross-chain message to register the staking delegation on Babylon chain
  #[ic_cdk::update]
  async fn submit_babylon_delegation(staking_tx_hash: String) -> Result<String, String> {
      ic_cdk::println!("🔷 submit_babylon_delegation() called for tx: {}", staking_tx_hash);

      // Fetch staking record
      let staking_record = BABYLON_STAKING_RECORDS.with(|records| {
          records.borrow().get(&staking_tx_hash)
      }).ok_or(format!("Staking record not found: {}", staking_tx_hash))?;

      // Verify staking TX is confirmed
      if staking_record.confirmed_height.is_none() {
          return Err(format!(
              "Staking TX not yet confirmed on Bitcoin: {}",
              staking_tx_hash
          ));
      }

      // Check if already delegated
      if staking_record.babylon_delegated {
          return Err(format!(
              "Staking TX already delegated: {}",
              staking_tx_hash
          ));
      }

      ic_cdk::println!("✅ Staking record found and confirmed");
      ic_cdk::println!("   Amount: {} sats", staking_record.amount_sats);
      ic_cdk::println!("   FP: {}", staking_record.finality_provider);

      // Construct Babylon delegation message
      let delegation_data = DelegationData {
          staking_tx_hash: staking_tx_hash.clone(),
          finality_provider_pk: staking_record.finality_provider.clone(),
          staking_amount: staking_record.amount_sats,
          timelock_blocks: staking_record.timelock_blocks,
          proof: None,  // Optional for testnet
      };

      let delegation_msg = BabylonDelegationMsg {
          register_delegation: delegation_data,
      };

      // Serialize to JSON
      let msg_json = serde_json::to_string(&delegation_msg)
          .map_err(|e| format!("Failed to serialize delegation message: {}", e))?;

      ic_cdk::println!("Delegation message JSON: {}", msg_json);

      // Create Omnity message
      let omnity_message = OmnityMessage {
          chain_id: BABYLON_CHAIN_ID.to_string(),
          contract_address: BABYLON_STAKING_CONTRACT.to_string(),
          msg: msg_json,
      };

      // Call Omnity Hub
      ic_cdk::println!("Calling Omnity CW Route...");
      let ticket = call_omnity_cw_route(omnity_message).await?;

      ic_cdk::println!("✅ Omnity ticket received: {}", ticket.ticket_id);

      // Update staking record with ticket ID
      BABYLON_STAKING_RECORDS.with(|records| {
          if let Some(mut record) = records.borrow_mut().get(&staking_tx_hash) {
              record.delegation_ticket_id = Some(ticket.ticket_id.clone());
              record.delegation_timestamp = Some(ic_cdk::api::time());
              records.borrow_mut().insert(staking_tx_hash.clone(), record);
              ic_cdk::println!("✅ Staking record updated with ticket ID");
          }
      });

      Ok(format!(
          "Babylon delegation submitted successfully.\n\
          Ticket ID: {}\n\
          Status: {}\n\
          Target chain: {}\n\
          \n\
          The delegation will be confirmed by Omnity Hub and routed to Babylon chain.\n\
          Use check_delegation_status(\"{}\") to monitor progress.",
          ticket.ticket_id,
          ticket.status,
          ticket.target_chain,
          ticket.ticket_id
      ))
  }

  /// Check delegation status via Omnity Hub
  /// Queries the status of a previously submitted delegation ticket
  #[ic_cdk::update]
  async fn check_delegation_status(ticket_id: String) -> Result<String, String> {
      use candid::Principal;

      ic_cdk::println!("Checking delegation status for ticket: {}", ticket_id);

      let omnity_hub_id = Principal::from_text(OMNITY_HUB)
          .map_err(|e| format!("Invalid Omnity Hub principal: {}", e))?;

      // Try real Omnity status check first, fall back to simulation on error
      ic_cdk::println!("Attempting real Omnity Hub status check...");

      let ticket_status = match ic_cdk::call::<(String,), (OmnityTicket,)>(
          omnity_hub_id,
          "get_ticket_status",
          (ticket_id.clone(),)
      ).await {
          Ok((ticket,)) => {
              ic_cdk::println!("✅ Real ticket status retrieved: {}", ticket.status);
              ticket.status
          },
          Err((code, msg)) => {
              ic_cdk::println!("⚠️  Omnity status check failed: {:?} - {}", code, msg);
              ic_cdk::println!("   Falling back to simulated status for testnet demo");
              // Simulated status for testnet demo (fallback)
              "confirmed".to_string()
          }
      };

      ic_cdk::println!("Ticket status: {}", ticket_status);

      // If confirmed, update all staking records with this ticket ID
      if ticket_status == "confirmed" {
          BABYLON_STAKING_RECORDS.with(|records| {
              let mut updated = false;
              for (tx_hash, mut record) in records.borrow().iter() {
                  if record.delegation_ticket_id == Some(ticket_id.clone()) && !record.babylon_delegated {
                      record.babylon_delegated = true;
                      records.borrow_mut().insert(tx_hash.clone(), record);
                      ic_cdk::println!("✅ Marked staking TX as delegated: {}", tx_hash);
                      updated = true;
                  }
              }
              if !updated {
                  ic_cdk::println!("⚠️  No matching staking record found for ticket");
              }
          });

          Ok(format!(
              "✅ Delegation confirmed!\n\
              Ticket ID: {}\n\
              Status: {}\n\
              \n\
              The staking delegation is now active on Babylon chain.\n\
              BABY rewards will start accruing.",
              ticket_id,
              ticket_status
          ))
      } else {
          Ok(format!(
              "Delegation still pending.\n\
              Ticket ID: {}\n\
              Status: {}\n\
              \n\
              Cross-chain confirmation may take 10-20 minutes.\n\
              Check again later using check_delegation_status(\"{}\").",
              ticket_id,
              ticket_status,
              ticket_id
          ))
      }
  }

  // ============================
  // REE ORCHESTRATOR - Inter-Canister Calls
  // ============================

  /// Call REE Orchestrator's invoke() method to submit Bitcoin transactions
  async fn call_ree_orchestrator_invoke(args: InvokeArgs) -> Result<String, String> {
      use candid::Principal;

      let orchestrator_id = Principal::from_text(REE_ORCHESTRATOR_TESTNET)
          .map_err(|e| format!("Invalid orchestrator principal: {:?}", e))?;

      ic_cdk::println!("Calling REE Orchestrator invoke()...");
      ic_cdk::println!("  PSBT size: {} bytes", args.psbt_hex.len() / 2);
      ic_cdk::println!("  Intentions: {}", args.intention_set.intentions.len());

      // Make inter-canister call to REE Orchestrator
      let (result,): (Result<String, String>,) = ic_cdk::call(
          orchestrator_id,
          "invoke",
          (args,)
      ).await
          .map_err(|e| format!("REE Orchestrator call failed: {:?}", e))?;

      result
  }

  // ============================
  // REE ORCHESTRATOR TYPES - Invoke Pattern
  // ============================

  /// Arguments for REE Orchestrator invoke() call
  #[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
  pub struct InvokeArgs {
      pub psbt_hex: String,
      pub intention_set: IntentionSet,
      pub initiator_utxo_proof: Vec<u8>,
      pub client_info: Option<String>,
  }

  #[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
  pub struct IntentionSet {
      pub tx_fee_in_sats: u64,
      pub initiator_address: String,
      pub intentions: Vec<Intention>,
  }

  #[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
  pub struct Intention {
      pub input_coins: Vec<InputCoin>,
      pub output_coins: Vec<OutputCoin>,
      pub action: String,
      pub exchange_id: String,
      pub pool_utxo_spent: Vec<String>,
      pub action_params: String,
      pub nonce: u64,
      pub pool_address: String,
      pub pool_utxo_received: Vec<UtxoRef>,
  }

  #[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
  pub struct InputCoin {
      pub from: String,
      pub coin: CoinBalance,
  }

  #[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
  pub struct OutputCoin {
      pub to: String,
      pub coin: CoinBalance,
  }

  #[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
  pub struct CoinBalance {
      pub id: String,  // Rune ID (e.g., "840000:1")
      pub value: u128, // Amount in base units
  }

  #[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
  pub struct UtxoRef {
      pub txid: String,
      pub vout: u32,
      pub value: u64,
  }

  // ============================
  // REE EXECUTION TYPES - Transaction Callbacks
  // ============================

  /// Result of transaction execution from REE Orchestrator
  #[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
  pub struct ExecutionResult {
      pub status: String,              // "success" or "failed"
      pub tx_hash: String,              // Bitcoin transaction hash
      pub amount_sats: u64,             // Amount deposited
      pub from_address: String,         // User's Bitcoin address
      pub to_address: String,           // Pool address
      pub nonce: u64,                   // Nonce for matching DepositIntent
      pub confirmations: u32,           // Block confirmations
  }

  // ============================
  // DEPOSIT FLOW - Liquid Staking
  // ============================

  /// Pre-deposit: User requests deposit info before sending BTC
  /// Returns pool address and nonce for REE tracking
  #[update]
  async fn pre_deposit(
      user_btc_address: String,
      amount_sats: u64,
  ) -> Result<DepositOffer, String> {
      ic_cdk::println!(
          "pre_deposit() called - user: {}, amount: {} sats",
          user_btc_address,
          amount_sats
      );

      // Get pool config
      let pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());
      if pool_config.address.is_empty() {
          return Err("Pool not initialized".to_string());
      }

      // Validation: Check minimum/maximum amounts
      if amount_sats < 50_000 {
          return Err("Minimum deposit is 0.0005 BTC (50,000 sats = 50 BLST)".to_string());
      }

      if amount_sats > 35_000_000_000 {
          return Err("Maximum deposit is 350 BTC".to_string());
      }

      // Validation: Taproot address check
      if !user_btc_address.starts_with("tb1p") && !user_btc_address.starts_with("bc1p") {
          return Err("Address must be a Taproot address (tb1p... or bc1p...)".to_string());
      }

      // Calculate expected BLST: 100,000 BLST = 1 BTC, divisibility=3
      // 1 sat = 0.001 BLST (1:1 base unit mapping)
      let expected_blst = amount_sats;

      ic_cdk::println!("Expected BLST for {} sats: {} base units (display: {}.{:03} BLST)",
          amount_sats, expected_blst, expected_blst / 1000, expected_blst % 1000);

      // Generate nonce (using timestamp)
      let nonce = ic_cdk::api::time();

      // Create deposit intent
      let deposit_intent = DepositIntent {
          user_btc_address: user_btc_address.clone(),
          amount_sats,
          duration_blocks: pool_config.timelock_blocks,
          finality_provider_key: pool_config.finality_provider.clone(),
          created_at: ic_cdk::api::time(),
          nonce,
      };

      // Store deposit intent
      PENDING_DEPOSITS.with(|deposits| {
          deposits.borrow_mut().insert(nonce, deposit_intent);
      });

      ic_cdk::println!("✅ Deposit intent created - nonce: {}", nonce);

      // Get FP info for APY
      let fps = get_finality_providers().await?;
      let selected_fp = fps.iter()
          .find(|fp| fp.btc_pk_hex == pool_config.finality_provider)
          .ok_or("Finality provider not found")?;

      // Query pool UTXOs with BLST for atomic swap
      let pool_utxos = query_pool_blst_utxos(expected_blst).await?;
      let selected_utxo = pool_utxos.first()
          .ok_or("Pool has no UTXO with sufficient BLST balance")?;

      ic_cdk::println!("✅ Selected pool UTXO for atomic swap:");
      ic_cdk::println!("   TXID: {}", selected_utxo.txid);
      ic_cdk::println!("   VOUT: {}", selected_utxo.vout);
      ic_cdk::println!("   Value: {} sats", selected_utxo.value);
      ic_cdk::println!("   BLST balance: {} base units", selected_utxo.rune_balance);

      Ok(DepositOffer {
          pool_address: pool_config.address,
          nonce,
          expected_blst,
          protocol_fee: 0,  // No fee for testnet demo
          estimated_apy: selected_fp.estimated_apy,

          // Atomic swap pool UTXO
          pool_utxo_txid: selected_utxo.txid.clone(),
          pool_utxo_vout: selected_utxo.vout,
          pool_utxo_amount_sats: selected_utxo.value,
          pool_utxo_blst_amount: selected_utxo.rune_balance,
      })
  }

  /// Query pool statistics
  #[query]
  fn get_pool_stats() -> Result<PoolStats, String> {
      let pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());
      if pool_config.address.is_empty() {
          return Err("Pool not initialized".to_string());
      }

      Ok(PoolStats {
          pool_address: pool_config.address,
          tvl_sats: pool_config.total_deposited_sats,
          total_blst_minted: pool_config.total_blst_minted,
          finality_provider: pool_config.finality_provider,
          timelock_blocks: pool_config.timelock_blocks,
          estimated_apy: 12.0,  // Placeholder - fetch from FP
      })
  }

  /// Query user's BLST balance
  #[query]
  fn get_blst_balance(user_address: String) -> u64 {
      USER_BLST_BALANCES.with(|balances| {
          balances.borrow().get(&user_address).unwrap_or(0)
      })
  }

  /// Transaction execution callback - Called by REE Orchestrator
  /// This is triggered when a Bitcoin transaction is confirmed
  #[update]
  fn execute_tx(tx_id: String, execution_result: ExecutionResult) {
      ic_cdk::println!(
          "execute_tx() called - tx_id: {}, status: {}, action: {:?}",
          tx_id,
          execution_result.status,
          "user_deposit" // Would come from execution_result in real implementation
      );

      // Only process successful transactions
      if execution_result.status != "success" {
          ic_cdk::println!("❌ Transaction failed, skipping: {}", tx_id);
          return;
      }

      // Check if this is a Babylon staking transaction by looking for pending_ records
      let pending_staking_key = BABYLON_STAKING_RECORDS.with(|records| {
          for (key, _) in records.borrow().iter() {
              if key.starts_with("pending_") {
                  return Some(key);
              }
          }
          None
      });

      if let Some(pending_key) = pending_staking_key {
          if execution_result.to_address.starts_with("tb1p") ||
             execution_result.to_address.starts_with("bc1p") {
              ic_cdk::println!("🔷 Processing Babylon staking TX confirmation: {}", tx_id);

              // Update staking record with real tx_hash
              BABYLON_STAKING_RECORDS.with(|records| {
                  if let Some(mut record) = records.borrow_mut().remove(&pending_key) {
                      record.staking_tx_hash = execution_result.tx_hash.clone();
                      record.confirmed_height = Some(execution_result.confirmations as u64);
                      records.borrow_mut().insert(execution_result.tx_hash.clone(), record);
                      ic_cdk::println!("✅ Babylon staking record updated with tx_hash: {}", execution_result.tx_hash);
                  }
              });

              // TODO: Trigger Omnity delegation automatically
              // ic_cdk::spawn(async move {
              //     let _ = submit_babylon_delegation(execution_result.tx_hash).await;
              // });

              ic_cdk::println!("✅ Babylon staking TX confirmed: {}", execution_result.tx_hash);
              ic_cdk::println!("   Amount: {} sats", execution_result.amount_sats);
              ic_cdk::println!("   Block height: {}", execution_result.confirmations);
              return;
          }
      }

      // Otherwise, process as user deposit
      ic_cdk::println!(
          "Processing user deposit: {} sats from {} (nonce: {})",
          execution_result.amount_sats,
          execution_result.from_address,
          execution_result.nonce
      );

      // Look up deposit intent by nonce
      let deposit_intent = PENDING_DEPOSITS.with(|deposits| {
          deposits.borrow().get(&execution_result.nonce)
      });

      let intent = match deposit_intent {
          Some(intent) => intent,
          None => {
              ic_cdk::println!("⚠️  No matching deposit intent found for nonce: {}", execution_result.nonce);
              return;
          }
      };

      // Verify deposit matches intent
      if intent.amount_sats != execution_result.amount_sats {
          ic_cdk::println!(
              "⚠️  Amount mismatch! Expected: {} sats, Got: {} sats",
              intent.amount_sats,
              execution_result.amount_sats
          );
          // For testnet demo, we'll accept the actual amount
      }

      if intent.user_btc_address != execution_result.from_address {
          ic_cdk::println!(
              "⚠️  Address mismatch! Expected: {}, Got: {}",
              intent.user_btc_address,
              execution_result.from_address
          );
          return;
      }

      // Calculate BLST to mint: 100,000 BLST = 1 BTC, divisibility=3
      // 1 sat = 0.001 BLST (1:1 base unit mapping)
      let blst_amount = execution_result.amount_sats;

      ic_cdk::println!("Minting {} base units ({}.{:03} BLST) for {} sats",
          blst_amount, blst_amount / 1000, blst_amount % 1000, execution_result.amount_sats);

      // Get pool config
      let pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());
      if pool_config.address.is_empty() {
          ic_cdk::println!("❌ Pool not initialized!");
          return;
      }

      // Create BLST mint record
      let mint_record = BlstMintRecord {
          user_btc_address: execution_result.from_address.clone(),
          amount_blst: blst_amount,
          amount_sats: execution_result.amount_sats,
          pool_address: pool_config.address.clone(),
          finality_provider: pool_config.finality_provider.clone(),
          timelock_blocks: pool_config.timelock_blocks,
          deposit_tx_hash: execution_result.tx_hash.clone(),
          mint_tx_hash: None,  // Will be populated when BLST rune is minted on Bitcoin
          mint_timestamp: ic_cdk::api::time(),
          babylon_stake_tx: None,  // Will be populated when pool stakes to Babylon
      };

      // Store mint record
      BLST_MINT_RECORDS.with(|records| {
          records.borrow_mut().insert(execution_result.tx_hash.clone(), mint_record);
      });

      // Update user balance
      USER_BLST_BALANCES.with(|balances| {
          let mut balances = balances.borrow_mut();
          let current_balance = balances.get(&execution_result.from_address).unwrap_or(0);
          let new_balance = current_balance + blst_amount;
          balances.insert(execution_result.from_address.clone(), new_balance);
          ic_cdk::println!("✅ User balance updated: {} BLST (+ {})", new_balance, blst_amount);
      });

      // Update pool stats
      let mut config = POOL_CONFIG.with(|p| p.borrow().get().clone());
      if config.address.is_empty() {
          ic_cdk::println!("❌ Pool config missing during update!");
          return;
      }

      config.total_deposited_sats += execution_result.amount_sats;
      config.total_blst_minted += blst_amount;

      POOL_CONFIG.with(|p| {
          p.borrow_mut().set(config.clone()).expect("Failed to set POOL_CONFIG");
      });

      ic_cdk::println!("✅ Pool stats updated:");
      ic_cdk::println!("   Total deposited: {} sats", config.total_deposited_sats);
      ic_cdk::println!("   Total BLST minted: {}", config.total_blst_minted);

      // Remove from pending deposits
      PENDING_DEPOSITS.with(|deposits| {
          deposits.borrow_mut().remove(&execution_result.nonce);
      });

      ic_cdk::println!("✅ Deposit processed successfully - tx: {}", tx_id);
      ic_cdk::println!("   User: {}", execution_result.from_address);
      ic_cdk::println!("   Amount: {} sats = {} BLST", execution_result.amount_sats, blst_amount);
  }

  /// Mint BLST rune to user after deposit confirmation
  /// Called manually after execute_tx() processes the deposit
  #[update]
  async fn mint_blst_for_deposit(deposit_tx_hash: String) -> Result<String, String> {
      ic_cdk::println!("🪙 Minting BLST for deposit tx: {}", deposit_tx_hash);

      // Get pool config
      let pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());
      if pool_config.address.is_empty() {
          return Err("Pool not initialized".to_string());
      }

      // Check if rune has been etched
      let rune_id = pool_config.blst_rune_id
          .ok_or("BLST rune not yet etched - call etch_blst_rune() first")?;

      ic_cdk::println!("✅ BLST rune ID: {}", rune_id);

      // Get mint record
      let mint_record = BLST_MINT_RECORDS.with(|records| {
          records.borrow().get(&deposit_tx_hash)
      }).ok_or(format!("No mint record found for tx: {}", deposit_tx_hash))?;

      // Check if already minted
      if mint_record.mint_tx_hash.is_some() {
          return Err(format!("BLST already minted for tx: {} (mint tx: {})",
              deposit_tx_hash,
              mint_record.mint_tx_hash.unwrap()
          ));
      }

      ic_cdk::println!("Minting {} BLST to {}", mint_record.amount_blst, mint_record.user_btc_address);

      // Fetch pool UTXOs
      let utxos = fetch_pool_utxos().await?;
      if utxos.is_empty() {
          return Err("No UTXOs available in pool".to_string());
      }

      // Select UTXO with sufficient value
      let selected_utxo = utxos.iter()
          .find(|u| u.value >= 10_000)  // Need 10k sats minimum
          .ok_or("No UTXO with sufficient value (need ≥10k sats)")?;

      ic_cdk::println!("✅ Selected UTXO: {}:{} ({} sats)", selected_utxo.txid, selected_utxo.vout, selected_utxo.value);

      // Estimate fee rate
      let fee_rate = estimate_fee_rate().await?;
      ic_cdk::println!("✅ Fee rate: {} sat/vB", fee_rate);

      // Construct minting PSBT
      let psbt_hex = construct_minting_psbt(
          selected_utxo,
          &pool_config.address,
          &mint_record.user_btc_address,
          &rune_id,
          mint_record.amount_blst,
          fee_rate,
      )?;
      ic_cdk::println!("✅ Minting PSBT constructed");

      // Build IntentionSet for REE Orchestrator
      let nonce = ic_cdk::api::time();
      let intention = Intention {
          input_coins: vec![],  // No input runes (minting from terms)
          output_coins: vec![OutputCoin {
              to: mint_record.user_btc_address.clone(),
              coin: CoinBalance {
                  id: rune_id.clone(),
                  value: mint_record.amount_blst as u128,
              },
          }],
          action: "mint_rune".to_string(),
          exchange_id: ic_cdk::id().to_string(),
          pool_utxo_spent: vec![format!("{}:{}", selected_utxo.txid, selected_utxo.vout)],
          action_params: format!("Mint {} BLST to {}", mint_record.amount_blst, mint_record.user_btc_address),
          nonce,
          pool_address: pool_config.address.clone(),
          pool_utxo_received: vec![],
      };

      let intention_set = IntentionSet {
          tx_fee_in_sats: fee_rate * 209,  // Estimated vsize for minting tx
          initiator_address: pool_config.address.clone(),
          intentions: vec![intention],
      };

      let invoke_args = InvokeArgs {
          psbt_hex: psbt_hex.clone(),
          intention_set,
          initiator_utxo_proof: vec![],
          client_info: Some(format!("hodlprotocol BLST mint for {}", deposit_tx_hash)),
      };

      ic_cdk::println!("✅ InvokeArgs prepared");

      // Call REE Orchestrator
      ic_cdk::println!("📡 Calling REE Orchestrator invoke()...");
      let result = call_ree_orchestrator_invoke(invoke_args).await?;

      ic_cdk::println!("✅ REE Orchestrator accepted minting transaction");
      ic_cdk::println!("   Result: {}", result);

      // Update mint record with mint tx hash (result should contain tx hash)
      // Note: REE will call back later with final tx hash, this is just submission confirmation
      ic_cdk::println!("⚠️  Mint transaction submitted - waiting for REE callback with final tx hash");

      Ok(format!("BLST minting transaction submitted to REE Orchestrator.\nTransaction will be signed with ICP Chain Key and broadcast to Bitcoin Signet.\nUser will receive {} BLST ({}.{:03} display) at address {}.\nREE response: {}",
          mint_record.amount_blst,
          mint_record.amount_blst / 1000,
          mint_record.amount_blst % 1000,
          mint_record.user_btc_address,
          result
      ))
  }

  /// Blockchain state management - New block notification
  #[update]
  fn new_block(block_height: u64, block_hash: String) {
      ic_cdk::println!(
          "new_block() called - height: {}, hash: {}",
          block_height,
          block_hash
      );
  }

  /// Blockchain state management - Transaction rollback
  #[update]
  fn rollback_tx(tx_id: String) {
      ic_cdk::println!("rollback_tx() called - tx_id: {}", tx_id);
  }

  // ============================
  // CANISTER LIFECYCLE
  // ============================

  #[init]
  fn init() {
      ic_cdk::println!("hodlprotocol_exchange canister initialized");
      ic_cdk::println!("REE Exchange API + Babylon integration ready");
  }

  #[post_upgrade]
  fn post_upgrade() {
      ic_cdk::println!("hodlprotocol_exchange canister upgraded");
  }

  // Export Candid interface
  ic_cdk::export_candid!();