/**
 * Token Bucket Rate Limiter
 *
 * Per-tenant, per-role rate limiting for API requests.
 * Loads configuration from rate_limits.yaml (single source of truth).
 */

import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { SystemClock } from '../../../governance-v2/src/runtime/clock';
import type { Clock } from '../../../governance-v2/src/runtime/clock';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  burstSize: number;
}

interface YamlRateLimitConfig {
  token_bucket: {
    capacity: number;
    refill_rate_per_minute: number;
  };
  concurrency?: {
    max_executions: number;
    queue_timeout_ms: number;
  };
  token_budget?: {
    daily_limit: number;
    warning_threshold: number;
    hard_limit: boolean;
  };
}

@Injectable()
export class RateLimiter {
  private readonly logger = new Logger(RateLimiter.name);
  private buckets: Map<string, TokenBucket> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  private clock: Clock;

  // Role-based limits loaded from YAML
  private roleLimits: Map<string, RateLimitConfig> = new Map();
  // Full config cache for other capacity services
  private configCache: Map<string, YamlRateLimitConfig> = new Map();

  constructor(clock?: Clock) {
    this.clock = clock ?? new SystemClock();
    this.loadConfigFromYaml();
    // Cleanup stale buckets every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Load rate limits from canonical YAML file
   */
  private loadConfigFromYaml(): void {
    try {
      const yamlPath = resolve(process.cwd(), 'infrastructure/capacity/rate_limits.yaml');
      const yamlContent = readFileSync(yamlPath, 'utf-8');
      
      // Simple YAML parser (sufficient for our needs)
      const parsed = this.parseYaml(yamlContent);
      
      // Load defaults
      if (parsed.defaults?.token_bucket) {
        this.roleLimits.set('default', {
          burstSize: parsed.defaults.token_bucket.capacity,
          requestsPerSecond: parsed.defaults.token_bucket.refill_rate_per_minute / 60,
        });
        this.configCache.set('default', parsed.defaults);
      }

      // Load role overrides
      if (parsed.roles) {
        for (const [role, config] of Object.entries(parsed.roles)) {
          if (config.token_bucket) {
            this.roleLimits.set(role, {
              burstSize: config.token_bucket.capacity,
              requestsPerSecond: config.token_bucket.refill_rate_per_minute / 60,
            });
          }
          this.configCache.set(role, config as YamlRateLimitConfig);
        }
      }

      this.logger.log(`Loaded rate limits from ${yamlPath}`);
    } catch (err) {
      this.logger.warn(`Failed to load rate_limits.yaml, using defaults: ${err}`);
      // Fallback defaults
      this.roleLimits.set('default', { requestsPerSecond: 1, burstSize: 100 });
    }
  }

  /**
   * Simple YAML parser for our config format
   */
  private parseYaml(content: string): any {
    const result: any = {};
    const lines = content.split('\n');
    let currentSection: string | null = null;
    let currentRole: string | null = null;
    let currentResource: string | null = null;
    let currentSubSection: string | null = null;
    let depth = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = line.search(/\S/);
      
      // Top-level keys
      if (indent === 0 && trimmed.includes(':')) {
        const [key, value] = trimmed.split(':');
        currentSection = key.trim();
        if (value?.trim()) {
          result[currentSection] = value.trim().replace(/"/g, '').replace(/'/g, '');
        } else {
          result[currentSection] = {};
        }
        currentRole = null;
        currentResource = null;
        currentSubSection = null;
        depth = 0;
        continue;
      }

      // Second level (roles, resources)
      if (indent === 2 && trimmed.includes(':') && !trimmed.startsWith('-')) {
        const key = trimmed.replace(':', '').trim();
        if (currentSection === 'roles') {
          currentRole = key;
          result.roles[currentRole] = {};
        } else if (currentSection === 'resources') {
          currentResource = key;
          result.resources[currentResource] = {};
        } else if (currentSection) {
          currentSubSection = key;
          result[currentSection][currentSubSection] = {};
        }
        continue;
      }

      // Third level (config values)
      if (indent === 4 && trimmed.includes(':')) {
        const [key, value] = trimmed.split(':');
        const k = key.trim();
        const v = value?.trim();
        
        let target: any = null;
        if (currentSection === 'defaults' && currentSubSection) {
          target = result.defaults[currentSubSection];
        } else if (currentSection === 'roles' && currentRole) {
          target = result.roles[currentRole];
        } else if (currentSection === 'resources' && currentResource) {
          target = result.resources[currentResource];
        }

        if (target) {
          if (v === undefined || v === '') {
            target[k] = {};
          } else if (v === 'true') {
            target[k] = true;
          } else if (v === 'false') {
            target[k] = false;
          } else if (!isNaN(Number(v))) {
            target[k] = Number(v);
          } else {
            target[k] = v.replace(/"/g, '').replace(/'/g, '');
          }
        }
        continue;
      }

      // Fourth level
      if (indent === 6 && trimmed.includes(':')) {
        const [key, value] = trimmed.split(':');
        const k = key.trim();
        const v = value?.trim();
        
        let target: any = null;
        if (currentSection === 'defaults' && currentSubSection) {
          target = result.defaults[currentSubSection];
        } else if (currentSection === 'roles' && currentRole) {
          target = result.roles[currentRole];
        } else if (currentSection === 'resources' && currentResource) {
          target = result.resources[currentResource];
        }

        if (target && v !== undefined) {
          if (v === 'true') {
            target[k] = true;
          } else if (v === 'false') {
            target[k] = false;
          } else if (!isNaN(Number(v))) {
            target[k] = Number(v);
          } else {
            target[k] = v.replace(/"/g, '').replace(/'/g, '');
          }
        }
      }
    }

    return result;
  }

  /**
   * Get full capacity config for a role
   */
  getCapacityConfig(role: string = 'default'): YamlRateLimitConfig | undefined {
    return this.configCache.get(role) ?? this.configCache.get('default');
  }

  /**
   * Check if request is allowed
   */
  async isAllowed(tenantId: string, role: string = 'default'): Promise<{ allowed: boolean; retryAfter?: number }> {
    const key = `${tenantId}:${role}`;
    const config = this.roleLimits.get(role) ?? this.roleLimits.get('default')!;

    let bucket = this.buckets.get(key);
    const now = this.clock.now().getTime();
    if (!bucket) {
      bucket = {
        tokens: config.burstSize,
        lastRefill: now,
        capacity: config.burstSize,
      };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on time elapsed
    const elapsedMs = now - bucket.lastRefill;
    const tokensToAdd = (elapsedMs / 1000) * config.requestsPerSecond;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true };
    }

    // Calculate retry after
    const tokensNeeded = 1 - bucket.tokens;
    const retryAfterMs = (tokensNeeded / config.requestsPerSecond) * 1000;

    this.logger.warn(`Rate limit exceeded for ${key}`);
    return {
      allowed: false,
      retryAfter: Math.ceil(retryAfterMs / 1000),
    };
  }

  /**
   * Update role limits dynamically
   */
  setRoleLimit(role: string, config: RateLimitConfig): void {
    this.roleLimits.set(role, config);
  }

  /**
   * Get current bucket state (for debugging)
   */
  getBucketState(tenantId: string, role: string = 'default'): TokenBucket | undefined {
    return this.buckets.get(`${tenantId}:${role}`);
  }

  /**
   * Cleanup stale buckets
   */
  private cleanup(): void {
    const now = this.clock.now().getTime();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key);
      }
    }
  }

  onApplicationShutdown(): void {
    clearInterval(this.cleanupInterval);
  }
}
