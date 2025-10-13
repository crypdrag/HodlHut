 use candid::{CandidType, Deserialize};
  use ic_cdk_macros::*;
  use serde::Serialize;
  use std::cell::RefCell;

  // ============================
  // TYPE DEFINITIONS - REE Exchange API
  // ============================

  #[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
  pub struct PoolInfo {
      pub pool_address: String,
      pub pool_type: String,
      pub total_staked: u64,
      pub active_stakes: u32,
  }

  #[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
  pub struct StakeOffer {
      pub pool_address: String,
      pub amount: u64,
      pub duration: u32,
      pub finality_provider: String,
      pub expected_blst: u64,
      pub protocol_fee: u64,
      pub estimated_apy: f64,
      pub nonce: u64,
  }

  #[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
  pub struct ExecutionResult {
      pub tx_id: String,
      pub status: String,
      pub bitcoin_tx_id: Option<String>,
      pub error: Option<String>,
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
  // REE EXCHANGE API - STUBS (Phase 1)
  // ============================

  /// Pool management - Query pool list
  #[query]
  fn get_pool_list() -> Vec<PoolInfo> {
      ic_cdk::println!("get_pool_list() called - returning empty vec (stub)");
      vec![]
  }

  /// Pool management - Query specific pool info
  #[query]
  fn get_pool_info(pool_address: String) -> Option<PoolInfo> {
      ic_cdk::println!("get_pool_info({}) called - returning None (stub)", pool_address);
      None
  }

/// Transaction preparation - Pre-stake flow
  /// Returns offer details for client-side PSBT construction
  /// Client constructs PSBTs using @babylonlabs-io/btc-staking-ts SDK
  #[update]
  async fn pre_stake(
      user_btc_address: String,
      amount: u64,
      duration: u32,
      finality_provider_btc_pk: String,
  ) -> Result<StakeOffer, String> {
      ic_cdk::println!(
          "pre_stake() called - user: {}, amount: {}, duration: {}, fp: {}",
          user_btc_address,
          amount,
          duration,
          finality_provider_btc_pk
      );

      // Validation: Check minimum/maximum stake amounts
      if amount < 50_000 {
          return Err("Minimum stake is 0.0005 BTC (50,000 sats)".to_string());
      }

      if amount > 35_000_000 {
          return Err("Maximum stake is 350 BTC (35,000,000 sats)".to_string());
      }

      // Validation: Check minimum duration (30 days = ~4,320 blocks)
      if duration < 4_320 {
          return Err("Minimum staking duration is 30 days (~4,320 blocks)".to_string());
      }

      // Validation: Taproot address check (must start with tb1p for Signet testnet)
      if !user_btc_address.starts_with("tb1p") {
          return Err("Address must be a Taproot address (tb1p...) on Bitcoin Signet".to_string());
      }

      // Fetch finality providers to validate selection and get APY
      let fps = get_finality_providers().await?;

      let selected_fp = fps.iter()
          .find(|fp| fp.btc_pk_hex == finality_provider_btc_pk)
          .ok_or("Invalid finality provider selected")?;

      // Calculate fees and expected BLST
      let protocol_fee = amount * 2 / 100; // 2% protocol fee
      let expected_blst = amount; // 1:1 backing (user gets full amount in BLST)

      // Generate pool address (deterministic based on FP + duration)
      let pool_address = format!("tb1p_staking_pool_{}_{}",
          &finality_provider_btc_pk[..8],
          duration
      );

      Ok(StakeOffer {
          pool_address,
          amount,
          duration,
          finality_provider: finality_provider_btc_pk,
          expected_blst,
          protocol_fee,
          estimated_apy: selected_fp.estimated_apy,
          nonce: ic_cdk::api::time(),
      })
  }

  /// Transaction execution callback - Called by REE Orchestrator
  #[update]
  fn execute_tx(tx_id: String, execution_result: ExecutionResult) {
      ic_cdk::println!(
          "execute_tx() called - tx_id: {}, status: {}",
          tx_id,
          execution_result.status
      );
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