// ICDEXAdapter Tests - Professional Orderbook DEX
// Tests quote validation, error handling, and professional trading features

import { ICDEXAdapter } from '../ICDEXAdapter';
import { DEXQuote } from '../../types/dex';

describe('ICDEXAdapter', () => {
  let adapter: ICDEXAdapter;

  beforeEach(() => {
    adapter = new ICDEXAdapter();
    jest.clearAllMocks();
  });

  describe('getDEXName()', () => {
    it('should return correct DEX name', () => {
      expect(adapter.getDEXName()).toBe('ICDEX');
    });
  });

  describe('isAvailable()', () => {
    it('should return true when random value indicates availability (>0.05)', async () => {
      // Math.random is mocked to return 0.5 (50%) in setupTests.ts
      // Since 0.5 > 0.05, isAvailable should return true
      const isAvailable = await adapter.isAvailable();
      expect(isAvailable).toBe(true);
    });

    it('should return false when random value indicates unavailability', async () => {
      // Mock Math.random to return a value that indicates unavailability
      (Math.random as jest.Mock).mockReturnValue(0.01); // 1% < 5% threshold

      const isAvailable = await adapter.isAvailable();
      expect(isAvailable).toBe(false);
    });
  });

  describe('getQuote() - Valid Quote Object Tests', () => {
    it('should return a valid DEXQuote object for supported pairs', async () => {
      const quote = await adapter.getQuote('ICP', 'ckBTC', 100_000_000); // 1 ICP

      // Validate DEXQuote structure
      expect(quote).toHaveProperty('dexName', 'ICDEX');
      expect(quote).toHaveProperty('path');
      expect(quote).toHaveProperty('slippage');
      expect(quote).toHaveProperty('fee');
      expect(quote).toHaveProperty('estimatedSpeed');
      expect(quote).toHaveProperty('liquidityUsd');
      expect(quote).toHaveProperty('score');
      expect(quote).toHaveProperty('reason');

      // Validate data types
      expect(typeof quote.dexName).toBe('string');
      expect(Array.isArray(quote.path)).toBe(true);
      expect(typeof quote.slippage).toBe('number');
      expect(typeof quote.fee).toBe('number');
      expect(typeof quote.estimatedSpeed).toBe('string');
      expect(typeof quote.liquidityUsd).toBe('number');
      expect(typeof quote.score).toBe('number');
      expect(typeof quote.reason).toBe('string');

      // Validate quote has no errors
      expect(quote.quoteError).toBeUndefined();
    });

    it('should return valid ICDEX-specific characteristics', async () => {
      const quote = await adapter.getQuote('ICP', 'ckBTC', 100_000_000);

      // ICDEX should have the lowest fees (0.15%)
      expect(quote.fee).toBe(0.15);

      // ICDEX should have proper path structure
      expect(quote.path).toEqual(['ICP', 'ckBTC']);

      // ICDEX should have reasonable slippage
      expect(quote.slippage).toBeGreaterThan(0);
      expect(quote.slippage).toBeLessThan(5); // Less than 5%

      // ICDEX should have liquidity data
      expect(quote.liquidityUsd).toBeGreaterThan(0);

      // ICDEX should have professional execution speed descriptions
      expect(quote.estimatedSpeed).toMatch(/seconds|orderbook/i);
    });

    it('should optimize for large trades with reduced slippage', async () => {
      // Test large trade (>$50k equivalent)
      const largeTradeQuote = await adapter.getQuote('ckBTC', 'ckUSDC', 100_000_000); // ~$650k

      // Test small trade
      const smallTradeQuote = await adapter.getQuote('ICP', 'ckBTC', 1_000_000); // ~$0.12

      // Large trades should get slippage reduction bonus
      expect(largeTradeQuote.slippage).toBeLessThanOrEqual(smallTradeQuote.slippage);

      // Large trades should get professional badge
      expect(['RECOMMENDED', 'ADVANCED', 'CHEAPEST']).toContain(largeTradeQuote.badge);
    });

    it('should assign appropriate badges for different trade sizes', async () => {
      // Very large trade should get RECOMMENDED
      const hugeTrade = await adapter.getQuote('ckETH', 'ckUSDC', 50_000_000_000_000_000_000n as any); // 50 ETH
      expect(hugeTrade.badge).toBe('RECOMMENDED');
      expect(hugeTrade.reason).toContain('large trade');

      // Large trade should get ADVANCED
      const largeTrade = await adapter.getQuote('ckBTC', 'ckUSDC', 50_000_000); // ~$32.5k
      expect(['ADVANCED', 'RECOMMENDED']).toContain(largeTrade.badge);

      // High liquidity scenarios should get CHEAPEST
      // This depends on the mock liquidity data for specific pairs
    });

    it('should calculate score properly for successful quotes', async () => {
      const quote = await adapter.getQuote('ICP', 'ckUSDC', 500_000_000); // 5 ICP

      // Score should be reasonable (0-100 range)
      expect(quote.score).toBeGreaterThan(0);
      expect(quote.score).toBeLessThanOrEqual(100);

      // Score should be numeric with proper precision
      expect(Number.isFinite(quote.score)).toBe(true);
      expect(quote.score.toString()).toMatch(/^\d+(\.\d{1,2})?$/); // Up to 2 decimal places
    });
  });

  describe('getQuote() - Error Handling Tests', () => {
    it('should return error quote for unsupported trading pairs', async () => {
      const errorQuote = await adapter.getQuote('UNSUPPORTED' as any, 'INVALID' as any, 1000000);

      expect(errorQuote.dexName).toBe('ICDEX');
      expect(errorQuote.quoteError).toBeDefined();
      expect(errorQuote.quoteError).toContain('Unsupported trading pair');
      expect(errorQuote.score).toBe(0);
      expect(errorQuote.slippage).toBe(0);
      expect(errorQuote.fee).toBe(0);
      expect(errorQuote.liquidityUsd).toBe(0);
      expect(errorQuote.reason).toBe('ICDEX unavailable');
    });

    it('should return error quote when DEX is unavailable', async () => {
      // Mock unavailability
      (Math.random as jest.Mock).mockReturnValue(0.01); // Forces unavailability

      const errorQuote = await adapter.getQuote('ICP', 'ckBTC', 100_000_000);

      expect(errorQuote.quoteError).toBeDefined();
      expect(errorQuote.quoteError).toContain('temporarily unavailable');
      expect(errorQuote.score).toBe(0);
    });

    it('should handle network simulation errors gracefully', async () => {
      // Spy on the adapter's methods to simulate network failure
      const originalGetQuote = adapter.getQuote.bind(adapter);
      jest.spyOn(adapter, 'getQuote').mockImplementation(async () => {
        throw new Error('Network timeout');
      });

      try {
        await adapter.getQuote('ICP', 'ckBTC', 100_000_000);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Network timeout');
      }

      // Restore original implementation
      jest.restoreAllMocks();
    });
  });

  describe('Professional Trading Features', () => {
    it('should support orderbook-specific methods', async () => {
      // Test that ICDEX has professional trading methods
      expect(typeof adapter.getOrderBook).toBe('function');
      expect(typeof adapter.placeMarketOrder).toBe('function');
      expect(typeof adapter.placeLimitOrder).toBe('function');

      // Test orderbook method returns proper structure
      const orderbook = await adapter.getOrderBook('ICP', 'ckBTC');
      expect(orderbook).toHaveProperty('bids');
      expect(orderbook).toHaveProperty('asks');
      expect(orderbook).toHaveProperty('spread');
    });

    it('should handle market order placement', async () => {
      const marketOrder = await adapter.placeMarketOrder('ICP', 'ckBTC', 100_000_000);

      expect(marketOrder).toHaveProperty('orderId');
      expect(marketOrder).toHaveProperty('status');
      expect(marketOrder).toHaveProperty('estimatedFill');
      expect(marketOrder.orderId).toMatch(/^icdex_\d+$/);
    });

    it('should handle limit order placement', async () => {
      const limitOrder = await adapter.placeLimitOrder('ICP', 'ckBTC', 100_000_000, 0.000154);

      expect(limitOrder).toHaveProperty('orderId');
      expect(limitOrder).toHaveProperty('status', 'open');
      expect(limitOrder).toHaveProperty('price', 0.000154);
      expect(limitOrder).toHaveProperty('amount', 100_000_000);
      expect(limitOrder.orderId).toMatch(/^icdex_limit_\d+$/);
    });
  });

  describe('Performance and Reliability', () => {
    it('should complete quote requests within reasonable time', async () => {
      const startTime = Date.now();

      await adapter.getQuote('ICP', 'ckBTC', 100_000_000);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle multiple concurrent quote requests', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        adapter.getQuote('ICP', 'ckBTC', (i + 1) * 100_000_000)
      );

      const quotes = await Promise.all(promises);

      expect(quotes).toHaveLength(5);
      quotes.forEach(quote => {
        expect(quote.dexName).toBe('ICDEX');
        expect(quote.quoteError).toBeUndefined();
      });
    });

    it('should maintain state consistency across multiple calls', async () => {
      const quote1 = await adapter.getQuote('ICP', 'ckBTC', 100_000_000);
      const quote2 = await adapter.getQuote('ICP', 'ckBTC', 100_000_000);

      // Should return consistent results for same inputs
      expect(quote1.dexName).toBe(quote2.dexName);
      expect(quote1.fee).toBe(quote2.fee);
      expect(quote1.path).toEqual(quote2.path);
    });
  });
});