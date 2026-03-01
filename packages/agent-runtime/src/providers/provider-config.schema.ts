/**
 * Provider Configuration Schema
 *
 * Defines the structure for provider routing configuration.
 * Feature flag: PROVIDER_ROUTER_ENABLED (default: false)
 */

export interface ProviderConfig {
  /** Provider unique identifier */
  id: string;
  
  /** Provider name (human readable) */
  name: string;
  
  /** Provider type/model */
  type: 'openai' | 'anthropic' | 'azure' | 'custom';
  
  /** Base URL for API */
  baseUrl: string;
  
  /** Priority (lower = higher priority) */
  priority: number;
  
  /** Cost per 1K tokens (input) */
  costPer1kInput: number;
  
  /** Cost per 1K tokens (output) */
  costPer1kOutput: number;
  
  /** Capabilities supported */
  capabilities: string[];
  
  /** Timeout in ms */
  timeoutMs: number;
  
  /** Retry configuration */
  retry: {
    maxAttempts: number;
    backoffMs: number;
  };
  
  /** Circuit breaker settings */
  circuitBreaker: {
    failureThreshold: number;
    recoveryTimeMs: number;
  };
  
  /** Rate limits */
  rateLimit: {
    requestsPerSecond: number;
    tokensPerMinute: number;
  };
}

export interface ProviderRoutingPolicy {
  /** Policy name */
  name: string;
  
  /** Selection strategy */
  strategy: 'priority' | 'cost' | 'capability' | 'random';
  
  /** Fallback behavior */
  fallback: {
    /** Enable automatic failover */
    enabled: boolean;
    /** Max failover attempts */
    maxAttempts: number;
    /** Providers to try in order */
    cascadeOrder?: string[];
  };
  
  /** Health check configuration */
  healthCheck: {
    intervalMs: number;
    timeoutMs: number;
    unhealthyThreshold: number;
  };
}

export interface ProviderRouterConfig {
  /** Feature flag - must be true for router to be active */
  enabled: boolean;
  
  /** All configured providers */
  providers: ProviderConfig[];
  
  /** Routing policy */
  policy: ProviderRoutingPolicy;
  
  /** Default provider when router disabled */
  defaultProviderId: string;
  
  /** Cost guard settings */
  costGuard: {
    /** Enable cost tracking */
    enabled: boolean;
    /** Alert threshold (budget %) */
    alertThreshold: number;
    /** Hard stop threshold (budget %) */
    hardStopThreshold: number;
    /** Budget reset period (hours) */
    budgetResetHours: number;
  };
}

/**
 * Default configuration (router disabled)
 */
export const DEFAULT_PROVIDER_ROUTER_CONFIG: ProviderRouterConfig = {
  enabled: false, // Feature flag: OFF by default
  defaultProviderId: 'default',
  providers: [],
  policy: {
    name: 'default',
    strategy: 'priority',
    fallback: {
      enabled: false,
      maxAttempts: 1,
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

/**
 * Example production configuration (for reference, not enabled)
 */
export const EXAMPLE_PROVIDER_ROUTER_CONFIG: ProviderRouterConfig = {
  enabled: false, // Still disabled - requires explicit enable
  defaultProviderId: 'openai-primary',
  providers: [
    {
      id: 'openai-primary',
      name: 'OpenAI GPT-4',
      type: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      priority: 1,
      costPer1kInput: 0.03,
      costPer1kOutput: 0.06,
      capabilities: ['chat', 'function-calling', 'json-mode'],
      timeoutMs: 30000,
      retry: { maxAttempts: 3, backoffMs: 1000 },
      circuitBreaker: { failureThreshold: 5, recoveryTimeMs: 60000 },
      rateLimit: { requestsPerSecond: 10, tokensPerMinute: 100000 },
    },
    {
      id: 'anthropic-backup',
      name: 'Anthropic Claude',
      type: 'anthropic',
      baseUrl: 'https://api.anthropic.com',
      priority: 2,
      costPer1kInput: 0.008,
      costPer1kOutput: 0.024,
      capabilities: ['chat', 'function-calling'],
      timeoutMs: 30000,
      retry: { maxAttempts: 3, backoffMs: 1000 },
      circuitBreaker: { failureThreshold: 5, recoveryTimeMs: 60000 },
      rateLimit: { requestsPerSecond: 5, tokensPerMinute: 50000 },
    },
  ],
  policy: {
    name: 'failover-priority',
    strategy: 'priority',
    fallback: {
      enabled: true,
      maxAttempts: 2,
      cascadeOrder: ['openai-primary', 'anthropic-backup'],
    },
    healthCheck: {
      intervalMs: 30000,
      timeoutMs: 5000,
      unhealthyThreshold: 3,
    },
  },
  costGuard: {
    enabled: true,
    alertThreshold: 0.8,
    hardStopThreshold: 1.0,
    budgetResetHours: 24,
  },
};

/**
 * Configuration validation
 */
export function validateProviderConfig(config: ProviderRouterConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate providers if enabled
  if (config.enabled) {
    if (!config.providers || config.providers.length === 0) {
      errors.push('At least one provider required when router enabled');
    }

    const ids = new Set<string>();
    for (const provider of config.providers) {
      if (ids.has(provider.id)) {
        errors.push(`Duplicate provider ID: ${provider.id}`);
      }
      ids.add(provider.id);

      if (!provider.baseUrl || !provider.baseUrl.startsWith('http')) {
        errors.push(`Invalid baseUrl for provider ${provider.id}`);
      }

      if (provider.priority < 1) {
        errors.push(`Priority must be >= 1 for provider ${provider.id}`);
      }

      if (provider.timeoutMs < 1000) {
        errors.push(`Timeout too short for provider ${provider.id}`);
      }
    }

    // Validate default provider exists
    if (!ids.has(config.defaultProviderId)) {
      errors.push(`Default provider ${config.defaultProviderId} not found in providers list`);
    }
  }

  return { valid: errors.length === 0, errors };
}
