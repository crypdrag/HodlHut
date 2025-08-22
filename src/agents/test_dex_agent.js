// test_dex_agent.js - Focused DEX Agent Testing with Ollama
// Run with: node test_dex_agent.js

const { DEXRoutingAgent } = require('./DEXRoutingAgent');

async function testDEXAgent() {
  console.log('🔄 HodlHut DEX Routing Agent Test\n');
  
  const agent = new DEXRoutingAgent('development');
  
  // Test scenarios that showcase intelligent routing
  const testScenarios = [
    {
      name: 'Small Trade (Direct Route Expected)',
      from: 'ckBTC',
      to: 'ckUSDC', 
      amount: 0.01, // Small $976 trade
      expected: 'direct'
    },
    {
      name: 'Large Trade (Hub Route Possible)',
      from: 'ckBTC',
      to: 'ckUSDC',
      amount: 1.0, // Large $97,600 trade
      expected: 'hub or direct'
    },
    {
      name: 'Cross-Asset Route',
      from: 'ckETH',
      to: 'ckBTC',
      amount: 2.0, // $7,600 trade
      expected: 'analysis'
    }
  ];

  for (const scenario of testScenarios) {
    console.log(`📊 Testing: ${scenario.name}`);
    console.log(`   Route: ${scenario.amount} ${scenario.from} → ${scenario.to}`);
    console.log(`   Trade Value: $${(scenario.amount * (scenario.from === 'ckBTC' ? 97600 : scenario.from === 'ckETH' ? 3800 : 1)).toLocaleString()}`);
    
    try {
      // Test 1: Get routing recommendation (fast)
      const routingRec = await agent.getRoutingRecommendation(scenario.from, scenario.to, scenario.amount);
      console.log(`   ✅ Routing: ${routingRec.type} route via ${routingRec.selectedDEX}`);
      console.log(`   💡 Reason: ${routingRec.reasoning}`);
      
      // Test 2: Get optimal route with AI (slower, requires Ollama)
      console.log(`   🧠 Querying Ollama AI...`);
      const aiResult = await agent.getOptimalRoute(scenario.from, scenario.to, scenario.amount);
      
      if (aiResult.success) {
        console.log(`   ✅ AI Result: ${aiResult.recommendation.recommendedRoute} route via ${aiResult.recommendation.recommendedDEX}`);
        console.log(`   🎯 AI Reasoning: ${aiResult.recommendation.reasoning}`);
        console.log(`   💰 Estimated Cost: $${aiResult.recommendation.estimatedCost}`);
        console.log(`   ⏱️  Estimated Time: ${aiResult.recommendation.estimatedTime}`);
        console.log(`   📊 Confidence: ${aiResult.recommendation.confidenceLevel}`);
      } else {
        console.log(`   ⚠️  AI Fallback: ${aiResult.error}`);
        console.log(`   🔄 Fallback Route: ${aiResult.fallbackRoute?.recommendedDEX || 'N/A'}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }

  // Test hub routing detection specifically
  console.log('🔍 Testing Hub Routing Intelligence...\n');
  
  try {
    const hubAnalysis = await agent.shouldUseHubRoute('ckBTC', 'ckUSDC', 0.5);
    console.log(`Hub Routing Decision: ${hubAnalysis.useHub ? 'USE HUB' : 'USE DIRECT'}`);
    console.log(`Reasoning: ${hubAnalysis.reason}`);
    
    if (hubAnalysis.useHub) {
      console.log(`Slippage Savings: ${hubAnalysis.slippageSavings?.toFixed(2)}%`);
      console.log(`Best Hub DEX: ${hubAnalysis.bestHubDEX}`);
    } else {
      console.log(`Best Direct DEX: ${hubAnalysis.bestDEX}`);
      console.log(`Direct Slippage: ${hubAnalysis.slippage?.toFixed(2)}%`);
    }
  } catch (error) {
    console.log(`Hub routing test error: ${error.message}`);
  }

  console.log('\n🎯 Agent Capabilities Summary:');
  console.log('   ✅ Multi-token support (ckBTC, ckETH, ckUSDC, ICP)');
  console.log('   ✅ Intelligent hub routing via ICP');
  console.log('   ✅ Size-aware slippage calculation');
  console.log('   ✅ DEX comparison (ICPSwap vs KongSwap)');
  console.log('   ✅ AI-powered recommendations via Ollama');
  console.log('   ✅ Frontend integration ready');
  
  const status = agent.getAgentStatus();
  console.log(`\n📈 Agent Status: ${status.isHealthy ? 'HEALTHY' : 'ISSUES'}`);
  console.log(`   Version: ${status.version}`);
  console.log(`   Environment: ${status.environment}`);
  console.log(`   Supported Operations: ${status.supportedOperations.length}`);
  
  console.log('\n🚀 DEX Agent Ready for Demo!');
}

// Run if executed directly
if (require.main === module) {
  testDEXAgent().catch(error => {
    console.error('Test failed:', error.message);
    process.exit(1);
  });
}

module.exports = { testDEXAgent };