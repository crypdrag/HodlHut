import Text "mo:base/Text";
import Array "mo:base/Array";
import Float "mo:base/Float";

actor HodlHutBackend {

  // Types matching frontend Smart Solutions logic
  public type SmartSolution = {
    id: Text;
    solutionType: {#deduct_from_swap; #swap_other_asset; #manual_topup; #auto_swap; #use_balance};
    title: Text;
    description: Text;
    badge: {#RECOMMENDED; #REQUIRED_STEP; #ALTERNATIVE};
    userReceives: {amount: Float; asset: Text};
    cost: {amount: Text; asset: Text; description: ?Text};
    dexButtons: ?Text;
  };

  public type DEXQuote = {
    dexName: Text;
    path: [Text];
    slippage: Float;
    fee: Float;
    estimatedSpeed: Text;
    liquidityUsd: Float;
    score: Float;
    badge: ?Text;
    reason: Text;
    quoteError: ?Text;
  };

  // Mock Smart Solutions generation (matches frontend logic)
  public query func generate_smart_solutions(fromAsset: Text, toAsset: Text, amount: Float) : async [SmartSolution] {
    // Mock gas solution for demo
    if (toAsset == "USDT") {
      [{
        id = "use_balance_ckusd_gas";
        solutionType = #use_balance;
        title = "Use existing ckUSDT for gas";
        description = "You have sufficient ckUSDT balance to cover Ethereum gas fees";
        badge = #RECOMMENDED;
        userReceives = {amount = amount; asset = toAsset};
        cost = {amount = "0.003"; asset = "ckETH"; description = ?"Gas fee"};
        dexButtons = null;
      }]
    } else {
      [{
        id = "auto_swap_gas";
        solutionType = #auto_swap;
        title = "Auto-swap for gas";
        description = "HodlHut will automatically handle gas fee conversion";
        badge = #RECOMMENDED;
        userReceives = {amount = amount; asset = toAsset};
        cost = {amount = "0.003"; asset = "ckETH"; description = ?"Estimated gas"};
        dexButtons = ?"true";
      }]
    }
  };

  // Mock DEX quotes (matches CompactDEX logic)
  public query func get_dex_quotes(fromToken: Text, toToken: Text, amount: Float) : async [DEXQuote] {
    [
      {
        dexName = "KongSwap";
        path = [fromToken, toToken];
        slippage = 0.15;
        fee = 0.3;
        estimatedSpeed = "5-15 seconds";
        liquidityUsd = 5250000.0;
        score = 92.5;
        badge = ?"RECOMMENDED";
        reason = "Best overall execution";
        quoteError = null;
      },
      {
        dexName = "ICPSwap";
        path = [fromToken, toToken];
        slippage = 0.22;
        fee = 0.3;
        estimatedSpeed = "10-30 seconds";
        liquidityUsd = 8100000.0;
        score = 88.2;
        badge = ?"LIQUIDITY";
        reason = "Deep liquidity pools";
        quoteError = null;
      },
      {
        dexName = "ICDEX";
        path = [fromToken, toToken];
        slippage = 0.08;
        fee = 0.1;
        estimatedSpeed = "On-chain orderbook";
        liquidityUsd = 12500000.0;
        score = 85.7;
        badge = null;
        reason = "Professional trading";
        quoteError = null;
      }
    ]
  };

  // Mock swap analysis
  public func analyze_swap(fromAsset: Text, toAsset: Text, amount: Float) : async {fromAsset: Text; toAsset: Text; amount: Float; swapRoute: [Text]; estimatedTime: Text; totalFeeUsd: Float; smartSolutions: [SmartSolution]} {
    let solutions = await generate_smart_solutions(fromAsset, toAsset, amount);
    {
      fromAsset = fromAsset;
      toAsset = toAsset;
      amount = amount;
      swapRoute = [fromAsset, toAsset];
      estimatedTime = "10-30 seconds";
      totalFeeUsd = 2.50;
      smartSolutions = solutions;
    }
  };

  // Basic greeting for testing
  public query func greet(name : Text) : async Text {
    return "Hello, " # name # "! HodlHut Backend is running with mock data.";
  };
};
