# Provider Resilience

Document ID: PRV-2026-001  
Version: 1.0  
Status: Scaffolding (OFF by default)

## Overview

This document describes the Provider Router scaffolding for Phase 90% provider resilience.
**Status**: Infrastructure in place, feature disabled by default.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Orchestrator  │────▶│  ProviderRouter  │────▶│  Provider A     │
│                 │     │  (Feature Flag)    │     │  (Primary)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                    │
                               │ Failover           │
                               ▼                    ▼
                         ┌──────────────────┐     ┌─────────────────┐
                         │  Provider B      │     │  Provider C     │
                         │  (Backup)        │     │  (Cost-opt)     │
                         └──────────────────┘     └─────────────────┘
```

## Feature Flag

| Variable | Default | Description |
|----------|---------|-------------|
| `PROVIDER_ROUTER_ENABLED` | `false` | Enable multi-provider routing |

## Components

### Provider Router (`packages/agent-runtime/src/providers/provider-router.ts`)

- **NoOpProviderRouter**: Default when disabled (preserves current behavior)
- **ProviderRouter**: Full implementation when enabled
- **Routing Strategies**: priority, cost, capability
- **Health Tracking**: Per-provider health status
- **Automatic Failover**: Cascade to backup providers

### Configuration Schema (`packages/agent-runtime/src/providers/provider-config.schema.ts`)

```typescript
interface ProviderRouterConfig {
  enabled: boolean;              // Feature flag
  defaultProviderId: string;       // Fallback provider
  providers: ProviderConfig[];   // Provider definitions
  policy: ProviderRoutingPolicy;  // Routing rules
  costGuard: CostGuardConfig;    // Budget controls
}
```

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
- Single provider operation (no change from current)
- No routing overhead
- No health checks
- Deterministic behavior preserved

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
| `priority` | Always use best provider, failover on failure |
| `cost` | Minimize spend (good for non-critical operations) |
| `capability` | Route to provider with most features |

## Failover Policy

```yaml
fallback:
  enabled: true
  maxAttempts: 2
  cascadeOrder:
    - openai-primary
    - anthropic-backup
    - azure-fallback
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
npm test -- packages/agent-runtime/src/providers/__tests__/provider-router.spec.ts

# Verify disabled by default
expect(router.getConfig().enabled).toBe(false)
```

## Migration Path

1. **Phase 80% (Current)**: Scaffolding in place, router disabled
2. **Phase 85%**: Enable in staging, validate health checks
3. **Phase 90%**: Production enable with monitoring
4. **Phase 95%**: Full multi-provider with cost optimization

## Safety

- Router never enabled by default
- Single-provider behavior preserved
- Health checks don't block requests (only influence routing)
- Cost guard is advisory (configurable hard stop)

## References

- Implementation: `packages/agent-runtime/src/providers/`
- Tests: `packages/agent-runtime/src/providers/__tests__/`
- Config: `packages/agent-runtime/src/providers/provider-config.schema.ts`
