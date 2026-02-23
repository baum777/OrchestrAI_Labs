# Service Level Objectives (SLO) & Agreements (SLA)

Document ID: SLO-2026-001  
Version: 1.0  
Effective Date: 2026-02-23  

## Service Level Objectives

### Availability

| Tier | SLO Target | Measurement Window | Exclusions |
|------|------------|-------------------|------------|
| Core API | 99.9% | 30-day rolling | Scheduled maintenance |
| Knowledge Retrieval | 99.5% | 30-day rolling | Vector DB maintenance |
| Policy Engine | 99.99% | 30-day rolling | None |

### Latency

| Endpoint Type | p50 Target | p95 Target | p99 Target |
|---------------|------------|------------|------------|
| API Health | < 10ms | < 50ms | < 100ms |
| Agent Execution | < 200ms | < 500ms | < 1000ms |
| Knowledge Search | < 50ms | < 200ms | < 500ms |
| Policy Decision | < 10ms | < 50ms | < 100ms |

### Error Rate

| Service | Target |
|---------|--------|
| API Gateway | < 0.1% 5xx errors |
| Agent Runtime | < 0.5% execution failures |
| Policy Engine | < 0.01% false negatives |

### Throughput

| Metric | Per-Instance | Cluster |
|--------|--------------|---------|
| Requests/sec | 100 | 1000 (10 instances) |
| Executions/sec | 50 | 500 |
| Policy decisions/sec | 1000 | 10000 |

## Service Level Agreements

### Standard Tier

- **Availability**: 99.5% uptime
- **Support**: Business hours email
- **Response Time**: 24 hours
- **Credits**: 10% monthly fee per 1% below SLA

### Premium Tier

- **Availability**: 99.9% uptime
- **Support**: 24/7 email + chat
- **Response Time**: 4 hours
- **Credits**: 15% monthly fee per 1% below SLA

### Enterprise Tier

- **Availability**: 99.95% uptime
- **Support**: 24/7 phone + dedicated CSM
- **Response Time**: 1 hour
- **Credits**: 25% monthly fee per 1% below SLA

## Error Budgets

| Tier | Monthly Error Budget | Policy |
|------|---------------------|--------|
| Core API | 43.8 minutes (99.9%) | Pause feature releases if 50% consumed |
| Policy Engine | 4.38 minutes (99.99%) | Page on-call immediately if exceeded |

## Measurement Methodology

1. **Availability**: (Successful requests / Total requests) × 100
2. **Latency**: Measured at API gateway, excluding network latency
3. **Error Rate**: (5xx responses + timeout errors) / Total requests
4. **Time Windows**: Calendar month, UTC

## Escalation

| Burn Rate | Action |
|-----------|--------|
| > 2x | Page on-call engineer |
| > 1x | Create incident ticket |
| > 0.5x | Add to weekly review |

## References

- Capacity Plan: `capacity_plan.md`
- Rate Limits: `rate_limits.yaml`
- Dashboards: `observability/dashboards/grafana/`
