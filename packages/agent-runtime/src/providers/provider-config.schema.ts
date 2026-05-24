/**
 * Provider Configuration Schema
 *
 * Defines the structure for model-agnostic provider routing configuration.
 * Feature flag: PROVIDER_ROUTER_ENABLED (default: false)
 */

export type ProviderType = 'openai' | 'anthropic' | 'azure' | 'custom';
export type ProviderKind = 'hosted' | 'self-hosted' | 'gateway' | 'custom';
export type ModelModality = 'text' | 'image' | 'audio' | 'video';
export type ModelCapability = string;

/**
 * Logical model capability contract.
 *
 * This is intentionally provider-neutral: runtime routing should depend on
 * capabilities, modalities, context and governance constraints rather than on
 * concrete vendor/model names.
 */
export interface ModelAgnosticProfile {
  /** Logical profile identifier, for example "generalist.tool_capable" */
  id: string;

  /** Provider-neutral capabilities exposed by this model profile */
  capabilities: ModelCapability[];

  /** Supported input modalities */
  inputModalities: ModelModality[];

  /** Supported output modalities */
  outputModalities: ModelModality[];

  /** Maximum supported context window in tokens, when known */
  maxContextTokens?: number;

  /** Whether structured JSON output is explicitly supported */
  supportsJsonMode?: boolean;

  /** Whether tool/function use is explicitly supported */
  supportsToolCalling?: boolean;

  /** Whether streaming is explicitly supported */
  supportsStreaming?: boolean;

  /** Whether this profile can participate in deterministic replay workflows */
  supportsDeterministicReplay?: boolean;

  /** Supported data residency regions, when constrained */
  dataResidency?: string[];

  /** Non-routing metadata for operators */
  notes?: string;
}

export interface ProviderConfig {
  /** Provider unique identifier */
  id: string;
  
  /** Provider name (human readable) */
  name: string;
  
  /** Provider adapter type. Kept for transport selection only, not routing priority. */
  type: ProviderType;

  /** Deployment kind for provider-neutral routing and operations */
  kind?: ProviderKind;

  /** Provider-neutral capability contract used by model-agnostic routing */
  modelProfile?: ModelAgnosticProfile;

  /** Optional vendor metadata; must not be used as the primary routing key */
  vendor?: {
    name?: string;
    model?: string;
    apiVersion?: string;
  };
  
  /** Base URL for API */
  baseUrl: string;
  
  /** Priority (lower = higher priority) */
  priority: number;
  
  /** Cost per 1K tokens (input) */
  costPer1kInput: number;
  
  /** Cost per 1K tokens (output) */
  costPer1kOutput: number;
  
  /** Backward-compatible provider capability list */
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
  strategy: 'model-agnostic' | 'priority' | 'cost' | 'capability' | 'random';
  
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
    strategy: 'model-agnostic',
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
  defaultProviderId: 'primary-generalist',
  providers: [
    {
      id: 'primary-generalist',
      name: 'Primary Generalist Endpoint',
      type: 'custom',
      kind: 'gateway',
      baseUrl: 'https://llm-gateway.primary.example/v1',
      priority: 1,
      costPer1kInput: 0.01,
      costPer1kOutput: 0.03,
      capabilities: ['chat', 'tool-use', 'json-output', 'reasoning'],
      modelProfile: {
        id: 'generalist.tool_capable',
        capabilities: ['chat', 'tool-use', 'json-output', 'reasoning'],
        inputModalities: ['text'],
        outputModalities: ['text'],
        maxContextTokens: 128000,
        supportsJsonMode: true,
        supportsToolCalling: true,
        supportsStreaming: true,
        supportsDeterministicReplay: true,
      },
      timeoutMs: 30000,
      retry: { maxAttempts: 3, backoffMs: 1000 },
      circuitBreaker: { failureThreshold: 5, recoveryTimeMs: 60000 },
      rateLimit: { requestsPerSecond: 10, tokensPerMinute: 100000 },
    },
    {
      id: 'backup-generalist',
      name: 'Backup Generalist Endpoint',
      type: 'custom',
      kind: 'gateway',
      baseUrl: 'https://llm-gateway.backup.example/v1',
      priority: 2,
      costPer1kInput: 0.008,
      costPer1kOutput: 0.024,
      capabilities: ['chat', 'tool-use', 'json-output'],
      modelProfile: {
        id: 'generalist.standard',
        capabilities: ['chat', 'tool-use', 'json-output'],
        inputModalities: ['text'],
        outputModalities: ['text'],
        maxContextTokens: 64000,
        supportsJsonMode: true,
        supportsToolCalling: true,
        supportsStreaming: true,
      },
      timeoutMs: 30000,
      retry: { maxAttempts: 3, backoffMs: 1000 },
      circuitBreaker: { failureThreshold: 5, recoveryTimeMs: 60000 },
      rateLimit: { requestsPerSecond: 5, tokensPerMinute: 50000 },
    },
  ],
  policy: {
    name: 'model-agnostic-failover',
    strategy: 'model-agnostic',
    fallback: {
      enabled: true,
      maxAttempts: 2,
      cascadeOrder: ['primary-generalist', 'backup-generalist'],
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

      if (typeof provider.priority !== 'number' || provider.priority < 1) {
        errors.push(`Priority must be >= 1 for provider ${provider.id}`);
      }

      if (typeof provider.costPer1kInput !== 'number' || provider.costPer1kInput < 0) {
        errors.push(`Input cost must be >= 0 for provider ${provider.id}`);
      }

      if (typeof provider.costPer1kOutput !== 'number' || provider.costPer1kOutput < 0) {
        errors.push(`Output cost must be >= 0 for provider ${provider.id}`);
      }

      if (!Array.isArray(provider.capabilities) || provider.capabilities.length === 0) {
        errors.push(`At least one capability required for provider ${provider.id}`);
      }

      if (provider.timeoutMs < 1000) {
        errors.push(`Timeout too short for provider ${provider.id}`);
      }

      if (provider.modelProfile) {
        if (!provider.modelProfile.id || provider.modelProfile.id.trim().length === 0) {
          errors.push(`Model profile id required for provider ${provider.id}`);
        }

        if (!Array.isArray(provider.modelProfile.capabilities) || provider.modelProfile.capabilities.length === 0) {
          errors.push(`Model profile capabilities required for provider ${provider.id}`);
        }

        if (!Array.isArray(provider.modelProfile.inputModalities) || provider.modelProfile.inputModalities.length === 0) {
          errors.push(`Model profile input modalities required for provider ${provider.id}`);
        }

        if (!Array.isArray(provider.modelProfile.outputModalities) || provider.modelProfile.outputModalities.length === 0) {
          errors.push(`Model profile output modalities required for provider ${provider.id}`);
        }

        if (
          provider.modelProfile.maxContextTokens !== undefined &&
          provider.modelProfile.maxContextTokens < 1
        ) {
          errors.push(`Model profile maxContextTokens must be >= 1 for provider ${provider.id}`);
        }
      }
    }

    // Validate default provider exists
    if (!ids.has(config.defaultProviderId)) {
      errors.push(`Default provider ${config.defaultProviderId} not found in providers list`);
    }

    const cascadeOrder = config.policy.fallback.cascadeOrder ?? [];
    for (const providerId of cascadeOrder) {
      if (!ids.has(providerId)) {
        errors.push(`Fallback provider ${providerId} not found in providers list`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
