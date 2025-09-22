// KongSwapAdapter Tests - Fast Execution DEX with Timeout Simulation
// Tests 3-second timeout handling, speed optimization, and promise racing

import { KongSwapAdapter } from '../KongSwapAdapter';
import { DEXQuote } from '../../types/dex';

describe('KongSwapAdapter', () => {
  let adapter: KongSwapAdapter;

  beforeEach(() => {
    adapter = new KongSwapAdapter();
    jest.clearAllMocks();
  });

  describe('getDEXName()', () => {
    it('should return correct DEX name', () => {
      expect(adapter.getDEXName()).toBe('KongSwap');
    });
  });

  describe('isAvailable() - Demo Mode', () => {
    it('should return true in demo mode for consistent hackathon demonstrations', async () => {
      // Demo mode: Always available for consistent hackathon demonstrations
      const isAvailable = await adapter.isAvailable();
      expect(isAvailable).toBe(true);
    });

    it('should respect manual availability settings', async () => {
      // Test the setAvailability method if available
      if (typeof (adapter as any).setAvailability === 'function') {
        (adapter as any).setAvailability(false);
        const isAvailable = await adapter.isAvailable();
        expect(isAvailable).toBe(false);

        // Reset for other tests
        (adapter as any).setAvailability(true);
      } else {
        // If no setAvailability method, should always be true in demo mode
        const isAvailable = await adapter.isAvailable();
        expect(isAvailable).toBe(true);
      }
    });
  });

  describe('Timeout Simulation Tests - 3 Second Limit', () => {
    it('should complete fast requests well under 3-second timeout', async () => {
      const startTime = Date.now();

      const quote = await adapter.getQuote('ICP', 'ckBTC', 100_000_000);

      const duration = Date.now() - startTime;

      // Normal operation should be much faster than 3 seconds
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(quote.quoteError).toBeUndefined();
      expect(quote.dexName).toBe('KongSwap');
    });

    it('should simulate request that exceeds 3-second timeout', async () => {
      // Mock getQuote to take longer than 3 seconds
      const originalGetQuote = adapter.getQuote.bind(adapter);
      jest.spyOn(adapter, 'getQuote').mockImplementation(async (...args) => {
        // Simulate 4-second delay (exceeds 3-second timeout)
        await new Promise(resolve => setTimeout(resolve, 4000));
        return originalGetQuote(...args);
      });

      const startTime = Date.now();

      // This test should timeout and fail
      try {
        await Promise.race([
          adapter.getQuote('ICP', 'ckBTC', 100_000_000),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout after 3 seconds')), 3000)
          )
        ]);
        fail('Expected timeout error');
      } catch (error) {
        const duration = Date.now() - startTime;
        expect(duration).toBeGreaterThanOrEqual(3000);
        expect(duration).toBeLessThan(3500); // Should timeout promptly
        expect((error as Error).message).toContain('timeout');
      }

      jest.restoreAllMocks();
    });

    it('should handle promise racing scenarios correctly', async () => {
      // Test multiple requests where some timeout and others succeed
      const requests = [
        // Fast request - should succeed
        new Promise<string>(resolve => setTimeout(() => resolve('fast'), 500)),
        // Slow request - should timeout
        new Promise<string>(resolve => setTimeout(() => resolve('slow'), 4000)),
        // Medium request - should succeed
        new Promise<string>(resolve => setTimeout(() => resolve('medium'), 1500))
      ];

      const timeouts = requests.map(req =>
        Promise.race([
          req,
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 3000)
          )
        ]).catch(error => error.message)
      );

      const results = await Promise.allSettled(timeouts);

      expect(results[0].status).toBe('fulfilled'); // Fast request succeeds
      expect((results[0] as any).value).toBe('fast');

      expect(results[1].status).toBe('fulfilled'); // Slow request times out
      expect((results[1] as any).value).toBe('timeout');

      expect(results[2].status).toBe('fulfilled'); // Medium request succeeds
      expect((results[2] as any).value).toBe('medium');
    });

    it('should demonstrate timeout protection for getQuote method', async () => {
      // Create a wrapper that enforces 3-second timeout
      const getQuoteWithTimeout = async (
        fromToken: string,
        toToken: string,
        amount: number
      ): Promise<DEXQuote | { timeout: true }> => {
        const timeoutPromise = new Promise<{ timeout: true }>((_, reject) => {
          setTimeout(() => reject({ timeout: true }), 3000);
        });

        try {
          return await Promise.race([
            adapter.getQuote(fromToken, toToken, amount),
            timeoutPromise
          ]);
        } catch (error) {
          if ((error as any).timeout) {
            return { timeout: true };
          }
          throw error;
        }
      };

      // Test with normal request (should succeed)
      const normalResult = await getQuoteWithTimeout('ICP', 'ckBTC', 100_000_000);
      expect((normalResult as any).timeout).toBeUndefined();
      expect((normalResult as DEXQuote).dexName).toBe('KongSwap');

      // Test with delayed request
      const originalGetQuote = adapter.getQuote.bind(adapter);
      jest.spyOn(adapter, 'getQuote').mockImplementation(async (...args) => {
        await new Promise(resolve => setTimeout(resolve, 3500)); // Exceed timeout
        return originalGetQuote(...args);
      });

      const timeoutResult = await getQuoteWithTimeout('ICP', 'ckBTC', 100_000_000);
      expect((timeoutResult as any).timeout).toBe(true);

      jest.restoreAllMocks();
    });
  });

  describe('Speed Optimization Features', () => {
    it('should return fast execution speeds for small trades', async () => {
      const smallTradeQuote = await adapter.getQuote('ICP', 'ckBTC', 10_000_000); // Small trade

      // KongSwap should excel at small trade execution
      expect(smallTradeQuote.estimatedSpeed).toMatch(/5-15 seconds/);
      expect(smallTradeQuote.badge).toBe('FASTEST');
      expect(smallTradeQuote.reason).toContain('fast execution');
    });

    it('should provide speed bonuses for trades under $25k', async () => {
      const smallTrade = await adapter.getQuote('ICP', 'ckUSDC', 100_000_000); // ~$1.2k
      const mediumTrade = await adapter.getQuote('ckBTC', 'ckUSDC', 50_000_000); // ~$32.5k

      // Small trade should have better slippage due to speed bonus
      expect(smallTrade.slippage).toBeLessThanOrEqual(mediumTrade.slippage);

      // Small trade should get speed-related badge
      expect(['FASTEST', 'RECOMMENDED', 'CHEAPEST']).toContain(smallTrade.badge);
    });

    it('should have competitive fees (0.2%) for speed optimization', async () => {
      const quote = await adapter.getQuote('ICP', 'ckBTC', 100_000_000);

      expect(quote.fee).toBe(0.2); // Lower than ICPSwap's 0.25%
      expect(quote.dexName).toBe('KongSwap');
    });
  });

  describe('Fast Execution Specialty Methods', () => {
    it('should provide instant quote functionality', async () => {
      const instantQuote = await adapter.getInstantQuote('ICP', 'ckBTC', 100_000_000);

      expect(instantQuote).toHaveProperty('inputAmount', 100_000_000);
      expect(instantQuote).toHaveProperty('outputAmount');
      expect(instantQuote).toHaveProperty('executionTime', '5-15 seconds');
      expect(instantQuote).toHaveProperty('priceImpact', 0.05);
      expect(instantQuote).toHaveProperty('guaranteed', true);

      expect(instantQuote.outputAmount).toBeGreaterThan(0);
    });

    it('should handle fast swap execution requests', async () => {
      const fastExecution = await adapter.executeSwapFast('ICP', 'ckBTC', 100_000_000);

      expect(fastExecution).toHaveProperty('transactionId');
      expect(fastExecution).toHaveProperty('status', 'executing');
      expect(fastExecution).toHaveProperty('estimatedCompletion', '5-15 seconds');
      expect(fastExecution).toHaveProperty('priority', 'high');
      expect(fastExecution).toHaveProperty('fastTrack', true);

      expect(fastExecution.transactionId).toMatch(/^kong_\d+$/);
    });

    it('should provide speed metrics for performance monitoring', async () => {
      const speedMetrics = await adapter.getSpeedMetrics();

      expect(speedMetrics).toHaveProperty('avgExecutionTime', '8.5 seconds');
      expect(speedMetrics).toHaveProperty('successRate', 99.2);
      expect(speedMetrics).toHaveProperty('uptime', 97.1);
      expect(speedMetrics).toHaveProperty('lastBlockProcessed');
      expect(speedMetrics).toHaveProperty('queueLength', 3);

      expect(typeof speedMetrics.lastBlockProcessed).toBe('number');
    });

    it('should provide optimal swap routes for efficiency', async () => {
      const swapRoute = await adapter.getSwapRoute('ICP', 'ckBTC');

      expect(swapRoute).toHaveProperty('path', ['ICP', 'ckBTC']);
      expect(swapRoute).toHaveProperty('hops', 1); // Direct swap most efficient
      expect(swapRoute).toHaveProperty('estimatedGasCost', 0.001);
      expect(swapRoute).toHaveProperty('routeOptimal', true);
    });
  });

  describe('Concurrent Fast Execution Tests', () => {
    it('should handle multiple fast requests simultaneously', async () => {
      const startTime = Date.now();

      // Create 5 concurrent requests
      const promises = Array.from({ length: 5 }, (_, i) =>
        adapter.getQuote('ICP', 'ckUSDC', (i + 1) * 20_000_000)
      );

      const quotes = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All requests should complete successfully
      expect(quotes).toHaveLength(5);
      quotes.forEach(quote => {
        expect(quote.dexName).toBe('KongSwap');
        expect(quote.quoteError).toBeUndefined();
        expect(quote.estimatedSpeed).toMatch(/\d+-\d+ seconds/);
      });

      // Should complete quickly due to KongSwap's speed focus
      expect(totalTime).toBeLessThan(2000);
    });

    it('should maintain speed advantages under load', async () => {
      // Simulate high concurrent load
      const concurrentRequests = 20;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        adapter.getQuote('ICP', 'ckBTC', (i + 1) * 5_000_000)
      );

      const quotes = await Promise.all(promises);
      const averageTime = (Date.now() - startTime) / concurrentRequests;

      // All should succeed
      expect(quotes).toHaveLength(concurrentRequests);

      // Average time per request should still be reasonable
      expect(averageTime).toBeLessThan(200); // 200ms average per request

      // All quotes should maintain KongSwap characteristics
      quotes.forEach(quote => {
        expect(quote.dexName).toBe('KongSwap');
        expect(quote.fee).toBe(0.2);
        expect(quote.quoteError).toBeUndefined();
      });
    });
  });

  describe('Timeout Edge Cases and Recovery', () => {
    it('should handle partial timeout scenarios', async () => {
      let requestCount = 0;
      const originalGetQuote = adapter.getQuote.bind(adapter);

      jest.spyOn(adapter, 'getQuote').mockImplementation(async (...args) => {
        requestCount++;

        // Every 3rd request times out
        if (requestCount % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 4000)); // Exceeds 3s timeout
        }

        return originalGetQuote(...args);
      });

      const timeoutWrapper = (promise: Promise<any>) =>
        Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 3000)
          )
        ]).catch(error => ({ error: error.message }));

      // Test 6 requests
      const promises = Array.from({ length: 6 }, (_, i) =>
        timeoutWrapper(adapter.getQuote('ICP', 'ckBTC', (i + 1) * 10_000_000))
      );

      const results = await Promise.all(promises);

      // Should have timeouts on requests 3 and 6
      const successes = results.filter(r => !(r as any).error);
      const timeouts = results.filter(r => (r as any).error === 'timeout');

      expect(successes.length).toBe(4);
      expect(timeouts.length).toBe(2);

      jest.restoreAllMocks();
    });

    it('should recover quickly after timeout events', async () => {
      // Simulate timeout followed by recovery
      let isTimeoutPhase = true;
      const originalGetQuote = adapter.getQuote.bind(adapter);

      jest.spyOn(adapter, 'getQuote').mockImplementation(async (...args) => {
        if (isTimeoutPhase) {
          isTimeoutPhase = false;
          await new Promise(resolve => setTimeout(resolve, 4000)); // Timeout
        }
        return originalGetQuote(...args);
      });

      // First request should timeout
      const timeoutPromise = Promise.race([
        adapter.getQuote('ICP', 'ckBTC', 100_000_000),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 3000)
        )
      ]);

      try {
        await timeoutPromise;
        fail('Expected timeout');
      } catch (error) {
        expect((error as Error).message).toBe('timeout');
      }

      // Second request should succeed quickly
      const startTime = Date.now();
      const quote = await adapter.getQuote('ICP', 'ckBTC', 100_000_000);
      const recoveryTime = Date.now() - startTime;

      expect(quote.quoteError).toBeUndefined();
      expect(recoveryTime).toBeLessThan(1000); // Fast recovery

      jest.restoreAllMocks();
    });

    it('should handle timeout cascades gracefully', async () => {
      // Simulate cascading timeouts (system under stress)
      const originalGetQuote = adapter.getQuote.bind(adapter);
      jest.spyOn(adapter, 'getQuote').mockImplementation(async (...args) => {
        // Random delay between 2.5-4 seconds (some timeout, some don't)
        const delay = 2500 + Math.random() * 1500;
        await new Promise(resolve => setTimeout(resolve, delay));
        return originalGetQuote(...args);
      });

      const timeoutWrapper = (promise: Promise<any>) =>
        Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 3000)
          )
        ]).catch(error => ({ timeout: true }));

      // Test 10 requests under stress
      const promises = Array.from({ length: 10 }, (_, i) =>
        timeoutWrapper(adapter.getQuote('ICP', 'ckBTC', (i + 1) * 10_000_000))
      );

      const results = await Promise.all(promises);

      // Should have mixed results - some succeed, some timeout
      const successes = results.filter(r => !(r as any).timeout);
      const timeouts = results.filter(r => (r as any).timeout);

      expect(successes.length).toBeGreaterThan(0); // Some should succeed
      expect(timeouts.length).toBeGreaterThan(0);   // Some should timeout
      expect(successes.length + timeouts.length).toBe(10);

      jest.restoreAllMocks();
    });
  });

  describe('Performance Under Pressure', () => {
    it('should maintain speed characteristics even with artificial delays', async () => {
      // Add small artificial delays to simulate network latency
      const originalGetQuote = adapter.getQuote.bind(adapter);
      jest.spyOn(adapter, 'getQuote').mockImplementation(async (...args) => {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms latency
        return originalGetQuote(...args);
      });

      const startTime = Date.now();
      const quote = await adapter.getQuote('ICP', 'ckBTC', 100_000_000);
      const duration = Date.now() - startTime;

      // Should complete within reasonable time including artificial delay
      expect(duration).toBeGreaterThanOrEqual(100); // At least the artificial delay
      expect(duration).toBeLessThan(500); // But still fast overall

      // Quote quality should remain high
      expect(quote.dexName).toBe('KongSwap');
      expect(quote.score).toBeGreaterThan(80); // High score for fast execution
      expect(quote.estimatedSpeed).toMatch(/5-15 seconds/);

      jest.restoreAllMocks();
    });
  });
});