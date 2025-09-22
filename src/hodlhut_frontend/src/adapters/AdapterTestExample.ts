// DEX Adapter Integration Test Example
// Demonstrates how to use the stub adapters with DEXRoutingAgent

import { dexRoutingAgent } from '../agents/DEXRoutingAgent';
import { RouteInput } from '../types/dex';

export class AdapterTestExample {

  // Test basic quote functionality
  static async testBasicQuotes(): Promise<void> {
    console.log('🧪 Testing DEX Adapter Integration...\n');

    // Test small trade - should favor KongSwap
    const smallTradeInput: RouteInput = {
      fromToken: 'ICP',
      toToken: 'ckBTC',
      amount: 100_000_000, // 1 ICP
      urgency: 'medium'
    };

    console.log('📊 Small Trade Test (1 ICP → ckBTC):');
    const smallTradeQuotes = await dexRoutingAgent.getBestRoutes(smallTradeInput);
    this.logQuoteResults(smallTradeQuotes);

    // Test medium trade - should favor ICPSwap
    const mediumTradeInput: RouteInput = {
      fromToken: 'ckBTC',
      toToken: 'ckETH',
      amount: 50_000_000, // 0.5 ckBTC (~$32,500)
      urgency: 'medium'
    };

    console.log('\n📊 Medium Trade Test (0.5 ckBTC → ckETH):');
    const mediumTradeQuotes = await dexRoutingAgent.getBestRoutes(mediumTradeInput);
    this.logQuoteResults(mediumTradeQuotes);

    // Test large trade - should favor ICDEX
    const largeTradeInput: RouteInput = {
      fromToken: 'ckETH',
      toToken: 'ckUSDC',
      amount: 50_000_000_000_000_000, // 0.05 ckETH (~$160) - using safe number
      urgency: 'low',
      userPreference: 'most_liquid'
    };

    console.log('\n📊 Large Trade Test (50 ckETH → ckUSDC):');
    const largeTradeQuotes = await dexRoutingAgent.getBestRoutes(largeTradeInput);
    this.logQuoteResults(largeTradeQuotes);
  }

  // Test user preference scenarios
  static async testUserPreferences(): Promise<void> {
    console.log('\n🎯 Testing User Preference Scenarios...\n');

    const baseInput: RouteInput = {
      fromToken: 'ICP',
      toToken: 'ckUSDC',
      amount: 500_000_000, // 5 ICP
      urgency: 'medium'
    };

    // Test speed preference
    console.log('⚡ Speed Preference Test:');
    const speedQuotes = await dexRoutingAgent.getBestRoutes({
      ...baseInput,
      urgency: 'high',
      userPreference: 'fastest'
    });
    this.logQuoteResults(speedQuotes);

    // Test cost preference
    console.log('\n💰 Cost Preference Test:');
    const costQuotes = await dexRoutingAgent.getBestRoutes({
      ...baseInput,
      urgency: 'low',
      userPreference: 'lowest_cost'
    });
    this.logQuoteResults(costQuotes);

    // Test liquidity preference
    console.log('\n🌊 Liquidity Preference Test:');
    const liquidityQuotes = await dexRoutingAgent.getBestRoutes({
      ...baseInput,
      userPreference: 'most_liquid'
    });
    this.logQuoteResults(liquidityQuotes);
  }

  // Test DEX health status
  static async testDEXHealth(): Promise<void> {
    console.log('\n🏥 DEX Health Status:');

    const availableDEXs = dexRoutingAgent.getAvailableDEXs();
    console.log('Available DEXs:', availableDEXs);

    // Test individual DEX quotes
    for (const dexName of availableDEXs) {
      try {
        const quote = await dexRoutingAgent.getQuoteFromDEX(
          dexName,
          'ICP',
          'ckBTC',
          100_000_000
        );

        console.log(`${dexName}:`, {
          available: !quote.quoteError,
          fee: quote.fee,
          slippage: quote.slippage,
          score: quote.score,
          badge: quote.badge
        });
      } catch (error) {
        console.log(`${dexName}: Error -`, error);
      }
    }
  }

  // Test error handling
  static async testErrorHandling(): Promise<void> {
    console.log('\n❌ Error Handling Test:');

    // Test unsupported token pair
    const unsupportedInput: RouteInput = {
      fromToken: 'UNSUPPORTED' as any,
      toToken: 'INVALID' as any,
      amount: 1000000,
      urgency: 'medium'
    };

    const errorQuotes = await dexRoutingAgent.getBestRoutes(unsupportedInput);
    console.log('Unsupported pair quotes:');
    this.logQuoteResults(errorQuotes);
  }

  // Helper method to log quote results
  private static logQuoteResults(quotes: any[]): void {
    quotes.forEach((quote, index) => {
      const status = quote.quoteError ? '❌' : '✅';
      const badge = quote.badge ? `[${quote.badge}]` : '';

      console.log(`  ${index + 1}. ${status} ${quote.dexName} ${badge}`);
      console.log(`     Score: ${quote.score} | Fee: ${quote.fee}% | Slippage: ${quote.slippage}%`);
      console.log(`     Speed: ${quote.estimatedSpeed} | Liquidity: $${(quote.liquidityUsd || 0).toLocaleString()}`);
      console.log(`     Reason: ${quote.reason}`);

      if (quote.quoteError) {
        console.log(`     Error: ${quote.quoteError}`);
      }
      console.log('');
    });
  }

  // Run all tests
  static async runAllTests(): Promise<void> {
    console.log('🚀 Starting DEX Adapter Integration Tests\n');
    console.log('=' .repeat(60));

    try {
      await this.testBasicQuotes();
      await this.testUserPreferences();
      await this.testDEXHealth();
      await this.testErrorHandling();

      console.log('=' .repeat(60));
      console.log('✅ All tests completed successfully!');
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }
}

// Example usage (uncomment to run):
// AdapterTestExample.runAllTests();

export default AdapterTestExample;