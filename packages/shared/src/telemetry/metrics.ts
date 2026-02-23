/**
 * Metrics Collection
 *
 * Counters, histograms, and gauges for operational intelligence.
 */

export interface MetricValue {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

export class Counter {
  private values: Map<string, number> = new Map();
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  inc(labels: Record<string, string> = {}, value: number = 1): void {
    const key = JSON.stringify(labels);
    const current = this.values.get(key) ?? 0;
    this.values.set(key, current + value);
  }

  get(labels: Record<string, string> = {}): number {
    return this.values.get(JSON.stringify(labels)) ?? 0;
  }

  reset(): void {
    this.values.clear();
  }
}

export class Histogram {
  private buckets: number[];
  private values: Map<string, number[]> = new Map();
  private name: string;

  constructor(name: string, buckets: number[] = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000]) {
    this.name = name;
    this.buckets = buckets;
  }

  observe(value: number, labels: Record<string, string> = {}): void {
    const key = JSON.stringify(labels);
    const existing = this.values.get(key) ?? [];
    existing.push(value);
    this.values.set(key, existing);
  }

  getCount(labels: Record<string, string> = {}): number {
    return (this.values.get(JSON.stringify(labels)) ?? []).length;
  }

  getSum(labels: Record<string, string> = {}): number {
    const vals = this.values.get(JSON.stringify(labels)) ?? [];
    return vals.reduce((a, b) => a + b, 0);
  }
}

export class Gauge {
  private values: Map<string, number> = new Map();
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  set(value: number, labels: Record<string, string> = {}): void {
    this.values.set(JSON.stringify(labels), value);
  }

  get(labels: Record<string, string> = {}): number {
    return this.values.get(JSON.stringify(labels)) ?? 0;
  }

  inc(labels: Record<string, string> = {}, value: number = 1): void {
    const key = JSON.stringify(labels);
    this.values.set(key, (this.values.get(key) ?? 0) + value);
  }

  dec(labels: Record<string, string> = {}, value: number = 1): void {
    const key = JSON.stringify(labels);
    this.values.set(key, (this.values.get(key) ?? 0) - value);
  }
}

export const metrics = {
  decisionCount: new Counter('orchestrai_decision_count'),
  tokenUsageTotal: new Counter('orchestrai_token_usage_total'),
  decisionLatency: new Histogram('orchestrai_decision_latency_ms'),
  knowledgeQueryDuration: new Histogram('orchestrai_knowledge_query_duration_ms'),
  activeSessions: new Gauge('orchestrai_active_sessions'),
  queueDepth: new Gauge('orchestrai_queue_depth'),
};
