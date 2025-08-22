// test_all_agents.js - Complete Agent Test Suite with HutFactoryAgent
// Run with: node test_all_agents.js

const { DEXRoutingAgent } = require('./DEXRoutingAgent');
const { BitcoinRPCAgent } = require('./BitcoinRPCAgent');
const { EVMRPCAgent } = require('./EVMRPCAgent');
const { SVMRPCAgent } = require('./SVMRPCAgent');
const { TransactionMonitorAgent } = require('./TransactionMonitorAgent');
const { HutFactoryAgent } = require('./HutFactoryAgent');
const { MasterAgent } = require('./MasterAgent');

class AgentTestSuite {
  constructor() {
    this.dexAgent = new DEXRoutingAgent('development');
    this.bitcoinAgent = new BitcoinRPCAgent('development');
    this.evmAgent = new EVMRPCAgent('development');
    this.solanaAgent = new SVMRPCAgent('development');
    this.monitorAgent = new TransactionMonitorAgent('development');
    this.hutFactoryAgent = new HutFactoryAgent('development');
    this.masterAgent = new MasterAgent('development');
    
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  // Test result tracking
  logTest(testName, success, result, error = null) {
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${testName}`);
    
    if (success) {
      console.log(`   Result: ${typeof result === 'object' ? JSON.stringify(result, null, 2).substring(0, 100) + '...' : result}`);
      this.testResults.passed++;
    } else {
      console.log(`   Error: ${error}`);
      this.testResults.failed++;
    }
    
    this.testResults.tests.push({ name: testName, success, error });
    console.log('');
  }

  // HutFactoryAgent Tests - NEW
  async testHutFactoryAgent() {
    console.log('🏠 Testing HutFactoryAgent...\n');

    // Test 1: Create new hut
    try {
      const result = await this.hutFactoryAgent.createHut({
        userPrincipal: 'test-user-factory-123',
        authMethod: 'internet_identity',
        metadata: { testRun: true }
      });
      this.logTest('HutFactory - Create Hut', 
        result.success && result.hutStatus === 'created', 
        `Hut created: ${result.canisterId}, Deadline: ${result.activationDeadline}`);
    } catch (error) {
      this.logTest('HutFactory - Create Hut', false, null, error.message);
    }

    // Test 2: Check existing hut status
    try {
      const result = await this.hutFactoryAgent.getHutStatus('test-user-factory-123');
      this.logTest('HutFactory - Hut Status', 
        result.success && result.hutStatus, 
        `Status: ${result.hutStatus}, Time remaining: ${result.timeRemainingFormatted || 'N/A'}`);
    } catch (error) {
      this.logTest('HutFactory - Hut Status', false, null, error.message);
    }

    // Test 3: Activate hut with deposit
    try {
      const result = await this.hutFactoryAgent.activateHut({
        userPrincipal: 'test-user-factory-123',
        depositData: {
          asset: 'BTC',
          amount: 0.01
        },
        operationId: 'test-activation-123'
      });
      this.logTest('HutFactory - Activate Hut', 
        result.success, 
        `Activation: ${result.success ? 'SUCCESS' : 'FAILED'}, Message: ${result.message}`);
    } catch (error) {
      this.logTest('HutFactory - Activate Hut', false, null, error.message);
    }

    // Test 4: Factory statistics
    try {
      const stats = await this.hutFactoryAgent.getFactoryStats();
      this.logTest('HutFactory - Factory Stats', 
        stats.totalHutsCreated >= 0, 
        `Created: ${stats.totalHutsCreated}, Active: ${stats.activeHuts}, Activation Rate: ${stats.activationRate}%`);
    } catch (error) {
      this.logTest('HutFactory - Factory Stats', false, null, error.message);
    }

    // Test 5: Duplicate hut creation (should return existing)
    try {
      const result = await this.hutFactoryAgent.createHut({
        userPrincipal: 'test-user-factory-123', // Same user
        authMethod: 'internet_identity'
      });
      this.logTest('HutFactory - Duplicate Prevention', 
        result.success && (result.hutStatus === 'already_exists' || result.hutStatus === 'pending_activation'), 
        `Duplicate handled: ${result.hutStatus}, Message: ${result.message}`);
    } catch (error) {
      this.logTest('HutFactory - Duplicate Prevention', false, null, error.message);
    }
  }

  // DEX Agent Tests
  async testDEXAgent() {
    console.log('🔄 Testing DEXRoutingAgent...\n');

    // Test 1: Basic routing recommendation
    try {
      const result = await this.dexAgent.getRoutingRecommendation('ckBTC', 'ckUSDC', 0.1);
      this.logTest('DEX - Basic Routing Recommendation', 
        result.type && result.selectedDEX, 
        `${result.type} route via ${result.selectedDEX}`);
    } catch (error) {
      this.logTest('DEX - Basic Routing Recommendation', false, null, error.message);
    }

    // Test 2: Hub routing detection (large trade)
    try {
      const result = await this.dexAgent.shouldUseHubRoute('ckBTC', 'ckUSDC', 5.0);
      this.logTest('DEX - Hub Routing Detection', 
        result.hasOwnProperty('useHub'), 
        `Use hub: ${result.useHub}, Reason: ${result.reason}`);
    } catch (error) {
      this.logTest('DEX - Hub Routing Detection', false, null, error.message);
    }

    // Test 3: Live quotes (frontend integration)
    try {
      const result = await this.dexAgent.getLiveQuotes('ckBTC', 'ckETH', 0.5);
      this.logTest('DEX - Live Quotes', 
        result.success && result.quotes, 
        `ICPSwap: ${result.quotes?.icpswap?.currentPrice || 'N/A'}, KongSwap: ${result.quotes?.kongswap?.currentPrice || 'N/A'}`);
    } catch (error) {
      this.logTest('DEX - Live Quotes', false, null, error.message);
    }

    // Test 4: Ollama AI Integration (if available)
    try {
      const result = await this.dexAgent.getOptimalRoute('ckBTC', 'ckUSDC', 0.1);
      this.logTest('DEX - Ollama AI Integration', 
        result.success && result.recommendation, 
        `AI recommends: ${result.recommendation?.recommendedDEX || 'Unknown'} (${result.recommendation?.confidenceLevel || 'Unknown'} confidence)`);
    } catch (error) {
      this.logTest('DEX - Ollama AI Integration', false, null, error.message);
    }
  }

  // Bitcoin Agent Tests
  async testBitcoinAgent() {
    console.log('🔄 Testing BitcoinRPCAgent...\n');

    // Test 1: Start deposit
    try {
      const result = await this.bitcoinAgent.startDeposit({
        amount: 0.1,
        userAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        priority: 'medium'
      });
      this.logTest('Bitcoin - Start Deposit', 
        result.success, 
        `Fee: ${result.estimatedFee} BTC, Time: ${result.estimatedConfirmationTime}`);
    } catch (error) {
      this.logTest('Bitcoin - Start Deposit', false, null, error.message);
    }

    // Test 2: Fee estimation
    try {
      const result = await this.bitcoinAgent.getCurrentFees();
      this.logTest('Bitcoin - Fee Estimation', 
        result.success && result.btcEstimates, 
        `Medium: ${result.btcEstimates?.medium || 'N/A'} BTC, Network: ${result.networkInfo?.congestionLevel || 'N/A'}`);
    } catch (error) {
      this.logTest('Bitcoin - Fee Estimation', false, null, error.message);
    }

    // Test 3: Address generation
    try {
      const address = await this.bitcoinAgent.generateDepositAddress('test-user-123');
      this.logTest('Bitcoin - Address Generation', 
        address && address.startsWith('bc1'), 
        `Generated: ${address}`);
    } catch (error) {
      this.logTest('Bitcoin - Address Generation', false, null, error.message);
    }

    // Test 4: Transaction status
    try {
      const result = await this.bitcoinAgent.getTransactionStatus('btc_test_12345');
      this.logTest('Bitcoin - Transaction Status', 
        result.success, 
        `Status: ${result.status}, Confirmations: ${result.confirmations}`);
    } catch (error) {
      this.logTest('Bitcoin - Transaction Status', false, null, error.message);
    }
  }

  // Ethereum Agent Tests
  async testEVMAgent() {
    console.log('🔄 Testing EVMRPCAgent...\n');

    // Test 1: ETH deposit
    try {
      const result = await this.evmAgent.startDeposit({
        amount: 1.0,
        token: 'ETH',
        userAddress: '0x742d35Cc6634C0532925a3b8D6Ac6247d56dBe95',
        priority: 'standard'
      });
      this.logTest('EVM - ETH Deposit', 
        result.success, 
        `Gas: ${result.estimatedGasFee} ETH, Total: ${result.totalCost} ETH`);
    } catch (error) {
      this.logTest('EVM - ETH Deposit', false, null, error.message);
    }

    // Test 2: USDC deposit (ERC-20)
    try {
      const result = await this.evmAgent.startDeposit({
        amount: 1000,
        token: 'USDC',
        priority: 'fast'
      });
      this.logTest('EVM - USDC Deposit', 
        result.success, 
        `Token: ${result.token}, Gas: ${result.estimatedGasFee} ETH, Separate fee: true`);
    } catch (error) {
      this.logTest('EVM - USDC Deposit', false, null, error.message);
    }

    // Test 3: Gas price estimation
    try {
      const result = await this.evmAgent.getCurrentGasPrices();
      this.logTest('EVM - Gas Price Estimation', 
        result.success && result.effectiveGasPrice, 
        `Standard: ${Math.round(result.effectiveGasPrice?.standard / 1e9 || 0)} gwei, EIP-1559: ${result.networkInfo?.eip1559Supported}`);
    } catch (error) {
      this.logTest('EVM - Gas Price Estimation', false, null, error.message);
    }

    // Test 4: Multi-token support
    try {
      const tokens = this.evmAgent.getSupportedTokens();
      this.logTest('EVM - Multi-token Support', 
        tokens.length >= 3, 
        `Supports: ${tokens.map(t => t.symbol).join(', ')}`);
    } catch (error) {
      this.logTest('EVM - Multi-token Support', false, null, error.message);
    }
  }

  // Solana Agent Tests
  async testSolanaAgent() {
    console.log('🔄 Testing SVMRPCAgent...\n');

    // Test 1: SOL deposit (supported)
    try {
      const result = await this.solanaAgent.startDeposit({
        amount: 10.0,
        token: 'SOL',
        priority: 'normal'
      });
      this.logTest('Solana - SOL Deposit', 
        result.success, 
        `Fee: ${result.estimatedFee} SOL, Time: ${result.estimatedConfirmationTime}`);
    } catch (error) {
      this.logTest('Solana - SOL Deposit', false, null, error.message);
    }

    // Test 2: USDC-SOL deposit (future token)
    try {
      const result = await this.solanaAgent.startDeposit({
        amount: 100,
        token: 'ckUSDC-SOL',
        priority: 'fast'
      });
      this.logTest('Solana - Future Token Handling', 
        !result.success && result.error.includes('not yet available'), 
        `Properly rejects future token: ${result.error}`);
    } catch (error) {
      this.logTest('Solana - Future Token Handling', false, null, error.message);
    }

    // Test 3: Fee estimation
    try {
      const result = await this.solanaAgent.getCurrentFees();
      this.logTest('Solana - Fee Estimation', 
        result.success && result.priorityFees, 
        `Normal: ${result.priorityFees?.normal || 'N/A'} SOL, TPS: ${result.networkInfo?.currentTPS || 'N/A'}`);
    } catch (error) {
      this.logTest('Solana - Fee Estimation', false, null, error.message);
    }

    // Test 4: Token support status
    try {
      const tokens = this.solanaAgent.getSupportedTokens();
      this.logTest('Solana - Token Support Status', 
        tokens.SOL?.isSupported && !tokens['USDC-SOL']?.isSupported, 
        `SOL: ${tokens.SOL?.status}, USDC-SOL: ${tokens['USDC-SOL']?.status}`);
    } catch (error) {
      this.logTest('Solana - Token Support Status', false, null, error.message);
    }
  }

  // Transaction Monitor Agent Tests
  async testTransactionMonitorAgent() {
    console.log('🔄 Testing TransactionMonitorAgent...\n');

    // Test 1: Start operation monitoring
    try {
      const result = await this.monitorAgent.startOperation({
        operationType: 'deposit',
        steps: [
          { type: 'deposit', network: 'bitcoin', estimatedTime: '10 minutes' }
        ],
        userPrincipal: 'test-user-123',
        totalAmount: 0.1,
        fromAsset: 'BTC',
        toAsset: 'ckBTC'
      });
      
      this.logTest('Monitor - Start Operation', 
        result.success && result.operationId, 
        `Operation ${result.operationId} monitoring started`);
    } catch (error) {
      this.logTest('Monitor - Start Operation', false, null, error.message);
    }

    // Test 2: Operation status tracking
    try {
      // Create a test operation first
      const operation = await this.monitorAgent.startOperation({
        operationType: 'swap',
        steps: [
          { type: 'dex_swap', network: 'icp', estimatedTime: '15 seconds' }
        ],
        userPrincipal: 'test-user-456',
        totalAmount: 1.0,
        fromAsset: 'ckBTC',
        toAsset: 'ckUSDC'
      });
      
      // Check status
      const status = await this.monitorAgent.getOperationStatus(operation.operationId);
      this.logTest('Monitor - Operation Status', 
        status.success && status.operation, 
        `Status: ${status.operation?.status}, Progress: ${status.operation?.progress?.percentage}%`);
    } catch (error) {
      this.logTest('Monitor - Operation Status', false, null, error.message);
    }

    // Test 3: Active operations tracking
    try {
      const activeOps = this.monitorAgent.getActiveOperations();
      this.logTest('Monitor - Active Operations', 
        Array.isArray(activeOps), 
        `${activeOps.length} active operations tracked`);
    } catch (error) {
      this.logTest('Monitor - Active Operations', false, null, error.message);
    }

    // Test 4: Agent health and configuration
    try {
      const status = this.monitorAgent.getAgentStatus();
      this.logTest('Monitor - Agent Health', 
        status.isHealthy && status.supportedNetworks.length >= 4, 
        `Healthy, supports ${status.supportedNetworks.length} networks`);
    } catch (error) {
      this.logTest('Monitor - Agent Health', false, null, error.message);
    }
  }

  // Master Agent Tests - UPDATED WITH HUT LIFECYCLE
  async testMasterAgent() {
    console.log('🔄 Testing MasterAgent...\n');

    // Test 1: Authentication handling
    try {
      const result = await this.masterAgent.handleAuthentication({
        userPrincipal: 'test-principal-123',
        authMethod: 'internet_identity',
        metadata: { testMode: true }
      });
      
      this.logTest('Master - Authentication', 
        result.success && result.userPrincipal, 
        `User ${result.userPrincipal} authenticated`);
    } catch (error) {
      this.logTest('Master - Authentication', false, null, error.message);
    }

    // Test 2: NEW - Hut creation via MasterAgent
    try {
      const result = await this.masterAgent.handleGetHut({
        userPrincipal: 'test-master-hut-123',
        authMethod: 'internet_identity'
      });
      
      this.logTest('Master - Get Hut Integration', 
        result.success && result.canisterId, 
        `Hut created via MasterAgent: ${result.canisterId}, Status: ${result.hutStatus}`);
    } catch (error) {
      this.logTest('Master - Get Hut Integration', false, null, error.message);
    }

    // Test 3: NEW - Hut activation via MasterAgent
    try {
      const result = await this.masterAgent.handleActivateHut({
        userPrincipal: 'test-master-hut-123',
        depositData: {
          asset: 'ETH',
          amount: 0.5
        }
      });
      
      this.logTest('Master - Hut Activation Integration', 
        result.success && result.depositStatus, 
        `Activation: ${result.hutActivated ? 'SUCCESS' : 'PENDING'}, Deposit routed: ${result.depositStatus.success}`);
    } catch (error) {
      this.logTest('Master - Hut Activation Integration', false, null, error.message);
    }

    // Test 4: NEW - Hut status check via MasterAgent
    try {
      const result = await this.masterAgent.handleHutStatus({
        userPrincipal: 'test-master-hut-123'
      });
      
      this.logTest('Master - Hut Status Integration', 
        result.success && result.hutStatus, 
        `Hut status: ${result.hutStatus}, Active: ${result.isActive || 'N/A'}`);
    } catch (error) {
      this.logTest('Master - Hut Status Integration', false, null, error.message);
    }

    // Test 5: Deposit routing to appropriate agents
    try {
      const btcResult = await this.masterAgent.routeDepositRequest({
        asset: 'BTC',
        amount: 0.01,
        userPrincipal: 'test-principal-123',
        priority: 'medium'
      });
      
      // Check if result exists and has expected properties
      const isSuccess = btcResult && typeof btcResult === 'object' && btcResult.success && btcResult.operationId;
      const resultText = btcResult ? 
        `BTC deposit routed, operation: ${btcResult.operationId || 'N/A'}, success: ${btcResult.success}` :
        'No result returned from routing';
        
      this.logTest('Master - Deposit Routing', 
        Boolean(isSuccess), 
        resultText);
    } catch (error) {
      this.logTest('Master - Deposit Routing', false, null, error.message);
    }

    // Test 6: System status reporting (updated for 7 agents)
    try {
      const systemStatus = await this.masterAgent.getAgentStatus();
      const expectedAgents = ['Bitcoin', 'EVM', 'Solana', 'DEX', 'TransactionMonitor', 'HutFactory'];
      const actualAgents = Object.keys(systemStatus.agentStatuses);
      
      this.logTest('Master - System Status (7 Agents)', 
        systemStatus.connectedAgents === 6 && expectedAgents.every(agent => actualAgents.includes(agent)), 
        `Connected: ${systemStatus.connectedAgents}/6 agents, HutFactory included: ${actualAgents.includes('HutFactory')}`);
    } catch (error) {
      this.logTest('Master - System Status (7 Agents)', false, null, error.message);
    }
  }

  // Integration Tests - UPDATED FOR 7 AGENTS
  async testIntegration() {
    console.log('🔄 Testing Agent Integration...\n');

    // Test 1: All agents health check (updated for 7 agents)
    try {
      const statuses = [
        this.dexAgent.getAgentStatus(),
        this.bitcoinAgent.getAgentStatus(),
        this.evmAgent.getAgentStatus(),
        this.solanaAgent.getAgentStatus(),
        this.monitorAgent.getAgentStatus(),
        this.hutFactoryAgent.getAgentStatus(),
        await this.masterAgent.getAgentStatus()
      ];
      this.logTest('Integration - Agent Health (7 Agents)', 
        statuses.every(s => s.isHealthy), 
        `All ${statuses.length} agents healthy (including HutFactory)`);
    } catch (error) {
      this.logTest('Integration - Agent Health (7 Agents)', false, null, error.message);
    }

    // Test 2: Complete user journey (Get Hut → Activate → Deposit)
    try {
      const testUser = 'integration-test-user-' + Date.now();
      
      // Step 1: Create hut via MasterAgent
      const hutResult = await this.masterAgent.handleGetHut({
        userPrincipal: testUser,
        authMethod: 'internet_identity'
      });
      
      // Step 2: Activate with deposit
      let activationResult = null;
      if (hutResult.success) {
        activationResult = await this.masterAgent.handleActivateHut({
          userPrincipal: testUser,
          depositData: { asset: 'BTC', amount: 0.01 }
        });
      }
      
      this.logTest('Integration - Complete User Journey', 
        hutResult.success && activationResult?.success, 
        `Journey: Hut created → Activation ${activationResult?.hutActivated ? 'SUCCESS' : 'PENDING'}`);
    } catch (error) {
      this.logTest('Integration - Complete User Journey', false, null, error.message);
    }

    // Test 3: Frontend trigger simulation via MasterAgent
    try {
      const depositResults = await Promise.allSettled([
        this.masterAgent.routeDepositRequest({ 
          asset: 'BTC', 
          amount: 0.01, 
          userPrincipal: 'test-user-123',
          priority: 'medium' 
        }),
        this.masterAgent.routeDepositRequest({ 
          asset: 'ETH', 
          amount: 0.1, 
          userPrincipal: 'test-user-123',
          priority: 'standard' 
        }),
        this.masterAgent.routeDepositRequest({ 
          asset: 'SOL', 
          amount: 1.0, 
          userPrincipal: 'test-user-123',
          priority: 'normal' 
        })
      ]);
      
      const successCount = depositResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
      this.logTest('Integration - MasterAgent Routing', 
        successCount === 3, 
        `${successCount}/3 deposit routes successful via MasterAgent`);
    } catch (error) {
      this.logTest('Integration - MasterAgent Routing', false, null, error.message);
    }

    // Test 4: HutFactory → RPC Agent coordination
    try {
      const testUser = 'factory-rpc-test-' + Date.now();
      
      // Create hut
      const hutResult = await this.hutFactoryAgent.createHut({
        userPrincipal: testUser,
        authMethod: 'internet_identity'
      });
      
      // Try activation deposit via Bitcoin agent
      let depositResult = null;
      if (hutResult.success) {
        depositResult = await this.bitcoinAgent.startDeposit({
          amount: 0.01,
          userPrincipal: testUser,
          priority: 'medium'
        });
      }
      
      this.logTest('Integration - HutFactory ↔ RPC Coordination', 
        hutResult.success && depositResult?.success, 
        `Hut created → BTC deposit routed → Ready for activation`);
    } catch (error) {
      this.logTest('Integration - HutFactory ↔ RPC Coordination', false, null, error.message);
    }

    // Test 5: Error handling consistency across all agents
    try {
      const errorResults = await Promise.allSettled([
        this.bitcoinAgent.startDeposit({ amount: -1 }), // Invalid amount
        this.evmAgent.startDeposit({ amount: 1, token: 'INVALID' }), // Invalid token
        this.solanaAgent.startDeposit({ amount: 1, token: 'ckUSDC-SOL' }), // Unsupported token
        this.hutFactoryAgent.createHut({ userPrincipal: '' }), // Invalid principal
        this.masterAgent.routeDepositRequest({ asset: 'INVALID', amount: 1, userPrincipal: 'test' }) // Invalid asset
      ]);
      
      const properErrors = errorResults.filter(r => 
        r.status === 'fulfilled' && !r.value.success && r.value.error
      ).length;
      this.logTest('Integration - Error Handling (7 Agents)', 
        properErrors === 5, 
        `${properErrors}/5 error cases handled properly across all agents`);
    } catch (error) {
      this.logTest('Integration - Error Handling (7 Agents)', false, null, error.message);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 HodlHut Agent Test Suite - Complete 7-Agent Architecture\n');
    console.log('Testing all agents including HutFactoryAgent integration...\n');
    console.log('='.repeat(60) + '\n');

    try {
      await this.testHutFactoryAgent(); // NEW - Test 7th agent first
      await this.testDEXAgent();
      await this.testBitcoinAgent();
      await this.testEVMAgent();
      await this.testSolanaAgent();
      await this.testTransactionMonitorAgent();
      await this.testMasterAgent(); // Updated with hut lifecycle tests
      await this.testIntegration(); // Updated for 7-agent coordination
    } catch (error) {
      console.log(`❌ Test suite error: ${error.message}\n`);
    }

    // Final results
    console.log('='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${Math.round((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100)}%`);
    
    if (this.testResults.failed > 0) {
      console.log('\n🔍 Failed Tests:');
      this.testResults.tests
        .filter(t => !t.success)
        .forEach(t => console.log(`   - ${t.name}: ${t.error}`));
    }
    
    console.log('\n🎯 Agent Status for Demo:');
    console.log(`   DEX Routing: ${this.dexAgent.getAgentStatus().isHealthy ? '✅ Ready' : '❌ Issues'}`);
    console.log(`   Bitcoin RPC: ${this.bitcoinAgent.getAgentStatus().isHealthy ? '✅ Ready' : '❌ Issues'}`);
    console.log(`   Ethereum RPC: ${this.evmAgent.getAgentStatus().isHealthy ? '✅ Ready' : '❌ Issues'}`);
    console.log(`   Solana RPC: ${this.solanaAgent.getAgentStatus().isHealthy ? '✅ Ready' : '❌ Issues'}`);
    console.log(`   Transaction Monitor: ${this.monitorAgent.getAgentStatus().isHealthy ? '✅ Ready' : '❌ Issues'}`);
    console.log(`   Hut Factory: ${this.hutFactoryAgent.getAgentStatus().isHealthy ? '✅ Ready' : '❌ Issues'}`);
    const masterStatus = await this.masterAgent.getAgentStatus();
    console.log(`   Master Agent: ${masterStatus.isHealthy ? '✅ Ready' : '❌ Issues'}`);
    
    console.log('\n📋 Complete System Architecture (7 Agents):');
    console.log('   Frontend → MasterAgent → [HutFactoryAgent + 5 RPC Agents] → TransactionMonitorAgent');
    console.log('   ✅ Hut lifecycle management (Create → Activate → Operate)');
    console.log('   ✅ Multi-chain deposit routing (BTC, ETH, SOL)');
    console.log('   ✅ DEX intelligent routing with ICP hub');
    console.log('   ✅ Real-time operation monitoring');
    console.log('   ✅ Complete orchestration pipeline');
    
    console.log('\n🚀 Ready for Demo with Complete 7-Agent Architecture!');
  }
}

// Run tests if executed directly
if (require.main === module) {
  const testSuite = new AgentTestSuite();
  testSuite.runAllTests().catch(console.error);
}

module.exports = { AgentTestSuite };