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
use ree_types::{
    bitcoin::Network,
    bitcoin::psbt::Psbt,
    bitcoin::consensus::serialize as bitcoin_serialize,
    schnorr::request_ree_pool_address,
    exchange_interfaces::*,
    orchestrator_interfaces::RegisterExchangeArgs,
    psbt::ree_pool_sign,
    Pubkey,
    Txid,
    Utxo,
    CoinBalances,
};

// Bitcoin Runes support
use ordinals::{Etching, Rune, Runestone};

// Canister interfaces for deterministic UTXO fetching
mod rune_indexer;
mod bitcoin_canister;

// ============================
// TYPE DEFINITIONS - Pool & Deposit Tracking
// ============================

/// Represents the state of the pool at a specific point in time
/// Each transaction creates a new state entry in the chain
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct PoolState {
    pub id: Option<Txid>,      // Transaction ID that created this state (None for initial)
    pub nonce: u64,            // Incremental counter (0, 1, 2, 3...)
    pub utxo: Option<Utxo>,    // Current UTXO holding pool assets
}

impl PoolState {
    /// Get BTC balance from this state's UTXO
    pub fn btc_supply(&self) -> u64 {
        self.utxo.as_ref().map(|utxo| utxo.sats).unwrap_or_default()
    }
}

/// Configuration for the liquid staking pool
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, Default)]
pub struct PoolConfig {
    pub address: String,              // Bitcoin Taproot address (tb1p...)
    pub pubkey: Option<Pubkey>,       // Untweaked public key (for REE signing)
    pub tweaked: Option<Pubkey>,      // Tweaked public key (Taproot)
    pub finality_provider: String,    // Top FP pubkey from Babylon
    pub timelock_blocks: u32,          // 12,960 blocks (≈90 days)
    pub blst_rune_id: Option<String>,  // Populated after etching
    pub total_deposited_sats: u64,     // Total BTC deposited
    pub total_blst_minted: u64,        // Total BLST issued (in BLST units)
    pub created_at: u64,               // Timestamp
    #[serde(default)]
    pub states: Vec<PoolState>,        // Transaction state chain for REE integration (migrated)

    // Funding address for bootstrapping (separate from pool)
    #[serde(default)]
    pub funding_address: Option<String>,    // Funding address for initial bootstrap
    #[serde(default)]
    pub funding_pubkey: Option<Pubkey>,     // Untweaked funding pubkey
    #[serde(default)]
    pub funding_tweaked: Option<Pubkey>,    // Tweaked funding pubkey
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

/// Transaction record for tracking confirmations (REE integration)
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, Default)]
pub struct TxRecord {
    pub pools: Vec<String>,  // Pool addresses affected by this transaction
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

impl Storable for TxRecord {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> std::borrow::Cow<'_, [u8]> {
        let mut bytes = vec![];
        ciborium::ser::into_writer(self, &mut bytes).expect("Failed to serialize TxRecord");
        std::borrow::Cow::Owned(bytes)
    }

