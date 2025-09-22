import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Array "mo:base/Array";

actor MyHut {

  // Types for swap operations
  public type AssetType = {
    #ICP;
    #ckBTC;
    #ckETH;
    #ckUSDC;
    #ckUSDT;
    #BTC;
    #ETH;
    #USDC;
    #USDT;
  };

  public type SwapRequest = {
    fromAsset: AssetType;
    toAsset: AssetType;
    amount: Nat64; // Amount in smallest units (e.g., satoshis for BTC, wei for ETH)
    slippage: Float; // Maximum acceptable slippage percentage (e.g., 0.5 for 0.5%)
    dexPreference: ?Text; // Optional DEX preference ("KongSwap", "ICPSwap", "ICDEX")
    urgency: {#low; #medium; #high}; // Transaction urgency
    maxFeeUsd: ?Float; // Maximum acceptable fee in USD
  };

  public type SwapResponse = {
    success: Bool;
    transactionId: ?Text;
    outputAmount: ?Nat64; // Actual amount received
    actualFeeUsd: ?Float; // Actual fee paid in USD
    executionTime: ?Int; // Timestamp of execution
    errorMessage: ?Text; // Error message if failed
    route: ?SwapRoute; // The route taken for the swap
  };

  public type SwapRoute = {
    dexUsed: Text; // Which DEX was used
    steps: [Text]; // Steps in the swap process
    estimatedTime: Text; // Estimated completion time
    complexity: Text; // "Simple", "Complex", etc.
  };

  public type BalanceEntry = {
    asset: AssetType;
    balance: Nat64; // Balance in smallest units
    balanceUsd: Float; // USD value of balance
    lastUpdated: Int; // Timestamp of last update
  };

  // State variables
  private var owner: ?Principal = null;
  private var isInitialized: Bool = false;

  // Mock balances for testing (in production, this would come from actual token canisters)
  private var balances: [BalanceEntry] = [
    {
      asset = #ICP;
      balance = 1000_000_000; // 10 ICP (8 decimals)
      balanceUsd = 120.0;
      lastUpdated = Time.now();
    },
    {
      asset = #ckBTC;
      balance = 50_000_000; // 0.5 ckBTC (8 decimals)
      balanceUsd = 32500.0;
      lastUpdated = Time.now();
    },
    {
      asset = #ckETH;
      balance = 2_000_000_000_000_000_000; // 2 ckETH (18 decimals)
      balanceUsd = 6400.0;
      lastUpdated = Time.now();
    }
  ];

  // Initialize the Hut with an owner
  public func initialize(hutOwner: Principal) : async Result.Result<Text, Text> {
    if (isInitialized) {
      return #err("Hut already initialized");
    };

    owner := ?hutOwner;
    isInitialized := true;
    #ok("Hut initialized successfully for " # Principal.toText(hutOwner))
  };

  // Main swap execution method
  public func execute_swap(request: SwapRequest) : async SwapResponse {
    // Verify initialization
    if (not isInitialized) {
      return {
        success = false;
        transactionId = null;
        outputAmount = null;
        actualFeeUsd = null;
        executionTime = null;
        errorMessage = ?"Hut not initialized";
        route = null;
      };
    };

    // Mock swap execution logic
    let route: SwapRoute = {
      dexUsed = switch (request.dexPreference) {
        case (?dex) { dex };
        case null { "KongSwap" }; // Default DEX
      };
      steps = [assetTypeToText(request.fromAsset), assetTypeToText(request.toAsset)];
      estimatedTime = switch (request.urgency) {
        case (#high) { "5-15 seconds" };
        case (#medium) { "10-30 seconds" };
        case (#low) { "30-60 seconds" };
      };
      complexity = "Simple";
    };

    // Mock calculation (in production, this would call actual DEX APIs)
    let exchangeRate: Float = getExchangeRate(request.fromAsset, request.toAsset);
    let outputAmount: Nat64 = switch (Nat64.fromNat(Float.toInt(Float.fromInt64(Int64.fromNat64(request.amount)) * exchangeRate))) {
      case (amount) { amount };
    };

    // Mock fee calculation
    let feeUsd: Float = 2.50; // Flat $2.50 fee for testing

    // Check if fee is acceptable
    switch (request.maxFeeUsd) {
      case (?maxFee) {
        if (feeUsd > maxFee) {
          return {
            success = false;
            transactionId = null;
            outputAmount = null;
            actualFeeUsd = ?feeUsd;
            executionTime = null;
            errorMessage = ?"Fee exceeds maximum acceptable amount";
            route = ?route;
          };
        };
      };
      case null { };
    };

    // Mock successful execution
    {
      success = true;
      transactionId = ?"tx_" # Int.toText(Time.now());
      outputAmount = ?outputAmount;
      actualFeeUsd = ?feeUsd;
      executionTime = ?Time.now();
      errorMessage = null;
      route = ?route;
    }
  };

  // Get current balances
  public query func get_balance() : async [BalanceEntry] {
    balances
  };

  // Get specific asset balance
  public query func get_asset_balance(asset: AssetType) : async ?BalanceEntry {
    Array.find<BalanceEntry>(balances, func(entry) { entry.asset == asset })
  };

  // Get owner information
  public query func get_owner() : async ?Principal {
    owner
  };

  // Check if Hut is initialized
  public query func is_initialized() : async Bool {
    isInitialized
  };

  // Helper function to convert AssetType to Text
  private func assetTypeToText(asset: AssetType) : Text {
    switch (asset) {
      case (#ICP) { "ICP" };
      case (#ckBTC) { "ckBTC" };
      case (#ckETH) { "ckETH" };
      case (#ckUSDC) { "ckUSDC" };
      case (#ckUSDT) { "ckUSDT" };
      case (#BTC) { "BTC" };
      case (#ETH) { "ETH" };
      case (#USDC) { "USDC" };
      case (#USDT) { "USDT" };
    }
  };

  // Mock exchange rate function (in production, would fetch real rates)
  private func getExchangeRate(from: AssetType, to: AssetType) : Float {
    // Mock rates for testing
    switch (from, to) {
      case (#ICP, #ckBTC) { 0.000002 }; // 1 ICP = 0.000002 ckBTC
      case (#ICP, #ckETH) { 0.00003 }; // 1 ICP = 0.00003 ckETH
      case (#ICP, #ckUSDC) { 12.0 }; // 1 ICP = 12 ckUSDC
      case (#ckBTC, #ICP) { 500000.0 }; // 1 ckBTC = 500,000 ICP
      case (#ckETH, #ICP) { 33333.0 }; // 1 ckETH = 33,333 ICP
      case (#ckUSDC, #ICP) { 0.083 }; // 1 ckUSDC = 0.083 ICP
      case (_, _) { 1.0 }; // Default 1:1 for same asset or unknown pairs
    }
  };

}