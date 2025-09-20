// ICPSwapAdapter Tests - Balanced AMM DEX with Delay & Failure Handling
// Tests internal delays, network failures, and recovery mechanisms

import { ICPSwapAdapter } from '../ICPSwapAdapter';
import { DEXQuote } from '../../types/dex';

describe('ICPSwapAdapter', () => {
  let adapter: ICPSwapAdapter;

  beforeEach(() => {
    adapter = new ICPSwapAdapter();
    jest.clearAllMocks();
  });

  describe('getDEXName()', () => {
    it('should return correct DEX name', () => {
      expect(adapter.getDEXName()).toBe('ICPSwap');
    });
  });

  describe('isAvailable() - Reliability Simulation', () => {
    it('should return true when random value indicates availability (>0.08)', async () => {
      // Math.random is mocked to return 0.5 (50%) in setupTests.ts
      // Since 0.5 > 0.08, isAvailable should return true (92% uptime)
      const isAvailable = await adapter.isAvailable();
      expect(isAvailable).toBe(true);
    });

    it('should return false when random value indicates downtime', async () => {
      // Mock Math.random to simulate the 8% downtime
      (Math.random as jest.Mock).mockReturnValue(0.05); // 5% < 8% threshold

      const isAvailable = await adapter.isAvailable();
      expect(isAvailable).toBe(false);
    });

    it('should simulate intermittent availability over multiple calls', async () => {
      const results: boolean[] = [];

      // Test 10 calls with different random values
      for (let i = 0; i < 10; i++) {
        // Alternate between available and unavailable
        (Math.random as jest.Mock).mockReturnValue(i % 2 === 0 ? 0.9 : 0.05);
        results.push(await adapter.isAvailable());
      }

      // Should have mixed results
      expect(results).toContain(true);
      expect(results).toContain(false);
    });
  });

  describe('getQuote() - Internal Delay Simulation', () => {
    it('should handle simulated network delays within acceptable timeframe', async () => {
      // Mock a delay in the quote process
      const originalGetQuote = adapter.getQuote.bind(adapter);
      jest.spyOn(adapter, 'getQuote').mockImplementation(async (...args) => {
        // Simulate 500ms network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return originalGetQuote(...args);
      });

      const startTime = Date.now();
      const quote = await adapter.getQuote('ICP', 'ckBTC', 100_000_000);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(500); // Should include the delay
      expect(duration).toBeLessThan(2000); // But complete within reasonable time
      expect(quote.quoteError).toBeUndefined();

      jest.restoreAllMocks();
    });

    it('should provide valid quotes despite internal processing delays', async () => {
      // Simulate variable processing delays
      const delays = [100, 300, 800, 1200];
      const quotes: DEXQuote[] = [];

      for (const delay of delays) {
        const originalGetQuote = adapter.getQuote.bind(adapter);
        jest.spyOn(adapter, 'getQuote').mockImplementation(async (...args) => {
          await new Promise(resolve => setTimeout(resolve, delay));
          return originalGetQuote(...args);
        });

        const quote = await adapter.getQuote('ICP', 'ckUSDC', 100_000_000);
        quotes.push(quote);

        jest.restoreAllMocks();
      }

      // All quotes should be valid despite delays
      quotes.forEach(quote => {
        expect(quote.dexName).toBe('ICPSwap');
        expect(quote.quoteError).toBeUndefined();
        expect(quote.score).toBeGreaterThan(0);
      });
    });
  });

  describe('getQuote() - Failure Handling Tests', () => {
    it('should gracefully handle availability failures', async () => {
      // Force unavailability
      (Math.random as jest.Mock).mockReturnValue(0.01); // Forces 99% failure

      const errorQuote = await adapter.getQuote('ICP', 'ckBTC', 100_000_000);

      expect(errorQuote.dexName).toBe('ICPSwap');
      expect(errorQuote.quoteError).toBeDefined();
      expect(errorQuote.quoteError).toContain('ICPSwap temporarily unavailable');
      expect(errorQuote.score).toBe(0);
      expect(errorQuote.reason).toBe('ICPSwap unavailable');
    });

    it('should handle exchange rate lookup failures', async () => {
      // Test with tokens that don't have exchange rates in mock data
      const errorQuote = await adapter.getQuote('UNKNOWN_TOKEN' as any, 'ckBTC', 100_000_000);

      expect(errorQuote.quoteError).toBeDefined();
      expect(errorQuote.quoteError).toContain('No exchange rate available');
      expect(errorQuote.score).toBe(0);
    });

    it('should handle unsupported trading pairs gracefully', async () => {
      const errorQuote = await adapter.getQuote('FAKE_TOKEN' as any, 'INVALID_TOKEN' as any, 100_000_000);

      expect(errorQuote.quoteError).toBeDefined();
      expect(errorQuote.quoteError).toContain('Unsupported trading pair');
      expect(errorQuote.dexName).toBe('ICPSwap');
    });

    it('should simulate and recover from transient network failures', async () => {
      let callCount = 0;
      const originalGetQuote = adapter.getQuote.bind(adapter);

      jest.spyOn(adapter, 'getQuote').mockImplementation(async (...args) => {
        callCount++;

        // First call fails, second succeeds
        if (callCount === 1) {
          throw new Error('Network connection failed');
        }

        return originalGetQuote(...args);
      });

      // First call should fail
      try {
        await adapter.getQuote('ICP', 'ckBTC', 100_000_000);
        fail('Expected first call to throw error');
      } catch (error) {
        expect((error as Error).message).toBe('Network connection failed');
      }

      // Reset mock for second call
      jest.restoreAllMocks();

      // Second call should succeed
      const quote = await adapter.getQuote('ICP', 'ckBTC', 100_000_000);
      expect(quote.quoteError).toBeUndefined();
      expect(quote.dexName).toBe('ICPSwap');
    });

    it('should handle partial data corruption scenarios', async () => {
      // Mock corrupted exchange rate data
      const originalGetQuote = adapter.getQuote.bind(adapter);
      jest.spyOn(adapter, 'getQuote').mockImplementation(async (fromToken, toToken, amount) => {
        // Simulate corrupted data by setting invalid exchange rate
        if (fromToken === 'ICP' && toToken === 'ckBTC') {
          throw new Error('Data corruption detected');
        }
        return originalGetQuote(fromToken, toToken, amount);
      });

      const errorQuote = await adapter.getQuote('ICP', 'ckBTC', 100_000_000);

      // Should be handled as error quote, not crash
      expect(errorQuote.dexName).toBe('ICPSwap');

      jest.restoreAllMocks();
    });
  });

  describe('getQuote() - AMM Characteristics Validation', () => {
    it('should return valid ICPSwap-specific quote properties', async () => {
      const quote = await adapter.getQuote('ICP', 'ckBTC', 100_000_000);

      // ICPSwap should have 0.25% base fee
      expect(quote.fee).toBe(0.25);

      // Should have moderate execution speed
      expect(quote.estimatedSpeed).toMatch(/\d+-\d+ seconds/);

      // Should have proper AMM slippage characteristics
      expect(quote.slippage).toBeGreaterThanOrEqual(0.08); // Minimum slippage
      expect(quote.slippage).toBeLessThan(3); // Reasonable maximum

      // Should have balanced scores for medium trades
      expect(quote.score).toBeGreaterThan(0);
      expect(quote.score).toBeLessThanOrEqual(100);
    });

    it('should optimize for medium trade sizes ($5k-$75k)', async () => {
      // Test medium trade (sweet spot for ICPSwap)
      const mediumTrade = await adapter.getQuote('ckBTC', 'ckUSDC', 25_000_000); // ~$16k

      // Test small trade
      const smallTrade = await adapter.getQuote('ICP', 'ckBTC', 1_000_000); // ~$12

      // Test large trade
      const largeTrade = await adapter.getQuote('ckETH', 'ckUSDC', 100_000_000_000_000_000_000n as any); // ~$320k

      // Medium trade should get RECOMMENDED badge
      expect(['RECOMMENDED', 'MOST_LIQUID', 'CHEAPEST']).toContain(mediumTrade.badge);

      // Medium trade should have competitive scoring
      expect(mediumTrade.score).toBeGreaterThanOrEqual(smallTrade.score * 0.8);
    });
  });

  describe('Pool Information Features', () => {
    it('should provide pool information for supported pairs', async () => {
      const poolInfo = await adapter.getPoolInfo('ICP', 'ckBTC');

      expect(poolInfo).toHaveProperty('poolId');
      expect(poolInfo).toHaveProperty('totalLiquidity');
      expect(poolInfo).toHaveProperty('volume24h');
      expect(poolInfo).toHaveProperty('fee', 0.25);
      expect(poolInfo).toHaveProperty('reserves');

      expect(poolInfo.poolId).toBe('icpswap_ICP_ckBTC');
      expect(poolInfo.totalLiquidity).toBeGreaterThan(0);
      expect(poolInfo.volume24h).toBe(250000);
    });

    it('should estimate swap output with proper slippage calculation', async () => {
      const estimation = await adapter.estimateSwapOutput('ICP', 'ckBTC', 100_000_000);

      expect(estimation).toHaveProperty('outputAmount');
      expect(estimation).toHaveProperty('priceImpact');
      expect(estimation).toHaveProperty('minimumReceived');
      expect(estimation).toHaveProperty('route');

      expect(estimation.outputAmount).toBeGreaterThan(0);
      expect(estimation.priceImpact).toBeGreaterThan(0);
      expect(estimation.minimumReceived).toBeLessThanOrEqual(estimation.outputAmount);
      expect(estimation.route).toEqual(['ICP', 'ckBTC']);
    });

    it('should handle swap execution requests', async () => {
      const execution = await adapter.executeSwap('ICP', 'ckBTC', 100_000_000);

      expect(execution).toHaveProperty('transactionId');
      expect(execution).toHaveProperty('status', 'pending');
      expect(execution).toHaveProperty('estimatedCompletion');
      expect(execution).toHaveProperty('fromToken', 'ICP');
      expect(execution).toHaveProperty('toToken', 'ckBTC');
      expect(execution).toHaveProperty('inputAmount', 100_000_000);

      expect(execution.transactionId).toMatch(/^icpswap_\d+$/);
      expect(execution.estimatedCompletion).toBe('15-45 seconds');
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple quote requests with simulated delays', async () => {
      const requestDelays = [50, 150, 300, 600, 900];

      // Create mock implementation with variable delays
      const originalGetQuote = adapter.getQuote.bind(adapter);
      jest.spyOn(adapter, 'getQuote').mockImplementation(async (...args) => {
        const delay = requestDelays.shift() || 0;
        await new Promise(resolve => setTimeout(resolve, delay));
        return originalGetQuote(...args);
      });

      const promises = Array.from({ length: 5 }, (_, i) =>
        adapter.getQuote('ICP', 'ckUSDC', (i + 1) * 50_000_000)
      );

      const startTime = Date.now();
      const quotes = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All requests should complete successfully
      expect(quotes).toHaveLength(5);
      quotes.forEach(quote => {
        expect(quote.dexName).toBe('ICPSwap');
        expect(quote.quoteError).toBeUndefined();
      });

      // Should complete in reasonable total time (parallel execution)
      expect(totalTime).toBeLessThan(2000);

      jest.restoreAllMocks();
    });

    it('should handle mixed success and failure scenarios', async () => {
      let callCount = 0;
      const originalGetQuote = adapter.getQuote.bind(adapter);

      jest.spyOn(adapter, 'getQuote').mockImplementation(async (...args) => {
        callCount++;

        // Fail every third request
        if (callCount % 3 === 0) {
          throw new Error(`Simulated failure for request ${callCount}`);
        }

        return originalGetQuote(...args);
      });

      const promises = Array.from({ length: 6 }, (_, i) =>
        adapter.getQuote('ICP', 'ckBTC', (i + 1) * 10_000_000).catch(error => ({ error: error.message }))
      );

      const results = await Promise.all(promises);

      // Should have both successes and failures
      const successes = results.filter(r => !(r as any).error);
      const failures = results.filter(r => (r as any).error);

      expect(successes.length).toBe(4); // Requests 1, 2, 4, 5
      expect(failures.length).toBe(2);  // Requests 3, 6

      jest.restoreAllMocks();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should demonstrate graceful degradation under high failure rates', async () => {
      // Simulate 70% failure rate
      const originalGetQuote = adapter.getQuote.bind(adapter);
      jest.spyOn(adapter, 'getQuote').mockImplementation(async (...args) => {
        if (Math.random() < 0.7) {
          throw new Error('High load - request failed');
        }
        return originalGetQuote(...args);
      });

      const attempts = 10;
      const results = [];

      for (let i = 0; i < attempts; i++) {
        try {
          const quote = await adapter.getQuote('ICP', 'ckBTC', 100_000_000);
          results.push({ success: true, quote });
        } catch (error) {
          results.push({ success: false, error: (error as Error).message });
        }
      }

      // Should have some successes despite high failure rate
      const successes = results.filter(r => r.success);
      expect(successes.length).toBeGreaterThan(0);

      // Successful quotes should still be valid
      successes.forEach(result => {
        expect((result as any).quote.dexName).toBe('ICPSwap');
      });

      jest.restoreAllMocks();
    });
  });
});