/**
 * Token Bucket Rate Limiter
 *
 * Per-tenant, per-role rate limiting for API requests.
 */

import { Injectable, Logger } from '@nestjs/common';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  burstSize: number;
}

@Injectable()
export class RateLimiter {
  private readonly logger = new Logger(RateLimiter.name);
  private buckets: Map<string, TokenBucket> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  // Role-based limits
  private roleLimits: Map<string, RateLimitConfig> = new Map([
    ['default', { requestsPerSecond: 10, burstSize: 20 }],
    ['premium', { requestsPerSecond: 100, burstSize: 200 }],
    ['enterprise', { requestsPerSecond: 500, burstSize: 1000 }],
    ['admin', { requestsPerSecond: 1000, burstSize: 2000 }],
  ]);

  constructor() {
    // Cleanup stale buckets every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if request is allowed
   */
  async isAllowed(tenantId: string, role: string = 'default'): Promise<{ allowed: boolean; retryAfter?: number }> {
    const key = `${tenantId}:${role}`;
    const config = this.roleLimits.get(role) ?? this.roleLimits.get('default')!;

    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        tokens: config.burstSize,
        lastRefill: Date.now(),
        capacity: config.burstSize,
      };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on time elapsed
    const now = Date.now();
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
    const now = Date.now();
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
