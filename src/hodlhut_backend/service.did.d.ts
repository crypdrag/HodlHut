import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface DEXQuote {
  'fee' : number,
  'path' : Array<string>,
  'quoteError' : [] | [string],
  'score' : number,
  'liquidityUsd' : number,
  'badge' : [] | [string],
  'dexName' : string,
  'estimatedSpeed' : string,
  'reason' : string,
  'slippage' : number,
}
export interface SmartSolution {
  'id' : string,
  'title' : string,
  'cost' : {
    'asset' : string,
    'description' : [] | [string],
    'amount' : string,
  },
  'description' : string,
  'userReceives' : { 'asset' : string, 'amount' : number },
  'badge' : { 'RECOMMENDED' : null } |
    { 'REQUIRED_STEP' : null } |
    { 'ALTERNATIVE' : null },
  'dexButtons' : [] | [string],
  'solutionType' : { 'manual_topup' : null } |
    { 'auto_swap' : null } |
    { 'swap_other_asset' : null } |
    { 'deduct_from_swap' : null } |
    { 'use_balance' : null },
}
export interface _SERVICE {
  'analyze_swap' : ActorMethod<
    [string, string, number],
    {
      'smartSolutions' : Array<SmartSolution>,
      'swapRoute' : Array<string>,
      'estimatedTime' : string,
      'amount' : number,
      'fromAsset' : string,
      'toAsset' : string,
      'totalFeeUsd' : number,
    }
  >,
  'generate_smart_solutions' : ActorMethod<
    [string, string, number],
    Array<SmartSolution>
  >,
  'get_dex_quotes' : ActorMethod<[string, string, number], Array<DEXQuote>>,
  'greet' : ActorMethod<[string], string>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
