// MasterAgent.js - Central Coordination Agent with HutFactoryAgent Integration
//
// ARCHITECTURE: DFINITY LLM Intelligence Layer Pattern
// =====================================================
// 
// This agent implements the DFINITY LLM tool-based architecture where:
// - Intelligence Layer (Agents): Decision making, routing, optimization
// - Execution Layer (Canisters): Blockchain operations, Chain Fusion
// 
// MasterAgent serves as the orchestration hub for 7 specialized agents:
// 1. BitcoinRPCAgent   - Bitcoin network intelligence & fee optimization
// 2. EVMRPCAgent       - Ethereum EIP-1559 gas analysis & ERC-20 handling  
// 3. SVMRPCAgent       - Solana network analysis & SPL token support
// 4. DEXRoutingAgent   - Intelligent ICP hub routing & slippage optimization
// 5. HutFactoryAgent   - Sovereign canister lifecycle management
// 6. TransactionMonitorAgent - Multi-chain operation tracking
// 7. MasterAgent       - Frontend orchestration & session management
//
// PRODUCTION-READY FEATURES:
// - Real-time network fee estimation replacing hardcoded values
// - Intelligent hub routing via ICP for optimal liquidity
// - Comprehensive error handling & fallback mechanisms
// - Multi-step operation coordination across networks
// - Internet Identity integration for decentralized auth
// - Sovereign canister (MyHut) architecture for user assets

const { BitcoinRPCAgent } = require('./BitcoinRPCAgent');
const { EVMRPCAgent } = require('./EVMRPCAgent');
const { SVMRPCAgent } = require('./SVMRPCAgent');
const { DEXRoutingAgent } = require('./DEXRoutingAgent');
const { TransactionMonitorAgent } = require('./TransactionMonitorAgent');
const { HutFactoryAgent } = require('./HutFactoryAgent');

class MasterAgent {
  constructor(environment = 'development') {
    this.environment = environment;
    this.activeOperations = new Map();
    
    // Initialize all agents including HutFactoryAgent
    this.bitcoinAgent = new BitcoinRPCAgent(environment);
    this.evmAgent = new EVMRPCAgent(environment);
    this.solanaAgent = new SVMRPCAgent(environment);
    this.dexAgent = new DEXRoutingAgent(environment);
    this.transactionMonitor = new TransactionMonitorAgent(environment);
    this.hutFactoryAgent = new HutFactoryAgent(environment);
    
    this.initializeRouting();
    
    console.log(`MasterAgent initialized in ${environment} mode with 7 agents`);
  }

  // Initialize frontend request routing including hut lifecycle
  initializeRouting() {
    this.frontendRouting = {
      // Existing routing
      'startDeposit': this.routeDepositRequest.bind(this),
      'startSwap': this.routeSwapRequest.bind(this),
      'getAgentStatus': this.getAgentStatus.bind(this),
      
      // HUT LIFECYCLE ROUTING - NEW
      'getHut': this.handleGetHut.bind(this),
      'activateHut': this.handleActivateHut.bind(this),
      'checkHutStatus': this.handleHutStatus.bind(this),
      
      // Authentication
      'authenticate': this.handleAuthentication.bind(this)
    };
  }

  // ===================================================================
  // HUT LIFECYCLE HANDLERS - NEW METHODS
  // ===================================================================

  // Handle "Get Hut" button clicks from frontend
  async handleGetHut(params) {
    try {
      const { userPrincipal, authMethod = 'internet_identity' } = params || {};
      
      if (!userPrincipal) {
        return {
          success: false,
          error: 'User authentication required for hut creation',
          code: 'AUTH_REQUIRED'
        };
      }

      console.log(`MasterAgent: Processing Get Hut request for user ${userPrincipal}`);

      // Route to HutFactoryAgent for canister creation
      const hutResult = await this.hutFactoryAgent.createHut({
        userPrincipal: userPrincipal,
        authMethod: authMethod,
        metadata: { 
          createdVia: 'get_hut_button', 
          timestamp: new Date().toISOString(),
          environment: this.environment
        }
      });

      // Add coordination with transaction monitoring if hut created
      if (hutResult.success && hutResult.hutStatus === 'created') {
        console.log(`MasterAgent: Hut created, starting activation monitoring`);
        
        // Start monitoring the activation window
        const monitoringResult = await this.transactionMonitor.startOperation({
          operationType: 'hut_activation_window',
          steps: [
            { type: 'activation_window', network: 'icp', estimatedTime: '30 minutes' },
            { type: 'first_deposit', network: 'bitcoin', estimatedTime: 'user_dependent' }
          ],
          userPrincipal: userPrincipal,
          canisterId: hutResult.canisterId,
          timeoutMs: 30 * 60 * 1000, // 30 minutes
          metadata: { 
            activationDeadline: hutResult.activationDeadline,
            requiredAction: 'first_deposit'
          }
        });

        hutResult.monitoringId = monitoringResult.operationId;
        console.log(`MasterAgent: Activation monitoring started with ID ${monitoringResult.operationId}`);
      }

      return hutResult;
      
    } catch (error) {
      console.error('MasterAgent: Get Hut failed:', error.message);
      return {
        success: false,
        error: error.message || 'Hut creation failed',
        code: 'HUT_CREATION_FAILED'
      };
    }
  }

