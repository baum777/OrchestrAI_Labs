# Observability Operational Pack

Operational visibility artifacts for OrchestrAI Labs.

## Structure

```
observability/
├── dashboards/grafana/    # Pre-built Grafana dashboards
│   ├── api-latency.json     # API performance & throughput
│   ├── policy-decisions.json # Governance metrics
│   ├── rag-latency.json     # RAG retrieval performance
│   └── capacity-limits.json # Rate limiting & token usage
├── alerts/                  # Prometheus alert rules
│   ├── api-slo.yaml         # API latency/availability SLOs
│   ├── capacity-alerts.yaml # Rate limit & budget alerts
│   └── governance-alerts.yaml # Policy & isolation alerts
└── README.md               # This file
```

## Trace Correlation

The API boundary automatically propagates:
- `X-Trace-ID`: Correlates distributed traces across services
- `X-Request-ID`: Unique per-request identifier

These are:
- Hashed in telemetry (no raw identifiers in logs/metrics)
- Deterministically generated (clock-based, no random defaults)
- Validated (alphanumeric + hyphens, 8-64 chars)

## Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `TELEMETRY_EXPORT_ENABLED` | `false` | Enable span/log export to stdout |

## Dashboards

### API Latency & Throughput
- Request latency percentiles (p50/p95/p99)
- Requests per second by route
- Error rate by route

### Policy Decisions & Governance
- Policy decision outcomes (allow/deny/escalate)
- Decision latency
- Review queue depth
- Human-in-the-loop interventions

### RAG Performance
- Retrieval latency
- Score distribution
- Citation presence rate
- Tenant isolation violations

### Capacity & Limits
- Rate limit hits
- Token usage by tenant
- Budget utilization %
- Concurrency utilization

## Alerts

### API SLOs
- `APIHighLatency`: p95 > 500ms for 2m
- `APIErrorRate`: Error rate > 1% for 1m
- `APIAvailability`: Availability < 99.5% for 2m

### Capacity
- `RateLimitThreshold`: Any rate limit hits
- `TokenBudgetHighUtilization`: > 85% of budget
- `TokenBudgetExhausted`: Budget fully consumed
- `ConcurrencyLimitReached`: Max concurrent executions

### Governance
- `PolicyDecisionLatency`: p95 > 100ms
- `HighDenyRate`: Deny rate > 10%
- `ReviewQueueBacklog`: > 50 pending reviews
- `TenantIsolationViolation`: Cross-tenant access detected

## PII/Safety

All identifiers in telemetry are hashed:
- `user_id`, `tenant_id`, `client_id` → `hash-{16chars}`
- Emails, tokens, secrets → `[REDACTED]`

## Determinism

- Trace IDs generated via clock timestamp (no Math.random)
- Timestamps use SystemClock abstraction
- No `new Date()` outside SystemClock
