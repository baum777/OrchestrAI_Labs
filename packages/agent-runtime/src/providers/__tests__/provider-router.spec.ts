/**
 * Provider Router Tests
 *
 * Validates routing determinism and config parsing.
 */

import {
  ProviderRouter,
  NoOpProviderRouter,
  createProviderRouter,
  StubCostGuard,
} from '../provider-router';
import {
  ProviderRouterConfig,
  ProviderConfig,
  DEFAULT_PROVIDER_ROUTER_CONFIG,
  EXAMPLE_PROVIDER_ROUTER_CONFIG,
} from '../provider-config.schema';

describe('ProviderRouter', () => {
  describe('NoOpProviderRouter (default)', () => {
    it('should always return default provider when disabled', () => {
      const router = new NoOpProviderRouter();
      const decision = router.route(['chat']);
      
      expect(decision.providerId).toBe('default');
      expect(decision.strategy).toBe('noop');
      expect(decision.fallbackAttempt).toBe(0);
    });

    it('should ignore configuration when disabled', () => {
      const router = new NoOpProviderRouter({
        defaultProviderId: 'custom',
        providers: [{ id: 'custom', name: 'Custom' } as unknown as ProviderConfig],
      });
      
      // Force disabled
      expect(router.getConfig().enabled).toBe(false);
      
      const decision = router.route(['chat']);
      expect(decision.providerId).toBe('custom'); // Still returns the specified default
    });

    it('should have no health tracking when disabled', () => {
      const router = new NoOpProviderRouter();
      expect(router.getHealth()).toEqual([]);
      
      router.reportHealth('any', true, 100);
      expect(router.getHealth()).toEqual([]);
    });
  });

  describe('createProviderRouter factory', () => {
    it('should create NoOpRouter when PROVIDER_ROUTER_ENABLED not set', () => {
      delete process.env.PROVIDER_ROUTER_ENABLED;
      const router = createProviderRouter();
      expect(router.getConfig().enabled).toBe(false);
    });

    it('should create ProviderRouter when env var set', () => {
      process.env.PROVIDER_ROUTER_ENABLED = 'true';
      const router = createProviderRouter(EXAMPLE_PROVIDER_ROUTER_CONFIG);
      expect(router.getConfig().enabled).toBe(true);
      delete process.env.PROVIDER_ROUTER_ENABLED;
    });

    it('should respect config enabled over env var', () => {
      process.env.PROVIDER_ROUTER_ENABLED = 'true';
      const router = createProviderRouter({ enabled: false });
      expect(router.getConfig().enabled).toBe(false);
      delete process.env.PROVIDER_ROUTER_ENABLED;
    });
  });

  describe('ProviderRouter (enabled)', () => {
    const mockConfig: ProviderRouterConfig = {
      enabled: true,
      defaultProviderId: 'provider-a',
      providers: [
        {
          id: 'provider-a',
          name: 'Provider A',
          type: 'openai',
          baseUrl: 'https://api.a.com',
          priority: 1,
          costPer1kInput: 0.03,
          costPer1kOutput: 0.06,
          capabilities: ['chat', 'function-calling'],
          timeoutMs: 30000,
          retry: { maxAttempts: 3, backoffMs: 1000 },
          circuitBreaker: { failureThreshold: 3, recoveryTimeMs: 60000 },
          rateLimit: { requestsPerSecond: 10, tokensPerMinute: 100000 },
        },
        {
          id: 'provider-b',
          name: 'Provider B',
          type: 'anthropic',
          baseUrl: 'https://api.b.com',
          priority: 2,
          costPer1kInput: 0.02,
          costPer1kOutput: 0.04,
          capabilities: ['chat'],
          timeoutMs: 30000,
          retry: { maxAttempts: 3, backoffMs: 1000 },
          circuitBreaker: { failureThreshold: 3, recoveryTimeMs: 60000 },
          rateLimit: { requestsPerSecond: 5, tokensPerMinute: 50000 },
        },
      ],
      policy: {
        name: 'test-policy',
        strategy: 'priority',
        fallback: {
          enabled: true,
          maxAttempts: 2,
          cascadeOrder: ['provider-a', 'provider-b'],
        },
        healthCheck: {
          intervalMs: 30000,
          timeoutMs: 5000,
          unhealthyThreshold: 3,
        },
      },
      costGuard: {
        enabled: false,
        alertThreshold: 0.8,
        hardStopThreshold: 1.0,
        budgetResetHours: 24,
      },
    };

    it('should route to highest priority provider', () => {
      const router = new ProviderRouter(mockConfig);
      const decision = router.route(['chat']);
      
      expect(decision.providerId).toBe('provider-a');
      expect(decision.strategy).toBe('priority');
    });

    it('should route by cost when strategy is cost', () => {
      const costConfig = { ...mockConfig, policy: { ...mockConfig.policy, strategy: 'cost' as const } };
      const router = new ProviderRouter(costConfig);
      const decision = router.route(['chat']);
      
      // provider-b has lower cost (0.02 < 0.03)
      expect(decision.providerId).toBe('provider-b');
    });

    it('should throw when no provider supports required capabilities', () => {
      const router = new ProviderRouter(mockConfig);
      expect(() => router.route(['unsupported-capability'])).toThrow('No provider supports');
    });

    it('should track provider health', () => {
      const router = new ProviderRouter(mockConfig);
      
      router.reportHealth('provider-a', true, 100);
      const health = router.getHealth();
      
      expect(health).toHaveLength(2);
      const providerAHealth = health.find(h => h.providerId === 'provider-a');
      expect(providerAHealth?.healthy).toBe(true);
      expect(providerAHealth?.consecutiveFailures).toBe(0);
    });

    it('should mark provider unhealthy after threshold failures', () => {
      const router = new ProviderRouter(mockConfig);
      
      // Report 3 failures (threshold)
      router.reportHealth('provider-a', false, 0);
      router.reportHealth('provider-a', false, 0);
      router.reportHealth('provider-a', false, 0);
      
      const health = router.getHealth().find(h => h.providerId === 'provider-a');
      expect(health?.healthy).toBe(false);
      expect(health?.consecutiveFailures).toBe(3);
    });

    it('should provide fallback cascade', () => {
      const router = new ProviderRouter(mockConfig);
      
      const fallback = router.getFallback('provider-a');
      expect(fallback?.id).toBe('provider-b');
    });

    it('should return null when no more fallbacks', () => {
      const router = new ProviderRouter(mockConfig);
      
      const fallback = router.getFallback('provider-b');
      expect(fallback).toBeNull();
    });

    it('should estimate cost correctly', () => {
      const router = new ProviderRouter(mockConfig);
      const decision = router.route(['chat'], 2000);
      
      // 1000 input @ 0.03 + 1000 output @ 0.06 = 0.09
      expect(decision.estimatedCost).toBeCloseTo(0.09, 2);
    });
  });

  describe('StubCostGuard', () => {
    it('should always allow when disabled', () => {
      const guard = new StubCostGuard();
      expect(guard.checkBudget(1000)).toEqual({ allowed: true, remainingBudget: Infinity });
    });

    it('should track no spend', () => {
      const guard = new StubCostGuard();
      guard.trackSpend('provider-a', 10);
      expect(guard.getSummary().totalSpend).toBe(0);
    });
  });

  describe('config validation', () => {
    it('should throw on invalid config', () => {
      const invalidConfig: ProviderRouterConfig = {
        ...DEFAULT_PROVIDER_ROUTER_CONFIG,
        enabled: true,
        providers: [], // Empty providers when enabled
      };
      
      expect(() => new ProviderRouter(invalidConfig)).toThrow('Invalid provider config');
    });

    it('should detect duplicate provider IDs', () => {
      const duplicateConfig: ProviderRouterConfig = {
        ...DEFAULT_PROVIDER_ROUTER_CONFIG,
        enabled: true,
        providers: [
          { id: 'same-id', name: 'A' } as unknown as ProviderConfig,
          { id: 'same-id', name: 'B' } as unknown as ProviderConfig,
        ],
      };
      
      expect(() => new ProviderRouter(duplicateConfig)).toThrow('Duplicate provider ID');
    });
  });
});