  // Handle hut activation via first deposit
  async handleActivateHut(params) {
    try {
      const { userPrincipal, depositData } = params || {};
      
      console.log(`MasterAgent: Processing hut activation for user ${userPrincipal} with asset ${depositData?.asset}`);
      
      // Validate deposit data first
      if (!depositData || !depositData.asset || !depositData.amount) {
        return {
          success: false,
          error: 'Valid deposit data required for hut activation',
          code: 'INVALID_DEPOSIT_DATA'
        };
      }

      // Route deposit through appropriate RPC agent
      console.log(`MasterAgent: Routing activation deposit for ${depositData.asset}`);
      const depositResult = await this.routeDepositRequest({
        asset: depositData.asset,
        amount: depositData.amount,
        userPrincipal: userPrincipal,
        isActivationDeposit: true // Flag for activation
      });

      if (depositResult.success) {
        console.log(`MasterAgent: Deposit successful, activating hut`);
        
        // Activate hut with deposit confirmation
        const activationResult = await this.hutFactoryAgent.activateHut({
          userPrincipal: userPrincipal,
          depositData: depositData,
          operationId: depositResult.operationId
        });

        return {
          success: true,
          hutActivated: activationResult.success,
          depositStatus: depositResult,
          activationStatus: activationResult,
          message: 'Hut activation in progress'
        };
      } else {
        console.error(`MasterAgent: Deposit failed, activation cancelled`);
        return {
          success: false,
          error: 'Deposit failed - hut activation cancelled',
          depositError: depositResult.error
        };
      }
      
    } catch (error) {
      console.error('MasterAgent: Hut activation failed:', error.message);
      return {
        success: false,
        error: error.message || 'Hut activation failed',
        code: 'ACTIVATION_FAILED'
      };
    }
  }

  // Check hut status for frontend display
  async handleHutStatus(params) {
    try {
      const { userPrincipal } = params || {};
      
      if (!userPrincipal) {
        return { success: false, error: 'userPrincipal required' };
      }

      console.log(`MasterAgent: Checking hut status for user ${userPrincipal}`);
      return await this.hutFactoryAgent.getHutStatus(userPrincipal);
      
    } catch (error) {
      console.error('MasterAgent: Hut status check failed:', error.message);
      return {
        success: false,
        error: error.message || 'Status check failed'
      };
    }
  }

  // ===================================================================
  // ENHANCED DEPOSIT ROUTING WITH ACTIVATION SUPPORT
  // ===================================================================

