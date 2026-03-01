# Capacity Plan

Document ID: CAP-2026-001  
Version: 1.0  
Effective Date: 2026-02-23  
Review Cycle: Quarterly  

## Executive Summary

This capacity plan defines the infrastructure requirements, scaling policies, and resource allocation for OrchestrAI Labs production deployments.

## Current Baseline

| Resource | Per-Tenant Default | Per-Tenant Premium | Per-Tenant Enterprise |
|----------|-------------------|-------------------|---------------------|
| Requests/min | 60 | 600 | 6000 |
| Concurrent executions | 5 | 25 | 100 |
| Daily token budget | 100K | 1M | 10M |
| Token bucket size | 100 | 500 | 2000 |
| Token refill rate/min | 60 | 300 | 1200 |

## Infrastructure Requirements

### Compute

| Component | vCPU | RAM | Instance Count |
|-----------|------|-----|----------------|
| API Server | 2 | 4GB | 2 (min) |
| Worker Pool | 4 | 8GB | 2 (min) |
| PostgreSQL | 4 | 16GB | 1 primary + 1 replica |
| Vector DB | 2 | 8GB | 1 |

### Storage

| Type | Capacity | IOPS | Backup |
|------|----------|------|--------|
| PostgreSQL | 500GB SSD | 3000 | Daily snapshots, 30d retention |
| Object Storage | 2TB | - | Cross-region replication |
| Vector Index | 100GB | 1000 | Weekly snapshots |

### Network

| Metric | Target |
|--------|--------|
| Latency (p50) | < 50ms |
| Latency (p95) | < 200ms |
| Throughput | 100 Mbps min |
| Connection limit | 10,000 concurrent |

## Scaling Policies

### Horizontal Scaling

- **Trigger**: CPU > 70% for 5 minutes OR request queue > 100
- **Action**: Add API server instance (max 10)
- **Cooldown**: 3 minutes

### Vertical Scaling

- **PostgreSQL**: Alert at 70% storage, scale at 85%
- **Memory**: Alert at 80% utilization

## Circuit Breakers

| Condition | Action | Auto-Recovery |
|-----------|--------|---------------|
| Error rate > 10% | Reject new executions | After 30s < 5% |
| DB connection pool exhausted | Queue with timeout | After connections < 80% |
| Token budget exhausted | Reject LLM calls | Next UTC day |
| Concurrency limit reached | Return 429 Retry-After | When slot available |

## Regional Deployment

| Region | Status | RTO | RPO |
|--------|--------|-----|-----|
| us-east-1 | Active | 5 min | 0 |
| eu-west-1 | Standby | 15 min | < 1 min |
| ap-southeast-1 | Planned | - | - |

## Cost Controls

- Hard limit: 150% of provisioned capacity requires approval
- Soft limit: 120% triggers notification
- Budget alert: 80% of monthly budget

## Monitoring

Dashboards: `observability/dashboards/grafana/capacity-limits.json`  
Alerts: `observability/alerts/capacity-alerts.yaml`
