// Agent Initialization Service
// Registers all DEX adapters with the routing agent for testing

import { dexRoutingAgent } from './DEXRoutingAgent';
import { ICPSwapAgent } from './ICPSwapAgent';
import { KongSwapAgent } from './KongSwapAgent';
import { ICDEXAgent } from './ICDEXAgent';
import { RouteInput } from '../types/dex';

class AgentInitializer {
  private isInitialized = false;
  private agents: {
    icpswap: ICPSwapAgent;
    kongswap: KongSwapAgent;
    icdex: ICDEXAgent;
  };

  constructor() {
    this.agents = {
      icpswap: new ICPSwapAgent(),
      kongswap: new KongSwapAgent(),
      icdex: new ICDEXAgent()
    };
  }

  // Initialize all agents and register with routing agent
  initialize(): void {
    if (this.isInitialized) {
      console.log('DEX agents already initialized');
      return;
    }

    console.log('Initializing DEX agents...');

    // Register all adapters with the routing agent
    dexRoutingAgent.registerAdapter(this.agents.icpswap);
    dexRoutingAgent.registerAdapter(this.agents.kongswap);
    dexRoutingAgent.registerAdapter(this.agents.icdex);

    this.isInitialized = true;

    console.log('DEX agents initialized:', {
      availableDEXs: dexRoutingAgent.getAvailableDEXs(),
      totalAgents: 3
    });
  }

  // Test method to validate all agents work correctly
  async testAllAgents(): Promise<void> {
    if (!this.isInitialized) {
      this.initialize();
    }

    console.log('Testing DEX routing agent...');

    // Test with sample trade data
    const testTrades: RouteInput[] = [
      {
        fromToken: 'ckBTC',
        toToken: 'ckUSDC',
        amount: 100000000, // 1 ckBTC in satoshis
        urgency: 'medium',
        userPreference: 'lowest_cost'
      },
      {
        fromToken: 'ICP',
        toToken: 'ckUSDC',
        amount: 1000000000, // 1000 ICP
        urgency: 'high',
        userPreference: 'fastest'
      },
      {
        fromToken: 'ckBTC',
        toToken: 'ckUSDC',
        amount: 1000000000, // 10 ckBTC (large trade for ICDEX)
        urgency: 'low',
        userPreference: 'most_liquid'
      }
    ];

    for (const trade of testTrades) {
      try {
        console.log(`\nTesting ${trade.fromToken} → ${trade.toToken} (${trade.amount} units):`);

        const quotes = await dexRoutingAgent.getBestRoutes(trade);

        quotes.forEach((quote, index) => {
          console.log(`  ${index + 1}. ${quote.dexName}:`);
          console.log(`     Score: ${quote.score}`);
          console.log(`     Slippage: ${quote.slippage.toFixed(3)}%`);
          console.log(`     Fee: ${quote.fee}%`);
          console.log(`     Speed: ${quote.estimatedSpeed}`);
          console.log(`     Badge: ${quote.badge || 'None'}`);
          console.log(`     Reason: ${quote.reason}`);
          if (quote.quoteError) {
            console.log(`     Error: ${quote.quoteError}`);
          }
        });

        // Show recommendation
        const recommended = quotes.find(q => !q.quoteError);
        if (recommended) {
          console.log(`   → Recommended: ${recommended.dexName} (Score: ${recommended.score})`);
        }

      } catch (error) {
        console.error(`Error testing ${trade.fromToken} → ${trade.toToken}:`, error);
      }
    }
  }

  // Get individual agent instances for testing
  getAgents() {
    return this.agents;
  }

  // Test specific agent
  async testSingleAgent(dexName: string, fromToken: string, toToken: string, amount: number) {
    const agent = this.agents[dexName.toLowerCase() as keyof typeof this.agents];
    if (!agent) {
      throw new Error(`Agent ${dexName} not found`);
    }

    try {
      const isAvailable = await agent.isAvailable();
      console.log(`${dexName} availability:`, isAvailable);

      if (isAvailable) {
        const quote = await agent.getQuote(fromToken, toToken, amount);
        console.log(`${dexName} quote:`, quote);
        return quote;
      } else {
        console.log(`${dexName} is currently unavailable`);
        return null;
      }
    } catch (error) {
      console.error(`Error testing ${dexName}:`, error);
      return null;
    }
  }

  // Simulate agent downtime for testing failover
  simulateDowntime(dexName: string, duration: number = 5000) {
    const agent = this.agents[dexName.toLowerCase() as keyof typeof this.agents];
    if (!agent) {
      throw new Error(`Agent ${dexName} not found`);
    }

    console.log(`Simulating ${dexName} downtime for ${duration}ms`);
    agent.setAvailability(false);

    setTimeout(() => {
      agent.setAvailability(true);
      console.log(`${dexName} back online`);
    }, duration);
  }

  // Update scoring weights for testing
  updateScoringWeights(weights: any) {
    dexRoutingAgent.updateScoringWeights(weights);
    console.log('Updated scoring weights:', weights);
  }

  // Reset all agents to default state
  reset() {
    Object.values(this.agents).forEach(agent => {
      agent.setAvailability(true);
    });

    // Reset scoring weights to default
    dexRoutingAgent.updateScoringWeights({
      slippage: 0.40,
      fee: 0.30,
      speed: 0.15,
      liquidityDepth: 0.10,
      availability: 0.05
    });

    console.log('All agents reset to default state');
  }
}

// Singleton instance
export const agentInitializer = new AgentInitializer();

// Auto-initialize when imported (for development)
if (typeof window !== 'undefined') {
  // Browser environment - initialize immediately
  agentInitializer.initialize();

  // Expose to window for testing in browser console
  (window as any).testDEXAgents = {
    test: () => agentInitializer.testAllAgents(),
    testAgent: (dex: string, from: string, to: string, amount: number) =>
      agentInitializer.testSingleAgent(dex, from, to, amount),
    simulate: (dex: string, duration?: number) =>
      agentInitializer.simulateDowntime(dex, duration),
    weights: (weights: any) => agentInitializer.updateScoringWeights(weights),
    reset: () => agentInitializer.reset(),
    agents: agentInitializer.getAgents()
  };
}