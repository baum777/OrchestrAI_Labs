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
  DEFAULT_PROVIDER_ROUTER_CONFIG,
  validateProviderConfig,
  ModelCapability,
  ModelModality,
} from './provider-config.schema';
import type { Clock } from '@agent-system/governance-v2/runtime/clock';
import { SystemClock } from '@agent-system/governance-v2/runtime/clock';

/**
 * Provider-neutral request contract for model-agnostic routing.
 */
export interface ProviderRouteRequest {
  /** Required logical capabilities, for example "chat", "tool-use", "json-output" */
  capabilities: ModelCapability[];

  /** Estimated total tokens for cost and context-window checks */
  estimatedTokens?: number;

  /** Minimum context window required by the caller */
  minContextTokens?: number;

  /** Required input modalities */
  inputModalities?: ModelModality[];

  /** Required output modalities */
  outputModalities?: ModelModality[];

  /** Require explicit structured JSON output support */
  requiresJsonMode?: boolean;

  /** Require explicit tool/function-calling support */
  requiresToolCalling?: boolean;

  /** Require deterministic replay eligibility */
  requiresDeterministicReplay?: boolean;

  /** Required data-residency region, when governed */
  dataResidency?: string;
}

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

interface ProviderMatch {
  provider: ProviderConfig;
  score: number;
  reason: string;
}

/**
 * Provider Router Interface
 */
export interface IProviderRouter {
  /** Get routing decision for request */
  route(capabilities: string[] | ProviderRouteRequest, estimatedTokens?: number): RoutingDecision;
  
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
  
  route(capabilitiesOrRequest: string[] | ProviderRouteRequest, estimatedTokens?: number): RoutingDecision {
    const request = this.normalizeRequest(capabilitiesOrRequest, estimatedTokens);

    // Always returns default provider - no routing logic
    return {
      providerId: this.config.defaultProviderId,
      provider: this.getDefaultProvider(),
      strategy: 'noop',
      reason: 'Router disabled - using default provider',
      fallbackAttempt: 0,
      estimatedCost: request.estimatedTokens ? 0 : 0,
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
      kind: 'custom',
      baseUrl: '',
      priority: 1,
      costPer1kInput: 0,
      costPer1kOutput: 0,
      capabilities: ['chat'],
      modelProfile: {
        id: 'default.disabled',
        capabilities: ['chat'],
        inputModalities: ['text'],
        outputModalities: ['text'],
      },
      timeoutMs: 30000,
      retry: { maxAttempts: 3, backoffMs: 1000 },
      circuitBreaker: { failureThreshold: 5, recoveryTimeMs: 60000 },
      rateLimit: { requestsPerSecond: 10, tokensPerMinute: 100000 },
    };
  }

  private normalizeRequest(
    capabilitiesOrRequest: string[] | ProviderRouteRequest,
    estimatedTokens?: number
  ): ProviderRouteRequest {
    if (Array.isArray(capabilitiesOrRequest)) {
      return { capabilities: capabilitiesOrRequest, estimatedTokens };
    }

    return capabilitiesOrRequest;
  }
}

/**
 * Provider Router (Full implementation)
 * Active when PROVIDER_ROUTER_ENABLED=true
 */
export class ProviderRouter implements IProviderRouter {
  private config: ProviderRouterConfig;
  private health: Map<string, ProviderHealth> = new Map();
  private readonly clock: Clock;