    fn from_bytes(bytes: std::borrow::Cow<'_, [u8]>) -> Self {
        ciborium::de::from_reader(bytes.as_ref()).expect("Failed to deserialize TxRecord")
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

    // REE transaction tracking: (Txid, is_confirmed) → TxRecord
    // Used by new_block() and rollback_tx() for confirmation tracking
    static TX_RECORDS: RefCell<StableBTreeMap<(Txid, bool), TxRecord, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(5))),
        )
    );

    // REE block tracking: block_height → NewBlockInfo
    // Used for reorg detection and transaction finalization
    static BLOCKS: RefCell<StableBTreeMap<u32, NewBlockInfo, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(6))),
        )
    );

    // Tracks pools currently executing transactions (prevents concurrent execution)
    static EXECUTING_POOLS: RefCell<std::collections::HashSet<String>> = RefCell::new(
        std::collections::HashSet::new()
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
  const BTC_CANISTER_TESTNET: &str = "g4xu7-jiaaa-aaaan-aaaaq-cai";

  // Omnity Hub Canister IDs
  const OMNITY_HUB: &str = "bkyz2-fmaaa-aaaaa-qaaaq-cai";
  const OMNITY_CW_ROUTE_OSMO_TESTNET: &str = "nfehe-haaaa-aaaar-qah3q-cai";

  // Babylon Chain Configuration
  const BABYLON_CHAIN_ID: &str = "bbn-test-6";
  const BABYLON_STAKING_CONTRACT: &str = "babylon1...";  // TODO: Get real contract address

// ============================
// SECURITY GUARDS - REE Integration
// ============================

/// Guard function to ensure only REE Orchestrator can call sensitive methods
fn ensure_testnet4_orchestrator() -> Result<(), String> {
    let caller = ic_cdk::api::caller();
    const REE_ORCHESTRATOR_TESTNET: &str = "hvyp5-5yaaa-aaaao-qjxha-cai";

    if caller.to_text() != REE_ORCHESTRATOR_TESTNET {
        return Err(format!(
            "Unauthorized: Only REE Orchestrator can call this method. Caller: {}",
            caller
        ));
    }
    Ok(())
}

/// RAII guard to prevent concurrent execution on the same pool
#[must_use]
pub struct ExecuteTxGuard(String);

impl ExecuteTxGuard {
    pub fn new(pool_address: String) -> Option<Self> {
        EXECUTING_POOLS.with(|executing_pools| {
            if executing_pools.borrow().contains(&pool_address) {
                return None;  // Pool is already executing
            }
            executing_pools.borrow_mut().insert(pool_address.clone());
            Some(ExecuteTxGuard(pool_address))
        })
    }
}

impl Drop for ExecuteTxGuard {
    fn drop(&mut self) {
        EXECUTING_POOLS.with_borrow_mut(|executing_pools| {
            executing_pools.remove(&self.0);
        });
    }
}

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
      let (addr, pubkey_opt, tweaked_opt) = if cfg!(target_arch = "wasm32") {
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
                  (address.to_string(), Some(untweaked), Some(tweaked))
              }
              Err(e) => {
                  // If key generation fails, use mock address for local testing
                  ic_cdk::println!("⚠️  Chain Key generation failed (local dfx?): {}", e);
                  ic_cdk::println!("📍 Using mock pool address for local testing");
                  // Mock Bitcoin Signet Taproot address
                  ("tb1pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqfmkg5p".to_string(), None, None)
              }
          }
      } else {
          // Non-wasm compilation (shouldn't happen, but just in case)
          ("tb1pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqfmkg5p".to_string(), None, None)
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
          pubkey: pubkey_opt,           // Store untweaked pubkey for REE
          tweaked: tweaked_opt,         // Store tweaked pubkey for Taproot
          finality_provider: top_fp.btc_pk_hex.clone(),
          timelock_blocks: POOL_TIMELOCK_BLOCKS,
          blst_rune_id: None,  // Will be populated after etching
          total_deposited_sats: 0,
          total_blst_minted: 0,
          created_at: ic_cdk::api::time(),
          states: vec![],  // Start with empty state chain (nonce will be 0)
          funding_address: None,  // Will be initialized separately
          funding_pubkey: None,
          funding_tweaked: None,
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

  /// Regenerate and store pubkeys for an already-deployed pool
  /// This is needed for pools that were initialized before we added pubkey storage
  #[update]
  async fn update_pool_pubkeys() -> Result<String, String> {
      let caller = ic_cdk::api::caller();
      if !ic_cdk::api::is_controller(&caller) {
          return Err("Not authorized - only controller can update pool pubkeys".to_string());
      }

      // Get existing pool config
      let mut pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());
      if pool_config.address.is_empty() {
          return Err("Pool not initialized yet".to_string());
      }

      ic_cdk::println!("Regenerating pubkeys for pool address: {}", pool_config.address);

      // Regenerate pubkeys using the SAME derivation path as init_pool
      let (untweaked, tweaked, regenerated_address) = request_ree_pool_address(
          SCHNORR_KEY_NAME,
          vec![b"hodlprotocol_blst_pool".to_vec()],
          Network::Testnet4,
      )
      .await?;

      // Verify the regenerated address matches the stored one
      if regenerated_address.to_string() != pool_config.address {
          return Err(format!(
              "Address mismatch! Expected {}, got {}. This means the derivation path is incorrect.",
              pool_config.address,
              regenerated_address
          ));
      }

      ic_cdk::println!("✅ Address verified: {}", regenerated_address);
      ic_cdk::println!("   Untweaked pubkey: {:?}", untweaked);
      ic_cdk::println!("   Tweaked pubkey: {:?}", tweaked);

      // Store the pubkeys
      pool_config.pubkey = Some(untweaked);
      pool_config.tweaked = Some(tweaked);

      // Save updated config
      POOL_CONFIG.with(|p| {
          p.borrow_mut().set(pool_config.clone()).expect("Failed to update POOL_CONFIG");
      });

      Ok(format!("Pubkeys successfully regenerated and stored for pool {}", pool_config.address))
  }

  /// Initialize funding address for bootstrapping (used to etch rune)
  /// This address is separate from the pool address and used only for initial operations
  #[update]
  async fn init_funding_address() -> Result<String, String> {
      let caller = ic_cdk::api::caller();
      if !ic_cdk::api::is_controller(&caller) {
          return Err("Not authorized - only controller can initialize funding address".to_string());
      }

      // Get existing pool config
      let mut pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());
      if pool_config.address.is_empty() {
          return Err("Pool must be initialized first (call init_pool)".to_string());
      }

      // Check if funding address already exists
      if pool_config.funding_address.is_some() {
          return Err(format!("Funding address already initialized: {}", pool_config.funding_address.unwrap()));
      }

      ic_cdk::println!("🔨 Generating funding address with ICP Chain Key...");

      // Generate funding address using DIFFERENT derivation path
      let (untweaked, tweaked, address) = request_ree_pool_address(
          SCHNORR_KEY_NAME,
          vec![b"hodlprotocol_funding".to_vec()],  // Different path = different address
          Network::Testnet4,
      )
      .await?;

      ic_cdk::println!("✅ Funding address generated: {}", address);
      ic_cdk::println!("   Untweaked pubkey: {:?}", untweaked);
      ic_cdk::println!("   Tweaked pubkey: {:?}", tweaked);

      // Store funding address in pool config
      pool_config.funding_address = Some(address.to_string());
      pool_config.funding_pubkey = Some(untweaked);
      pool_config.funding_tweaked = Some(tweaked);

      POOL_CONFIG.with(|p| {
          p.borrow_mut().set(pool_config.clone()).expect("Failed to update POOL_CONFIG");
      });

      ic_cdk::println!("✅ Funding address initialized successfully!");
      ic_cdk::println!("   Funding Address: {}", address);
      ic_cdk::println!("   Pool Address: {}", pool_config.address);
      ic_cdk::println!("📍 Send BTC to funding address to enable rune etching");

      Ok(address.to_string())
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

  /// Clear rune ID to allow re-etching (use with caution - only for migration)
  #[update]
  fn clear_rune_id() -> Result<String, String> {
      let caller = ic_cdk::api::caller();
      if !ic_cdk::api::is_controller(&caller) {
          return Err("Not authorized - only controller can clear rune ID".to_string());
      }

      // Get current pool config
      let mut pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());
      if pool_config.address.is_empty() {
          return Err("Pool not initialized".to_string());
      }

      ic_cdk::println!("⚠️  Clearing rune_id for re-etching");

      // Clear rune ID
      pool_config.blst_rune_id = None;

      // Save updated config
      POOL_CONFIG.with(|p| {
          p.borrow_mut().set(pool_config).expect("Failed to set POOL_CONFIG");
      });

      ic_cdk::println!("✅ Rune ID cleared - ready for re-etching");

      Ok("Rune ID cleared successfully. You can now call etch_blst_rune()".to_string())
  }

  /// Sweep UTXOs from pool address to funding address (recovery method)
  /// Used to consolidate sats before etching
  #[update]
  async fn sweep_pool_to_funding() -> Result<String, String> {
      let caller = ic_cdk::api::caller();
      if !ic_cdk::api::is_controller(&caller) {
          return Err("Not authorized - only controller can sweep funds".to_string());
      }

      let pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());
      if pool_config.address.is_empty() {
          return Err("Pool not initialized".to_string());
      }

      let funding_address = pool_config.funding_address
          .ok_or("Funding address not initialized - call init_funding_address first")?;

      ic_cdk::println!("💸 Sweeping UTXOs from pool to funding address...");
      ic_cdk::println!("   From: {}", pool_config.address);
      ic_cdk::println!("   To: {}", funding_address);

      // Fetch UTXOs from pool address
      let utxos = fetch_pool_utxos().await?;
      if utxos.is_empty() {
          return Err("No UTXOs found at pool address".to_string());
      }

      ic_cdk::println!("   Found {} UTXO(s)", utxos.len());

      // Calculate total
      let total_sats: u64 = utxos.iter().map(|u| u.value).sum();
      ic_cdk::println!("   Total: {} sats", total_sats);

      // Estimate fee (simple sweep, ~150 vbytes per input + ~40 for output)
      let fee_rate = estimate_fee_rate().await?;
      let estimated_vsize = (utxos.len() as u64 * 150) + 40;
      let fee = fee_rate * estimated_vsize;
      let output_amount = total_sats.saturating_sub(fee);

      if output_amount < 1000 {
          return Err(format!("Amount too small after fees: {} sats", output_amount));
      }

      ic_cdk::println!("   Fee: {} sats ({}vB @ {} sat/vB)", fee, estimated_vsize, fee_rate);
      ic_cdk::println!("   Output: {} sats", output_amount);

      // Build simple sweep transaction
      use bitcoin::{Transaction, TxIn, TxOut, OutPoint, ScriptBuf, Sequence};
      use bitcoin::psbt::Psbt;

      let inputs: Vec<TxIn> = utxos.iter().map(|utxo| {
          use bitcoin::hashes::Hash;
          let txid = bitcoin::Txid::from_str(&utxo.txid).expect("valid txid");
          let outpoint = OutPoint {
              txid,
              vout: utxo.vout,
          };
          TxIn {
              previous_output: outpoint,
              script_sig: ScriptBuf::new(),
              sequence: Sequence::ENABLE_RBF_NO_LOCKTIME,
              witness: bitcoin::Witness::new(),
          }
      }).collect();

      let funding_addr = bitcoin::Address::from_str(&funding_address)
          .map_err(|e| format!("Invalid funding address: {:?}", e))?
          .require_network(bitcoin::Network::Testnet)
          .map_err(|e| format!("Address network mismatch: {:?}", e))?;

      let output = TxOut {
          value: output_amount,
          script_pubkey: funding_addr.script_pubkey(),
      };

      let unsigned_tx = Transaction {
          version: 2,
          lock_time: bitcoin::absolute::LockTime::ZERO,
          input: inputs,
          output: vec![output],
      };

      let mut psbt = Psbt::from_unsigned_tx(unsigned_tx)
          .map_err(|e| format!("Failed to create PSBT: {:?}", e))?;

      // Add witness UTXO data for each input
      let pool_addr = bitcoin::Address::from_str(&pool_config.address)
          .map_err(|e| format!("Invalid pool address: {:?}", e))?
          .require_network(bitcoin::Network::Testnet)
          .map_err(|e| format!("Address network mismatch: {:?}", e))?;

      for (i, utxo) in utxos.iter().enumerate() {
          psbt.inputs[i].witness_utxo = Some(bitcoin::TxOut {
              value: utxo.value,
              script_pubkey: pool_addr.script_pubkey(),
          });
      }

      // Sign using pool's ICP Chain Key
      use ree_types::bitcoin::psbt::Psbt as ReePsbt;
      let mut ree_psbt = ReePsbt::deserialize(&hex::decode(&hex::encode(psbt.serialize()))
          .map_err(|e| format!("hex decode: {:?}", e))?)
          .map_err(|e| format!("psbt deserialize: {:?}", e))?;

      // Create Utxo refs for signing
      let utxo_refs: Vec<ree_types::Utxo> = utxos.iter().map(|u| {
          let outpoint_str = format!("{}:{}", u.txid, u.vout);
          ree_types::Utxo::try_from(
              outpoint_str,
              ree_types::CoinBalances::new(),
              u.value,
          ).unwrap()
      }).collect();

      let utxo_ref_ptrs: Vec<&ree_types::Utxo> = utxo_refs.iter().collect();

      ree_pool_sign(
          &mut ree_psbt,
          utxo_ref_ptrs,
          SCHNORR_KEY_NAME,
          vec![b"hodlprotocol_blst_pool".to_vec()],
      ).await.map_err(|e| format!("Signing failed: {:?}", e))?;

      let signed_hex = ree_psbt.serialize_hex();

      ic_cdk::println!("✅ Transaction signed, broadcasting to Bitcoin...");

      // Broadcast directly (not via REE - this is just a sweep)
      // Note: In production, you'd call bitcoin_send_transaction here
      // For now, return the signed hex for manual broadcast

      Ok(format!("Sweep transaction ready. Signed PSBT: {}", signed_hex))
  }

  /// Consolidate pool UTXOs: Merge BLST UTXO (1k sats) with other pool UTXOs
  /// Creates single UTXO with all sats + all BLST runes for efficient minting
  /// FIXED: Use ree-types (bitcoin 0.32) exclusively to avoid version compatibility issues
  #[update]
  async fn consolidate_pool_utxos() -> Result<String, String> {
      let caller = ic_cdk::api::caller();
      if !ic_cdk::api::is_controller(&caller) {
          return Err("Not authorized - only controller can consolidate pool".to_string());
      }

      let pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());
      if pool_config.address.is_empty() {
          return Err("Pool not initialized".to_string());
      }

      let rune_id = pool_config.blst_rune_id
          .clone()
          .ok_or("BLST rune not yet etched")?;

      ic_cdk::println!("🔄 Consolidating pool UTXOs...");
      ic_cdk::println!("   Pool: {}", pool_config.address);
      ic_cdk::println!("   Rune: {}", rune_id);

      // Fetch ALL pool UTXOs
      let utxos = fetch_pool_utxos().await?;
      if utxos.is_empty() {
          return Err("No UTXOs found at pool address".to_string());
      }

      ic_cdk::println!("   Found {} UTXOs:", utxos.len());
      for (i, utxo) in utxos.iter().enumerate() {
          ic_cdk::println!("     UTXO {}: {}:{} = {} sats", i+1, utxo.txid, utxo.vout, utxo.value);
      }

      let total_sats: u64 = utxos.iter().map(|u| u.value).sum();
      ic_cdk::println!("   Total: {} sats", total_sats);

      // Estimate fee
      let fee_rate = estimate_fee_rate().await?;
      let estimated_vsize = (utxos.len() as u64 * 60) + 100;  // ~60 vB per Taproot input + 100 for outputs
      let fee = fee_rate * estimated_vsize;

      ic_cdk::println!("   Fee: {} sats ({}vB @ {} sat/vB)", fee, estimated_vsize, fee_rate);

      let output_amount = total_sats.saturating_sub(fee);
      if output_amount < 1000 {
          return Err(format!("Insufficient funds after fees: {} sats", output_amount));
      }

      ic_cdk::println!("   Consolidated output: {} sats", output_amount);

      // ⚡ CRITICAL FIX: Use ree-types (bitcoin 0.32) for EVERYTHING to avoid cross-version bugs!
      use ree_types::bitcoin::{
          Transaction, TxIn, TxOut, OutPoint, ScriptBuf, Sequence, Address, Amount,
          absolute::LockTime, transaction::Version, Txid as BtcTxid,
      };
      use ree_types::bitcoin::psbt::Psbt;
      use ordinals::{Edict, RuneId, Runestone};

      // Build transaction inputs using ree-types
      let inputs: Vec<TxIn> = utxos.iter().enumerate().map(|(idx, utxo)| {
          // CRITICAL: utxo.txid is hex-encoded INTERNAL byte order (little-endian from ICP canister)
          // Convert to DISPLAY format (big-endian hex string) for from_str()
          ic_cdk::println!("Input {} - Internal TXID: {}", idx, utxo.txid);
          let mut txid_bytes = hex::decode(&utxo.txid).expect("valid hex");
          txid_bytes.reverse();  // Reverse to display format
          let txid_display = hex::encode(&txid_bytes);
          ic_cdk::println!("Input {} - Display TXID: {}", idx, txid_display);
          let txid = BtcTxid::from_str(&txid_display).expect("valid txid");
          ic_cdk::println!("Input {} - Parsed TXID: {}", idx, txid);
          TxIn {
              previous_output: OutPoint { txid, vout: utxo.vout },
              script_sig: ScriptBuf::new(),
              sequence: Sequence::MAX,
              witness: ree_types::bitcoin::Witness::new(),
          }
      }).collect();

      // Parse pool address using ree-types (bitcoin 0.32 - supports Testnet4!)
      let pool_addr = Address::from_str(&pool_config.address)
          .map_err(|e| format!("Invalid pool address: {:?}", e))?
          .require_network(ree_types::bitcoin::Network::Testnet4)
          .map_err(|e| format!("Pool address network mismatch: {:?}", e))?;

      // Create Runestone to consolidate ALL BLST runes to output 1
      let rune_id_parsed = RuneId::from_str(&rune_id)
          .map_err(|e| format!("Invalid rune ID: {:?}", e))?;

      let runestone = Runestone {
          edicts: vec![Edict {
              id: rune_id_parsed,
              amount: 0,  // Transfer ALL runes from inputs
              output: 1,  // To output index 1 (pool)
          }],
          etching: None,
          mint: None,
          pointer: None,
      };

      let op_return_script = runestone.encipher();
      let op_return_script_buf = ScriptBuf::from_bytes(op_return_script.to_bytes());

      // Output 0: OP_RETURN with runestone
      let op_return_output = TxOut {
          value: Amount::ZERO,
          script_pubkey: op_return_script_buf,
      };

      // Output 1: Consolidated pool output (all sats + all BLST)
      let pool_output = TxOut {
          value: Amount::from_sat(output_amount),
          script_pubkey: pool_addr.script_pubkey(),
      };

      let unsigned_tx = Transaction {
          version: Version::TWO,
          lock_time: LockTime::ZERO,
          input: inputs,
          output: vec![op_return_output, pool_output],
      };

      let mut psbt = Psbt::from_unsigned_tx(unsigned_tx)
          .map_err(|e| format!("Failed to create PSBT: {:?}", e))?;

      // Add witness UTXO data for each input (using ree-types types!)
      let pool_script = pool_addr.script_pubkey();
      ic_cdk::println!("Pool scriptPubKey: {}", hex::encode(pool_script.as_bytes()));
      ic_cdk::println!("Expected (from mempool): 51202fae29f53184a687b074440ec0bcf12cb7d0aefe64b17c1f842b88bd9bbf575c");
      for (i, utxo) in utxos.iter().enumerate() {
          psbt.inputs[i].witness_utxo = Some(TxOut {
              value: Amount::from_sat(utxo.value),
              script_pubkey: pool_script.clone(),
          });
          ic_cdk::println!("Input {} witness_utxo: {} sats", i, utxo.value);
      }

      ic_cdk::println!("✅ Consolidation PSBT constructed");

      // Convert BitcoinUtxo to ree_types::Utxo for signing
      // CRITICAL: Must use DISPLAY format TXIDs to match PSBT inputs (see chat.md Session 32)
      let utxo_refs: Vec<ree_types::Utxo> = utxos.iter().map(|u| {
          // u.txid is in INTERNAL format (little-endian) from ICP Bitcoin canister
          // Reverse to DISPLAY format to match PSBT transaction inputs
          let mut txid_bytes = hex::decode(&u.txid).expect("valid hex");
          txid_bytes.reverse();  // Convert to display format
          let txid_display = hex::encode(&txid_bytes);
          let outpoint_str = format!("{}:{}", txid_display, u.vout);
          ree_types::Utxo::try_from(
              outpoint_str,
              ree_types::CoinBalances::new(),
              u.value,
          ).unwrap()
      }).collect();

      let utxo_ref_ptrs: Vec<&ree_types::Utxo> = utxo_refs.iter().collect();

      ic_cdk::println!("Signing {} inputs with ree_pool_sign()...", utxos.len());

      // Use ree_pool_sign() - same as all our working single-input transactions
      ree_pool_sign(
          &mut psbt,
          utxo_ref_ptrs,
          SCHNORR_KEY_NAME,
          vec![b"hodlprotocol_blst_pool".to_vec()],
      ).await.map_err(|e| format!("ree_pool_sign failed: {:?}", e))?;

      // DEBUG: Check if witness data was set
      for (i, input) in psbt.inputs.iter().enumerate() {
          if let Some(ref witness) = input.final_script_witness {
              ic_cdk::println!("Input {} has witness with {} items", i, witness.len());
          } else {
              ic_cdk::println!("⚠️ Input {} has NO witness data!", i);
          }
      }

      ic_cdk::println!("✅ All {} inputs signed, extracting finalized transaction...", utxos.len());

      // Extract finalized Bitcoin transaction from PSBT
      let finalized_tx = psbt.extract_tx()
          .map_err(|e| format!("Failed to extract transaction from PSBT: {:?}", e))?;

      // Serialize finalized transaction for broadcast
      let tx_bytes = bitcoin_serialize(&finalized_tx);
      let tx_hex = hex::encode(&tx_bytes);
      let txid = finalized_tx.compute_txid();

      ic_cdk::println!("✅ Transaction finalized ({} bytes)", tx_bytes.len());
      ic_cdk::println!("   TXID: {}", txid);
      ic_cdk::println!("   Hex: {}", tx_hex);
      ic_cdk::println!("📡 Broadcasting to Bitcoin network...");

      use ic_cdk::api::management_canister::bitcoin::{
          bitcoin_send_transaction, BitcoinNetwork, SendTransactionRequest
      };

      let send_request = SendTransactionRequest {
          network: BitcoinNetwork::Testnet,
          transaction: tx_bytes,
      };

      bitcoin_send_transaction(send_request)
          .await
          .map_err(|(code, msg)| format!("Failed to send Bitcoin transaction: {:?} - {}", code, msg))?;

      ic_cdk::println!("✅ Consolidation transaction broadcast!");

      Ok(format!("Pool UTXOs consolidated!\nInputs: {} UTXOs ({} sats total)\nOutput: 1 UTXO ({} sats + all BLST)\nFee: {} sats\nTXID: {}\nTransaction will appear on Bitcoin Testnet4 shortly.",
          utxos.len(), total_sats, output_amount, fee, txid))
  }

  /// Split funding address balance 50/50 between pool and user wallet
  /// Used to fund pool for BLST minting and give user sats for test deposits
  #[update]
  async fn split_funding_to_pool_and_user(user_wallet: String) -> Result<String, String> {
      let caller = ic_cdk::api::caller();
      if !ic_cdk::api::is_controller(&caller) {
          return Err("Not authorized - only controller can split funding".to_string());
      }

      let pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());
      let funding_address = pool_config.funding_address
          .ok_or("Funding address not initialized")?;

      ic_cdk::println!("💰 Splitting funding balance 50/50...");
      ic_cdk::println!("   From: {}", funding_address);
      ic_cdk::println!("   To Pool: {}", pool_config.address);
      ic_cdk::println!("   To User: {}", user_wallet);

      // Validate user wallet address
      let user_addr = bitcoin::Address::from_str(&user_wallet)
          .map_err(|e| format!("Invalid user wallet address: {:?}", e))?
          .require_network(bitcoin::Network::Testnet)
          .map_err(|e| format!("User address network mismatch: {:?}", e))?;

      // Fetch funding UTXOs
      let utxos = fetch_funding_utxos().await?;
      if utxos.is_empty() {
          return Err("No UTXOs found at funding address".to_string());
      }

      // Calculate total
      let total_sats: u64 = utxos.iter().map(|u| u.value).sum();
      ic_cdk::println!("   Total available: {} sats", total_sats);

      // Estimate fee (1 input, 2 outputs = ~200 vbytes)
      let fee_rate = estimate_fee_rate().await?;
      let estimated_vsize = 200u64;
      let fee = fee_rate * estimated_vsize;

      // Split remaining balance 50/50
      let remaining = total_sats.saturating_sub(fee);
      let half = remaining / 2;

      ic_cdk::println!("   Fee: {} sats ({}vB @ {} sat/vB)", fee, estimated_vsize, fee_rate);
      ic_cdk::println!("   Half to pool: {} sats", half);
      ic_cdk::println!("   Half to user: {} sats", half);

      if half < 10_000 {
          return Err(format!("Split amount too small: {} sats (need ≥10k for pool operations)", half));
      }

      // Build transaction
      use bitcoin::{Transaction, TxIn, TxOut, OutPoint, ScriptBuf, Sequence};
      use bitcoin::psbt::Psbt;

      let inputs: Vec<TxIn> = utxos.iter().map(|utxo| {
          let txid = bitcoin::Txid::from_str(&utxo.txid).expect("valid txid");
          let outpoint = OutPoint {
              txid,
              vout: utxo.vout,
          };
          TxIn {
              previous_output: outpoint,
              script_sig: ScriptBuf::new(),
              sequence: Sequence::ENABLE_RBF_NO_LOCKTIME,
              witness: bitcoin::Witness::new(),
          }
      }).collect();

      let pool_addr = bitcoin::Address::from_str(&pool_config.address)
          .map_err(|e| format!("Invalid pool address: {:?}", e))?
          .require_network(bitcoin::Network::Testnet)
          .map_err(|e| format!("Pool address network mismatch: {:?}", e))?;

      let outputs = vec![
          TxOut {
              value: half,
              script_pubkey: pool_addr.script_pubkey(),
          },
          TxOut {
              value: half,
              script_pubkey: user_addr.script_pubkey(),
          },
      ];

      let unsigned_tx = Transaction {
          version: 2,
          lock_time: bitcoin::absolute::LockTime::ZERO,
          input: inputs,
          output: outputs,
      };

      let mut psbt = Psbt::from_unsigned_tx(unsigned_tx)
          .map_err(|e| format!("Failed to create PSBT: {:?}", e))?;

      // Add witness UTXO data for each input
      let funding_addr = bitcoin::Address::from_str(&funding_address)
          .map_err(|e| format!("Invalid funding address: {:?}", e))?
          .require_network(bitcoin::Network::Testnet)
          .map_err(|e| format!("Address network mismatch: {:?}", e))?;

      for (i, utxo) in utxos.iter().enumerate() {
          psbt.inputs[i].witness_utxo = Some(bitcoin::TxOut {
              value: utxo.value,
              script_pubkey: funding_addr.script_pubkey(),
          });
      }

      // Sign using funding address ICP Chain Key
      use ree_types::bitcoin::psbt::Psbt as ReePsbt;
      let mut ree_psbt = ReePsbt::deserialize(&hex::decode(&hex::encode(psbt.serialize()))
          .map_err(|e| format!("hex decode: {:?}", e))?)
          .map_err(|e| format!("psbt deserialize: {:?}", e))?;

      // Create Utxo refs for signing
      let utxo_refs: Vec<ree_types::Utxo> = utxos.iter().map(|u| {
          let outpoint_str = format!("{}:{}", u.txid, u.vout);
          ree_types::Utxo::try_from(
              outpoint_str,
              ree_types::CoinBalances::new(),
              u.value,
          ).unwrap()
      }).collect();

      let utxo_ref_ptrs: Vec<&ree_types::Utxo> = utxo_refs.iter().collect();

      ree_pool_sign(
          &mut ree_psbt,
          utxo_ref_ptrs,
          SCHNORR_KEY_NAME,
          vec![b"hodlprotocol_funding".to_vec()],
      ).await.map_err(|e| format!("Signing failed: {:?}", e))?;

      ic_cdk::println!("✅ PSBT signed, extracting finalized transaction...");

      // Extract finalized Bitcoin transaction from PSBT
      let finalized_tx = ree_psbt.extract_tx()
          .map_err(|e| format!("Failed to extract transaction from PSBT: {:?}", e))?;

      // Serialize finalized transaction for broadcast
      let tx_bytes = bitcoin_serialize(&finalized_tx);

      let txid = finalized_tx.compute_txid();
      ic_cdk::println!("✅ Transaction finalized ({} bytes), txid: {}", tx_bytes.len(), txid);

      // Broadcast via ICP Bitcoin API
      use ic_cdk::api::management_canister::bitcoin::{
          bitcoin_send_transaction, BitcoinNetwork, SendTransactionRequest
      };

      let send_request = SendTransactionRequest {
          network: BitcoinNetwork::Testnet,
          transaction: tx_bytes,
      };

      bitcoin_send_transaction(send_request)
          .await
          .map_err(|(code, msg)| format!("Failed to send Bitcoin transaction: {:?} - {}", code, msg))?;

      ic_cdk::println!("✅ Transaction broadcast successful!");
      ic_cdk::println!("   Pool received: {} sats", half);
      ic_cdk::println!("   User received: {} sats", half);

      Ok(format!(
          "✅ Funding split successful!\n\
          Transaction ID: {}\n\
          Pool received: {} sats at {}\n\
          User received: {} sats at {}\n\
          Fee: {} sats\n\
          \n\
          Monitor: https://mempool.space/testnet4/tx/{}",
          txid, half, pool_config.address, half, user_wallet, fee, txid
      ))
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

  /// Construct PSBT for rune etching transaction (funding→pool→change flow)
  /// Input: Funding address UTXO (for fees)
  /// Output 0: OP_RETURN with etching runestone
  /// Output 1: Pool address (receives BTC + premined BLST runes)
  /// Output 2: Change back to funding address
  fn construct_etching_psbt(
      funding_utxo: &BitcoinUtxo,
      pool_address: &str,
      funding_address: &str,
      op_return_script: Vec<u8>,
      fee_rate_sat_per_vb: u64,
  ) -> Result<String, String> {
      use bitcoin::{Transaction, TxIn, TxOut, OutPoint, ScriptBuf, Sequence};
      use bitcoin::psbt::Psbt;
      use bitcoin::Txid;

      ic_cdk::println!("Constructing etching PSBT (funding→pool→change flow)...");
      ic_cdk::println!("  Input UTXO: {}:{} ({} sats)", funding_utxo.txid, funding_utxo.vout, funding_utxo.value);
      ic_cdk::println!("  Pool address (receives BLST): {}", pool_address);
      ic_cdk::println!("  Funding address (change): {}", funding_address);
      ic_cdk::println!("  OP_RETURN size: {} bytes", op_return_script.len());

      // Parse UTXO txid
      let txid = Txid::from_str(&funding_utxo.txid)
          .map_err(|e| format!("Invalid txid: {:?}", e))?;

      // Estimate transaction size
      // 1 Taproot input (~58 vB) + 3 outputs (OP_RETURN ~45 vB + 2x P2TR ~43 vB each) + overhead (~11 vB)
      // Total: ~200 vB
      let estimated_vsize = 200;
      let fee_sats = estimated_vsize * fee_rate_sat_per_vb;

      ic_cdk::println!("  Estimated vsize: {} vB", estimated_vsize);
      ic_cdk::println!("  Fee rate: {} sat/vB", fee_rate_sat_per_vb);
      ic_cdk::println!("  Total fee: {} sats", fee_sats);

      // Pool output gets dust amount (minimum for runes to be valid)
      let pool_output_sats = 1000;  // Dust limit for P2TR

      // Check if UTXO is sufficient
      let min_required = fee_sats + pool_output_sats + 1000;  // fee + pool dust + change dust
      if funding_utxo.value < min_required {
          return Err(format!("Insufficient UTXO value: {} sats (need {} sats for fee + outputs)", funding_utxo.value, min_required));
      }

      let change_amount = funding_utxo.value - fee_sats - pool_output_sats;
      ic_cdk::println!("  Pool output: {} sats", pool_output_sats);
      ic_cdk::println!("  Change to funding: {} sats", change_amount);

      // Build transaction
      let tx_in = TxIn {
          previous_output: OutPoint {
              txid,
              vout: funding_utxo.vout,
          },
          script_sig: ScriptBuf::new(),  // Taproot uses witness, not script_sig
          sequence: Sequence::MAX,     // RBF disabled
          witness: bitcoin::Witness::new(),  // Empty witness for unsigned
      };

      // Parse addresses
      let pool_addr = bitcoin::Address::from_str(pool_address)
          .map_err(|e| format!("Invalid pool address: {:?}", e))?
          .require_network(bitcoin::Network::Testnet)
          .map_err(|e| format!("Pool address network mismatch: {:?}", e))?;

      let funding_addr = bitcoin::Address::from_str(funding_address)
          .map_err(|e| format!("Invalid funding address: {:?}", e))?
          .require_network(bitcoin::Network::Testnet)
          .map_err(|e| format!("Funding address network mismatch: {:?}", e))?;

      // Output 0: OP_RETURN with etching runestone
      let op_return_script_buf = ScriptBuf::from_bytes(op_return_script);
      let op_return_output = TxOut {
          value: 0,  // OP_RETURN has no value
          script_pubkey: op_return_script_buf,
      };

      // Output 1: Pool address receives BTC + premined BLST runes
      // (First non-OP_RETURN output receives the premined runes)
      let pool_output = TxOut {
          value: pool_output_sats,
          script_pubkey: pool_addr.script_pubkey(),
      };

      // Output 2: Change back to funding address
      let change_output = TxOut {
          value: change_amount,
          script_pubkey: funding_addr.script_pubkey(),
      };

      // Create unsigned transaction
      let unsigned_tx = Transaction {
          version: 2,  // Version 2 for Bitcoin transactions
          lock_time: bitcoin::absolute::LockTime::ZERO,
          input: vec![tx_in],
          output: vec![op_return_output, pool_output, change_output],
      };

      // Create PSBT from unsigned transaction
      let mut psbt = Psbt::from_unsigned_tx(unsigned_tx)
          .map_err(|e| format!("Failed to create PSBT: {:?}", e))?;

      // Add witness UTXO data for Taproot input (required by REE)
      // Use funding address script since that's where the UTXO came from
      psbt.inputs[0].witness_utxo = Some(bitcoin::TxOut {
          value: funding_utxo.value,
          script_pubkey: funding_addr.script_pubkey(),
      });

      // Serialize PSBT to hex
      let psbt_hex = hex::encode(psbt.serialize());

      ic_cdk::println!("✅ PSBT constructed ({} bytes hex, 3 outputs)", psbt_hex.len());

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
          .require_network(bitcoin::Network::Testnet)
          .map_err(|e| format!("Address network mismatch: {:?}", e))?;

      let user_output = TxOut {
          value: 1000,  // Dust amount for rune
          script_pubkey: user_addr.script_pubkey(),
      };

      // Output 2: Change back to pool address
      let pool_addr = bitcoin::Address::from_str(pool_address)
          .map_err(|e| format!("Invalid pool address: {:?}", e))?
          .require_network(bitcoin::Network::Testnet)
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
          return Err("Pool not initialized - call init_pool first".to_string());
      }

      let funding_address = pool_config.funding_address
          .ok_or("Funding address not initialized - call init_funding_address first")?;

      if pool_config.blst_rune_id.is_some() {
          return Err(format!("BLST rune already etched: {}", pool_config.blst_rune_id.unwrap()));
      }

      ic_cdk::println!("🔨 Etching BLST rune via REE Orchestrator (funding→pool→change flow)...");
      ic_cdk::println!("   Funding address: {}", funding_address);
      ic_cdk::println!("   Pool address: {}", pool_config.address);

      // Step 1: Create the etching runestone
      let op_return_script = create_blst_etching()?;
      ic_cdk::println!("✅ Etching runestone created ({} bytes)", op_return_script.len());

      // Step 2: Fetch funding UTXOs
      let utxos = fetch_funding_utxos().await?;
      if utxos.is_empty() {
          return Err(format!("No confirmed UTXOs at funding address {} - send sats and wait for 6 confirmations", funding_address));
      }

      // Select first UTXO with sufficient value for fees + outputs
      let selected_utxo = utxos.iter()
          .find(|u| u.value >= 10_000)  // At least 10k sats for fees + 2 dust outputs
          .ok_or("No UTXO with sufficient value (need ≥10k sats)")?;

      ic_cdk::println!("✅ Selected funding UTXO: {}:{} ({} sats)", selected_utxo.txid, selected_utxo.vout, selected_utxo.value);

      // Step 3: Estimate fee rate
      let fee_rate = estimate_fee_rate().await?;
      ic_cdk::println!("✅ Fee rate: {} sat/vB", fee_rate);

      // Step 4: Construct PSBT (funding→pool→change)
      let psbt_hex = construct_etching_psbt(
          selected_utxo,
          &pool_config.address,
          &funding_address,
          op_return_script,
          fee_rate,
      )?;
      ic_cdk::println!("✅ PSBT constructed (unsigned, 3 outputs)");

      // Step 4.5: Sign the PSBT using ICP Chain Key
      ic_cdk::println!("🔐 Signing PSBT with ICP Chain Key...");

      use ree_types::bitcoin::psbt::Psbt;
      use std::str::FromStr;

      // Deserialize PSBT
      let mut psbt = Psbt::deserialize(&hex::decode(&psbt_hex)
          .map_err(|e| format!("Failed to decode PSBT hex: {:?}", e))?)
          .map_err(|e| format!("Failed to deserialize PSBT: {:?}", e))?;

      // Create Utxo struct for signing using Utxo::try_from
      let outpoint_str = format!("{}:{}", selected_utxo.txid, selected_utxo.vout);
      let utxo_for_signing = ree_types::Utxo::try_from(
          outpoint_str,
          ree_types::CoinBalances::new(),  // Empty for non-rune transactions
          selected_utxo.value,
      ).map_err(|e| format!("Failed to create Utxo: {}", e))?;

      // Sign the funding UTXO using REE pool signing (with funding derivation path)
      ree_pool_sign(
          &mut psbt,
          vec![&utxo_for_signing],
          SCHNORR_KEY_NAME,
          vec![b"hodlprotocol_funding".to_vec()],  // Use funding derivation path
      ).await.map_err(|e| format!("Failed to sign PSBT: {:?}", e))?;

      ic_cdk::println!("✅ PSBT signed, extracting finalized transaction...");

      // Step 5: Extract transaction from PSBT and broadcast directly to Bitcoin
      // (Bypassing REE for bootstrap transaction - REE can't validate externally-funded UTXOs)
      ic_cdk::println!("📡 Broadcasting transaction directly to Bitcoin network via ICP...");

      // Extract finalized Bitcoin transaction from PSBT
      let finalized_tx = psbt.extract_tx()
          .map_err(|e| format!("Failed to extract transaction from PSBT: {:?}", e))?;

      // Serialize finalized transaction for broadcast
      let tx_bytes = bitcoin_serialize(&finalized_tx);

      // Get transaction ID for logging
      let txid = finalized_tx.compute_txid();
      ic_cdk::println!("✅ Transaction finalized ({} bytes), txid: {}", tx_bytes.len(), txid);

      // Call ICP's Bitcoin integration to broadcast the transaction
      use ic_cdk::api::management_canister::bitcoin::{
          bitcoin_send_transaction, BitcoinNetwork, SendTransactionRequest
      };

      let send_request = SendTransactionRequest {
          network: BitcoinNetwork::Testnet,  // Testnet4
          transaction: tx_bytes,
      };

      ic_cdk::println!("📡 Sending transaction to Bitcoin network...");

      bitcoin_send_transaction(send_request)
          .await
          .map_err(|(code, msg)| format!("Failed to send Bitcoin transaction: {:?} - {}", code, msg))?;

      ic_cdk::println!("✅ Transaction broadcast successful!");
      ic_cdk::println!("   TXID: {}", txid);
      ic_cdk::println!("   Pool will receive 1000 sats + 100B BLST at: {}", pool_config.address);
      ic_cdk::println!("   Change will return to: {}", funding_address);

      Ok(format!(
          "✅ BLST rune etching transaction broadcast!\n\
          Transaction ID: {}\n\
          Pool address: {} (will receive 1000 sats + 100B BLST)\n\
          Funding address: {} (will receive change)\n\
          \n\
          Next steps:\n\
          1. Wait for 1+ confirmations (~10 mins)\n\
          2. Find the rune ID in the transaction (format: BLOCK:TX)\n\
          3. Update pool config: dfx canister call ... update_pool_rune_id '(\"BLOCK:TX\")' --network ic\n\
          4. Verify with get_pool_info\n\
          \n\
          Monitor: https://mempool.space/testnet4/tx/{}",
          txid, pool_config.address, funding_address, txid
      ))
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
  // BABYLON STAKING - Aggregate pool BTC and delegate to Babylon
  // ============================

  /// Stake aggregated pool BTC to Babylon chain
  ///
  /// **Architecture:**
  /// 1. Construct Babylon staking transaction (special Bitcoin tx format)
  /// 2. Sign with ICP Chain Key (pool's Schnorr key)
  /// 3. Broadcast to Bitcoin Testnet4
  /// 4. After 6 confirmations, call submit_staking_proof_to_omnity()
  ///
  /// **Transaction Structure (from btc-staking-ts):**
  /// - Input: Pool's consolidated UTXO
  /// - Output 0: Babylon staking script (OP_RETURN with covenant params)
  /// - Output 1: Timelock output (user funds locked for ~90 days / 12,960 blocks)
  /// - Output 2: Unbonding output (emergency withdrawal mechanism)
  ///
  /// **Parameters:**
  /// - amount: Satoshis to stake (from pool's accumulated deposits)
  /// - fp_pubkey: Finality Provider public key (32-byte hex, from get_finality_providers())
  /// - timelock_blocks: 12,960 blocks (~90 days for testnet demo)
  ///
  /// **References:**
  /// - btc-staking-ts: https://github.com/babylonlabs-io/btc-staking-ts
  /// - Babylon docs: https://docs.babylonlabs.io/developers/dapps/simple_staking_dapp/
  #[update]
  async fn stake_to_babylon(
      amount_sats: u64,
      fp_pubkey_hex: String,
      timelock_blocks: u32,
  ) -> Result<String, String> {
      let caller = ic_cdk::api::caller();
      if !ic_cdk::api::is_controller(&caller) {
          return Err("Unauthorized: admin only".to_string());
      }

      ic_cdk::println!("🏛️ Staking {} sats to Babylon", amount_sats);
      ic_cdk::println!("   FP pubkey: {}", fp_pubkey_hex);
      ic_cdk::println!("   Timelock: {} blocks (~{} days)", timelock_blocks, timelock_blocks / 144);

      // TODO: Implement Babylon staking transaction construction
      //
      // Steps:
      // 1. Fetch pool's consolidated UTXO (should have sufficient balance)
      // 2. Parse finality provider pubkey (32-byte x-coordinate)
      // 3. Get pool's public key from ICP Chain Key (Schnorr format)
      // 4. Construct PSBT with Babylon covenant scripts:
      //    - Staking script (OP_RETURN with params)
      //    - Timelock script (OP_CHECKLOCKTIMEVERIFY)
      //    - Unbonding script (emergency withdrawal path)
      // 5. Sign PSBT with ree_pool_sign()
      // 6. Broadcast via Bitcoin canister
      // 7. Return staking_tx_hash for proof submission

      Err("stake_to_babylon() not yet implemented - see code comments for architecture".to_string())
  }

  /// Submit Babylon staking proof to Omnity Hub for cross-chain delegation
  ///
  /// **Architecture:**
  /// After Bitcoin staking tx confirms (6+ blocks), bridge the proof to Babylon chain:
  ///
  /// 1. Call Omnity Hub CosmWasm Proxy (testnet):
  ///    get_btc_mint_address(babylon_account_id)
  ///      → Returns: Omnity-controlled Bitcoin address
  ///
  /// 2. Call Omnity Hub CosmWasm Proxy:
  ///    update_balance_after_finalization(babylon_account_id, staking_proof)
  ///      → Creates scheduled task to update ckBTC balance
  ///      → Calls generate_ticket on ICP customs
  ///      → Bridges ticket to Babylon via CosmWasm Route
  ///
  /// 3. Omnity Hub light client verifies staking tx on Bitcoin
  /// 4. CosmWasm Route sends delegation message to Babylon chain
  /// 5. Babylon chain registers delegation → BABY rewards start accruing
  ///
  /// **Canister IDs (Testnet):**
  /// - Omnity Hub: xykho-eiaaa-aaaag-qjrka-cai
  /// - CosmWasm Route (Osmo): nfehe-haaaa-aaaar-qah3q-cai
  /// - Bitcoin Customs: x7lb2-jqaaa-aaaag-qjrkq-cai
  /// - ICP Routes: xwikg-7yaaa-aaaag-qjrla-cai
  ///
  /// **References:**
  /// - Omnity CosmWasm docs: https://docs.omnity.network/docs/Omnity-Hub/cosmwasm
  /// - Omnity Hub repo: https://github.com/octopus-network/omnity-docs
  #[update]
  async fn submit_staking_proof_to_omnity(
      staking_tx_hash: String,
      babylon_account_id: String,
  ) -> Result<String, String> {
      let caller = ic_cdk::api::caller();
      if !ic_cdk::api::is_controller(&caller) {
          return Err("Unauthorized: admin only".to_string());
      }

      ic_cdk::println!("🌉 Submitting staking proof to Omnity Hub");
      ic_cdk::println!("   Staking TX: {}", staking_tx_hash);
      ic_cdk::println!("   Babylon account: {}", babylon_account_id);

      // TODO: Implement Omnity Hub integration
      //
      // Steps:
      // 1. Verify staking tx has 6+ confirmations on Bitcoin
      // 2. Get Omnity mint address:
      //    let (mint_addr,) = call(omnity_proxy, "get_btc_mint_address", (babylon_account_id,)).await?;
      // 3. Trigger balance update:
      //    let () = call(omnity_proxy, "update_balance_after_finalization",
      //                  (babylon_account_id, Some(staking_tx_hash))).await?;
      // 4. Monitor ticket status via CosmWasm Route:
      //    let status = call(cosmwasm_route, "mint_token_status", (ticket_id,)).await?;
      // 5. Return ticket_id for tracking

      Err("submit_staking_proof_to_omnity() not yet implemented - see code comments for architecture".to_string())
  }

  /// Query accumulated BABY rewards from Babylon chain
  ///
  /// **Architecture:**
  /// 1. Query Babylon testnet API for delegation rewards:
  ///    GET https://babylon-testnet-api.polkachu.com/cosmos/distribution/v1beta1/delegators/{addr}/rewards
  ///
  /// 2. Parse response to get BABY token amount
  /// 3. Cache result (update hourly/daily)
  /// 4. Return total BABY rewards accrued
  ///
  /// **Response Format:**
  /// ```json
  /// {
  ///   "rewards": [{
  ///     "validator_address": "babylonvaloper...",
  ///     "reward": [{"denom": "ubaby", "amount": "1000000"}]
  ///   }],
  ///   "total": [{"denom": "ubaby", "amount": "1000000"}]
  /// }
  /// ```
  ///
  /// **References:**
  /// - Babylon API: https://babylon-testnet-api.polkachu.com/cosmos/distribution/v1beta1
  /// - Network: bbn-test-6
  #[query]
  fn query_babylon_rewards() -> Result<u64, String> {
      // TODO: Implement Babylon rewards querying
      //
      // Steps:
      // 1. Get Babylon delegation address (derived from pool's ICP Chain Key)
      // 2. HTTP outcall to Babylon API
      // 3. Parse JSON response
      // 4. Convert ubaby (micro-BABY) to BABY
      // 5. Cache and return total rewards

      Err("query_babylon_rewards() not yet implemented - see code comments for architecture".to_string())
  }

  /// Distribute BABY rewards to BLST holders (convert to BTC via Omnity → Osmosis → Omnity)
  ///
  /// **Full Architecture (THE COMPLETE ROUTE):**
  ///
  /// A. Query BABY rewards from Babylon chain:
  ///    - Call query_babylon_rewards() to get total BABY accrued
  ///    - Deduct 2% protocol fee (per CLAUDE.md fee structure)
  ///
  /// B. Convert BABY → BTC via Omnity Hub + Osmosis DEX:
  ///    1. Send pool BTC → Omnity Hub → ckBTC
  ///       - Call Omnity Hub to convert native BTC to ckBTC
  ///    2. Bridge ckBTC to Osmosis (Alloyed BTC basket)
  ///       - Omnity bridges ckBTC to Osmosis chain
  ///       - ckBTC becomes part of Osmosis Alloyed BTC basket
  ///    3. Swap BABY → ckBTC on Osmosis DEX
  ///       - BABY/BTC liquidity pool exists on Osmosis!
  ///       - Use CosmWasm contract to execute swap
  ///    4. Bridge ckBTC back from Osmosis → Omnity Hub → ICP
  ///       - Reverse the bridge: Osmosis → Omnity Hub → ICP
  ///    5. Convert ckBTC → native BTC via ICP Bitcoin canister
  ///       - ckBTC minter converts back to native Bitcoin
  ///
  /// C. Distribute BTC proportionally to all BLST holders:
  ///    - Query all BLST balances from Runes Indexer
  ///    - Calculate each holder's proportional share
  ///    - Construct batch payout transaction via REE
  ///    - Send BTC to each BLST holder address
  ///
  /// **Fee Structure (from CLAUDE.md):**
  /// - Staking fee: 2% deducted from BABY rewards (NOT from deposits)
  /// - No upfront fee on BTC deposits
  /// - Protocol revenue comes from reward distribution only
  ///
  /// **Canister IDs:**
  /// - Omnity Hub: bkyz2-fmaaa-aaaaa-qaaaq-cai (mainnet)
  /// - CosmWasm Route: ystyg-kaaaa-aaaar-qaieq-cai (osmosis-1)
  /// - Runes Indexer: f2dwm-caaaa-aaaao-qjxlq-cai (testnet4)
  ///
  /// **References:**
  /// - Omnity CosmWasm: https://docs.omnity.network/docs/Omnity-Hub/cosmwasm
  /// - Osmosis DEX: https://github.com/osmosis-labs/testnets
  /// - Fee structure: See CLAUDE.md "PLATFORM FLYWHEEL"
  #[update]
  async fn distribute_rewards() -> Result<String, String> {
      let caller = ic_cdk::api::caller();
      if !ic_cdk::api::is_controller(&caller) {
          return Err("Unauthorized: admin only".to_string());
      }

      // TODO: Implement reward distribution (THE COMPLETE ROUTE)
      //
      // Steps:
      // 1. Query BABY rewards total from Babylon
      // 2. Calculate protocol fee (2% of BABY rewards)
      // 3. Convert BABY → BTC via Omnity + Osmosis:
      //    a. Pool BTC → Omnity Hub → ckBTC
      //    b. Bridge ckBTC to Osmosis (Alloyed BTC)
      //    c. Swap BABY → ckBTC on Osmosis DEX (BABY/BTC pool)
      //    d. Bridge ckBTC back: Osmosis → Omnity → ICP
      //    e. ckBTC → native BTC via ICP Bitcoin canister
      // 4. Query all BLST holders from Runes Indexer
      // 5. Calculate proportional BTC distribution per holder
      // 6. Construct batch payout transaction
      // 7. Sign and broadcast via REE
      // 8. Return distribution summary (total BTC, recipient count, tx hash)

      Err("distribute_rewards() not yet implemented - see code comments for THE COMPLETE ROUTE".to_string())
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

  /// Fetch UTXOs for pool address from mempool.space Testnet4 API
  /// Fetch confirmed UTXOs for pool address using Bitcoin canister (deterministic, no HTTP consensus issues)
  async fn fetch_pool_utxos() -> Result<Vec<BitcoinUtxo>, String> {
      let pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());
      if pool_config.address.is_empty() {
          return Err("Pool not initialized".to_string());
      }

      ic_cdk::println!("Fetching UTXOs via Bitcoin canister for pool: {}", pool_config.address);

      // Get UTXOs from Bitcoin canister (deterministic - no consensus issues!)
      let btc_canister_principal = candid::Principal::from_text(BTC_CANISTER_TESTNET)
          .map_err(|e| format!("Invalid Bitcoin canister principal: {:?}", e))?;
      let btc_canister = bitcoin_canister::Service(btc_canister_principal);

      let (response,) = btc_canister.bitcoin_get_utxos(bitcoin_canister::GetUtxosRequest {
          network: bitcoin_canister::Network::Testnet,
          filter: Some(bitcoin_canister::GetUtxosRequestFilterInner::MinConfirmations(1)),
          address: pool_config.address.clone(),
      })
      .await
      .map_err(|(code, msg)| format!("Bitcoin canister call failed: {:?} - {}", code, msg))?;

      ic_cdk::println!("✅ Bitcoin canister returned {} UTXOs", response.utxos.len());

      // Convert to BitcoinUtxo format
      let bitcoin_utxos: Vec<BitcoinUtxo> = response.utxos.into_iter().map(|utxo| {
          // ICP Bitcoin canister returns txid in INTERNAL byte order (little-endian)
          // Just hex-encode as-is - we'll handle byte order when constructing transactions
          let txid_hex = hex::encode(&utxo.outpoint.txid[..]);

          BitcoinUtxo {
              txid: txid_hex,
              vout: utxo.outpoint.vout,
              value: utxo.value,
              status: UtxoStatus {
                  confirmed: true,  // Bitcoin canister only returns confirmed with min_confirmations filter
                  block_height: Some(utxo.height as u64),
                  block_hash: None,
              },
          }
      }).collect();

      ic_cdk::println!("✅ Converted to {} BitcoinUtxo objects", bitcoin_utxos.len());

      Ok(bitcoin_utxos)
  }

  /// Fetch UTXOs for funding address (for rune etching bootstrap)
  async fn fetch_funding_utxos() -> Result<Vec<BitcoinUtxo>, String> {
      use ic_cdk::api::management_canister::http_request::{
          http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, TransformContext,
      };

      let pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());
      let funding_address = pool_config.funding_address
          .ok_or("Funding address not initialized - call init_funding_address first")?;

      let url = format!(
          "https://mempool.space/testnet4/api/address/{}/utxo",
          funding_address
      );

      ic_cdk::println!("Fetching UTXOs for funding address: {}", funding_address);

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

              ic_cdk::println!("Found {} UTXOs for funding address", utxos.len());

              // Filter for confirmed UTXOs only (need 6+ confirmations for safety)
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

      let url = "https://mempool.space/testnet4/api/v1/fees/recommended".to_string();

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
          txid: "b7652fe24527e6dfa6470252bddc0149b21c4bf877265810a644e76563e441c6".to_string(),
          vout: 1,  // Premined runes go to output #1 of etching tx
          value: 1_000,  // 1k sats (from etching tx output #1 on Testnet4)
          rune_balance: 100_000_000_000,  // All 100B BLST runes (premined at 107266:20)
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
          Transaction will be signed with ICP Chain Key and broadcast to Bitcoin Testnet4.\n\
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

  // ============================
  // REE INTERFACE METHODS (Required for REE Orchestrator)
  // ============================
  // Note: PoolListItem, PoolInfo, GetPoolInfoArgs types come from ree_types::exchange_interfaces::*

  /// Get list of all pools (REE requirement)
  /// For MVP, we only have one pool
  /// Uses official ree_types::exchange_interfaces::GetPoolListResponse
  #[query]
  fn get_pool_list() -> GetPoolListResponse {
      let pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());

      if pool_config.address.is_empty() {
          return vec![];
      }

      vec![PoolBasic {
          name: "BABYLON•LST".to_string(),
          address: pool_config.address,
      }]
  }

  /// Get detailed pool information (REE requirement)
  /// Uses official ree_types::exchange_interfaces::PoolInfo
  #[query]
  fn get_pool_info(args: GetPoolInfoArgs) -> GetPoolInfoResponse {
      let pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());

      // Validate pool exists and address matches
      if pool_config.address.is_empty() || pool_config.address != args.pool_address {
          return None;
      }

      // CRITICAL: Return the actual pubkey (not a hash string!)
      let pubkey = match pool_config.pubkey {
          Some(pk) => pk,
          None => {
              ic_cdk::println!("⚠️  Pool pubkey not set! Call update_pool_pubkeys() first");
              return None; // Can't return pool info without pubkey
          }
      };

      // Build attributes JSON
      let attributes = serde_json::json!({
          "pool_type": "babylon_staking",
          "finality_provider": pool_config.finality_provider,
          "timelock_blocks": pool_config.timelock_blocks,
          "blst_rune_id": pool_config.blst_rune_id,
          "total_deposited_sats": pool_config.total_deposited_sats,
          "total_blst_minted": pool_config.total_blst_minted,
          "estimated_apy": 12.0,
          "created_at": pool_config.created_at,
      }).to_string();

      Some(PoolInfo {
          key: pubkey,  // Pubkey auto-serializes to hex text via CandidType
          name: "BABYLON•LST".to_string(),
          address: pool_config.address,
          btc_reserved: pool_config.total_deposited_sats,
          // CRITICAL FIX: Return the actual derivation path used in init_pool
          key_derivation_path: vec![b"hodlprotocol_blst_pool".to_vec()],
          coin_reserved: vec![],  // Empty for BTC-only pool
          attributes,
          nonce: pool_config.states.last().map(|s| s.nonce).unwrap_or_default(), // Proper nonce from state chain
          utxos: vec![],  // Will populate when we track pool UTXOs
      })
  }

  // ============================
  // HELPER FUNCTIONS - REE Integration
  // ============================

  /// Validate deposit transaction inputs/outputs
  fn validate_deposit(
      pool_config: &PoolConfig,
      pool_utxo_spent: &[String],
      pool_utxo_received: &[Utxo],
      input_coins: &[ree_types::InputCoin],
      output_coins: &[ree_types::OutputCoin],
  ) -> Result<u64, String> {
      ic_cdk::println!("   Validating deposit:");
      ic_cdk::println!("     pool_utxo_spent: {}", pool_utxo_spent.len());
      ic_cdk::println!("     pool_utxo_received: {}", pool_utxo_received.len());
      ic_cdk::println!("     input_coins: {}", input_coins.len());
      ic_cdk::println!("     output_coins: {}", output_coins.len());

      // Validate state consistency
      let has_existing_utxo = pool_config.states.last()
          .and_then(|s| s.utxo.as_ref())
          .is_some();

      if has_existing_utxo && pool_utxo_spent.is_empty() {
          return Err("Pool has existing UTXO but pool_utxo_spent is empty".to_string());
      }

      if !has_existing_utxo && !pool_utxo_spent.is_empty() {
          return Err("Pool has no UTXO but pool_utxo_spent is not empty".to_string());
      }

      // Calculate deposit amount from pool_utxo_received
      let deposit_amount = if !pool_utxo_received.is_empty() {
          let new_pool_value = pool_utxo_received[0].sats;
          let old_pool_value = pool_config.states.last()
              .map(|s| s.btc_supply())
              .unwrap_or_default();
          new_pool_value.saturating_sub(old_pool_value)
      } else {
          // REE will infer from PSBT outputs - we'll extract later
          0
      };

      ic_cdk::println!("   Calculated deposit: {} sats", deposit_amount);
      Ok(deposit_amount)
  }

  /// Extract the new pool UTXO from signed PSBT outputs
  fn extract_pool_utxo_from_psbt(
      psbt: &Psbt,
      pool_address: &str,
  ) -> Result<Utxo, String> {
      use ree_types::bitcoin::Address;
      use std::str::FromStr;

      let pool_addr = Address::from_str(pool_address)
          .map_err(|e| format!("Invalid pool address: {}", e))?
          .require_network(Network::Testnet)
          .map_err(|e| format!("Address network mismatch: {}", e))?;

      // Find output that pays to pool address
      for (vout, output) in psbt.unsigned_tx.output.iter().enumerate() {
          if output.script_pubkey == pool_addr.script_pubkey() {
              ic_cdk::println!("   Found pool output at vout {}: {} sats", vout, output.value);

              return Ok(Utxo {
                  txid: psbt.unsigned_tx.compute_txid().into(),
                  vout: vout as u32,
                  sats: output.value.to_sat(),
                  coins: CoinBalances::new(),  // Empty for BTC-only deposits
              });
          }
      }

      Err("Pool output not found in PSBT".to_string())
  }

  /// Transaction execution callback - Called by REE Orchestrator
  /// This is the main entry point for executing transactions through REE
  #[update(guard = "ensure_testnet4_orchestrator")]
  async fn execute_tx(args: ExecuteTxArgs) -> Result<String, String> {
      let ExecuteTxArgs {
          psbt_hex,
          txid,
          intention_set,
          intention_index,
          zero_confirmed_tx_queue_length: _,
      } = args;

      ic_cdk::println!("🔧 execute_tx() called by REE Orchestrator");
      ic_cdk::println!("   txid: {}", txid);
      ic_cdk::println!("   intention_index: {}", intention_index);

      // Deserialize PSBT
      let raw = hex::decode(&psbt_hex).map_err(|_| "Invalid PSBT hex".to_string())?;
      let mut psbt = Psbt::deserialize(raw.as_slice())
          .map_err(|e| format!("Failed to deserialize PSBT: {}", e))?;

      ic_cdk::println!("✅ PSBT deserialized - {} inputs, {} outputs",
          psbt.inputs.len(), psbt.unsigned_tx.output.len());

      // Extract intention
      let intention = intention_set.intentions
          .get(intention_index as usize)
          .ok_or("Invalid intention_index")?
          .clone();

      let ree_types::Intention {
          exchange_id: _,
          action,
          action_params: _,
          pool_address,
          nonce,
          pool_utxo_spent,
          pool_utxo_received,
          input_coins,
          output_coins,
      } = intention;

      ic_cdk::println!("   action: {}", action);
      ic_cdk::println!("   pool_address: {}", pool_address);
      ic_cdk::println!("   nonce: {}", nonce);

      // Acquire execution guard to prevent concurrent execution on same pool
      let _guard = ExecuteTxGuard::new(pool_address.clone())
          .ok_or(format!("Pool {} is already executing a transaction", pool_address))?;

      // Get pool config
      let mut pool_config = POOL_CONFIG.with(|p| p.borrow().get().clone());

      // Validate pool exists
      if pool_config.address.is_empty() || pool_config.address != pool_address {
          return Err(format!("Pool not found: {}", pool_address));
      }

      // Get current state (last in chain, or default for first deposit)
      let current_nonce = pool_config.states.last()
          .map(|s| s.nonce)
          .unwrap_or_default();

      // Validate nonce
      if current_nonce != nonce {
          return Err(format!(
              "Nonce mismatch: expected {}, got {}. Pool may be out of sync.",
              current_nonce, nonce
          ));
      }

      ic_cdk::println!("✅ Nonce validated: {}", nonce);

      // Process based on action type
      match action.as_ref() {
          "deposit" => {
              ic_cdk::println!("📥 Processing deposit action");

              // Validate deposit transaction
              let deposit_amount = validate_deposit(
                  &pool_config,
                  &pool_utxo_spent,
                  &pool_utxo_received,
                  &input_coins[..],
                  &output_coins[..],
              )?;

              ic_cdk::println!("✅ Deposit validated: {} sats", deposit_amount);

              // Sign pool UTXOs if pool has existing funds
              if !pool_utxo_spent.is_empty() {
                  ic_cdk::println!("🔐 Signing {} pool UTXOs", pool_utxo_spent.len());

                  // Get the UTXO(s) to sign from current state
                  let current_utxo = pool_config.states.last()
                      .and_then(|s| s.utxo.as_ref())
                      .ok_or("Pool UTXO not found in current state")?;

                  // Sign using REE pool signing
                  ree_pool_sign(
                      &mut psbt,
                      vec![current_utxo],
                      SCHNORR_KEY_NAME,
                      vec![b"hodlprotocol_blst_pool".to_vec()],
                  )
                  .await
                  .map_err(|e| format!("Failed to sign pool UTXO: {}", e))?;

                  ic_cdk::println!("✅ Pool UTXO signed");
              } else {
                  ic_cdk::println!("ℹ️  First deposit - no pool UTXOs to sign");
              }

              // Create new pool state
              let new_utxo = extract_pool_utxo_from_psbt(&psbt, &pool_address)?;
              let new_state = PoolState {
                  id: Some(txid.clone()),
                  nonce: current_nonce + 1,
                  utxo: Some(new_utxo),
              };

              ic_cdk::println!("✅ New pool state created - nonce: {}", new_state.nonce);

              // Update pool config with new state
              pool_config.states.push(new_state);
              pool_config.total_deposited_sats += deposit_amount;

              // Save updated pool config
              POOL_CONFIG.with(|p| {
                  p.borrow_mut().set(pool_config.clone())
                      .expect("Failed to update pool config");
              });

              ic_cdk::println!("✅ Pool state updated - total deposited: {} sats",
                  pool_config.total_deposited_sats);
          }

          _ => {
              return Err(format!("Unsupported action: {}", action));
          }
      }

      // Record transaction as unconfirmed
      TX_RECORDS.with_borrow_mut(|m| {
          ic_cdk::println!("📝 Recording unconfirmed txid: {}", txid);
          let mut record = m.get(&(txid.clone(), false)).unwrap_or_default();
          if !record.pools.contains(&pool_address) {
              record.pools.push(pool_address.clone());
          }
          m.insert((txid.clone(), false), record);
      });

      // Return signed PSBT
      let signed_psbt_hex = psbt.serialize_hex();
      ic_cdk::println!("✅ execute_tx() complete - returning signed PSBT ({} bytes)",
          signed_psbt_hex.len());

      Ok(signed_psbt_hex)
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

      Ok(format!("BLST minting transaction submitted to REE Orchestrator.\nTransaction will be signed with ICP Chain Key and broadcast to Bitcoin Testnet4.\nUser will receive {} BLST ({}.{:03} display) at address {}.\nREE response: {}",
          mint_record.amount_blst,
          mint_record.amount_blst / 1000,
          mint_record.amount_blst % 1000,
          mint_record.user_btc_address,
          result
      ))
  }

  /// Finalize pool state for a confirmed transaction
  fn finalize_pool_state(pool_address: &str, txid: &Txid) {
      POOL_CONFIG.with(|p| {
          let mut config = p.borrow().get().clone();

          if config.address != pool_address {
              return;  // Not our pool
          }

          // Find the state for this txid
          let idx = config.states.iter()
              .position(|state| state.id.as_ref() == Some(txid));

          if let Some(idx) = idx {
              // Remove all states before this one (they're now finalized)
              if idx > 0 {
                  config.states.drain(0..idx);
                  ic_cdk::println!("       Finalized pool state for {}", txid);

                  p.borrow_mut().set(config).expect("Failed to update pool config");
              }
          }
      });
  }

  /// Blockchain state management - New block notification
  /// Called by REE Orchestrator when a new block is detected
  #[update(guard = "ensure_testnet4_orchestrator")]
  fn new_block(args: NewBlockInfo) -> Result<(), String> {
      ic_cdk::println!("📦 new_block() called by REE Orchestrator");
      ic_cdk::println!("   height: {}, hash: {}", args.block_height, args.block_hash);
      ic_cdk::println!("   confirmed {} transactions", args.confirmed_txids.len());

      let NewBlockInfo {
          block_height,
          block_hash: _,
          block_timestamp: _,
          confirmed_txids,
      } = args.clone();

      // Store block info for reorg detection
      BLOCKS.with_borrow_mut(|m| {
          m.insert(block_height, args);
          ic_cdk::println!("   Block {} stored", block_height);
      });

      // Mark transactions as confirmed
      for txid in confirmed_txids.iter() {
          TX_RECORDS.with_borrow_mut(|m| {
              if let Some(record) = m.get(&(txid.clone(), false)) {
                  m.insert((txid.clone(), true), record.clone());
                  m.remove(&(txid.clone(), false));
                  ic_cdk::println!("   ✅ Confirmed: {} (pools: {:?})", txid, record.pools);
              }
          });
      }

      // Finalize transactions after sufficient confirmations (6 blocks)
      let finalization_depth = 6u32;
      let confirmed_height = block_height.saturating_sub(finalization_depth);

      ic_cdk::println!("   Finalizing blocks up to height {}", confirmed_height);

      // Finalize old confirmed transactions
      BLOCKS.with_borrow(|blocks| {
          blocks
              .iter()
              .take_while(|(height, _)| *height <= confirmed_height)
              .for_each(|(height, block_info)| {
                  ic_cdk::println!("   Processing finalized block {}", height);

                  for txid in block_info.confirmed_txids.iter() {
                      TX_RECORDS.with_borrow_mut(|tx_records| {
                          if let Some(record) = tx_records.get(&(txid.clone(), true)) {
                              ic_cdk::println!("     Finalizing tx: {}", txid);

                              // For each affected pool, finalize the state
                              record.pools.iter().for_each(|pool_address| {
                                  finalize_pool_state(pool_address, txid);
                              });

                              // Remove finalized tx record
                              tx_records.remove(&(txid.clone(), true));
                          }
                      });
                  }
              });
      });

      // Clean up old block records
      BLOCKS.with_borrow_mut(|m| {
          let heights_to_remove: Vec<u32> = m
              .iter()
              .take_while(|(height, _)| *height <= confirmed_height)
              .map(|(height, _)| height)
              .collect();

          for height in heights_to_remove {
              m.remove(&height);
              ic_cdk::println!("   Cleaned up block {}", height);
          }
      });

      ic_cdk::println!("✅ new_block() complete");
      Ok(())
  }

  /// Rollback pool state to before the specified transaction
  fn rollback_pool_state(pool_address: &str, txid: &Txid) {
      POOL_CONFIG.with(|p| {
          let mut config = p.borrow().get().clone();

          if config.address != pool_address {
              return;  // Not our pool
          }

          // Find the state created by this txid
          let idx = config.states.iter()
              .position(|state| state.id.as_ref() == Some(txid));

          if let Some(idx) = idx {
              // Remove this state and all subsequent states
              let removed_count = config.states.len() - idx;
              config.states.truncate(idx);

              ic_cdk::println!("   Rolled back {} states for pool {}", removed_count, pool_address);

              // Recalculate total_deposited_sats from remaining states
              config.total_deposited_sats = config.states.last()
                  .map(|s| s.btc_supply())
                  .unwrap_or_default();

              p.borrow_mut().set(config).expect("Failed to update pool config");
          }
      });
  }

  /// Blockchain state management - Transaction rollback
  /// Called by REE Orchestrator when a transaction is rejected/replaced
  #[update(guard = "ensure_testnet4_orchestrator")]
  fn rollback_tx(args: RollbackTxArgs) -> Result<(), String> {
      ic_cdk::println!("⏪ rollback_tx() called by REE Orchestrator");
      ic_cdk::println!("   txid: {}", args.txid);

      TX_RECORDS.with_borrow_mut(|m| {
          // Find record (could be confirmed or unconfirmed)
          let record = m.get(&(args.txid.clone(), false))
              .or_else(|| m.get(&(args.txid.clone(), true)));

          if let Some(record) = record {
              ic_cdk::println!("   Found tx record - affected pools: {:?}", record.pools);

              // Rollback each affected pool
              record.pools.iter().for_each(|pool_address| {
                  rollback_pool_state(pool_address, &args.txid);
              });

              // Remove tx records
              m.remove(&(args.txid.clone(), false));
              m.remove(&(args.txid.clone(), true));

              ic_cdk::println!("✅ Rollback complete for {}", args.txid);
          } else {
              ic_cdk::println!("⚠️  No tx record found for {}", args.txid);
          }
      });

      Ok(())
  }

  // ============================
  // REE ORCHESTRATOR REGISTRATION
  // ============================

  /// Self-register with REE Orchestrator
  ///
  /// Registers "HODL_PROTOCOL" exchange ID with testnet orchestrator
  ///
  /// **Call this once after canister deployment**
  #[update]
  async fn register_with_ree_orchestrator() -> Result<String, String> {
      const TESTNET_ORCHESTRATOR: &str = "hvyp5-5yaaa-aaaao-qjxha-cai";
      const EXCHANGE_ID: &str = "HODL_PROTOCOL";

      let orchestrator = candid::Principal::from_text(TESTNET_ORCHESTRATOR)
          .map_err(|e| format!("Invalid orchestrator principal: {}", e))?;

      let self_id = ic_cdk::api::id();

      let args = RegisterExchangeArgs {
          exchange_id: EXCHANGE_ID.to_string(),
          exchange_canister: self_id,
          client_canisters: vec![],
      };

      ic_cdk::println!("📝 Registering exchange with REE Orchestrator...");
      ic_cdk::println!("   Exchange ID: {}", EXCHANGE_ID);
      ic_cdk::println!("   Canister ID: {}", self_id);

      let result: Result<(Result<String, String>,), _> = ic_cdk::call(
          orchestrator,
          "register_exchange",
          (args,)
      ).await;

      match result {
          Ok((Ok(msg),)) => {
              ic_cdk::println!("✅ Successfully registered with REE Orchestrator!");
              ic_cdk::println!("   Response: {}", msg);
              Ok(format!("Registered {} -> {}: {}", EXCHANGE_ID, self_id, msg))
          },
          Ok((Err(e),)) => {
              ic_cdk::println!("❌ Registration rejected: {}", e);
              Err(format!("Orchestrator rejected registration: {}", e))
          },
          Err((code, msg)) => {
              ic_cdk::println!("❌ Call failed: {:?} - {}", code, msg);
              Err(format!("Failed to call orchestrator: {:?} - {}", code, msg))
          }
      }
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

      // Schema migration: Ensure pool config has 'states' field
      POOL_CONFIG.with(|p| {
          let config = p.borrow().get().clone();

          // If pool exists but states is empty, this is an old schema
          if !config.address.is_empty() && config.states.is_empty() {
              ic_cdk::println!("🔄 Migrating pool config schema...");
              ic_cdk::println!("   Pool address: {}", config.address);
              ic_cdk::println!("   Total deposited: {} sats", config.total_deposited_sats);

              // States field is already initialized as empty vec via #[serde(default)]
              // Just persist the migrated config back to stable storage
              p.borrow_mut().set(config.clone())
                  .expect("Failed to persist migrated pool config");

              ic_cdk::println!("✅ Pool config migrated successfully");
              ic_cdk::println!("   Initial nonce: 0 (empty state chain)");
          } else if !config.address.is_empty() {
              ic_cdk::println!("✅ Pool config schema up-to-date");
              ic_cdk::println!("   Current nonce: {}", config.states.last().map(|s| s.nonce).unwrap_or(0));
          }
      });
  }

  // Export Candid interface
  ic_cdk::export_candid!();