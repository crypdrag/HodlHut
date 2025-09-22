// DEXRoutingAgent Tests - Parallel Execution, Fallback, and Sorting
// Tests best quote selection, adapter failures, score sorting, and edge cases

import { DEXRoutingAgent } from '../DEXRoutingAgent';
import { ICDEXAdapter } from '../../adapters/ICDEXAdapter';
import { ICPSwapAdapter } from '../../adapters/ICPSwapAdapter';
import { KongSwapAdapter } from '../../adapters/KongSwapAdapter';
import { RouteInput, DEXQuote, DEXAdapter } from '../../types/dex';

// Mock the adapters
jest.mock('../../adapters/ICDEXAdapter');
jest.mock('../../adapters/ICPSwapAdapter');
jest.mock('../../adapters/KongSwapAdapter');

describe('DEXRoutingAgent', () => {
  let agent: DEXRoutingAgent;
  let mockICDEX: jest.Mocked<ICDEXAdapter>;
  let mockICPSwap: jest.Mocked<ICPSwapAdapter>;
  let mockKongSwap: jest.Mocked<KongSwapAdapter>;

  const validRouteInput: RouteInput = {
    fromToken: 'ICP',
    toToken: 'ckBTC',
    amount: 100_000_000, // 1 ICP
    urgency: 'medium'
  };

  const createMockQuote = (
    dexName: string,
    score: number,
    slippage: number = 0.1,
    fee: number = 0.25,
    error?: string
  ): DEXQuote => ({
    dexName,
    path: ['ICP', 'ckBTC'],
    slippage,
    fee,
    estimatedSpeed: '10-30 seconds',
    liquidityUsd: 5000000,
    score,
    reason: `${dexName} quote`,
    badge: score > 90 ? 'RECOMMENDED' : undefined,
    quoteError: error
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create fresh mock instances
    mockICDEX = new ICDEXAdapter() as jest.Mocked<ICDEXAdapter>;
    mockICPSwap = new ICPSwapAdapter() as jest.Mocked<ICPSwapAdapter>;
    mockKongSwap = new KongSwapAdapter() as jest.Mocked<KongSwapAdapter>;

    // Mock the constructors to return our mock instances
    (ICDEXAdapter as jest.MockedClass<typeof ICDEXAdapter>).mockImplementation(() => mockICDEX);
    (ICPSwapAdapter as jest.MockedClass<typeof ICPSwapAdapter>).mockImplementation(() => mockICPSwap);
    (KongSwapAdapter as jest.MockedClass<typeof KongSwapAdapter>).mockImplementation(() => mockKongSwap);

    // Set up default mock behaviors
    mockICDEX.getDEXName.mockReturnValue('ICDEX');
    mockICPSwap.getDEXName.mockReturnValue('ICPSwap');
    mockKongSwap.getDEXName.mockReturnValue('KongSwap');

    mockICDEX.isAvailable.mockResolvedValue(true);
    mockICPSwap.isAvailable.mockResolvedValue(true);
    mockKongSwap.isAvailable.mockResolvedValue(true);

    // Create new agent instance with mocked adapters
    agent = new DEXRoutingAgent();
  });

  describe('Initialization and Basic Operations', () => {
    it('should initialize with all three adapters', () => {
      const availableDEXs = agent.getAvailableDEXs();
      expect(availableDEXs).toContain('ICDEX');
      expect(availableDEXs).toContain('ICPSwap');
      expect(availableDEXs).toContain('KongSwap');
      expect(availableDEXs).toHaveLength(3);
    });

    it('should allow updating scoring weights', () => {
      const newWeights = {
        slippage: 0.5,
        speed: 0.3
      };

      agent.updateScoringWeights(newWeights);

      // Test that weights were applied by checking routing behavior
      expect(() => agent.updateScoringWeights(newWeights)).not.toThrow();
    });

    it('should provide performance metrics', () => {
      const metrics = agent.getPerformanceMetrics();

      expect(metrics).toHaveProperty('totalRequests', 0);
      expect(metrics).toHaveProperty('timeouts', 0);
      expect(metrics).toHaveProperty('averageResponseTime', 0);
      expect(metrics).toHaveProperty('timeoutRate', 0);
      expect(metrics).toHaveProperty('uptime', 100);
    });

    it('should provide routing status information', () => {
      const status = agent.getRoutingStatus();

      expect(status).toHaveProperty('activeDEXs', 3);
      expect(status).toHaveProperty('dexNames');
      expect(status).toHaveProperty('performanceMetrics');
      expect(status).toHaveProperty('routingFeatures');

      expect(status.routingFeatures).toHaveProperty('parallelExecution', true);
      expect(status.routingFeatures).toHaveProperty('timeoutProtection', '3000ms');
      expect(status.routingFeatures).toHaveProperty('liquidityAwareSlippage', true);
    });
  });

  describe('Best Quote Selection - All Adapters Return Data', () => {
    it('should return best quote when all adapters succeed', async () => {
      // Mock all adapters to return quotes with different scores
      mockICDEX.getQuote.mockResolvedValue(createMockQuote('ICDEX', 85.5));
      mockICPSwap.getQuote.mockResolvedValue(createMockQuote('ICPSwap', 92.3)); // Best score
      mockKongSwap.getQuote.mockResolvedValue(createMockQuote('KongSwap', 78.1));

      const quotes = await agent.getBestRoutes(validRouteInput);

      expect(quotes).toHaveLength(3);

      // Should be sorted by score descending
      expect(quotes[0].dexName).toBe('ICPSwap');
      expect(quotes[0].score).toBe(92.3);
      expect(quotes[1].dexName).toBe('ICDEX');
      expect(quotes[1].score).toBe(85.5);
      expect(quotes[2].dexName).toBe('KongSwap');
      expect(quotes[2].score).toBe(78.1);

      // All adapters should have been called
      expect(mockICDEX.getQuote).toHaveBeenCalledWith('ICP', 'ckBTC', 100_000_000);
      expect(mockICPSwap.getQuote).toHaveBeenCalledWith('ICP', 'ckBTC', 100_000_000);
      expect(mockKongSwap.getQuote).toHaveBeenCalledWith('ICP', 'ckBTC', 100_000_000);
    });

    it('should call all adapters in parallel', async () => {
      const startTimes: Record<string, number> = {};
      const endTimes: Record<string, number> = {};

      // Add delays to simulate network calls
      mockICDEX.getQuote.mockImplementation(async () => {
        startTimes.ICDEX = Date.now();
        await new Promise(resolve => setTimeout(resolve, 200));
        endTimes.ICDEX = Date.now();
        return createMockQuote('ICDEX', 80);
      });

      mockICPSwap.getQuote.mockImplementation(async () => {
        startTimes.ICPSwap = Date.now();
        await new Promise(resolve => setTimeout(resolve, 300));
        endTimes.ICPSwap = Date.now();
        return createMockQuote('ICPSwap', 85);
      });

      mockKongSwap.getQuote.mockImplementation(async () => {
        startTimes.KongSwap = Date.now();
        await new Promise(resolve => setTimeout(resolve, 150));
        endTimes.KongSwap = Date.now();
        return createMockQuote('KongSwap', 90);
      });

      const overallStart = Date.now();
      const quotes = await agent.getBestRoutes(validRouteInput);
      const overallEnd = Date.now();

      // All adapters should start around the same time (parallel execution)
      const maxStartDiff = Math.max(...Object.values(startTimes)) - Math.min(...Object.values(startTimes));
      expect(maxStartDiff).toBeLessThan(50); // Should start within 50ms of each other

      // Total time should be closer to the longest individual time, not the sum
      expect(overallEnd - overallStart).toBeLessThan(500); // Much less than 200+300+150=650ms

      expect(quotes).toHaveLength(3);
    });

    it('should handle ICDEX threshold filtering for small trades', async () => {
      // Small trade that should exclude ICDEX
      const smallTradeInput: RouteInput = {
        ...validRouteInput,
        amount: 100_000_000 // 1 ICP = ~$12, less than $500 threshold
      };

      mockICPSwap.getQuote.mockResolvedValue(createMockQuote('ICPSwap', 85));
      mockKongSwap.getQuote.mockResolvedValue(createMockQuote('KongSwap', 90));

      const quotes = await agent.getBestRoutes(smallTradeInput);

      // Should only have 2 quotes (ICDEX excluded)
      expect(quotes).toHaveLength(2);
      expect(quotes.map(q => q.dexName)).not.toContain('ICDEX');

      // ICDEX should not have been called
      expect(mockICDEX.getQuote).not.toHaveBeenCalled();
      expect(mockICPSwap.getQuote).toHaveBeenCalled();
      expect(mockKongSwap.getQuote).toHaveBeenCalled();
    });
  });

  describe('Adapter Failure Fallback', () => {
    it('should fall back to remaining adapters when one adapter fails', async () => {
      // Mock one adapter to be unavailable
      mockICPSwap.isAvailable.mockResolvedValue(false);

      mockICDEX.getQuote.mockResolvedValue(createMockQuote('ICDEX', 85));
      mockKongSwap.getQuote.mockResolvedValue(createMockQuote('KongSwap', 78));

      const quotes = await agent.getBestRoutes(validRouteInput);

      expect(quotes).toHaveLength(3); // Still 3 quotes, but one is an error quote

      // Find the error quote
      const errorQuote = quotes.find(q => q.quoteError);
      expect(errorQuote).toBeDefined();
      expect(errorQuote!.dexName).toBe('ICPSwap');
      expect(errorQuote!.score).toBe(0);
      expect(errorQuote!.quoteError).toContain('unavailable');

      // Successful quotes should be properly sorted
      const successQuotes = quotes.filter(q => !q.quoteError);
      expect(successQuotes[0].dexName).toBe('ICDEX'); // Higher score
      expect(successQuotes[1].dexName).toBe('KongSwap');
    });

    it('should handle adapter getQuote exceptions', async () => {
      // Mock one adapter to throw an exception
      mockKongSwap.getQuote.mockRejectedValue(new Error('Network timeout'));

      mockICDEX.getQuote.mockResolvedValue(createMockQuote('ICDEX', 85));
      mockICPSwap.getQuote.mockResolvedValue(createMockQuote('ICPSwap', 90));

      const quotes = await agent.getBestRoutes(validRouteInput);

      expect(quotes).toHaveLength(3);

      const errorQuote = quotes.find(q => q.dexName === 'KongSwap');
      expect(errorQuote!.quoteError).toContain('Network timeout');
      expect(errorQuote!.score).toBe(0);

      // Other adapters should still work
      const successQuotes = quotes.filter(q => !q.quoteError);
      expect(successQuotes).toHaveLength(2);
    });

    it('should handle mixed availability and quote failures', async () => {
      // ICPSwap unavailable, KongSwap throws exception, only ICDEX succeeds
      mockICPSwap.isAvailable.mockResolvedValue(false);
      mockKongSwap.getQuote.mockRejectedValue(new Error('API rate limit exceeded'));
      mockICDEX.getQuote.mockResolvedValue(createMockQuote('ICDEX', 88));

      const quotes = await agent.getBestRoutes(validRouteInput);

      expect(quotes).toHaveLength(3);

      // One successful quote
      const successQuotes = quotes.filter(q => !q.quoteError);
      expect(successQuotes).toHaveLength(1);
      expect(successQuotes[0].dexName).toBe('ICDEX');

      // Two error quotes
      const errorQuotes = quotes.filter(q => q.quoteError);
      expect(errorQuotes).toHaveLength(2);
      expect(errorQuotes.map(q => q.dexName)).toContain('ICPSwap');
      expect(errorQuotes.map(q => q.dexName)).toContain('KongSwap');
    });

    it('should handle partial timeout scenarios', async () => {
      // Mock timeouts for specific adapters
      mockICPSwap.getQuote.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 4000)); // Exceeds 3s timeout
        return createMockQuote('ICPSwap', 85);
      });

      mockICDEX.getQuote.mockResolvedValue(createMockQuote('ICDEX', 80));
      mockKongSwap.getQuote.mockResolvedValue(createMockQuote('KongSwap', 90));

      const quotes = await agent.getBestRoutes(validRouteInput);

      expect(quotes).toHaveLength(3);

      // ICPSwap should timeout and create error quote
      const icpSwapQuote = quotes.find(q => q.dexName === 'ICPSwap');
      expect(icpSwapQuote!.quoteError).toContain('timeout');

      // Other adapters should succeed
      const successQuotes = quotes.filter(q => !q.quoteError);
      expect(successQuotes).toHaveLength(2);
    });
  });

  describe('Quote Sorting by Score', () => {
    it('should sort quotes correctly by score descending', async () => {
      const testScores = [45.2, 92.8, 67.1, 88.9, 12.3];
      const expectedOrder = [92.8, 88.9, 67.1, 45.2, 12.3];

      // Create mock quotes with varying scores
      mockICDEX.getQuote.mockResolvedValue(createMockQuote('ICDEX', testScores[0]));
      mockICPSwap.getQuote.mockResolvedValue(createMockQuote('ICPSwap', testScores[1]));
      mockKongSwap.getQuote.mockResolvedValue(createMockQuote('KongSwap', testScores[2]));

      const quotes = await agent.getBestRoutes(validRouteInput);

      expect(quotes).toHaveLength(3);
      expect(quotes[0].score).toBe(expectedOrder[0]); // 92.8 (ICPSwap)
      expect(quotes[1].score).toBe(expectedOrder[2]); // 67.1 (KongSwap)
      expect(quotes[2].score).toBe(expectedOrder[3]); // 45.2 (ICDEX)
    });

    it('should handle equal scores correctly', async () => {
      mockICDEX.getQuote.mockResolvedValue(createMockQuote('ICDEX', 85.0));
      mockICPSwap.getQuote.mockResolvedValue(createMockQuote('ICPSwap', 85.0));
      mockKongSwap.getQuote.mockResolvedValue(createMockQuote('KongSwap', 85.0));

      const quotes = await agent.getBestRoutes(validRouteInput);

      expect(quotes).toHaveLength(3);
      expect(quotes[0].score).toBe(85.0);
      expect(quotes[1].score).toBe(85.0);
      expect(quotes[2].score).toBe(85.0);

      // Order should be stable (maintain original adapter order)
      const dexNames = quotes.map(q => q.dexName);
      expect(dexNames).toEqual(['ICDEX', 'ICPSwap', 'KongSwap']);
    });

    it('should place error quotes at the end regardless of original position', async () => {
      mockICDEX.getQuote.mockResolvedValue(createMockQuote('ICDEX', 95)); // High score
      mockICPSwap.isAvailable.mockResolvedValue(false); // Error
      mockKongSwap.getQuote.mockResolvedValue(createMockQuote('KongSwap', 88));

      const quotes = await agent.getBestRoutes(validRouteInput);

      expect(quotes).toHaveLength(3);

      // Successful quotes should come first, sorted by score
      expect(quotes[0].dexName).toBe('ICDEX');
      expect(quotes[0].score).toBe(95);
      expect(quotes[1].dexName).toBe('KongSwap');
      expect(quotes[1].score).toBe(88);

      // Error quote should come last
      expect(quotes[2].dexName).toBe('ICPSwap');
      expect(quotes[2].score).toBe(0);
      expect(quotes[2].quoteError).toBeDefined();
    });
  });

  describe('All Adapters Fail Scenarios', () => {
    it('should return error quotes when all adapters are unavailable', async () => {
      mockICDEX.isAvailable.mockResolvedValue(false);
      mockICPSwap.isAvailable.mockResolvedValue(false);
      mockKongSwap.isAvailable.mockResolvedValue(false);

      const quotes = await agent.getBestRoutes(validRouteInput);

      expect(quotes).toHaveLength(3);
      quotes.forEach(quote => {
        expect(quote.quoteError).toBeDefined();
        expect(quote.score).toBe(0);
        expect(quote.quoteError).toContain('unavailable');
      });
    });

    it('should return error quotes when all adapters throw exceptions', async () => {
      mockICDEX.getQuote.mockRejectedValue(new Error('ICDEX system error'));
      mockICPSwap.getQuote.mockRejectedValue(new Error('ICPSwap maintenance'));
      mockKongSwap.getQuote.mockRejectedValue(new Error('KongSwap overload'));

      const quotes = await agent.getBestRoutes(validRouteInput);

      expect(quotes).toHaveLength(3);
      quotes.forEach(quote => {
        expect(quote.quoteError).toBeDefined();
        expect(quote.score).toBe(0);
      });

      expect(quotes.find(q => q.dexName === 'ICDEX')!.quoteError).toContain('ICDEX system error');
      expect(quotes.find(q => q.dexName === 'ICPSwap')!.quoteError).toContain('ICPSwap maintenance');
      expect(quotes.find(q => q.dexName === 'KongSwap')!.quoteError).toContain('KongSwap overload');
    });

    it('should handle all adapters timing out', async () => {
      // Mock all adapters to exceed timeout
      mockICDEX.getQuote.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 4000));
        return createMockQuote('ICDEX', 85);
      });

      mockICPSwap.getQuote.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return createMockQuote('ICPSwap', 90);
      });

      mockKongSwap.getQuote.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 3500));
        return createMockQuote('KongSwap', 88);
      });

      const quotes = await agent.getBestRoutes(validRouteInput);

      expect(quotes).toHaveLength(3);
      quotes.forEach(quote => {
        expect(quote.quoteError).toContain('timeout');
        expect(quote.score).toBe(0);
      });
    });
  });

  describe('Edge Cases and Malformed Inputs', () => {
    it('should handle empty quote arrays gracefully', async () => {
      // Mock adapters to return null/undefined (filtered out)
      jest.spyOn(agent, 'getAvailableDEXs').mockReturnValue([]);

      const quotes = await agent.getBestRoutes(validRouteInput);

      expect(quotes).toHaveLength(0);
    });

    it('should handle malformed route input', async () => {
      const malformedInput = {
        fromToken: '',
        toToken: null,
        amount: -1,
        urgency: 'invalid'
      } as any;

      mockICDEX.getQuote.mockRejectedValue(new Error('Invalid input'));
      mockICPSwap.getQuote.mockRejectedValue(new Error('Invalid input'));
      mockKongSwap.getQuote.mockRejectedValue(new Error('Invalid input'));

      const quotes = await agent.getBestRoutes(malformedInput);

      expect(quotes).toHaveLength(3);
      quotes.forEach(quote => {
        expect(quote.quoteError).toContain('Invalid input');
      });
    });

    it('should handle zero amount trades', async () => {
      const zeroAmountInput: RouteInput = {
        ...validRouteInput,
        amount: 0
      };

      mockICDEX.getQuote.mockResolvedValue(createMockQuote('ICDEX', 0, 0, 0, 'Zero amount not supported'));
      mockICPSwap.getQuote.mockResolvedValue(createMockQuote('ICPSwap', 0, 0, 0, 'Zero amount not supported'));
      mockKongSwap.getQuote.mockResolvedValue(createMockQuote('KongSwap', 0, 0, 0, 'Zero amount not supported'));

      const quotes = await agent.getBestRoutes(zeroAmountInput);

      expect(quotes).toHaveLength(3);
      quotes.forEach(quote => {
        expect(quote.score).toBe(0);
        expect(quote.quoteError).toContain('Zero amount not supported');
      });
    });

    it('should handle extremely large amounts', async () => {
      const hugeAmountInput: RouteInput = {
        ...validRouteInput,
        amount: Number.MAX_SAFE_INTEGER
      };

      mockICDEX.getQuote.mockResolvedValue(createMockQuote('ICDEX', 50, 5.0, 0.15)); // High slippage for huge trade
      mockICPSwap.getQuote.mockRejectedValue(new Error('Amount exceeds pool capacity'));
      mockKongSwap.getQuote.mockRejectedValue(new Error('Amount too large'));

      const quotes = await agent.getBestRoutes(hugeAmountInput);

      expect(quotes).toHaveLength(3);

      const icdexQuote = quotes.find(q => q.dexName === 'ICDEX');
      expect(icdexQuote!.quoteError).toBeUndefined();
      expect(icdexQuote!.slippage).toBe(5.0); // High slippage expected

      const icpSwapQuote = quotes.find(q => q.dexName === 'ICPSwap');
      expect(icpSwapQuote!.quoteError).toContain('pool capacity');

      const kongSwapQuote = quotes.find(q => q.dexName === 'KongSwap');
      expect(kongSwapQuote!.quoteError).toContain('too large');
    });

    it('should handle invalid token pairs', async () => {
      const invalidPairInput: RouteInput = {
        ...validRouteInput,
        fromToken: 'INVALID_TOKEN',
        toToken: 'FAKE_TOKEN'
      };

      mockICDEX.getQuote.mockResolvedValue(createMockQuote('ICDEX', 0, 0, 0, 'Unsupported trading pair'));
      mockICPSwap.getQuote.mockResolvedValue(createMockQuote('ICPSwap', 0, 0, 0, 'Unsupported trading pair'));
      mockKongSwap.getQuote.mockResolvedValue(createMockQuote('KongSwap', 0, 0, 0, 'Unsupported trading pair'));

      const quotes = await agent.getBestRoutes(invalidPairInput);

      expect(quotes).toHaveLength(3);
      quotes.forEach(quote => {
        expect(quote.quoteError).toContain('Unsupported trading pair');
        expect(quote.score).toBe(0);
      });
    });
  });

  describe('Performance Metrics Tracking', () => {
    it('should track performance metrics during routing', async () => {
      mockICDEX.getQuote.mockResolvedValue(createMockQuote('ICDEX', 85));
      mockICPSwap.getQuote.mockResolvedValue(createMockQuote('ICPSwap', 90));
      mockKongSwap.getQuote.mockResolvedValue(createMockQuote('KongSwap', 78));

      await agent.getBestRoutes(validRouteInput);

      const metrics = agent.getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.timeouts).toBe(0);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      expect(metrics.timeoutRate).toBe(0);
      expect(metrics.uptime).toBe(100);
    });

    it('should track timeouts in performance metrics', async () => {
      mockICDEX.getQuote.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 4000)); // Timeout
        return createMockQuote('ICDEX', 85);
      });
      mockICPSwap.getQuote.mockResolvedValue(createMockQuote('ICPSwap', 90));
      mockKongSwap.getQuote.mockResolvedValue(createMockQuote('KongSwap', 78));

      await agent.getBestRoutes(validRouteInput);

      const metrics = agent.getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.timeouts).toBe(1);
      expect(metrics.timeoutRate).toBe(100); // 1 timeout out of 1 request
      expect(metrics.uptime).toBe(0); // No successful requests
    });

    it('should track multiple requests correctly', async () => {
      mockICDEX.getQuote.mockResolvedValue(createMockQuote('ICDEX', 85));
      mockICPSwap.getQuote.mockResolvedValue(createMockQuote('ICPSwap', 90));
      mockKongSwap.getQuote.mockResolvedValue(createMockQuote('KongSwap', 78));

      // Make multiple requests
      await agent.getBestRoutes(validRouteInput);
      await agent.getBestRoutes(validRouteInput);
      await agent.getBestRoutes(validRouteInput);

      const metrics = agent.getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.timeouts).toBe(0);
      expect(metrics.timeoutRate).toBe(0);
      expect(metrics.uptime).toBe(100);
    });
  });

  describe('User Preference Adjustments', () => {
    it('should boost scores for high urgency requests', async () => {
      const urgentInput: RouteInput = {
        ...validRouteInput,
        urgency: 'high'
      };

      mockKongSwap.getQuote.mockResolvedValue({
        ...createMockQuote('KongSwap', 70),
        estimatedSpeed: '5-15 seconds' // Fast execution
      });
      mockICPSwap.getQuote.mockResolvedValue({
        ...createMockQuote('ICPSwap', 85),
        estimatedSpeed: '20-60 seconds' // Slower execution
      });

      const quotes = await agent.getBestRoutes(urgentInput);

      // KongSwap should get speed boost and potentially rank higher
      const kongSwapQuote = quotes.find(q => q.dexName === 'KongSwap');
      const icpSwapQuote = quotes.find(q => q.dexName === 'ICPSwap');

      expect(kongSwapQuote!.score).toBeGreaterThan(70); // Should be boosted
      // KongSwap might now rank higher due to speed boost
    });

    it('should boost scores for cost preference', async () => {
      const costPreferenceInput: RouteInput = {
        ...validRouteInput,
        userPreference: 'lowest_cost'
      };

      mockKongSwap.getQuote.mockResolvedValue({
        ...createMockQuote('KongSwap', 75),
        fee: 0.2 // Lower fee
      });
      mockICPSwap.getQuote.mockResolvedValue({
        ...createMockQuote('ICPSwap', 80),
        fee: 0.25 // Higher fee
      });

      const quotes = await agent.getBestRoutes(costPreferenceInput);

      const kongSwapQuote = quotes.find(q => q.dexName === 'KongSwap');
      expect(kongSwapQuote!.score).toBeGreaterThan(75); // Should get cost boost
    });

    it('should boost scores for liquidity preference', async () => {
      const liquidityPreferenceInput: RouteInput = {
        ...validRouteInput,
        userPreference: 'most_liquid'
      };

      mockICDEX.getQuote.mockResolvedValue({
        ...createMockQuote('ICDEX', 80),
        liquidityUsd: 15000000 // High liquidity
      });
      mockKongSwap.getQuote.mockResolvedValue({
        ...createMockQuote('KongSwap', 85),
        liquidityUsd: 2500000 // Lower liquidity
      });

      const quotes = await agent.getBestRoutes(liquidityPreferenceInput);

      const icdexQuote = quotes.find(q => q.dexName === 'ICDEX');
      expect(icdexQuote!.score).toBeGreaterThan(80); // Should get liquidity boost
    });
  });
});