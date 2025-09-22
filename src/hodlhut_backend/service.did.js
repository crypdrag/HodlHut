export const idlFactory = ({ IDL }) => {
  const SmartSolution = IDL.Record({
    'id' : IDL.Text,
    'title' : IDL.Text,
    'cost' : IDL.Record({
      'asset' : IDL.Text,
      'description' : IDL.Opt(IDL.Text),
      'amount' : IDL.Text,
    }),
    'description' : IDL.Text,
    'userReceives' : IDL.Record({ 'asset' : IDL.Text, 'amount' : IDL.Float64 }),
    'badge' : IDL.Variant({
      'RECOMMENDED' : IDL.Null,
      'REQUIRED_STEP' : IDL.Null,
      'ALTERNATIVE' : IDL.Null,
    }),
    'dexButtons' : IDL.Opt(IDL.Text),
    'solutionType' : IDL.Variant({
      'manual_topup' : IDL.Null,
      'auto_swap' : IDL.Null,
      'swap_other_asset' : IDL.Null,
      'deduct_from_swap' : IDL.Null,
      'use_balance' : IDL.Null,
    }),
  });
  const DEXQuote = IDL.Record({
    'fee' : IDL.Float64,
    'path' : IDL.Vec(IDL.Text),
    'quoteError' : IDL.Opt(IDL.Text),
    'score' : IDL.Float64,
    'liquidityUsd' : IDL.Float64,
    'badge' : IDL.Opt(IDL.Text),
    'dexName' : IDL.Text,
    'estimatedSpeed' : IDL.Text,
    'reason' : IDL.Text,
    'slippage' : IDL.Float64,
  });
  return IDL.Service({
    'analyze_swap' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Float64],
        [
          IDL.Record({
            'smartSolutions' : IDL.Vec(SmartSolution),
            'swapRoute' : IDL.Vec(IDL.Text),
            'estimatedTime' : IDL.Text,
            'amount' : IDL.Float64,
            'fromAsset' : IDL.Text,
            'toAsset' : IDL.Text,
            'totalFeeUsd' : IDL.Float64,
          }),
        ],
        [],
      ),
    'generate_smart_solutions' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Float64],
        [IDL.Vec(SmartSolution)],
        ['query'],
      ),
    'get_dex_quotes' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Float64],
        [IDL.Vec(DEXQuote)],
        ['query'],
      ),
    'greet' : IDL.Func([IDL.Text], [IDL.Text], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
