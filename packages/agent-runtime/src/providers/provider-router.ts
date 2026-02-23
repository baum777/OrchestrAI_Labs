/**
 * Provider Router
 *
 * Routes LLM requests to appropriate providers based on policy.
 * Feature flag: PROVIDER_ROUTER_ENABLED (default: false)
 * When disabled: uses single default provider (current behavior preserved)
 */

import {
  ProviderConfig,
  ProviderRouterConfig,
  ProviderRoutingPolicy,
  DEFAULT_PROVIDER_ROUTER_CONFIG,
  validateProviderConfig,
} from './provider-config.schema';

/**
 * Provider health status
 */
export interface ProviderHealth {
  providerId: string;
  healthy: boolean;
  lastCheckedAt: number;
  consecutiveFailures: number;
  averageLatencyMs: number;
}

/**
 * Routing decision result
 */
export interface RoutingDecision {
  providerId: string;
  provider: ProviderConfig;
  strategy: string;
  reason: string;
  fallbackAttempt: number;
  estimatedCost: number;
}

/**
 * Provider Router Interface
 */
export interface IProviderRouter {
  /** Get routing decision for request */
  route(capabilities: string[], estimatedTokens?: number): RoutingDecision;
  
  /** Report provider health */
  reportHealth(providerId: string, success: boolean, latencyMs: number): void;
  
  /** Get current health status */
  getHealth(): ProviderHealth[];
  
  /** Get router configuration */
  getConfig(): ProviderRouterConfig;
}

/**
 * No-op Provider Router
 * Default implementation when PROVIDER_ROUTER_ENABLED=false
 * Preserves existing single-provider behavior
 */
export class NoOpProviderRouter implements IProviderRouter {
  private config: ProviderRouterConfig;
  
  constructor(config?: Partial<ProviderRouterConfig>) {
    this.config = {
      ...DEFAULT_PROVIDER_ROUTER_CONFIG,
      ...config,
      enabled: false, // Force disabled
    };
  }
  
  route(capabilities: string[], _estimatedTokens?: number): RoutingDecision {
    // Always returns default provider - no routing logic
    return {
      providerId: this.config.defaultProviderId,
      provider: this.getDefaultProvider(),
      strategy: 'noop',
      reason: 'Router disabled - using default provider',
      fallbackAttempt: 0,
      estimatedCost: 0,
    };
  }
  
  reportHealth(_providerId: string, _success: boolean, _latencyMs: number): void {
    // No-op - no health tracking when disabled
  }
  
  getHealth(): ProviderHealth[] {
    return [];
  }
  
  getConfig(): ProviderRouterConfig {
    return this.config;
  }
  
  private getDefaultProvider(): ProviderConfig {
    return {
      id: this.config.defaultProviderId,
      name: 'Default Provider',
      type: 'custom',
      baseUrl: '',
      priority: 1,
      costPer1kInput: 0,
      costPer1kOutput: 0,
      capabilities: ['chat'],
      timeoutMs: 30000,
      retry: { maxAttempts: 3, backoffMs: 1000 },
      circuitBreaker: { failureThreshold: 5, recoveryTimeMs: 60000 },
      rateLimit: { requestsPerSecond: 10, tokensPerMinute: 100000 },
    };
  }
}

/**
 * Provider Router (Full implementation)
 * Active when PROVIDER_ROUTER_ENABLED=true
 */
export class ProviderRouter implements IProviderRouter {
  private config: ProviderRouterConfig;
  private health: Map<string, ProviderHealth> = new Map();
  private lastHealthCheck: number = 0;
  
