// Plug Integration Module for HodlHut
// Connects frontend to HutFactory and MyHut canisters via Plug wallet

import { Principal } from '@dfinity/principal';
import { Actor, HttpAgent } from '@dfinity/agent';
import { SwapRequest, SwapResponse, BalanceEntry, MyHutCanister } from '../types/myhut';

// Plug wallet interface
interface PlugWallet {
  requestConnect: (options?: {
    whitelist?: string[];
    host?: string;
  }) => Promise<boolean>;
  createActor: (options: {
    canisterId: string;
    interfaceFactory: any;
  }) => Promise<any>;
  getPrincipal: () => Promise<Principal>;
  isConnected: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  agent: HttpAgent;
}

// HutFactory canister interface
interface HutFactoryCanister {
  get_hut_for_user: (principal: Principal) => Promise<Principal>;
  has_hut: (principal: Principal) => Promise<boolean>;
  get_test_principal: () => Promise<Principal>;
}

// Connection state
interface ConnectionState {
  isConnected: boolean;
  principal: Principal | null;
  userHutId: Principal | null;
  error: string | null;
}

// Configuration
const CANISTER_IDS = {
  hutfactory: process.env.REACT_APP_HUTFACTORY_CANISTER_ID || 'rdmx6-jaaaa-aaaaa-aaadq-cai', // Default for local
  // MyHut canister IDs are dynamically retrieved from HutFactory
};

const IC_HOST = process.env.REACT_APP_IC_HOST || 'http://127.0.0.1:4943'; // Local replica default

export class PlugIntegrationService {
  private static instance: PlugIntegrationService;
  private plug: PlugWallet | null = null;
  private connectionState: ConnectionState = {
    isConnected: false,
    principal: null,
    userHutId: null,
    error: null
  };
  private hutFactoryActor: HutFactoryCanister | null = null;
  private myHutActor: MyHutCanister | null = null;

  // Singleton pattern
  public static getInstance(): PlugIntegrationService {
    if (!PlugIntegrationService.instance) {
      PlugIntegrationService.instance = new PlugIntegrationService();
    }
    return PlugIntegrationService.instance;
  }

  private constructor() {
    this.initializePlug();
  }

  // Initialize Plug wallet connection
  private async initializePlug(): Promise<void> {
    try {
      // Check if Plug is available in the browser
      if (typeof window !== 'undefined' && (window as any).ic?.plug) {
        this.plug = (window as any).ic.plug;

        // Check if already connected
        const isConnected = await this.plug!.isConnected();
        if (isConnected) {
          await this.restoreConnection();
        }
      } else {
        this.connectionState.error = 'Plug wallet not found. Please install Plug browser extension.';
      }
    } catch (error) {
      console.error('Failed to initialize Plug:', error);
      this.connectionState.error = 'Failed to initialize Plug wallet';
    }
  }

  // Connect to Plug wallet and return user principal
  public async connectPlug(): Promise<Principal> {
    try {
      if (!this.plug) {
        throw new Error('Plug wallet not available. Please install Plug browser extension.');
      }

      // Request connection with whitelist of our canisters
      const connected = await this.plug.requestConnect({
        whitelist: [CANISTER_IDS.hutfactory],
        host: IC_HOST
      });

      if (!connected) {
        throw new Error('User rejected Plug wallet connection');
      }

      // Get user's principal
      const principal = await this.plug.getPrincipal();

      // Update connection state
      this.connectionState.isConnected = true;
      this.connectionState.principal = principal;
      this.connectionState.error = null;

      // Initialize HutFactory actor
      await this.initializeHutFactoryActor();

      console.log('✅ Connected to Plug wallet:', principal.toString());
      return principal;

    } catch (error) {
      console.error('Failed to connect to Plug:', error);
      this.connectionState.error = error instanceof Error ? error.message : 'Unknown connection error';
      throw error;
    }
  }

  // Restore previous connection if available
  private async restoreConnection(): Promise<void> {
    try {
      if (!this.plug) return;

      const principal = await this.plug.getPrincipal();
      this.connectionState.isConnected = true;
      this.connectionState.principal = principal;

      await this.initializeHutFactoryActor();
      console.log('✅ Restored Plug connection:', principal.toString());
    } catch (error) {
      console.error('Failed to restore connection:', error);
      this.connectionState.isConnected = false;
    }
  }

