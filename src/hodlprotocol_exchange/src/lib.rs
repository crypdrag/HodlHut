use candid::{CandidType, Deserialize};
use ic_cdk_macros::*;
use serde::Serialize;
use std::cell::RefCell;
use ic_stable_structures::{
    DefaultMemoryImpl, StableBTreeMap,
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    Storable, storable::Bound,
};
use ree_types::{bitcoin::Network, schnorr::request_ree_pool_address};

// ============================
// TYPE DEFINITIONS - Pool & Deposit Tracking
// ============================

/// Configuration for the liquid staking pool
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
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

/// Response from pre_deposit() - tells user where to send BTC
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct DepositOffer {
    pub pool_address: String,      // Real Bitcoin address to deposit to
    pub nonce: u64,                 // For REE tracking
    pub expected_blst: u64,         // How much BLST user will receive
    pub protocol_fee: u64,          // Fee (0 for testnet demo)
    pub estimated_apy: f64,         // From selected FP
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

// ============================
// STABLE STORAGE - Memory Management
// ============================

type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    // Pool configuration (single pool for MVP)
    static POOL_CONFIG: RefCell<Option<PoolConfig>> = RefCell::new(None);

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
  // REE library accepts: "test_key_1" (testnet/local) or "key_1" (mainnet)
  const SCHNORR_KEY_NAME: &str = "test_key_1";  // Use "key_1" for mainnet
  const POOL_TIMELOCK_BLOCKS: u32 = 12_960;  // 90 days

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

      // Check if pool already initialized
      let existing_pool = POOL_CONFIG.with(|p| p.borrow().clone());
      if existing_pool.is_some() {
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

      // Store pool config
      POOL_CONFIG.with(|p| {
          *p.borrow_mut() = Some(pool_config.clone());
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
      POOL_CONFIG.with(|p| p.borrow().clone())
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
      let pool_config = POOL_CONFIG.with(|p| p.borrow().clone())
          .ok_or("Pool not initialized - call init_pool() first")?;

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

      // Calculate expected BLST: 100,000 BLST = 1 BTC
      // So: BLST = sats / 10
      let expected_blst = amount_sats / 10;

      ic_cdk::println!("Expected BLST for {} sats: {} BLST", amount_sats, expected_blst);

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

      Ok(DepositOffer {
          pool_address: pool_config.address,
          nonce,
          expected_blst,
          protocol_fee: 0,  // No fee for testnet demo
          estimated_apy: selected_fp.estimated_apy,
      })
  }

  /// Query pool statistics
  #[query]
  fn get_pool_stats() -> Result<PoolStats, String> {
      let pool_config = POOL_CONFIG.with(|p| p.borrow().clone())
          .ok_or("Pool not initialized")?;

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
  /// This is triggered when a Bitcoin deposit to the pool address is confirmed
  #[update]
  fn execute_tx(tx_id: String, execution_result: ExecutionResult) {
      ic_cdk::println!(
          "execute_tx() called - tx_id: {}, status: {}",
          tx_id,
          execution_result.status
      );

      // Only process successful transactions
      if execution_result.status != "success" {
          ic_cdk::println!("❌ Transaction failed, skipping: {}", tx_id);
          return;
      }

      ic_cdk::println!(
          "Processing deposit: {} sats from {} (nonce: {})",
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

      // Calculate BLST to mint: 100,000 BLST = 1 BTC
      // So: BLST = sats / 10
      let blst_amount = execution_result.amount_sats / 10;

      ic_cdk::println!("Minting {} BLST for {} sats", blst_amount, execution_result.amount_sats);

      // Get pool config
      let pool_config = POOL_CONFIG.with(|p| p.borrow().clone());
      let pool_config = match pool_config {
          Some(config) => config,
          None => {
              ic_cdk::println!("❌ Pool not initialized!");
              return;
          }
      };

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
      let mut config = match POOL_CONFIG.with(|p| p.borrow().clone()) {
          Some(config) => config,
          None => {
              ic_cdk::println!("❌ Pool config missing during update!");
              return;
          }
      };

      config.total_deposited_sats += execution_result.amount_sats;
      config.total_blst_minted += blst_amount;

      POOL_CONFIG.with(|p| {
          *p.borrow_mut() = Some(config.clone());
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