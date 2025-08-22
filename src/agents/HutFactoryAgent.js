// HutFactoryAgent.js - Sovereign Canister Lifecycle Management Agent
const axios = require('axios');

class HutFactoryAgent {
  constructor(environment = 'development') {
    this.environment = environment;
    this.activationTimeoutMs = 30 * 60 * 1000; // 30 minutes
    this.pendingHuts = new Map(); // userPrincipal -> hut creation data
    this.activeHuts = new Map(); // userPrincipal -> activated hut data
    this.cleanupInterval = 60000; // Check every minute for expired huts
    
    this.initializeFactoryMonitoring();
  }

  // Initialize background monitoring for hut lifecycle
  initializeFactoryMonitoring() {
    this.monitoringActive = true;
    this.startCleanupLoop();
  }

  // ===================================================================
  // HUT CREATION AND LIFECYCLE MANAGEMENT
  // ===================================================================

  // Create new sovereign hut canister for user
  async createHut(creationParams) {
    try {
      const { 
        userPrincipal, 
        authMethod = 'internet_identity',
        metadata = {},
        securityOptions = {}
      } = creationParams || {};

      // Validate required parameters
      if (!userPrincipal) {
        throw new Error('userPrincipal is required for hut creation');
      }

      // Check if user already has an active hut
      if (this.activeHuts.has(userPrincipal)) {
        const existingHut = this.activeHuts.get(userPrincipal);
        return {
          success: true,
          hutStatus: 'already_exists',
          canisterId: existingHut.canisterId,
          activatedAt: existingHut.activatedAt,
          message: 'User already has an active sovereign hut'
        };
      }

      // Check if user has a pending hut creation
      if (this.pendingHuts.has(userPrincipal)) {
        const pendingHut = this.pendingHuts.get(userPrincipal);
        const timeRemaining = this.getTimeRemaining(pendingHut.createdAt);
        
        if (timeRemaining > 0) {
          return {
            success: true,
            hutStatus: 'pending_activation',
            canisterId: pendingHut.canisterId,
            timeRemaining: timeRemaining,
            timeRemainingFormatted: this.formatTimeRemaining(timeRemaining),
            message: 'Hut already created, awaiting activation deposit'
          };
        } else {
          // Expired hut, clean it up and create new one
          await this.dissolveExpiredHut(userPrincipal);
        }
      }

      // Create new hut canister
      const hutCreationResult = await this.createHutCanister(userPrincipal, metadata, securityOptions);
      
      if (hutCreationResult.success) {
        // Track pending hut with 30-minute timeout
        const hutData = {
          canisterId: hutCreationResult.canisterId,
          userPrincipal: userPrincipal,
          createdAt: new Date().toISOString(),
          status: 'pending_activation',
          authMethod: authMethod,
          metadata: metadata,
          securityOptions: securityOptions,
          activationDeadline: new Date(Date.now() + this.activationTimeoutMs).toISOString()
        };
        
        this.pendingHuts.set(userPrincipal, hutData);
        
        return {
          success: true,
          hutStatus: 'created',
          canisterId: hutCreationResult.canisterId,
          activationDeadline: hutData.activationDeadline,
          timeRemaining: this.activationTimeoutMs,
          timeRemainingFormatted: '30 minutes',
          activationInstructions: {
            requirement: 'Make any deposit to activate your sovereign hut',
            supportedAssets: ['BTC', 'ETH', 'USDC', 'USDT', 'SOL', 'ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT', 'ckSOL', 'ICP'],
            minimumAmounts: {
              'BTC': '0.0001 BTC',
              'ETH': '0.001 ETH',
              'SOL': '0.01 SOL',
              'USDC': '1 USDC',
              'USDT': '1 USDT',
              'ICP': '0.1 ICP'
            }
          },
          message: 'Sovereign hut created successfully. Make a deposit within 30 minutes to activate.'
        };
      } else {
        return hutCreationResult; // Return creation error
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Hut creation failed',
        code: 'HUT_CREATION_FAILED'
      };
    }
  }

