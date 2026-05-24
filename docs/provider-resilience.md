# Provider Resilience

Document ID: PRV-2026-001  
Version: 1.1  
Status: Model-agnostic scaffolding (OFF by default)

## Overview

This document describes the Provider Router scaffolding for resilient, model-agnostic LLM routing.

**Status**: Infrastructure in place, feature disabled by default.

The router is **model-agnostic first**: callers describe the logical model contract they need (capabilities, modalities, context window, deterministic replay, data residency), and the router selects a compatible provider endpoint. Concrete vendor/model names are adapter metadata only and must not be the primary routing key.

## Architecture

```
┌─────────────────┐     ┌─────────────────────────┐     ┌────────────────────┐
│   Orchestrator  │────▶│  ProviderRouteRequest   │────▶│  ProviderRouter     │
│                 │     │  capability contract    │     │  (Feature Flag)    │
└─────────────────┘     └─────────────────────────┘     └────────────────────┘
                                                                 │
                                                                 │ deterministic fit
                                                                 ▼
                                                       ┌────────────────────┐
                                                       │ Provider Endpoint   │
                                                       │ with ModelProfile   │
                                                       └────────────────────┘
```

## Feature Flag

| Variable | Default | Description |
|----------|---------|-------------|
| `PROVIDER_ROUTER_ENABLED` | `false` | Enable multi-provider routing |

## Model-Agnostic First Contract

### Route Request

Runtime callers should prefer the provider-neutral request object over vendor/model-specific routing:

```typescript
interface ProviderRouteRequest {
  capabilities: string[];
  estimatedTokens?: number;
  minContextTokens?: number;
  inputModalities?: Array<'text' | 'image' | 'audio' | 'video'>;
  outputModalities?: Array<'text' | 'image' | 'audio' | 'video'>;
  requiresJsonMode?: boolean;
  requiresToolCalling?: boolean;
  requiresDeterministicReplay?: boolean;
  dataResidency?: string;
}
```

The legacy `route(capabilities: string[], estimatedTokens?: number)` form remains supported for backward compatibility.

### Provider Model Profile

Providers expose a logical model capability profile:

```typescript
interface ModelAgnosticProfile {
  id: string;
  capabilities: string[];
  inputModalities: Array<'text' | 'image' | 'audio' | 'video'>;
  outputModalities: Array<'text' | 'image' | 'audio' | 'video'>;
  maxContextTokens?: number;
  supportsJsonMode?: boolean;
  supportsToolCalling?: boolean;
  supportsStreaming?: boolean;
  supportsDeterministicReplay?: boolean;
  dataResidency?: string[];
}
```

Concrete provider metadata may still exist for transport adapters, billing, and operations, but it must not be used as the default selection primitive.

## Components

### Provider Router (`packages/agent-runtime/src/providers/provider-router.ts`)

- **NoOpProviderRouter**: Default when disabled; preserves current behavior.
- **ProviderRouter**: Full implementation when enabled.
- **ProviderRouteRequest**: Provider-neutral request contract.
- **Routing Strategies**: `model-agnostic`, `priority`, `cost`, `capability`.
- **Health Tracking**: Per-provider health status.
- **Automatic Failover**: Cascade to backup providers.
- **Deterministic Selection**: `random` is treated as deterministic fallback behavior to preserve replayability.

### Configuration Schema (`packages/agent-runtime/src/providers/provider-config.schema.ts`)

```typescript
interface ProviderRouterConfig {
  enabled: boolean;
  defaultProviderId: string;
  providers: ProviderConfig[];
  policy: ProviderRoutingPolicy;
  costGuard: CostGuardConfig;
}
```

`ProviderConfig` supports both transport metadata and the provider-neutral `modelProfile` contract.

### Cost Guard Hook

Stub implementation provided. Full implementation planned for Phase 90%.

```typescript
interface CostGuard {
  checkBudget(estimatedCost: number): BudgetCheck;
  trackSpend(providerId: string, actualCost: number): void;
  getSummary(): SpendSummary;
}
```

## Current Behavior (Default)

When `PROVIDER_ROUTER_ENABLED=false` (default):
- Single provider operation remains unchanged.
- No routing overhead.
- No health checks.
- Deterministic behavior is preserved.
- The no-op provider still exposes a minimal model profile for typed callers.

## Enabling Multi-Provider (Phase 90%)

```bash
# Enable router
export PROVIDER_ROUTER_ENABLED=true

# Configure providers (via config or env)
export PROVIDER_CONFIG='{"providers":[...],"policy":{...}}'
```

## Routing Strategies

| Strategy | Use Case |
|----------|----------|
| `model-agnostic` | Default; match request contract, then choose best deterministic fit |
| `priority` | Always use highest-priority compatible provider |
| `cost` | Minimize spend for compatible providers |
| `capability` | Prefer compatible provider with broadest capability set |

## Matching Rules

A provider must satisfy all requested hard constraints:

- Required capabilities.
- Required input/output modalities.
- Minimum context window.
- JSON-mode support when required.
- Tool-calling support when required.
- Deterministic replay support when required.
- Data-residency region when required.

After hard constraints pass, `model-agnostic` strategy uses a deterministic score and tie-breakers:

1. Highest fit score.
2. Lowest provider priority value.
3. Lexicographic provider ID.

## Failover Policy

```yaml
fallback:
  enabled: true
  maxAttempts: 2
  cascadeOrder:
    - primary-generalist
    - backup-generalist
```

## Health Checking

- **Interval**: 30 seconds
- **Timeout**: 5 seconds
- **Unhealthy Threshold**: 3 consecutive failures
- **Recovery**: Automatic after recovery time

## Cost Guard

### Budget Controls

| Threshold | Action |
|-----------|--------|
| 80% | Warning notification |
| 100% | Hard stop (configurable) |

### Cost Calculation

```
estimated_cost = (input_tokens / 1000 * input_rate) + 
                  (output_tokens / 1000 * output_rate)
```

## Testing

```bash
# Run provider router tests
pnpm -C packages/agent-runtime test -- provider-router.spec.ts

# Verify disabled by default
expect(router.getConfig().enabled).toBe(false)
```

## Migration Path

1. **Phase 80% (Current)**: Model-agnostic scaffolding in place, router disabled.
2. **Phase 85%**: Enable in staging with neutral `ModelAgnosticProfile` configs.
3. **Phase 90%**: Production enable with monitoring and cost guard.
4. **Phase 95%**: Full multi-provider optimization using contract-based routing only.

## Safety

- Router is never enabled by default.
- Single-provider behavior is preserved.
- Health checks do not block requests; they only influence routing.
- Cost guard is advisory unless hard-stop is configured.
- New routing rules must use capabilities/profile contracts first.
- Concrete model/vendor names are allowed only as adapter metadata or historical documentation.

## References

- Implementation: `packages/agent-runtime/src/providers/`
- Tests: `packages/agent-runtime/src/providers/__tests__/`
- Config: `packages/agent-runtime/src/providers/provider-config.schema.ts`