  constructor(config: ProviderRouterConfig) {
    const validation = validateProviderConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid provider config: ${validation.errors.join(', ')}`);
    }
    
    this.config = config;
    this.initializeHealthTracking();
  }
  
  route(capabilities: string[], estimatedTokens?: number): RoutingDecision {
    if (!this.config.enabled) {
      // Delegate to no-op behavior
      return new NoOpProviderRouter(this.config).route(capabilities, estimatedTokens);
    }
    
    // Filter healthy providers
    const healthyProviders = this.config.providers.filter(p => this.isHealthy(p.id));
    
    if (healthyProviders.length === 0) {
      throw new Error('No healthy providers available');
    }
    
    // Apply routing strategy
    const selected = this.selectProvider(healthyProviders, capabilities, estimatedTokens);
    
    return {
      providerId: selected.provider.id,
      provider: selected.provider,
      strategy: this.config.policy.strategy,
      reason: selected.reason,
      fallbackAttempt: 0,
      estimatedCost: this.estimateCost(selected.provider, estimatedTokens),
    };
  }
  
  reportHealth(providerId: string, success: boolean, latencyMs: number): void {
    const current = this.health.get(providerId);
    if (!current) return;
    
    if (success) {
      current.consecutiveFailures = 0;
      current.healthy = true;
    } else {
      current.consecutiveFailures++;
      if (current.consecutiveFailures >= this.config.providers.find(p => p.id === providerId)?.circuitBreaker.failureThreshold!) {
        current.healthy = false;
      }
    }
    
    // Update average latency (exponential moving average)
    const alpha = 0.3;
    current.averageLatencyMs = (alpha * latencyMs) + ((1 - alpha) * current.averageLatencyMs);
    current.lastCheckedAt = Date.now();
    
    this.health.set(providerId, current);
  }
  
  getHealth(): ProviderHealth[] {
    return Array.from(this.health.values());
  }
  
  getConfig(): ProviderRouterConfig {
    return this.config;
  }
  
  /**
   * Get next fallback provider in cascade
   */
  getFallback(currentProviderId: string): ProviderConfig | null {
    if (!this.config.policy.fallback.enabled) {
      return null;
    }
    
    const cascade = this.config.policy.fallback.cascadeOrder;
    if (!cascade) return null;
    
    const currentIndex = cascade.indexOf(currentProviderId);
    if (currentIndex < 0 || currentIndex >= cascade.length - 1) {
      return null;
    }
    
    const nextId = cascade[currentIndex + 1];
    return this.config.providers.find(p => p.id === nextId) ?? null;
  }
  
  private initializeHealthTracking(): void {
    for (const provider of this.config.providers) {
      this.health.set(provider.id, {
        providerId: provider.id,
        healthy: true,
        lastCheckedAt: 0,
        consecutiveFailures: 0,
        averageLatencyMs: 0,
      });
    }
  }
  
  private isHealthy(providerId: string): boolean {
    const health = this.health.get(providerId);
    return health?.healthy ?? false;
  }
  
  private selectProvider(
    providers: ProviderConfig[],
    capabilities: string[],
    _estimatedTokens?: number
  ): { provider: ProviderConfig; reason: string } {
    const strategy = this.config.policy.strategy;
    
    // Filter by capabilities
    const capable = providers.filter(p => 
      capabilities.every(c => p.capabilities.includes(c))
    );
    
    if (capable.length === 0) {
      throw new Error(`No provider supports required capabilities: ${capabilities.join(', ')}`);
    }
    
    switch (strategy) {
      case 'priority':
        // Sort by priority (lower = higher)
        const byPriority = [...capable].sort((a, b) => a.priority - b.priority);
        return { provider: byPriority[0], reason: `Highest priority (${byPriority[0].priority})` };
        
      case 'cost':
        // Sort by input cost
        const byCost = [...capable].sort((a, b) => a.costPer1kInput - b.costPer1kInput);
        return { provider: byCost[0], reason: `Lowest cost ($${byCost[0].costPer1kInput}/1K)` };
        
      case 'capability':
        // Sort by most capabilities
        const byCapability = [...capable].sort((a, b) => b.capabilities.length - a.capabilities.length);
        return { provider: byCapability[0], reason: `Most capabilities (${byCapability[0].capabilities.length})` };
        
      default:
        // Default to priority
        const defaultSorted = [...capable].sort((a, b) => a.priority - b.priority);
        return { provider: defaultSorted[0], reason: 'Default priority strategy' };
    }
  }
  
  private estimateCost(provider: ProviderConfig, tokens?: number): number {
    if (!tokens) return 0;
    // Assume 50/50 input/output split for estimation
    const inputTokens = tokens * 0.5;
    const outputTokens = tokens * 0.5;
    return (inputTokens / 1000) * provider.costPer1kInput + (outputTokens / 1000) * provider.costPer1kOutput;
  }
}

/**
 * Cost Guard Hook Interface
 * Placeholder for cost tracking integration
 */
export interface CostGuard {
  /** Check if request within budget */
  checkBudget(estimatedCost: number): { allowed: boolean; remainingBudget: number };
  
  /** Track actual spend */
  trackSpend(providerId: string, actualCost: number): void;
  
  /** Get current spend summary */
  getSummary(): {
    totalSpend: number;
    budgetLimit: number;
    utilizationPercent: number;
    byProvider: Record<string, number>;
  };
}

/**
 * Stub Cost Guard (disabled by default)
 */
export class StubCostGuard implements CostGuard {
  checkBudget(): { allowed: boolean; remainingBudget: number } {
    return { allowed: true, remainingBudget: Infinity };
  }
  
  trackSpend(): void {
    // No-op when disabled
  }
  
  getSummary() {
    return {
      totalSpend: 0,
      budgetLimit: Infinity,
      utilizationPercent: 0,
      byProvider: {},
    };
  }
}

/**
 * Router factory - creates appropriate router based on config
 */
export function createProviderRouter(config?: Partial<ProviderRouterConfig>): IProviderRouter {
  const envEnabled = process.env.PROVIDER_ROUTER_ENABLED === 'true';
  const effectiveEnabled = config?.enabled ?? envEnabled;
  
  if (!effectiveEnabled) {
    return new NoOpProviderRouter(config);
  }
  
  const fullConfig: ProviderRouterConfig = {
    ...DEFAULT_PROVIDER_ROUTER_CONFIG,
    ...config,
    enabled: true,
  };
  
  return new ProviderRouter(fullConfig);
}