  // Handle deposit activation of pending hut
  async activateHut(activationParams) {
    try {
      const { 
        userPrincipal, 
        depositData,
        operationId 
      } = activationParams || {};

      // Validate parameters
      if (!userPrincipal) {
        throw new Error('userPrincipal is required for activation');
      }

      if (!depositData || !depositData.asset || !depositData.amount) {
        throw new Error('Valid deposit data is required for activation');
      }

      // Check if user has a pending hut
      const pendingHut = this.pendingHuts.get(userPrincipal);
      if (!pendingHut) {
        return {
          success: false,
          error: 'No pending hut found for user',
          code: 'NO_PENDING_HUT'
        };
      }

      // Check if hut has expired
      const timeRemaining = this.getTimeRemaining(pendingHut.createdAt);
      if (timeRemaining <= 0) {
        await this.dissolveExpiredHut(userPrincipal);
        return {
          success: false,
          error: 'Hut activation window expired. Please create a new hut.',
          code: 'ACTIVATION_EXPIRED'
        };
      }

      // Validate deposit meets minimum requirements
      const validationResult = this.validateActivationDeposit(depositData);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.error,
          code: 'INVALID_ACTIVATION_DEPOSIT'
        };
      }

      // Activate the hut
      const activationResult = await this.executeHutActivation(pendingHut, depositData, operationId);
      