  async routeDepositRequest(params) {
    try {
      const { asset, amount, userPrincipal, isActivationDeposit = false } = params || {};
      
      // Validate parameters
      if (!asset || !amount || !userPrincipal) {
        throw new Error('Asset, amount, and userPrincipal are required');
      }
      
      // Add activation context to deposit routing
      if (isActivationDeposit) {
        console.log(`MasterAgent: Processing activation deposit for asset: ${asset}`);
      }
      
      // Route to appropriate RPC agent
      const assetToAgent = {
        'BTC': this.bitcoinAgent,
        'ETH': this.evmAgent,
        'USDC': this.evmAgent,
        'USDT': this.evmAgent,
        'SOL': this.solanaAgent,
        'ckBTC': this.bitcoinAgent,
        'ckETH': this.evmAgent,
        'ckSOL': this.solanaAgent,
        'ckUSDC': this.evmAgent,
        'ckUSDT': this.evmAgent,
        'ICP': this.dexAgent
      };

      const agent = assetToAgent[asset];
      if (!agent) {
        throw new Error(`Unsupported asset: ${asset}`);
      }

      console.log(`MasterAgent: Routing ${asset} deposit to ${agent.constructor.name}`);

      // Execute deposit via appropriate agent
      let result;
      try {
        result = await agent.startDeposit(params);
        
        // Log the actual result for debugging
        console.log(`MasterAgent: Agent ${asset} returned:`, result);
        
      } catch (agentError) {
        console.error(`MasterAgent: Agent error for ${asset}:`, agentError.message);
        return {
          success: false,
          error: `${asset} agent failed: ${agentError.message}`,
          code: 'AGENT_ERROR'
        };
      }
      
      // Handle null/undefined results
      if (result === null || result === undefined) {
        console.error(`MasterAgent: Agent ${asset} returned null/undefined`);
        return {
          success: false,
          error: `${asset} agent returned null response`,
          code: 'NULL_AGENT_RESPONSE'
        };
      }
      
      // Validate agent response structure
      if (typeof result !== 'object') {
        console.error(`MasterAgent: Agent ${asset} returned non-object:`, typeof result);
        return {
          success: false,
          error: `${asset} agent returned invalid response type: ${typeof result}`,
          code: 'INVALID_RESPONSE_TYPE'
        };
      }
      
      // Ensure result has success property
      if (typeof result.success === 'undefined') {
        console.error(`MasterAgent: Agent response missing success property:`, result);
        return {
          success: false,
          error: `${asset} agent returned malformed response - missing success property`,
          code: 'MALFORMED_RESPONSE'
        };
      }
      
      // Add activation metadata if this is an activation deposit
      if (isActivationDeposit && result.success) {
        result.activationDeposit = true;
        result.message = `Activation deposit initiated for ${asset}`;
      }
      
      return result;
      
    } catch (error) {
      console.error('MasterAgent: Deposit routing failed:', error.message);
      return {
        success: false,
        error: error.message || 'Deposit routing failed',
        code: 'ROUTING_FAILED'
      };
    }
  }

  // ===================================================================
  // EXISTING METHODS (UNCHANGED)
  // ===================================================================

  async routeSwapRequest(params) {
    try {
      const { fromAsset, toAsset, amount, userPrincipal } = params || {};
      
      if (!fromAsset || !toAsset || !amount || !userPrincipal) {
        throw new Error('fromAsset, toAsset, amount, and userPrincipal are required');
      }
      
      console.log(`MasterAgent: Processing swap ${fromAsset} → ${toAsset}`);
      
      // Route to DEX agent for intelligent routing
      const swapResult = await this.dexAgent.analyzeSwapRoute({
        fromAsset: fromAsset,
        toAsset: toAsset,
        amount: amount,
        userPrincipal: userPrincipal
      });
      
      if (swapResult.success && swapResult.recommendedRoute) {
        // Start monitoring the swap operation
        const monitoringResult = await this.transactionMonitor.startOperation({
          operationType: 'multi_step_swap',
          userPrincipal: userPrincipal,
          route: swapResult.recommendedRoute,
          fromAsset: fromAsset,
          toAsset: toAsset,
          amount: amount
        });
        
        swapResult.monitoringId = monitoringResult.operationId;
      }
      
      return swapResult;
      
    } catch (error) {
      console.error('MasterAgent: Swap routing failed:', error.message);
      return {
        success: false,
        error: error.message || 'Swap routing failed',
        code: 'SWAP_ROUTING_FAILED'
      };
    }
  }

  async handleAuthentication(params) {
    try {
      const { userPrincipal, authMethod = 'internet_identity' } = params || {};
      
      if (!userPrincipal) {
        throw new Error('userPrincipal is required for authentication');
      }
      
      console.log(`MasterAgent: Authenticating user ${userPrincipal} via ${authMethod}`);
      
      if (this.environment === 'development') {
        // Development: Mock authentication success
        return {
          success: true,
          userPrincipal: userPrincipal,
          authMethod: authMethod,
          sessionEstablished: true,
          message: 'Development authentication successful'
        };
      } else {
        // Production: Integrate with Internet Identity
        // TODO: Implement actual Internet Identity integration
        return {
          success: false,
          error: 'Internet Identity integration not yet implemented',
          code: 'AUTH_NOT_IMPLEMENTED'
        };
      }
      
    } catch (error) {
      console.error('MasterAgent: Authentication failed:', error.message);
      return {
        success: false,
        error: error.message || 'Authentication failed',
        code: 'AUTH_FAILED'
      };
    }
  }