  // Initialize HutFactory actor for calling canister methods
  private async initializeHutFactoryActor(): Promise<void> {
    if (!this.plug) {
      throw new Error('Plug not connected');
    }

    try {
      // Create actor using Plug's createActor method
      this.hutFactoryActor = await this.plug.createActor({
        canisterId: CANISTER_IDS.hutfactory,
        interfaceFactory: this.createHutFactoryIDL()
      });
    } catch (error) {
      console.error('Failed to initialize HutFactory actor:', error);
      throw new Error('Failed to connect to HutFactory canister');
    }
  }

  // Create IDL interface for HutFactory canister
  private createHutFactoryIDL(): any {
    // This would normally be generated from the .did file
    // For now, we'll create a minimal interface
    return ({ IDL }: any) => {
      return IDL.Service({
        'get_hut_for_user': IDL.Func([IDL.Principal], [IDL.Principal], ['query']),
        'has_hut': IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
        'get_test_principal': IDL.Func([], [IDL.Principal], ['query'])
      });
    };
  }

  // Get user's Hut canister ID by calling HutFactory
  public async getUserHut(principal?: Principal): Promise<Principal> {
    try {
      if (!this.hutFactoryActor) {
        throw new Error('HutFactory not connected. Please connect Plug wallet first.');
      }

      const userPrincipal = principal || this.connectionState.principal;
      if (!userPrincipal) {
        throw new Error('No user principal available. Please connect wallet first.');
      }

      console.log('🔍 Getting Hut for user:', userPrincipal.toString());

      // Call HutFactory to get user's Hut canister ID
      const hutId = await this.hutFactoryActor.get_hut_for_user(userPrincipal);

      // Cache the Hut ID
      this.connectionState.userHutId = hutId;

      console.log('✅ Found user Hut:', hutId.toString());
      return hutId;

    } catch (error) {
      console.error('Failed to get user Hut:', error);
      throw new Error(`Failed to get user Hut: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Initialize MyHut actor for a specific Hut canister
  private async initializeMyHutActor(hutId: Principal): Promise<MyHutCanister> {
    if (!this.plug) {
      throw new Error('Plug not connected');
    }

    try {
      const actor = await this.plug.createActor({
        canisterId: hutId.toString(),
        interfaceFactory: this.createMyHutIDL()
      });

      return actor as MyHutCanister;
    } catch (error) {
      console.error('Failed to initialize MyHut actor:', error);
      throw new Error('Failed to connect to MyHut canister');
    }
  }

  // Create IDL interface for MyHut canister
  private createMyHutIDL(): any {
    return ({ IDL }: any) => {
      const AssetType = IDL.Variant({
        'ICP': IDL.Null,
        'ckBTC': IDL.Null,
        'ckETH': IDL.Null,
        'ckUSDC': IDL.Null,
        'ckUSDT': IDL.Null,
        'BTC': IDL.Null,
        'ETH': IDL.Null,
        'USDC': IDL.Null,
        'USDT': IDL.Null
      });

      const SwapRequest = IDL.Record({
        'fromAsset': AssetType,
        'toAsset': AssetType,
        'amount': IDL.Nat64,
        'slippage': IDL.Float32,
        'dexPreference': IDL.Opt(IDL.Text),
        'urgency': IDL.Variant({
          'low': IDL.Null,
          'medium': IDL.Null,
          'high': IDL.Null
        }),
        'maxFeeUsd': IDL.Opt(IDL.Float32)
      });

      const SwapRoute = IDL.Record({
        'dexUsed': IDL.Text,
        'steps': IDL.Vec(IDL.Text),
        'estimatedTime': IDL.Text,
        'complexity': IDL.Text
      });

      const SwapResponse = IDL.Record({
        'success': IDL.Bool,
        'transactionId': IDL.Opt(IDL.Text),
        'outputAmount': IDL.Opt(IDL.Nat64),
        'actualFeeUsd': IDL.Opt(IDL.Float32),
        'executionTime': IDL.Opt(IDL.Int),
        'errorMessage': IDL.Opt(IDL.Text),
        'route': IDL.Opt(SwapRoute)
      });

      const BalanceEntry = IDL.Record({
        'asset': AssetType,
        'balance': IDL.Nat64,
        'balanceUsd': IDL.Float32,
        'lastUpdated': IDL.Int
      });

      return IDL.Service({
        'initialize': IDL.Func([IDL.Principal], [IDL.Variant({ 'ok': IDL.Text, 'err': IDL.Text })], []),
        'execute_swap': IDL.Func([SwapRequest], [SwapResponse], []),
        'get_balance': IDL.Func([], [IDL.Vec(BalanceEntry)], ['query']),
        'get_asset_balance': IDL.Func([AssetType], [IDL.Opt(BalanceEntry)], ['query']),
        'get_owner': IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
        'is_initialized': IDL.Func([], [IDL.Bool], ['query'])
      });
    };
  }

  // Execute a swap through the user's MyHut canister
  public async executeSwap(hutId: Principal, request: SwapRequest): Promise<SwapResponse> {
    try {
      console.log('🔄 Executing swap via MyHut:', hutId.toString());
      console.log('📊 Swap request:', request);

      // Initialize MyHut actor for this specific Hut
      const myHutActor = await this.initializeMyHutActor(hutId);

      // Convert TypeScript request to Motoko format
      const motokoRequest = this.convertSwapRequestToMotoko(request);

      // Execute the swap
      const response = await myHutActor.execute_swap(motokoRequest);

      console.log('✅ Swap executed:', response);
      return this.convertSwapResponseFromMotoko(response);

    } catch (error) {
      console.error('Failed to execute swap:', error);
      throw new Error(`Swap execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Convert TypeScript SwapRequest to Motoko format
  private convertSwapRequestToMotoko(request: SwapRequest): any {
    return {
      fromAsset: { [request.fromAsset]: null },
      toAsset: { [request.toAsset]: null },
      amount: BigInt(request.amount),
      slippage: request.slippage,
      dexPreference: request.dexPreference ? [request.dexPreference] : [],
      urgency: { [request.urgency]: null },
      maxFeeUsd: request.maxFeeUsd ? [request.maxFeeUsd] : []
    };
  }

  // Convert Motoko SwapResponse to TypeScript format
  private convertSwapResponseFromMotoko(response: any): SwapResponse {
    return {
      success: response.success,
      transactionId: response.transactionId[0] || undefined,
      outputAmount: response.outputAmount[0] ? response.outputAmount[0].toString() : undefined,
      actualFeeUsd: response.actualFeeUsd[0] || undefined,
      executionTime: response.executionTime[0] || undefined,
      errorMessage: response.errorMessage[0] || undefined,
      route: response.route[0] ? {
        dexUsed: response.route[0].dexUsed,
        steps: response.route[0].steps,
        estimatedTime: response.route[0].estimatedTime,
        complexity: response.route[0].complexity
      } : undefined
    };
  }

  // Get current connection state
  public getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  // Check if user has a Hut
  public async hasHut(principal?: Principal): Promise<boolean> {
    try {
      if (!this.hutFactoryActor) {
        throw new Error('HutFactory not connected');
      }

      const userPrincipal = principal || this.connectionState.principal;
      if (!userPrincipal) {
        throw new Error('No user principal available');
      }

      return await this.hutFactoryActor.has_hut(userPrincipal);
    } catch (error) {
      console.error('Failed to check if user has Hut:', error);
      return false;
    }
  }

  // Disconnect from Plug
  public async disconnect(): Promise<void> {
    try {
      if (this.plug) {
        await this.plug.disconnect();
      }

      // Reset state
      this.connectionState = {
        isConnected: false,
        principal: null,
        userHutId: null,
        error: null
      };

      this.hutFactoryActor = null;
      this.myHutActor = null;

      console.log('✅ Disconnected from Plug wallet');
    } catch (error) {
      console.error('Failed to disconnect from Plug:', error);
    }
  }

  // Get test principal for development
  public async getTestPrincipal(): Promise<Principal> {
    try {
      if (!this.hutFactoryActor) {
        throw new Error('HutFactory not connected');
      }

      return await this.hutFactoryActor.get_test_principal();
    } catch (error) {
      console.error('Failed to get test principal:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const plugIntegration = PlugIntegrationService.getInstance();

// Export types for use in components
export type { ConnectionState };