      if (activationResult.success) {
        // Move from pending to active
        const activatedHut = {
          ...pendingHut,
          status: 'active',
          activatedAt: new Date().toISOString(),
          activationDeposit: depositData,
          firstOperationId: operationId
        };
        
        this.activeHuts.set(userPrincipal, activatedHut);
        this.pendingHuts.delete(userPrincipal);
        
        return {
          success: true,
          hutStatus: 'activated',
          canisterId: activatedHut.canisterId,
          activatedAt: activatedHut.activatedAt,
          activationDeposit: depositData,
          message: 'Sovereign hut activated successfully! All DeFi operations are now enabled.'
        };
      } else {
        return activationResult; // Return activation error
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Hut activation failed',
        code: 'ACTIVATION_FAILED'
      };
    }
  }

  // Get hut status for user
  async getHutStatus(userPrincipal) {
    try {
      if (!userPrincipal) {
        throw new Error('userPrincipal is required for status check');
      }

      // Check active huts first
      if (this.activeHuts.has(userPrincipal)) {
        const activeHut = this.activeHuts.get(userPrincipal);
        return {
          success: true,
          hutStatus: 'active',
          canisterId: activeHut.canisterId,
          activatedAt: activeHut.activatedAt,
          activationDeposit: activeHut.activationDeposit,
          isActive: true,
          message: 'Sovereign hut is active and operational'
        };
      }

      // Check pending huts
      if (this.pendingHuts.has(userPrincipal)) {
        const pendingHut = this.pendingHuts.get(userPrincipal);
        const timeRemaining = this.getTimeRemaining(pendingHut.createdAt);
        
        if (timeRemaining > 0) {
          return {
            success: true,
            hutStatus: 'pending_activation',
            canisterId: pendingHut.canisterId,
            createdAt: pendingHut.createdAt,
            activationDeadline: pendingHut.activationDeadline,
            timeRemaining: timeRemaining,
            timeRemainingFormatted: this.formatTimeRemaining(timeRemaining),
            isActive: false,
            message: 'Hut created, awaiting activation deposit'
          };
        } else {
          // Expired hut
          await this.dissolveExpiredHut(userPrincipal);
          return {
            success: true,
            hutStatus: 'expired',
            isActive: false,
            message: 'Hut activation window expired. Please create a new hut to continue.'
          };
        }
      }

      // No hut found
      return {
        success: true,
        hutStatus: 'none',
        isActive: false,
        message: 'No hut found. Create your first sovereign hut to get started.'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Status check failed',
        code: 'STATUS_CHECK_FAILED'
      };
    }
  }

  // Dissolve expired hut canister
  async dissolveExpiredHut(userPrincipal) {
    try {
      const pendingHut = this.pendingHuts.get(userPrincipal);
      if (!pendingHut) return;

      if (this.environment === 'mainnet') {
        // MAINNET INTEGRATION NOTES:
        // - Call canister dissolution method
        // - Method: await hutFactoryCanister.dissolveHut(canisterId)
        // - Reclaim cycles back to factory
        // - Clean up any allocated resources
        // - Log dissolution event
        await this.dissolveMainnetHut(pendingHut.canisterId);
      }
      
      // Remove from pending huts
      this.pendingHuts.delete(userPrincipal);
      
      console.log(`Dissolved expired hut for user ${userPrincipal}: ${pendingHut.canisterId}`);
      
    } catch (error) {
      console.error(`Failed to dissolve hut for ${userPrincipal}:`, error.message);
    }
  }

  // ===================================================================
  // CANISTER LIFECYCLE MANAGEMENT
  // ===================================================================

  // Create hut canister (integrates with ICP infrastructure)
  async createHutCanister(userPrincipal, metadata, securityOptions) {
    try {
      if (this.environment === 'mainnet') {
        // MAINNET INTEGRATION NOTES:
        // - Call HutFactory canister to create individual user canister
        // - Method: await hutFactoryCanister.createUserHut(userPrincipal, config)
        // - Configure canister with user's Internet Identity principal
        // - Set up threshold cryptography access for user
        // - Initialize canister with default token support
        return await this.createMainnetHutCanister(userPrincipal, metadata, securityOptions);
      }
      
      // LOCAL: Generate mock canister data
      const canisterId = this.generateMockCanisterId(userPrincipal);
      
      return {
        success: true,
        canisterId: canisterId,
        network: 'local',
        cyclesUsed: 1000000, // Mock cycles
        message: 'Mock hut canister created for development'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Canister creation failed',
        code: 'CANISTER_CREATION_FAILED'
      };
    }
  }

  // Execute hut activation (integrates with canister initialization)
  async executeHutActivation(hutData, depositData, operationId) {
    try {
      if (this.environment === 'mainnet') {
        // MAINNET INTEGRATION NOTES:
        // - Initialize user's hut canister with first deposit
        // - Method: await userHutCanister.initialize(depositData)
        // - Set canister status to active
        // - Configure user permissions and access controls
        // - Enable all DeFi operations
        return await this.activateMainnetHut(hutData, depositData, operationId);
      }
      
      // LOCAL: Mock activation process
      return {
        success: true,
        canisterId: hutData.canisterId,
        initializationTx: operationId || 'mock_init_' + Date.now(),
        message: 'Mock hut activation completed'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Hut activation failed',
        code: 'ACTIVATION_FAILED'
      };
    }
  }

  // ===================================================================
  // VALIDATION AND UTILITY METHODS
  // ===================================================================

  // Validate activation deposit meets requirements
  validateActivationDeposit(depositData) {
    const { asset, amount } = depositData;
    
    // Minimum deposit amounts for activation
    const minimumAmounts = {
      'BTC': 0.0001,
      'ETH': 0.001,
      'SOL': 0.01,
      'USDC': 1.0,
      'USDT': 1.0,
      'ICP': 0.1,
      'ckBTC': 0.0001,
      'ckETH': 0.001,
      'ckSOL': 0.01,
      'ckUSDC': 1.0,
      'ckUSDT': 1.0
    };

    if (!minimumAmounts[asset]) {
      return {
        isValid: false,
        error: `Unsupported asset for activation: ${asset}`
      };
    }

    if (amount < minimumAmounts[asset]) {
      return {
        isValid: false,
        error: `Minimum ${minimumAmounts[asset]} ${asset} required for activation`
      };
    }

    return { isValid: true };
  }

  // Calculate time remaining for hut activation
  getTimeRemaining(createdAt) {
    const createdTime = new Date(createdAt).getTime();
    const expirationTime = createdTime + this.activationTimeoutMs;
    const currentTime = Date.now();
    
    return Math.max(0, expirationTime - currentTime);
  }

  // Format time remaining in human-readable format
  formatTimeRemaining(timeMs) {
    const minutes = Math.floor(timeMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0 && remainingMinutes > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  }

  // Generate mock canister ID for development
  generateMockCanisterId(userPrincipal) {
    const hash = this.simpleHash(userPrincipal + Date.now());
    return `hut_${hash.substring(0, 8)}_cai`; // Mock canister ID format
  }

  // Simple hash function for deterministic mock data
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // ===================================================================
  // BACKGROUND MONITORING AND CLEANUP
  // ===================================================================

  // Background cleanup loop for expired huts
  async startCleanupLoop() {
    while (this.monitoringActive) {
      try {
        await this.processExpiredHuts();
        await this.sleep(this.cleanupInterval);
      } catch (error) {
        console.warn('HutFactory cleanup loop error:', error.message);
        await this.sleep(this.cleanupInterval);
      }
    }
  }

  // Process expired huts
  async processExpiredHuts() {
    const expiredUsers = [];
    
    for (const [userPrincipal, hutData] of this.pendingHuts.entries()) {
      const timeRemaining = this.getTimeRemaining(hutData.createdAt);
      if (timeRemaining <= 0) {
        expiredUsers.push(userPrincipal);
      }
    }
    
    // Dissolve expired huts
    for (const userPrincipal of expiredUsers) {
      await this.dissolveExpiredHut(userPrincipal);
    }
    
    if (expiredUsers.length > 0) {
      console.log(`Cleaned up ${expiredUsers.length} expired hut(s)`);
    }
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Stop monitoring
  stopMonitoring() {
    this.monitoringActive = false;
  }

  // ===================================================================
  // STATISTICS AND STATUS
  // ===================================================================

  // Get factory statistics
  async getFactoryStats() {
    return {
      pendingHuts: this.pendingHuts.size,
      activeHuts: this.activeHuts.size,
      totalHutsCreated: this.pendingHuts.size + this.activeHuts.size,
      activationRate: this.activeHuts.size > 0 ? 
        Math.round((this.activeHuts.size / (this.pendingHuts.size + this.activeHuts.size)) * 100) : 0
    };
  }

  // Get agent status
  getAgentStatus() {
    return {
      agentType: 'HutFactoryAgent',
      environment: this.environment,
      isHealthy: this.monitoringActive,
      version: '1.0.0',
      statistics: this.getFactoryStats(),
      supportedOperations: [
        'createHut',
        'activateHut',
        'getHutStatus',
        'getFactoryStats'
      ],
      features: [
        '30-minute activation window',
        'Automatic hut dissolution',
        'Multi-asset activation support',
        'Sovereign canister lifecycle management',
        'Background cleanup monitoring'
      ],
      configuration: {
        activationTimeoutMs: this.activationTimeoutMs,
        cleanupInterval: this.cleanupInterval,
        supportedAssets: ['BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'ICP', 'ckBTC', 'ckETH', 'ckSOL', 'ckUSDC', 'ckUSDT']
      },
      notes: [
        'Manages sovereign canister creation and lifecycle',
        'Enforces 30-minute activation requirement',
        'Integrates with all RPC agents for deposit validation',
        'Ready for HutFactory canister integration'
      ]
    };
  }

  // Shutdown gracefully
  async shutdown() {
    this.stopMonitoring();
    
    // Process any remaining expired huts
    await this.processExpiredHuts();
    
    console.log('HutFactoryAgent shutdown complete');
  }
}

module.exports = { HutFactoryAgent };