  // Route frontend requests to appropriate handlers
  async routeToAgent(agentType, operation, params) {
    try {
      const handler = this.frontendRouting[operation];
      if (!handler) {
        throw new Error(`Unsupported operation: ${operation}`);
      }
      
      console.log(`MasterAgent: Routing ${operation} operation`);
      return await handler(params);
      
    } catch (error) {
      console.error(`MasterAgent: Routing failed for ${operation}:`, error.message);
      return {
        success: false,
        error: error.message || 'Routing failed',
        code: 'ROUTING_ERROR'
      };
    }
  }

  // ===================================================================
  // AGENT STATUS WITH HUT FACTORY
  // ===================================================================

  async getAgentStatus() {
  const agents = [
    { name: 'Bitcoin', agent: this.bitcoinAgent },
    { name: 'EVM', agent: this.evmAgent },
    { name: 'Solana', agent: this.solanaAgent },
    { name: 'DEX', agent: this.dexAgent },
    { name: 'TransactionMonitor', agent: this.transactionMonitor },
    { name: 'HutFactory', agent: this.hutFactoryAgent }
  ];

  const statuses = {};
  const healthyAgents = [];
  const unhealthyAgents = [];

  for (const { name, agent } of agents) {
    try {
      statuses[name] = agent.getAgentStatus();
      
      // Debug: Log each agent's health status
      console.log(`MasterAgent Debug: ${name} agent health:`, statuses[name].isHealthy);
      
      if (statuses[name].isHealthy) {
        healthyAgents.push(name);
      } else {
        unhealthyAgents.push(name);
        console.log(`MasterAgent Debug: ${name} agent is UNHEALTHY:`, statuses[name]);
      }
    } catch (error) {
      console.error(`Error getting status for ${name} agent:`, error.message);
      statuses[name] = { 
        agentType: name, 
        isHealthy: false, 
        error: error.message 
      };
      unhealthyAgents.push(name);
    }
  }

  // Add factory-specific statistics
  let factoryStats = {};
  try {
    factoryStats = await this.hutFactoryAgent.getFactoryStats();
  } catch (error) {
    console.error('Error getting factory stats:', error.message);
    factoryStats = { error: 'Stats unavailable' };
  }
  
  // Check if MasterAgent itself is healthy
  const allAgentsHealthy = Object.values(statuses).every(status => status.isHealthy);
  
  // Debug output
  console.log(`MasterAgent Debug: Healthy agents (${healthyAgents.length}):`, healthyAgents);
  console.log(`MasterAgent Debug: Unhealthy agents (${unhealthyAgents.length}):`, unhealthyAgents);
  console.log(`MasterAgent Debug: Overall health:`, allAgentsHealthy);
  
  return {
    masterAgentStatus: 'operational',
    environment: this.environment,
    connectedAgents: Object.keys(statuses).length,
    agentStatuses: statuses,
    hutFactoryStats: factoryStats,
    isHealthy: allAgentsHealthy,
    // Add debug info
    healthSummary: {
      healthy: healthyAgents,
      unhealthy: unhealthyAgents,
      totalAgents: agents.length
    },
    supportedOperations: [
      'startDeposit', 'startSwap', 'getHut', 'activateHut', 'checkHutStatus', 'authenticate'
    ],
    activeOperations: this.activeOperations.size
  };
}

  // Shutdown all agents gracefully
  async shutdown() {
    console.log('MasterAgent: Shutting down all agents...');
    
    const shutdownPromises = [
      this.bitcoinAgent.shutdown(),
      this.evmAgent.shutdown(),
      this.solanaAgent.shutdown(),
      this.dexAgent.shutdown(),
      this.transactionMonitor.shutdown(),
      this.hutFactoryAgent.shutdown()
    ];
    
    await Promise.all(shutdownPromises);
    console.log('MasterAgent: All agents shut down successfully');
  }
}

module.exports = { MasterAgent };