  constructor(config: ProviderRouterConfig, clock?: Clock) {
    const validation = validateProviderConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid provider config: ${validation.errors.join(', ')}`);
    }

    this.config = config;
    this.clock = clock ?? new SystemClock();
    this.initializeHealthTracking();
  }
  
  route(capabilitiesOrRequest: string[] | ProviderRouteRequest, estimatedTokens?: number): RoutingDecision {
    const request = this.normalizeRequest(capabilitiesOrRequest, estimatedTokens);

    if (!this.config.enabled) {
      // Delegate to no-op behavior
      return new NoOpProviderRouter(this.config).route(request);
    }
    
    // Filter healthy providers
    const healthyProviders = this.config.providers.filter(p => this.isHealthy(p.id));
    
    if (healthyProviders.length === 0) {
      throw new Error('No healthy providers available');
    }
    
    // Apply routing strategy
    const selected = this.selectProvider(healthyProviders, request);
    
    return {
      providerId: selected.provider.id,
      provider: selected.provider,
      strategy: this.config.policy.strategy,
      reason: selected.reason,
      fallbackAttempt: 0,
      estimatedCost: this.estimateCost(selected.provider, request.estimatedTokens),
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
      const provider = this.config.providers.find(p => p.id === providerId);
      const threshold = provider?.circuitBreaker?.failureThreshold;
      if (threshold !== undefined && current.consecutiveFailures >= threshold) {
        current.healthy = false;
      }
    }

    // Update average latency (exponential moving average)
    const alpha = 0.3;
    current.averageLatencyMs = (alpha * latencyMs) + ((1 - alpha) * current.averageLatencyMs);
    current.lastCheckedAt = this.clock.now().getTime();
    
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

  private normalizeRequest(
    capabilitiesOrRequest: string[] | ProviderRouteRequest,
    estimatedTokens?: number
  ): ProviderRouteRequest {
    if (Array.isArray(capabilitiesOrRequest)) {
      return { capabilities: capabilitiesOrRequest, estimatedTokens };
    }

    return capabilitiesOrRequest;
  }
  
  private selectProvider(
    providers: ProviderConfig[],
    request: ProviderRouteRequest
  ): { provider: ProviderConfig; reason: string } {
    const matches = this.findModelAgnosticMatches(providers, request);
    
    if (matches.length === 0) {
      throw new Error(`No provider supports required model contract: ${this.describeRequest(request)}`);
    }
    
    switch (this.config.policy.strategy) {
      case 'model-agnostic': {
        const byScore = this.sortByModelAgnosticFit(matches);
        return {
          provider: byScore[0].provider,
          reason: byScore[0].reason,
        };
      }
      case 'priority': {
        const byPriority = [...matches].sort((a, b) => a.provider.priority - b.provider.priority);
        return { provider: byPriority[0].provider, reason: `Highest priority (${byPriority[0].provider.priority})` };
      }
      case 'cost': {
        const byCost = [...matches].sort((a, b) => a.provider.costPer1kInput - b.provider.costPer1kInput);
        return { provider: byCost[0].provider, reason: `Lowest cost ($${byCost[0].provider.costPer1kInput}/1K)` };
      }
      case 'capability': {
        const byCapability = [...matches].sort(
          (a, b) => this.getCapabilities(b.provider).length - this.getCapabilities(a.provider).length
        );
        return {
          provider: byCapability[0].provider,
          reason: `Most capabilities (${this.getCapabilities(byCapability[0].provider).length})`,
        };
      }
      case 'random':
      default: {
        // Keep deterministic behavior; random selection is intentionally not used.
        const defaultSorted = this.sortByModelAgnosticFit(matches);
        return { provider: defaultSorted[0].provider, reason: 'Deterministic model-agnostic fallback strategy' };
      }
    }
  }

  private findModelAgnosticMatches(
    providers: ProviderConfig[],
    request: ProviderRouteRequest
  ): ProviderMatch[] {
    return providers
      .map(provider => this.matchProvider(provider, request))
      .filter((match): match is ProviderMatch => match !== null);
  }

  private matchProvider(provider: ProviderConfig, request: ProviderRouteRequest): ProviderMatch | null {
    const capabilities = this.getCapabilities(provider);
    const missingCapabilities = request.capabilities.filter(capability => !capabilities.includes(capability));
    if (missingCapabilities.length > 0) {
      return null;
    }

    const profile = provider.modelProfile;
    if (request.inputModalities?.length) {
      if (!profile || !request.inputModalities.every(modality => profile.inputModalities.includes(modality))) {
        return null;
      }
    }

    if (request.outputModalities?.length) {
      if (!profile || !request.outputModalities.every(modality => profile.outputModalities.includes(modality))) {
        return null;
      }
    }

    if (request.minContextTokens !== undefined) {
      if (!profile?.maxContextTokens || profile.maxContextTokens < request.minContextTokens) {
        return null;
      }
    }

    if (request.requiresJsonMode && !this.supportsJsonMode(provider)) {
      return null;
    }

    if (request.requiresToolCalling && !this.supportsToolCalling(provider)) {
      return null;
    }

    if (request.requiresDeterministicReplay && profile?.supportsDeterministicReplay !== true) {
      return null;
    }

    if (request.dataResidency) {
      if (!profile?.dataResidency?.includes(request.dataResidency)) {
        return null;
      }
    }

    const score = this.scoreProvider(provider, request);
    return {
      provider,
      score,
      reason: `Model-agnostic fit score ${score} for capabilities: ${request.capabilities.join(', ') || 'none'}`,
    };
  }

  private sortByModelAgnosticFit(matches: ProviderMatch[]): ProviderMatch[] {
    return [...matches].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.provider.priority !== b.provider.priority) return a.provider.priority - b.provider.priority;
      return a.provider.id.localeCompare(b.provider.id);
    });
  }

  private scoreProvider(provider: ProviderConfig, request: ProviderRouteRequest): number {
    const profile = provider.modelProfile;
    const capabilities = this.getCapabilities(provider);
    let score = request.capabilities.length * 10;

    if (profile) score += 5;
    if (request.requiresJsonMode && this.supportsJsonMode(provider)) score += 3;
    if (request.requiresToolCalling && this.supportsToolCalling(provider)) score += 3;
    if (request.requiresDeterministicReplay && profile?.supportsDeterministicReplay) score += 3;
    if (request.minContextTokens !== undefined && profile?.maxContextTokens) {
      score += Math.min(Math.floor(profile.maxContextTokens / request.minContextTokens), 10);
    }

    // Prefer narrower contracts after requirements are satisfied to avoid routing
    // simple requests to unnecessarily specialized/high-cost models.
    score -= Math.max(capabilities.length - request.capabilities.length, 0);
    score -= provider.priority - 1;

    return score;
  }

  private getCapabilities(provider: ProviderConfig): string[] {
    return Array.from(new Set([
      ...provider.capabilities,
      ...(provider.modelProfile?.capabilities ?? []),
    ]));
  }

  private supportsJsonMode(provider: ProviderConfig): boolean {
    return provider.modelProfile?.supportsJsonMode === true ||
      this.getCapabilities(provider).some(capability => capability === 'json-output' || capability === 'json-mode');
  }

  private supportsToolCalling(provider: ProviderConfig): boolean {
    return provider.modelProfile?.supportsToolCalling === true ||
      this.getCapabilities(provider).some(capability => capability === 'tool-use' || capability === 'function-calling');
  }

  private describeRequest(request: ProviderRouteRequest): string {
    const parts = [`capabilities=${request.capabilities.join(',') || 'none'}`];
    if (request.minContextTokens !== undefined) parts.push(`minContextTokens=${request.minContextTokens}`);
    if (request.inputModalities?.length) parts.push(`inputModalities=${request.inputModalities.join(',')}`);
    if (request.outputModalities?.length) parts.push(`outputModalities=${request.outputModalities.join(',')}`);
    if (request.requiresJsonMode) parts.push('requiresJsonMode=true');
    if (request.requiresToolCalling) parts.push('requiresToolCalling=true');
    if (request.requiresDeterministicReplay) parts.push('requiresDeterministicReplay=true');
    if (request.dataResidency) parts.push(`dataResidency=${request.dataResidency}`);
    return parts.join('; ');
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
